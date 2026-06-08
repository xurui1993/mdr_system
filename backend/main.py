from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import os
import sys
import json
import subprocess

app = FastAPI(title="Aegis Payroll Core API")

# 配置跨域，方便本地前端(如 Vite)进行跨域调试
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConfigRequest(BaseModel):
    city: str
    cycle: str
    basePath: str
    sourcePath: str
    workspacePath: str = None
    action: str = None
    targetPath: str = None
    theme: dict = None
    issueSelectedCities: list[str] = None
    enableInterceptor: bool = False

CONFIG_FILE = ".aegis_config.json"

@app.get("/api/config")
def get_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}

@app.post("/api/config")
def save_config(params: dict):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(params, f, ensure_ascii=False, indent=2)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/dialog/folder")
def select_folder(title: str = "选择文件夹 (Aegis)"):
    try:
        # 使用 subprocess 在主线程运行 tkinter，避免 FastAPI 线程池冲突
        code = f'''
import tkinter as tk
from tkinter import filedialog
import sys
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
path = filedialog.askdirectory(title="{title}")
sys.stdout.write(path)
'''
        result = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
        path = result.stdout.strip()
        return {"path": path, "error": ""}
    except Exception as e:
        return {"path": "", "error": str(e)}

@app.get("/api/dialog/smart_source")
def check_smart_source(basePath: str = ""):
    candidates = []
    # 如果提供了 basePath (例如 appConfig.basePath)，则在其内部查找
    if basePath and os.path.exists(basePath):
        d = basePath if os.path.isdir(basePath) else os.path.dirname(basePath)
        candidates.append(os.path.join(d, "爬虫下载"))
    
    # 同时也检查当前后端运行目录
    candidates.append(os.path.abspath("爬虫下载"))
    
    for candidate in candidates:
        if os.path.exists(candidate) and os.path.isdir(candidate):
            return {"path": candidate, "error": "", "smart": True}
    
    return {"path": "", "error": "not found", "smart": False}

@app.get("/api/dialog/file")
def select_file(title: str = "选择文件 (Aegis)"):
    try:
        code = f'''
import tkinter as tk
from tkinter import filedialog
import sys
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
path = filedialog.askopenfilename(title="{title}")
sys.stdout.write(path)
'''
        result = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
        path = result.stdout.strip()
        return {"path": path, "error": ""}
    except Exception as e:
        return {"path": "", "error": str(e)}

@app.get("/api/default_paths")
def get_default_paths():
    import os
    import sys
    
    # 获取运行目录
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        parent_dir = os.path.dirname(exe_dir) if os.path.basename(exe_dir).lower() in ['dist', 'build'] else exe_dir
    else:
        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        # backend 目录的上级是工程根目录
        project_root = os.path.dirname(current_file_dir) if os.path.basename(current_file_dir) == 'backend' else current_file_dir
        parent_dir = project_root
        
    config_path = os.path.join(parent_dir, "config.xlsx")
    return {"configPath": config_path, "dataPath": parent_dir}

@app.get("/api/open/config")
def open_config(path: str):
    if os.path.isfile(path) or str(path).lower().endswith(('.xlsx', '.xls')):
        config_file = path
    else:
        config_file = os.path.join(path, "config.xlsx")
    if os.path.exists(config_file):
        try:
            import platform
            if platform.system() == 'Windows':
                os.startfile(config_file)
            elif platform.system() == 'Darwin':
                subprocess.run(['open', config_file])
            else:
                subprocess.run(['xdg-open', config_file])
            return {"success": True, "msg": f"正在打开: {config_file}", "exists": True}
        except Exception as e:
            return {"success": False, "msg": str(e), "exists": True}
    else:
        return {"success": False, "msg": "未找到配置文件", "exists": False}

@app.get("/api/open/explorer")
def open_explorer(path: str):
    if os.path.exists(path):
        if os.path.isfile(path):
            path = os.path.dirname(path)
        try:
            import platform
            if platform.system() == 'Windows':
                os.startfile(path)
            elif platform.system() == 'Darwin':
                subprocess.run(['open', path])
            else:
                subprocess.run(['xdg-open', path])
            return {"success": True, "error": ""}
        except Exception as e:
            return {"success": False, "error": str(e)}
    else:
        return {"success": False, "error": "目录不存在"}

@app.get("/api/files")
def list_files(path: str):
    if not path or not os.path.exists(path):
        return {"files": []}
    
    if os.path.isfile(path):
        path = os.path.dirname(path)

    try:
        items = []
        for f in os.listdir(path):
            if not f.startswith("~") and not f.startswith("."):
                f_path = os.path.join(path, f)
                is_dir = os.path.isdir(f_path)
                items.append({
                    "name": f,
                    "path": f_path,
                    "is_dir": is_dir,
                    "size": 0 if is_dir else os.path.getsize(f_path)
                })
        # 优先排列目录，然后按字母顺序排列
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return {"files": items}
    except Exception as e:
        return {"files": []}

@app.post("/api/run")
async def run_calculation(config: ConfigRequest):
    """
    接收来自前端的运算指令，支持本地绝对路径或相对路径
    """
    async def event_generator():
        try:
            import tasks

            if config.action == 'remove_problem_orders':
                async for event in tasks.run_remove_problem_orders_gen(config.sourcePath, config.targetPath):
                    yield event
                return
                
            elif config.action == 'raise_price':
                async for event in tasks.run_raise_price_gen(config.sourcePath, config.targetPath):
                    yield event
                return

            elif config.action == 'summary_parttime':
                async for event in tasks.run_summary_parttime_gen(config.sourcePath, config.city):
                    yield event
                return

            elif config.action == 'salary_bind':
                import salary_bind_processor
                async for event in salary_bind_processor.run_salary_bind_gen(config.sourcePath):
                    yield event
                return

            else:
                
                # 默认的主计算流程
                async for event in tasks.run_main_calculation_gen(
                    config.city, 
                    config.cycle, 
                    config.sourcePath, 
                    config.basePath, 
                    config.theme,
                    config.workspacePath,
                    config.enableInterceptor
                ):
                    yield event
                return
        except Exception as e:
            yield f"data: {json.dumps({'type': 'log', 'msg': f'致命内部错误: {str(e)}', 'level': 'ERROR'})}\n\n"
            yield f"data: {json.dumps({'type': 'finish', 'status': 'error', 'result_msg': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
