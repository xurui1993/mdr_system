import React, { useState, useEffect } from 'react';

export function TaskTimer({ isRunning }: { isRunning: boolean }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastMs, setLastMs] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;
    
    if (isRunning) {
      setElapsedMs(0);
      startTime = performance.now();
      
      const updateTimer = (currentTime: number) => {
        setElapsedMs(currentTime - startTime);
        animationFrameId = requestAnimationFrame(updateTimer);
      };
      
      animationFrameId = requestAnimationFrame(updateTimer);
    } else {
      if (elapsedMs > 0) {
        setLastMs(elapsedMs);
      }
      setElapsedMs(0);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isRunning]);

  const formatStopwatch = (ms: number) => {
    if (!isRunning && ms === 0 && lastMs === 0) return '00:00.00';
    const displayMs = isRunning ? ms : (lastMs > 0 ? lastMs : ms);
    const minutes = Math.floor(displayMs / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((displayMs % 60000) / 1000).toString().padStart(2, '0');
    const centiseconds = Math.floor((displayMs % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${centiseconds}`;
  };

  if (!isRunning) return null;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-300 font-mono text-[11px] tracking-wider ${isRunning ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
      {formatStopwatch(elapsedMs)}
    </div>
  );
}
