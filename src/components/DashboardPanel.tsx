import React from 'react';
import { Theme } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Activity, Users, AlertCircle, CheckCircle2, TrendingUp, DollarSign, Briefcase, FileWarning, HelpCircle } from 'lucide-react';

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

const reissueData = [
  { name: 'W1', issues: 4, resolved: 3 },
  { name: 'W2', issues: 7, resolved: 5 },
  { name: 'W3', issues: 3, resolved: 3 },
  { name: 'W4', issues: 9, resolved: 7 },
];

const STATS = [
  { label: '本月核算总额', value: '¥ 124,500', icon: DollarSign, trend: '+12.5%', trendUp: true, desc: '兼职薪资核算' },
  { label: '处理总人数', value: '1,284', icon: Users, trend: '+5.2%', trendUp: true, desc: '发薪工具绑定' },
  { label: '问题单发现', value: '45', icon: FileWarning, trend: '+12.1%', trendUp: false, desc: '问题单生成' },
  { label: '发薪成功率', value: '98.5%', icon: CheckCircle2, trend: '+0.5%', trendUp: true, desc: '整体指标' },
];

export function DashboardPanel({ theme }: DashboardPanelProps) {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar">
        <div className="flex flex-col gap-6 text-slate-200 min-h-max">
        
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="glass-panel-immersive p-6 rounded-2xl border border-sky-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Icon size={64} className={stat.trendUp ? "text-sky-400" : "text-amber-400"} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-sky-500/20 text-sky-400">
                          <Icon size={20} />
                        </div>
                        <span className="text-slate-400 font-medium text-sm tracking-widest">{stat.label}</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-3 mt-2">
                      <span className="text-3xl font-display font-black tracking-wider text-sky-50">{stat.value}</span>
                      <span className={`text-sm mb-1 font-mono font-medium ${stat.trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stat.trend}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 font-medium tracking-wider">关联模块: <span className="text-sky-400/80">{stat.desc}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Chart */}
            <div className="lg:col-span-2 glass-panel-immersive rounded-2xl flex flex-col p-6 h-[400px] border border-sky-500/20">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp size={20} className="text-sky-400" />
                <h3 className="text-lg font-medium tracking-widest text-sky-100">核算金额趋势 (近半年)</h3>
                <span className="ml-auto text-xs text-sky-500/80 uppercase tracking-widest border border-sky-500/30 px-3 py-1 rounded-full bg-sky-500/10">兼职核算模块</span>
              </div>
              <div className="flex-1 w-full">
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
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px', color: '#e2e8f0' }}
                      itemStyle={{ color: '#bae6fd' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#0284c7', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Side Charts */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              <div className="glass-panel-immersive rounded-2xl p-6 flex flex-col h-[188px] border border-emerald-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <Activity size={20} className="text-emerald-400" />
                  <h3 className="text-[15px] font-medium tracking-widest text-emerald-100">近七日问题单分布</h3>
                  <span className="ml-auto text-[10px] text-emerald-500/80 uppercase tracking-widest border border-emerald-500/30 px-2 py-0.5 rounded-full bg-emerald-500/10">问题单模块</span>
                </div>
                <div className="flex-1 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 11}} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 11}} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        cursor={{fill: '#1e293b', opacity: 0.4}}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel-immersive rounded-2xl p-6 flex flex-col h-[188px] border border-amber-500/20">
                <div className="flex items-center gap-3 mb-2">
                   <h3 className="text-[15px] font-medium tracking-widest text-amber-100">发放状态构成</h3>
                   <span className="ml-auto text-[10px] text-amber-500/80 uppercase tracking-widest border border-amber-500/30 px-2 py-0.5 rounded-full bg-amber-500/10">发薪记录</span>
                </div>
                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                    <span className="text-xl font-bold font-display text-amber-50">100</span>
                    <span className="text-[10px] text-slate-400">核算完成</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Third Row: Additional Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
             <div className="glass-panel-immersive rounded-2xl p-6 flex flex-col h-[300px] border border-indigo-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase size={20} className="text-indigo-400" />
                  <h3 className="text-[15px] font-medium tracking-widest text-indigo-100">补发跟进走势</h3>
                  <span className="ml-auto text-[10px] text-indigo-400/80 uppercase tracking-widest border border-indigo-500/30 px-2 py-0.5 rounded-full bg-indigo-500/10">薪资补发记录</span>
                </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reissueData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 11}} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 11}} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="issues" name="产生问题" stroke="#818cf8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="resolved" name="已解决" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="glass-panel-immersive rounded-2xl p-6 flex flex-col h-[300px] border border-rose-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <HelpCircle size={20} className="text-rose-400" />
                  <h3 className="text-[15px] font-medium tracking-widest text-rose-100">异常离职类型监控</h3>
                  <span className="ml-auto text-[10px] text-rose-400/80 uppercase tracking-widest border border-rose-500/30 px-2 py-0.5 rounded-full bg-rose-500/10">异常离职分析</span>
                </div>
                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: '自动离职', count: 12 },
                      { name: '未满要求', count: 8 },
                      { name: '违规开除', count: 3 },
                      { name: '平台解约', count: 5 }
                    ]} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 11}} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{fill: '#cbd5e1', fontSize: 12}} tickLine={false} axisLine={false} width={80} />
                      <RechartsTooltip 
                        cursor={{fill: '#1e293b', opacity: 0.4}}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" fill="#fb7185" radius={[0, 4, 4, 0]} barSize={20}>
                        {
                          [12, 8, 3, 5].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#fb7185', '#f43f5e', '#e11d48', '#be123c'][index % 4]} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
