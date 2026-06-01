# 本地环境部署指南 (Python FastAPI + Web 前端)

为了突破云端沙盒无法读取本机的跨盘绝对路径 `C:/` `E:/` 的限制，本项目已完成了「前后端解耦引擎架构」(即方案二) 开发。

后续你需在自己 **电脑本地** 将前端界面和后端服务同时跑起来。

## 部署步骤：

### 1. 导出工程
在 AI Studio 编辑器右上方点击 `Settings` 图标 -> `Download (Export via ZIP)` 或 `Export via Github` 选项，将整个工程解压到你电脑的本地目录中。

---

### 2. 本地一键启动 (全新方式推荐)

为了免去大家开启两个窗口的麻烦，我为你增加了**一键启动功能**！
在解压出的工程目录中，双击运行 `一键启动.bat` (仅限 Windows 系统) 即可：
- ✅ 自动安装全套环境依赖 (Node & Python)
- ✅ 自动唤醒前端界面
- ✅ 自动同步拉起 Python 计算核心

（你会在同一个黑框终端里看到绿色提示的 FRONTEND，和青色提示的 PYTHON，说明两者联调成功）

---

### 💡 进阶技巧：如何告别反复下载 ZIP？

如果你觉得每次改完代码都要重新下载解压太麻烦，这里有两个极佳的解决方案：

#### 方法一：使用 Git 同步 (推荐)
1. 在 AI Studio 右上角选择 **Export via Github**，将代码推送到你的 GitHub 仓库。
2. 在你电脑本地使用 `git clone [你的仓库地址]` 下载代码。
3. 以后每次我们在 AI Studio 里修改了代码，你只需要在本地黑框里敲行命令：
   ```bash
   git pull
   ```
   代码就会在一秒内自动增量更新，再也不用解压了！然后直接运行 `一键启动.bat`。

#### 方法二：直接在本地开发 Python 引擎
现在的底层通信桥梁（本机的绝对路径选择、前后端 SSE 滚动日志流）**已经完全打通了**！
如果接下来你主要是为了编写 Excel 处理逻辑（用 pandas 等），你**完全可以直接用 VS Code 或 PyCharm 打开你电脑上的 `backend/main.py` 进行修改**，不需要每次都在网页端修改再下载了。只有当界面新增了按钮、修改了样式时，才需要重新同步前端代码。
如果一键启动发生未知错误，你才需要手动同时开启两部分。
此后端使用 `FastAPI` 构建，代码位于 `backend/` 目录下。它的作用是承接前端按钮的请求指令，直接读取你电脑 C/E 盘绝对路径的文件。

打开**一个新的独立终端**，然后执行：

```bash
# 1. 切换到 Python 后端目录
cd backend

# 2. 安装 Python 处理依赖环境库
pip install -r requirements.txt

# 3. 启动 FastAPI 后端服务 (默认运行在 8000 端口)
# 如果提示 uvicorn 不是内部命令，请使用: python -m uvicorn main:app --reload
python -m uvicorn main:app --reload
```

---

### 🎉 开始使用
当两个终端（前台 Vite，后台 FastAPI）都在运行中时：
1. 打开浏览器进入 `http://localhost:5173`。
2. 填入你的参数（如 E:\python_app 等）。
3. 此时所有运算将由 Python 处理，你可以直接在 `backend/main.py` 里的 `run_calculation()` 内调用你熟悉的 `pandas`, `openpyxl` 函数进行绝对盘符的 Excel 等表格处理！

前端会自动捕获 Python 后端的打印进度（SSE 协议），实现完美的交互。
