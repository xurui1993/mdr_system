import React, { useState } from 'react';
import { Theme, TaskHistoryRecord } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, AlertCircle, CheckCircle2, TrendingUp, DollarSign, Cpu, Search, CheckCircle, XCircle, Calculator, FileWarning, WalletCards, Download } from 'lucide-react';
import { useSystemStats } from '../hooks/useSystemStats';

interface DashboardPanelProps {
 theme: Theme;
 onSelectMenu: (menu: string) => void;
 taskStats?: any;
 taskHistory?: TaskHistoryRecord[];
}

const METRIC_CARDS = [
 { id: "core", icon: Calculator, label: "待核算薪资", value: "24", unit: "笔", color: "text-blue-500 light:text-blue-600", bg: "bg-blue-500/10 light:bg-blue-50" },
 { id: "issue_orders", icon: FileWarning, label: "待处理问题单", value: "5", unit: "个", color: "text-amber-500 light:text-amber-600", bg: "bg-amber-500/10 light:bg-amber-50" },
 { id: "salary_bind", icon: WalletCards, label: "待绑定支付", value: "12", unit: "人", color: "text-emerald-500 light:text-emerald-600", bg: "bg-emerald-500/10 light:bg-emerald-50" },
 { id: "export_list", icon: Download, label: "新导出文件", value: "3", unit: "份", color: "text-purple-500 light:text-purple-600", bg: "bg-purple-500/10 light:bg-purple-50" },
 { id: "monitor", icon: Activity, label: "运行中任务", value: "1", unit: "项", color: "text-cyan-500 light:text-cyan-600", bg: "bg-cyan-500/10 light:bg-cyan-50" },
];

const areaData = [
 { name: '1月', amount: 4000 },
 { name: '2月', amount: 3000 },
 { name: '3月', amount: 5000 },
 { name: '4月', amount: 4500 },
 { name: '5月', amount: 6000 },
 { name: '6月', amount: 5500 },
];

const barData = [
 { name: '周一', count: 12 },
 { name: '周二', count: 19 },
 { name: '周三', count: 15 },
 { name: '周四', count: 22 },
 { name: '周五', count: 28 },
 { name: '周六', count: 5 },
 { name: '周日', count: 2 },
];

const pieData = [
 { name: '已核算', value: 65, color: '#0ea5e9' },
 { name: '待发放', value: 25, color: '#f59e0b' },
 { name: '异常状态', value: 10, color: '#ef4444' },
];

const STATS = [
 { label: '本月核算总额', value: '¥ 124,500', icon: DollarSign, trend: '+12.5%', trendUp: true },
 { label: '处理总人数', value: '1,284', icon: Users, trend: '+5.2%', trendUp: true },
 { label: '异常打款拦截', value: '23', icon: AlertCircle, trend: '-2.1%', trendUp: false },
 { label: '发薪成功率', value: '98.5%', icon: CheckCircle2, trend: '+0.5%', trendUp: true },
];

export function DashboardPanel({ theme, onSelectMenu, taskStats, taskHistory = [] }: DashboardPanelProps) {
 const { latestStats, healthScore } = useSystemStats();
 const [historySearchTerm, setHistorySearchTerm] = useState('');

 const filteredHistory = taskHistory.filter(record => 
 record.name.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
 record.status.toLowerCase().includes(historySearchTerm.toLowerCase())
 );

 let dynamicPieData = [
 { name: '已核算', value: 65, color: '#0ea5e9' },
 { name: '待发放', value: 25, color: '#f59e0b' },
 { name: '异常状态', value: 10, color: '#ef4444' },
 ];

 if (taskStats) {
 const intercepted = taskStats.intercepted || 0;
 const unbound = taskStats.unbound || 0;
 const noPrice = taskStats.no_price || 0;
 const totalProcessed = taskStats.riders || 0;
 
 if (intercepted > 0 || unbound > 0 || noPrice > 0) {
 dynamicPieData = [
 { name: '核验通过', value: Math.max(1, totalProcessed - intercepted - unbound - noPrice), color: '#10b981' },
 ];
 if (intercepted > 0) dynamicPieData.push({ name: 'ID拦截', value: intercepted, color: '#f43f5e' });
 if (unbound > 0) dynamicPieData.push({ name: '未绑账号', value: unbound, color: '#f59e0b' });
 if (noPrice > 0) dynamicPieData.push({ name: '无单价', value: noPrice, color: '#8b5cf6' });
 }
 }

 const pieTotal = dynamicPieData.reduce((acc, curr) => acc + curr.value, 0);

 return (
 <div className="w-full h-full flex flex-col gap-6 text-slate-200 light:text-slate-800">
 
 {/* Quick Links Row */}
 <div className="grid grid-cols-3 lg:grid-cols-5 gap-4">
 {METRIC_CARDS.map((item) => {
 const Icon = item.icon;
 return (
 <button
 key={item.id}
 onClick={() => onSelectMenu(item.id)}
 className="flex items-center justify-between p-4 light:bg-white light:shadow-sm rounded-2xl border light:border-slate-200 border-sky-500/20 hover:border-sky-400/40 hover:bg-slate-800/30 light:hover:bg-slate-50 transition-all duration-300 text-left group cursor-pointer"
 >
 <div className="flex flex-col gap-1">
 <span className="text-[12px] light:text-slate-500 text-slate-400 tracking-wider font-medium">{item.label}</span>
 <div className="flex items-baseline gap-1">
 <span className="text-2xl font-bold font-display light:text-slate-800 text-slate-100 group-hover:text-cyan-400 light:group-hover:text-indigo-600 transition-colors">{item.value}</span>
 <span className="text-[12px] light:text-slate-500 text-slate-500 font-medium">{item.unit}</span>
 </div>
 </div>
 <div className={`w-10 h-10 shrink-0 rounded-xl ${item.bg} flex items-center justify-center border light:border-slate-200/50 border-white/5 group-hover:scale-110 transition-transform duration-300`}>
 <Icon size={20} className={item.color} />
 </div>
 </button>
 );
 })}
 </div>

 {/* Stats Row */}
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
 {/* Real-time Health Score Card */}
 <button onClick={() => onSelectMenu('monitor')} className="text-left light:bg-white light:shadow-sm p-6 rounded-2xl border light:border-slate-200 border-sky-500/20 relative overflow-hidden group hover:border-cyan-400 hover:bg-cyan-500/5 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cursor-pointer">
 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
 <Cpu size={64} className={healthScore > 80 ? "text-emerald-400" : healthScore > 50 ? "text-amber-400" : "text-rose-400"} />
 </div>
 <div className="relative z-10 flex flex-col gap-2">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center border light:border-slate-200 border-sky-500/20 group-hover:border-cyan-400/50 light:text-cyan-600 text-cyan-400 light:font-bold transition-colors">
 <span className="relative flex h-3 w-3">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
 </span>
 </div>
 <span className="light:text-slate-700 text-slate-400 font-medium text-sm tracking-widest group-hover:light:text-cyan-600 text-cyan-400 light:font-bold transition-colors">系统健康分</span>
 </div>
 <div className="flex items-end gap-3 mt-2">
 <span className={`text-3xl font-display font-black tracking-wider ${healthScore > 80 ? 'text-emerald-400' : healthScore > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
 {healthScore}
 </span>
 <span className="text-sm mb-1 font-mono font-medium light:text-slate-700 text-slate-400">
 CPU: {latestStats.sysCpu?.toFixed(0)||0}%
 </span>
 </div>
 </div>
 </button>

 {STATS.map((stat, idx) => {
 const Icon = stat.icon;
 return (
 <div key={idx} className="light:bg-white light:shadow-sm p-6 rounded-2xl border light:border-slate-200 border-sky-500/20 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
 <Icon size={64} className={stat.trendUp ? "light:text-sky-600 text-sky-400" : "text-amber-400"} />
 </div>
 <div className="relative z-10 flex flex-col gap-2">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-slate-800/50 light:bg-slate-50 flex items-center justify-center border light:border-slate-200 border-sky-500/20 light:text-sky-600 text-sky-400">
 <Icon size={20} />
 </div>
 <span className="light:text-slate-700 text-slate-400 font-medium text-sm tracking-widest">{stat.label}</span>
 </div>
 <div className="flex items-end gap-3 mt-2">
 <span className="text-3xl font-display font-black tracking-wider text-sky-50 light:text-slate-800">{stat.value}</span>
 <span className={`text-sm mb-1 font-mono font-medium ${stat.trendUp ? 'text-emerald-500 light:text-emerald-600' : 'text-rose-400 light:text-rose-500'}`}>
 {stat.trend}
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>

 <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
 
 {/* Main Chart */}
 <div className="col-span-2 light:bg-white light:shadow-sm rounded-2xl flex flex-col p-6 min-h-0 border light:border-slate-200 border-sky-500/20">
 <div className="flex items-center gap-3 mb-6">
 <TrendingUp size={20} className="light:text-sky-600 text-sky-400" />
 <h3 className="text-lg font-medium tracking-widest text-sky-100 light:text-slate-800">核算金额趋势 (近半年)</h3>
 </div>
 <div className="flex-1 min-h-0 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
 <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
 <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} />
 <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v}`} />
 <Tooltip 
 contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px', color: '#e2e8f0' }}
 itemStyle={{ color: '#bae6fd' }}
 />
 <Area type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#0284c7', strokeWidth: 2 }} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Side Charts */}
 <div className="col-span-1 flex flex-col gap-6 min-h-0">
 
 <div className="flex-1 light:bg-white light:shadow-sm rounded-2xl p-6 flex flex-col min-h-0 border light:border-slate-200 border-sky-500/20">
 <div className="flex items-center gap-3 mb-4">
 <Activity size={20} className="text-emerald-400" />
 <h3 className="text-[15px] font-medium tracking-widest text-sky-100 light:text-slate-800">近七日问题单分布</h3>
 </div>
 <div className="flex-1 min-h-0 w-full mt-2">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
 <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 11}} tickLine={false} axisLine={false} />
 <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 11}} tickLine={false} axisLine={false} />
 <Tooltip 
 cursor={{fill: '#1e293b', opacity: 0.4}}
 contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px' }}
 />
 <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={24} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 <div className="flex-1 light:bg-white light:shadow-sm rounded-2xl p-6 flex flex-col min-h-[160px] border light:border-slate-200 border-sky-500/20">
 <h3 className="text-[15px] font-medium tracking-widest text-sky-100 light:text-slate-800 mb-2">最新异常状态拦截池分解</h3>
 <div className="flex-1 min-h-0 w-full relative">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={dynamicPieData}
 cx="50%"
 cy="50%"
 innerRadius={45}
 outerRadius={65}
 paddingAngle={5}
 dataKey="value"
 stroke="none"
 >
 {dynamicPieData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip 
 contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px' }}
 />
 </PieChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
 <span className="text-xl font-bold font-display text-sky-50 light:text-slate-800">{pieTotal}</span>
 <span className="text-[10px] light:text-slate-700 text-slate-400">总样本数据</span>
 </div>
 </div>
 
 <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
 {dynamicPieData.map((item, idx) => (
 <div key={idx} className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
 <span className="text-xs light:text-slate-700 text-slate-400 tracking-wider font-medium">{item.name}</span>
 </div>
 ))}
 </div>

 </div>

 </div>
 </div>


 </div>
 );
}
