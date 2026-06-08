import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Memory config storage for mock
  let mockConfig: any = {};

  app.get("/api/config", (req, res) => {
    res.json(mockConfig);
  });

  app.post("/api/config", (req, res) => {
    mockConfig = { ...mockConfig, ...req.body };
    res.json({ success: true });
  });

  app.get("/api/dialog/folder", (req, res) => {
    res.json({ path: "/mock/downloads/data", error: "" });
  });

  app.get("/api/dialog/smart_source", (req, res) => {
    res.json({ path: "", error: "", smart: false });
  });

  app.get("/api/dialog/file", (req, res) => {
    res.json({ path: "/mock/config.xlsx", error: "" });
  });

  app.get("/api/default_paths", (req, res) => {
    res.json({ configPath: "/mock/config.xlsx", dataPath: "/mock/data" });
  });

  app.get("/api/open/config", (req, res) => {
    res.json({ success: false, msg: "配置不存在", exists: false });
  });

  app.get("/api/open/explorer", (req, res) => {
    res.json({ success: true, error: "" });
  });

  app.get("/api/files", (req, res) => {
    res.json({
      files: [
        { name: "模拟文件1.xlsx", path: "/mock/downloads/data/模拟文件1.xlsx", is_dir: false, size: 10240 },
        { name: "模拟文件夹", path: "/mock/downloads/data/模拟文件夹", is_dir: true, size: 0 }
      ]
    });
  });

  app.post("/api/run", (req, res) => {
    const { action, city, cycle, sourcePath, theme } = req.body;
    
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let step = 0;
    const steps = [
      { type: 'log', msg: `[INFO] 开启【${theme?.name || 'Aegis'}】处理引擎... (Node驱动)`, level: 'INFO' },
      { type: 'log', msg: `[SYSTEM] 正在模拟处理目标数据源: ${sourcePath || '未知路径'}`, level: 'SYSTEM' },
      { type: 'log', msg: `[INFO] ${action === 'salary_bind' ? '执行发薪工具绑定...' : '计算核算逻辑与报表...'}`, level: 'INFO' },
      { type: 'log', msg: `[WARN] 发现些许异常记录，已开启自动拦截规则`, level: 'WARN' },
      { type: 'log', msg: `[SUCCESS] 模拟任务完成！【${city || '通配'}-${cycle || '默认'}】`, level: 'SUCCESS' },
    ];

    const interval = setInterval(() => {
      if (step < steps.length) {
        sendEvent(steps[step]);
        sendEvent({ type: 'progress', value: (step + 1) / steps.length });
        step++;
      } else {
        sendEvent({ type: 'finish', status: "success", msg: "完成" });
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
