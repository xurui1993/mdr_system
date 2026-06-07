import React, { useState } from 'react';
import { Theme, AppConfig } from '../types';

interface SalaryBindControlPanelProps {
  theme: Theme;
  config: AppConfig;
  onChangeConfig: (config: AppConfig) => void;
  onAction: (action: string) => void;
}

export function SalaryBindControlPanel({ theme, config, onChangeConfig, onAction }: SalaryBindControlPanelProps) {
  const [bindType, setBindType] = useState('专送绑定');

  return (
    <div className="glass-panel-immersive rounded-3xl cyber-border flex flex-col justify-between h-full p-6 relative group border border-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.1)] overflow-y-auto">
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent opacity-30" />
        <div className="absolute -inset-x-20 -inset-y-20 bg-sky-500/5 blur-3xl rounded-full pointer-events-none mix-blend-screen" style={{ animation: 'breathe 8s ease-in-out infinite' }}/>
      </div>

      <div className="relative z-10 mb-6 flex justify-start">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/40 border border-sky-500/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-sm gap-1">
          {['专送绑定', '城代绑定', '小象/高校绑定'].map(type => (
            <button
              key={type}
              onClick={() => setBindType(type)}
              className={`relative px-8 h-[40px] flex items-center justify-center rounded-xl font-bold tracking-widest text-[14px] transition-all duration-300 ${
                bindType === type
                ? 'bg-sky-500/20 text-sky-200 border border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.2),inset_0_0_10px_rgba(14,165,233,0.2)]'
                : 'bg-transparent border border-transparent text-slate-400 hover:text-sky-300 hover:bg-sky-500/5'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 space-y-6 mt-auto">
        {/* Row 2: Config File */}
        <div className="flex items-center w-full">
          <span className="text-[14px] text-slate-400 w-[90px] shrink-0 tracking-widest font-mono">配置文件</span>
          <div className="flex flex-1 items-center gap-4">
             <input type="text" value={config.basePath || ''} onChange={e => onChangeConfig({ ...config, basePath: e.target.value })} className="flex-1 glass-input shadow-inner rounded-xl px-4 h-[42px] font-mono text-[13px] text-sky-200 outline-none transition-all tracking-wide border border-transparent focus:border-sky-500/50" />
             <button onClick={() => onAction("open_config")} className="h-[42px] px-6 rounded-xl glass-input border border-sky-500/20 text-[14px] font-bold text-slate-300 hover:text-sky-300 hover:border-sky-500/50 transition-all shadow-[0_0_10px_rgba(14,165,233,0.05)] hover:shadow-[0_0_15px_rgba(14,165,233,0.2)] tracking-widest shrink-0 bg-slate-900/50">
               选择文件
             </button>
          </div>
        </div>

        {/* Row 3: Data Directory */}
        <div className="flex items-center w-full mt-2">
          <span className="text-[14px] text-slate-400 w-[90px] shrink-0 tracking-widest font-mono">数据目录</span>
          <div className="flex flex-1 items-center gap-4">
             <input type="text" value={config.sourcePath || ''} onChange={e => onChangeConfig({ ...config, sourcePath: e.target.value })} className="flex-1 glass-input shadow-inner rounded-xl px-4 h-[42px] font-mono text-[13px] text-sky-200 outline-none transition-all tracking-wide border border-transparent focus:border-sky-500/50" />
             <button onClick={() => onAction("open_source")} className="h-[42px] px-6 rounded-xl glass-input border border-sky-500/20 text-[14px] font-bold text-slate-300 hover:text-sky-300 hover:border-sky-500/50 transition-all shadow-[0_0_10px_rgba(14,165,233,0.05)] hover:shadow-[0_0_15px_rgba(14,165,233,0.2)] tracking-widest shrink-0 bg-slate-900/50">
               选择目录
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
