import React, { useState } from 'react';
import { Theme } from '../types';
import { Activity, CheckCircle2, XCircle, Download } from 'lucide-react';

interface ActionPanelProps {
  theme: Theme;
  appTheme?: 'light' | 'dark';
  isRunning: boolean;
  onRun: () => void;
  progress: number;
  taskStats: any;
  taskHistory?: any[];
  activeMenu?: string;
}

export function ActionPanel({ appTheme = 'dark', isRunning, progress, taskStats, taskHistory = [], activeMenu }: ActionPanelProps) {
  const [showGuide, setShowGuide] = useState(false);

  // Compute dynamic stats based on taskHistory
  const relevantHistory = taskHistory.filter(t => t.action === activeMenu);
  const successCount = relevantHistory.filter(t => t.status === 'success').length;
  const failCount = relevantHistory.filter(t => t.status === 'error').length;
  const totalRecords = relevantHistory.reduce((acc, t) => acc + (t.stats?.riders || 0), 0);
  const elapsedTime = taskStats?.elapsed_time?.toFixed(2) || 0;

  return (
    <div className={`flex flex-col w-full h-full p-2 md:p-3 relative overflow-y-auto custom-scrollbar ${appTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
      {isRunning && (
        <div className="absolute top-0 left-0 w-full h-1 bg-sky-500/20">
          <div 
            className="h-full bg-sky-500 transition-all duration-300" 
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      <div className="flex items-center justify-between mb-4 px-1 border-b pb-3 border-slate-700/30 light:border-slate-200 shrink-0 mt-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${appTheme === 'light' ? 'bg-sky-50 text-sky-600' : 'bg-sky-500/10 text-sky-400'}`}>
              <Activity className="w-5 h-5" />
          </div>
          <h3 className={`text-base font-bold tracking-wide ${appTheme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
            数据统计
          </h3>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 flex-1 px-1">
        
        {/* Dynamic Stats */}
        <div className="flex flex-col gap-2 mb-2">
          <div className={`flex items-center justify-between p-3 rounded-xl border ${appTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium">成功处理</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{successCount}</span>
              <span className="text-[10px] text-slate-400">次</span>
            </div>
          </div>
          
          <div className={`flex items-center justify-between p-3 rounded-xl border ${appTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <XCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-medium">失败/异常</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{failCount}</span>
              <span className="text-[10px] text-slate-400">次</span>
            </div>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-xl border ${appTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Activity className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-medium">累计核算记录</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalRecords}</span>
              <span className="text-[10px] text-slate-400">条</span>
            </div>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-xl border ${appTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Activity className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-medium">程序耗时时长</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{elapsedTime}</span>
              <span className="text-[10px] text-slate-400">秒</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
