import sys
import json
import os

# Ensure python_app dir is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def log_cb(msg, level="INFO"):
    print(json.dumps({"type": "log", "msg": msg.strip(), "level": level}), flush=True)

def prog_cb(value, text):
    print(json.dumps({"type": "progress", "value": value, "text": text}), flush=True)

def fin_cb(status, result_msg, stats_info=None):
    print(json.dumps({
        "type": "finish",
        "status": status,
        "result_msg": result_msg,
        "stats_info": stats_info
    }), flush=True)

if __name__ == "__main__":
    try:
        from processor import process_rider_data
    except ImportError as e:
        log_cb(f"Missing Python Dependencies: {e}. Please ensure requirements.txt modules are installed locally.", "ERROR")
        fin_cb("error", str(e))
        sys.exit(1)

    try:
        input_str = sys.stdin.read()
        if not input_str:
            raise ValueError("No input data received.")
        
        input_data = json.loads(input_str)
        
        city = input_data.get("city", "深圳")
        selected_option = input_data.get("cycle", "半月结")
        base_path = input_data.get("basePath", "E:\\python_app")
        source_folder = input_data.get("sourcePath", "E:\\python_app")
        theme = input_data.get("theme", {})
        
        action = input_data.get("action", "main")
        
        # Populate theme safe-defaults if empty
        if not theme.get("msg_start"): theme["msg_start"] = ["系统启动..."]
        if not theme.get("msg_awake"): theme["msg_awake"] = ["防重雷达开启..."]
        if not theme.get("msg_empty"): theme["msg_empty"] = ["空空如也..."]
        if not theme.get("msg_process"): theme["msg_process"] = ["处理: {wb_name}"]
        if not theme.get("msg_success"): theme["msg_success"] = ["成功: {wb_name}"]
        if not theme.get("msg_final"): theme["msg_final"] = ["任务完成: {result_msg}"]
        
        if action == "main":
            # Call the existing processor logic with callbacks targeting stdout JSON stream
            process_rider_data(
                city=city,
                selected_option=selected_option,
                source_folder=source_folder,
                base_path=base_path,
                log_callback=log_cb,
                progress_callback=prog_cb,
                finish_callback=fin_cb,
                theme=theme
            )
        elif action == "remove_problem_orders":
            from actions import run_remove_problem_orders
            import glob
            salary_files = glob.glob(os.path.join(base_path, "*工资表*.xlsx"))
            problem_files = glob.glob(os.path.join(source_folder, "*问题单*.xlsx"))
            if not salary_files or not problem_files:
                log_cb(f"错误: 在目标文件夹中未找到匹配的工资表(工资表.xlsx)或问题单(问题单.xlsx)。", "ERROR")
                fin_cb("error", "文件未找到")
            else:
                run_remove_problem_orders(salary_files[0], problem_files[0], log_cb)
                fin_cb("success", "执行完毕")
                
        elif action == "raise_price":
            from actions import run_raise_price
            import glob
            salary_files = glob.glob(os.path.join(base_path, "*工资表*.xlsx"))
            price_files = glob.glob(os.path.join(source_folder, "*价格*.xlsx")) + glob.glob(os.path.join(source_folder, "*价格*.csv"))
            if not salary_files or not price_files:
                log_cb(f"错误: 在目标文件夹中未找到匹配的工资表或价格档案。", "ERROR")
                fin_cb("error", "文件未找到")
            else:
                run_raise_price(salary_files[0], price_files[0], log_cb)
                fin_cb("success", "执行完毕")
                
        elif action == "overdue_review":
            log_cb(">>> ⏰ 正在接管【蓝橙超期提审】通道... (核心逻辑待开发)", "SYSTEM")
            fin_cb("success", "已接管")
            
        elif action == "summary_parttime":
            from actions import run_summary_parttime
            def mock_open_file(f):
                log_cb(f"已生成文件并尝试打开: {f}", "INFO")
            run_summary_parttime(source_folder, city, log_cb, mock_open_file)
            fin_cb("success", "执行完毕")

        elif action == "open_config":
            config_file = os.path.join(base_path, "config.xlsx")
            if os.path.exists(config_file):
                log_cb(f">>> 试图打开设定文件: {config_file}", "SYSTEM")
                try:
                    if hasattr(os, 'startfile'):
                        os.startfile(config_file)
                except Exception as e:
                    log_cb(f"文件暂时打不开哦: {str(e)}", "WARN")
            else:
                log_cb(f"哎呀，该文件不知被谁藏起来了: {config_file}", "WARN")
            fin_cb("success", "执行完毕")
            
        elif action == "open_source":
            if os.path.exists(source_folder):
                log_cb(f">>> 试图打开数据源: {source_folder}", "SYSTEM")
                try:
                    if hasattr(os, 'startfile'):
                        os.startfile(source_folder)
                except Exception as e:
                    log_cb(f"文件夹打不开: {str(e)}", "WARN")
            else:
                log_cb(f"目录不存在: {source_folder}", "WARN")
            fin_cb("success", "执行完毕")
            
        elif action == "open_explorer":
            target = input_data.get("targetPath", "")
            if os.path.exists(target):
                log_cb(f">>> 打开资源管理器: {target}", "SYSTEM")
                try:
                    if hasattr(os, 'startfile'):
                        os.startfile(target)
                except Exception:
                    pass
            else:
                log_cb(f"目录不存在或为空，无法打开", "WARN")
            fin_cb("success", "执行完毕")
            
        elif action == "add_task_root":
            log_cb(">>> 正在拉起授权弹窗... (Web环境中受到安全限制，请手动输入路径)", "SYSTEM")
            fin_cb("success", "授权弹窗请求")


    except Exception as e:
        import traceback
        log_cb(f"Execution Error: {traceback.format_exc()}", "ERROR")
        fin_cb("error", str(e))
