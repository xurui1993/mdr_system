import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { MUTTERINGS } from '../constants';
import { motion } from 'motion/react';

interface ActionPanelProps {
  theme: Theme;
  isRunning: boolean;
  onRun: () => void;
  progress: number;
  onAction?: (action: string) => void;
}

export function ActionPanel({ theme, isRunning, onRun, progress, onAction }: ActionPanelProps) {
  const [mutter, setMutter] = useState(MUTTERINGS[0]);
  const [timerText, setTimerText] = useState('00:00.0');

  const startTimeRef = React.useRef<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;

    if (!isRunning) {
      interval = setInterval(() => {
        setMutter(MUTTERINGS[Math.floor(Math.random() * MUTTERINGS.length)]);
      }, 7000);
      
      if (progress < 100) {
        setTimerText('00:00.0');
      }
    } else {
      setMutter("“路漫漫其修远兮，吾将上下而求索...”");
      
      // Only set startTime once when starting
      if (startTimeRef.current === 0 || progress === 0) {
          startTimeRef.current = Date.now();
      }

      timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const totalSeconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const deciseconds = Math.floor((elapsed % 1000) / 100);
        
        setTimerText(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`
        );
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isRunning, progress]);

  return (
    <div className="flex flex-col w-full h-auto justify-center px-4 py-2">
      <motion.button
        animate={{
          backgroundColor: isRunning ? "rgba(14, 165, 233, 0.15)" : "rgba(14, 165, 233, 0.15)",
          color: isRunning ? "#38bdf8" : "#0ea5e9",
          borderColor: isRunning ? "rgba(14, 165, 233, 0.5)" : "rgba(14, 165, 233, 0.5)",
          boxShadow: isRunning ? "0 0 20px rgba(14, 165, 233, 0.3), inset 0 0 10px rgba(14, 165, 233, 0.2)" : "0 0 20px rgba(14, 165, 233, 0.3), inset 0 0 10px rgba(14, 165, 233, 0.2)",
          scale: isRunning ? 0.98 : 1
        }}
        onClick={onRun}
        disabled={isRunning}
        className={`w-full h-[54px] rounded-xl border text-[16px] font-bold transition-all duration-300 flex items-center justify-center tracking-[0.2em] uppercase font-display backdrop-blur-sm ${isRunning ? 'cursor-not-allowed opacity-90' : 'hover:scale-[1.02] hover:bg-sky-500/30'}`}
      >
        {isRunning ? theme.btn_run_ing : progress >= 100 ? theme.btn_success : theme.btn_run}
      </motion.button>

      <div className="flex flex-col mt-6">
        <div className="flex justify-between items-end mb-4 px-1">
          <span className="text-[14px] text-sky-400 tracking-widest uppercase font-bold animate-breathe">{progress <= 0 && !isRunning ? '等待接入' : `[${progress}%] ${isRunning ? '运算中...' : progress >= 100 ? '操作成功' : ''}`}</span>
          <span className={`font-mono text-[18px] font-bold tracking-widest animate-breathe-slow ${isRunning ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : progress >= 100 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-slate-500'}`}>
            {timerText}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900/80 border border-sky-500/20 h-2.5 rounded-full overflow-hidden relative shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'tween' }}
          />
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button 
            onClick={() => onAction && onAction('remove_problem_orders')}
            disabled={isRunning}
            className="flex-1 border border-sky-500/30 bg-sky-500/5 py-2.5 rounded-xl text-slate-300 hover:text-sky-200 hover:bg-sky-500/20 hover:border-sky-400 transition-all font-medium text-[13px] tracking-widest disabled:opacity-50"
          >
            问题单剔除
          </button>
          <button 
            onClick={() => onAction && onAction('raise_price')}
            disabled={isRunning}
            className="flex-1 border border-sky-500/30 bg-sky-500/5 py-2.5 rounded-xl text-slate-300 hover:text-sky-200 hover:bg-sky-500/20 hover:border-sky-400 transition-all font-medium text-[13px] tracking-widest disabled:opacity-50"
          >
            提价数据流转
          </button>
        </div>

        <span className="text-sky-500/60 text-[13px] font-mono text-center mt-6 tracking-[0.2em] pt-1">
          {mutter}
        </span>
      </div>
    </div>
  );
}
