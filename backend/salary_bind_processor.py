# ==========================================
# 骑手支付绑定（发薪工具）多线程处理引擎
# 本文件主要用于：
# 1. 快速并行读取、解析、合并大量的CSV、Excel流水账单
# 2. 匹配和校验骑手ID、身份证号信息，进行发薪平台(风神/商翼)绑定状态检测
# 3. 输出汇总与各城市明细绑定的Excel工作表
# 4. 统计并反馈发薪成功率、黑名单骑手等看板数据
# ==========================================
import pandas as pd
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
import os
import glob
import time
import re
from datetime import datetime
import asyncio
import functools
from concurrent.futures import ThreadPoolExecutor

async def run_salary_bind_gen(source_path, target_path=None, base_path=None, deductionRules=None):
    # 处理逻辑：作为核心异步任务入口，负责启动具体的业务流程计算
    from tasks import create_progress_event, create_log_event, create_finish_event
    
    start_time = time.time()
    
    yield create_progress_event(0.1)
    yield create_log_event(">>> 正在启动发薪工具绑定任务...", "INFO")
    await asyncio.sleep(0.01)

    try:
        if not source_path or not os.path.exists(source_path):
            yield create_log_event(">>> [错误] 源目录不存在或未选择！", "ERROR")
            yield create_finish_event("error", "源目录不存在")
            return

        yield create_log_event(">>> 开始扫描源数据目录 (多线程并行读取)...", "INFO")
        files = []
        for root, _, filenames in os.walk(source_path):
            for f in filenames:
                if f.lower().endswith(('.xlsx', '.csv')) and not f.startswith('~$'):
                    files.append(os.path.join(root, f))
        
        if not files:
            yield create_log_event(">>> [错误] 目标目录未检测到任何有效的 Excel 或 CSV 文件！请先在界面上[选择目录]或[上传目录]后再试。", "ERROR")
            yield create_finish_event("error", "目标目录为空，未检测到任何可处理的表格文件。")
            return

        # 检查是否包含所需的核算表格文件
        relevant_keywords = ["骑手绑定", "收薪账户", "骑手信息", "骑手数据明细", "merchantFreelancer", "薪资代领", "天津商翼"]
        has_relevant_files = False
        for f in files:
            fname = os.path.basename(f)
            if any(kw in fname for kw in relevant_keywords):
                has_relevant_files = True
                break
        
        if not has_relevant_files:
            yield create_log_event(">>> [错误] 目标目录内未检测到任何与发薪工具绑定核算相关的表格文件！", "ERROR")
            yield create_log_event("请确保你选择的目录中包含以下核算文件之一：", "WARN")
            yield create_log_event(" 1. 含有「骑手绑定」或「收薪账户」的文件 (风神绑定)", "WARN")
            yield create_log_event(" 2. 含有「骑手信息」的文件 (基本资料)", "WARN")
            yield create_log_event(" 3. 含有「骑手数据明细」的文件 (单量明细)", "WARN")
            yield create_log_event(" 4. 含有「merchantFreelancer」或「天津商翼」的文件 (商翼绑定)", "WARN")
            yield create_log_event(" 5. 含有「薪资代领」的文件 (代领明细)", "WARN")
            yield create_finish_event("error", "未检测到符合发薪绑定业务的有效数据表格")
            return
        
        list_fengshen = []
        list_shangyi = []
        list_info = []
        list_detail = []
        list_dailing = []
        
        yield create_progress_event(0.15)
        
        # 定义单个文件读取任务
        def _read_file(file_path):
            # 处理逻辑：处理文件或目录的选择交互及路径解析
            filename = os.path.basename(file_path)
            try:
                if file_path.endswith('.csv'):
                    try:
                        df = pd.read_csv(file_path, dtype=str, encoding='utf-8')
                    except UnicodeDecodeError:
                        df = pd.read_csv(file_path, dtype=str, encoding='gbk')
                else:
                    try:
                        df = pd.read_excel(file_path, engine="calamine")
                    except:
                        df = pd.read_excel(file_path)
                
                if not df.empty:
                    df = df.dropna(how='all')
                df.columns = [str(c).strip() for c in df.columns]
                return (filename, df, None)
            except Exception as e:
                return (filename, None, str(e))

        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=8) as executor:
            tasks = [loop.run_in_executor(executor, _read_file, fp) for fp in files]
            results = await asyncio.gather(*tasks)

        for filename, df, err in results:
            if err:
                yield create_log_event(f"[WARN] 读取文件出错 {filename}: {err}", "WARN")
                continue
                
            if "骑手绑定" in filename or "收薪账户" in filename:
                if len(df.columns) > 5:
                    df = df.dropna(subset=[df.columns[5]])
                    df = df[df.iloc[:, 5].astype(str).str.strip() != ""]
                    df = df[df.iloc[:, 5].astype(str).str.lower() != "nan"]
                else:
                    df = df.iloc[0:0]
                list_fengshen.append(df)
                yield create_log_event(f"-> 提取风神绑定数据: {filename}", "INFO")

            elif "骑手信息" in filename:
                list_info.append(df)
                yield create_log_event(f"-> 提取骑手信息数据: {filename}", "INFO")

            elif "骑手数据明细" in filename:
                list_detail.append(df)
                yield create_log_event(f"-> 提取骑手详情数据: {filename}", "INFO")

            elif "merchantFreelancer" in filename:
                list_shangyi.append(df)
                yield create_log_event(f"-> 提取天津商翼绑定数据: {filename}", "INFO")

            elif "薪资代领" in filename:
                list_dailing.append(df)
                yield create_log_event(f"-> 提取薪资代领明细数据: {filename}", "INFO")
                
        yield create_progress_event(0.4)
        
        # 并发执行 concat 以减少主线程阻塞 (通常 concat 很快，但也可以放在线程中)
        def _concat_dfs():
            # 处理逻辑：对多个数据源文件或字典数据结构进行拼接与去重合并
            return (
                pd.concat(list_fengshen, ignore_index=True) if list_fengshen else pd.DataFrame(),
                pd.concat(list_shangyi, ignore_index=True) if list_shangyi else pd.DataFrame(),
                pd.concat(list_info, ignore_index=True) if list_info else pd.DataFrame(),
                pd.concat(list_detail, ignore_index=True) if list_detail else pd.DataFrame(),
                pd.concat(list_dailing, ignore_index=True) if list_dailing else pd.DataFrame()
            )
            
        df_fengshen, df_shangyi, df_info, df_detail, df_dailing = await loop.run_in_executor(None, _concat_dfs)

        # 提取A2单元格值
        extracted_month = "默认暂定"
        folder_month = "默认月"
        folder_year = str(datetime.now().year) + "年"
        if not df_detail.empty and len(df_detail) > 0 and len(df_detail.columns) > 0:
            a2_val = str(df_detail.iloc[0, 0]).strip()
            try:
                dt = pd.to_datetime(a2_val)
                extracted_month = dt.strftime("%Y年%m月")
                folder_month = f"{dt.month}月"
                folder_year = f"{dt.year}年"
            except:
                import re
                match = re.search(r"(\d{4})[-/年]?(\d{1,2})", a2_val)
                if match:
                    y, m = match.groups()
                    extracted_month = f"{y}年{int(m):02d}月"
                    folder_month = f"{int(m)}月"
                    folder_year = f"{y}年"
                else:
                    if len(a2_val) >= 7:
                        extracted_month = a2_val[:7].replace("/", "年").replace("-", "年") + "月"
                        try:
                            folder_month = str(int(extracted_month.split('年')[1].replace('月', ''))) + "月"
                            folder_year = extracted_month.split('年')[0] + "年"
                        except:
                            folder_month = "默认月"
                            folder_year = str(datetime.now().year) + "年"
        
        if extracted_month == "默认暂定":
            extracted_month = datetime.now().strftime("%Y年%m月")
            folder_month = str(datetime.now().month) + "月"
            folder_year = str(datetime.now().year) + "年"
            yield create_log_event(f"未匹配到A2日期列，默认提取月份使用: {extracted_month}", "WARN")
        else:
            yield create_log_event(f"-> 成功提取核算月份: {extracted_month} (文件夹: {folder_month})", "INFO")

        yield create_progress_event(0.5)

        # 8、导出文件
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.abspath(os.path.join(project_root, "outputs", "骑手支付绑定", folder_year, folder_month))
        if os.path.exists(output_dir):
            import shutil
            shutil.rmtree(output_dir)
        os.makedirs(output_dir)
        
        today_str = datetime.now().strftime('%m%d')
        output_file = os.path.join(output_dir, f"(汇总){extracted_month}骑手支付绑定{today_str}.xlsx")
        
        sht1_name = f"{extracted_month}骑手绑定情况"
        sht2_name = f"{extracted_month}未绑名单"
        
        def get_col(df, exact_names):
            # 处理逻辑：获取并返回所需的系统状态或计算数据
            for exact in exact_names:
                for c in df.columns:
                    if str(c).strip() == exact:
                        return c
            return None
            
        yield create_log_event("-> 正在分析并提取绑定状态映射 (匹配城市、单量、发薪通道)...", "INFO")
        
        # 1. 整理 df_detail
        if not df_detail.empty:
            df_order = df_detail.copy()
            # 取消容错机制，改用精准列匹配
            order_col = get_col(df_order, ["有效完成单"])
            rid_col = get_col(df_order, ["骑手ID"])
            team_col = get_col(df_order, ["团队名称"])
            name_col = get_col(df_order, ["骑手姓名"])
            
            if order_col:
                df_order[order_col] = pd.to_numeric(df_order[order_col], errors='coerce').fillna(0)
            
            if rid_col and team_col and order_col and name_col:
                # 提取到的团队名称，骑手ID，骑手姓名列需进行去重，最终按团队名称汇总骑手总单量
                df_base = df_order.groupby([team_col, rid_col, name_col], as_index=False)[order_col].sum()
                df_base.rename(columns={order_col: "单量汇总"}, inplace=True)
            else:
                rid_col = rid_col or "RID"
                team_col = team_col or "TEAM"
                name_col = name_col or "NAME"
                df_base = pd.DataFrame(columns=[rid_col, team_col, "单量汇总", name_col])
        else:
            rid_col = "RID"; team_col = "TEAM"; name_col = "NAME"
            df_base = pd.DataFrame(columns=[rid_col, team_col, "单量汇总", name_col])

        # 2. Config City Mapping
        config_mapping = {}
        if deductionRules:
            if isinstance(deductionRules, list) and len(deductionRules) > 0 and 'sites' in deductionRules[0]:
                # 新版嵌套结构: City[]
                for city_data in deductionRules:
                    city_name = str(city_data.get('name', '')).strip()
                    if not city_name: continue
                    for site_data in city_data.get('sites', []):
                        team_name = str(site_data.get('name', '')).strip()
                        if team_name:
                            config_mapping[team_name] = city_name
            else:
                # 兼容老版本
                for rule in deductionRules:
                    teamName = str(rule.get("teamName", "")).strip()
                    city = str(rule.get("city", "")).strip()
                    if teamName and city:
                        config_mapping[teamName] = city
        
        if not config_mapping:
            # Fallback to local config file if UI config is empty
            config_wb_path = None
            
            # 优先检查应用根目录
            project_root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            for fname in ["config.xlsx", "配置.xlsx", "config.csv"]:
                for base_p in [os.getcwd(), project_root_dir]:
                    p = os.path.join(base_p, fname)
                    if os.path.exists(p):
                        config_wb_path = p
                        break
                if config_wb_path:
                    break
                    
            if not config_wb_path:
                for root, dirs, fnames in os.walk(source_path):
                    for fname in fnames:
                        if ("config" in fname.lower() or "配置" in fname) and not fname.startswith("~$"):
                            config_wb_path = os.path.join(root, fname)
                            break
                    if config_wb_path: break
            
            if config_wb_path:
                try:
                    df_config = pd.read_excel(config_wb_path, sheet_name=0, dtype=object)
                    for _, row in df_config.iterrows():
                        team_name = str(row.get("团队名称", "")).strip()
                        city_name = str(row.get("城市", "")).strip()
                        if team_name and city_name and city_name != "nan":
                            config_mapping[team_name] = city_name
                    yield create_log_event(f">>> 从外部配置文件 [{os.path.basename(config_wb_path)}] 中读取了 {len(config_mapping)} 个团队的城市映射！", "INFO")
                except Exception as e:
                    yield create_log_event(f">>> 尝试解析外部配置文件失败: {e}", "WARN")

        # 3. df_info matching
        info_id_col = get_col(df_info, ["骑手ID"]) if not df_info.empty else None
        info_idcard_col = get_col(df_info, ["身份证", "身份证号", "身份证号码", "骑手身份证"]) if not df_info.empty else None
        info_phone_col = get_col(df_info, ["手机号"]) if not df_info.empty else None
        info_name_col = get_col(df_info, ["骑手姓名"]) if not df_info.empty else None
        info_team_col = get_col(df_info, ["团队名称"]) if not df_info.empty else None
        
        info_mapping = {}
        if info_id_col and not df_info.empty:
            df_i_valid = df_info.dropna(subset=[info_id_col]).copy()
            rids = df_i_valid[info_id_col].astype(str).str.strip().str.replace(".0", "", regex=False)
            idcards = df_i_valid[info_idcard_col].astype(str).str.strip() if info_idcard_col else [""] * len(df_i_valid)
            phones = df_i_valid[info_phone_col].astype(str).str.strip().str.replace(".0", "", regex=False) if info_phone_col else [""] * len(df_i_valid)
            names = df_i_valid[info_name_col].astype(str).str.strip() if info_name_col else [""] * len(df_i_valid)
            teams = df_i_valid[info_team_col].astype(str).str.strip() if info_team_col else [""] * len(df_i_valid)
            
            for rid, idc, ph, nm, tm in zip(rids, idcards, phones, names, teams):
                if rid and rid != "nan":
                    info_mapping[rid] = {
                        "idcard": idc if idc != "nan" else "",
                        "phone": ph if ph != "nan" else ""
                    }
        
        # 4. df_fengshen matching
        fs_id_col = get_col(df_fengshen, ["骑手ID"]) if not df_fengshen.empty else None
        fs_bound_set = set()
        if fs_id_col and not df_fengshen.empty:
            valid_fs = df_fengshen[fs_id_col].astype(str).str.strip().str.replace(".0", "", regex=False)
            fs_bound_set = set(valid_fs[(valid_fs != "") & (valid_fs != "nan")])
        
        # 5. df_shangyi matching
        sy_idcard_col = get_col(df_shangyi, ["身份证", "身份证号", "身份证号码", "分包骑手证件号码", "证件号码"]) if not df_shangyi.empty else None
        sy_status_col = get_col(df_shangyi, ["状态"]) if not df_shangyi.empty else None
        sy_bound_set = set()
        if sy_idcard_col and sy_status_col and not df_shangyi.empty:
            df_sy_valid = df_shangyi.dropna(subset=[sy_idcard_col, sy_status_col]).copy()
            idcards = df_sy_valid[sy_idcard_col].astype(str).str.strip().str.upper()
            statuses = df_sy_valid[sy_status_col].astype(str).str.strip()
            for idc, st in zip(idcards, statuses):
                if idc and idc != "NAN" and "已签约" in st:
                    sy_bound_set.add(idc)
                    
        # 6. Build final list
        final_rows = []
        base_rids = df_base[rid_col].astype(str).str.strip().str.replace(".0", "", regex=False)
        base_teams = df_base[team_col].astype(str).str.strip()
        base_names = df_base[name_col].astype(str).str.strip()
        base_orders = df_base["单量汇总"] if "单量汇总" in df_base else [0]*len(df_base)
        
        yield create_progress_event(0.55)
        
        # 处理代领明细表过滤
        formatted_month_for_filter = formatted_month if 'formatted_month' in locals() else extracted_month.replace('月', '')
        
        dailing_rid_set = set()
        if not df_dailing.empty:
            month_col = get_col(df_dailing, ["代领月份"])
            enable_col = get_col(df_dailing, ["启停用"])
            status_col = get_col(df_dailing, ["流程状态"])
            
            cond1 = df_dailing[month_col].astype(str).str.strip().str.contains(formatted_month_for_filter, regex=False) if month_col else True
            cond2 = df_dailing[enable_col].astype(str).str.strip() == "启用" if enable_col else True
            cond3 = df_dailing[status_col].astype(str).str.strip() == "审核通过" if status_col else True
            
            df_dailing_filtered = df_dailing[cond1 & cond2 & cond3].copy()
            df_dailing = df_dailing_filtered
            
            dailing_idcard_col = get_col(df_dailing, ["身份证", "身份证号", "身份证号码", "打款人身份证号码", "骑手身份证"])
            if dailing_idcard_col:
                valid_dl = df_dailing[dailing_idcard_col].astype(str).str.strip().str.upper()
                dailing_rid_set = set(valid_dl[(valid_dl != "") & (valid_dl != "NAN")])
        
        yield create_progress_event(0.6)
        
        import re
        for r_id, r_team, r_name, r_orders in zip(base_rids, base_teams, base_names, base_orders):
            r_city = config_mapping.get(r_team, "未知")
            info_data = info_mapping.get(r_id, {"idcard": "", "phone": ""})
            r_idcard = info_data["idcard"]
            r_phone = info_data["phone"]
            
            fs_status = "已绑定" if r_id in fs_bound_set else "未绑定"
            sy_search_id = str(r_idcard).strip().upper()
            sy_status = "已绑定" if sy_search_id in sy_bound_set else "未绑定"
            
            if fs_status == "已绑定" and sy_status == "已绑定":
                bind_status = "已绑定"
            elif fs_status == "已绑定" and sy_status == "未绑定":
                bind_status = "天津商翼未绑定"
            elif fs_status == "未绑定" and sy_status == "已绑定":
                bind_status = "风神未绑定"
            else:
                bind_status = "风神，天津商翼均未绑定"
                
            is_black = "是" if str(r_idcard).strip().upper() in dailing_rid_set else "否"
                
            final_rows.append({
                "城市": r_city,
                "团队名称": r_team,
                "骑手ID": r_id,
                "骑手姓名": r_name,
                "骑手身份证": r_idcard,
                "骑手手机号": r_phone,
                "风神绑定": fs_status,
                "发薪平台绑定": sy_status,
                "绑定情况": bind_status,
                "收款人ID": r_id,
                "收款人姓名": r_name,
                "收款人身份证号码": r_idcard,
                "收款人手机号码": r_phone,
                "单量汇总": pd.to_numeric(r_orders, errors='coerce') if r_orders else 0,
                "是否黑户": is_black
            })
            
        df_sht1 = pd.DataFrame(final_rows, columns=["城市","团队名称","骑手ID","骑手姓名","骑手身份证","骑手手机号","风神绑定","发薪平台绑定","绑定情况","收款人ID","收款人姓名","收款人身份证号码","收款人手机号码","单量汇总","是否黑户"])
        
        # 筛选: 未绑定
        df_sht2 = df_sht1[df_sht1["绑定情况"] != "已绑定"].copy() if not df_sht1.empty else pd.DataFrame()

        yield create_progress_event(0.7)
        yield create_log_event(f"-> 开始写入并生成汇总工作薄 (极速模式): {output_file}", "INFO")

        def _write_main_wb():
            # 处理逻辑：将处理完毕的数据格式化后输出写入到外部Excel或CSV文件
            with pd.ExcelWriter(output_file, engine='xlsxwriter') as writer:
                # 1. 预处理转数值
                if "骑手ID" in df_sht1.columns:
                    df_sht1["骑手ID"] = pd.to_numeric(df_sht1["骑手ID"], errors='coerce')
                if "收款人ID" in df_sht1.columns:
                    df_sht1["收款人ID"] = pd.to_numeric(df_sht1["收款人ID"], errors='coerce')
                if "骑手ID" in df_sht2.columns:
                    df_sht2["骑手ID"] = pd.to_numeric(df_sht2["骑手ID"], errors='coerce')
                if "收款人ID" in df_sht2.columns:
                    df_sht2["收款人ID"] = pd.to_numeric(df_sht2["收款人ID"], errors='coerce')
                if info_id_col and info_id_col in df_info.columns:
                    df_info[info_id_col] = pd.to_numeric(df_info[info_id_col], errors='coerce')
                if rid_col and rid_col in df_detail.columns:
                    df_detail[rid_col] = pd.to_numeric(df_detail[rid_col], errors='coerce')
                
                workbook = writer.book
                
                # 3. 样式配置
                header_format = workbook.add_format({
                    'bg_color': '#F8CBAD',
                    'font_name': '微软雅黑',
                    'font_size': 10,
                    'align': 'center',
                    'valign': 'vcenter',
                    'border': 1
                })
                
                cell_format = workbook.add_format({
                    'font_name': '微软雅黑',
                    'font_size': 10,
                    'align': 'center',
                    'valign': 'vcenter'
                })
                
                id_num_format = workbook.add_format({
                    'font_name': '微软雅黑',
                    'font_size': 10,
                    'align': 'center',
                    'valign': 'vcenter',
                    'num_format': '0'
                })
                
                sheets_to_write = [
                    (sht1_name, df_sht1),
                    (sht2_name, df_sht2),
                    ("风神绑定", df_fengshen),
                    ("天津商翼绑定", df_shangyi),
                    ("骑手信息", df_info),
                    ("骑手详情", df_detail),
                    ("薪资代领明细", df_dailing)
                ]
                
                # 2. 写入数据表
                for sheet_name, df_obj in sheets_to_write:
                    if df_obj.empty:
                        df_obj.to_excel(writer, sheet_name=sheet_name, index=False)
                        continue
                    
                    df_obj.to_excel(writer, sheet_name=sheet_name, index=False)
                    
                    # Only apply formatting to the generated result sheets to save time and memory
                    if sheet_name in (sht1_name, sht2_name):
                        ws = writer.sheets.get(sheet_name)
                        if ws:
                            try:
                                for i, col in enumerate(df_obj.columns):
                                    is_id = "ID" in str(col).upper()
                                    ws.set_column(i, i, 16 if is_id else 14, id_num_format if is_id else cell_format)
                                # 写入表头，使用指定的格式
                                ws.write_row(0, 0, df_obj.columns.values, header_format)
                            except Exception:
                                pass
                                
            return True

        # 在线程中无阻塞写文件，大幅提升UI响应
        await loop.run_in_executor(None, _write_main_wb)
        yield create_log_event("-> 汇总工作薄写入完成！", "INFO")
        
        # 7. Create individual city workbooks (并行生成)
        yield create_log_event("-> 正在并行生成城市专属工作薄...", "INFO")
        yield create_progress_event(0.8)
        
        today_str = datetime.now().strftime('%m%d')
        
        def _write_city_wb(city):
            # 处理逻辑：将处理完毕的数据格式化后输出写入到外部Excel或CSV文件
            city_wb_name = f"{city}{extracted_month}骑手支付绑定{today_str}.xlsx"
            city_output_file = os.path.join(output_dir, city_wb_name)
            
            df_city_sht1 = df_sht1[df_sht1["城市"] == city]
            df_city_sht2 = df_sht2[df_sht2["城市"] == city]
            
            with pd.ExcelWriter(city_output_file, engine='xlsxwriter') as city_writer:
                city_workbook = city_writer.book
                
                c_header_format = city_workbook.add_format({
                    'bg_color': '#F8CBAD',
                    'font_name': '微软雅黑',
                    'font_size': 10,
                    'align': 'center',
                    'valign': 'vcenter',
                    'border': 1
                })
                
                c_cell_format = city_workbook.add_format({
                    'font_name': '微软雅黑',
                    'font_size': 10,
                    'align': 'center',
                    'valign': 'vcenter'
                })
                
                c_id_num_format = city_workbook.add_format({
                    'font_name': '微软雅黑',
                    'font_size': 10,
                    'align': 'center',
                    'valign': 'vcenter',
                    'num_format': '0'
                })
                
                for s_name, d_obj in [(sht1_name, df_city_sht1), 
                                      (sht2_name, df_city_sht2)]:
                    if d_obj.empty:
                        d_obj.to_excel(city_writer, sheet_name=s_name, index=False)
                        continue
                        
                    d_obj.to_excel(city_writer, sheet_name=s_name, index=False)
                    ws = city_writer.sheets.get(s_name)
                    
                    if ws:
                        try:
                            for i, col in enumerate(d_obj.columns):
                                is_id = "ID" in str(col).upper()
                                ws.set_column(i, i, 16 if is_id else 14, c_id_num_format if is_id else c_cell_format)
                            
                            ws.write_row(0, 0, d_obj.columns.values, c_header_format)
                        except Exception:
                            pass
                    
            return city_wb_name

        if not df_sht1.empty:
            valid_cities = [c for c in df_sht1["城市"].dropna().unique() if c != "未知" and str(c).strip() != ""]
            
            def _write_all_cities():
                # 处理逻辑：将处理完毕的数据格式化后输出写入到外部Excel或CSV文件
                results = []
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=8) as exc:
                    futures = {exc.submit(_write_city_wb, city): city for city in valid_cities}
                    for future in concurrent.futures.as_completed(futures):
                        try:
                            results.append(future.result())
                        except Exception as e:
                            print(f"Error writing city workbook: {e}")
                return results

            city_results = await loop.run_in_executor(None, _write_all_cities)
                
            for cw in city_results:
                yield create_log_event(f"  -> 成功极速生成: {cw}", "SUCCESS")

        elapsed_time = time.time() - start_time
        yield create_progress_event(1.0)
        yield create_log_event(f">>> 🎉 发薪工具绑定任务执行完成！(全部耗时: {elapsed_time:.2f} s)", "SUCCESS")
        
        # 计算看板统计数据
        df_stats_base = df_sht1
        
        stats_data = {}
        if not df_stats_base.empty:
            overall_stats = {
                "total_riders": len(df_stats_base),
                "total_orders": int(pd.to_numeric(df_stats_base["单量汇总"], errors='coerce').fillna(0).sum()),
                "fengshen_bind_count": len(df_stats_base[df_stats_base["风神绑定"] == "已绑定"]),
                "shangyi_bind_count": len(df_stats_base[df_stats_base["发薪平台绑定"] == "已绑定"]),
                "black_count": len(df_stats_base[df_stats_base["是否黑户"] == "是"])
            }
            overall_stats["fengshen_bind_rate"] = f"{(overall_stats['fengshen_bind_count'] / overall_stats['total_riders'] * 100):.2f}%" if overall_stats["total_riders"] > 0 else "0.00%"
            overall_stats["shangyi_bind_rate"] = f"{(overall_stats['shangyi_bind_count'] / overall_stats['total_riders'] * 100):.2f}%" if overall_stats["total_riders"] > 0 else "0.00%"

            city_stats = {}
            for city in df_stats_base["城市"].unique():
                temp_city = str(city).strip()
                if temp_city in ("", "nan", "未知"): continue
                city_df = df_stats_base[df_stats_base["城市"] == city]
                stations = []
                for team in city_df["团队名称"].unique():
                    team_df = city_df[city_df["团队名称"] == team]
                    t_total = len(team_df)
                    if t_total == 0: continue
                    t_fs = len(team_df[team_df["风神绑定"] == "已绑定"])
                    t_sy = len(team_df[team_df["发薪平台绑定"] == "已绑定"])
                    t_black = len(team_df[team_df["是否黑户"] == "是"])
                    t_orders = int(pd.to_numeric(team_df["单量汇总"], errors='coerce').fillna(0).sum())
                    stations.append({
                        "station_name": team,
                        "total_riders": t_total,
                        "total_orders": t_orders,
                        "fengshen_bind_rate": f"{(t_fs / t_total * 100):.2f}%",
                        "shangyi_bind_rate": f"{(t_sy / t_total * 100):.2f}%",
                        "black_count": t_black
                    })
                
                c_total = len(city_df)
                c_fs = len(city_df[city_df["风神绑定"] == "已绑定"])
                c_sy = len(city_df[city_df["发薪平台绑定"] == "已绑定"])
                c_black = len(city_df[city_df["是否黑户"] == "是"])
                c_orders = int(pd.to_numeric(city_df["单量汇总"], errors='coerce').fillna(0).sum())
                city_stats[temp_city] = {
                    "total_riders": c_total,
                    "total_orders": c_orders,
                    "fengshen_bind_rate": f"{(c_fs / c_total * 100):.2f}%" if c_total > 0 else "0.00%",
                    "shangyi_bind_rate": f"{(c_sy / c_total * 100):.2f}%" if c_total > 0 else "0.00%",
                    "black_count": c_black,
                    "stations": stations
                }

            stats_data = {
                "overall": overall_stats,
                "cities": city_stats,
                "month": folder_month
            }
            
            # Save to json file
            try:
                stats_file = os.path.join(output_dir, "stats.json")
                import json
                with open(stats_file, 'w', encoding='utf-8') as f:
                    json.dump(stats_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                pass

        yield create_finish_event("success", "骑手支付绑定任务执行完成。休眠中...", output_file, stats_data)

        
    except Exception as e:
        yield create_log_event(f">>> [错误] 执行发薪绑定合并时发生严重异常: {e}", "ERROR")
        yield create_finish_event("error", str(e))

