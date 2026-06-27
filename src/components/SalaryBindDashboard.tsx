import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Theme, AppConfig } from '../types';
import { motion } from 'motion/react';
import { Zap, Folder, Landmark, Navigation, Building, Building2, Castle, Compass, Map as MapIcon, MapPin, Mountain, Tent, Trees, TreePine, Waves, Anchor, Ship, Train, Plane, Car, Bus, Palmtree, Snowflake, Sun, Moon, Cloud, Umbrella, Star, MapPinned, Flag, Rocket } from 'lucide-react';

interface StationStats {
 station_name: string;
 total_riders: number;
 total_orders: number;
 fengshen_bind_rate: string;
 shangyi_bind_rate: string;
 black_count: number;
}

interface CityStats {
 total_riders: number;
 total_orders: number;
 fengshen_bind_rate: string;
 shangyi_bind_rate: string;
 black_count: number;
 stations: StationStats[];
}

export interface SalaryBindStatsData {
 overall: {
 total_riders: number;
 total_orders: number;
 fengshen_bind_rate: string;
 shangyi_bind_rate: string;
 black_count: number;
 fengshen_bind_count: number;
 shangyi_bind_count: number;
 };
 cities: {
 [city: string]: CityStats;
 };
}

interface Props {
 theme: Theme;
 stats?: SalaryBindStatsData | null;
 isRunning?: boolean;
 onRun?: () => void;
 config?: AppConfig;
 onAction?: (action: string) => void;
 progress?: number;
}

const EMPTY_STATS: SalaryBindStatsData = {
 overall: { total_riders: 0, total_orders: 0, fengshen_bind_rate: "0.0%", shangyi_bind_rate: "0.0%", black_count: 0, fengshen_bind_count: 0, shangyi_bind_count: 0 },
 cities: {}
};

const getCityZodiac = (index: number) => {
  const zodiacs = ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐎', '🐏', '🐒', '🐓', '🐕', '🐖'];
  return zodiacs[index % zodiacs.length];
};

export function SalaryBindDashboard({ theme, stats, isRunning, onRun, config, onAction, progress }: Props) {
 const [selectedCity, setSelectedCity] = useState<string>('业务城市');
 const [elapsedMs, setElapsedMs] = useState(0);

 const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 const handleMouseEnter = useCallback((city: string) => {
   if (hoverTimeoutRef.current) {
     clearTimeout(hoverTimeoutRef.current);
   }
   hoverTimeoutRef.current = setTimeout(() => {
     setSelectedCity(city);
   }, 200);
 }, []);

 const handleMouseLeave = useCallback(() => {
   if (hoverTimeoutRef.current) {
     clearTimeout(hoverTimeoutRef.current);
   }
 }, []);

 useEffect(() => {
 let animationFrameId: number;
 let startTime: number;

 if (isRunning) {
 setElapsedMs(0);
 startTime = Date.now();
 const updateTimer = () => {
 setElapsedMs(Date.now() - startTime);
 animationFrameId = requestAnimationFrame(updateTimer);
 };
 animationFrameId = requestAnimationFrame(updateTimer);
 }

 return () => {
 if (animationFrameId) {
 cancelAnimationFrame(animationFrameId);
 }
 };
 }, [isRunning]);

 const formatStopwatch = (ms: number) => {
 const minutes = Math.floor(ms / 60000).toString().padStart(2, '0');
 const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
 const centiseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
 return `${minutes}:${seconds}.${centiseconds}`;
 };

 const displayStats = stats || EMPTY_STATS;
 const cityNames = Object.keys(displayStats.cities);
 
 const StatCard = ({ title, value, unit, highlight }: { title: string, value: string | number, unit?: string, highlight?: boolean }) => (
 <div className={`p-5 rounded-xl border ${highlight ? 'bg-indigo-500/10 light:bg-indigo-50 border-indigo-500/20 light:border-indigo-100' : 'bg-slate-900/40 light:bg-white border-slate-700/50 light:border-slate-200'} flex flex-col justify-center relative overflow-hidden transition-all duration-200`}>
 <div className="text-[13px] text-slate-400 light:text-slate-500 font-bold tracking-widest mb-3 relative z-10 flex items-center gap-2">
 {highlight && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
 {title}
 </div>
 <div className={`text-4xl font-black font-mono tracking-tight relative z-10 ${highlight ? 'text-indigo-400 light:text-indigo-600' : 'text-slate-100 light:text-slate-800 font-medium'}`}>
 {value} <span className="text-[16px] text-slate-500 light:text-slate-400 font-bold ml-1">{unit}</span>
 </div>
 </div>
 );

 return (
 <div className="bg-slate-950/40 light:bg-slate-50 flex flex-col h-full w-full shrink-0 p-6 relative overflow-hidden">
 <div className="relative z-10 flex flex-col h-full">
 {/* Controls Section */}
 {config && onAction && onRun && (
 <div className="flex items-center gap-4 mb-6 shrink-0 bg-slate-900/60 light:bg-white p-4 rounded-xl border border-slate-700/50 light:border-slate-200 shadow-sm relative overflow-hidden">
 
 
 <div className="flex-1 flex items-center bg-slate-950/60 light:bg-slate-50 rounded-lg border border-slate-700/50 light:border-slate-200 h-10 overflow-hidden px-4 relative z-10 transition-colors">
 <Folder className="w-5 h-5 light:text-sky-600 text-sky-400 mr-3 shrink-0" />
 <input type="text" readOnly placeholder="未载入数据源，请选择目标文件夹" value={config.salaryBindSourcePath || ''} className="flex-1 bg-transparent border-none outline-none font-mono text-[13px] text-sky-100 light:text-slate-800 tracking-wide truncate placeholder-sky-700/50 light:placeholder-slate-400" />
 <button onClick={() => onAction("open_source_salary_bind")} className="px-5 py-1.5 bg-sky-500/20 light:bg-white hover:bg-sky-500/40 light:hover:bg-slate-50 rounded-lg text-[13px] font-bold light:text-slate-700 text-sky-300 hover:light:text-slate-900 text-white transition-all shrink-0 ml-3 border border-sky-500/40 light:border-slate-200 shadow-[0_0_10px_rgba(14,165,233,0.2)] light:shadow-sm">
 选择目录
 </button>
 </div>
 
 <div className="flex items-center gap-4 shrink-0 h-10 px-5 bg-slate-950/60 light:bg-slate-50 rounded-lg border border-slate-700/50 light:border-slate-200 shadow-sm relative z-10">
 <span className="relative flex h-2.5 w-2.5">
 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRunning ? 'bg-purple-400' : 'bg-emerald-400'}`}></span>
 <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
 </span>
 <span className="text-slate-200 light:text-slate-800 font-mono text-[15px] font-bold tracking-widest min-w-[75px] text-center">
 {formatStopwatch(elapsedMs)}
 </span>
 </div>

 <button 
 onClick={onRun} 
 disabled={isRunning}
 className={`h-11 px-8 rounded-xl font-bold tracking-widest flex items-center justify-center gap-3 transition-all shrink-0 border relative overflow-hidden z-10 ${
 isRunning 
 ? 'bg-gradient-to-r from-sky-500/10 to-purple-500/10 light:text-slate-500 text-sky-400 border-sky-500/30 light:border-slate-200 cursor-wait' 
 : 'bg-gradient-to-r from-sky-600 to-sky-500 light:from-white light:to-white light:text-slate-700 text-white border-sky-400 light:border-slate-200 hover:from-sky-500 hover:to-sky-400 light:hover:from-slate-50 light:hover:to-slate-50 shadow-[0_0_20px_rgba(14,165,233,0.4)] light:shadow-sm'
 }`}
 >
 {isRunning && (
 <div 
 className="absolute left-0 top-0 h-full bg-gradient-to-r from-sky-500/30 to-purple-500/30 transition-all duration-300"
 style={{ width: `${progress || 0}%` }}
 />
 )}
 <span className="relative z-10 flex items-center gap-2">
 {isRunning ? <><Zap className="w-5 h-5 animate-pulse text-purple-400" /> 执行中</> : <><Zap className="w-5 h-5" /> 启动绑定任务</>}
 </span>
 </button>
 </div>
 )}

 {/* Header Section */}
 <div className="flex items-center justify-between mb-6 shrink-0 relative">
 <div className="flex gap-2 p-1.5 rounded-xl bg-slate-900/60 border light:border-slate-200 border-white/5 max-w-full overflow-x-auto no-scrollbar shadow-inner after:content-[''] after:w-2 after:block after:shrink-0">
 <button
  onMouseEnter={() => handleMouseEnter('业务城市')}
 onMouseLeave={handleMouseLeave}
 className={`shrink-0 px-6 py-2 min-h-[38px] flex items-center justify-center rounded-lg font-bold tracking-widest text-[13px] transition-all whitespace-nowrap ${
 selectedCity === '业务城市'
 ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)] drop-shadow-md'
 : 'bg-transparent border border-transparent light:text-slate-700 text-slate-400 hover:light:text-sky-700 text-sky-300 light:hover:bg-black/5 hover:bg-white/5 hover:border-white/10'
 }`}
 >
 业务城市 ({cityNames.length})
 </button>
 {cityNames.map(city => (
 <button
 key={city}
 onMouseEnter={() => handleMouseEnter(city)}
 onMouseLeave={handleMouseLeave}
 className={`shrink-0 px-6 py-2 min-h-[38px] flex items-center justify-center rounded-lg font-bold tracking-widest text-[13px] transition-all whitespace-nowrap ${
 selectedCity === city
 ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.15)] drop-shadow-md'
 : 'bg-transparent border border-transparent light:text-slate-700 text-slate-400 hover:light:text-sky-700 text-sky-300 light:hover:bg-black/5 hover:bg-white/5 hover:border-white/10'
 }`}
 >
 {city} {displayStats.cities[city]?.total_orders > 0 ? `(${displayStats.cities[city].total_orders})` : ''}
 </button>
 ))}
 </div>
 <div className="flex items-center gap-3">
 {config?.issueCycle && (
 <div className="flex items-center gap-2 text-[12px] light:text-indigo-600 text-indigo-300 font-bold tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-lg border light:border-indigo-200 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
 绑定月份: {config.issueCycle}
 </div>
 )}
 {(!stats) && (
 <div className="flex items-center gap-2 text-[12px] light:text-sky-600 text-sky-400 font-mono tracking-widest bg-sky-500/10 px-3 py-1.5 rounded-lg border light:border-slate-200 border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.1)]">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
 </span>
 config.xlsx 数据预览
 </div>
 )}
 </div>
 </div>

 {/* Content Area */}
 {selectedCity === '业务城市' ? (
 <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-2 pb-4">
 {/* Top Overview Cards */}
 <div className="grid grid-cols-5 gap-5 shrink-0">
 <StatCard title="骑手总人数" value={displayStats.overall.total_riders} unit="人" />
 <StatCard title="全国总单量" value={displayStats.overall.total_orders} unit="单" />
 <StatCard title="风神绑定率" value={displayStats.overall.fengshen_bind_rate} highlight />
 <StatCard title="全国商翼绑定" value={displayStats.overall.shangyi_bind_rate} highlight />
 <StatCard title="黑户代领人数" value={displayStats.overall.black_count} unit="人" />
 </div>
 
 <div className="mt-8 pb-3 text-[15px] font-bold light:text-slate-800 text-slate-300 light:font-medium tracking-[0.2em] font-mono border-b light:border-slate-200 border-sky-500/20 flex items-center">
 <div className="w-1.5 h-4 bg-sky-500 rounded-full mr-3 shadow-[0_0_8px_rgba(14,165,233,0.8)]"></div>
 各城市绑定详情
 </div>
 
 {cityNames.length === 0 ? (
 <div className="h-[200px] w-full flex flex-col items-center justify-center border border-dashed light:border-slate-200 border-sky-500/20 rounded-2xl bg-slate-900/20 light:text-slate-600 text-slate-500 font-mono tracking-widest">
 暂无城市数据
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-6">
 {cityNames.map((city, index) => {
 const cStats = displayStats.cities[city];
 return (
 <div key={city} onClick={() => setSelectedCity(city)} className="bg-gradient-to-br from-slate-800/80 to-slate-900/90 light:bg-none light:bg-white border light:border-slate-200 border-sky-500/20 rounded-2xl p-6 flex flex-col gap-5 transition-all duration-500 cursor-pointer group shadow-[0_8px_30px_rgba(0,0,0,0.2)] light:shadow-sm hover:shadow-[0_12px_40px_rgba(14,165,233,0.25)] light:hover:shadow-md hover:border-sky-400/60 hover:-translate-y-2 relative overflow-hidden z-10 hover:z-20">
 <div className="absolute -right-10 -top-10 w-40 h-40 bg-sky-500/10 rounded-full blur-[40px] group-hover:bg-sky-500/30 group-hover:scale-150 transition-all duration-700 pointer-events-none"></div>
 
 {/* Watermark/Icon Background */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-[0.06] light:group-hover:opacity-[0.08] group-hover:animate-zodiac transition-opacity duration-700 pointer-events-none origin-bottom-right font-black text-[140px] leading-none select-none">
                {getCityZodiac(index)}
              </div>
 
 
 <div className="light:text-slate-800 text-sky-300 font-bold tracking-[0.2em] text-[18px] flex items-center relative z-10 border-b light:border-slate-200 border-sky-500/20 pb-4 h-11">
 <div className="flex items-center gap-2">
 <Navigation className="w-5 h-5 text-sky-500 shrink-0" />
 <span className="truncate whitespace-nowrap">{city}</span>
 <span className="text-[12px] tracking-normal font-normal font-sans ml-1 bg-slate-800/50 light:bg-slate-100 text-slate-400 light:text-slate-500 px-2 py-0.5 rounded-full border border-slate-700/50 light:border-slate-200 shadow-inner transition-opacity duration-300 group-hover:opacity-0 group-hover:invisible">
 {cStats.stations.length}
 </span>
 </div>
 <span className="absolute right-0 light:text-sky-600 text-sky-300 border border-transparent group-hover:border-sky-500/40 px-3 py-1 rounded-md transition-all duration-300 text-[12px] font-normal translate-x-4 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 bg-sky-500/10 shadow-[0_0_10px_rgba(14,165,233,0.1)] whitespace-nowrap pointer-events-none group-hover:pointer-events-auto">进入详情页 →</span>
 </div>
 <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[14px] font-mono relative z-10">
 <div className="flex flex-col"><span className="light:text-slate-700 text-slate-400 text-[12px] mb-1">骑手人数</span><span className="light:text-slate-900 text-slate-100 font-medium text-[20px] font-bold">{cStats.total_riders}</span></div>
 <div className="flex flex-col"><span className="light:text-slate-700 text-slate-400 text-[12px] mb-1">总单量</span><span className="light:text-slate-900 text-slate-100 font-medium text-[20px] font-bold">{cStats.total_orders}</span></div>
 <div className="flex flex-col"><span className="light:text-slate-700 text-slate-400 text-[12px] mb-1">风神绑定率</span><span className="light:text-sky-600 text-sky-400 font-bold text-[20px]">{cStats.fengshen_bind_rate}</span></div>
 <div className="flex flex-col"><span className="light:text-slate-700 text-slate-400 text-[12px] mb-1">商翼绑定率</span><span className="text-purple-400 font-bold text-[20px]">{cStats.shangyi_bind_rate}</span></div>
 <div className="flex flex-col"><span className="light:text-slate-700 text-slate-400 text-[12px] mb-1">黑户代领</span><span className="light:text-slate-900 text-slate-100 font-medium text-[20px] font-bold">{cStats.black_count}</span></div>
 <div className="flex flex-col"><span className="light:text-slate-700 text-slate-400 text-[12px] mb-1">绑定总人数</span><span className="light:text-slate-900 text-slate-100 font-medium text-[20px] font-bold">{Math.round(cStats.total_riders * parseFloat(cStats.fengshen_bind_rate) / 100) + Math.round(cStats.total_riders * parseFloat(cStats.shangyi_bind_rate) / 100)}</span></div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 ) : (
 <div className="flex-1 overflow-hidden flex flex-col pr-2 pb-4">
 {displayStats.cities[selectedCity] && (
 <>
 <div className="grid grid-cols-5 gap-5 shrink-0 mb-6 relative z-10">
 <StatCard title={`${selectedCity} - 总骑手`} value={displayStats.cities[selectedCity].total_riders} unit="人" />
 <StatCard title="城市总单量" value={displayStats.cities[selectedCity].total_orders} unit="单" />
 <StatCard title="城市风神绑定" value={displayStats.cities[selectedCity].fengshen_bind_rate} highlight />
 <StatCard title="城市商翼绑定" value={displayStats.cities[selectedCity].shangyi_bind_rate} highlight />
 <StatCard title="城市黑户代领" value={displayStats.cities[selectedCity].black_count} unit="人" />
 </div>
 
 <div className="w-full flex-1 flex flex-col min-h-0 bg-slate-900/40 rounded-2xl border light:border-slate-200 border-white/5 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative z-10 ">
 <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 text-[12px] light:text-slate-700 text-slate-400 tracking-widest font-bold py-4 px-6 border-b border-white/10 bg-slate-950/80 shrink-0 uppercase">
 <div className="pr-4">站点名称</div>
 <div className="text-center">骑手人数</div>
 <div className="text-center">总单量</div>
 <div className="text-center">风神绑定率</div>
 <div className="text-center">商翼绑定率</div>
 <div className="text-center">黑户代领</div>
 <div className="text-center">绑定总人数</div>
 </div>
 <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2 relative">
 {displayStats.cities[selectedCity].stations.map(station => {
 const fsRate = parseFloat(station.fengshen_bind_rate);
 const syRate = parseFloat(station.shangyi_bind_rate);
 
 return (
 <div key={station.station_name} className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 text-[14px] font-mono px-4 py-3.5 bg-slate-800/20 light:hover:bg-slate-200 hover:bg-slate-800/60 rounded-xl border light:border-slate-200 border-white/5 hover:light:border-slate-200 border-sky-500/20 transition-all duration-300 items-center group relative overflow-hidden">
 <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-sky-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className="light:text-slate-900 text-slate-100 font-medium font-bold pr-2 group-hover:light:text-sky-700 text-sky-300 transition-colors break-all leading-tight drop-shadow-sm">{station.station_name}</div>
 <div className="text-center light:text-slate-800 text-slate-300 light:font-medium font-bold">{station.total_riders}</div>
 <div className="text-center text-sky-200 font-bold">{station.total_orders}</div>
 <div className="text-center flex justify-center">
 <span className={`px-2.5 py-0.5 rounded-md text-[13px] font-bold tracking-tight shadow-inner ${fsRate >= 100 ? 'bg-sky-500/20 light:text-sky-700 text-sky-300 border border-sky-500/30' : 'bg-slate-800 light:text-slate-800 text-slate-300 light:font-medium border light:border-slate-200 border-slate-700'}`}>
 {station.fengshen_bind_rate}
 </span>
 </div>
 <div className="text-center flex justify-center">
 <span className={`px-2.5 py-0.5 rounded-md text-[13px] font-bold tracking-tight shadow-inner ${syRate >= 100 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 light:text-slate-800 text-slate-300 light:font-medium border light:border-slate-200 border-slate-700'}`}>
 {station.shangyi_bind_rate}
 </span>
 </div>
 <div className="text-center light:text-slate-700 text-slate-400 font-bold">{station.black_count}</div>
 <div className="text-center light:text-slate-900 text-slate-100 font-bold">{Math.round(station.total_riders * parseFloat(station.fengshen_bind_rate) / 100) + Math.round(station.total_riders * parseFloat(station.shangyi_bind_rate) / 100)}</div>
 </div>
 );
 })}
 </div>
 </div>
 </>
 )}
 </div>
 )}
 </div>
 </div>
 );
}

