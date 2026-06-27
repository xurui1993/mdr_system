import React, { useEffect, useRef } from "react";
import {
 LineChart,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 Legend,
 ReferenceLine
} from "recharts";
import { useSystemStats } from "../hooks/useSystemStats";

export function TaskMonitor({ isRunning }: { isRunning?: boolean }) {
 const { data, latestStats } = useSystemStats();
 
 const prevIsRunning = useRef(isRunning);

 useEffect(() => {
 if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
 Notification.requestPermission();
 }
 }, []);

 useEffect(() => {
 if (prevIsRunning.current && !isRunning) {
 if ('Notification' in window && Notification.permission === 'granted') {
 new Notification("任务已完成", {
 body: "系统引擎执行完毕，请查看最新生成的文件",
 icon: "/vite.svg"
 });
 }
 }
 prevIsRunning.current = isRunning;
 }, [isRunning]);

 return (
 <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
 <div className="max-w-6xl mx-auto space-y-6">
 <h2 className="text-2xl font-bold light:text-slate-900 text-slate-100 font-medium flex items-center gap-3">
 <span className="light:text-cyan-600 text-cyan-400 light:font-bold text-3xl">∿</span>
 实时任务监控 (Python Engine)
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 
 {/* CPU Chart Panel */}
 <div className="light:bg-white light:shadow-sm p-6 rounded-2xl border light:border-slate-200 border-sky-500/20 bg-slate-900/60 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
 <h3 className="text-lg font-medium text-cyan-50 mb-4 flex items-center">
 <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-2 animate-pulse"></span>
 系统与引擎 CPU 占用 (%)
 </h3>
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
 <defs>
 <linearGradient id="colorSysCpu" x1="0" y1="0" x2="0" y2="1">
 <stop offset="20%" stopColor="#ef4444" stopOpacity={1} />
 <stop offset="20%" stopColor="#38bdf8" stopOpacity={1} />
 </linearGradient>
 <linearGradient id="colorProcCpu" x1="0" y1="0" x2="0" y2="1">
 <stop offset="20%" stopColor="#ef4444" stopOpacity={1} />
 <stop offset="20%" stopColor="#f472b6" stopOpacity={1} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
 <XAxis 
 dataKey="time" 
 stroke="#475569" 
 tick={{ fill: "#64748b", fontSize: 12 }} 
 tickMargin={10} 
 />
 <YAxis 
 stroke="#475569" 
 domain={[0, 100]} 
 tick={{ fill: "#64748b", fontSize: 12 }} 
 />
 <Tooltip 
 contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", borderRadius: '8px' }}
 itemStyle={{ color: "#e2e8f0" }}
 />
 <Legend wrapperStyle={{ paddingTop: "10px" }} />
 <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '80% 危险水位', fill: '#ef4444', fontSize: 12 }} />
 <Line 
 type="monotone" 
 name="系统总CPU"
 dataKey="sysCpu" 
 stroke="url(#colorSysCpu)" 
 strokeWidth={2}
 dot={false}
 activeDot={{ r: 4 }}
 />
 <Line 
 type="monotone" 
 name="Python进程CPU"
 dataKey="procCpu" 
 stroke="url(#colorProcCpu)" 
 strokeWidth={2}
 dot={false}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Memory Chart Panel */}
 <div className="light:bg-white light:shadow-sm p-6 rounded-2xl border light:border-slate-200 border-sky-500/20 bg-slate-900/60 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
 <h3 className="text-lg font-medium text-purple-50 mb-4 flex items-center">
 <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-2 animate-pulse"></span>
 系统内存 (%) 与 引擎内存 (MB)
 </h3>
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
 <defs>
 <linearGradient id="colorSysMem" x1="0" y1="0" x2="0" y2="1">
 <stop offset="20%" stopColor="#ef4444" stopOpacity={1} />
 <stop offset="20%" stopColor="#a78bfa" stopOpacity={1} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
 <XAxis 
 dataKey="time" 
 stroke="#475569" 
 tick={{ fill: "#64748b", fontSize: 12 }}
 tickMargin={10}
 />
 {/* Left Y Axis for Percentage */}
 <YAxis 
 yAxisId="left"
 stroke="#475569" 
 domain={[0, 100]} 
 tick={{ fill: "#64748b", fontSize: 12 }} 
 />
 {/* Right Y Axis for MB */}
 <YAxis 
 yAxisId="right"
 orientation="right"
 stroke="#475569" 
 tick={{ fill: "#64748b", fontSize: 12 }} 
 />
 <Tooltip 
 contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", borderRadius: '8px' }}
 itemStyle={{ color: "#e2e8f0" }}
 />
 <Legend wrapperStyle={{ paddingTop: "10px" }} />
 <ReferenceLine yAxisId="left" y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '80% 危险水位', fill: '#ef4444', fontSize: 12 }} />
 <Line 
 yAxisId="left"
 type="monotone" 
 name="系统总内存(%)"
 dataKey="sysMemRatio" 
 stroke="url(#colorSysMem)" 
 strokeWidth={2}
 dot={false}
 activeDot={{ r: 4 }}
 />
 <Line 
 yAxisId="right"
 type="monotone" 
 name="Python进程内存(MB)"
 dataKey="procMem" 
 stroke="#34d399" 
 strokeWidth={2}
 dot={false}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 </div>
 
 {/* Current status summary cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
 <div className="light:bg-white light:shadow-sm p-4 rounded-xl border light:border-slate-200 border-sky-500/10 bg-slate-900/40">
 <div className="text-sm light:text-slate-700 text-slate-400 mb-1">系统 CPU</div>
 <div className="text-2xl font-mono light:text-sky-600 text-sky-400">
 {latestStats.sysCpu?.toFixed(1) || "0.0"}%
 </div>
 </div>
 <div className="light:bg-white light:shadow-sm p-4 rounded-xl border border-pink-500/10 bg-slate-900/40">
 <div className="text-sm light:text-slate-700 text-slate-400 mb-1">引擎 CPU</div>
 <div className="text-2xl font-mono text-pink-400">
 {latestStats.procCpu?.toFixed(1) || "0.0"}%
 </div>
 </div>
 <div className="light:bg-white light:shadow-sm p-4 rounded-xl border border-purple-500/10 bg-slate-900/40">
 <div className="text-sm light:text-slate-700 text-slate-400 mb-1">系统内存</div>
 <div className="text-2xl font-mono text-purple-400">
 {latestStats.sysMemRatio?.toFixed(1) || "0.0"}%
 </div>
 </div>
 <div className="light:bg-white light:shadow-sm p-4 rounded-xl border border-emerald-500/10 bg-slate-900/40">
 <div className="text-sm light:text-slate-700 text-slate-400 mb-1">引擎内存</div>
 <div className="text-2xl font-mono text-emerald-400">
 {latestStats.procMem?.toFixed(1) || "0.0"} <span className="text-sm light:text-slate-600 text-slate-500">MB</span>
 </div>
 </div>
 </div>
 
 </div>
 </div>
 );
}
