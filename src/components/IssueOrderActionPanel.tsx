import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { motion } from 'motion/react';
import { Cpu, MemoryStick, Activity, Layers } from 'lucide-react';

interface IssueOrderActionPanelProps {
 theme: Theme;
 isRunning: boolean;
 onRun: () => void;
 progress: number;
}

export function IssueOrderActionPanel({ theme, isRunning, onRun, progress }: IssueOrderActionPanelProps) {
 return (
 <div className="flex flex-col w-full h-full justify-center items-center z-10 p-4 space-y-4">
 <div className="flex-1 flex flex-col justify-center w-full px-2">
 <div className="bg-sky-500/5 light:bg-sky-50/80 rounded-2xl p-4 w-full flex flex-col gap-3">
 <div className="flex items-center gap-2 mb-1">
 <div className="p-1.5 rounded-lg bg-sky-500/10 light:bg-white light:shadow-sm">
 <Layers className="w-4 h-4 light:text-sky-600 text-sky-400" />
 </div>
 <h3 className="text-sm font-semibold light:text-slate-800 text-slate-200 tracking-wide">操作指引</h3>
 </div>
 <div className="flex flex-col gap-2.5 pl-1">
 <div className="flex items-start gap-2.5">
 <div className="w-1.5 h-1.5 rounded-full bg-sky-400/60 light:bg-sky-500 mt-1.5 shrink-0" />
 <p className="text-xs light:text-slate-600 text-slate-400 leading-relaxed text-left">
 系统将根据指定条件爬取数据。
 </p>
 </div>
 <div className="flex items-start gap-2.5">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 light:bg-emerald-500 mt-1.5 shrink-0" />
 <p className="text-xs light:text-slate-600 text-slate-400 leading-relaxed text-left">
 自动清洗、合并且生成汇总问题单。
 </p>
 </div>
 </div>
 </div>
 </div>

 <div className="w-full shrink-0 relative">
 <motion.button 
 whileHover={{ scale: isRunning ? 1 : 1.02 }}
 whileTap={{ scale: isRunning ? 1 : 0.98 }}
 onClick={onRun} 
 disabled={isRunning}
 className={`relative px-12 py-3 rounded-2xl font-bold tracking-[0.2em] w-full transition-all duration-300 overflow-hidden group border ${
 isRunning 
 ? 'bg-sky-500/10 text-sky-500 border-sky-500/30 cursor-wait shadow-[inset_0_0_20px_rgba(14,165,233,0.1)] light:bg-sky-50 light:text-sky-400 light:border-sky-200' 
 : 'bg-gradient-to-b from-sky-900/40 to-slate-900/60 text-sky-100 border-sky-500/40 hover:from-sky-800/60 hover:to-slate-800/80 hover:text-white hover:border-sky-400 hover:shadow-[0_0_30px_rgba(14,165,233,0.4)] cursor-pointer light:from-white light:to-sky-50/50 light:text-sky-700 light:border-sky-200 hover:light:from-sky-50 hover:light:to-sky-100 hover:light:text-sky-800'
 }`}
 >
 {!isRunning && <div className="absolute inset-0 bg-sky-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>}
 
 <span className="relative z-10 text-[16px] flex items-center justify-center gap-3 drop-shadow-md">
 {isRunning ? (
 <>
 <Activity className="w-5 h-5 animate-pulse" /> 
 作业进行中...
 </>
 ) : (
 <>启动流程</>
 )}
 </span>
 
 {isRunning && (
 <div 
 className="absolute left-0 top-0 h-full bg-sky-500/20 light:bg-sky-400/20 transition-all duration-300"
 style={{ width: `${progress}%` }}
 />
 )}
 </motion.button>
 </div>
 </div>
 );
}
