import React, { useState } from 'react';
import { Theme } from '../types';
import { Activity, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface ActionPanelProps {
  theme: Theme;
  appTheme?: 'light' | 'dark';
  isRunning: boolean;
  onRun: () => void;
  progress: number;
  taskStats: any;
}

export function ActionPanel({ appTheme = 'dark', isRunning, progress, taskStats }: ActionPanelProps) {
  const [showGuide, setShowGuide] = useState(false);

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
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className={`flex flex-col gap-1 p-3 rounded-xl border ${appTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium">成功处理</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{taskStats?.success_count || 0}</span>
              <span className="text-[10px] text-slate-400">次</span>
            </div>
          </div>
          
          <div className={`flex flex-col gap-1 p-3 rounded-xl border ${appTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <XCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-medium">失败/异常</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{taskStats?.fail_count || 0}</span>
              <span className="text-[10px] text-slate-400">次</span>
            </div>
          </div>
        </div>

        <div className={`flex flex-col gap-1 p-3 rounded-xl border ${appTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <Activity className="w-4 h-4 text-sky-500" />
            <span className="text-xs font-medium">累计核算记录</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{taskStats?.total_records_processed || 0}</span>
            <span className="text-[10px] text-slate-400">条</span>
          </div>
        </div>

        {/* Collapsible Guide */}
        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800/50">
          <button 
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center justify-between w-full p-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              <span>操作指引</span>
            </div>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {showGuide && (
            <div className="flex flex-col gap-2 mt-2 px-2 pb-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex gap-2"><span className="text-sky-500">1.</span> 把报表拖入左侧响应区</div>
              <div className="flex gap-2"><span className="text-sky-500">2.</span> 系统自动上传并解析</div>
              <div className="flex gap-2"><span className="text-sky-500">3.</span> 在控制台查看进度或结果</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
