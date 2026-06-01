import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

export function TerminalPanel({ logs }: { logs: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getColor = (level: string) => {
    switch(level) {
      case 'INFO': return 'text-slate-400';
      case 'SYSTEM': return 'text-sky-400 drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]';
      case 'WARN': return 'text-sky-400';
      case 'ERROR': return 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]';
      case 'SUCCESS': return 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]';
      default: return 'text-slate-400';
    }
  }

  return (
    <div 
      ref={scrollRef}
      className="bg-[#020617]/80 px-8 py-8 font-mono text-[14px] h-full overflow-y-auto w-full relative"
    >
      {/* Grid overlay for authenticity */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      <div className="relative z-10 flex flex-col gap-1.5">
        {logs.map((log, i) => (
          <div key={i} className={`whitespace-pre-wrap leading-relaxed tracking-wide ${getColor(log.level)}`}>
            {log.level === 'SYSTEM' || log.level === 'SUCCESS' ? '> ' : ''}{log.text}
          </div>
        ))}
      </div>
    </div>
  );
}
