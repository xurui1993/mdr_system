import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "fs";
import multer from "multer";
import AdmZip from "adm-zip";

import cors from "cors";

import { Server as SocketIOServer } from "socket.io";

function getUploadSequence(wid: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const baseDir = path.join(process.cwd(), "data", wid);
  let maxSeq = 0;

  if (fs.existsSync(baseDir)) {
    try {
      const dirs = fs.readdirSync(baseDir);
      for (const dir of dirs) {
        if (dir.startsWith(`upload_${dateStr}`)) {
          const seqStr = dir.slice(`upload_${dateStr}`.length);
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(5, "0");
  return `${dateStr}${seqStr}`;
}

async function startServer() {
  const app = express();
  app.use(cors());
  const PORT = 3000;

  // Only spawn python backend in production or if not already running
  // We'll spawn it regardless for simplicity here, assuming it handles port 8000
  console.log("Starting Python backend...");

  const isWin = process.platform === "win32";
  const pythonCmd = isWin ? "python" : "python3";

  const startBackend = () => {
    try {
      execSync("npx -y kill-port 8009", { stdio: "ignore" });
    } catch (e) {}
    
    const pythonProcess = spawn(
      pythonCmd,
      ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8009"],
      {
        cwd: path.join(process.cwd(), "backend"),
        stdio: "inherit",
        shell: isWin,
      },
    );

    pythonProcess.on("error", (err) => {
      console.error(`Failed to start python:`, err);
    });

    pythonProcess.on("close", (code) => {
      console.log(`Python backend exited with code ${code}`);
    });

    const cleanup = () => {
      try { pythonProcess.kill(); } catch (e) {}
    };
    process.on("exit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("SIGUSR1", cleanup);
    process.on("SIGUSR2", cleanup);
  };

  // Ensure pip and dependencies are installed before starting backend
  const { execSync } = await import("child_process");
  try {
    console.log("Checking for pip...");
    try {
      execSync(`${pythonCmd} -m pip --version`);
    } catch (e) {
      console.log("pip not found, installing via get-pip.py...");
      execSync(`${pythonCmd} -c "import urllib.request; urllib.request.urlretrieve('https://bootstrap.pypa.io/get-pip.py', 'get-pip.py')"`);
      execSync(`${pythonCmd} get-pip.py --break-system-packages`);
    }
    console.log("Installing python dependencies...");
    execSync(`${pythonCmd} -m pip install -r backend/requirements.txt --break-system-packages`);
    console.log("Python dependencies installed.");
  } catch (e) {
    console.error("Error setting up python env:", e);
  }
  startBackend();

  const getWorkspaceId = (req: express.Request) => {
    let wid = req.header("x-workspace-id");
    if (wid) {
      try { wid = decodeURIComponent(wid); } catch(e) {}
    } else {
      wid = req.query.workspace_id ? String(req.query.workspace_id) : "default";
    }
    return wid.toString()
      .replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5\.]/g, "");
  };

  const isCloudEnvironment = !!process.env.K_SERVICE || !!process.env.K_REVISION || !!process.env.DISABLE_HMR;

  app.get("/api/sys-info", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    res.json({ ip });
  });

  app.get("/api/default_paths", (req, res) => {
    let configPath = path.resolve("data/config.xlsx");
    let dataPath = path.resolve("../uploads");

    res.json({
      configPath: configPath,
      dataPath: dataPath,
    });
  });

  const getConfigFile = (wid: string) => `.aegis_config_${wid}.json`;

  app.get("/api/config", (req, res) => {
    try {
      const wid = getWorkspaceId(req);
      const configFile = getConfigFile(wid);
      if (fs.existsSync(configFile)) {
        const data = fs.readFileSync(configFile, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json({});
      }
    } catch (e) {
      res.json({});
    }
  });

  app.post("/api/config", express.json(), (req, res) => {
    try {
      const wid = getWorkspaceId(req);
      const configFile = getConfigFile(wid);
      fs.writeFileSync(configFile, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false, error: String(e) });
    }
  });

  app.post("/api/config_excel_data", express.json(), async (req, res) => {
    try {
      let { configPath } = req.body;
      
      if (configPath && !fs.existsSync(configPath) && configPath.endsWith("config.xlsx")) {
        const dir = path.dirname(configPath);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const xlsxFile = files.find(f => f.endsWith(".xlsx") || f.endsWith(".xls"));
          if (xlsxFile) {
            configPath = path.join(dir, xlsxFile);
          }
        }
      }

      if (!configPath || !fs.existsSync(configPath)) {
        if (fs.existsSync(path.resolve("config.xlsx"))) {
          configPath = path.resolve("config.xlsx");
        } else if (fs.existsSync(path.resolve("data/config.xlsx"))) {
          configPath = path.resolve("data/config.xlsx");
        } else {
          return res.json({ success: false, error: "Config file not found", path: configPath });
        }
      }

      const xlsx = await import("xlsx");
      const readFile = xlsx.readFile || xlsx.default.readFile;
      const workbook = readFile(configPath);
      let sheetName = "config";
      
      if (!workbook.SheetNames.includes(sheetName)) {
        sheetName = workbook.SheetNames[0]; // fallback to first sheet if "config" not found
      }

      const sheet = workbook.Sheets[sheetName];
      const utils = xlsx.utils || xlsx.default.utils;
      const data: any[][] = utils.sheet_to_json(sheet, { header: 1 });
      
      if (!data || data.length === 0) {
        console.log("Config excel is empty");
        return res.json({ success: false, error: "empty sheet", data: null });
      }

      const headerRow = data[0];
      console.log("Config headers:", headerRow);
      const cityIdx = headerRow.findIndex((col: any) => col === "城市" || String(col).includes("城"));
      const teamIdx = headerRow.findIndex((col: any) => col === "团队名称" || col === "团队" || String(col).includes("站"));

      if (cityIdx === -1 || teamIdx === -1) {
        console.log("Missing columns, cityIdx:", cityIdx, "teamIdx:", teamIdx);
        return res.json({ success: false, error: "Missing columns 城市 or 团队名称", data: null });
      }

      const cities: Record<string, any> = {};
      let totalRiders = 0;
      let totalTeams = 0;
      let lastCity = "";

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        let city = row[cityIdx];
        if (city) {
          lastCity = String(city).trim();
        }
        
        if (lastCity) {
          const cityStr = lastCity;
          const team = row[teamIdx];
          let teamStr = team ? String(team).trim().replace(/_?新专送/g, '') : "";

          if (!cities[cityStr]) {
            cities[cityStr] = {
              total_riders: 0,
              total_orders: 0,
              fengshen_bind_rate: "0.0%",
              shangyi_bind_rate: "0.0%",
              black_count: 0,
              stations: []
            };
          }
          // Prevent duplicates if needed, but for now just add
          if (teamStr && !cities[cityStr].stations.find((s: any) => s.station_name === teamStr)) {
             cities[cityStr].stations.push({
               station_name: teamStr,
               total_riders: 0,
               total_orders: 0,
               fengshen_bind_rate: "0.0%",
               shangyi_bind_rate: "0.0%",
               black_count: 0
             });
             totalTeams++;
          }
        }
      }

      const statsData = {
        overall: {
          total_riders: 0,
          total_orders: 0,
          fengshen_bind_rate: "0.0%",
          shangyi_bind_rate: "0.0%",
          black_count: 0,
          fengshen_bind_count: 0,
          shangyi_bind_count: 0
        },
        cities: cities
      };

      res.json({ success: true, data: statsData });

    } catch (e) {
      res.json({ success: false, error: String(e) });
    }
  });

  app.get("/api/field_mapping", (req, res) => {
    try {
      const wid = getWorkspaceId(req);
      const mappingFile = `.aegis_mapping_${wid}.json`;
      if (fs.existsSync(mappingFile)) {
        const data = fs.readFileSync(mappingFile, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json({});
      }
    } catch (e) {
      res.json({});
    }
  });

  app.post("/api/field_mapping", express.json(), (req, res) => {
    try {
      const wid = getWorkspaceId(req);
      const mappingFile = `.aegis_mapping_${wid}.json`;
      fs.writeFileSync(mappingFile, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false, error: String(e) });
    }
  });

  // Proxy /api to the Python backend
  // EXCEPT for upload endpoints defined above
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const wid = getWorkspaceId(req);
      const dir = path.join(process.cwd(), "..", "uploads", wid);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // Retain original filename, fix potential multer string encoding issue
      let decodedName = file.originalname;
      try {
        decodedName = Buffer.from(file.originalname, "latin1").toString("utf8");
      } catch (e) {}

      // Ensure unique but readable name if you want, or just overwrite the original
      cb(null, decodedName);
    },
  });
  const upload = multer({ storage });

  app.get("/api/download", (req, res) => {
    try {
      const qPath = req.query.path as string;
      if (!qPath) return res.status(400).send("Path is required");
      const absolutePath = path.resolve(qPath);

      const wid = getWorkspaceId(req);
      const isRootConfig = absolutePath === path.resolve("data/config.xlsx");

      if (!fs.existsSync(absolutePath)) {
        return res.status(404).send("File not found");
      }

      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        const zip = new AdmZip();
        zip.addLocalFolder(absolutePath);
        const zipBuffer = zip.toBuffer();
        const folderName = path.basename(absolutePath);
        res.set("Content-Type", "application/zip");
        res.set(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(folderName)}.zip"`,
        );
        res.send(zipBuffer);
      } else {
        const fileName = path.basename(absolutePath);
        res.set(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(fileName)}"`,
        );
        res.sendFile(absolutePath);
      }
    } catch (e) {
      res.status(500).send(String(e));
    }
  });

  app.post("/api/save_config", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }
      const targetPath = req.body.targetPath;
      if (!targetPath) {
        return res
          .status(400)
          .json({ success: false, error: "targetPath is required" });
      }

      const wid = getWorkspaceId(req);
      const isRootConfig = targetPath === path.resolve("data/config.xlsx");
      if (
        !isRootConfig &&
        !targetPath.includes(`/${wid}/`) &&
        !targetPath.includes(`\\${wid}\\`)
      ) {
        return res
          .status(403)
          .json({
            success: false,
            error: "Forbidden. Path not in your workspace.",
          });
      }

      fs.copyFileSync(req.file.path, targetPath);
      res.json({ success: true, path: targetPath });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post("/api/upload/config", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }
      const absolutePath = path.resolve(req.file.path);
      res.json({ success: true, path: absolutePath });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post(
    "/api/upload/source_zip",
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res
            .status(400)
            .json({ success: false, error: "No file uploaded" });
        }
        const wid = getWorkspaceId(req);
        const zipPath = req.file.path;
        // Also save data in wid specific folder
        const targetDir = path.join(
          process.cwd(),
          "..",
          "uploads",
          wid,
          `upload_${getUploadSequence(wid)}`,
        );
        fs.mkdirSync(targetDir, { recursive: true });

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(targetDir, true);

        fs.unlinkSync(zipPath); // Cleanup zip

        const absolutePath = path.resolve(targetDir);
        res.json({ success: true, path: absolutePath, smart: true });
      } catch (e) {
        res.status(500).json({ success: false, error: String(e) });
      }
    },
  );

  app.post("/api/files", express.json(), (req, res) => {
    try {
      const qPath = req.body.path;
      if (!qPath) {
        return res.json({ files: [] });
      }
      
      // Auto-create predefined default external directories if they don't exist
      if ((qPath === '../outputs' || qPath === '../uploads') && !fs.existsSync(qPath)) {
        fs.mkdirSync(qPath, { recursive: true });
      }

      if (!fs.existsSync(qPath)) {
        return res.json({ files: [] });
      }
      const stat = fs.statSync(qPath);
      let targetPath = qPath;
      if (!stat.isDirectory()) {
         targetPath = path.dirname(qPath);
      }
      
      const items = fs.readdirSync(targetPath).filter(f => !f.startsWith(".") && !f.startsWith("~")).map(f => {
         const fPath = path.join(targetPath, f);
         let isDir = false;
         let size = 0;
         let mtime = 0;
         try {
            const fStat = fs.statSync(fPath);
            isDir = fStat.isDirectory();
            size = isDir ? 0 : fStat.size;
            mtime = fStat.mtime.getTime();
         } catch(e) {}
         return { name: f, path: fPath, is_dir: isDir, size, mtime };
      });
      items.sort((a,b) => {
         if (a.is_dir === b.is_dir) return b.mtime - a.mtime; // Sort by newest first
         return a.is_dir ? -1 : 1;
      });
      res.json({ files: items });
    } catch(e) {
      res.json({ files: [] });
    }
  });

  app.post("/api/action_file", express.json(), (req, res) => {
    try {
      const { action, path: targetPath } = req.body;
      if (!targetPath) return res.json({ success: false, error: 'No path' });
      
      if (action === 'delete') {
        if (fs.existsSync(targetPath)) {
          const stat = fs.statSync(targetPath);
          if (stat.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(targetPath);
          }
        }
        res.json({ success: true });
      } else if (action === 'create_dir') {
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
        res.json({ success: true });
      } else {
        res.json({ success: false, error: 'Unknown action' });
      }
    } catch(e) {
      res.json({ success: false, error: String(e) });
    }
  });

  app.post("/api/upload_file", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }
      const targetPath = req.body.targetPath;
      if (!targetPath) {
        return res.status(400).json({ success: false, error: "targetPath is required" });
      }
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(req.file.path, targetPath);
      res.json({ success: true, path: targetPath });
    } catch(err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get("/api/system/stats", async (req, res) => {
    const os = await import("os");
    const cpus = os.cpus();
    let totalUser = 0;
    let totalSys = 0;
    let totalIdle = 0;
    if (cpus && cpus.length > 0) {
      for (let cpu of cpus) {
        totalUser += cpu.times.user;
        totalSys += cpu.times.sys;
        totalIdle += cpu.times.idle;
      }
    }
    const totalTime = totalUser + totalSys + totalIdle;
    const sysCpu = totalTime > 0 ? ((totalUser + totalSys) / totalTime) * 100 : 0;
    const sysMemRatio = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
    const procMem = process.memoryUsage().rss / (1024 * 1024);
    
    res.json({
      success: true,
      sysCpu: sysCpu,
      sysMemRatio: sysMemRatio,
      procCpu: 0,
      procMem: procMem
    });
  });

  // Mock endpoints for local python features that don't work in web
  app.post("/api/dialog/folder", (req, res) => {
    res.status(400).json({ success: false, error: "Not supported in web mode", path: "" });
  });

  app.post("/api/dialog/file", (req, res) => {
    res.status(400).json({ success: false, error: "Not supported in web mode", path: "" });
  });

  app.post("/api/dialog/smart_source", (req, res) => {
    res.status(400).json({ success: false, error: "Not supported in web mode", path: "" });
  });

  app.post("/api/open/config", (req, res) => {
    res.status(400).json({ success: false, error: "Not supported in web mode" });
  });

  app.post("/api/open/explorer", (req, res) => {
    res.status(400).json({ success: false, error: "Not supported in web mode" });
  });

  const proxyOptions: any = {
    pathFilter: "/api",
    target: "http://127.0.0.1:8009",
    changeOrigin: true,
    ws: true,
    onError: (err: any, req: any, res: any) => {
      // Suppress proxy errors during startup
      if (res && typeof res.status === "function") {
        res
          .status(502)
          .json({
            success: false,
            error: "Backend starting up or unavailable.",
          });
      }
    },
  };

  app.use(createProxyMiddleware(proxyOptions));

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

  // Automated Cleanup Task for Tenant Data (saves disk space)
  const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // Run every 6 hours
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // Data older than 24 hours gets deleted

  const cleanupOldTenantData = () => {
    console.log(
      "\n[Cleanup Task] 🧹 Running tenant historical cache cleanup...",
    );
    const now = Date.now();
    const dirsToClean = [
      path.join(process.cwd(), "data"),
      path.join(process.cwd(), "..", "uploads"),
    ];
    let deletedCount = 0;

    for (const baseDir of dirsToClean) {
      if (!fs.existsSync(baseDir)) continue;

      const tenants = fs.readdirSync(baseDir);
      for (const tenantDir of tenants) {
        // Exclude system/hidden files
        if (
          tenantDir.startsWith(".") ||
          !fs.statSync(path.join(baseDir, tenantDir)).isDirectory()
        ) {
          continue;
        }

        // Tenant IDs usually start with 'u_', but we can genericize it to check modified time.
        const tenantPath = path.join(baseDir, tenantDir);
        try {
          // If the folder hasn't been modified in 24 hours, delete it to save space
          const stats = fs.statSync(tenantPath);
          if (now - stats.mtimeMs > MAX_AGE_MS) {
            fs.rmSync(tenantPath, { recursive: true, force: true });
            console.log(
              `[Cleanup Task] 🗑️ Deleted outdated tenant storage: ${tenantPath}`,
            );
            deletedCount++;
          }
        } catch (e) {
          console.error(`[Cleanup Task] ❌ Failed to delete ${tenantPath}:`, e);
        }
      }
    }
    console.log(
      `[Cleanup Task] ✅ Cleanup complete. Cleared ${deletedCount} expired tenant caches.\n`,
    );
  };

  // Run cleanup initially (after startup) and periodically
  setTimeout(cleanupOldTenantData, 10000);
  setInterval(cleanupOldTenantData, CLEANUP_INTERVAL_MS);

  const server = app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server is running! You can access it on:`);
    console.log(`  http://localhost:${PORT}`);

    // Print all local IP addresses
    let os;
    try {
      os = await import("os");
    } catch (e) {}
    if (os) {
      const interfaces = os.networkInterfaces();
      for (const devName in interfaces) {
        const iface = interfaces[devName];
        if (iface) {
          for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (
              alias.family === "IPv4" &&
              alias.address !== "127.0.0.1" &&
              !alias.internal
            ) {
              console.log(
                `  http://${alias.address}:${PORT} (For colleagues on the same network)`,
              );
            }
          }
        }
      }
    }
  });

  const io = new SocketIOServer(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("join", async (data) => {
      const { workspaceId, username } = data;

      // ID limit constraint Check
      let safeUsername = (username || "无名小妖").substring(0, 15);

      socket.join(workspaceId);
      socket.data.workspaceId = workspaceId;
      socket.data.username = safeUsername;

      let ip =
        socket.handshake.headers["x-forwarded-for"] ||
        socket.handshake.address ||
        "未知 IP";
      if (Array.isArray(ip)) ip = ip[0];
      if (typeof ip === "string") ip = ip.split(",")[0].trim();
      // basic anonymize for safety/style if desired, or keep raw.
      socket.data.ip = ip;

      const sendPresence = async () => {
        const sockets = await io.in(workspaceId).fetchSockets();
        const existingSockets = sockets.filter(
          (s) => s.data.username === safeUsername && s.id !== socket.id,
        );

        if (existingSockets.length === 0) {
          io.to(workspaceId).emit("user_online", { username: safeUsername });
        }

        const userMap = new Map();
        sockets.forEach((s) => {
          if (s.data.username && !userMap.has(s.data.username)) {
            userMap.set(s.data.username, {
              username: s.data.username,
              ip: s.data.ip,
              socketId: s.id,
              status: "online",
            });
          }
        });
        io.to(workspaceId).emit("presence", Array.from(userMap.values()));
      };
      sendPresence();
    });

    socket.on("message", async (data) => {
      const { workspaceId, username, text, imageUrl } = data;

      let safeUsername = (username || "无名小妖").substring(0, 15);
      let ip =
        socket.handshake.headers["x-forwarded-for"] ||
        socket.handshake.address ||
        "未知 IP";
      if (Array.isArray(ip)) ip = ip[0];
      if (typeof ip === "string") ip = ip.split(",")[0].trim();

      io.to(workspaceId).emit("message", {
        id: Date.now().toString(),
        username: safeUsername,
        text: text ? text.substring(0, 1000) : "",
        imageUrl: imageUrl || null,
        ip: ip,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("private_message", (data) => {
      const { toId, text, imageUrl } = data;
      const username = socket.data.username;

      let safeUsername = (username || "无名小妖").substring(0, 15);
      let ip =
        socket.handshake.headers["x-forwarded-for"] ||
        socket.handshake.address ||
        "未知 IP";
      if (Array.isArray(ip)) ip = ip[0];
      if (typeof ip === "string") ip = ip.split(",")[0].trim();

      // Send to the recipient
      if (toId) {
        io.to(toId).emit("private_message", {
          id: Date.now().toString(),
          username: safeUsername,
          text: text ? text.substring(0, 1000) : "",
          imageUrl: imageUrl || null,
          ip: ip,
          fromId: socket.id,
          timestamp: new Date().toISOString(),
        });
        // Also send back to sender so they see it in their UI
        socket.emit("private_message", {
          id: Date.now().toString(),
          username: safeUsername,
          text: text ? text.substring(0, 1000) : "",
          imageUrl: imageUrl || null,
          ip: ip,
          fromId: socket.id,
          timestamp: new Date().toISOString(),
          isSelf: true,
          toId: toId,
        });
      }
    });

    socket.on("read_receipt", (data) => {
      const { messageId, senderId } = data;
      if (senderId) {
        io.to(senderId).emit("message_read", {
          messageId,
          readerId: socket.id,
        });
      }
    });

    socket.on("typing", (data) => {
      const { workspaceId, isTyping, toId } = data;
      const username = socket.data.username || "无名小妖";
      const safeUsername = username.substring(0, 15);

      if (toId) {
        io.to(toId).emit("typing", { username: safeUsername, isTyping });
      } else {
        socket
          .to(workspaceId)
          .emit("typing", { username: safeUsername, isTyping });
      }
    });

    socket.on("disconnect", async () => {
      const workspaceId = socket.data.workspaceId;
      const username = socket.data.username;

      if (workspaceId) {
        try {
          const sockets = await io.in(workspaceId).fetchSockets();
          const remaining = sockets.filter((s) => s.data.username === username);

          if (username && remaining.length === 0) {
            io.to(workspaceId).emit("user_offline", { username });
          }

          const userMap = new Map();
          sockets.forEach((s) => {
            if (s.data.username && !userMap.has(s.data.username)) {
              userMap.set(s.data.username, {
                username: s.data.username,
                ip: s.data.ip,
                socketId: s.id,
                status: "online",
              });
            }
          });
          io.to(workspaceId).emit("presence", Array.from(userMap.values()));
        } catch (e) {}
      }
    });
  });
}

startServer();
