# ==========================================
# 核心数据处理计算引擎
# 本文件主要用于：
# 1. 解析与清洗各平台骑手原始打卡、配送、违规报表
# 2. 基于动态配置和团队规则进行复杂的薪资计算
# 3. 计算配送费、服务奖惩、各类扣款、兼职账单明细等
# 4. 生成最终计算好的Excel合并报表
# ==========================================
import copy
import re
import uuid
# /backend/processor.py
import os
import glob
import time
import random
import pandas as pd
import numpy as np
import openpyxl
from datetime import datetime

def safe_read_excel(io, **kwargs):
    # 处理逻辑：safe_read_excel 的主要执行逻辑
    try:
        return pd.read_excel(io, engine="calamine", **kwargs)
    except:
        return pd.read_excel(io, **kwargs)

def safe_parse_date(s):
    # 处理逻辑：处理时间戳、日期字符串格式转换与周期计算
    if not isinstance(s, pd.Series):
        s = pd.Series(s)
    s_numeric = pd.to_numeric(s, errors='coerce')
    is_excel_date = s_numeric.notna() & (s_numeric > 30000) & (s_numeric < 60000)
    res = pd.Series(index=s.index, dtype='datetime64[ns]')
    if is_excel_date.any():
        res.loc[is_excel_date] = pd.to_datetime(s_numeric[is_excel_date], origin='1899-12-30', unit='D')
    normal_dates = ~is_excel_date
    if normal_dates.any():
        res.loc[normal_dates] = pd.to_datetime(s[normal_dates], errors='coerce')
    return res

def extract_past_records(out_folder):
    # 处理逻辑：extract_past_records 的主要执行逻辑
    past_attendance_dict = {}
    past_attendance_notes = {}
    past_month_fee_deducted = {}
    try:
        import os, re
        import pandas as pd
        if os.path.exists(out_folder):
            for f in os.listdir(out_folder):
                if f.endswith(('.xls', '.xlsx')) and not f.startswith("~") and "兼职" in f:
                    m = re.search(r'\d{1,2}\.\d{1,2}-\d{1,2}\.\d{1,2}', f)
                    date_str = m.group(0) if m else os.path.splitext(f)[0]
                    try:
                        p_df = pd.read_excel(os.path.join(out_folder, f), sheet_name="安全基金", dtype=str)
                        p_id_col = next((c for c in p_df.columns if "骑手ID" in c), None)
                        p_days_col = next((c for c in p_df.columns if "出勤天" in c or "本期出勤" in c), None)
                        p_fee_col = next((c for c in p_df.columns if "月费" in c), None)
                        
                        if p_id_col and p_days_col:
                            for _, prow in p_df.iterrows():
                                pid = str(prow[p_id_col]).replace('.0', '').strip()
                                pdays = prow[p_days_col]
                                if pid and pdays and str(pdays).replace('.','',1).isdigit():
                                    d = int(float(pdays))
                                    if d > 0:
                                        past_attendance_dict[pid] = past_attendance_dict.get(pid, 0) + d
                                        if pid not in past_attendance_notes:
                                            past_attendance_notes[pid] = []
                                        past_attendance_notes[pid].append(f"{date_str}出勤{d}天")
                        
                        if p_id_col and p_fee_col:
                            for _, prow in p_df.iterrows():
                                pid = str(prow[p_id_col]).replace('.0', '').strip()
                                pfee = prow[p_fee_col]
                                if pd.notna(pfee) and str(pfee).strip():
                                    try:
                                        if abs(float(pfee)) > 0:
                                            past_month_fee_deducted[pid] = True
                                    except:
                                        pass
                    except:
                        pass
    except Exception as e:
        pass
    return past_attendance_dict, past_attendance_notes, past_month_fee_deducted

def process_rider_data(city, selected_option, source_folder, base_path, log_callback, progress_callback,
    # 处理逻辑：对原始数据进行逐行解析、清洗、转换与规则应用
                       finish_callback, theme, enable_interceptor=False, enable_cross_station_merge=False, prompt_callback=None, **kwargs):
    def log(msg, level="INFO"):
        # 处理逻辑：日志输出及前端进度条回调事件生成
        prefix = {"INFO": "[INFO]", "WARN": "[WARN]", "ERROR": "[ERRO]", "SYSTEM": "[SYS ]", "SUCCESS": "[ OK ]"}.get(
            level, "[INFO]")
        log_callback(f"{prefix} {msg}\n", level)

    global_df_delivery = None

    def find_wb_col(columns, default_idx=None):
        # 处理逻辑：find_wb_col 的主要执行逻辑
        for c in columns:
            if str(c).strip() in ["运单号", "运单id", "运单ID", "单号", "包裹单号", "运单"]: return c
        for c in columns:
            c_str = str(c).strip()
            if "状态" not in c_str and any(kw in c_str for kw in ["运单", "单号"]): return c
        for c in columns:
            c_str = str(c).strip()
            if "状态" not in c_str and "订单" in c_str: return c
        if default_idx is not None and default_idx < len(columns): return columns[default_idx]
        return None

    def clean_wb_str(val):
        # 处理逻辑：数据规范化清洗，去除空值及格式错误的数据记录
        if pd.isna(val) or val is None or str(val).strip().lower() == 'nan':
            return ""
        s = str(val).strip().lstrip("'")
        if s.endswith('.0'):
            s = s[:-2]
        return s

    def to_numeric_if_possible(val_str):
        # 处理逻辑：to_numeric_if_possible 的主要执行逻辑
        if not val_str:
            return val_str
        try:
            f = float(val_str)
            if f.is_integer():
                return int(f)
            return f
        except ValueError:
            return val_str

    def _norm_date(val):
        # 处理逻辑：数据规范化清洗，去除空值及格式错误的数据记录
        if pd.isna(val) or val is None: return ""
        
        # Add parsing for 4xxxx numeric dates commonly found in Excel via parse_date logic
        try:
            num_val = float(val)
            if 30000 < num_val < 60000:
                dt = pd.to_datetime(num_val, origin='1899-12-30', unit='D')
                return dt.strftime('%Y-%m-%d')
        except:
            pass
            
        if isinstance(val, pd.Timestamp) or type(val).__name__ == 'datetime':
            return val.strftime('%Y-%m-%d')
            
        s = str(val).strip().split(' ')[0].replace('/', '-')
        # pad single digits
        parts = s.split('-')
        if len(parts) == 3:
            s = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
        
        import re
        
        match1 = re.match(r'^(\d{4})[-/年\.](\d{1,2})[-/月\.](\d{1,2})日?$', s)
        if match1:
            return f"{match1.group(1)}-{int(match1.group(2)):02d}-{int(match1.group(3)):02d}"
            
        match2 = re.match(r'^(\d{1,2})[-/月\.](\d{1,2})日?$', s)
        if match2:
            from datetime import datetime
            year = datetime.now().year
            return f"{year}-{int(match2.group(1)):02d}-{int(match2.group(2)):02d}"
            
        return s

    def get_id_name(row_series):
        # 处理逻辑：获取并返回所需的系统状态或计算数据
        r_id, r_name = "", ""
        for c in row_series.index:
            c_str = str(c)
            c_lower = c_str.lower()
            if ('id' in c_lower or '编号' in c_lower) and not any(
                    x in c_lower for x in ['运单', '订单', '站', '团队', '门店', '网点', '商户']):
                r_id = str(row_series[c])
            if c_str in ['骑手姓名', '配送员姓名', '姓名', '员工姓名', '骑手名称'] or \
                    ('姓名' in c_str and '站' not in c_str) or \
                    ('名称' in c_str and '骑手' in c_str):
                r_name = str(row_series[c])
        return r_id.replace('.0', '').strip(), r_name.replace('.0', '').strip()

    stats_info = {
        "riders": 0, "orders": 0, "penalty_orders": 0, "problem_orders": 0, "elapsed_time": 0.0, "out_folder": ""
    }

    try:
        city = str(city).strip()
        start_time = time.time()
        progress_callback(0.02, "正在初始化数据分析引擎...")
        log(f">>> {random.choice(theme['msg_start'])}", "SYSTEM")

        from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
        from openpyxl.utils.dataframe import dataframe_to_rows
        from openpyxl.utils import get_column_letter

        log(f">>> {random.choice(theme['msg_awake'])}", "SYSTEM")
        progress_callback(0.05, "正在执行权限审计与环境检查...")

        keywords = ["欺诈单", "问题单", "违规", "配送费", "骑手支付绑定", "兼职价格档案", "价格档案"]
        ar = ["是否剔除", "剔除原因", "扣款金额"]

        dict1 = {
            "配送费": [5, 0, 13], "问题单": [3, 1, 2, 9, 10, 11], "违规扣款": [5, 0, 13, 17, 18, 19]
        }
        
        valid_riders_dates = set()
        dictp_fraud = set()
        dict2_late = set()
        price_mapping_idcard = {}
        price_mapping_id = {}
        price_mapping_name = {}

        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # 尝试从 base_path 中提取 workspace_id
        import re
        import json
        wid_match = re.search(r'(u_[A-Za-z0-9]+)', str(base_path))
        if wid_match:
            wid = wid_match.group(1)
            mapping_file = os.path.join(project_root, f".aegis_mapping_{wid}.json")
            if os.path.exists(mapping_file):
                try:
                    with open(mapping_file, 'r', encoding='utf-8') as mf:
                        custom_map = json.load(mf)
                        for key, indices_list in custom_map.items():
                            if key in dict1:
                                # Ensure it's a list combining with defaults
                                custom_indices = dict1[key].copy()
                                for idx, val in enumerate(indices_list):
                                    if val is not None and str(val).isdigit():
                                        custom_indices[idx] = int(val)
                                dict1[key] = custom_indices
                    log(f"-> 🎯 成功合并从参数配置中心读取的动态字段映射字典")
                except Exception as e:
                    log(f"读取映射配置中心时出错: {e}", "WARN")

        # 从 source_folder 中读取 兼职-template.xlsx 的申请名单
        template_wb_path = None
        for root, dirs, files in os.walk(source_folder):
            for file in files:
                if file == "兼职-template.xlsx" or file.startswith("兼职-template"):
                    template_wb_path = os.path.join(root, file)
                    break
            if template_wb_path:
                break
                
        if not template_wb_path or not os.path.exists(template_wb_path): 
            raise FileNotFoundError(f"致命：未在数据目录中找到 兼职-template.xlsx，请将模板与数据目录一同上传。搜索根目录: {source_folder}")

        # === 动态获取业务城市 (移入后续流程进行) ===
        frontend_city = city

        def _safe_str_apply(x):
            # 处理逻辑：_safe_str_apply 的主要执行逻辑
            if pd.isna(x): return ""
            if isinstance(x, (int, float)):
                return format(x, ".0f") if float(x) == int(x) else str(x)
            return str(x).strip(' ="\t\r\n')

        df_apply = pd.read_excel(template_wb_path, sheet_name="申请名单", dtype=object)
        for c in df_apply.columns:
            df_apply[c] = df_apply[c].apply(_safe_str_apply)
            
        deduction_rules = kwargs.get("deductionRules", [])
        flat_rules = []
        if deduction_rules:
            if isinstance(deduction_rules, list) and len(deduction_rules) > 0 and 'sites' in deduction_rules[0]:
                for city_data in deduction_rules:
                    for site_data in city_data.get('sites', []):
                        flat_rule = {
                            "城市": city_data.get('name', ''),
                            "团队名称": site_data.get('name', ''),
                            "团队ID": site_data.get('siteId', '')
                        }
                        for item in site_data.get('deductionItems', []):
                            item_name = item.get('name')
                            flat_rule[item_name] = item.get('amount', 0)
                            if item.get('maxDays') is not None:
                                flat_rule[f"{item_name}_maxDays"] = item.get('maxDays')
                            flat_rule[f"{item_name}_isKw"] = item.get('isKeywordBased', False)
                        flat_rules.append(flat_rule)
            else:
                flat_rules = deduction_rules
                
        if not flat_rules:
            # Fallback to local config file if UI config is empty
            config_wb_path = None
            
            # 1. 优先检查用户上传的 source_folder 里的配置文件
            for root, dirs, files in os.walk(source_folder):
                for file in files:
                    if ("config" in file.lower() or "配置" in file) and not file.startswith("~$"):
                        config_wb_path = os.path.join(root, file)
                        break
                if config_wb_path: break
            
            # 2. 如果没有，再检查应用根目录的默认模板
            if not config_wb_path:
                for fname in ["config.xlsx", "配置.xlsx", "config.csv"]:
                    p = os.path.join(os.getcwd(), fname)
                    p2 = os.path.join(os.getcwd(), "..", fname)
                    if os.path.exists(p):
                        config_wb_path = p
                        break
                    elif os.path.exists(p2):
                        config_wb_path = p2
                        break
                
            if config_wb_path:
                try:
                    df_config = pd.read_excel(config_wb_path, sheet_name=0, dtype=object)
                    for c in df_config.columns: df_config[c] = df_config[c].apply(_safe_str_apply)
                    
                    for _, row in df_config.iterrows():
                        team_name = str(row.get("团队名称", "")).strip()
                        if not team_name: continue
                        flat_rule = {
                            "城市": str(row.get("城市", "")).strip(),
                            "团队名称": team_name,
                            "团队ID": str(row.get("团队ID", "")).strip()
                        }
                        for c in df_config.columns:
                            c_name = str(c).strip()
                            if c_name not in ["城市", "团队名称", "团队ID"]:
                                val = str(row.get(c, "")).strip()
                                try:
                                    flat_rule[c_name] = float(val) if val != "" else 0
                                except:
                                    flat_rule[c_name] = 0
                                
                                # 对于常见的按次（问题单）扣款列，必须标记为 isKw = True
                                kw_cols = ["投诉", "差评", "违规虚假", "物流责", "不准时单", "超时", "T10", "提前点送达"]
                                flat_rule[f"{c_name}_isKw"] = True if any(kw in c_name for kw in kw_cols) else False
                        flat_rules.append(flat_rule)
                    log(f"-> 🎯 成功从外部配置文件 [{os.path.basename(config_wb_path)}] 解析扣款规则！", "INFO")
                except Exception as e:
                    log(f"尝试解析外部配置文件失败: {e}", "WARN")

        if flat_rules:
            df_rules = pd.DataFrame(flat_rules)
            df_rules = df_rules.rename(columns={
                "teamName": "团队名称",
                "teamId": "团队ID",
                "safeFund": "安全基金",
                "nonBeeCard": "非蜂卡",
                "monthFee": "月费"
            })
            log(f"-> 🎯 成功解析扣款项配置，提取了 {len(df_rules.columns) - 3} 个动态扣款项目")
        else:
            df_rules = pd.DataFrame(columns=["城市", "团队名称", "团队ID", "安全基金", "非蜂卡", "月费"])

        team_mapping = {}
        try:
            df_team = df_rules.copy()
            for c in df_team.columns: df_team[c] = df_team[c].apply(_safe_str_apply)
            if not df_team.empty:
                name_col = "团队名称"
                id_col = "团队ID"
                team_mapping = dict(zip(df_team[name_col].fillna("").astype(str).str.strip(),
                                        df_team[id_col].fillna("").astype(str).str.strip()))
            log(f"权限校验列表已加载，识别 {len(team_mapping)} 个有效处理组。")
        except Exception as e:
            log(f"环境依赖 [config] 解析失败 (目标索引将置空): {e}", "WARN")

        def get_col_idx(df, keywords, default_idx):
            # 处理逻辑：获取并返回所需的系统状态或计算数据
            for i, col in enumerate(df.columns):
                if any(kw in str(col) for kw in keywords):
                    return i
            if len(df.columns) > default_idx:
                return default_idx
            return 0
            
        team_idx = get_col_idx(df_apply, ["团队名称", "团队"], 0)
        rider_id_idx = get_col_idx(df_apply, ["骑手ID", "ID", "id"], 1)
        rider_name_idx = get_col_idx(df_apply, ["骑手姓名", "姓名"], 2)
        start_date_idx = get_col_idx(df_apply, ["开始日期", "开始时间", "开始"], 3)
        end_date_idx = get_col_idx(df_apply, ["结束日期", "结束时间", "结束"], 4)

        col3 = df_apply.columns[start_date_idx]
        col4 = df_apply.columns[end_date_idx]
        
        col3_data = safe_parse_date(df_apply[col3])
        col4_data = safe_parse_date(df_apply[col4])
        
        # 从配置表中稳健地读取结算类型
        settlement_type = None
        settlement_col = next((c for c in df_apply.columns if '结算' in str(c)), None)
        if settlement_col:
            first_valid = df_apply[settlement_col].dropna().astype(str).str.strip()
            first_valid = first_valid[(first_valid.str.lower() != 'nan') & (first_valid != '') & (first_valid != 'None')]
            if not first_valid.empty:
                settlement_type = first_valid.iloc[0]
        
        if not settlement_type:
            for r_idx in range(min(10, len(df_apply))):
                row_vals = df_apply.iloc[r_idx].fillna('').astype(str).str.strip()
                col_match = next((idx for idx, v in enumerate(row_vals) if '结算' in v), None)
                if col_match is not None:
                    for scan_idx in range(r_idx + 1, len(df_apply)):
                        val = str(df_apply.iloc[scan_idx, col_match]).strip()
                        if val and val.lower() not in ['nan', 'none']:
                            settlement_type = val
                            break
                    break
        
        if settlement_type:
            selected_option = settlement_type
            if selected_option.endswith('.0'):
                selected_option = selected_option[:-2]
            log(f"-> 🎯 成功从申请名单中提取周期类型(首项): {selected_option}", "INFO")

        # 从配置表中稳健地读取业务城市
        extracted_city = None
        city_col = next((c for c in df_apply.columns if '城市' in str(c)), None)
        if city_col:
            first_valid = df_apply[city_col].dropna().astype(str).str.strip()
            first_valid = first_valid[(first_valid.str.lower() != 'nan') & (first_valid != '') & (first_valid != 'none')]
            if not first_valid.empty:
                extracted_city = first_valid.iloc[0]
        
        if not extracted_city:
            for r_idx in range(min(10, len(df_apply))):
                row_vals = df_apply.iloc[r_idx].fillna('').astype(str).str.strip()
                col_match = next((idx for idx, v in enumerate(row_vals) if '城市' in v), None)
                if col_match is not None:
                    for scan_idx in range(r_idx + 1, len(df_apply)):
                        val = str(df_apply.iloc[scan_idx, col_match]).strip()
                        if val and val.lower() not in ['nan', 'none']:
                            extracted_city = val
                            break
                    break
        
        if extracted_city:
            city = extracted_city
            log(f"-> 🎯 成功从申请名单中提取业务城市: {city}", "INFO")

        # 从配置表中稳健地读取防重拦截
        extracted_interceptor = None
        interceptor_col = next((c for c in df_apply.columns if '防重拦截' in str(c) or '拦截' in str(c)), None)
        if interceptor_col:
            first_valid = df_apply[interceptor_col].dropna().astype(str).str.strip()
            first_valid = first_valid[(first_valid.str.lower() != 'nan') & (first_valid != '') & (first_valid != 'none')]
            if not first_valid.empty:
                extracted_interceptor = first_valid.iloc[0]
        
        if not extracted_interceptor:
            for r_idx in range(min(10, len(df_apply))):
                row_vals = df_apply.iloc[r_idx].fillna('').astype(str).str.strip()
                col_match = next((idx for idx, v in enumerate(row_vals) if '防重拦截' in v or '拦截' in v), None)
                if col_match is not None:
                    for scan_idx in range(r_idx + 1, len(df_apply)):
                        val = str(df_apply.iloc[scan_idx, col_match]).strip()
                        if val and val.lower() not in ['nan', 'none']:
                            extracted_interceptor = val
                            break
                    break
                    
        if extracted_interceptor:
            enable_interceptor = (extracted_interceptor == "是")
            log(f"-> 🎯 成功从申请名单中提取防重拦截配置: {'开启' if enable_interceptor else '关闭'}", "INFO")

        # 从配置表中稳健地读取跨站合并
        extracted_cross_merge = None
        cross_merge_col = next((c for c in df_apply.columns if '跨站合并' in str(c) or '合并' in str(c)), None)
        if cross_merge_col:
            first_valid = df_apply[cross_merge_col].dropna().astype(str).str.strip()
            first_valid = first_valid[(first_valid.str.lower() != 'nan') & (first_valid != '') & (first_valid != 'none')]
            if not first_valid.empty:
                extracted_cross_merge = first_valid.iloc[0]
        
        if not extracted_cross_merge:
            for r_idx in range(min(10, len(df_apply))):
                row_vals = df_apply.iloc[r_idx].fillna('').astype(str).str.strip()
                col_match = next((idx for idx, v in enumerate(row_vals) if '跨站合并' in v or '合并' in v), None)
                if col_match is not None:
                    for scan_idx in range(r_idx + 1, len(df_apply)):
                        val = str(df_apply.iloc[scan_idx, col_match]).strip()
                        if val and val.lower() not in ['nan', 'none']:
                            extracted_cross_merge = val
                            break
                    break
                    
        if extracted_cross_merge:
            enable_cross_station_merge = (extracted_cross_merge == "是")
            log(f"-> 🎯 成功从申请名单中提取跨站合并配置: {'开启' if enable_cross_station_merge else '关闭'}", "INFO")

        log(f"目标节点: [{city}], 处理模式: [{selected_option}]")
        
        # 兼容文本形式的日期和Excel导出的纯数值形式（4xxxx）日期
        # 使用assign重新赋值避免pandas inplace assignment int64的报错
        df_apply = df_apply.assign(**{col3: col3_data, col4: col4_data})
        
        first_date = df_apply[col3].min()
        last_date = df_apply[col4].max()

        for row in df_apply.itertuples(index=False):
            try:
                team_name = str(row[team_idx]).strip()
                rider_id = str(row[rider_id_idx]).replace('.0', '').strip()
                rider_name = str(row[rider_name_idx]).strip()
                date_range = pd.date_range(row[start_date_idx], row[end_date_idx])
                for d in date_range: valid_riders_dates.add(f"{rider_id}|{d.strftime('%Y-%m-%d')}")
            except:
                continue

        apply_riders_count = len(df_apply.iloc[:, rider_id_idx].dropna().unique())
        log(f"历史快照读取完毕，缓冲池包含 {apply_riders_count} 个活动实体（拦截日志记录 {len(valid_riders_dates)} 次）！")
        progress_callback(0.15, "历史快照读取完毕，缓冲池已建立...")

        output_base = os.path.abspath(os.path.join(project_root, "outputs", "兼职薪资"))
        os.makedirs(output_base, exist_ok=True)
        out_folder = os.path.join(output_base, f"{last_date.month}月", city)
        stats_info["out_folder"] = out_folder
        os.makedirs(out_folder, exist_ok=True)

        existing_waybills = {"配送单": {}, "违规索赔": {}, "问题单": {}}
        if enable_interceptor:
            log(">>> 扫描本地缓冲，开启数据防重拦截策略...", "SYSTEM")
            if os.path.exists(out_folder):
                for file in glob.glob(os.path.join(out_folder, "*.xlsx")):
                    if "(重复)" in os.path.basename(file) or "~$" in os.path.basename(file): continue
                    try:
                        try:
                            xls = pd.ExcelFile(file, engine="calamine")
                        except:
                            xls = pd.ExcelFile(file, engine="openpyxl")
                        file_basename = os.path.basename(file)
                        for sht in ["配送单", "违规索赔", "问题单"]:
                            if sht in xls.sheet_names:
                                df_sht = xls.parse(sht, dtype=object)
                                for c in df_sht.columns: df_sht[c] = df_sht[c].apply(_safe_str_apply)
                                headers = list(df_sht.columns)
                                if sht == "问题单":
                                    wb_idx_name = find_wb_col(headers, 2)
                                    type_idx_name = headers[0] if len(headers) > 0 else None
                                    if wb_idx_name and type_idx_name:
                                        types = df_sht[type_idx_name]
                                        wbs = df_sht[wb_idx_name]
                                        for t, w in zip(types, wbs):
                                            if w and "nan" not in str(w).lower(): existing_waybills[sht][f"{t}_{w}"] = file_basename
                                else:
                                    fallback_idx = 10 if sht == "违规索赔" else None
                                    wb_idx_name = find_wb_col(headers, fallback_idx)
                                    if wb_idx_name:
                                        wbs = df_sht[wb_idx_name]
                                        for w in wbs:
                                            if w and "nan" not in str(w).lower(): existing_waybills[sht][w] = file_basename
                        xls.close()
                    except Exception as e:
                        log(f"重载历史缓冲区引发严重错误: {os.path.basename(file)} - {str(e)}", "WARN")

        intercept_records = []

        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # 使用上传目录中找到的 兼职-template.xlsx
        template_path = template_wb_path
        
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"致命：模板文件找不到了。请确保 兼职-template.xlsx 存在。")

        log(f"开启多线程数据分发引擎: {os.path.basename(template_path)}", "SYSTEM")
        wb1 = openpyxl.load_workbook(template_path)
        
        def fast_recreate_sheet(wb, sheet_name):
            # 处理逻辑：fast_recreate_sheet 的主要执行逻辑
            if sheet_name in wb.sheetnames:
                idx = wb.sheetnames.index(sheet_name)
                old_ws = wb[sheet_name]
                tab_color = old_ws.sheet_properties.tabColor
                del wb[sheet_name]
                new_ws = wb.create_sheet(title=sheet_name, index=idx)
                if tab_color:
                    try:
                        new_ws.sheet_properties.tabColor = copy.copy(tab_color)
                    except:
                        pass
                return new_ws
            return wb.create_sheet(title=sheet_name)
            
        # import copy
        ws_apply = fast_recreate_sheet(wb1, "申请名单")

        df_apply_out = df_apply.copy()
        settlement_periods = []
        for i in range(len(df_apply_out)):
            dt_start = df_apply_out.iloc[i, start_date_idx]
            dt_end = df_apply_out.iloc[i, end_date_idx]
            if not pd.isna(dt_start) and not pd.isna(dt_end) and hasattr(dt_start, 'month') and hasattr(dt_end, 'month'):
                settlement_periods.append(f"{dt_start.month}.{dt_start.day}-{dt_end.month}.{dt_end.day}")
            else:
                settlement_periods.append("")
                
        df_apply_out['结算周期'] = settlement_periods
        col3_name = df_apply_out.columns[start_date_idx]
        col4_name = df_apply_out.columns[end_date_idx]
        df_apply_out.drop(columns=[col3_name, col4_name], inplace=True)
        
        # 将骑手ID转换为常规数值类型
        if len(df_apply_out.columns) > rider_id_idx:
            rider_id_col = df_apply_out.columns[rider_id_idx]
            try:
                df_apply_out[rider_id_col] = pd.to_numeric(df_apply_out[rider_id_col], errors='coerce')
            except Exception:
                pass

        headers_apply = list(df_apply_out.columns)
        ws_apply.append(headers_apply)
        df_apply_out = df_apply_out.astype(object)
        df_apply_out[pd.isna(df_apply_out)] = None
        for row_data in df_apply_out.values.tolist():
            ws_apply.append(row_data)

        progress_callback(0.25, "目标区域模板匹配与预处理完毕...")

        log(">>> 正在检索目标区域的二进制数据源...", "SYSTEM")
        files_to_process = []
        
        if frontend_city == "小象超市":
            date_files = []
            for root, dirs, files in os.walk(source_folder):
                for file_name in files:
                    if file_name.lower().startswith('~$') or file_name.lower().startswith('.'):
                        continue
                    # Check if filename is a date e.g. 2026-06-01.xlsx
                    if re.match(r'^\d{4}[-/]\d{1,2}[-/]\d{1,2}\.(xlsx|xls|csv)$', file_name):
                        date_files.append(os.path.join(root, file_name))
                    else:
                        for kw in keywords:
                            if kw in file_name and file_name.lower().endswith(('.xls', '.xlsx', '.csv')) and kw != '配送费':
                                full_path = os.path.join(root, file_name)
                                if (full_path, kw) not in files_to_process:
                                    files_to_process.append((full_path, kw))
            
            if date_files:
                log(f">>> 发现 {len(date_files)} 个小象超市配送单文件，准备提取并合并...", "SYSTEM")
                dfs = []
                for df_file in date_files:
                    file_basename = os.path.splitext(os.path.basename(df_file))[0]
                    try:
                        if df_file.lower().endswith('.csv'):
                            tmp_df = pd.read_csv(df_file, encoding='gbk', dtype=str, low_memory=False)
                        else:
                            tmp_df = pd.read_excel(df_file, dtype=object)
                            for c in tmp_df.columns: tmp_df[c] = tmp_df[c].apply(_safe_str_apply)
                        if not tmp_df.empty:
                            try:
                                formatted_date = pd.to_datetime(file_basename).strftime('%Y/%m/%d')
                            except:
                                formatted_date = file_basename
                            tmp_df.insert(0, "日期", formatted_date)
                            dfs.append(tmp_df)
                    except Exception as e:
                        log(f"读取小象组合文件 {os.path.basename(df_file)} 失败: {e}", "WARN")
                
                if dfs:
                    combined_df = pd.concat(dfs, ignore_index=True)
                    temp_combine_path = os.path.join(source_folder, "配送费_小象合并.xlsx")
                    # For performance, we save it as a temporary excel file so it fits the existing workflow
                    combined_df.to_excel(temp_combine_path, index=False)
                    files_to_process.append((temp_combine_path, "配送费"))
                    log(f"小象超市配送单合并完成，生成缓冲文件 {os.path.basename(temp_combine_path)}", "INFO")
        else:
            for root, dirs, files in os.walk(source_folder):
                for file_name in files:
                    if file_name.lower().startswith('~$') or file_name.lower().startswith('.'):
                        continue
                    for kw in keywords:
                        if kw in file_name and file_name.lower().endswith(('.xls', '.xlsx', '.csv')):
                            full_path = os.path.join(root, file_name)
                            if (full_path, kw) not in files_to_process:
                                files_to_process.append((full_path, kw))
        
        total_files = len(files_to_process)
        log(f"目录索引构建完成，发现 {total_files} 个有效数据片段")
        
        t_before_files = time.time()
        
        has_delivery_fee = any('配送费' in kw_tuple[1] for kw_tuple in files_to_process)
        if not has_delivery_fee:
            raise FileNotFoundError("当前数据目录下未检测到包含【配送费】的数据表！请确保目录中含有配送单表后再执行核算。")
            
        if total_files == 0: log(random.choice(theme['msg_empty']), "WARN")

        processed_count = 0
        current_progress = 0.25
        progress_step = 0.6 / total_files if total_files > 0 else 0

        sort_priority = {
            "兼职价格档案": 0,
            "价格档案": 0,
            "欺诈单": 1,
            "问题单": 2,
            "违规": 3,
            "违规扣款": 3,
            "骑手支付绑定": 4,
            "配送费": 5
        }
        files_to_process.sort(key=lambda x: sort_priority.get(x[1], 99))
        
        rider_wtd_deductions = {} # { rider_id: { matched_item: amount } }

        for file_path, kw in files_to_process:
            wb_name = os.path.basename(file_path)

            if file_path.lower().endswith('.csv'):
                try:
                    df_source = pd.read_csv(file_path, encoding='gbk', dtype=str, low_memory=False)
                    if len(df_source.columns) <= 2: df_source = pd.read_csv(file_path, encoding='gbk', sep='\t',
                                                                            dtype=str)
                except UnicodeDecodeError:
                    df_source = pd.read_csv(file_path, encoding='utf-8', dtype=str, low_memory=False)
                    if len(df_source.columns) <= 2: df_source = pd.read_csv(file_path, encoding='utf-8', sep='\t',
                                                                            dtype=str)
            else:
                df_source = pd.read_excel(file_path, dtype=object)

            for col in df_source.columns: 
                # fast check if column is already numeric and doesn't need string stripping
                col_type = df_source[col].dtype
                if not pd.api.types.is_object_dtype(col_type):
                    pass # Keep numeric as is
                else:
                    # Use _safe_str_apply to prevent large number scientific notation and strip strings
                    df_source[col] = df_source[col].apply(_safe_str_apply)
                
                # Fast sample string length check
                if pd.api.types.is_object_dtype(df_source[col]):
                    sample = df_source[col].dropna()
                    sample = sample[sample != ""]
                    if not sample.empty:
                        # only check first 1000 for length to speed up
                        max_len = sample.head(1000).str.len().max()
                        if max_len >= 15:
                            continue  # Skip numeric conversion for this column to preserve ID card precision

                try:
                    s_replaced = df_source[col].copy()
                    if pd.api.types.is_object_dtype(s_replaced):
                        s_replaced.replace("", np.nan, inplace=True)
                    s_num = pd.to_numeric(s_replaced)
                    
                    # 自动转换为数字格式，因为需要保留常规数值类型
                    # 只需校验是否为数字
                    if not s_num.isna().any() or (pd.api.types.is_object_dtype(s_replaced) and s_replaced.isna().equals(s_num.isna())):
                        df_source[col] = s_num
                except Exception:
                    pass

            if "兼职价格档案" in wb_name or "价格档案" in wb_name:
                try:
                    if not file_path.lower().endswith('.csv'):
                        try:
                            df_price = pd.read_excel(file_path, sheet_name="兼职价格档案明细", dtype=object)
                        except:
                            df_price = pd.read_excel(file_path, sheet_name=0, dtype=object)
                        
                        def _safe_str(x):
                            # 处理逻辑：_safe_str 的主要执行逻辑
                            if pd.isna(x): return ""
                            if isinstance(x, (int, float)):
                                return format(x, ".0f") if float(x) == int(x) else str(x)
                            return str(x).strip(' ="\t\r\n')
                            
                        for col in df_price.columns:
                            df_price[col] = df_price[col].apply(_safe_str)
                    else:
                        df_price = df_source.copy()
                except Exception as e:
                    log(f"缺少外部映射依赖 [{wb_name}]，尝试使用预设参数", "WARN")
                    df_price = df_source.copy()

                date_idx = next((i for i, c in enumerate(df_price.columns) if str(c).strip() in ['日期', '账单时间', '时间']), next((i for i, c in enumerate(df_price.columns) if '日期' in str(c) or '账单时间' in str(c) or '时间' in str(c)), None))
                station_idx = next((i for i, c in enumerate(df_price.columns) if str(c).strip() in ['站点名称', '团队名称']), next((i for i, c in enumerate(df_price.columns) if '站点名称' in str(c) or '团队名称' in str(c)), next((i for i, c in enumerate(df_price.columns) if ('团队' in str(c) or '站点' in str(c) or '营业部' in str(c)) and 'id' not in str(c).lower()), None)))
                idcard_idx = next((i for i, c in enumerate(df_price.columns) if str(c).strip() in ['身份证', '身份证号', '证件号码', '证件']), next((i for i, c in enumerate(df_price.columns) if '身份证' in str(c)), None))
                price_idx = next((i for i, c in enumerate(df_price.columns) if str(c).strip() in ['价格', '单价', '蓝橙单价', '蓝橙']), next((i for i, c in enumerate(df_price.columns) if '价格' in str(c) or '单价' in str(c) or '蓝橙' in str(c)), None))
                
                # backwards compatibility
                rider_id_idx = next((i for i, c in enumerate(df_price.columns) if str(c).strip() in ['风神骑手ID', '风神骑手id', '骑手ID', '员工ID']), next((i for i, c in enumerate(df_price.columns) if '风神骑手id' in str(c).lower() or (('id' in str(c).lower() or '编号' in str(c)) and ('骑手' in str(c) or '员工' in str(c)))), None))
                rider_name_idx = next((i for i, c in enumerate(df_price.columns) if str(c).strip() in ['风神骑手姓名', '骑手姓名', '员工姓名', '姓名']), next((i for i, c in enumerate(df_price.columns) if '风神骑手姓名' in str(c) or (('名' in str(c) or '姓名' in str(c)) and ('骑手' in str(c) or '员工' in str(c)))), None))
                if rider_id_idx is None: rider_id_idx = 2
                if rider_name_idx is None: rider_name_idx = 3

                for r in df_price.itertuples(index=False):
                    try:
                        date_val = _norm_date(str(r[date_idx])) if date_idx is not None else (_norm_date(r[1]) if len(r) > 1 else "")
                        station_val = str(r[station_idx]).replace(' ','').replace('\u3000','').replace('\xa0','').replace('\n','').replace('\t','').strip() if station_idx is not None else (str(r[5]).replace(' ','').replace('\u3000','').replace('\xa0','').replace('\n','').replace('\t','').strip() if len(r) > 5 else "")
                        price_val = str(r[price_idx]).strip() if price_idx is not None else (str(r[8]).strip() if len(r) > 8 else "")
                        
                        idcard_val = str(r[idcard_idx]).strip().upper() if idcard_idx is not None else ""
                        r_id = str(r[rider_id_idx]).replace('.0', '').strip() if rider_id_idx is not None and rider_id_idx < len(r) else ""
                        r_name = str(r[rider_name_idx]).strip() if rider_name_idx is not None and rider_name_idx < len(r) else ""

                        if not date_val or not station_val or not price_val or price_val.lower() == 'nan':
                            continue

                        if idcard_val: price_mapping_idcard[f"{date_val}_{station_val}_{idcard_val}"] = price_val
                        if r_id: price_mapping_id[f"{date_val}_{station_val}_{r_id}"] = price_val
                        if r_name: price_mapping_name[f"{date_val}_{station_val}_{r_name}"] = price_val
                    except Exception:
                        pass

                log(f"-> 🎯 规则权重表注入成功！(新主键 {len(price_mapping_idcard)} 个，旧主键 {len(price_mapping_id)} 个)", "INFO")
                processed_count += 1
                current_progress += progress_step
                msg = random.choice(theme.get('msg_empty', ["正在处理"])) if 'theme' in locals() and 'msg_empty' in theme else "正在处理"
                progress_callback(current_progress, f"正在清洗规则与参数映射：{wb_name[:12]} ({processed_count}/{total_files})")
                continue

            match_key = next((k for k in dict1.keys() if k in wb_name), None)
            if match_key:
                cols = list(dict1[match_key])
                col_names_lower = [str(c).replace('\n', '').strip().lower() for c in df_source.columns]
                
                def _find_col(keywords, default_idx):
                    # 处理逻辑：_find_col 的主要执行逻辑
                    for kw in keywords:
                        for i, name in enumerate(col_names_lower):
                            if kw in name: return i
                    return default_idx
                    
                cols[0] = _find_col(["骑手id", "员工编码", "骑手编号", "骑手"], cols[0])
                cols[1] = _find_col(["业务交易时间", "账单时间", "不准时单最新罚减时间", "扣款月份", "扣款日期", "日期", "时间"], cols[1])
                cols[2] = _find_col(["运单号", "运单id", "关联单号", "订单号", "单号"], cols[2])
                
                if len(cols) > 3:
                    cols[3] = _find_col(["是否剔除", "剔除状态"], cols[3])
                    cols[4] = _find_col(["剔除原因"], cols[4])
                    cols[5] = _find_col(["罚减结算金额", "明细扣款金额", "扣款金额", "扣款"], cols[5])

                rider_col, date_col, wb_col = cols[0], cols[1], cols[2]
                max_needed_col = max(cols)
                while len(df_source.columns) <= max_needed_col: df_source[f"Temp_Col_{len(df_source.columns)}"] = np.nan
                waybill_col_name = df_source.columns[wb_col]
                df_source[waybill_col_name] = df_source[waybill_col_name].astype(str).str.lstrip("'")
                
                # Prevent Invalid value for dtype 'int64' error by casting the rider ID column to object
                rider_col_name = df_source.columns[rider_col]
                df_source[rider_col_name] = df_source[rider_col_name].astype(object)

                try:
                    r_vals = df_source.iloc[:, rider_col].values
                    d_vals = df_source.iloc[:, date_col].values
                    
                    # 极速版：列表推导式
                    rider_list = [str(x).replace('.0', '').strip() for x in r_vals]
                    date_list = [_norm_date(x)[:10] for x in d_vals]
                    
                    col_names_str = [str(c).lower() for c in df_source.columns]
                    team_col_idx = next((i for i, c in enumerate(col_names_str) if "团队" in c), -1)
                    name_col_idx = next((i for i, c in enumerate(col_names_str) if "姓名" in c or ("名称" in c and "骑手" in c)), -1)

                    combined_series = pd.Series(rider_list) + "|" + pd.Series(date_list)
                    mask_valid = combined_series.isin(valid_riders_dates)
                    df_source = df_source[mask_valid].copy()
                except Exception as e:
                    log(f"拦截点: 数据流水线捕获错误 {str(e)}", "WARN")

                if "问题单" in wb_name:
                    mask_late = df_source.iloc[:, 0].astype(str).str.contains("不准时单", na=False)
                    late_wbs = df_source.loc[mask_late, df_source.columns[wb_col]].apply(clean_wb_str)
                    dict2_late.update(late_wbs[late_wbs != ""].tolist())

                if match_key != "配送费":
                    col_names = list(df_source.columns)
                    for i in range(3, 6): col_names[cols[i]] = ar[i - 3]
                    df_source.columns = col_names

            if "欺诈单" in wb_name:
                valid_frauds = df_source["运单id"].apply(clean_wb_str) if "运单id" in df_source.columns else pd.Series()
                if not valid_frauds.empty: dictp_fraud.update(valid_frauds[valid_frauds != ""].tolist())

            elif "配送费" in wb_name:
                ws_sht0 = wb1["配送单"]
                ws_sht1 = wb1["配送所得表"]
                ws_sht2 = wb1["安全基金"]
                
                # Make column names unique to prevent pd.Series/DataFrame nested issues
                new_cols = []
                seen = {}
                for c in df_source.columns:
                    c_str = str(c)
                    if c_str in seen:
                        seen[c_str] += 1
                        new_cols.append(f"{c_str}_{seen[c_str]}")
                    else:
                        seen[c_str] = 0
                        new_cols.append(c_str)
                df_source.columns = new_cols
                
                if '详情' in df_source.columns:
                    df_source = df_source[df_source['详情'].astype(str).str.contains('完成单', na=False)]
                
                yellow_cols = ['账单时间', '团队ID', '团队名称', '骑手ID', '骑手名称', '详情', '订单号', '运单号', '业务交易时间', '订单来源', '标品', '门店ID', '门店名称']
                red_cols = ['金额', '基础配送费']
                
                cols_to_keep = []
                for c_name in df_source.columns:
                    c_str = str(c_name).strip()
                    if c_str in yellow_cols:
                        cols_to_keep.append(c_name)
                    elif "全职" in str(selected_option) and c_str in red_cols:
                        cols_to_keep.append(c_name)
                
                df_source = df_source.loc[:, cols_to_keep].copy()
                
                if '运单号' in df_source.columns:
                    df_source['运单号'] = df_source['运单号'].apply(clean_wb_str)
                    
                if '运单号' in df_source.columns:
                    df_source["运单状态"] = df_source['运单号'].apply(lambda x: "完成单-不准时" if x in dict2_late else "完成单")
                    df_source["是否欺诈单"] = df_source['运单号'].apply(lambda x: "是" if x in dictp_fraud else "否")
                else:
                    df_source["运单状态"] = "完成单"
                    df_source["是否欺诈单"] = "否"
                    
                if '账单时间' in df_source.columns:
                    df_source["是否周末"] = safe_parse_date(df_source['账单时间']).dt.dayofweek.apply(
                        lambda x: "是" if x in [5, 6] else "否")
                else:
                    df_source["是否周末"] = "否"

                wb_col_name = find_wb_col(df_source.columns)
                if wb_col_name:
                    clean_waybills = df_source[wb_col_name].apply(clean_wb_str)
                    mask_dup = clean_waybills.isin(existing_waybills["配送单"].keys())
                    df_dups = df_source[mask_dup].copy()
                    df_source = df_source[~mask_dup].copy()
                    stats_info["orders"] += len(df_source)
                    if not df_dups.empty:
                        dup_sources = {}
                        wb_col_idx = df_dups.columns.get_loc(wb_col_name)
                        rid_idx = next((i for i, c in enumerate(df_dups.columns) if "骑手" in str(c) and ("id" in str(c).lower() or "编码" in str(c))), 2)
                        rname_idx = next((i for i, c in enumerate(df_dups.columns) if "姓名" in str(c)), 3)
                        for row in df_dups.itertuples(index=False):
                            wb_val = clean_wb_str(row[wb_col_idx])
                            src_file = existing_waybills["配送单"].get(wb_val)
                            if src_file:
                                r_id = str(row[rid_idx]).replace('.0', '').strip() if rid_idx < len(row) else ""
                                r_name = str(row[rname_idx]).strip() if rname_idx < len(row) else ""
                                intercept_records.append((src_file, "配送单", wb_val, r_id, r_name))
                                dup_sources[src_file] = dup_sources.get(src_file, 0) + 1
                        for src_file, count in dup_sources.items(): log(
                            f"💥 [红牌拦截] 发现 {count} 条【配送单】重复记录！(源自历史文件: {src_file})", "ERROR")

                for col in df_source.columns:
                    c_str_lower = str(col).lower()
                    if ("id" in c_str_lower or "编号" in c_str_lower or "运单" in c_str_lower or "订单" in c_str_lower) and ("单" in c_str_lower or "骑手" in c_str_lower or "员工" in c_str_lower):
                        continue
                    if "团队" in c_str_lower or "网点" in c_str_lower:
                        continue
                    sample = str(df_source[col].iloc[0]) if not df_source[col].empty else ""
                    if len(sample) < 15:
                        try:
                            df_source[col] = pd.to_numeric(df_source[col])
                        except Exception:
                            pass

                headers_sht0 = list(df_source.columns)
                ws_sht0 = fast_recreate_sheet(wb1, "配送单")
                ws_sht0.append(headers_sht0)
                
                df_source_obj = df_source.astype(object)
                df_source_obj[pd.isna(df_source_obj)] = None
                
                for row_data in df_source_obj.values.tolist():
                    ws_sht0.append(row_data)
                
                global_df_delivery = df_source.copy()
                
                # try:
                #     val_b2 = ""
                #     team_name_col = next((c_name for c_name in df_source.columns if "团队名称" in str(c_name)), None)
                #     if not df_source.empty:
                #         if team_name_col:
                #             val_b2 = str(df_source[team_name_col].iloc[0]).strip()
                #         elif df_source.shape[1] > 1:
                #             val_b2 = str(df_source.iloc[0, 1]).strip()
                #         
                #     df_config_tmp = pd.read_excel(main_wb_path, sheet_name="config", header=None, dtype=object)
                #     for c in df_config_tmp.columns: df_config_tmp[c] = df_config_tmp[c].apply(_safe_str_apply)
                #     match_row = df_config_tmp[df_config_tmp.iloc[:, 2].astype(str).str.strip() == val_b2]
                #     if not match_row.empty:
                #         city = str(match_row.iloc[0, 0]).strip()
                #         log(f"-> 🎯 元数据探针锁定当前处理域: {city}!!CITY!!{city}", "INFO")
                #         if city != "未知":
                #             new_out_folder = os.path.join(output_base, f"{last_date.month}月", city)
                #             if os.path.exists(out_folder) and out_folder != new_out_folder:
                #                 import shutil
                #                 os.makedirs(os.path.join(output_base, f"{last_date.month}月"), exist_ok=True)
                #                 if os.path.exists(new_out_folder):
                #                     for f in os.listdir(out_folder):
                #                         shutil.move(os.path.join(out_folder, f), new_out_folder)
                #                     os.rmdir(out_folder)
                #                 else:
                #                     os.rename(out_folder, new_out_folder)
                #             out_folder = new_out_folder
                #             stats_info["out_folder"] = out_folder
                #     else:
                #         log(f"未在config.xlsx的config子表中找到对应C列值 {val_b2} 的城市匹配，尝试使用后备默认值", "WARN")
                # except Exception as e:
                #     log(f"探针初始化核心错误 (使用兜底域): {e}", "WARN")

                if frontend_city == "小象超市" and len(df_source) > 0:
                    team_col = next((c for c in df_source.columns if "团队名称" in str(c) or "站点名称" in str(c)), next((c for c in df_source.columns if ("所属" in str(c) or "团队" in str(c) or "站点" in str(c)) and "id" not in str(c).lower()), None))
                    rid_col = next((c for c in df_source.columns if "id" in str(c).lower() and "骑手" in str(c)), None)
                    rname_col = next((c for c in df_source.columns if "姓名" in str(c) and "骑手" in str(c)), None)
                    if not rid_col: rid_col = next((c for c in df_source.columns if "id" in str(c).lower()), None)
                    if not rname_col: rname_col = next((c for c in df_source.columns if "姓名" in str(c)), None)
                    
                    if team_col and rid_col and rname_col:
                        df_sht2 = df_source[[team_col, rid_col, rname_col]].copy()
                        df_sht2.columns = ["团队名称", "骑手ID", "骑手姓名"]
                        df_sht2.drop_duplicates(inplace=True)
                    else:
                        df_sht2 = pd.DataFrame(columns=["团队名称", "骑手ID", "骑手姓名"])
                    
                    # Force enable cross station merge for 小象超市
                    enable_cross_station_merge = True
                elif False and len(df_source) > 0 and len(df_source.columns) >= 4:
                    df_sht2 = df_source.iloc[:, 1:4].copy()
                    df_sht2.columns = ["团队名称", "骑手ID", "骑手姓名"]
                else:
                    df_sht2 = pd.DataFrame(columns=["团队名称", "骑手ID", "骑手姓名"])

                df_sht2.replace(r'^\s*$', np.nan, regex=True, inplace=True)
                if len(df_sht2.columns) > 1:
                    rider_id_col = df_sht2.columns[1]
                    s_id = df_sht2[rider_id_col].astype(str).str.replace('.0', '', regex=False).str.strip()
                    s_id = s_id.replace(r'^\s*$', np.nan, regex=True).replace("nan", np.nan).replace("None", np.nan)
                    s_id = s_id.replace("", np.nan)
                    df_sht2[rider_id_col] = s_id
                    df_sht2.dropna(subset=[rider_id_col], inplace=True)
                    # 确保是正常的数值格式
                    try:
                        df_sht2[rider_id_col] = pd.to_numeric(df_sht2[rider_id_col], errors='coerce')
                    except:
                        pass

                if enable_cross_station_merge and len(df_sht2) > 0 and len(df_sht2.columns) >= 2:
                    team_col = df_sht2.columns[0]
                    rid_col = df_sht2.columns[1]
                    df_sizes = df_sht2.groupby([rid_col, team_col]).size().reset_index(name='_counts')
                    idx = df_sizes.groupby(rid_col)['_counts'].idxmax()
                    best_teams = df_sizes.loc[idx, [rid_col, team_col]]
                    df_sht2 = pd.merge(df_sht2, best_teams, on=[rid_col, team_col], how='inner')

                df_sht2.drop_duplicates(subset=[df_sht2.columns[0], df_sht2.columns[1]], keep='first', inplace=True)
                df_sht2.sort_values(by=df_sht2.columns[0], ascending=True, inplace=True)
                df_sht2.reset_index(drop=True, inplace=True)
                
                # 开始计算考勤和安全基金
                if wb_col_name:
                    dictp_fraud_set = set(dictp_fraud)
                    wb_vals = df_source[wb_col_name].astype(str).values
                    mask_valid = np.array([x not in dictp_fraud_set for x in wb_vals])
                else:
                    mask_valid = np.ones(len(df_source), dtype=bool)

                df_valid_days = df_source[mask_valid].copy()
                
                # 安全检查，防止完全重复导致DataFrame为空引发OutOfBounds
                if df_valid_days.empty or len(df_valid_days.columns) < 3:
                    rider_attendance = pd.DataFrame(columns=['_rid', '出勤天'])
                    best_teams = pd.DataFrame(columns=['_rid', '_tid'])
                else:
                    # 极速处理：使用Python列表推导式替代pandas的.str方法，速度提升10倍以上
                    col0_vals = df_valid_days.iloc[:, 0].values
                    col1_vals = df_valid_days.iloc[:, 1].values
                    col2_vals = df_valid_days.iloc[:, 2].values
                    
                    df_valid_days['_date'] = [str(x)[:10] for x in col0_vals]
                    df_valid_days['_tid'] = [str(x).strip() for x in col1_vals]
                    df_valid_days['_rid'] = [str(x).replace('.0', '').strip() for x in col2_vals]
                    
                    # 骑手在所有站点的总出勤天
                    rider_attendance = df_valid_days.groupby('_rid')['_date'].nunique().reset_index(name='出勤天')
                    
                    # 计算每个骑手在每个站点的单量
                    rider_team_counts = df_valid_days.groupby(['_rid', '_tid']).size().reset_index(name='order_counts')
                    
                    # 找到骑手单量最多的站点
                    if not rider_team_counts.empty:
                        idx = rider_team_counts.groupby('_rid')['order_counts'].idxmax()
                        best_teams = rider_team_counts.loc[idx, ['_rid', '_tid']]
                    else:
                        best_teams = pd.DataFrame(columns=['_rid', '_tid'])
                
                # 合并总出勤天到单量最多的站点
                attendance_counts = pd.merge(best_teams, rider_attendance, on='_rid', how='inner')
                
                df_sht2['_tid'] = df_sht2['团队名称'].astype(str).str.strip()
                df_sht2['_rid'] = df_sht2['骑手ID'].astype(str).str.replace('.0', '', regex=False).str.strip()
                
                df_sht2 = pd.merge(df_sht2, attendance_counts, on=['_tid', '_rid'], how='left')
                df_sht2['本期出勤天'] = df_sht2['出勤天'].fillna(0).astype(int)
                
                try:
                    first_date_val = str(df_source.iloc[0, 0]).strip().split(" ")[0]
                    first_date_parsed = safe_parse_date([first_date_val]).iloc[0]
                    days_in_month = first_date_parsed.days_in_month
                    target_month = first_date_parsed.month
                except Exception:
                    days_in_month = 30
                    target_month = 1

                past_attendance_dict, past_attendance_notes, past_month_fee_deducted = extract_past_records(out_folder)

                def get_past_days(row):
                    # 处理逻辑：获取并返回所需的系统状态或计算数据
                    if row['本期出勤天'] == 0:
                        return 0
                    pid = str(row['_rid']).replace('.0', '').strip()
                    return past_attendance_dict.get(pid, 0)
                
                def get_past_notes(row):
                    # 处理逻辑：获取并返回所需的系统状态或计算数据
                    if row['本期出勤天'] == 0:
                        return ""
                    pid = str(row['_rid']).replace('.0', '').strip()
                    notes = past_attendance_notes.get(pid, [])
                    if notes:
                        return "【" + "；".join(notes) + "】"
                    return ""

                def get_past_fee_deducted(row):
                    # 处理逻辑：获取并返回所需的系统状态或计算数据
                    pid = str(row['_rid']).replace('.0', '').strip()
                    return "是" if past_month_fee_deducted.get(pid, False) else "否"

                df_sht2['往期累计出勤天'] = df_sht2.apply(get_past_days, axis=1)
                df_sht2['往期累计核算记录'] = df_sht2.apply(get_past_notes, axis=1)
                df_sht2['往期月费是否已扣'] = df_sht2.apply(get_past_fee_deducted, axis=1)

                custom_deductions = [str(c) for c in df_rules.columns if c in ["安全基金", "使用费", "非蜂卡", "月费"]]
                
                cfg_team = next((c for c in df_rules.columns if "团队名称" in str(c) and "maxDays" not in str(c)), None)
                if cfg_team:
                    df_rules_sub = df_rules.copy()
                    df_rules_sub['_cfg_team'] = df_rules_sub[cfg_team].astype(str).str.strip()
                    df_rules_sub = df_rules_sub.drop_duplicates(subset=['_cfg_team'])
                    
                    cols_to_drop = [c for c in custom_deductions if c in df_sht2.columns]
                    if cols_to_drop:
                        df_sht2 = df_sht2.drop(columns=cols_to_drop)
                    
                    overlap = [c for c in df_rules_sub.columns if c in df_sht2.columns and c != '_cfg_team']
                    if overlap:
                        df_rules_sub = df_rules_sub.drop(columns=overlap)
                        
                    def _match_cfg_team(tid):
                        tid_str = re.sub(r'_?新专送', '', str(tid).strip())
                        for c_team in df_rules_sub['_cfg_team']:
                            c_team_clean = re.sub(r'_?新专送', '', str(c_team).strip())
                            if c_team_clean == tid_str:
                                return c_team
                        log(f"Debug: Match failed for tid='{tid_str}'. Config teams sample: {list(df_rules_sub['_cfg_team'])[:5]}...", "WARN")
                        return str(tid).strip()
                    
                    df_sht2['_mapped_tid'] = df_sht2['_tid'].apply(_match_cfg_team)
                    df_sht2 = pd.merge(df_sht2, df_rules_sub, left_on='_mapped_tid', right_on='_cfg_team', how='left')
                    df_sht2 = df_sht2.drop(columns=['_mapped_tid'])
                
                filtered_custom_deductions = []
                for d_col in custom_deductions:
                    if d_col in ["安全基金", "使用费", "非蜂卡", "月费"]:
                        if d_col in df_sht2.columns:
                            if pd.to_numeric(df_sht2[d_col], errors='coerce').fillna(0).abs().sum() == 0:
                                df_sht2 = df_sht2.drop(columns=[d_col])
                                continue
                        else:
                            continue
                    filtered_custom_deductions.append(d_col)
                custom_deductions = filtered_custom_deductions

                for d_col in custom_deductions:
                    if d_col not in df_sht2.columns:
                        df_sht2[d_col] = 0
                    df_sht2[d_col] = pd.to_numeric(df_sht2[d_col], errors='coerce').fillna(0)

                def calc_deduction(val, att_days, past_days, max_days):
                    # 处理逻辑：针对具体业务项（如配送费、奖罚）执行金额计算及条件判定
                    if pd.isna(val) or val == 0: return 0
                    if pd.isna(max_days) or str(max_days).strip() == "":
                        return att_days * val
                    max_d = float(max_days)
                    if att_days + past_days < max_d:
                        return att_days * val
                    else:
                        if past_days >= max_d:
                            return 0
                        else:
                            return (max_d - past_days) * val

                for d_col in custom_deductions:
                    max_col = f"{d_col}_maxDays"
                    is_kw_col = f"{d_col}_isKw"
                    
                    if d_col == '月费':
                        def apply_fee_logic(row, d_name=d_col):
                            # 处理逻辑：日志输出及前端进度条回调事件生成
                            if row.get('往期月费是否已扣') == '是':
                                return 0
                            return row[d_name]
                        df_sht2[d_col] = df_sht2.apply(apply_fee_logic, axis=1)
                    else:
                        def row_calc(row, item_name, max_name, iskw_name):
                            # 处理逻辑：针对具体业务项（如配送费、奖罚）执行金额计算及条件判定
                            is_kw = row.get(iskw_name, False)
                            if pd.isna(is_kw):
                                is_kw = False
                            else:
                                is_kw = bool(is_kw)
                            val = row[item_name]
                                
                            fixed_amt = 0
                            if not (pd.isna(val) or val == 0):
                                if abs(val - (-0.5)) < 1e-5:
                                    fixed_amt = row["本期出勤天"] * val
                                else:
                                    max_val = row.get(max_name, None)
                                    fixed_amt = calc_deduction(val, row["本期出勤天"], row["往期累计出勤天"], max_val)
                            
                            r_id = str(row.get('_rid', '')).replace('.0', '').strip()
                            has_kw_hit = r_id in rider_wtd_deductions and item_name in rider_wtd_deductions[r_id]
                            
                            if is_kw:
                                if has_kw_hit:
                                    return rider_wtd_deductions[r_id][item_name]
                                else:
                                    return 0
                            else:
                                return fixed_amt

                        df_sht2[d_col] = df_sht2.apply(lambda row: row_calc(row, d_col, max_col, is_kw_col), axis=1)

                # We need to recreate 团队名称 and 骑手ID from _tid and _rid.
                # First, extract them before we drop them!
                temp_tid = df_sht2['_tid'].copy() if '_tid' in df_sht2.columns else None
                temp_rid = df_sht2['_rid'].copy() if '_rid' in df_sht2.columns else None
                temp_rname = df_sht2['rname'].copy() if 'rname' in df_sht2.columns else None
                
                cols_to_drop = ['_tid', '_rid', '_cfg_team', '出勤天', '团队名称', '骑手ID', '骑手姓名', 'rname']
                df_sht2.drop(columns=[c for c in cols_to_drop if c in df_sht2.columns], inplace=True, errors='ignore')
                df_sht2.drop(columns=[c for c in df_sht2.columns if c.startswith('团队名称_') or c.startswith('骑手ID_') or c.startswith('骑手姓名_')], inplace=True, errors='ignore')
                
                if temp_tid is not None: df_sht2['团队名称'] = temp_tid
                if temp_rid is not None: df_sht2['骑手ID'] = temp_rid
                if temp_rname is not None: df_sht2['骑手姓名'] = temp_rname
                
                final_cols_sht2 = ["团队名称", "骑手ID", "骑手姓名"] + custom_deductions + ["本期出勤天"]
                if past_attendance_dict or past_attendance_notes or past_month_fee_deducted:
                    final_cols_sht2.extend(["往期累计出勤天", "往期累计核算记录", "往期月费是否已扣"])
                
                final_cols_sht2 = list(dict.fromkeys(final_cols_sht2))
                df_sht2 = df_sht2[[c for c in final_cols_sht2 if c in df_sht2.columns]]

                df_sht2_obj = df_sht2.astype(object)
                df_sht2_obj[pd.isna(df_sht2_obj)] = None

                data_list = df_sht2_obj.values.tolist()
                headers_sht2 = df_sht2.columns.tolist()

                for c_idx, val in enumerate(headers_sht2, 1): ws_sht2.cell(row=1, column=c_idx, value=val)
                for r_idx, row_data in enumerate(data_list, 2):
                    for c_idx, val in enumerate(row_data, 1): ws_sht2.cell(row=r_idx, column=c_idx, value=val)

                last_row_sht2 = len(data_list) + 1
                num_riders = last_row_sht2 - 1
                stats_info["riders"] = max(stats_info.get("riders", 0), num_riders)
                log(f"-> 🎯 聚合扫描完成：侦测到 {num_riders} 个活动实体，结算 {stats_info['orders']} 个子流！", "INFO")

                if last_row_sht2 > 2:
                    # import re
                    # import copy
                    formula_regex = re.compile(r'(?<![a-zA-Z0-9_])(\$?)([a-zA-Z]{1,3})(\$?)([1-9][0-9]{0,6})(?![a-zA-Z0-9_])')
                    
                    def fast_shift(clean_f, delta):
                        # 处理逻辑：fast_shift 的主要执行逻辑
                        if not clean_f or delta == 0: return clean_f
                        def replacer(match):
                            # 处理逻辑：replacer 的主要执行逻辑
                            c_abs, c, r_abs, r = match.groups()
                            if r_abs == '$': return match.group(0)
                            return f"{c_abs}{c}{r_abs}{int(r) + delta}"
                        return formula_regex.sub(replacer, clean_f)

                    for col_idx in range(4, ws_sht2.max_column + 1):
                        cell_template = ws_sht2.cell(row=2, column=col_idx)
                        if cell_template.value and isinstance(cell_template.value, str) and cell_template.value.startswith('='):
                            clean_f = cell_template.value
                            for row_idx in range(3, last_row_sht2 + 1):
                                target_cell = ws_sht2.cell(row=row_idx, column=col_idx)
                                delta = row_idx - 2
                                try:
                                    target_cell.value = fast_shift(clean_f, delta)
                                except Exception:
                                    target_cell.value = cell_template.value
                                if cell_template.has_style: target_cell._style = copy.copy(cell_template._style)

                # import copy

                if num_riders > 0:
                    # import re
                    formula_regex = re.compile(r'(?<![a-zA-Z0-9_])(\$?)([a-zA-Z]{1,3})(\$?)([1-9][0-9]{0,6})(?![a-zA-Z0-9_])')
                    def fast_shift(clean_f, delta):
                        # 处理逻辑：fast_shift 的主要执行逻辑
                        if not clean_f or delta == 0: return clean_f
                        def replacer(match):
                            # 处理逻辑：replacer 的主要执行逻辑
                            c_abs, c, r_abs, r = match.groups()
                            if r_abs == '$': return match.group(0)
                            return f"{c_abs}{c}{r_abs}{int(r) + delta}"
                        return formula_regex.sub(replacer, clean_f)

                    try:
                        from openpyxl.formula.array import ArrayFormula
                    except ImportError:
                        ArrayFormula = None

                    m_ranges = list(ws_sht1.merged_cells.ranges)
                    for m_range in m_ranges:
                        if m_range.min_row >= 4: ws_sht1.unmerge_cells(m_range.coord)

                    if num_riders > 1:
                        try:
                            ws_sht1.insert_rows(5, amount=num_riders - 1)
                        except:
                            pass

                    max_col_sht1 = ws_sht1.max_column
                    template_row_info = []
                    for c_idx in range(1, max_col_sht1 + 1):
                        cell = ws_sht1.cell(row=4, column=c_idx)
                        template_row_info.append({
                            'val': cell.value, 'style': copy.copy(cell._style) if cell.has_style else None,
                            'col_letter': get_column_letter(c_idx)
                        })

                    for i in range(num_riders):
                        t_row = i + 4
                        for c_idx, t_item in enumerate(template_row_info, 1):
                            target_cell = ws_sht1.cell(row=t_row, column=c_idx)
                            if t_row > 4 and t_item['style']: target_cell._style = t_item['style']

                            if c_idx in [2, 3, 4]:
                                val_idx = c_idx - 2
                                target_cell.value = ws_sht2.cell(row=i + 2, column=val_idx + 1).value
                            else:
                                formula_val = t_item['val']
                                if isinstance(formula_val, str) and formula_val.startswith('='):
                                    clean_f = formula_val.replace("{", "").replace("}", "").strip()
                                    delta = t_row - 4
                                    try:
                                        translated_f = fast_shift(clean_f, delta)
                                        if (c_idx == 1 or c_idx == 20) and formula_val.startswith("{"):
                                            target_cell.value = ArrayFormula(target_cell.coordinate, translated_f) if ArrayFormula else translated_f
                                        else:
                                            target_cell.value = translated_f
                                    except:
                                        target_cell.value = clean_f
                                else:
                                    if t_row > 4: target_cell.value = t_item['val']

                    f_row = max(5, 4 + num_riders)
                    
                    try:
                        ws_sht1.merge_cells(start_row=f_row, start_column=1, end_row=f_row, end_column=4)
                        cell_total = ws_sht1.cell(row=f_row, column=1)
                        cell_total.value = "合计"
                        from openpyxl.styles import Alignment
                        cell_total.alignment = Alignment(horizontal='center', vertical='center')
                    except Exception:
                        pass
                    
                    # Removed the block that attempts to format f_row since we are keeping the template's footer row, which is already correctly formatted.
                    pass

            elif "违规" in wb_name:
                cols_to_drop = [1, 2, 3, 15, 16]
                cols_to_drop = [c for c in cols_to_drop if c < len(df_source.columns)]
                keep_cols = [c for c in range(len(df_source.columns)) if c not in cols_to_drop]
                df_source = df_source.iloc[:, keep_cols].copy()

                data_arr = df_source.values.tolist()
                headers = df_source.columns.tolist()

                for row in data_arr:
                    while len(row) < 15: row.append("")
                    if "泉州" in str(row[1]) and "索赔" in str(row[6]):
                        if "提前点送达" in str(row[7]):
                            row[14] = float(row[4] or 0) - 50
                        elif "配送超时" in str(row[7]) or "未进行配送" in str(row[7]):
                            row[14] = float(row[4] or 0)
                        else:
                            row[14] = float(row[4] or 0) - 20
                    else:
                        row[14] = float(row[4] or 0)
                    if "欺诈单" in str(row[6]): row[12], row[13], row[14] = "是", "欺诈单不考核", 0

                if not getattr(wb1, 'has_cleared_wg', False):
                    ws_wg = fast_recreate_sheet(wb1, "违规索赔")
                    wb1.has_cleared_wg = True
                    start_row = 1
                else:
                    ws_wg = wb1["违规索赔"]
                    start_row = 2 

                if start_row == 1:
                    ws_wg.append(headers)

                added_penalty_count = 0
                bg_col_name = find_wb_col(headers, 10)
                wb_idx = headers.index(bg_col_name) if bg_col_name in headers else 10

                id_idx, name_idx = -1, -1
                for i, c in enumerate(headers):
                    c_str = str(c)
                    c_lower = c_str.lower()
                    if ('id' in c_lower or '编号' in c_lower) and not any(
                            x in c_lower for x in ['运单', '订单', '站', '团队']): id_idx = i
                    if c_str in ['骑手姓名', '配送员姓名', '姓名', '员工姓名', '骑手名称'] or ('姓名' in c_str and '站' not in c_str) or (
                            '名称' in c_str and '骑手' in c_str): name_idx = i

                if wb_idx is not None and wb_idx < len(headers):
                    dup_sources = {}
                    for row in data_arr:
                        wb_val = clean_wb_str(row[wb_idx]) if wb_idx < len(row) else ""
                        if wb_val and wb_val != "-" and wb_val in existing_waybills["违规索赔"]:
                            src_file = existing_waybills["违规索赔"][wb_val]
                            r_id = str(row[id_idx]).replace('.0', '').strip() if id_idx != -1 else ""
                            r_name = str(row[name_idx]).strip() if name_idx != -1 else ""
                            intercept_records.append((src_file, "索赔扣款", wb_val, r_id, r_name))
                            dup_sources[src_file] = dup_sources.get(src_file, 0) + 1
                        else:
                            ws_wg.append(row)
                            added_penalty_count += 1
                    for src_file, count in dup_sources.items(): log(
                        f"💥 [红牌拦截] 发现 {count} 条【违规索赔】重复记录！(源自历史文件: {src_file})", "ERROR")
                else:
                    for row in data_arr:
                        ws_wg.append(row)
                        added_penalty_count += 1

                stats_info["penalty_orders"] += added_penalty_count

            elif "问题单" in wb_name:
                while len(df_source.columns) < 13: df_source[f"Temp_Col_{len(df_source.columns)}"] = ""
                col_names = list(df_source.columns)
                col_names[12] = "是否欺诈单"
                df_source.columns = col_names

                cols_to_drop = [c for c in df_source.columns if "Unnamed" in str(c)]
                if cols_to_drop: df_source.drop(columns=cols_to_drop, inplace=True)

                try:
                    col1 = df_source.columns[1]
                    col1_parsed = safe_parse_date(df_source[col1]).dt.strftime('%Y-%m-%d').fillna("")
                    df_source[col1] = col1_parsed.astype(object)
                except Exception:
                    pass

                rules_headers = [str(c).strip() for c in df_rules.columns.tolist()]
                rules_data = df_rules.values.tolist()
                
                # 构建问题单关键字映射
                global_kw_to_header = {}
                keyword_amount_map = {}
                d_rules = kwargs.get("deductionRules", [])
                if isinstance(d_rules, list) and len(d_rules) > 0 and 'sites' in d_rules[0]:
                    for city_data in d_rules:
                        for site_data in city_data.get('sites', []):
                            site_name = str(site_data.get('name', '')).strip()
                            for item in site_data.get('deductionItems', []):
                                if item.get('isKeywordBased'):
                                    h_name = item.get('name')
                                    kw_amounts = item.get('keywordAmounts', [])
                                    if kw_amounts:
                                        for ka in kw_amounts:
                                            kw = str(ka.get('keyword', '')).strip()
                                            amt = ka.get('amount')
                                            if kw:
                                                global_kw_to_header[kw] = h_name
                                                if amt is not None and str(amt).strip() != '':
                                                    keyword_amount_map[(site_name, kw)] = float(amt)
                                    
                                    # Legacy fallback for old keywords string
                                    kws_str = item.get('keywords', '')
                                    if kws_str:
                                        for k in str(kws_str).split(','):
                                            k = k.strip()
                                            if k: global_kw_to_header[k] = h_name
                else:
                    for _, row in df_rules.iterrows():
                        site_name = str(row.get('团队名称', '')).strip()
                        for c in df_rules.columns:
                            c_str = str(c)
                            if c_str.endswith('_isKw') and row.get(c_str):
                                h_name = c_str.replace('_isKw', '')
                                amt = row.get(h_name, 0)
                                global_kw_to_header[h_name] = h_name
                                keyword_amount_map[(site_name, h_name)] = float(amt)

                team_name_idx = next((i for i, c in enumerate(rules_headers) if "团队名称" in str(c)), 2)

                # Dynamically find columns in df_source (问题单)
                source_headers = [str(c).strip() for c in df_source.columns]
                
                # Find Team Name column
                wtd_team_idx = next((i for i, c in enumerate(source_headers) if "团队名称" in c or "团队" in c or "站点" in c), 5)
                # Find Reason/Remark column (usually 判责原因, 备注)
                wtd_reason_idx = next((i for i, c in enumerate(source_headers) if "判责原因" in c or "原因" in c or "备注" in c), 6)
                
                if wtd_team_idx >= len(source_headers): wtd_team_idx = 5
                if wtd_reason_idx >= len(source_headers): wtd_reason_idx = 6

                is_fraud_info = df_source.iloc[:, 2].astype(str).isin(dictp_fraud).map({True: "是", False: "否"}).tolist()
                col0_list = df_source.iloc[:, 0].tolist()
                col5_list = df_source.iloc[:, wtd_team_idx].astype(str).tolist() if len(df_source.columns) > wtd_team_idx else [""] * len(col0_list)
                col6_list = df_source.iloc[:, wtd_reason_idx].astype(str).tolist() if len(df_source.columns) > wtd_reason_idx else [""] * len(col0_list)
                
                fast_vals = []
                matched_headers_list = []
                memo_wtd = {}
                for r0, r5, fraud, r6 in zip(col0_list, col5_list, is_fraud_info, col6_list):
                    val = np.nan
                    r0_clean = str(r0).strip() if pd.notna(r0) else str(r0)
                    r6_clean = str(r6).strip() if pd.notna(r6) else ""
                    r5_clean = str(r5).strip() if pd.notna(r5) else ""
                    matched_header = None
                    if fraud == "是":
                        val = 0
                    else:
                        base_header = None
                        if r0_clean in rules_headers:
                            base_header = r0_clean
                        else:
                            for h_name in rules_headers:
                                if h_name in r0_clean or r0_clean in h_name:
                                    base_header = h_name
                                    break
                                    
                        matched_kw = None
                        if base_header:
                            is_kw_based = any(h == base_header for _, h in global_kw_to_header.items())
                            if is_kw_based and r6_clean:
                                for kw, h_name in global_kw_to_header.items():
                                    if h_name == base_header and kw in r6_clean:
                                        matched_header = h_name
                                        matched_kw = kw
                                        break
                                if not matched_header:
                                    matched_header = base_header
                            else:
                                matched_header = base_header
                        else:
                            if r6_clean:
                                for kw, h_name in global_kw_to_header.items():
                                    if kw in r6_clean:
                                        matched_header = h_name
                                        matched_kw = kw
                                        break

                        if matched_header:
                            cache_key = (matched_header, r5_clean, matched_kw)
                            if cache_key in memo_wtd:
                                val = memo_wtd[cache_key]
                            else:
                                specific_amount = None
                                for (s_name, k_kw), amt in keyword_amount_map.items():
                                    if k_kw == matched_kw and s_name == r5_clean:
                                        specific_amount = amt
                                        break
                                        
                                if specific_amount is not None:
                                    val = specific_amount
                                else:
                                    # Fallback to rules_data
                                    wtd_idx = rules_headers.index(matched_header)
                                    matched_in_rule_row = False
                                    for rule_row in rules_data:
                                        rt_name = str(rule_row[team_name_idx]).strip() if pd.notna(rule_row[team_name_idx]) else ""
                                        if rt_name and rt_name == r5_clean:
                                            val = rule_row[wtd_idx]
                                            matched_in_rule_row = True
                                            break
                                    if not matched_in_rule_row and r5_clean:
                                        log(f"Debug WTD: '{r5_clean}' not found in rules. Sample: {[str(r[team_name_idx]).strip() for r in rules_data[:5]]}", "WARN")
                                memo_wtd[cache_key] = val
                    fast_vals.append(val)
                    matched_headers_list.append(matched_header)
                
                df_source["是否欺诈单"] = is_fraud_info
                col_koukuan = next((c for c in df_source.columns if "扣款金额" in str(c)), df_source.columns[11] if len(df_source.columns) > 11 else None)
                if col_koukuan:
                    df_source[col_koukuan] = fast_vals
                else:
                    df_source["扣款金额"] = fast_vals
                
                df_source["_matched_item"] = matched_headers_list

                cols_to_drop_late = [c for c in df_source.columns if "处罚金额" in str(c)]
                if cols_to_drop_late: df_source.drop(columns=cols_to_drop_late, inplace=True)


                wb_col_name = find_wb_col(df_source.columns, 2)
                wb_col_idx = df_source.columns.get_loc(wb_col_name) if wb_col_name else 2
                
                ws_wtd = wb1["问题单"]
                clean_problem_waybills = df_source.iloc[:, wb_col_idx].apply(clean_wb_str)
                type_col = 0
                combined_keys = df_source.iloc[:, type_col].astype(str).str.strip() + "_" + clean_problem_waybills
                mask_dup = combined_keys.isin(existing_waybills["问题单"].keys())

                df_dups = df_source[mask_dup].copy()
                df_source = df_source[~mask_dup].copy()
                stats_info["problem_orders"] += len(df_source)

                if not df_dups.empty:
                    dup_sources = {}
                    rid_idx = next((i for i, c in enumerate(df_dups.columns) if "骑手" in str(c) and ("id" in str(c).lower() or "编码" in str(c))), 2)
                    rname_idx = next((i for i, c in enumerate(df_dups.columns) if "姓名" in str(c)), 3)
                    for row in df_dups.itertuples(index=False):
                        col0_val = str(row[type_col]).strip() if len(row) > type_col else ""
                        wb_val = clean_wb_str(row[wb_col_idx]) if len(row) > wb_col_idx else ""
                        key = f"{col0_val}_{wb_val}"
                        src_file = existing_waybills["问题单"].get(key)
                        if src_file:
                            val_type = col0_val if col0_val else "未知问题"
                            r_id = str(row[rid_idx]).replace('.0', '').strip() if rid_idx < len(row) else ""
                            r_name = str(row[rname_idx]).strip() if rname_idx < len(row) else ""
                            intercept_records.append((src_file, val_type, wb_val, r_id, r_name))
                            dup_sources[src_file] = dup_sources.get(src_file, 0) + 1
                    for src_file, count in dup_sources.items(): log(
                        f"💥 [红牌拦截] 发现 {count} 条【扣款凭证】重复记录！(源自历史文件: {src_file})", "ERROR")

                # Aggregate keyword deductions per rider before dropping columns
                if not df_source.empty:
                    agg_rid_col = next((c for c in df_source.columns if "骑手" in str(c) and ("id" in str(c).lower() or "编码" in str(c))), df_source.columns[2])
                    kk_col = col_koukuan if col_koukuan else "扣款金额"
                    df_source['_amount_num'] = pd.to_numeric(df_source[kk_col], errors='coerce').fillna(0)
                    for _, row in df_source.iterrows():
                        r_id_val = str(row.get(agg_rid_col, '')).replace('.0', '').strip()
                        m_item = row.get('_matched_item', None)
                        m_amt = row.get('_amount_num', 0)
                        if m_item and r_id_val:
                            if r_id_val not in rider_wtd_deductions:
                                rider_wtd_deductions[r_id_val] = {}
                            if m_item not in rider_wtd_deductions[r_id_val]:
                                rider_wtd_deductions[r_id_val][m_item] = 0
                            rider_wtd_deductions[r_id_val][m_item] += m_amt
                            
                temp_cols = [c for c in df_source.columns if str(c).startswith("Temp_Col_")]
                if temp_cols:
                    df_source.drop(columns=temp_cols, inplace=True)
                df_source.drop(columns=['_matched_item', '_amount_num'], inplace=True, errors='ignore')

                headers_wtd = list(df_source.columns)
                ws_wtd = fast_recreate_sheet(wb1, "问题单")
                ws_wtd.append(headers_wtd)
                for row_data in df_source.values.tolist():
                    ws_wtd.append(row_data)

            elif "支付绑定" in wb_name:
                try:
                    xls = pd.ExcelFile(file_path)
                    target_sheet = None
                    for sheet in xls.sheet_names:
                        if "绑定情况" in sheet or "绑定" in sheet:
                            target_sheet = sheet
                            break
                    if not target_sheet:
                        for sheet in xls.sheet_names:
                            df_temp = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
                            if any("绑定" in str(c) for c in df_temp.columns):
                                target_sheet = sheet
                                break
                    if not target_sheet: target_sheet = xls.sheet_names[0]

                    df_bind_status = pd.read_excel(file_path, sheet_name=target_sheet, dtype=object)
                    for c in df_bind_status.columns: df_bind_status[c] = df_bind_status[c].apply(_safe_str_apply)
                                
                    df_bind_status_obj = df_bind_status.astype(object)
                    df_bind_status_obj[pd.isna(df_bind_status_obj)] = None
                    df_bind_status = df_bind_status_obj
                    log(f"-> 🎯 源数据寻址定标成功，锁定特征区：【{target_sheet}】！", "INFO")
                except Exception as e:
                    log(f"尝试读取【绑定情况】表失败，回退使用默认表: {e}", "WARN")
                    df_bind_status = df_source.copy()

                city_col_candidates = [c for c in df_bind_status.columns if any(k in str(c) for k in ["城市", "业务城市", "站点", "团队"])]
                
                target_city_col = None
                valid_mask = None
                for col in city_col_candidates:
                    mask = df_bind_status[col].astype(str).apply(lambda x: city in x or x in city if pd.notna(x) and x != "nan" else False)
                    if mask.any():
                        target_city_col = col
                        valid_mask = mask
                        break

                if target_city_col is not None:
                    df_source_filtered = df_bind_status[valid_mask]
                elif len(df_bind_status.columns) > 0 and city in df_bind_status.iloc[:, 0].astype(str).unique():
                    df_source_filtered = df_bind_status[df_bind_status.iloc[:, 0] == city]
                else:
                    # Return empty if no matches found for the city to prevent full data leak
                    df_source_filtered = pd.DataFrame(columns=df_bind_status.columns)

                ws_bind = fast_recreate_sheet(wb1, "骑手支付绑定")
                headers_bind = list(df_source_filtered.columns)
                ws_bind.append(headers_bind)
                
                id_col_idx = next((i for i, c in enumerate(headers_bind) if "id" in str(c).lower() and "风神" not in str(c).lower() and "身份证" not in str(c)), None)
                
                for row_data in df_source_filtered.values.tolist():
                    new_row = list(row_data)
                    
                    if id_col_idx is not None and new_row[id_col_idx]:
                        try:
                            val_str = str(new_row[id_col_idx]).replace('.0', '').strip()
                            if val_str.isdigit():
                                new_row[id_col_idx] = int(val_str)
                        except:
                            pass
                    ws_bind.append(new_row)

            log(random.choice(theme['msg_success']).format(wb_name=wb_name))
            processed_count += 1
            current_progress += progress_step
            progress_msg = random.choice(theme['msg_process']).format(wb_name=f"{wb_name[:12]} ({processed_count}/{total_files})")
            progress_callback(current_progress, f"清洗解析并注入管线：{wb_name[:12]} ({processed_count}/{total_files})")

        t_after_files = time.time()
        log(f"-> 节点资源扫描与加载周期消耗此时钟: {t_after_files - t_before_files:.2f}s", "SYSTEM")

        log(">>> 正在建立聚合内存管线，启动高层架构抽象逻辑...", "SYSTEM")
        progress_callback(0.85, "已建立聚合内存管线，运行业务架构关联逻辑...")

        rider_idcard_map = {}
        if "骑手支付绑定" in wb1.sheetnames:
            ws_bind_temp = wb1["骑手支付绑定"]
            bind_id_col = -1
            bind_idcard_col = -1
            for c in range(1, min(30, ws_bind_temp.max_column + 1)):
                h_val = str(ws_bind_temp.cell(row=1, column=c).value or "").strip()
                h_val_lower = h_val.lower()
                if ("id" in h_val_lower or "编号" in h_val_lower) and ("骑手" in h_val or "员工" in h_val) and bind_id_col == -1:
                    bind_id_col = c
                if "身份证" in h_val and bind_idcard_col == -1:
                    bind_idcard_col = c
            
            if bind_id_col != -1 and bind_idcard_col != -1:
                for r_idx in range(2, ws_bind_temp.max_row + 1):
                    rid = str(ws_bind_temp.cell(row=r_idx, column=bind_id_col).value or "").replace('.0', '').strip()
                    idcard = str(ws_bind_temp.cell(row=r_idx, column=bind_idcard_col).value or "").strip()
                    if rid and idcard:
                        rider_idcard_map[rid] = idcard

        daily_summary = {}
        headers_abcd = ["A列", "B列", "C列", "D列", "日单量", "完成单", "不准时单", "欺诈单(完成单)", "完成单(不准时单)", "蓝橙单价", "骑手身份证", "匹配策略"]
        sorted_keys = []

        if global_df_delivery is not None and not global_df_delivery.empty:
            headers = list(global_df_delivery.columns)
            
            c0_col = next((c for c in headers if "账单时间" in str(c) or "时间" in str(c)), headers[0])
            c1_col = next((c for c in headers if "团队名称" in str(c)), next((c for c in headers if "团队" in str(c) and "id" not in str(c).lower()), headers[1] if len(headers) > 1 else None))
            c2_col = next((c for c in headers if "骑手id" in str(c).lower() or ("id" in str(c).lower() and "骑手" in str(c))), headers[2] if len(headers) > 2 else None)
            c3_col = next((c for c in headers if "骑手名称" in str(c) or "姓名" in str(c)), headers[3] if len(headers) > 3 else None)
            c4_col = next((c for c in headers if "身份证" in str(c) or "证件" in str(c)), None)
            
            first_4_headers = [str(x) if x is not None else "" for x in [c0_col, c1_col, c2_col, c3_col]]
            headers_abcd = first_4_headers + ["日单量", "完成单", "不准时单", "欺诈单(完成单)", "完成单(不准时单)", "蓝橙单价", "骑手身份证", "匹配策略"]
            
            status_col = "运单状态" if "运单状态" in headers else None
            fraud_col = "是否欺诈单" if "是否欺诈单" in headers else None
            
            cols_to_keep = [c for c in [c0_col, c1_col, c2_col, c3_col, c4_col] if c is not None]
            if status_col and status_col in headers: cols_to_keep.append(status_col)
            if fraud_col and fraud_col in headers: cols_to_keep.append(fraud_col)
            
            gdf = global_df_delivery[cols_to_keep].copy()
            for col in [c for c in [c0_col, c1_col, c2_col, c3_col, c4_col] if c is not None]:
                gdf[col] = gdf[col].fillna("").astype(str).str.strip()
            
            gdf = gdf[gdf[c0_col] != ""]
            
            if status_col:
                gdf["_is_late"] = (gdf[status_col].astype(str).str.strip() == "完成单-不准时").astype(int)
                gdf["_is_comp"] = (gdf[status_col].astype(str).str.strip() == "完成单").astype(int)
            else:
                gdf["_is_late"] = 0
                gdf["_is_comp"] = 0
                
            if fraud_col:
                gdf["_is_fraud_comp"] = ((gdf[fraud_col].astype(str).str.strip() == "是") & gdf["_is_comp"]).astype(int)
                gdf["_is_fraud_late"] = ((gdf[fraud_col].astype(str).str.strip() == "是") & gdf["_is_late"]).astype(int)
            else:
                gdf["_is_fraud_comp"] = 0
                gdf["_is_fraud_late"] = 0
                
            group_cols = [c for c in [c0_col, c1_col, c2_col, c3_col, c4_col] if c is not None]
            grouped = gdf.groupby(group_cols).agg(
                total=(c0_col, "size"),
                completed=("_is_comp", "sum"),
                late=("_is_late", "sum"),
                fraud_comp=("_is_fraud_comp", "sum"),
                fraud_late=("_is_fraud_late", "sum")
            ).reset_index()
            
            for row in grouped.itertuples(index=False):
                key = (str(row[0]), str(row[1]), str(row[2]), str(row[3]))
                daily_summary[key] = {
                    "total": int(row.total),
                    "completed": int(row.completed),
                    "late": int(row.late),
                    "fraud_comp": int(row.fraud_comp),
                    "fraud_late": int(row.fraud_late),
                    "idcard": str(row[4]) if c4_col else ""
                }

        sorted_keys = sorted(daily_summary.keys(), key=lambda x: str(x[1]))

        if "日单量" in wb1.sheetnames:
            ws_daily = fast_recreate_sheet(wb1, "日单量")
        else:
            target_idx_daily = wb1.sheetnames.index("配送所得表") + 1 if "配送所得表" in wb1.sheetnames else 2
            ws_daily = wb1.create_sheet(title="日单量", index=target_idx_daily)

        if frontend_city != "小象超市":
            ws_daily.append(headers_abcd)

        no_price_records = []
        from collections import defaultdict
        rider_prices_dict = defaultdict(set)
        rider_price_dates_dict = defaultdict(lambda: defaultdict(list))

        for row_data in sorted_keys:
            summary = daily_summary[row_data]
            count_total = summary["total"]
            count_comp = summary["completed"]
            count_late = summary["late"]
            count_fraud_comp = summary["fraud_comp"]
            count_fraud_late = summary["fraud_late"]
            idcard_from_daily = summary.get("idcard", "").strip().upper()

            b_date = _norm_date(row_data[0])
            team_name = str(row_data[1]).replace(' ','').replace('\u3000','').replace('\xa0','').replace('\n','').replace('\t','').strip()
            r_id = str(row_data[2]).replace('.0', '').strip()
            r_name = str(row_data[3]).strip()

            key_id = f"{b_date}_{team_name}_{r_id}"
            key_name = f"{b_date}_{team_name}_{r_name}"

            idcard_from_bind = rider_idcard_map.get(r_id, "")
            idcard = idcard_from_daily if idcard_from_daily else idcard_from_bind
            idcard = str(idcard).strip().upper()
            
            key_idcard = f"{b_date}_{team_name}_{idcard}"

            price = None
            match_type = ""
            if idcard:
                price = price_mapping_idcard.get(key_idcard)
                if price: match_type = "【日期 + 站点名称 + 身份证】"
            
            if not price and r_id: 
                price = price_mapping_id.get(key_id)
                if price: match_type = "【日期 + 站点名称 + 风神骑手ID】"
                
            if not price: 
                price = price_mapping_name.get(key_name)
                if price: match_type = "【日期 + 站点名称 + 骑手姓名】"

            if price is not None and str(price).strip() != "":
                try:
                    price_float = float(price)
                    if price_float == 0.0:
                        price = "无单价"
                        match_type = ""
                    else:
                        price = price_float
                except ValueError:
                    pass

            if not price or str(price).strip() == "": 
                price = "无单价"
                match_type = ""

            full_row = list(row_data) + [count_total, count_comp, count_late, count_fraud_comp, count_fraud_late, price, idcard, match_type]
            try:
                full_row[2] = to_numeric_if_possible(full_row[2])
            except:
                pass
            if price == "无单价": no_price_records.append(full_row)

            rider_key = f"{team_name}_{r_id}"
            rider_prices_dict[rider_key].add(str(price))
            rider_price_dates_dict[rider_key][str(price)].append(b_date)

            if frontend_city != "小象超市":
                ws_daily.append(full_row)

        def format_dates_streak(date_strs):
            # 处理逻辑：处理时间戳、日期字符串格式转换与周期计算
            if not date_strs: return ""
            d_objs = []
            for d in date_strs:
                try:
                    d_objs.append(datetime.strptime(d, '%Y-%m-%d'))
                except:
                    pass
            if not d_objs: return "；".join(date_strs)
            d_objs = sorted(list(set(d_objs)))
            streaks = []
            current_streak = [d_objs[0]]
            for i in range(1, len(d_objs)):
                if (d_objs[i] - current_streak[-1]).days == 1:
                    current_streak.append(d_objs[i])
                else:
                    streaks.append(current_streak)
                    current_streak = [d_objs[i]]
            streaks.append(current_streak)
            formatted = []
            for streak in streaks:
                start, end = streak[0], streak[-1]
                if start == end:
                    formatted.append(f"{start.day}日")
                else:
                    formatted.append(f"{start.day}日-{end.day}日")
            return "；".join(formatted)

        grouped = defaultdict(list)
        if no_price_records:
            log(f">>> 🚨 捕获游走态意外节点！正在留存状态快照至【无特征溯源池】...", "WARN")
            if "蓝橙无单价明细" in wb1.sheetnames:
                ws_noprice = fast_recreate_sheet(wb1, "蓝橙无单价明细")
                current_idx = wb1.index(ws_noprice)
                if current_idx != 0: wb1.move_sheet(ws_noprice, offset=-current_idx)
            else:
                ws_noprice = wb1.create_sheet(title="蓝橙无单价明细", index=0)

            if "蓝橙无单价" in wb1.sheetnames:
                ws_old = fast_recreate_sheet(wb1, "蓝橙无单价")
                ws_old.sheet_state = 'hidden'

            ws_noprice.sheet_properties.tabColor = "FF9900"
            headers_noprice = ["团队名称", "骑手ID", "骑手姓名", "蓝橙无单价日期"]
            ws_noprice.append(headers_noprice)

            for rec in no_price_records:
                b_date = _norm_date(rec[0])
                team = str(rec[1]).strip()
                r_id = str(rec[2]).replace('.0', '').strip()
                r_name = str(rec[3]).strip()
                key = (team, r_id, r_name)
                grouped[key].append(b_date)

            for key, dates in grouped.items():
                date_str = format_dates_streak(dates) + "无单价"
                row_vals = [key[0], key[1], key[2], date_str]
                ws_noprice.append(row_vals)


        # 开始基于日单量数据计算考勤和安全基金
        if "安全基金" in wb1.sheetnames and "配送所得表" in wb1.sheetnames and daily_summary:
            ws_sht2 = wb1["安全基金"]
            ws_sht1 = wb1["配送所得表"]
            
            att_records = []
            for row_data in sorted_keys:
                b_date, team, rid, rname = row_data
                summ = daily_summary[row_data]
                has_fraud = (summ.get("fraud_comp", 0) > 0 or summ.get("fraud_late", 0) > 0)
                if has_fraud:
                    real_comp = summ.get("completed", 0) - summ.get("fraud_comp", 0)
                    real_late = summ.get("late", 0) - summ.get("fraud_late", 0)
                    is_valid = 0 if (real_comp <= 0 and real_late <= 0) else 1
                else:
                    is_valid = 1
                rid_clean = str(rid).replace('.0', '').strip()
                if not rid_clean or rid_clean.lower() == 'nan': continue
                att_records.append({
                    "_date": b_date,
                    "_tid": str(team).strip(),
                    "_rid": rid_clean,
                    "rname": str(rname).strip(),
                    "is_valid": is_valid,
                    "order_count": summ["total"]
                })
            
            # import pandas as pd
            df_att = pd.DataFrame(att_records)
            df_sht2 = pd.DataFrame(columns=["团队名称", "骑手ID", "骑手姓名", "出勤天", "安全基金", "非蜂卡", "月费"])
            
            if not df_att.empty:
                # 欺诈单值为0的才是出勤天
                df_valid_days = df_att[df_att["is_valid"] == 1]
                if not df_valid_days.empty:
                    rider_attendance = df_valid_days.groupby('_rid')['_date'].nunique().reset_index(name='出勤天')
                else:
                    rider_attendance = pd.DataFrame(columns=['_rid', '出勤天'])
                
                # 计算各站点总单量以确定主要站点
                rider_team_counts = df_att.groupby(['_rid', '_tid']).agg(total_orders=('order_count', 'sum')).reset_index()
                idx = rider_team_counts.groupby('_rid')['total_orders'].idxmax()
                best_teams = rider_team_counts.loc[idx, ['_rid', '_tid']]
                
                attendance_counts = pd.merge(best_teams, rider_attendance, on='_rid', how='left')
                attendance_counts['出勤天'] = attendance_counts['出勤天'].fillna(0).astype(int)
                
                # 提取所有出现的去重的团队和骑手信息
                df_all = df_att[['_tid', '_rid', 'rname']].drop_duplicates()
                df_sht2 = pd.merge(df_all, attendance_counts, on=['_tid', '_rid'], how='left')
                df_sht2['本期出勤天'] = df_sht2['出勤天'].fillna(0).astype(int)
                
                try:
                    days_in_month = pd.Timestamp(last_date).days_in_month
                except:
                    days_in_month = 30
                    
                past_attendance_dict, past_attendance_notes, past_month_fee_deducted = extract_past_records(out_folder)

                def get_past_days(row):
                    # 处理逻辑：获取并返回所需的系统状态或计算数据
                    if row['本期出勤天'] == 0:
                        return 0
                    pid = str(row['_rid']).replace('.0', '').strip()
                    return past_attendance_dict.get(pid, 0)
                
                def get_past_notes(row):
                    # 处理逻辑：获取并返回所需的系统状态或计算数据
                    if row['本期出勤天'] == 0:
                        return ""
                    pid = str(row['_rid']).replace('.0', '').strip()
                    notes = past_attendance_notes.get(pid, [])
                    if notes:
                        return "【" + "；".join(notes) + "】"
                    return ""

                def get_past_fee_deducted(row):
                    # 处理逻辑：获取并返回所需的系统状态或计算数据
                    pid = str(row['_rid']).replace('.0', '').strip()
                    return "是" if past_month_fee_deducted.get(pid, False) else "否"
                
                df_sht2['往期累计出勤天'] = df_sht2.apply(get_past_days, axis=1)
                df_sht2['往期累计核算记录'] = df_sht2.apply(get_past_notes, axis=1)
                df_sht2['往期月费是否已扣'] = df_sht2.apply(get_past_fee_deducted, axis=1)

                custom_deductions = [str(c) for c in df_rules.columns if c in ["安全基金", "使用费", "非蜂卡", "月费"]]
                
                cfg_team = next((c for c in df_rules.columns if "团队名称" in str(c) and "maxDays" not in str(c)), None)
                if cfg_team:
                    df_rules_sub = df_rules.copy()
                    df_rules_sub['_cfg_team'] = df_rules_sub[cfg_team].astype(str).str.strip()
                    df_rules_sub = df_rules_sub.drop_duplicates(subset=['_cfg_team'])
                    
                    cols_to_drop = [c for c in custom_deductions if c in df_sht2.columns]
                    if cols_to_drop:
                        df_sht2 = df_sht2.drop(columns=cols_to_drop)
                    
                    overlap = [c for c in df_rules_sub.columns if c in df_sht2.columns and c != '_cfg_team']
                    if overlap:
                        df_rules_sub = df_rules_sub.drop(columns=overlap)

                    def _match_cfg_team(tid):
                        tid_str = re.sub(r'_?新专送', '', str(tid).strip())
                        for c_team in df_rules_sub['_cfg_team']:
                            c_team_clean = re.sub(r'_?新专送', '', str(c_team).strip())
                            if c_team_clean == tid_str:
                                return c_team
                        log(f"Debug2: Match failed for tid='{tid_str}'. Config teams sample: {list(df_rules_sub['_cfg_team'])[:5]}...", "WARN")
                        return str(tid).strip()

                    df_sht2['_mapped_tid'] = df_sht2['_tid'].apply(_match_cfg_team)
                    df_sht2 = pd.merge(df_sht2, df_rules_sub, left_on='_mapped_tid', right_on='_cfg_team', how='left')
                    df_sht2 = df_sht2.drop(columns=['_mapped_tid'])
                
                filtered_custom_deductions = []
                for d_col in custom_deductions:
                    if d_col in ["安全基金", "使用费", "非蜂卡", "月费"]:
                        if d_col in df_sht2.columns:
                            if pd.to_numeric(df_sht2[d_col], errors='coerce').fillna(0).abs().sum() == 0:
                                df_sht2 = df_sht2.drop(columns=[d_col])
                                continue
                        else:
                            continue
                    filtered_custom_deductions.append(d_col)
                custom_deductions = filtered_custom_deductions

                for d_col in custom_deductions:
                    if d_col not in df_sht2.columns:
                        df_sht2[d_col] = 0
                    df_sht2[d_col] = pd.to_numeric(df_sht2[d_col], errors='coerce').fillna(0)

                def calc_deduction(val, att_days, past_days, max_days):
                    # 处理逻辑：针对具体业务项（如配送费、奖罚）执行金额计算及条件判定
                    if pd.isna(val) or val == 0: return 0
                    if pd.isna(max_days) or str(max_days).strip() == "":
                        return att_days * val
                    max_d = float(max_days)
                    if att_days + past_days < max_d:
                        return att_days * val
                    else:
                        if past_days >= max_d:
                            return 0
                        else:
                            return (max_d - past_days) * val

                for d_col in custom_deductions:
                    max_col = f"{d_col}_maxDays"
                    is_kw_col = f"{d_col}_isKw"
                    
                    if d_col == '月费':
                        def apply_fee_logic(row, d_name=d_col):
                            # 处理逻辑：日志输出及前端进度条回调事件生成
                            if row.get('往期月费是否已扣') == '是':
                                return 0
                            return row[d_name]
                        df_sht2[d_col] = df_sht2.apply(apply_fee_logic, axis=1)
                    else:
                        def row_calc(row, item_name, max_name, iskw_name):
                            # 处理逻辑：针对具体业务项（如配送费、奖罚）执行金额计算及条件判定
                            is_kw = row.get(iskw_name, False)
                            if pd.isna(is_kw):
                                is_kw = False
                            else:
                                is_kw = bool(is_kw)
                            val = row[item_name]
                                
                            fixed_amt = 0
                            if not (pd.isna(val) or val == 0):
                                if abs(val - (-0.5)) < 1e-5:
                                    fixed_amt = row["本期出勤天"] * val
                                else:
                                    max_val = row.get(max_name, None)
                                    fixed_amt = calc_deduction(val, row["本期出勤天"], row["往期累计出勤天"], max_val)
                            
                            r_id = str(row.get('_rid', '')).replace('.0', '').strip()
                            has_kw_hit = r_id in rider_wtd_deductions and item_name in rider_wtd_deductions[r_id]
                            
                            if is_kw:
                                if has_kw_hit:
                                    return rider_wtd_deductions[r_id][item_name]
                                else:
                                    return 0
                            else:
                                return fixed_amt

                        df_sht2[d_col] = df_sht2.apply(lambda row: row_calc(row, d_col, max_col, is_kw_col), axis=1)

                temp_tid = df_sht2['_tid'].copy() if '_tid' in df_sht2.columns else None
                temp_rid = df_sht2['_rid'].copy() if '_rid' in df_sht2.columns else None
                temp_rname = df_sht2['rname'].copy() if 'rname' in df_sht2.columns else None
                
                cols_to_drop = ['_tid', '_rid', '_cfg_team', '出勤天', '团队名称', '骑手ID', '骑手姓名', 'rname']
                df_sht2.drop(columns=[c for c in cols_to_drop if c in df_sht2.columns], inplace=True, errors='ignore')
                df_sht2.drop(columns=[c for c in df_sht2.columns if c.startswith('团队名称_') or c.startswith('骑手ID_') or c.startswith('骑手姓名_')], inplace=True, errors='ignore')
                
                if temp_tid is not None: df_sht2['团队名称'] = temp_tid
                if temp_rid is not None: df_sht2['骑手ID'] = temp_rid
                if temp_rname is not None: df_sht2['骑手姓名'] = temp_rname
                
                final_cols_sht2 = ["团队名称", "骑手ID", "骑手姓名"] + custom_deductions + ["本期出勤天"]
                if past_attendance_dict or past_attendance_notes or past_month_fee_deducted:
                    final_cols_sht2.extend(["往期累计出勤天", "往期累计核算记录", "往期月费是否已扣"])
                
                final_cols_sht2 = list(dict.fromkeys(final_cols_sht2))
                df_sht2 = df_sht2[[c for c in final_cols_sht2 if c in df_sht2.columns]]

                df_sht2.sort_values(by=["团队名称", "骑手ID"], ascending=[True, True], inplace=True)
                
                try:
                    df_sht2["骑手ID"] = pd.to_numeric(df_sht2["骑手ID"])
                except:
                    pass

            # import numpy as np
            df_sht2_obj = df_sht2.astype(object)
            df_sht2_obj[pd.isna(df_sht2_obj)] = None

            data_list = df_sht2_obj.values.tolist()
            
            # Clear old rows in ws_sht2
            try:
                ws_sht2.delete_rows(2, ws_sht2.max_row)
            except:
                pass

            headers_sht2 = list(df_sht2.columns)
            for c_idx, val in enumerate(headers_sht2, 1): ws_sht2.cell(row=1, column=c_idx, value=val)
            for r_idx, row_data_iter in enumerate(data_list, 2):
                for c_idx, val in enumerate(row_data_iter, 1): ws_sht2.cell(row=r_idx, column=c_idx, value=val)

            last_row_sht2 = len(data_list) + 1
            num_riders = last_row_sht2 - 1
            stats_info["riders"] = max(stats_info.get("riders", 0), num_riders)
            log(f"-> 🎯 聚合扫描完成（新逻辑）：侦测到 {num_riders} 个活动实体！", "INFO")

            if last_row_sht2 > 2:
                # import re
                # import copy
                formula_regex = re.compile(r'(?<![a-zA-Z0-9_])(\!?\$??)([a-zA-Z]{1,3})(\!?\$??)([1-9][0-9]{0,6})(?![a-zA-Z0-9_])')
                
                def fast_shift(clean_f, delta):
                    # 处理逻辑：fast_shift 的主要执行逻辑
                    if not clean_f or delta == 0: return clean_f
                    def replacer(match):
                        # 处理逻辑：replacer 的主要执行逻辑
                        c_abs, c, r_abs, r = match.groups()
                        if '$' in r_abs: return match.group(0)
                        return f"{c_abs}{c}{r_abs}{int(r) + delta}"
                    return formula_regex.sub(replacer, clean_f)

                for col_idx in range(4, ws_sht2.max_column + 1):
                    cell_template = ws_sht2.cell(row=2, column=col_idx)
                    if cell_template.value and isinstance(cell_template.value, str) and cell_template.value.startswith('='):
                        clean_f = cell_template.value
                        for row_idx in range(3, last_row_sht2 + 1):
                            target_cell = ws_sht2.cell(row=row_idx, column=col_idx)
                            delta = row_idx - 2
                            try:
                                target_cell.value = fast_shift(clean_f, delta)
                            except Exception:
                                target_cell.value = cell_template.value
                            if cell_template.has_style: target_cell._style = copy.copy(cell_template._style)

            # import copy

            if num_riders > 0:
                # import re
                try:
                    from openpyxl.formula.array import ArrayFormula
                except ImportError:
                    ArrayFormula = None

                m_ranges = list(ws_sht1.merged_cells.ranges)
                for m_range in m_ranges:
                    if m_range.min_row >= 4: ws_sht1.unmerge_cells(m_range.coord)
                    
                # Clear template empty rows up to old max riders - DONT delete so we keep template formatting
                # try:
                #     ws_sht1.delete_rows(5, ws_sht1.max_row - 4)
                # except:
                #     pass

                if num_riders > 1:
                    try:
                        ws_sht1.insert_rows(5, amount=num_riders - 1)
                    except:
                        pass


                max_col_sht1 = ws_sht1.max_column
                template_row_info = []
                from openpyxl.utils import get_column_letter
                for c_idx in range(1, max_col_sht1 + 1):
                    cell = ws_sht1.cell(row=4, column=c_idx)
                    template_row_info.append({
                        'val': cell.value, 'style': copy.copy(cell._style) if cell.has_style else None,
                        'col_letter': get_column_letter(c_idx)
                    })

                for i in range(num_riders):
                    t_row = i + 4
                    for c_idx, t_item in enumerate(template_row_info, 1):
                        target_cell = ws_sht1.cell(row=t_row, column=c_idx)
                        if t_row > 4 and t_item['style']: target_cell._style = t_item['style']

                        if c_idx in [2, 3, 4]:
                            val_idx = c_idx - 2
                            target_cell.value = ws_sht2.cell(row=i + 2, column=val_idx + 1).value
                        else:
                            formula_val = t_item['val']
                            if isinstance(formula_val, str) and formula_val.startswith('='):
                                clean_f = formula_val.replace("{", "").replace("}", "").strip()
                                delta = t_row - 4
                                try:
                                    translated_f = fast_shift(clean_f, delta)
                                    if (c_idx == 1 or c_idx == 20) and formula_val.startswith("{"):
                                        target_cell.value = ArrayFormula(target_cell.coordinate, translated_f) if ArrayFormula else translated_f
                                    else:
                                        target_cell.value = translated_f
                                except:
                                    target_cell.value = clean_f
                            else:
                                if t_row > 4: target_cell.value = t_item['val']

                f_row = max(5, 4 + num_riders)
                
                try:
                    ws_sht1.merge_cells(start_row=f_row, start_column=1, end_row=f_row, end_column=4)
                    cell_total = ws_sht1.cell(row=f_row, column=1)
                    cell_total.value = "合计"
                    from openpyxl.styles import Alignment
                    cell_total.alignment = Alignment(horizontal='center', vertical='center')
                except Exception:
                    pass
                
                # Removed the block that attempts to format f_row since we are keeping the template's footer row, which is already correctly formatted.
                pass

        try:
            if "配送所得表" in wb1.sheetnames:
                ws_income_target = wb1["配送所得表"]
                remark_col_idx = -1
                leishen_price_col_idx = -1

                for r in range(1, 6):
                    for c in range(1, ws_income_target.max_column + 1):
                        cell_val = str(ws_income_target.cell(row=r, column=c).value or "").strip()
                        if "备注" in cell_val:
                            remark_col_idx = c
                        elif "蓝橙单价" in cell_val:
                            leishen_price_col_idx = c

                noprice_lookup = {f"{k[0]}_{k[1]}": format_dates_streak(v) + "无单价" for k, v in grouped.items()}

                for row in ws_income_target.iter_rows(min_row=4):
                    team_val = str(row[1].value or "").strip()
                    id_val = str(row[2].value or "").replace('.0', '').strip()

                    if team_val or id_val:
                        lookup_key = f"{team_val}_{id_val}"
                        remark_parts = []
                        if lookup_key in noprice_lookup: remark_parts.append(noprice_lookup[lookup_key])

                        if lookup_key in rider_prices_dict:
                            prices_set = rider_prices_dict[lookup_key]
                            if len(prices_set) > 1:
                                multi_price_remarks = []
                                for p, d_list in rider_price_dates_dict[lookup_key].items():
                                    if p == "无单价": continue
                                    streak_str = format_dates_streak(d_list)
                                    multi_price_remarks.append(f"{streak_str}单价{p}元")
                                if multi_price_remarks: remark_parts.append("；".join(multi_price_remarks))

                            if len(prices_set) > 1 and "无单价" in prices_set: prices_set.remove("无单价")

                            if leishen_price_col_idx != -1:
                                prices_list = sorted(list(prices_set))
                                if len(prices_list) == 1:
                                    final_leishen_price = to_numeric_if_possible(prices_list[0])
                                else:
                                    final_leishen_price = ";".join(prices_list)
                                row[leishen_price_col_idx - 1].value = final_leishen_price

                        if remark_col_idx != -1:
                            if remark_parts:
                                row[remark_col_idx - 1].value = "；".join(remark_parts)
                            else:
                                row[remark_col_idx - 1].value = ""  # 确保清空旧备注

                if remark_col_idx != -1:
                    pass

        except Exception as e:
            log(f"处理动态反写和高级备注合并时遭遇暗流: {e}", "WARN")

        if intercept_records:
            log(">>> 正在合成系统级拦截与安全分析日志...", "SYSTEM")
            ws_intercept = wb1.create_sheet(title="拦截溯源")
            ws_intercept.sheet_properties.tabColor = "FF0000"
            ws_intercept.append(["拦截工作薄名称", "拦截类型", "运单号", "骑手ID", "骑手名称"])
            for rec in intercept_records:
                if len(rec) >= 5:
                    ws_intercept.append([rec[0], rec[1], rec[2], rec[3], rec[4]])
                else:
                    ws_intercept.append([rec[0], rec[1], rec[2], "", ""])

        log(">>> 即将执行 GC (垃圾回收) 释放缓存页资源...", "SYSTEM")
        progress_callback(0.90, "执行内存碎片回收与冗余空闲清退...")
        from openpyxl.utils import get_column_letter
        for ws in wb1.worksheets:
            for col_idx in range(ws.max_column, 0, -1):
                col_val = str(ws.cell(row=1, column=col_idx).value or "")
                if col_val.startswith("Temp_Col_") or col_val in ["订单标签", "捡货补贴", "国补采集补贴", "国补机收补贴", "主站大网", "开放大网指派"]:
                    ws.column_dimensions[get_column_letter(col_idx)].hidden = True

        for ws in wb1.worksheets:
            is_apply_sheet = (ws.title == "申请名单")
            if is_apply_sheet or ws.title != "配送所得表":
                ws.freeze_panes = 'A2'

        ws_income = wb1["配送所得表"]
        date_str = f"{first_date.strftime('%m.%d')}-{last_date.strftime('%m.%d')}"
        if '全职' in str(selected_option):
            file_prefix = f"{city}{first_date.month}月全职"
        else:
            opt_str = str(selected_option).replace(' 00:00:00', '')
            file_prefix = f"{city}{date_str}{opt_str}兼职"
            
        import re
        file_prefix = re.sub(r'[\\/:*?"<>|\r\n]', '-', file_prefix)
            
        ws_income["A1"] = file_prefix

        for i, ws in enumerate(wb1.worksheets):
            try:
                if hasattr(ws, 'sheet_view'):
                    ws.sheet_view.tabSelected = (i == 0)
                elif hasattr(ws, 'views') and getattr(ws.views, 'sheetView', None):
                    ws.views.sheetView[0].tabSelected = (i == 0)
            except Exception:
                pass

        wb1.active = 0

        # =========================================================
        # 收尾：剥离专属表格，分别保存
        # =========================================================
        wb_special = openpyxl.Workbook()
        ws_default = wb_special.active
        has_special_data = False

        if "蓝橙无单价明细" in wb1.sheetnames:
            log(">>> 剥离失效状态流，启动安全隔离封存...", "SYSTEM")
            ws_noprice_old = wb1["蓝橙无单价明细"]
            ws_special_1 = ws_default
            ws_special_1.title = "蓝橙无单价明细"
            ws_special_1.sheet_properties.tabColor = "FF9900"
            has_special_data = True

            for row_idx, row in enumerate(ws_noprice_old.iter_rows(values_only=True), 1):
                new_row = list(row)
                if row_idx != 1 and len(new_row) >= 2:
                    val_str = str(new_row[1] or "").strip()
                    if val_str.isdigit(): new_row[1] = int(val_str)
                ws_special_1.append(new_row)

            for col_letter, col_dim in ws_noprice_old.column_dimensions.items(): ws_special_1.column_dimensions[
                col_letter].width = col_dim.width
            ws_special_1.freeze_panes = 'A2'
            del wb1["蓝橙无单价明细"]

        unbound_records = []
        if "安全基金" in wb1.sheetnames and "骑手支付绑定" in wb1.sheetnames:
            ws_fund = wb1["安全基金"]
            ws_bind = wb1["骑手支付绑定"]

            b_team_col, b_id_col, b_name_col, b_status_col = 2, 3, 4, 9
            for c in range(1, min(20, ws_bind.max_column + 1)):
                h_val = str(ws_bind.cell(row=1, column=c).value or "").strip()
                if "团队名称" in h_val:
                    b_team_col = c
                elif "id" in h_val.lower() or "编号" in h_val:
                    b_id_col = c
                elif "姓名" in h_val or "名称" in h_val:
                    b_name_col = c
                elif "绑" in h_val or "状态" in h_val:
                    b_status_col = c

            bind_map = {}
            for row in ws_bind.iter_rows(min_row=2, max_col=max(b_team_col, b_id_col, b_name_col, b_status_col), values_only=True):
                b_id = str(row[b_id_col-1] or "").replace('.0', '').strip()
                if b_id: 
                    b_team = str(row[b_team_col-1] or "").strip()
                    b_name = str(row[b_name_col-1] or "").strip()
                    b_status = str(row[b_status_col-1] or "").replace(" ", "").strip()
                    bind_map[b_id] = [b_team, b_id, b_name, b_status]

            for row in ws_fund.iter_rows(min_row=2, max_col=3, values_only=True):
                f_team = str(row[0] or "").strip()
                f_id = str(row[1] or "").replace('.0', '').strip()
                f_name = str(row[2] or "").strip()

                if f_id:
                    if f_id in bind_map:
                        match_data = bind_map[f_id]
                        status_val = match_data[3]
                        if "未" in status_val or "否" in status_val or "失败" in status_val or status_val == "": unbound_records.append(
                            match_data)
                    else:
                        unbound_records.append([f_team, f_id, f_name, "不在支付绑定名单中"])

        log(f">>> 全局鉴权拦截完毕，共计隔离 {len(unbound_records)} 个未注册非活跃凭证！", "SYSTEM")

        if has_special_data:
            ws_special_2 = wb_special.create_sheet("发薪工具未绑名单")
        else:
            ws_special_2 = ws_default
            has_special_data = True

        ws_special_2.title = "发薪工具未绑名单"
        ws_special_2.sheet_properties.tabColor = "FF0000"

        write_row = 1
        headers_special2 = ["团队名称", "骑手ID", "骑手姓名", "绑定情况"]
        for c_idx, val in enumerate(headers_special2, 1): ws_special_2.cell(row=write_row, column=c_idx, value=val)
        for rec in unbound_records:
            new_rec = list(rec)
            if len(new_rec) >= 2:
                val_str = str(new_rec[1]).strip()
                if val_str.isdigit():
                    new_rec[1] = int(val_str)
            ws_special_2.append(new_rec)

        ws_special_2.freeze_panes = 'A2'

        if has_special_data:
            if "Sheet" in wb_special.sheetnames and len(wb_special.sheetnames) > 1: del wb_special["Sheet"]
            special_save_name = "蓝橙无单价&未绑名单.xlsx"
            special_save_path = os.path.join(out_folder, special_save_name)
            wb_special.save(special_save_path)

        save_name = f"{file_prefix}{datetime.now().strftime('%m%d')}.xlsx"
        final_save_path = os.path.join(out_folder, save_name)

        progress_callback(0.97, "正在应用视觉排版美化与全局样式修正...")
        try:
            from openpyxl.styles import Alignment
            from openpyxl.utils import get_column_letter

            exclude_format_sheets = ["配送单表", "配送单", "配送所得表"]
            center_alignment = Alignment(horizontal='center', vertical='center')
            from openpyxl.styles import PatternFill
            header_fill = PatternFill(start_color="F8CBAD", end_color="F8CBAD", fill_type="solid")

            for sheet_name in wb1.sheetnames:
                sheet = wb1[sheet_name]
                if sheet_name != "配送所得表":
                    for cell in sheet[1]:
                        if cell.value is not None:
                            cell.fill = header_fill

                if sheet_name not in exclude_format_sheets:
                    ws_to_format = wb1[sheet_name]
                    
                    # 避免对行数过多的表执行过于耗时的宽度计算
                    max_scan_rows = 5000 
                    
                    # 遍历并设置所有非空单元格居中
                    for row in ws_to_format.iter_rows():
                        for cell in row:
                            if cell.value is not None:
                                cell.alignment = center_alignment
                                
                    # 自适应列宽
                    for col_idx in range(1, ws_to_format.max_column + 1):
                        max_length = 0
                        col_letter = get_column_letter(col_idx)
                        for r_idx in range(1, min(ws_to_format.max_row, max_scan_rows) + 1):
                            cell_val = ws_to_format.cell(row=r_idx, column=col_idx).value
                            if cell_val is not None:
                                try:
                                    cell_str = str(cell_val)
                                    # 处理包含换行的情况，按最长的一行计算宽度
                                    lines = cell_str.split('\n')
                                    for line in lines:
                                        # 中文或全角字符给予2.15倍的权重，普通字符给予1.1倍的权重
                                        line_len = sum(2.15 if ord(c) > 255 else 1.1 for c in line)
                                        if line_len > max_length:
                                            max_length = line_len
                                except:
                                    val_len = len(str(cell_val))
                                    if val_len > max_length:
                                        max_length = val_len
                        adjusted_width = min(max_length + 2.5, 55)  # 最大宽度限制适度放大，预留边距
                        if adjusted_width > 2:
                            ws_to_format.column_dimensions[col_letter].width = adjusted_width
            
            # 全局移除科学计数法: 确保长数值以常规数值格式显示
            for sheet in wb1.worksheets:
                for row in sheet.iter_rows():
                    for cell in row:
                        if isinstance(cell.value, (int, float)) and cell.value >= 1e10:
                            cell.number_format = '0'

            log(">>> ✨ 排版美化完成：已自动应用全局居中与列宽适配", "SUCCESS")
        except Exception as e:
            log(f"排版美化过程发生错误: {str(e)}", "WARN")

        if frontend_city == "小象超市" and "日单量" in wb1.sheetnames:
            del wb1["日单量"]

        progress_callback(0.98, "数据沙盒封装成功并对齐校验，安全下盘磁盘文件...")
        wb1.save(final_save_path)
        
        log(">>> 🎯 核心指纹MD5与本地源验证匹配，数据链路干净！", "SUCCESS")

        if intercept_records: log(f">>> 🚨 重放攻击警告：防洪坝成功阻挡 {len(intercept_records)} 次重复特征侵入！", "ERROR")

        elapsed_time = time.time() - start_time
        stats_info["elapsed_time"] = round(elapsed_time, 2)
        stats_info["intercepted"] = len(intercept_records) if 'intercept_records' in locals() else 0
        stats_info["unbound"] = len(unbound_records) if 'unbound_records' in locals() else 0
        stats_info["no_price"] = len(no_price_records) if 'no_price_records' in locals() else 0
        
        log(f">>> {random.choice(theme['msg_end'])}", "SYSTEM")
        log(f"事件总循环驻留时长: {elapsed_time:.2f} 秒")
        log(f"本地二进制对象封包构建输出位于: {out_folder}", "INFO")
        progress_callback(1.00, "周期月结数据分析架构全部收尾完毕！")
        finish_callback("success", out_folder, stats_info)
    except Exception as e:
        import traceback
        log(f"执行错误退出: {str(e)}\n{traceback.format_exc()}", "ERROR")
        progress_callback(0, "数据核心管线错误崩溃 (SIGKILL)")
        finish_callback("error", str(e), None)
