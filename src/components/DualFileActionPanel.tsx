import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Theme } from '../types';

export function DualFileActionPanel({ 
  theme, actionId, isRunning, onRun, title, subtitle, icon, colorClass,
  label1, label2, fileTypes1, fileTypes2 
}: any) {
  const [file1, setFile1] = useState('');
  const [file2, setFile2] = useState('');

  const handleBrowse1 = async () => {
    const r = await fetch('/api/dialog/file?title=' + encodeURIComponent('选择 ' + label1));
    const d = await r.json();
    if (d.path) setFile1(d.path);
  };
  const handleBrowse2 = async () => {
    const r = await fetch('/api/dialog/file?title=' + encodeURIComponent('选择 ' + label2));
    const d = await r.json();
    if (d.path) setFile2(d.path);
  };

  return (
    <div className="glass-panel-immersive rounded-2xl flex flex-col p-8 h-full w-full justify-between relative overflow-hidden group min-h-[480px]">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="flex flex-col gap-4 relative z-10 font-sans">
         <h2 className="text-[22px] font-bold tracking-wider flex items-center mb-1 animate-breathe" style={{ color: colorClass }}>
           <span className="text-[26px] mr-3 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">{icon}</span>
           {title}
         </h2>
         <p className="text-[13px] text-slate-400 leading-relaxed font-medium mt-2">{subtitle}</p>
      </div>

      <div className="relative z-10 w-full mt-6 space-y-5">
         <div>
            <label className="text-[14px] text-slate-300 font-medium mb-2 block">{label1}</label>
            <div className="flex gap-3">
              <input type="text" readOnly value={file1 || ''} className="glass-input rounded-xl px-4 py-3 flex-1 text-[13px] text-slate-200 outline-none" placeholder="选择文件..." />
              <button disabled={isRunning} onClick={handleBrowse1} className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[13px] font-medium border border-slate-700">浏览</button>
            </div>
         </div>
         <div>
            <label className="text-[14px] text-slate-300 font-medium mb-2 block">{label2}</label>
            <div className="flex gap-3">
              <input type="text" readOnly value={file2 || ''} className="glass-input rounded-xl px-4 py-3 flex-1 text-[13px] text-slate-200 outline-none" placeholder="选择文件..." />
              <button disabled={isRunning} onClick={handleBrowse2} className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[13px] font-medium border border-slate-700">浏览</button>
            </div>
         </div>
      </div>

      <div className="flex justify-start mt-8 relative z-10 w-full">
        <motion.button 
          whileHover={{ scale: file1 && file2 ? 1.02 : 1 }}
          whileTap={{ scale: file1 && file2 ? 0.98 : 1 }}
          onClick={() => onRun(file1, file2)} 
          disabled={isRunning || !file1 || !file2}
          className={`relative px-8 py-3.5 rounded-xl font-bold tracking-[0.1em] w-full transition-all duration-300 overflow-hidden group/btn text-[14px] uppercase ${
            isRunning 
              ? 'bg-sky-500/20 text-sky-500 border border-sky-500/50 cursor-wait'
              : (!file1 || !file2)
              ? 'bg-slate-800/50 text-slate-500 border border-slate-700 cursor-not-allowed' 
              : 'bg-sky-500/10 text-sky-500 border border-sky-500/50 hover:bg-sky-500 hover:text-black hover:border-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.6)] cursor-pointer'
          }`}
        >
          {isRunning ? (
             '执行中...'
          ) : (
             `开始 ${title}`
          )}
        </motion.button>
      </div>
    </div>
  );
}
