import React from 'react';
import { Theme, AppConfig } from '../types';
import { FolderIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface ParttimeDetailsPanelProps {
  theme: Theme;
  config: AppConfig;
  isRunning: boolean;
  onRun: (action: string) => void;
  onBrowseFolder: () => void;
}

export function ParttimeDetailsPanel({ theme, config, isRunning, onRun, onBrowseFolder }: ParttimeDetailsPanelProps) {
  return (
    <div className="glass-panel-immersive rounded-3xl cyber-border flex flex-col p-8 relative overflow-hidden h-full min-h-[300px] border border-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.1)]">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-transparent opacity-50" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[28px] drop-shadow-md filter text-sky-400">📊</span>
          <h2 className="text-[24px] font-bold text-sky-100 tracking-wide">兼职已发汇总合并</h2>
        </div>
        <p className="text-slate-400 text-[14px] ml-11 mb-8">一键提取目录下所有核算表的所得与基金数据，并剥离公式固化数值</p>

        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full gap-4">
          <label className="text-[14px] text-slate-300 font-medium tracking-wide">请选择包含已核算工资表的【文件夹目录】:</label>
          <div className="flex items-center gap-4">
            <div className="flex-1 glass-input shadow-inner rounded-xl px-4 py-3 flex items-center gap-3 border border-transparent focus-within:border-sky-500/50 transition-all">
              <FolderIcon className="w-5 h-5 text-sky-400/70" />
              <input 
                type="text" 
                readOnly
                value={config.sourcePath || ''} 
                className="bg-transparent border-none outline-none font-mono text-[14px] text-sky-100 flex-1 truncate"
                placeholder="未选择文件夹"
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBrowseFolder}
              className="glass-input hover:bg-sky-500/20 hover:text-sky-300 hover:border-sky-500/50 rounded-xl px-6 py-3.5 font-bold tracking-widest text-[14px] transition-all text-slate-300 shadow-sm shrink-0 whitespace-nowrap cursor-pointer"
            >
              浏览
            </motion.button>
          </div>
        </div>

        <div className="mt-8 flex justify-center pb-4">
          <motion.button 
            whileHover={{ scale: isRunning ? 1 : 1.02 }}
            whileTap={{ scale: isRunning ? 1 : 0.98 }}
            onClick={() => onRun('summary_parttime_btn')}
            disabled={isRunning}
            className={`w-[260px] h-[54px] rounded-xl font-bold tracking-widest text-[16px] transition-all duration-300 shadow-lg flex items-center justify-center gap-2
              ${isRunning 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700/50' 
                : 'bg-sky-500 hover:bg-sky-400 text-white hover:shadow-[0_0_25px_rgba(56,189,248,0.4)] border border-sky-400/50 cursor-pointer'
              }`}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin h-5 w-5 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>合并中...</span>
              </>
            ) : (
              <>
                <span>📊</span>
                <span>开始合并报表</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
