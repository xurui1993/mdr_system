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
  
  const pipProcess = spawn("pip3", ["install", "-r", "requirements.txt", "--break-system-packages"], {
    cwd: path.join(process.cwd(), "backend"),
    stdio: "inherit"
  });

  pipProcess.on("close", (code) => {
    console.log(`pip3 install exited with code ${code}`);
    const pythonProcess = spawn("python3", ["-m", "uvicorn", "main:app", "--port", "8000"], {
      cwd: path.join(process.cwd(), "backend"),
      stdio: "inherit"
    });

    pythonProcess.on("close", (code) => {
      console.log(`Python backend exited with code ${code}`);
    });
  });

  // Proxy /api to the Python backend
  app.use("/api", createProxyMiddleware({
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
