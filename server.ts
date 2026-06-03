import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Only spawn python backend in production or if not already running
  // We'll spawn it regardless for simplicity here, assuming it handles port 8000
  console.log("Starting Python backend...");
  
  const isWin = process.platform === "win32";
  
  const setupCmd = `
    python3 -m ensurepip --upgrade || true
    python3 -m pip install -r requirements.txt --break-system-packages || true
    python3 -c "import urllib.request; urllib.request.urlretrieve('https://bootstrap.pypa.io/get-pip.py', 'get-pip.py')"
    python3 get-pip.py --break-system-packages || true
    python3 -m pip install -r requirements.txt --break-system-packages || true
  `;
  
  const pipProcess = spawn(setupCmd, [], {
    cwd: path.join(process.cwd(), "backend"),
    stdio: "inherit",
    shell: true
  });

  pipProcess.on("error", (err) => {
    console.error("Pip spawn error:", err);
  });

  pipProcess.on("close", (code) => {
    console.log(`Pip setup exited with code ${code}`);
    const pythonProcess = spawn("python3 -m uvicorn main:app --port 8000 || python -m uvicorn main:app --port 8000 || true", [], {
      cwd: path.join(process.cwd(), "backend"),
      stdio: "inherit",
      shell: true
    });

    pythonProcess.on("error", (err) => {
      console.error("Python spawn error:", err);
    });

    pythonProcess.on("close", (code) => {
      console.log(`Python backend exited with code ${code}`);
    });
  });

  // Proxy /api to the Python backend
  app.use(createProxyMiddleware({
    pathFilter: "/api",
    target: "http://127.0.0.1:8000",
    changeOrigin: true,
    ws: true
  }));

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
