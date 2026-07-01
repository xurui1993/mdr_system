import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import JSZip from "jszip";
import { THEMES } from "./constants";
import { LogEntry, AppConfig, TaskHistoryRecord, UserProfile } from "./types";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ControlPanel } from "./components/ControlPanel";
import { ActionPanel } from "./components/ActionPanel";
import { IssueOrderDashboard } from "./components/IssueOrderDashboard";
import { TerminalPanel } from "./components/TerminalPanel";
import { TaskTimer } from "./components/TaskTimer";
import { RightPanel } from "./components/RightPanel";
import { FolderOpen, Filter, AlertCircle, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SalaryBindDashboard, SalaryBindStatsData } from "./components/SalaryBindDashboard";
import { DashboardPanel } from "./components/DashboardPanel";
import { DeductionConfigPanel } from "./components/DeductionConfig";
import { FormulaConfigPanel } from "./components/FormulaConfigPanel";
import { TaskMonitor } from "./components/TaskMonitor";
import { ChatPanel } from "./components/ChatPanel";
import * as XLSX from "xlsx";
import { getWorkspaceId } from "./utils";
import confetti from "canvas-confetti";

function GenericToolPanel({
  theme,
  actionId,
  isRunning,
  onRun,
  title,
  description,
  icon,
}: any) {
  return (
    <div className="bg-[#020410] light:bg-white border border-sky-500/10 light:border-slate-200 light:shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-2xl flex flex-col p-8 h-full w-full justify-between relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-500/50 to-transparent light:via-sky-400 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

      <div className="flex flex-col gap-4 relative z-10">
        <h2 className="font-display text-[22px] font-bold light:text-slate-800 text-slate-100 tracking-wider flex items-center mb-1 animate-breathe">
          <span className="text-[26px] mr-3 light:text-slate-800 text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)] light:drop-shadow-none">
            {icon}
          </span>
          {title}
        </h2>
        <p className="text-[13px] light:text-slate-500 text-slate-400 leading-relaxed font-medium mt-2">
          {description}
        </p>
      </div>

      <div className="flex justify-start mt-8 relative z-10 w-full">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRun}
          disabled={isRunning}
          className={`relative px-8 py-3.5 rounded-xl font-bold tracking-[0.1em] w-full transition-all duration-300 overflow-hidden group/btn text-[14px] uppercase ${
            isRunning
              ? "bg-sky-500/20 text-sky-500 border border-sky-500/50 light:bg-slate-100 light:text-slate-400 light:border-slate-200 cursor-wait"
              : "bg-sky-500/10 text-sky-500 border border-sky-500/50 hover:bg-sky-500 hover:text-black hover:border-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.6)] light:bg-sky-50 light:text-sky-700 light:border-sky-200 light:hover:bg-sky-500 light:hover:text-white light:hover:border-sky-600 light:hover:shadow-[0_4px_15px_rgba(14,165,233,0.3)] cursor-pointer"
          }`}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-sky-500/30 border-t-sky-500 light:border-slate-300 light:border-t-slate-500 rounded-full animate-spin"></div>
              执行指令中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              点火执行 {title}
            </span>
          )}
        </motion.button>
      </div>

      {/* Decorative background element */}
      <div className="absolute -bottom-16 -right-10 text-[160px] text-sky-500/5 rotate-[-15deg] pointer-events-none select-none blur-[2px] light:opacity-50">
        {icon}
      </div>
    </div>
  );
}

const getLocalToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getLocalMonthStart = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const showDesktopNotification = (title: string, body: string) => {
  if (!("Notification" in window)) {
    return;
  }
  
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
};

import { IdentitySetupModal } from "./components/IdentitySetupModal";

import { ProfileEditModal } from "./components/ProfileEditModal";

export default function App() {
  const theme = THEMES[0];

  const [appTheme, setAppTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('app_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    document.title = "薪酬核算中心";
    if (appTheme === 'light') {
       document.documentElement.setAttribute('data-theme', 'light');
       document.documentElement.classList.remove('dark');
    } else {
       document.documentElement.removeAttribute('data-theme');
       document.documentElement.classList.add('dark');
    }
    localStorage.setItem('app_theme', appTheme);
  }, [appTheme]);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const defaultAvatars = ["🐏", "🐂", "👯", "🦀", "🦁", "🧚", "⚖️", "🦂", "🏹", "🐐", "🏺", "🐟"];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
    let savedAvatar = localStorage.getItem("app_identity_avatar");
    if (!savedAvatar || savedAvatar === "👨‍🚀") {
      savedAvatar = randomAvatar;
      localStorage.setItem("app_identity_avatar", savedAvatar);
    }
    return {
      name: localStorage.getItem("app_identity_user") || "",
      department: localStorage.getItem("app_identity_department") || "",
      avatar: savedAvatar,
      status: localStorage.getItem("app_identity_status") || "在线",
    };
  });
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const handleSaveProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem("app_identity_user", newProfile.name);
    localStorage.setItem("app_identity_department", newProfile.department);
    localStorage.setItem("app_identity_avatar", newProfile.avatar);
    if (newProfile.status) {
      localStorage.setItem("app_identity_status", newProfile.status);
    }
    
    // Also sync chat avatar logic if needed
    localStorage.setItem("chat_username", newProfile.name);

    setShowProfileEdit(false);
  };

  useEffect(() => {
    const handleStatusUpdate = (e: any) => {
      const newStatus = e.detail;
      setUserProfile((prev: any) => {
        const newProfile = { ...prev, status: newStatus };
        localStorage.setItem("app_identity_status", newStatus);
        return newProfile;
      });
    };
    window.addEventListener("app:updateStatus", handleStatusUpdate);
    return () => window.removeEventListener("app:updateStatus", handleStatusUpdate);
  }, []);

  const [showIdentitySetup, setShowIdentitySetup] = useState(() => {
    return !localStorage.getItem("app_identity_user") || !localStorage.getItem("app_identity_department");
  });

  const [workspaceId, setWorkspaceId] = useState(() => {
    let wid = localStorage.getItem("app_workspace_id");
    if (!wid) {
      wid =
        "u_" +
        Math.random().toString(36).substring(2, 9) +
        Date.now().toString(36);
      localStorage.setItem("app_workspace_id", wid);
    }
    return wid;
  });

  const handleIdentityComplete = async (userName: string, department: string) => {
    try {
      setUserProfile((prev) => ({ ...prev, name: userName, department }));
      const newWid = userName;
      setWorkspaceId(newWid);
      localStorage.setItem("app_workspace_id", newWid);
      setShowIdentitySetup(false);
      window.location.reload(); // Reload to ensure all backend directories are created under new wid
    } catch(e) {
       const newWid = userName;
       setUserProfile((prev) => ({ ...prev, name: userName, department }));
       setWorkspaceId(newWid);
       localStorage.setItem("app_workspace_id", newWid);
       setShowIdentitySetup(false);
       window.location.reload();
    }
  };


  const fetchWithAuth = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set("x-workspace-id", encodeURIComponent(workspaceId));
    return fetch(url, { ...options, headers });
  };

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const activeMenuRef = useRef(activeMenu);
  useEffect(() => {
    activeMenuRef.current = activeMenu;
  }, [activeMenu]);

  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [lastOutputFolder, setLastOutputFolder] = useState<string | null>(() => {
    return localStorage.getItem("lastOutputFolder") || null;
  });
  const [lastSalaryBindOutput, setLastSalaryBindOutput] = useState<string | null>(() => {
    return localStorage.getItem("lastSalaryBindOutput") || null;
  });

  useEffect(() => {
    const socket = io(window.location.origin, {
       reconnectionAttempts: 10,
       reconnectionDelay: 5000,
       reconnectionDelayMax: 10000,
    });
    const MONSTER_NAMES = [
      "小猪妖",
      "乌鸦怪",
      "蛤蟆精",
      "猩猩怪",
      "黄鼠狼",
      "熊教头",
      "狼大人",
      "牛妖",
      "狐狸精",
      "蝙蝠怪",
    ];
    const defaultName =
      MONSTER_NAMES[Math.floor(Math.random() * MONSTER_NAMES.length)] +
      Math.floor(Math.random() * 1000);
    const username = localStorage.getItem("chat_username") || defaultName;

    socket.on("connect", () => {
      socket.emit("join", { workspaceId: "langlang_global", username });
    });

    socket.on("message", (msg: any) => {
      if (activeMenuRef.current !== "chat") {
        setHasUnreadChat(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [workspaceId]);

  useEffect(() => {
    if (activeMenu === "chat") {
      setHasUnreadChat(false);
    }
  }, [activeMenu]);
  const isRunning = runningTask !== null;
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [progressTextMap, setProgressTextMap] = useState<Record<string, string>>({});

  const progress = progressMap[activeMenu] || 0;
  const progressText = progressTextMap[activeMenu] || "小时候以为自己会是齐天大圣，长大后发现自己只是一只连唐僧什么样都看不见的小猪妖。";

  const setProgress = (val: number, target: string = "core") => {
    setProgressMap(prev => ({ ...prev, [target]: val }));
  };

  const _setProgressText = (text: string, target: string = "core") => {
    setProgressTextMap(prev => ({ ...prev, [target]: text }));
  };
  
  const [activePrompt, setActivePrompt] = useState<{ uuid: string; title: string; message: string } | null>(null);

  const [logsMap, setLogsMap] = useState<Record<string, LogEntry[]>>({});

  const logs = logsMap[activeMenu] || [{ text: theme.log_init, level: "INFO" }];

  const setLogs = (updater: any, target: string = activeMenu) => {
    // Determine the target menu. If this is called from within an async task,
    // we should ideally use the action name but for simplicity we can use activeMenu.
    // To make it robust, we'll keep activeMenu.
    setLogsMap(prev => {
        const prevLogs = prev[target] || [{ text: theme.log_init, level: "INFO" }];
        const newLogs = typeof updater === "function" ? updater(prevLogs) : updater;
        return { ...prev, [target]: newLogs };
    });
  };

  const [activeTab, setActiveTab] = useState<"task" | "output">("output");
  const [taskHistory, setTaskHistory] = useState<TaskHistoryRecord[]>(() => {
    const saved = localStorage.getItem("taskHistory");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("taskHistory", JSON.stringify(taskHistory));
  }, [taskHistory]);

  const [taskStatsMap, setTaskStatsMap] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem("taskStatsMap");
    return saved ? JSON.parse(saved) : {};
  });

  const [salaryBindStats, setSalaryBindStats] = useState<SalaryBindStatsData | null>(() => {
    const saved = localStorage.getItem("salaryBindStats");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem("taskStatsMap", JSON.stringify(taskStatsMap));
  }, [taskStatsMap]);

  useEffect(() => {
    if (salaryBindStats) {
      localStorage.setItem("salaryBindStats", JSON.stringify(salaryBindStats));
    }
  }, [salaryBindStats]);

  const seenProgressTexts = useRef<Set<string>>(new Set());
  const seenLogs = useRef<Set<string>>(new Set());

  const isMuttering = (text: string) => {
    return (
      text.includes("...")
    );
  };

  const setProgressText = (text: string, target: string = "core") => {
    if (isMuttering(text)) {
      if (seenProgressTexts.current.has(text)) return;
      seenProgressTexts.current.add(text);
    }
    // Also add to logs since the frontend can sometimes duplicate
    _setProgressText(text, target);
  };

  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    const defaultState: AppConfig = {
      city: "",
      issueCycle: "今天",
      sourcePath: "./uploads",
      salaryBindSourcePath: "./uploads",
      basePath: "",
      cities: [],
      issueCycles: ["今天", "本周", "上半月", "下半月", "当月"],
      issueSelectedCities: [],
      startDate: getLocalMonthStart(),
      endDate: getLocalToday(),
      enableInterceptor: false,
      enableCrossStationMerge: false,
    };
    const saved = localStorage.getItem("appConfig");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        delete parsed.cycle;
        delete parsed.cycles;
        return { ...defaultState, ...parsed };
      } catch (e) {
        console.error("Failed to parse appConfig from localStorage", e);
      }
    }
    return defaultState;
  });

  useEffect(() => {
    // Load cities from backend which reads config.xlsx
    const configPath = appConfig.sourcePath && appConfig.sourcePath !== "./data" && appConfig.sourcePath !== "./uploads" ? appConfig.sourcePath + "/config.xlsx" : undefined;
    
    fetchWithAuth("/api/config_excel_data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configPath })
    })
    .then(res => {
      const ct = res.headers.get("content-type");
      if (!res.ok || !ct || !ct.includes("application/json")) throw new Error("Invalid JSON response");
      return res.json();
    })
    .then(data => {
      if (data.success && data.data && data.data.cities) {
        const newCities = Object.keys(data.data.cities);
        if (newCities.length > 0) {
          setAppConfig(prev => {
            if (JSON.stringify(prev.cities) !== JSON.stringify(newCities)) {
              return { ...prev, cities: newCities };
            }
            return prev;
          });
        }
      }
    })
    .catch(err => {
      console.error("Failed to load cities from config.xlsx API", err);
    });
  }, [appConfig.sourcePath]);

  useEffect(() => {
    // Legacy endpoint call removed because backend doesn't support /api/config_excel_data
  }, [activeMenu, appConfig.salaryBindSourcePath, appConfig.basePath]);

  const isLoadedRef = React.useRef(false);

  useEffect(() => {
    const fetchWithRetry = async (url: string, retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetchWithAuth(url);
          const ct = res.headers.get("content-type");
          if (res.ok && ct && ct.includes("application/json")) return res;
        } catch (e) {
          // ignore loop catch
        }
        if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
      }
      throw new Error("Network response was not ok or not JSON");
    };

    fetchWithRetry("/api/default_paths", 10, 2000)
      .then((res) => res.json())
      .then((defaultData) => {
        fetchWithRetry("/api/config", 2, 1000)
          .then((res) => res.json())
          .then((data) => {
            if (data && Object.keys(data).length > 0 && !data.error) {
              setAppConfig((prev) => {
                let newConfig = { ...prev, ...data };
                if (prev.cities && prev.cities.length > 0) {
                  newConfig.cities = prev.cities;
                }
                if (
                  !newConfig.sourcePath ||
                  newConfig.sourcePath === "./data" ||
                  newConfig.sourcePath === "/mock/data" ||
                  /dist[\\/]data$/i.test(newConfig.sourcePath) ||
                  /[\\/]applet[\\/]data[\\/]/i.test(newConfig.sourcePath) ||
                  /[\\/]三亚$/i.test(newConfig.sourcePath)
                ) {
                  newConfig.sourcePath = defaultData.dataPath;
                }
                if (
                  !newConfig.salaryBindSourcePath ||
                  newConfig.salaryBindSourcePath === "./data" ||
                  newConfig.salaryBindSourcePath === "/mock/data" ||
                  /dist[\\/]data$/i.test(newConfig.salaryBindSourcePath) ||
                  /[\\/]applet[\\/]data[\\/]/i.test(newConfig.salaryBindSourcePath) ||
                  /[\\/]三亚$/i.test(newConfig.salaryBindSourcePath)
                ) {
                  newConfig.salaryBindSourcePath = defaultData.dataPath;
                }
                return newConfig;
              });
            } else {
              setAppConfig((prev) => {
                let newConfig = { ...prev };
                if (
                  !newConfig.sourcePath ||
                  newConfig.sourcePath === "./data" ||
                  newConfig.sourcePath === "/mock/data" ||
                  /dist[\\/]data$/i.test(newConfig.sourcePath) ||
                  /[\\/]applet[\\/]data[\\/]/i.test(newConfig.sourcePath) ||
                  /[\\/]三亚$/i.test(newConfig.sourcePath)
                ) {
                  newConfig.sourcePath = defaultData.dataPath;
                }
                if (
                  !newConfig.salaryBindSourcePath ||
                  newConfig.salaryBindSourcePath === "./data" ||
                  newConfig.salaryBindSourcePath === "/mock/data" ||
                  /dist[\\/]data$/i.test(newConfig.salaryBindSourcePath) ||
                  /[\\/]applet[\\/]data[\\/]/i.test(newConfig.salaryBindSourcePath) ||
                  /[\\/]三亚$/i.test(newConfig.salaryBindSourcePath)
                ) {
                  newConfig.salaryBindSourcePath = defaultData.dataPath;
                }
                return newConfig;
              });
            }
          })
          .catch((err) => {
            console.error("Failed to load config from backend", err);
          })
          .finally(() => {
            isLoadedRef.current = true;
          });
      })
      .catch((err) => {
        console.error("Failed to fetch default_paths", err);
        isLoadedRef.current = true;
      });
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem("appConfig", JSON.stringify(appConfig));
    fetchWithAuth("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appConfig),
    }).catch((err) => console.error("Failed to save config to backend", err));
  }, [appConfig]);

  const appendLog = (text: string, level: LogEntry["level"] = "INFO", target: string = activeMenu) => {
    if (isMuttering(text)) {
      if (seenLogs.current.has(text)) return;
      seenLogs.current.add(text);
    }
    setLogs((prev: any) => [...prev, { text, level }], target);
  };

  const [toastMsg, setToastMsg] = useState<{
    id: number;
    text: string;
    type: string;
  } | null>(null);
  const showToast = (text: string, type: string = "info") => {
    const id = Date.now();
    setToastMsg({ id, text, type });
    setTimeout(
      () => setToastMsg((prev) => (prev && prev.id === id ? null : prev)),
      3000,
    );
  };

  const uploadFileAndGetPath = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xlsx,.xls";
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const formData = new FormData();
          formData.append("file", file);
          setLogs((prev) => [
            ...prev,
            {
              text: `>>> ☁️ 正在上传文件... (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
              level: "INFO",
            },
          ]);
          const r = await fetchWithAuth("/api/upload/config", {
            method: "POST",
            body: formData,
          });
          const ct = r.headers.get("content-type");
          if (!r.ok && (!ct || !ct.includes("application/json"))) {
            if (r.status === 413) throw new Error("文件体积过大，超出上传限制 (413)");
            throw new Error(`服务器异常 (${r.status})`);
          }
          const d = await r.json();
          if (d.success && d.path) resolve(d.path);
          else resolve(null);
        } catch (err) {
          showToast("上传出错", "error");
          resolve(null);
        }
      };
      input.addEventListener("cancel", () => resolve(null));
      input.click();
    });
  };

  const uploadExtractedFilesAndGetPath = async (
    initialFileList: { file: File; relativePath: string }[]
  ): Promise<string | null> => {
    if (!initialFileList || initialFileList.length === 0) {
      return null;
    }

    // Filter out irrelevant files before zipping to optimize cloud upload
    const allowedExtensions = ['.xls', '.xlsx', '.csv', '.txt'];
    const fileList = initialFileList.filter(f => 
      allowedExtensions.some(ext => f.relativePath.toLowerCase().endsWith(ext)) && 
      !f.relativePath.split('/').pop()?.startsWith('~') && 
      !f.relativePath.includes('.DS_Store')
    );

    if (fileList.length === 0) {
      showToast("目录中未找到表格文件(Excel/CSV)", "warn");
      return null;
    }

    try {
      setLogs([
        {
          text: `>>> 📦 正在打包过滤后的有效表格文件并上传服务器... (共 ${fileList.length} 个文件)`,
          level: "INFO",
        },
      ]);
      const zip = new JSZip();
      for (let i = 0; i < fileList.length; i++) {
        zip.file(fileList[i].relativePath, fileList[i].file);
      }
      setLogs((prev) => [
        ...prev,
        { text: `>>> 📦 压缩中，请稍候...`, level: "INFO" },
      ]);
      const blob = await zip.generateAsync({ 
        type: "blob", 
        compression: "STORE" 
      });

      setLogs((prev) => [
        ...prev,
        {
          text: `>>> ☁️ 正在上传至云端数据槽... (${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
          level: "INFO",
        },
      ]);
      const formData = new FormData();
      formData.append("file", blob, "source.zip");

      const r = await fetchWithAuth("/api/upload/source_zip", {
        method: "POST",
        body: formData,
      });
      const ct = r.headers.get("content-type");
      if (!r.ok && (!ct || !ct.includes("application/json"))) {
        if (r.status === 413) throw new Error("文件体积过大，超出上传限制 (413)");
        throw new Error(`服务器异常 (${r.status})`);
      }
      const d = await r.json();

      if (d.success && d.path) {
        return d.path;
      } else {
        throw new Error(d.error || "上传失败");
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { text: `>>> ❌ 处理出错: ${err}`, level: "ERROR" },
      ]);
      showToast("处理出错", "error");
      return null;
    }
  };

  const uploadDirectoryAndGetPath = async (): Promise<string | null> => {
    return new Promise(async (resolve) => {
      const handleFiles = async (
        initialFileList: { file: File; relativePath: string }[],
      ) => {
        resolve(await uploadExtractedFilesAndGetPath(initialFileList));
      };

      const fallbackToInput = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        (input as any).directory = true;
        input.onchange = async (e: any) => {
          const files = e.target.files;
          if (!files || files.length === 0) {
            resolve(null);
            return;
          }
          const fileList = [];
          for (let i = 0; i < files.length; i++) {
            fileList.push({
              file: files[i],
              relativePath: files[i].webkitRelativePath || files[i].name,
            });
          }
          await handleFiles(fileList);
        };
        input.addEventListener("cancel", () => {
          resolve(null);
        });
        input.click();
      };

      if ("showDirectoryPicker" in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          const fileList: { file: File; relativePath: string }[] = [];
          
          async function processDirectory(handle: any, path: string) {
            for await (const entry of handle.values()) {
              if (entry.kind === 'file') {
                const file = await entry.getFile();
                fileList.push({ file, relativePath: path + entry.name });
              } else if (entry.kind === 'directory') {
                await processDirectory(entry, path + entry.name + '/');
              }
            }
          }
          
          await processDirectory(dirHandle, dirHandle.name + '/');
          if (fileList.length === 0) {
            resolve(null);
            return;
          }
          await handleFiles(fileList);
        } catch (err: any) {
          // If the user aborts, gracefully resolve to null
          if (err.name !== 'AbortError') {
             console.error("Directory picker error, falling back to input:", err);
             fallbackToInput();
             return; // Add return to avoid resolve(null) falling through if fallback handles it
          }
          resolve(null);
        }
      } else {
        fallbackToInput();
      }
    });
  };

  const uploadFilesAndExecute = async (initialFileList: { file: File; relativePath: string }[]) => {
    seenLogs.current.clear();

    const path = await uploadExtractedFilesAndGetPath(initialFileList);
    if (path) {
      setAppConfig((prev) => ({ ...prev, sourcePath: path }));
      setLogs((prev) => [
        ...prev,
        {
          text: `>>> ✅ 数据源路径已挂载: ${path}`,
          level: "SUCCESS",
        },
      ]);
      showToast("数据源已挂载，自动开始执行", "success");
      
      // Execute immediately using the new path
      handleRun({ sourcePath: path });
    }
  };

  const handleDownloadSalaryTable = async () => {
    if (!lastOutputFolder) {
      showToast("未检测到已生成的薪资表，请先执行计算！", "warn");
      return;
    }

    try {
      showToast("正在检索最新生成的薪资表...", "info");
      const resp = await fetchWithAuth("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: lastOutputFolder }),
      });
      const data = await resp.json();
      const files = data.files || [];

      // Find primary salary sheet ending with .xlsx and not being the special unbound/no-price lists
      const mainFile = files.find((f: any) => 
        !f.is_dir && 
        f.name.endsWith(".xlsx") && 
        !f.name.includes("无单价") && 
        !f.name.includes("未绑名单")
      ) || files.find((f: any) => !f.is_dir && f.name.endsWith(".xlsx"));

      const wid = getWorkspaceId();
      if (mainFile) {
        showToast(`正在下载薪资表: ${mainFile.name}`, "success");
        window.open(`/api/download?path=${encodeURIComponent(mainFile.path)}&workspace_id=${encodeURIComponent(wid)}`, "_blank");
      } else {
        showToast("未找到单独的 Excel 文件，正打包整个文件夹下载...", "info");
        window.open(`/api/download?path=${encodeURIComponent(lastOutputFolder)}&workspace_id=${encodeURIComponent(wid)}`, "_blank");
      }
    } catch (err) {
      const wid = getWorkspaceId();
      window.open(`/api/download?path=${encodeURIComponent(lastOutputFolder)}&workspace_id=${encodeURIComponent(wid)}`, "_blank");
    }
  };

  const handleDownloadSalaryBindTable = async (month?: string | null) => {
    let folderPath = lastSalaryBindOutput;
    
    if (!folderPath && month) {
      // If we don't have lastSalaryBindOutput but have a month, we construct the path
      // This assumes the backend saves it in uploads/upload_{month} or similar.
      // Wait, we can fetch the path from history stats if possible.
      // Actually, if we don't know the exact path on the server, we might need a dedicated API to download by month.
      // Or we can just use the config source path. Let's send the request with month parameter.
      const wid = getWorkspaceId();
      window.open(`/api/salary_bind/download?workspace_id=${encodeURIComponent(wid)}&month=${encodeURIComponent(month)}`, "_blank");
      return;
    }

    if (!folderPath) {
      showToast("未检测到生成的骑手支付绑定表，请先执行计算！", "warn");
      return;
    }

    try {
      showToast("正在打包整个工作薄文件夹下载...", "info");
      // 获取文件夹路径：提取最后输出文件所在的目录
      if (folderPath.endsWith('.xlsx') || folderPath.endsWith('.csv')) {
        folderPath = folderPath.substring(0, folderPath.lastIndexOf('/'));
      }
      if (folderPath.includes('\\')) {
        folderPath = folderPath.substring(0, folderPath.lastIndexOf('\\'));
      }
      
      const wid = getWorkspaceId();
      if (month && month !== 'latest') {
          window.open(`/api/salary_bind/download?workspace_id=${encodeURIComponent(wid)}&month=${encodeURIComponent(month)}`, "_blank");
      } else {
          window.open(`/api/download?path=${encodeURIComponent(folderPath)}&workspace_id=${encodeURIComponent(wid)}`, "_blank");
      }
    } catch (err) {
      showToast("下载过程发生异常", "error");
    }
  };

  const handleAction = async (action: string, overrides?: Partial<AppConfig>) => {
    const isParallelAction = [
      "download_config_template",
      "upload_config",
      "summary_parttime_browse",
      "open_source_salary_bind",
      "open_source_abnormal_resig",
      "open_source",
      "open_documentation",
      "check_cookie",
      "add_task_root"
    ].includes(action);

    if (isRunning && !isParallelAction) return;

    if (!isParallelAction) {
      if ("Notification" in window && Notification.permission !== "denied" && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
      seenProgressTexts.current.clear();
      seenLogs.current.clear();
      setRunningTask(action);
      setProgress(0, action);
      setProgressText("大王说了，只要抓住唐僧，大家都有唐僧肉吃！", action);
    }

    const finishAction = () => {
      setRunningTask((prev) => (prev === action ? null : prev));
    };

    let currentConfig = { ...appConfig, ...overrides };

    if (["dev_placeholder", "overdue_review"].includes(action)) {
      setLogs([
        {
          text: `>>> 🚧 当前节点前端接口层已挂载，等待后端驱动模块驻留...`,
          level: "INFO",
        },
      ]);
      setTimeout(() => finishAction(), 1500);
      return;
    }

    if (action === "summary_parttime_browse") {
      try {
        setLogs([
          {
            text: `>>> 📂 正在拉起目录选择器，请选择包含已核算工资表的文件夹目录...`,
            level: "SYSTEM",
          },
        ]);
        finishAction();

        const path = await uploadDirectoryAndGetPath();

        if (path) {
          setAppConfig((prev) => ({ ...prev, sourcePath: path }));
          setLogs((prev) => [
            ...prev,
            { text: `>>> ✅ 成功读取目录: ${path}`, level: "SUCCESS" },
          ]);
        } else {
          setLogs((prev) => [
            ...prev,
            { text: `>>> ❌ 未选择目标目录，操作已安全终止。`, level: "WARN" },
          ]);
        }
      } catch (err) {
        setLogs((prev) => [
          ...prev,
          { text: `>>> ❌ 操作异常: ${err}`, level: "ERROR" },
        ]);
        finishAction();
      }
      return;
    }

    if (["summary_parttime", "summary_parttime_btn"].includes(action)) {
      try {
        if (action === "summary_parttime_btn") {
          if (
            !appConfig.sourcePath ||
            ["/mock/data", "./data", "."].includes(appConfig.sourcePath.trim())
          ) {
            setLogs((prev) => [
              ...prev,
              {
                text: `>>> ❌ 请先选择需要提取的兼职已发汇总合并的目录。`,
                level: "ERROR",
              },
            ]);
            showToast("未选择数据目录", "warn");
            finishAction();
            return;
          }
          currentConfig = {
            ...currentConfig,
            action: "summary_parttime",
            sourcePath: appConfig.sourcePath,
          };
          setLogs((prev) => [
            ...prev,
            {
              text: `>>> 📊 目标目录已就绪，开始执行已发汇总合并...`,
              level: "SYSTEM",
            },
          ]);
        } else {
          setLogs([
            {
              text: `>>> 📊 正在拉起目录选择器，请选择要合并已发的兼职文件夹目录...`,
              level: "SYSTEM",
            },
          ]);

          const path = await uploadDirectoryAndGetPath();

          if (path) {
            currentConfig = { ...currentConfig, sourcePath: path };
            setLogs((prev) => [
              ...prev,
              {
                text: `>>> ✅ 成功读取目录: ${path} ，任务装载完毕，开始合并！`,
                level: "SUCCESS",
              },
            ]);
          } else {
            setLogs((prev) => [
              ...prev,
              {
                text: `>>> ❌ 未选择目标目录，操作已安全终止。`,
                level: "WARN",
              },
            ]);
            finishAction();
            return;
          }
        }
      } catch (err) {
        setLogs((prev) => [
          ...prev,
          { text: `>>> ❌ 操作异常: ${err}`, level: "ERROR" },
        ]);
        finishAction();
        return;
      }
    } else if (action === "open_source_salary_bind") {
      const path = await uploadDirectoryAndGetPath();
      if (path) {
        setAppConfig((prev) => ({ ...prev, salaryBindSourcePath: path }));
        setLogs((prev) => [
          ...prev,
          { text: `>>> ✅ 成功引入源数据目录: ${path}`, level: "SUCCESS" },
        ]);
        showToast("源数据目录读取成功", "success");
      }
      finishAction();
      return;
    } else if (action === "open_source") {
      const path = await uploadDirectoryAndGetPath();
      if (path) {
        setAppConfig((prev) => ({ ...prev, sourcePath: path }));
        setLogs((prev) => [
          ...prev,
          {
            text: `>>> ✅ 数据源路径已接管为边缘容器缓存盘: ${path}`,
            level: "SUCCESS",
          },
        ]);
        showToast("数据源已挂载", "success");
      }
      finishAction();
      return;
    } else if (action === "open_documentation") {
      setLogs([
        {
          text: `>>> 📖 正在解密并分发操作终端协议握手手册... (系统级)`,
          level: "INFO",
        },
        {
          text: `>>> >> PROTOCOL_HELP: [1] 选定业务节点模型; [2] 挂载并锁定数据源槽位; [3] 注入指令启动系统。`,
          level: "INFO",
        },
      ]);
      finishAction();
      return;
    } else if (action === "check_cookie") {
      setLogs([
        {
          text: `>>> 🔍 正在进行本地会话令牌 (Cookie) 校验与请求鉴权...`,
          level: "INFO",
        },
      ]);
      showToast("正在校验 Cookie...", "info");
      
      try {
        const resp = await fetchWithAuth("/api/check_cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookie: currentConfig.cookie }),
        });
        const data = await resp.json();
        if (data.valid) {
          setLogs((prev) => [
            ...prev,
            { text: `>>> ✅ ${data.msg}`, level: "SUCCESS" },
          ]);
          showToast("Cookie连接有效", "success");
        } else {
          setLogs((prev) => [
            ...prev,
            { text: `>>> ❌ ${data.msg}`, level: "ERROR" },
          ]);
          showToast("Cookie 无效或已失效", "error");
        }
      } catch (err) {
        setLogs((prev) => [
          ...prev,
          { text: `>>> ⚠️ 校验请求失败: ${String(err)}`, level: "WARN" },
        ]);
        showToast("校验失败, 网络异常", "error");
      }
      finishAction();
      return;
    } else if (action === "add_task_root") {
      try {
        const path = await uploadDirectoryAndGetPath();

        if (path) {
          setAppConfig((prev) => ({ ...prev, sourcePath: path }));
          setLogs((prev) => [
            ...prev,
            { text: `>>> ✅ 新的数据卷已挂载: ${path}`, level: "SUCCESS" },
          ]);
          showToast("数据卷挂载成功", "success");
        } else {
          setLogs((prev) => [
            ...prev,
            { text: `>>> ❌ 未选择路径或操作已取消`, level: "WARN" },
          ]);
          showToast("已取消", "info");
        }
      } catch (err) {}
      finishAction();
      return;
    } else if (action === "open_explorer") {
      try {
        const targetPath =
          activeTab === "task" ? appConfig.sourcePath : "./outputs";
        const resp = await fetchWithAuth(`/api/open/explorer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: targetPath }),
        });
        const ct = resp.headers.get("content-type");
        if (!resp.ok || !ct || !ct.includes("application/json")) throw new Error("Failed to open explorer");
        const data = await resp.json();
        if (data.success) {
          setLogs((prev) => [
            ...prev,
            { text: `>>> 📂 成功打开目录: ${targetPath}`, level: "SUCCESS" },
          ]);
          showToast("成功打开目录", "success");
        } else {
          setLogs((prev) => [
            ...prev,
            { text: `>>> ❌ 无法打开目录: ${data.error}`, level: "ERROR" },
          ]);
          showToast("无法打开目录", "error");
        }
      } catch (err) {
        showToast("服务连接失败", "error");
      }
      finishAction();
      return;
    }

    if (action === "salary_bind") {
      try {
        if (
          !appConfig.salaryBindSourcePath ||
          ["/mock/data", "./data", "."].includes(appConfig.salaryBindSourcePath.trim())
        ) {
          setLogs([
            {
              text: `>>> ❌ 未选择目标目录，请先通过界面上的[选择目录]按钮选择包含待处理数据的文件夹，操作已终止。`,
              level: "WARN",
            },
          ]);
          showToast("未选择目标工作目录", "error");
          finishAction();
          return;
        } else {
          currentConfig = { ...currentConfig, action: "salary_bind", sourcePath: appConfig.salaryBindSourcePath };
        }
      } catch (err) {
        setLogs((prev) => [
          ...prev,
          { text: `>>> ❌ 操作异常: ${err}`, level: "ERROR" },
        ]);
        finishAction();
        return;
      }
    }

    let targetPath = "";

    if (action === "remove_problem_orders_flow" || action === "raise_price_flow") {
      try {
        const isProblemOrders = action === "remove_problem_orders_flow";
        const secondFileName = isProblemOrders ? "问题单剔除表" : "价格档案";
        
        setLogs([
          { text: `>>> 📂 正在拉起文件上传，请选择工资表...`, level: "SYSTEM" },
        ]);
        const path1 = await uploadFileAndGetPath();

        if (!path1) {
          setLogs((prev) => [
            ...prev,
            { text: `>>> ❌ 未选择工资表，操作已安全终止。`, level: "WARN" },
          ]);
          finishAction();
          return;
        }
        setLogs((prev) => [
          ...prev,
          { text: `>>> ✅ 已上传工资表: ${path1}`, level: "SUCCESS" },
          {
            text: `>>> 📂 正在拉起文件上传，请选择${secondFileName}...`,
            level: "SYSTEM",
          },
        ]);

        const path2 = await uploadFileAndGetPath();

        if (!path2) {
          setLogs((prev) => [
            ...prev,
            {
              text: `>>> ❌ 未选择${secondFileName}，操作已安全终止。`,
              level: "WARN",
            },
          ]);
          finishAction();
          return;
        }
        setLogs((prev) => [
          ...prev,
          { text: `>>> ✅ 本地特征比对库已锁定: ${path2}`, level: "SUCCESS" },
          {
            text: `>>> ⚙️ 隔离沙盒装载完毕，开始执行分析清洗程序！`,
            level: "INFO",
          },
        ]);

        const actualAction = isProblemOrders ? "remove_problem_orders" : "raise_price";
        
        currentConfig = {
          ...currentConfig,
          action: actualAction,
          sourcePath: path1,
        };
        targetPath = path2;
      } catch (err) {
        setLogs((prev) => [
          ...prev,
          { text: `>>> ❌ 操作异常: ${err}`, level: "ERROR" },
        ]);
        finishAction();
        return;
      }
    }

    if (action === "raise_price" || action === "remove_problem_orders") {
      // Handled above, currentConfig has targetPath
    }
    
    if (
      !["raise_price", "remove_problem_orders", "remove_problem_orders_flow", "raise_price_flow"].includes(action)
    ) {
      if (
        !currentConfig.sourcePath ||
        ["/mock/data", "./data", "."].includes(currentConfig.sourcePath.trim())
      ) {
        showToast("未选择有效的数据源目录", "warn");
        setLogs((prev) => [
          ...prev,
          { text: `>>> ❌ 数据目录未挂载，拒绝执行！`, level: "ERROR" },
        ]);
        finishAction();
        return;
      }
    }

    try {
      const response = await fetchWithAuth("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentConfig,
          action: currentConfig.action || action,
          targetPath: targetPath,
          theme: {
            msg_start: [
              "正在启动核心计算引擎...",
              "初始化环境并加载模块...",
              "建立通信链路...",
            ],
            msg_awake: [
              "系统模块已就绪，保持心跳侦听。",
              "后台进程运行中。",
              "正在监测资源水位...",
            ],
            msg_empty: [
              "工作区目前没有任何可处理的文件。",
              "输入源为空，请检查配置。",
            ],
            msg_process: [
              "开始处理文件序列：{wb_name}",
              "正在分析数据内容：{wb_name}",
              "发起数据同步操作：{wb_name}",
              "引擎处理中：{wb_name}",
            ],
            msg_success: [
              "✅ 处理成功，校验通过：{wb_name}",
              "✅ 解析完毕，生成目标结果：{wb_name}",
              "✅ 核心节点执行完毕，状态健康：{wb_name}",
            ],
            msg_final: [
              "警告：检测到异常: {result_msg}",
              "记录：部分流程存在警告: {result_msg}",
            ],
            msg_end: [
              "计算分配和文件输出全部完成。",
              "任务流程正常结束。",
            ],
          },
        }),
      });

      if (!response.body) throw new Error("服务器无响应数据流");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = line.substring(6).trim();
              if (!payload) continue;
              const data = JSON.parse(payload);

              if (data.type === "log") {
                if (data.msg.includes("!!CITY!!")) {
                  const parts = data.msg.split("!!CITY!!");
                  appendLog(parts[0], data.level, action);
                  setAppConfig((prev) => ({ ...prev, city: parts[1] }));
                } else {
                  appendLog(data.msg, data.level, action);
                }
              } else if (data.type === "progress") {
                setProgress(Math.floor(data.value * 100), action);
                if (data.text) setProgressText(data.text, action);
              } else if (data.type === "prompt") {
                setActivePrompt({ uuid: data.uuid, title: data.title, message: data.message });
              } else if (data.type === "finish") {
                finishAction();
                if (data.status === "error") {
                  setProgressText(
                    `执行失败: ${data.result_msg}`,
                    action
                  );
                  appendLog(`[ERROR] 执行失败: ${data.result_msg}`, "ERROR", action);
                } else {
                  setProgress(100, action);
                  setProgressText(
                    data.result_msg || "系统休眠中...",
                    action
                  );
                }
                
                if (action === "salary_bind" && data.stats) {
                  setSalaryBindStats(data.stats);
                }

                if (data.status === "success") {
                  appendLog(`>>> 🎉 任务完成！`, "SUCCESS", action);
                  confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    zIndex: 9999
                  });
                  showDesktopNotification("任务执行完毕", "该次核算已圆满完成！");
                  
                  if (data.out_file && action === "salary_bind") {
                    setLastSalaryBindOutput(data.out_file);
                    localStorage.setItem("lastSalaryBindOutput", data.out_file);
                    appendLog(`>>> 📦 生成的工作薄已保存至: ${data.out_file}，请点击【导出列表】查看下载`, "SUCCESS", action);
                  }
                } else {
                  appendLog(
                    `[引擎断开] ${data.result_msg || "发生未知错误"}`,
                    "ERROR",
                    action
                  );
                }
              }
            } catch (e) {
              // Ignore malformed JSON chunks from raw console prints
            }
          }
        }
      }
    } catch (err) {
      appendLog(
        `[ERROR] 本地后端服务未响应，请确保通过 node server.ts 正常启动！: ${String(err)}`,
        "ERROR",
        action
      );
      showToast("无法连接运算引擎", "error");
      finishAction();
    }
  };

  const handleRun = async (overrides?: Partial<AppConfig>) => {
    if (isRunning) return;
    
    if ("Notification" in window && Notification.permission !== "denied" && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    
    seenProgressTexts.current.clear();
    seenLogs.current.clear();
    const targetAction = overrides?.action || "core";
    setRunningTask(targetAction);
    setProgress(0, targetAction);
    setProgressText("大王说了，只要抓住唐僧，大家都有唐僧肉吃！", targetAction);

    const initText = `>>> 大王说了，只要抓住唐僧，大家都有唐僧肉吃！都给我打起精神来！`;
    seenLogs.current.add(initText);
    setLogs([{ text: initText, level: "SYSTEM" }]);

    const wid = getWorkspaceId();
    let deductionRules = [];
    try {
      const saved = localStorage.getItem(`deduction_config_v5_${wid}`);
      if (saved) deductionRules = JSON.parse(saved);
    } catch(e) {}
    let effectiveConfig = { ...appConfig, deductionRules, ...overrides };

    if (targetAction === "issue_orders" && (!effectiveConfig.issueSelectedCities || effectiveConfig.issueSelectedCities.length === 0)) {
      showToast("请先在UI界面中选取业务城市！", "warn");
      appendLog(`[ERROR] 未选择业务城市，拒绝执行问题单生成！`, "ERROR", targetAction);
      setRunningTask(null);
      return;
    }

    // Check if sourcePath is invalid or placeholder
    if (
      !effectiveConfig.sourcePath ||
      ["/mock/data", "./data", "."].includes(effectiveConfig.sourcePath.trim())
    ) {
      try {
        const smartResp = await fetchWithAuth(`/api/dialog/smart_source`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const ct = smartResp.headers.get("content-type");
        if (!smartResp.ok || !ct || !ct.includes("application/json")) throw new Error("Smart source failed");
        const smartData = await smartResp.json();

        if (smartData.smart && smartData.path) {
          effectiveConfig.sourcePath = smartData.path;
          setAppConfig((prev) => ({ ...prev, sourcePath: smartData.path }));
          appendLog(
            `[SYS] 检测到系统高速缓存，自动建立数据源软链接: ${smartData.path}`,
            "INFO",
            targetAction
          );
        } else {
          showToast("必须先选择干活灶台 (有效的数据目录) 才能执行！", "warn");
          appendLog(
            `[ERROR] 核心数据槽位 (干活灶台) 未挂载，拒绝执行！`,
            "ERROR",
            targetAction
          );
          setRunningTask(null);
          return;
        }
      } catch (err) {
        showToast("无法校验干活灶台目录", "error");
        appendLog(`[ERROR] 目录校验失败: ${err}`, "ERROR", targetAction);
        setRunningTask(null);
        return;
      }
    }

    appendLog(`大王叫我来巡山... 正在建立高速 RPC 桥接...`, "INFO", targetAction);

    try {
      const response = await fetchWithAuth("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...effectiveConfig,
          theme: {
            msg_start: [
              "正在启动核心机制...",
              "初始化环境并加载模块...",
            ],
            msg_awake: [
              "系统模块已就绪，保持心跳侦听。",
            ],
            msg_empty: [
              "工作区目前没有任何可处理的文件。",
            ],
            msg_process: [
              "开始处理文件序列：{wb_name}",
              "正在分析数据内容：{wb_name}",
            ],
            msg_success: [
              "✅ 处理成功：{wb_name}",
              "✅ 核心节点执行完毕，状态健康：{wb_name}",
            ],
            msg_final: [
              "警告：检测到异常: {result_msg}",
            ],
            msg_end: [
              "功能执行完成。",
              "任务流程正常结束。",
            ],
          },
        }),
      });

      if (!response.ok) {
         let errMsg = "请求失败";
         try {
             const ct = response.headers.get("content-type");
             if (ct && ct.includes("application/json")) {
                 const errData = await response.json();
                 errMsg = errData.error || errMsg;
             } else {
                 errMsg = `服务器异常 (${response.status})`;
             }
         } catch (e) {}
         throw new Error(errMsg);
      }

      if (!response.body) throw new Error("服务器无响应数据流");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = line.substring(6).trim();
              if (!payload) continue;
              const data = JSON.parse(payload);

              if (data.type === "log") {
                if (data.msg.includes("!!CITY!!")) {
                  const parts = data.msg.split("!!CITY!!");
                  appendLog(parts[0], data.level, targetAction);
                  setAppConfig((prev) => ({ ...prev, city: parts[1] }));
                } else {
                  appendLog(data.msg, data.level, targetAction);
                }
              } else if (data.type === "progress") {
                setProgress(Math.floor(data.value * 100), targetAction);
                if (data.text) setProgressText(data.text, targetAction);
              } else if (data.type === "prompt") {
                setActivePrompt({ uuid: data.uuid, title: data.title, message: data.message });
              } else if (data.type === "finish") {
                setRunningTask(null);
                if (data.status === "error") {
                  setProgressText(
                    `执行失败: ${data.result_msg}`,
                    targetAction
                  );
                  appendLog(`[ERROR] 执行失败: ${data.result_msg}`, "ERROR", targetAction);
                } else {
                  setProgress(100, targetAction);
                  setProgressText(
                    data.result_msg || "系统休眠中...",
                    targetAction
                  );
                }

                const MENU_LABELS: Record<string, string> = {
                  dashboard: "首页看板",
                  core: "兼职薪资核算",
                  issue_orders: "问题单生成",
                  salary_bind: "发薪工具绑定",
                  chat: "带薪摸鱼官",
                  monitor: "任务监控",
                };
                const taskName = MENU_LABELS[activeMenu] || activeMenu;
                const newRecord: TaskHistoryRecord = {
                  id:
                    Date.now().toString() +
                    Math.random().toString(36).substr(2, 9),
                  name: taskName,
                  timestamp: new Date().toLocaleString(),
                  status: data.status === "success" ? "SUCCESS" : "FAILED",
                };
                setTaskHistory((prev) => [newRecord, ...prev]);

                if (data.status === "success") {
                  setProgress(100, targetAction);
                  if (data.stats) {
                    setTaskStatsMap(prev => ({ ...prev, [targetAction]: data.stats }));
                    if (targetAction === "salary_bind") {
                      setSalaryBindStats(data.stats);
                    }
                  }
                  appendLog(`>>> 🎉 任务完成！`, "SUCCESS", targetAction);
                  confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    zIndex: 9999
                  });
                  showDesktopNotification("任务执行完毕", "该次核算已圆满完成！");
                  if (data.out_file) {
                    if (targetAction === "core") {
                      setLastOutputFolder(data.out_file);
                      localStorage.setItem("lastOutputFolder", data.out_file);
                    } else if (targetAction === "salary_bind") {
                      setLastSalaryBindOutput(data.out_file);
                      localStorage.setItem("lastSalaryBindOutput", data.out_file);
                    }
                    appendLog(`>>> 📦 生成的工作薄已保存至: ${data.out_file}，请点击【导出列表】查看下载`, "SUCCESS", targetAction);
                  }
                  appendLog(
                    `内核线程池已被挂起并进入冷休眠，内存资源释放完成。`,
                    "INFO",
                    targetAction
                  );
                  showToast("任务圆满完成!", "success");
                } else {
                  appendLog(
                    `[引擎断开] ${data.result_msg || "发生未知错误"}`,
                    "ERROR",
                    targetAction
                  );
                  showToast(
                    `发生异常: ${data.result_msg || "未知错误"}`,
                    "error",
                  );
                }
              }
            } catch (e) {
              // Ignore malformed JSON chunks from raw console prints
            }
          }
        }
      }
    } catch (err) {
      appendLog(
        `[ERROR] 本地后端服务未响应，请确保通过 node server.ts 正常启动！: ${String(err)}`,
        "ERROR",
        targetAction
      );
      showToast("无法连接运算引擎", "error");
      setRunningTask(null);
    }
  };

  return (
    <div className="flex h-screen light:bg-slate-50 bg-app-bg text-app-text font-sans overflow-hidden relative selection:bg-sky-500/30">
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`absolute top-6 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl ${
              appTheme === 'light'
                ? toastMsg.type === "success"
                  ? "bg-emerald-50/95 border-emerald-200 text-emerald-800 shadow-lg shadow-emerald-100/40"
                  : toastMsg.type === "error"
                    ? "bg-rose-50/95 border-rose-200 text-rose-800 shadow-lg shadow-rose-100/40"
                    : toastMsg.type === "warn"
                      ? "bg-amber-50/95 border-amber-200 text-amber-800 shadow-lg shadow-amber-100/40"
                      : "bg-sky-50/95 border-sky-200 text-sky-800 shadow-lg shadow-sky-100/40"
                : toastMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
                  : toastMsg.type === "error"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-200 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
                    : toastMsg.type === "warn"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
                      : "bg-sky-500/10 border-sky-500/30 text-sky-200 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
            }`}
          >
            <span className="text-[18px]">
              {toastMsg.type === "success"
                ? "✅"
                : toastMsg.type === "error"
                  ? "❌"
                  : toastMsg.type === "warn"
                    ? "⚠️"
                    : "ℹ️"}
            </span>
            <span className="font-medium tracking-wide text-[15px]">
              {toastMsg.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {appTheme !== 'light' && <div className="scanline" />}
      {/* Sidebar Navigation */}
      <div className="relative z-20 h-full flex flex-col">
        <Sidebar
          theme={theme}
          activeMenu={activeMenu}
          onSelectMenu={setActiveMenu}
          isRunning={isRunning}
          hasUnreadChat={hasUnreadChat}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Header 
          activeMenu={activeMenu} 
          theme={theme} 
          onAction={handleAction} 
          city={appConfig.city} 
          appTheme={appTheme}
          onToggleTheme={() => setAppTheme(t => t === 'dark' ? 'light' : 'dark')}
          userProfile={userProfile}
          onEditProfile={() => setShowProfileEdit(true)}
        />

        <main className="flex-1 flex flex-col p-8 pb-4 gap-6 w-full max-w-[1600px] mx-auto min-h-0 relative z-10">
          {appTheme !== 'light' && (
            <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxmaWx0ZXIgaWQ9ImEiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjE1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')] opacity-20 mix-blend-overlay z-0 rounded-[30px]" />
          )}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-sky-500/5 via-transparent to-indigo-500/5 z-0 rounded-[30px]" />
          
          {activeMenu === "dashboard" && (
            <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
              <DashboardPanel theme={theme} onSelectMenu={setActiveMenu} taskStats={taskStatsMap["core"]} taskHistory={taskHistory} />
            </div>
          )}

          {activeMenu === "deduction_config" && (
            <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <DeductionConfigPanel theme={theme} />
            </div>
          )}

          {activeMenu === "formula_config" && (
            <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full w-full flex flex-col">
              <FormulaConfigPanel theme={theme} />
            </div>
          )}

          {/* Top Section: Controls & Action Block */}
          {activeMenu === "core" && (
            <section className="flex-[4] min-h-[320px] flex gap-5 items-stretch flex-shrink-0 mb-2">
              <div className="flex-[6] min-w-0 max-w-[850px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ControlPanel
                  theme={theme}
                  config={appConfig}
                  onChangeConfig={setAppConfig}
                  onAction={handleAction}
                  onUploadFiles={uploadFilesAndExecute}
                  isRunning={runningTask !== null}
                />
              </div>
              <div
                className="flex-[4] min-w-0 bg-[#020410] light:bg-white border border-sky-500/10 light:border-slate-200 light:shadow-[0_2px_10px_rgba(0,0,0,0.05)] shadow-[0_0_15px_rgba(14,165,233,0.1)] rounded-3xl cyber-border overflow-hidden flex items-stretch justify-center p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 relative group"
                style={{ animation: "glow-pulse 6s infinite ease-in-out" }}
              >
                <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent opacity-30" />
                <ActionPanel
                  theme={theme}
                  appTheme={appTheme}
                  isRunning={runningTask === "core"}
                  onRun={() => handleRun({ action: "core" })}
                  progress={progress}
                  taskStats={taskStatsMap[activeMenu]}
                  taskHistory={taskHistory}
                  activeMenu={activeMenu}
                />
              </div>
            </section>
          )}

          {activeMenu === "issue_orders" && (
            <div className="flex-1 w-full h-full min-h-0 flex pb-2 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-50">
              <IssueOrderDashboard
                theme={theme}
                config={appConfig}
                onChangeConfig={setAppConfig}
                appTheme={appTheme}
                onCheckCookie={(customCookie) => handleAction("check_cookie", customCookie ? { cookie: customCookie } : undefined)}
                isRunning={runningTask === "issue_orders"}
                onRun={() => handleRun({ action: "issue_orders" })}
                progress={progress}
                progressText={progressText}
                logs={logs}
                taskStats={taskStatsMap[activeMenu]}
              />
            </div>
          )}

          {activeMenu === "salary_bind" && (
            <div className="flex-1 w-full h-full min-h-0 flex gap-5 pb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Dashboard */}
              <div className="flex-1 min-w-[400px] h-full transition-all duration-500 relative z-10">
                <SalaryBindDashboard 
                  theme={theme} 
                  stats={salaryBindStats}
                  isRunning={runningTask === "salary_bind"}
                  onRun={() => handleAction("salary_bind")}
                  config={appConfig}
                  onAction={handleAction}
                  progress={progress}
                  progressText={progressTextMap["salary_bind"] || "准备就绪 / READY"}
                  lastOutput={lastSalaryBindOutput}
                  onDownload={handleDownloadSalaryBindTable}
                />
              </div>

            </div>
          )}



          {activeMenu === "monitor" && (
            <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TaskMonitor isRunning={!!runningTask} />
            </div>
          )}

          <div className={activeMenu === "chat" ? "flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full max-h-[85vh]" : "hidden"}>
            <ChatPanel workspaceId={workspaceId} userProfile={userProfile} onEditProfile={() => setShowProfileEdit(true)} />
          </div>

          {activeMenu === "export_list" && (
            <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
              <div className="h-full w-full flex flex-col relative group overflow-hidden bg-slate-950/60 rounded-xl border light:border-slate-200 border-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.1)]">
                <RightPanel
                  theme={theme}
                  activeTab="output"
                  config={appConfig}
                  isRunning={isRunning}
                />
              </div>
            </div>
          )}

          {![
            "dashboard",
            "deduction_config",
            "core",
            "issue_orders",
            "salary_bind",
            "export_list",
            "monitor",
            "chat",
            "formula_config",
          ].includes(activeMenu) && (
            <section
              className={`flex-[4] min-h-[320px] flex gap-8 w-full flex-shrink-0 mb-2`}
            >
              <div
                className={`w-full min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-500`}
              >
                  <GenericToolPanel
                    theme={theme}
                    actionId={activeMenu}
                    isRunning={runningTask === "dev_placeholder"}
                    onRun={() => handleAction("dev_placeholder")}
                    title="模块开发中"
                    description="当前业务模块正在拼命研发中，即将上线，敬请期待后端引擎组装完成。"
                    icon="✨"
                  />
              </div>
            </section>
          )}

          {/* Bottom Section: Terminal & Files */}
          {![
            "dashboard",
            "deduction_config",
            "parttime_details",
            "export_list",
            "salary_reissue",
            "referral_internal",
            "referral_field",
            "salary_bind",
            "issue_orders",
            "monitor",
            "chat",
            "formula_config",
          ].includes(activeMenu) && (
            <section
              className="flex-[5] min-h-[280px] bg-[#020410] light:bg-white border border-sky-500/10 light:border-slate-200 light:shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-[20px] cyber-border flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 relative z-0"
              style={{ animation: "glow-pulse 8s infinite ease-in-out" }}
            >
              <div className="w-full shrink-0 border-b light:border-slate-200 border-sky-500/10 px-6 pt-3 pb-2">
                <div className="flex gap-8 w-full items-center">
                  <div className="flex-[6] min-w-0 max-w-[775px] flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-base tracking-wide text-slate-800 light:text-slate-900 dark:text-slate-200">
                          {theme.term_head}
                        </span>
                        
                        {(() => {
                          let statusText = '等待中';
                          let dotColor = 'bg-slate-400 dark:bg-slate-500';
                          let pingColor = '';
                          let badgeBg = 'bg-slate-100 dark:bg-slate-800/60';
                          let textColor = 'text-slate-600 dark:text-slate-400';

                          if (runningTask === activeMenu) {
                            statusText = '处理中';
                            dotColor = 'bg-sky-500';
                            pingColor = 'bg-sky-400';
                            badgeBg = 'bg-sky-50 dark:bg-sky-500/10';
                            textColor = 'text-sky-600 dark:text-sky-400';
                          } else if (logs.length > 1) {
                            statusText = '已完成';
                            dotColor = 'bg-emerald-500';
                            badgeBg = 'bg-emerald-50 dark:bg-emerald-500/10';
                            textColor = 'text-emerald-600 dark:text-emerald-400';
                          }

                          return (
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${badgeBg} border border-transparent transition-colors`}>
                                <div className="relative flex h-2 w-2 items-center justify-center">
                                  {pingColor && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75`}></span>}
                                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`}></span>
                                </div>
                                <span className={`text-[12px] font-medium ${textColor}`}>
                                  {statusText}
                                </span>
                              </div>
                              <TaskTimer isRunning={runningTask === activeMenu} />
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                  </div>

                  <div className="flex-[4] min-w-0 flex items-center justify-end gap-2 h-[40px]">
                    {activeMenu === "core" && (
                      <>
                        <button
                          onClick={() => window.open("/api/download/template", "_blank")}
                          className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 light:bg-indigo-50 light:hover:bg-indigo-100 light:text-indigo-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                          title="下载兼职薪资模板"
                        >
                          <Download className="w-3.5 h-3.5" />
                          导出模板
                        </button>
                        {lastOutputFolder && (
                          <button
                            onClick={handleDownloadSalaryTable}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400 light:bg-emerald-50 light:hover:bg-emerald-100 light:text-emerald-600"
                            title="下载最近生成的薪资表"
                          >
                            <Download className="w-3.5 h-3.5" />
                            导出生成薪资表
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex gap-6 px-6 pb-6 pt-2 overflow-hidden min-h-0 relative z-10 w-full">
                <div className="flex-1 min-w-0 flex flex-col h-full rounded-xl overflow-hidden shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] light:shadow-inner border border-sky-500/10 light:border-slate-200 w-full bg-[#020410] light:bg-slate-50 relative">
                  <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,1)] light:shadow-none z-10"></div>
                  <TerminalPanel
                    appTheme={appTheme}
                    logs={logs}
                    progress={progress}
                    progressText={progressText}
                    isRunning={runningTask === activeMenu}
                  />
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {activePrompt && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full light:shadow-sm shadow-2xl flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
            <h3 className="text-xl font-bold text-rose-50 mb-3 text-center">{activePrompt.title}</h3>
            <p className="text-sm light:text-slate-800 text-slate-300 light:font-medium text-center whitespace-pre-wrap leading-relaxed mb-6">
              {activePrompt.message}
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/resume_task", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ uuid: activePrompt.uuid, action: false })
                    });
                  } catch (e) {}
                  setActivePrompt(null);
                }}
                className="flex-1 py-2.5 rounded-xl border light:border-slate-200 border-slate-700 bg-slate-800 light:text-slate-800 text-slate-300 light:font-medium hover:bg-slate-700 hover:light:text-slate-900 text-white transition-colors"
              >
                取消任务
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/resume_task", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ uuid: activePrompt.uuid, action: true })
                    });
                  } catch (e) {}
                  setActivePrompt(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 font-bold hover:bg-rose-500 hover:light:text-slate-900 text-white hover:shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-all"
              >
                强行继续
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showIdentitySetup && (
        <IdentitySetupModal theme={theme} onComplete={handleIdentityComplete} />
      )}

      {showProfileEdit && (
        <ProfileEditModal
          theme={theme}
          profile={userProfile}
          onSave={handleSaveProfile}
          onClose={() => setShowProfileEdit(false)}
        />
      )}
    </div>
  );
}
