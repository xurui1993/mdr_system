# ==========================================
# 核心后端接口服务 (FastAPI)
# 本文件主要用于：
# 1. 提供前端调用的REST API接口及SSE(Server-Sent Events)流式任务输出
# 2. 调用 processor, tasks 等核心计算逻辑
# 3. 提供本地资源管理器弹窗、系统状态监控等辅助接口
# ==========================================
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio
import os
import sys
import json
import subprocess
import tempfile
import uuid
try:
    import psutil
except ImportError:
    psutil = None

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
    cycle: Optional[str] = ""
    basePath: str = ""
    sourcePath: str
    action: str = None
    targetPath: str = None
    theme: dict = None
    issueSelectedCities: list[str] = None
    startDate: str = None
    endDate: str = None
    cookie: str = None
    enableInterceptor: bool = False
    enableCrossStationMerge: bool = False
    deductionRules: list = []

class FileRequest(BaseModel):
    path: str

CONFIG_FILE = ".aegis_config.json"

@app.get("/api/config")
def get_config():
    # 处理逻辑：配置数据的读取与保存，用于状态持久化
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}

@app.post("/api/config")
def save_config(params: dict):
    # 处理逻辑：配置数据的读取与保存，用于状态持久化
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(params, f, ensure_ascii=False, indent=2)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

class DialogRequest(BaseModel):
    title: str = "选择"

@app.post("/api/dialog/folder")
def select_folder(req: DialogRequest):
    # 处理逻辑：处理文件或目录的选择交互及路径解析
    title = req.title
    try:
        tmp_path = os.path.join(tempfile.gettempdir(), f"path_folder_{uuid.uuid4().hex}.txt").replace('\\', '/')
        # 使用 subprocess 在主线程运行 tkinter，避免 FastAPI 线程池冲突
        code = f'''
import tkinter as tk
from tkinter import filedialog
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
path = filedialog.askdirectory(title="{title}")
with open(r"{tmp_path}", "w", encoding="utf-8") as f:
    f.write(path)
'''
        subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
        path = ""
        if os.path.exists(tmp_path):
            with open(tmp_path, "r", encoding="utf-8") as f:
                path = f.read().strip()
            os.remove(tmp_path)
        return {"path": path, "error": ""}
    except Exception as e:
        return {"path": "", "error": str(e)}

class SmartSourceRequest(BaseModel):
    basePath: str = ""

@app.post("/api/dialog/smart_source")
def check_smart_source(req: SmartSourceRequest):
    # 处理逻辑：check_smart_source 的主要执行逻辑
    basePath = req.basePath
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

@app.post("/api/dialog/file")
def select_file(req: DialogRequest):
    # 处理逻辑：处理文件或目录的选择交互及路径解析
    title = req.title
    try:
        tmp_path = os.path.join(tempfile.gettempdir(), f"path_file_{uuid.uuid4().hex}.txt").replace('\\', '/')
        code = f'''
import tkinter as tk
from tkinter import filedialog
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
path = filedialog.askopenfilename(title="{title}")
with open(r"{tmp_path}", "w", encoding="utf-8") as f:
    f.write(path)
'''
        subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
        path = ""
        if os.path.exists(tmp_path):
            with open(tmp_path, "r", encoding="utf-8") as f:
                path = f.read().strip()
            os.remove(tmp_path)
        return {"path": path, "error": ""}
    except Exception as e:
        return {"path": "", "error": str(e)}

@app.get("/api/default_paths")
def get_default_paths():
    # 处理逻辑：获取并返回所需的系统状态或计算数据
    return {"configPath": "./data/config.xlsx", "dataPath": "./uploads"}

@app.post("/api/open/config")
def open_config(req: FileRequest):
    # 处理逻辑：配置数据的读取与保存，用于状态持久化
    import sys
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        project_root = os.path.dirname(exe_dir) if os.path.basename(exe_dir).lower() in ['dist', 'build'] else exe_dir
    else:
        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_file_dir) if os.path.basename(current_file_dir) == 'backend' else current_file_dir
        
    config_file = os.path.join(project_root, "data/config.xlsx")

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

@app.post("/api/resume_task")
async def resume_task(req: Request):
    # 处理逻辑：resume_task 的主要执行逻辑
    data = await req.json()
    uid = data.get("uuid")
    action = data.get("action", False)
    
    import sys
    # Try importing tasks if not already
    import tasks
    global_events = getattr(sys.modules['tasks'], 'GLOBAL_RESUME_EVENTS', {})
    
    if uid in global_events:
        global_events[uid]['result'] = action
        global_events[uid]['event'].set()
        return {"success": True}
    return {"success": False, "error": "Task wait event not found or expired."}

@app.post("/api/open/explorer")
def open_explorer(req: FileRequest):
    # 处理逻辑：open_explorer 的主要执行逻辑
    path = req.path
    # 打印非乱码日志
    print(f"INFO:     唤起本地资源管理器 -> {path}")
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

@app.post("/api/files/tree")
def list_files_tree(req: FileRequest):
    path = req.path
    if path:
        applet_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.abspath(os.path.join(applet_dir, path))
    if not path or not os.path.exists(path):
        return {"tree": []}
    
    if os.path.isfile(path):
        path = os.path.dirname(path)

    def build_tree(current_path, depth=0):
        if depth > 4:  # limit depth to prevent massive payloads
            return []
        items = []
        try:
            for f in os.listdir(current_path):
                if f.startswith("~") or f.startswith("."):
                    continue
                f_path = os.path.join(current_path, f)
                is_dir = os.path.isdir(f_path)
                if is_dir:
                    items.append({
                        "name": f,
                        "path": f_path,
                        "is_dir": True,
                        "children": build_tree(f_path, depth + 1)
                    })
                else:
                    items.append({
                        "name": f,
                        "path": f_path,
                        "is_dir": False,
                        "size": os.path.getsize(f_path)
                    })
            items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        except Exception:
            pass
        return items

    return {"tree": build_tree(path)}

@app.post("/api/files")
def list_files(req: FileRequest, request: Request):
    # 处理逻辑：处理文件或目录的选择交互及路径解析
    path = req.path
    wid = request.headers.get("x-workspace-id")
    if not path or not os.path.exists(path):
        return {"files": []}
    
    # 手动打印一次清晰的日志
    print(f"INFO:     正在获取系统文件列表 -> {path}")
    
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

@app.get("/api/system/stats")
def get_system_stats():
    # 处理逻辑：获取并返回所需的系统状态或计算数据
    if psutil is None:
        return {"success": False, "error": "psutil not installed"}
    try:
        cpu = psutil.cpu_percent(interval=None) 
        mem = psutil.virtual_memory()
        
        process = psutil.Process()
        proc_cpu = process.cpu_percent(interval=0.1)
        proc_mem = process.memory_info().rss / (1024 * 1024) # MB
        
        return {
            "success": True,
            "sysCpu": cpu,
            "sysMemRatio": mem.percent,
            "procCpu": proc_cpu,
            "procMem": round(proc_mem, 2)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/salary_bind/stats")
def get_salary_bind_stats():
    # 处理逻辑：获取骑手支付绑定任务的所有历史 JSON 统计数据，供前端按月份筛选
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "outputs", "骑手支付绑定"))
    if not os.path.exists(base_dir):
        return {"code": 0, "data": []}
    
    results = []
    try:
        for month_folder in os.listdir(base_dir):
            folder_path = os.path.join(base_dir, month_folder)
            if os.path.isdir(folder_path):
                stats_file = os.path.join(folder_path, "stats.json")
                if os.path.exists(stats_file):
                    try:
                        import json
                        with open(stats_file, 'r', encoding='utf-8') as f:
                            stats = json.load(f)
                        mtime = os.path.getmtime(stats_file)
                        results.append({
                            "month": month_folder,
                            "stats": stats,
                            "mtime": mtime
                        })
                    except Exception:
                        pass
        # 按月份名称降序排序，最新的在前面
        results.sort(key=lambda x: str(x["month"]), reverse=True)
        return {"code": 0, "data": results}
    except Exception as e:
        return {"code": -1, "message": str(e), "data": []}

@app.post("/api/check_cookie")
async def check_cookie(request: Request):
    try:
        data = await request.json()
        cookie_str = data.get("cookie", "")
        if not cookie_str:
            return {"valid": False, "msg": "未提供 Cookie"}
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'Cookie': cookie_str
        }
        
        import requests
        # 尝试通过随便一个轻量接口验证, 或者获取列表，这里用 switchAgency 测试能否成功响应
        # 测试城市 深圳 31030116
        res = requests.post(
            "https://httpizza.ele.me/lpd.meepo.session/aeolus/switchAgency",
            json={"toAgencyId": 31030116},
            headers=headers,
            timeout=5
        )
        
        if res.status_code == 401 or res.status_code == 403:
             return {"valid": False, "msg": "Cookie 已失效或无权限 (401/403)"}
             
        res.raise_for_status()
        resp_data = res.json()
        
        # 通常 ele.me 失败的话会在返回体里带 error 或 name = BIZ_ERROR
        if resp_data.get('error') or resp_data.get('name') == 'BIZ_ERROR' or resp_data.get('code') != 200 and 'code' in resp_data:
            # 有时可能单纯是因为城市ID不对，但至少能看出来有没有鉴权通过
            if "登录" in str(resp_data) or "失效" in str(resp_data):
                return {"valid": False, "msg": f"验证失败: {resp_data.get('message', 'Cookie已失效')}"}
        
        return {"valid": True, "msg": "Cookie 连接有效！准入凭证正常。"}
    except Exception as e:
        return {"valid": False, "msg": f"验证失败，请检查网络或Cookie: {str(e)}"}

@app.post("/api/run")
async def run_calculation(config: ConfigRequest, request: Request):
    """
    接收来自前端的运算指令
    """
    wid = request.headers.get("x-workspace-id")
    if wid and config.sourcePath and wid not in config.sourcePath:
       # For security
       pass 

    async def event_generator():
        # 处理逻辑：event_generator 的主要执行逻辑
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
                async for event in salary_bind_processor.run_salary_bind_gen(config.sourcePath, config.targetPath, config.basePath, deductionRules=config.deductionRules):
                    yield event
                return

            elif config.action == 'issue_orders':
                # Build the configuration object for the spider engine
                spider_config = {
                    "crawler": {
                        "cookie": config.cookie or ""
                    },
                    "run": {
                        "target_cities": config.issueSelectedCities or [],
                        "start_time": config.startDate or "",
                        "end_time": config.endDate or ""
                    },
                    "cities": {
                        "茂南"  : 20044122,
                        "安宁" : 14648136,
                        "香格里拉" : 20172179,
                        "宜良"  : 20000533,
                        "嵩明"  : 22492572,
                        "维西" : 31016844,
                        "三亚" : 31030156,
                        "大连" : 31029684,
                        "天津" : 31029676,
                        "宁波" : 31029428,
                        "泉州" : 31029436,
                        "北京" :31029692,
                        "上海" : 31019404,
                        "广州" : 31021076,
                        "深圳" : 31030116,
                        "东莞" : 31030140,
                        "韶关"  : 20044586,
                        "保定"  : 31003092
                    }
                }
                async for event in tasks.run_issue_orders_gen(spider_config, config.basePath):
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
                    config.enableInterceptor,
                    config.enableCrossStationMerge,
                    deductionRules=config.deductionRules
                ):
                    yield event
                return
        except Exception as e:
            yield f"data: {json.dumps({'type': 'log', 'msg': f'致命内部错误: {str(e)}', 'level': 'ERROR'})}\n\n"
            yield f"data: {json.dumps({'type': 'finish', 'status': 'error', 'result_msg': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/action_file")
async def action_file(request: Request):
    # 处理逻辑：处理文件或目录的选择交互及路径解析
    data = await request.json()
    action = data.get("action")
    path = data.get("path")
    import shutil
    try:
        if action == "delete":
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
            return {"success": True}
        elif action == "create_dir":
            os.makedirs(path, exist_ok=True)
            return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": False, "error": "Unknown action"}

from fastapi.responses import FileResponse

@app.get("/api/download/template")
async def download_template():
    import sys
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        project_root = os.path.dirname(exe_dir) if os.path.basename(exe_dir).lower() in ['dist', 'build'] else exe_dir
    else:
        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_file_dir) if os.path.basename(current_file_dir) == 'backend' else current_file_dir

    template_path = os.path.abspath(os.path.join(project_root, "兼职-template.xlsx"))
    if not os.path.exists(template_path):
        return {"success": False, "error": "Template file not found"}
    return FileResponse(template_path, filename="兼职-template.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
