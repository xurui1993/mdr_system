import React from 'react';
import { Theme } from '../types';
import { Play, Trash2, Clock, List, GripVertical, CheckCircle2, PlayCircle, AlertCircle } from 'lucide-react';

interface TaskItem {
  id: string;
  name: string;
  estimatedTime: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

interface ActionPanelProps {
  theme: Theme;
  appTheme?: 'light' | 'dark';
  isRunning: boolean;
  onRun: () => void;
  progress: number;
  taskQueue?: TaskItem[];
  onRemoveTask?: (id: string) => void;
  onReorderTasks?: (tasks: TaskItem[]) => void;
}

export function ActionPanel({ appTheme = 'dark', isRunning, progress, taskQueue = [], onRemoveTask, onReorderTasks, onRun }: ActionPanelProps) {
  
  const moveTask = (index: number, direction: 'up' | 'down') => {
    if (!onReorderTasks) return;
    const newQueue = [...taskQueue];
    if (direction === 'up' && index > 0) {
      [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
      onReorderTasks(newQueue);
    } else if (direction === 'down' && index < newQueue.length - 1) {
      [newQueue[index + 1], newQueue[index]] = [newQueue[index], newQueue[index + 1]];
      onReorderTasks(newQueue);
    }
  };

  return (
    <div className={`flex flex-col w-full h-full p-2 md:p-3 relative overflow-hidden ${appTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
      {isRunning && (
        <div className="absolute top-0 left-0 w-full h-1 bg-sky-500/20 z-10">
          <div 
            className="h-full bg-sky-500 transition-all duration-300" 
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4 px-1 border-b pb-3 border-slate-700/30 light:border-slate-200 shrink-0 mt-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${appTheme === 'light' ? 'bg-sky-50 text-sky-600' : 'bg-sky-500/10 text-sky-400'}`}>
              <List className="w-5 h-5" />
          </div>
          <h3 className={`text-base font-bold tracking-wide ${appTheme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
            批量任务队列 ({taskQueue.length})
          </h3>
        </div>
        <button 
          onClick={onRun}
          disabled={isRunning || taskQueue.length === 0}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            isRunning 
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              : taskQueue.length === 0
                ? 'bg-sky-500/10 text-sky-500/50 cursor-not-allowed'
                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]'
          }`}
        >
          {isRunning ? (
            <><PlayCircle className="w-4 h-4 animate-pulse" /> 执行中...</>
          ) : (
            <><Play className="w-4 h-4" /> 开始排队执行</>
          )}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 flex flex-col gap-2">
        {taskQueue.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 light:text-slate-400 space-y-3">
            <List className="w-10 h-10 opacity-20" />
            <p className="text-sm">暂无排队中的任务，请上传目录</p>
          </div>
        ) : (
          taskQueue.map((task, idx) => (
            <div 
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                task.status === 'running' 
                  ? 'bg-sky-500/10 border-sky-500/30' 
                  : task.status === 'completed'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : task.status === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : appTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {!isRunning && task.status === 'pending' ? (
                  <div className="flex flex-col gap-0.5">
                    <button 
                      onClick={() => moveTask(idx, 'up')}
                      disabled={idx === 0}
                      className="text-slate-500 hover:text-sky-400 disabled:opacity-30 disabled:hover:text-slate-500 p-0.5"
                    >
                      <GripVertical className="w-3.5 h-3.5 rotate-90" />
                    </button>
                    <button 
                      onClick={() => moveTask(idx, 'down')}
                      disabled={idx === taskQueue.length - 1}
                      className="text-slate-500 hover:text-sky-400 disabled:opacity-30 disabled:hover:text-slate-500 p-0.5"
                    >
                      <GripVertical className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  </div>
                ) : (
                  <div className="w-5 flex justify-center">
                    {task.status === 'running' && <PlayCircle className="w-4 h-4 text-sky-400 animate-pulse" />}
                    {task.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {task.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    {task.status === 'pending' && <Clock className="w-4 h-4 text-slate-500" />}
                  </div>
                )}
                
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{task.name}</span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>预估耗时: {task.estimatedTime}</span>
                  </div>
                </div>
              </div>
              
              {!isRunning && task.status === 'pending' && (
                <button 
                  onClick={() => onRemoveTask && onRemoveTask(task.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-2 shrink-0"
                  title="移除该任务"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
