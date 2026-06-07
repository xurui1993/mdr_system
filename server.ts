import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock endpoints for the UI to avoid Python startup issues in preview environment

  app.get("/api/dialog/folder", (req, res) => {
    res.json({ path: "/mock/downloads/data", error: "" });
  });

  app.get("/api/dialog/smart_source", (req, res) => {
    res.json({ path: "/mock/downloads/data", error: "", smart: true });
  });

  app.get("/api/open/explorer", (req, res) => {
    res.json({ success: true, error: "" });
  });

  app.get("/api/open/config", (req, res) => {
    res.json({ success: true, msg: "配置打开成功", exists: true });
  });

  app.post("/api/run", (req, res) => {
    const { action, city, cycle, sourcePath, theme } = req.body;
    
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let step = 0;
    const steps = [
      { text: `[INFO] 开启【${theme?.name || 'Aegis'}】处理引擎... (Node驱动)`, level: 'INFO' },
      { text: `[SYSTEM] 正在模拟处理目标数据源: ${sourcePath}`, level: 'SYSTEM' },
      { text: `[INFO] ${action === 'salary_bind' ? '执行发薪工具绑定...' : '计算核算逻辑与报表...'}`, level: 'INFO' },
      { text: `[WARN] 发现些许异常记录，已开启自动拦截规则`, level: 'WARN' },
      { text: `[SUCCESS] 模拟任务完成！【${city || '通配'}-${cycle || '默认'}】`, level: 'SUCCESS' },
    ];

    const interval = setInterval(() => {
      if (step < steps.length) {
        sendEvent("message", steps[step]);
        sendEvent("progress", { percent: Math.round(((step + 1) / steps.length) * 100) });
        step++;
      } else {
        sendEvent("done", { msg: "完成" });
        clearInterval(interval);
        res.end();
      }
    }, 1000);
    
    req.on("close", () => clearInterval(interval));
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
