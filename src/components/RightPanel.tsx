import React from 'react';
import { Theme } from '../types';

export function RightPanel({ theme, activeTab }: { theme: Theme, activeTab: 'task' | 'output' }) {
  return (
    <div className="flex flex-col h-full overflow-hidden items-center justify-center p-6 text-center bg-slate-950/50 backdrop-blur-sm">
      {activeTab === 'task' ? (
        <div className="text-slate-500 text-[14px] space-y-5 font-mono tracking-widest uppercase">
          <div className="text-[40px] mb-2 opacity-50">🗂</div>
          <p>文件浏览器暂未连接</p>
          <p className="normal-case tracking-normal">Python核心正在后端独立运算</p>
          <p className="text-sky-500/70 mt-4 normal-case tracking-normal">请点击底部 📂 按钮在系统中打开目录查看文件</p>
        </div>
      ) : (
        <div className="text-slate-500 text-[14px] space-y-5 font-mono tracking-widest uppercase">
          <div className="text-[40px] mb-2 opacity-50">📦</div>
          <p>生成产物目录</p>
          <p className="text-sky-500/70 mt-4 normal-case tracking-normal">请点击底部 📂 按钮在系统中打开目录查看产物</p>
        </div>
      )}
    </div>
  );
}
