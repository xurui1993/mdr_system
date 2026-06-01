import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { motion } from 'motion/react';

interface IssueOrderActionPanelProps {
  theme: Theme;
  isRunning: boolean;
  onRun: () => void;
  progress: number;
}

export function IssueOrderActionPanel({ theme, isRunning, onRun, progress }: IssueOrderActionPanelProps) {
  const [timerText, setTimerText] = useState('00:00.0');

  const startTimeRef = React.useRef<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      if (startTimeRef.current === 0 || progress === 0) {
        startTimeRef.current = Date.now();
      }
      interval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const totalSeconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const deciseconds = Math.floor((elapsed % 1000) / 100);
        
        setTimerText(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`
        );
      }, 100);
    } else {
      if (progress < 100) {
        setTimerText('00:00.0');
        startTimeRef.current = 0;
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, progress]);

  return (
    <div className="flex flex-col w-full h-full justify-between items-center z-10 p-2">
      <div className="w-full flex-1 flex flex-col justify-center gap-12 mt-4 relative">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRun} 
          disabled={isRunning}
          className={`relative px-12 py-5 rounded-2xl font-bold tracking-[0.2em] w-full transition-all duration-300 overflow-hidden group border ${
            isRunning 
              ? 'bg-sky-500/10 text-sky-500 border-sky-500/30 cursor-wait shadow-[inset_0_0_20px_rgba(14,165,233,0.1)]' 
              : 'bg-gradient-to-b from-sky-900/40 to-slate-900/60 text-sky-100 border-sky-500/40 hover:from-sky-800/60 hover:to-slate-800/80 hover:text-white hover:border-sky-400 hover:shadow-[0_0_30px_rgba(14,165,233,0.4)] cursor-pointer'
          }`}
        >
          {/* Internal animated glow */}
          {!isRunning && <div className="absolute inset-0 bg-sky-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>}
          
          <span className="relative z-10 text-[18px] flex items-center justify-center gap-3 drop-shadow-md">
            {isRunning ? (
               <>
                 <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin"></div> 
                 引擎工作流...
               </>
            ) : (
               <>启动问题单生成</>
            )}
          </span>
          
          {/* Progress bar background fill during run */}
          {isRunning && (
            <div 
              className="absolute left-0 top-0 h-full bg-sky-500/20 backdrop-blur-sm transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          )}
        </motion.button>

        <div className="w-full">
          <div className="flex justify-between items-end mb-3">
             <span className="text-[14px] text-sky-400 font-bold tracking-widest drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
               {isRunning ? '正在运算' : '等待接入'}
             </span>
             <span className="text-[14px] text-sky-500/80 font-mono font-bold tracking-[0.2em]">
               {timerText}
             </span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-sky-500/10 shadow-inner p-[1px]">
            <div 
              className="h-full bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-300 rounded-full transition-all duration-300 relative"
              style={{ width: `${progress}%` }}
            >
               {isRunning && <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8L3N2Zz4=')] opacity-30 animate-[slide_1s_linear_infinite]"></div>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full flex justify-end mt-6">
        <span className="text-[13px] text-slate-500 tracking-widest font-mono flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
           {isRunning ? '计算引擎高负荷...' : '服务节点正常运行中...'}
        </span>
      </div>
    </div>
  );
}
