import React, { useState, useEffect } from 'react';
import { THEMES } from './constants';
import { LogEntry, AppConfig } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ControlPanel } from './components/ControlPanel';
import { ActionPanel } from './components/ActionPanel';
import { IssueOrderControlPanel } from './components/IssueOrderControlPanel';
import { IssueOrderActionPanel } from './components/IssueOrderActionPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { RightPanel } from './components/RightPanel';
import { FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function GenericToolPanel({ theme, actionId, isRunning, onRun, title, description, icon }: any) {
  return (
    <div className="glass-panel-immersive rounded-2xl flex flex-col p-8 h-full w-full justify-between relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="flex flex-col gap-4 relative z-10">
         <h2 className="font-display text-[22px] font-bold text-slate-100 tracking-wider flex items-center mb-1 animate-breathe">
           <span className="text-[26px] mr-3 text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">{icon}</span>
           {title}
         </h2>
         <p className="text-[13px] text-slate-400 leading-relaxed font-medium mt-2">{description}</p>
      </div>

      <div className="flex justify-start mt-8 relative z-10 w-full">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRun} 
          disabled={isRunning}
          className={`relative px-8 py-3.5 rounded-xl font-bold tracking-[0.1em] w-full transition-all duration-300 overflow-hidden group/btn text-[14px] uppercase ${
            isRunning 
              ? 'bg-sky-500/20 text-sky-500 border border-sky-500/50 cursor-wait' 
              : 'bg-sky-500/10 text-sky-500 border border-sky-500/50 hover:bg-sky-500 hover:text-black hover:border-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.6)] cursor-pointer'
          }`}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></div> 
              执行指令中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              点火执行 {title}
            </span>
          )}
        </motion.button>
      </div>

      {/* Decorative background element */}
      <div className="absolute -bottom-16 -right-10 text-[160px] text-sky-500/5 rotate-[-15deg] pointer-events-none select-none blur-[2px]">
        {icon}
      </div>
    </div>
  );
}

const getLocalToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

import { ParttimeDetailsPanel } from './components/ParttimeDetailsPanel';

export default function App() {
  const theme = THEMES[0];
  
  const [activeMenu, setActiveMenu] = useState('core');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([{ text: theme.log_init, level: 'INFO' }]);
  const [activeTab, setActiveTab] = useState<'task'|'output'>('output');
  
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    const defaultState: AppConfig = {
      city: '深圳',
      cycle: '日结',
      issueCycle: '今天',
      basePath: '../config.xlsx',
      sourcePath: './data',
      workspacePath: '',
      cities: ["深圳", "北京", "天津", "大连", "保定", "广州", "上海"],
      cycles: ["日结", "周结", "半月结", "人效号"],
      issueCycles: ["今天", "本周", "上半月", "下半月", "当月"],
      issueSelectedCities: ["深圳"],
      startDate: getLocalToday(),
      endDate: getLocalToday()
    };
    const saved = localStorage.getItem('appConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultState, ...parsed };
      } catch (e) {
        console.error("Failed to parse appConfig from localStorage", e);
      }
    }
    return defaultState;
  });

  const isLoadedRef = React.useRef(false);

  useEffect(() => {
    fetch('/api/default_paths')
      .then(res => res.json())
      .then(defaultData => {
        fetch('/api/config')
          .then(res => res.json())
          .then(data => {
            if (data && Object.keys(data).length > 0 && !data.error) {
              setAppConfig(prev => {
                let newConfig = { ...prev, ...data };
                // 强制将带有 dist 的路径或者旧的默认路径重置为正确的工程同级目录
                if (!newConfig.basePath || newConfig.basePath === '../config.xlsx' || newConfig.basePath === '..' || /dist[\\/]config\.xlsx$/i.test(newConfig.basePath)) {
                  newConfig.basePath = defaultData.configPath;
                }
                if (!newConfig.sourcePath || newConfig.sourcePath === './data' || /dist[\\/]data$/i.test(newConfig.sourcePath) || /[\\/]三亚$/i.test(newConfig.sourcePath)) {
                  newConfig.sourcePath = defaultData.dataPath;
                }
                return newConfig;
              });
            } else {
              setAppConfig(prev => {
                let newConfig = { ...prev };
                if (!newConfig.basePath || newConfig.basePath === '../config.xlsx' || newConfig.basePath === '..' || /dist[\\/]config\.xlsx$/i.test(newConfig.basePath)) {
                  newConfig.basePath = defaultData.configPath;
                }
                if (!newConfig.sourcePath || newConfig.sourcePath === './data' || /dist[\\/]data$/i.test(newConfig.sourcePath) || /[\\/]三亚$/i.test(newConfig.sourcePath)) {
                  newConfig.sourcePath = defaultData.dataPath;
                }
                return newConfig;
              });
            }
          })
          .catch(err => {
            console.error("Failed to load config from backend", err);
          })
          .finally(() => {
            isLoadedRef.current = true;
          });
      })
      .catch(err => console.error("Failed to fetch default paths", err));
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem('appConfig', JSON.stringify(appConfig));
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appConfig)
    }).catch(err => console.error("Failed to save config to backend", err));
  }, [appConfig]);

  const appendLog = (text: string, level: LogEntry['level'] = 'INFO') => {
    setLogs(prev => [...prev, { text, level }]);
  };

  const [toastMsg, setToastMsg] = useState<{id: number, text: string, type: string}|null>(null);
  const showToast = (text: string, type: string = 'info') => {
    const id = Date.now();
    setToastMsg({ id, text, type });
    setTimeout(() => setToastMsg(prev => prev && prev.id === id ? null : prev), 3000);
  };

  const handleAction = async (action: string) => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(0);

    let currentConfig = { ...appConfig };

    if (['dev_placeholder', 'remove_problem_orders', 'raise_price', 'overdue_review'].includes(action)) {
      setLogs([{ text: `>>> 🚧 该功能模块前端界面已就绪，正在等待 Python 后端引擎联调中...`, level: 'INFO' }]);
      setTimeout(() => setIsRunning(false), 1500);
      return;
    }

    if (action === 'summary_parttime_browse') {
      try {
        setLogs([{ text: `>>> 📂 正在拉起目录选择器，请选择包含已核算工资表的文件夹目录...`, level: 'SYSTEM' }]);
        setIsRunning(false);
        const dialogEndpoint = '/api/dialog/folder?title=' + encodeURIComponent('选择包含已核算工资表的文件夹');
        const response = await fetch(dialogEndpoint);
        const data = await response.json();
        
        if (data.path) {
          setAppConfig(prev => ({ ...prev, sourcePath: data.path }));
          setLogs(prev => [...prev, { text: `>>> ✅ 成功读取目录: ${data.path}`, level: 'SUCCESS' }]);
        } else {
          setLogs(prev => [...prev, { text: `>>> ❌ 未选择目标目录，操作已安全终止。`, level: 'WARN' }]);
        }
      } catch (err) {
        setLogs(prev => [...prev, { text: `>>> ❌ 操作异常: ${err}`, level: 'ERROR' }]);
        setIsRunning(false);
      }
      return;
    }

    if (['summary_parttime', 'summary_parttime_btn'].includes(action)) {
      try {
        if (action === 'summary_parttime_btn') {
          if (!appConfig.sourcePath || appConfig.sourcePath === './data' || appConfig.sourcePath === '.') {
            setLogs(prev => [...prev, { text: `>>> ❌ 请先选择需要提取的兼职已发汇总合并的目录。`, level: 'ERROR' }]);
            setIsRunning(false);
            return;
          }
          currentConfig = { ...currentConfig, action: 'summary_parttime', sourcePath: appConfig.sourcePath };
          setLogs(prev => [...prev, { text: `>>> 📊 目标目录已就绪，开始执行已发汇总合并...`, level: 'SYSTEM' }]);

        } else {
          setLogs([{ text: `>>> 📊 正在拉起目录选择器，请选择要合并已发的兼职文件夹目录...`, level: 'SYSTEM' }]);
          
          const dialogEndpoint = '/api/dialog/folder?title=' + encodeURIComponent('选择要合并已发的兼职文件夹目录');
          const response = await fetch(dialogEndpoint);
          const data = await response.json();
          if (data.path) {
            currentConfig = { ...currentConfig, sourcePath: data.path };
            setLogs(prev => [...prev, { text: `>>> ✅ 成功读取目录: ${data.path} ，任务装载完毕，开始合并！`, level: 'SUCCESS' }]);
          } else {
            const errorMsg = data.error ? ` (系统异常: ${data.error})` : '';
            setLogs(prev => [...prev, { text: `>>> ❌ 未选择目标目录，操作已安全终止。${errorMsg}`, level: 'WARN' }]);
            setIsRunning(false);
            return;
          }
        }
      } catch (err) {
        setLogs(prev => [...prev, { text: `>>> ❌ 弹窗拉起失败 (请确认 Python 后端服务是否正常启动): ${err}`, level: 'ERROR' }]);
        setIsRunning(false);
        return;
      }
    } else if (action === 'open_config') {
      try {
        setLogs([{ text: `>>> 🛠️ 正在尝试打开配置表 (config.xlsx)...`, level: 'INFO' }]);
        const response = await fetch(`/api/open/config?path=${encodeURIComponent(appConfig.basePath)}`);
        const data = await response.json();
        
        if (data.success) {
          setLogs(prev => [...prev, { text: `>>> ✅ ${data.msg}`, level: 'SUCCESS' }]);
          showToast('成功打开配置文件', 'success');
          setIsRunning(false);
          return;
        } else if (data.exists) {
          setLogs(prev => [...prev, { text: `>>> ❌ 打开失败: ${data.msg}`, level: 'ERROR' }]);
          showToast(`打开失败: ${data.msg}`, 'error');
          setIsRunning(false);
          return;
        }

        // if the file does not exist
        setLogs(prev => [...prev, { text: `>>> ❌ 未能在当前挂载盘找到 config.xlsx，请重新选择配置文件...`, level: 'WARN' }]);
        showToast('未找到配置文件，请重新选择', 'warn');
        const r = await fetch('/api/dialog/file?title=' + encodeURIComponent('选择 config.xlsx 配置文件'));
        const d = await r.json();
        if (d.path) {
          setAppConfig(prev => ({ ...prev, basePath: d.path }));
          setLogs(prev => [...prev, { text: `>>> ✅ 挂载配置路径已更新: ${d.path}`, level: 'SUCCESS' }]);
          showToast('配置路径已更新', 'success');
        } else {
          setLogs(prev => [...prev, { text: `>>> ❌ 操作已取消`, level: 'WARN' }]);
          showToast('操作已取消', 'info');
        }
      } catch (err) {
        setLogs(prev => [...prev, { text: `>>> ❌ 服务连接失败 (请确认 Python 后端服务是否正常启动): ${err}`, level: 'ERROR' }]);
      }
      setIsRunning(false);
      return;
    } else if (action === 'open_source') {
      try {
        setLogs([{ text: `>>> 📁 [系统交互] 正在拉起本地目录选择器...`, level: 'INFO' }]);
        const smartResp = await fetch(`/api/dialog/smart_source?basePath=${encodeURIComponent(appConfig.basePath)}`);
        const smartData = await smartResp.json();
        
        if (smartData.smart && smartData.path) {
          setAppConfig(prev => ({ ...prev, sourcePath: smartData.path }));
          setLogs(prev => [...prev, { text: `>>> ✅ 检测到爬虫下载目录，已自动映射数据源: ${smartData.path}`, level: 'SUCCESS' }]);
          showToast('已自动映射数据源', 'success');
        } else {
          setLogs(prev => [...prev, { text: `>>> ⚠️ 未检测到爬虫数据，尝试手动选择数据源...`, level: 'WARN' }]);
          const response = await fetch('/api/dialog/folder?title=' + encodeURIComponent('未发现爬虫下载目录，请自行选择数据源文件夹'));
          const data = await response.json();
          if (data.path) {
            setAppConfig(prev => ({ ...prev, sourcePath: data.path }));
            setLogs(prev => [...prev, { text: `>>> ✅ 数据源路径已手动更新: ${data.path}`, level: 'SUCCESS' }]);
            showToast('数据源已更新: ' + data.path, 'success');
          } else {
            setLogs(prev => [...prev, { text: `>>> ❌ 未选择路径或操作已取消`, level: 'WARN' }]);
            showToast('未选择路径，操作已取消', 'info');
          }
        }
      } catch (err) {
        setLogs(prev => [...prev, { text: `>>> ❌ 弹窗拉起失败 (请确认 Python 后端服务是否正常启动): ${err}`, level: 'ERROR' }]);
        showToast('服务连接失败', 'error');
      }
      setIsRunning(false);
      return;
    } else if (action === 'open_documentation') {
      setLogs([{ text: `>>> 📖 正在加载《核心核算引擎操作向导》... (系统演示)`, level: 'INFO' }, { text: `>>> [使用帮助] 1. 选择对应的核算业务 2. 挂载数据源 3. 点击执行指令`, level: 'INFO'}]);
      setIsRunning(false);
      return;
    } else if (action === 'open_workspace') {
      try {
        setLogs([{ text: `>>> 📁 [系统交互] 正在拉起工作空间目录选择器...`, level: 'INFO' }]);
        const response = await fetch('/api/dialog/folder?title=' + encodeURIComponent('选择个人工作空间目录'));
        const data = await response.json();
        if (data.path) {
          setAppConfig(prev => ({ ...prev, workspacePath: data.path }));
          setLogs(prev => [...prev, { text: `>>> ✅ 个人工作空间已更新: ${data.path}`, level: 'SUCCESS' }]);
          showToast('工作空间已更新', 'success');
        } else {
          setLogs(prev => [...prev, { text: `>>> ❌ 未选择路径或操作已取消`, level: 'WARN' }]);
          showToast('操作已取消', 'info');
        }
      } catch (err) {
        setLogs(prev => [...prev, { text: `>>> ❌ 弹窗拉起失败 (请确认 Python 后端服务是否正常启动): ${err}`, level: 'ERROR' }]);
        showToast('服务连接失败', 'error');
      }
      setIsRunning(false);
      return;
    } else if (action === 'check_cookie') {
      setLogs([{ text: `>>> 🔍 正在进行后台校验 Cookie 的有效性...`, level: 'INFO' }]);
      showToast('正在校验 Cookie', 'info');
      setTimeout(() => {
         if (!appConfig.cookie) {
            setLogs(prev => [...prev, { text: `>>> ❌ 未提供 Cookie，请先输入有效的 Cookie = ...`, level: 'ERROR' }]);
            showToast('未提供 Cookie', 'error');
         } else if (appConfig.cookie.length > 20) {
            setLogs(prev => [...prev, { text: `>>> ✅ Cookie连接有效！准入凭证正常。(系统演示)`, level: 'SUCCESS' }]);
            showToast('Cookie连接有效', 'success');
         } else {
            setLogs(prev => [...prev, { text: `>>> ⚠️ Cookie 格式似乎不正确，或是已过期失效，请重新提取。`, level: 'WARN' }]);
            showToast('Cookie 可能失效', 'warn');
         }
         setIsRunning(false);
      }, 1500);
      return;
    } else if (action === 'add_task_root') {
      try {
        const response = await fetch('/api/dialog/folder?title=' + encodeURIComponent('挂载新的数据卷'));
        const data = await response.json();
        if (data.path) {
          setAppConfig(prev => ({ ...prev, sourcePath: data.path }));
          setLogs(prev => [...prev, { text: `>>> ✅ 新的数据卷已挂载: ${data.path}`, level: 'SUCCESS' }]);
          showToast('数据卷挂载成功', 'success');
        } else {
          setLogs(prev => [...prev, { text: `>>> ❌ 未选择路径或操作已取消`, level: 'WARN' }]);
          showToast('已取消', 'info');
        }
      } catch (err) {}
      setIsRunning(false);
      return;
    } else if (action === 'open_explorer') {
      try {
        const outputBase = appConfig.workspacePath || appConfig.basePath;
        const targetPath = activeTab === 'task' ? appConfig.sourcePath : outputBase;
        const resp = await fetch(`/api/open/explorer?path=${encodeURIComponent(targetPath)}`);
        const data = await resp.json();
        if (data.success) {
           setLogs(prev => [...prev, { text: `>>> 📂 成功打开目录: ${targetPath}`, level: 'SUCCESS' }]);
           showToast('成功打开目录', 'success');
        } else {
           setLogs(prev => [...prev, { text: `>>> ❌ 无法打开目录: ${data.error}`, level: 'ERROR' }]);
           showToast('无法打开目录', 'error');
        }
      } catch(err) {
         showToast('服务连接失败', 'error');
      }
      setIsRunning(false);
      return;
    }

    let targetPath = '';
    if (action === 'raise_price' || action === 'remove_problem_orders') {
        // Handled above, currentConfig has targetPath
    }

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentConfig,
          action: currentConfig.action || action,
          targetPath: targetPath,
          theme: {
            msg_start: ["牛马打点器已就绪。老板请吩咐..."],
            msg_awake: ["开启照妖镜，防止白嫖怪..."],
            msg_empty: ["怎么连块砖都没有..."],
            msg_process: ["抡起铁锤砸向: {wb_name}"],
            msg_success: ["✅ {wb_name} 搬运完毕，汗流浃背。"],
            msg_final: ["执行完成: {result_msg}"],
            msg_end: ["今日份牛马岁月流逝完毕！"]
          }
        })
      });

      if (!response.body) throw new Error("服务器无响应数据流");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = line.substring(6).trim();
              if (!payload) continue;
              const data = JSON.parse(payload);
              
              if (data.type === 'log') {
                appendLog(data.msg, data.level);
              } else if (data.type === 'progress') {
                setProgress(Math.floor(data.value * 100));
              } else if (data.type === 'finish') {
                setIsRunning(false);
                setProgress(100);
                if (data.status === 'success') {
                  appendLog(`>>> 🎉 任务完成！`, 'SUCCESS');
                } else {
                  appendLog(`[引擎断开] ${data.result_msg || '发生未知错误'}`, 'ERROR');
                }
              }
            } catch(e) {
              // Ignore malformed JSON chunks from raw console prints
            }
          }
        }
      }
    } catch(err) {
      appendLog(`[ERROR] 本地后端服务未响应，请确保通过 node server.ts 正常启动！: ${String(err)}`, 'ERROR');
      showToast('无法连接运算引擎', 'error');
      setIsRunning(false);
    }
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(0);
    setLogs([{ text: `>>> 开始启动【${theme.name}】核心引擎...`, level: 'SYSTEM' }]);
    
    let effectiveConfig = { ...appConfig };

    // Check if sourcePath is missing or default
    if (!appConfig.sourcePath || appConfig.sourcePath === './data' || appConfig.sourcePath === '.') {
      try {
        const smartResp = await fetch(`/api/dialog/smart_source?basePath=${encodeURIComponent(appConfig.basePath)}`);
        const smartData = await smartResp.json();
        
        if (smartData.smart && smartData.path) {
          effectiveConfig.sourcePath = smartData.path;
          setAppConfig(prev => ({ ...prev, sourcePath: smartData.path }));
          appendLog(`[INFO] 检测到爬虫数据，已自动映射数据源目录: ${smartData.path}`, 'INFO');
        } else {
          appendLog(`[WARN] 未检测到【爬虫下载】目录，无法直接运行，请指定数据源...`, 'WARN');
          const response = await fetch('/api/dialog/folder?title=' + encodeURIComponent('请自行选择数据源文件夹'));
          const data = await response.json();
          if (data.path) {
            effectiveConfig.sourcePath = data.path;
            setAppConfig(prev => ({ ...prev, sourcePath: data.path }));
            appendLog(`[INFO] 数据源已挂载: ${data.path}`, 'INFO');
          } else {
            appendLog(`[ERROR] 用户取消了数据源选择，核心运行终止。`, 'ERROR');
            setIsRunning(false);
            return;
          }
        }
      } catch (err) {
        appendLog(`[ERROR] 目录校验失败: ${err}`, 'ERROR');
        setIsRunning(false);
        return;
      }
    }

    appendLog(`[INFO] 连接本地Python核心引擎中...`, 'INFO');

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...effectiveConfig,
          theme: {
            msg_start: ["牛马打点器已就绪。老板请吩咐..."],
            msg_awake: ["开启照妖镜，防止白嫖怪..."],
            msg_empty: ["怎么连块砖都没有..."],
            msg_process: ["抡起铁锤砸向: {wb_name}"],
            msg_success: ["✅ {wb_name} 搬运完毕，汗流浃背。"],
            msg_final: ["执行完成: {result_msg}"],
            msg_end: ["今日份牛马岁月流逝完毕！"]
          }
        })
      });

      if (!response.body) throw new Error("服务器无响应数据流");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = line.substring(6).trim();
              if (!payload) continue;
              const data = JSON.parse(payload);
              
              if (data.type === 'log') {
                appendLog(data.msg, data.level);
              } else if (data.type === 'progress') {
                setProgress(Math.floor(data.value * 100));
              } else if (data.type === 'finish') {
                setIsRunning(false);
                if (data.status === 'success') {
                  setProgress(100);
                  appendLog(`>>> 🎉 任务完成！`, 'SUCCESS');
                  appendLog(`[完结撒花] 马儿已归厩，快去派发小钱钱吧`, 'INFO');
                  showToast('任务圆满完成!', 'success');
                } else {
                  appendLog(`[引擎断开] ${data.result_msg || '发生未知错误'}`, 'ERROR');
                  showToast(`发生异常: ${data.result_msg || '未知错误'}`, 'error');
                }
              }
            } catch(e) {
              // Ignore malformed JSON chunks from raw console prints
            }
          }
        }
      }
    } catch(err) {
      appendLog(`[ERROR] 本地后端服务未响应，请确保通过 node server.ts 正常启动！: ${String(err)}`, 'ERROR');
      showToast('无法连接运算引擎', 'error');
      setIsRunning(false);
    }
  };

  return (
    <div className="flex h-screen bg-app-bg text-app-text font-sans overflow-hidden relative selection:bg-sky-500/30">
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`absolute top-6 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border backdrop-blur-xl ${
              toastMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' :
              toastMsg.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' :
              toastMsg.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' :
              'bg-sky-500/10 border-sky-500/30 text-sky-200'
            }`}
          >
            <span className="text-[18px]">
              {toastMsg.type === 'success' ? '✅' : toastMsg.type === 'error' ? '❌' : toastMsg.type === 'warn' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="font-medium tracking-wide text-[15px]">{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="scanline" />
      {/* Sidebar Navigation */}
      <div className="relative z-20 h-full flex flex-col">
        <Sidebar 
          theme={theme} 
          activeMenu={activeMenu} 
          onSelectMenu={setActiveMenu} 
          isRunning={isRunning} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Header theme={theme} onAction={handleAction} city={appConfig.city} />

        <main className="flex-1 flex flex-col p-8 pb-4 gap-6 w-full max-w-[1600px] mx-auto min-h-0">
          
          {/* Top Section: Controls & Action Block */}
          {activeMenu === 'core' && (
            <section className="flex gap-8 flex-shrink-0 mb-2">
              <div className="flex-[6] min-w-0 max-w-[850px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ControlPanel theme={theme} config={appConfig} onChangeConfig={setAppConfig} onAction={handleAction} />
              </div>
              <div className="flex-[4] min-w-0 glass-panel-immersive rounded-3xl cyber-border flex items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 relative group" style={{ animation: 'glow-pulse 6s infinite ease-in-out' }}>
                <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent opacity-30" />
                <ActionPanel theme={theme} isRunning={isRunning} onRun={handleRun} progress={progress} />
              </div>
            </section>
          )}

          {activeMenu === 'issue_orders' && (
            <section className="flex gap-8 flex-shrink-0 mb-2 relative z-50">
              <div className="flex-[6] min-w-0 max-w-[850px] animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-50">
                <IssueOrderControlPanel 
                  theme={theme} 
                  config={appConfig} 
                  onChangeConfig={setAppConfig} 
                  onCheckCookie={() => handleAction('check_cookie')} 
                />
              </div>
              <div className="flex-[4] min-w-0 glass-panel-immersive rounded-3xl cyber-border flex items-center justify-center p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 relative group" style={{ animation: 'glow-pulse 6s infinite ease-in-out' }}>
                <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent opacity-30" />
                <IssueOrderActionPanel theme={theme} isRunning={isRunning} onRun={handleRun} progress={progress} />
              </div>
            </section>
          )}

          {!['core', 'issue_orders'].includes(activeMenu) && (
            <section className="flex gap-8 flex-shrink-0 mb-2">
              <div className="w-full min-w-0 h-[256px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeMenu === 'parttime_details' ? (
                  <ParttimeDetailsPanel 
                    theme={theme}
                    config={appConfig}
                    isRunning={isRunning}
                    onRun={() => handleAction('summary_parttime_btn')}
                    onBrowseFolder={() => handleAction('summary_parttime_browse')}
                  />
                ) : (
                  <GenericToolPanel 
                    theme={theme}
                    actionId={activeMenu}
                    isRunning={isRunning}
                    onRun={() => handleAction('dev_placeholder')}
                    title={
                      activeMenu === 'salary_reissue' ? '薪资补发记录' :
                      activeMenu === 'salary_bind' ? '发薪工具绑定' :
                      activeMenu === 'referral_internal' ? '内推发放记录' :
                      activeMenu === 'referral_field' ? '地推发放记录' :
                      activeMenu === 'abnormal_resignation' ? '异常离职流程' : '模块开发中'
                    }
                    description="当前业务模块正在拼命研发中，即将上线，敬请期待后端引擎组装完成。"
                    icon={
                      activeMenu === 'salary_reissue' ? '◬' :
                      activeMenu === 'salary_bind' ? '◎' :
                      activeMenu === 'referral_internal' ? '⊞' :
                      activeMenu === 'referral_field' ? '◉' :
                      activeMenu === 'abnormal_resignation' ? '⚠' : '✨'
                    }
                  />
                )}
              </div>
            </section>
          )}

          {/* Bottom Section: Terminal & Files */}
          <section className="flex-1 glass-panel-immersive rounded-[20px] cyber-border flex flex-col overflow-hidden min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 relative z-0" style={{ animation: 'glow-pulse 8s infinite ease-in-out' }}>
            
            <div className="flex items-center justify-between px-8 pt-6 pb-4 shrink-0 border-b border-sky-500/10">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                  </div>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-100 to-sky-400 font-mono font-black text-[15px] tracking-[0.2em] uppercase relative top-[1px] drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] animate-pulse">{theme.term_head}</span>
                </div>
                
                {/* Extended Action Buttons Here */}
                {activeMenu !== 'issue_orders' && (
                  <div className="flex items-center gap-1 border-l border-sky-500/20 pl-3 md:pl-5 relative ml-1 md:ml-3">
                    <button onClick={() => handleAction('remove_problem_orders')} className="text-slate-400 hover:text-sky-300 transition-colors text-[14px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-sky-500/30 hover:bg-sky-500/10 group/btn h-[36px]">
                      <span className="text-[16px] text-sky-400/80 group-hover/btn:text-sky-300 group-hover/btn:scale-110 transition-transform">◬</span>
                      <span className="font-medium tracking-wide whitespace-nowrap">问题单剔除</span>
                    </button>
                    <button onClick={() => handleAction('raise_price')} className="text-slate-400 hover:text-sky-300 transition-colors text-[14px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-sky-500/30 hover:bg-sky-500/10 group/btn h-[36px]">
                      <span className="text-[16px] text-sky-400/80 group-hover/btn:text-sky-300 group-hover/btn:scale-110 transition-transform">⇡</span>
                      <span className="font-medium tracking-wide whitespace-nowrap">蓝橙提审</span>
                    </button>
                    <button onClick={() => handleAction('overdue_review')} className="text-slate-400 hover:text-sky-300 transition-colors text-[14px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-sky-500/30 hover:bg-sky-500/10 group/btn h-[36px]">
                      <span className="text-[16px] text-sky-400/80 group-hover/btn:text-sky-300 group-hover/btn:scale-110 transition-transform">⏱</span>
                      <span className="font-medium tracking-wide whitespace-nowrap">超期待处理</span>
                    </button>
                    <button onClick={() => handleAction('summary_parttime')} className="text-slate-400 hover:text-sky-300 transition-colors text-[14px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-sky-500/30 hover:bg-sky-500/10 group/btn h-[36px]">
                      <span className="text-[16px] text-sky-400/80 group-hover/btn:text-sky-300 group-hover/btn:scale-110 transition-transform">▤</span>
                      <span className="font-medium tracking-wide whitespace-nowrap">兼职汇总</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 h-[40px]">
                <button onClick={() => handleAction("add_task_root")} title="挂载新的数据源" className="w-[40px] h-[40px] flex items-center justify-center glass-input hover:bg-sky-500/20 hover:text-sky-300 hover:border-sky-500/50 text-slate-400 rounded-xl transition-all text-[20px] font-bold shadow appearance-none">+</button>
                <button onClick={() => handleAction("open_explorer")} title="打开文件所在目录" className="w-[40px] h-[40px] flex items-center justify-center glass-input hover:bg-sky-500/20 hover:border-sky-500/50 text-slate-400 rounded-xl transition-all shadow group border border-sky-500/20 bg-slate-900/50 hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                  <FolderOpen className="w-5 h-5 text-sky-400/80 group-hover:text-white group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex gap-6 px-8 pb-8 pt-4 overflow-hidden min-h-0 relative z-10">
              <div className="flex-[7] min-w-0 flex flex-col h-full rounded-xl overflow-hidden shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] border border-sky-500/10">
                <TerminalPanel logs={logs} />
              </div>
              <div className="flex-[3] min-w-0 flex flex-col h-full rounded-xl overflow-hidden shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] border border-sky-500/10 bg-slate-950/60">
                <RightPanel theme={theme} activeTab={activeTab} config={appConfig} isRunning={isRunning} />
              </div>
            </div>
            
          </section>

        </main>
      </div>
    </div>
  );
}
