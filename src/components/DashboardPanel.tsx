import React from 'react';
import { Theme } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, AlertCircle, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react';

interface DashboardPanelProps {
  theme: Theme;
}

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

export function DashboardPanel({ theme }: DashboardPanelProps) {
  return (
    <div className="w-full h-full flex flex-col gap-6 text-slate-200">
      
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        {STATS.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel-immersive p-6 rounded-2xl border border-sky-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Icon size={64} className={stat.trendUp ? "text-sky-400" : "text-amber-400"} />
              </div>
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-sky-500/20 text-sky-400">
                     <Icon size={20} />
                   </div>
                   <span className="text-slate-400 font-medium text-sm tracking-widest">{stat.label}</span>
                </div>
                <div className="flex items-end gap-3 mt-2">
                  <span className="text-3xl font-display font-black tracking-wider text-sky-50">{stat.value}</span>
                  <span className={`text-sm mb-1 font-mono font-medium ${stat.trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
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
        <div className="col-span-2 glass-panel-immersive rounded-2xl flex flex-col p-6 min-h-0 border border-sky-500/20">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp size={20} className="text-sky-400" />
            <h3 className="text-lg font-medium tracking-widest text-sky-100">核算金额趋势 (近半年)</h3>
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
          
          <div className="flex-1 glass-panel-immersive rounded-2xl p-6 flex flex-col min-h-0 border border-sky-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Activity size={20} className="text-emerald-400" />
              <h3 className="text-[15px] font-medium tracking-widest text-sky-100">近七日问题单分布</h3>
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

          <div className="flex-1 glass-panel-immersive rounded-2xl p-6 flex flex-col min-h-0 border border-sky-500/20">
            <h3 className="text-[15px] font-medium tracking-widest text-sky-100 mb-2">发放状态构成</h3>
            <div className="flex-1 min-h-0 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                 <span className="text-xl font-bold font-display text-sky-50">100</span>
                 <span className="text-[10px] text-slate-400">核算完成</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 mt-2">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-slate-400 tracking-wider font-medium">{item.name}</span>
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
