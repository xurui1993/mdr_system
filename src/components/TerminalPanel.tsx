import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

export function TerminalPanel({ logs, progress = 0, progressText = '', appTheme = 'dark' }: { logs: LogEntry[], progress?: number, progressText?: string, appTheme?: 'light' | 'dark' }) {
 const scrollRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
 }
 }, [logs]);

 const getColor = (level: string, isLast: boolean) => {
 const pulse = isLast ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : '';
 const dropShadowInfo = appTheme === 'light' ? '' : 'drop-shadow-[0_0_2px_rgba(186,230,253,0.3)]';
 const dropShadowSystem = appTheme === 'light' ? '' : 'drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]';
 const dropShadowWarn = appTheme === 'light' ? '' : 'drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]';
 const dropShadowErr = appTheme === 'light' ? '' : 'drop-shadow-[0_0_15px_rgba(225,29,72,0.9)]';
 const dropShadowSucc = appTheme === 'light' ? '' : 'drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]';

 switch(level) {
 case 'INFO': 
 return `${appTheme === 'light' ? 'text-slate-600' : 'text-sky-200/80'} ${dropShadowInfo} ${pulse}`;
 case 'SYSTEM': 
 return `${appTheme === 'light' ? 'text-sky-600' : 'text-sky-300'} ${dropShadowSystem} font-semibold tracking-widest ${pulse}`;
 case 'WARN': 
 return `${appTheme === 'light' ? 'text-amber-600' : 'text-amber-400'} ${dropShadowWarn} font-semibold ${pulse}`;
 case 'ERROR': 
 return `${appTheme === 'light' ? 'text-rose-600' : 'text-rose-500'} ${dropShadowErr} font-bold animate-[pulse_1s_ease-in-out_infinite]`;
 case 'SUCCESS': 
 return `${appTheme === 'light' ? 'text-emerald-600' : 'text-emerald-400'} ${dropShadowSucc} font-bold ${pulse}`;
 default: 
 return `${appTheme === 'light' ? 'text-slate-500' : 'text-sky-500/60'} ${pulse}`;
 }
 }

 const getPrefix = (level: string) => {
 if (level === 'SYSTEM') return '[系统] ';
 if (level === 'INFO') return '[信息] ';
 if (level === 'WARN') return '[警告] ';
 if (level === 'ERROR') return '[错误] ';
 if (level === 'SUCCESS') return '[成功] ';
 return '';
 }

 return (
 <div className={`h-full w-full flex flex-col relative group overflow-hidden ${appTheme === 'light' ? 'bg-slate-50' : 'bg-[#020410]'} rounded-[24px]`}>
 {/* Dynamic CRT Scanline Overlay */}
 {appTheme !== 'light' && (
 <>
 <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] mix-blend-overlay z-20"></div>
 <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-white animate-[pulse_0.1s_ease-in-out_infinite] mix-blend-overlay z-20"></div>
 <div className="absolute top-0 left-0 w-full h-[15%] bg-gradient-to-b from-transparent via-sky-400/5 to-transparent pointer-events-none z-10 animate-[scan_6s_linear_infinite]"></div>
 <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,1)] z-10"></div>
 <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(14,165,233,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.5)_1px,transparent_1px)] bg-[size:40px_40px] z-0"></div>
 </>
 )}

 <div 
 ref={scrollRef}
 className="flex-1 px-6 py-6 font-mono text-[13px] sm:text-[14px] overflow-y-auto overflow-x-hidden relative"
 >
 <div className="relative z-30 flex flex-col gap-1.5 min-h-full pb-4">
 {logs.length === 0 && (
 <div className={`${appTheme === 'light' ? 'text-slate-400' : 'text-sky-800/50'} select-none animate-pulse lowercase tracking-wider`}>
 [sys] waiting for handshake protocol...
 </div>
 )}
 {logs.map((log, i) => (
 <div key={i} className={`whitespace-pre-wrap leading-relaxed transition-all duration-500 ${getColor(log.level, i === logs.length - 1)}`}>
 <span className="opacity-60 mr-2 select-none tracking-tighter">{getPrefix(log.level)}</span>
 {log.text.replace(/^>>>\s*/, '')}
 </div>
 ))}
 {/* Blinking Caret */}
 {logs.length > 0 && (
 <div className={`mt-2 mb-2 h-4 w-2.5 ${appTheme === 'light' ? 'bg-sky-500' : 'bg-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,1)]'} animate-[pulse_0.8s_steps(2,start)_infinite]`}></div>
 )}
 </div>
 </div>

 {/* Futuristic Progress Bar */}
 {progress > 0 && (
 <div className={`w-full shrink-0 relative z-30 ${appTheme === 'light' ? 'bg-white border-slate-200' : 'bg-[#010308]/90 border-sky-500/20'} border-t px-6 py-3 `}>
 <div className="flex justify-between items-center mb-1.5 font-mono text-[11px] sm:text-[12px]">
 <div className={`${appTheme === 'light' ? 'text-sky-600' : 'text-sky-400 drop-shadow-[0_0_5px_rgba(56,189,248,0.6)]'} flex items-center gap-2`}>
 <span className="animate-pulse">▶</span>
 <span className="tracking-widest capitalize">{progressText}</span>
 </div>
 <div className={`${appTheme === 'light' ? 'text-sky-700 bg-sky-50/50 shadow-none' : 'text-sky-300 bg-sky-950/50 shadow-[inset_0_0_10px_rgba(56,189,248,0.2)]'} font-bold tracking-widest px-2 py-0.5 rounded`}>
 {progress}%
 </div>
 </div>
 <div className={`h-1.5 w-full ${appTheme === 'light' ? 'bg-slate-100 border-slate-200 shadow-none' : 'bg-slate-900/80 shadow-[inset_0_0_5px_rgba(0,0,0,1)] border-sky-900/30'} rounded-full overflow-hidden border`}>
 <div 
 className={`h-full ${appTheme === 'light' ? 'bg-sky-500 shadow-none' : 'bg-gradient-to-r from-cyan-600 via-sky-400 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.8)]'} rounded-full transition-all duration-700 ease-out relative`}
 style={{ width: `${progress}%` }}
 >
 {appTheme !== 'light' && (
 <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/50 animate-[scan_2s_linear_infinite]"></div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
