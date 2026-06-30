import React, { useState } from 'react';
import { Theme, AppConfig, LogEntry } from '../types';
import { CalendarIcon, Play, ShieldCheck, MapPin, Activity, Terminal, Settings, X, Plus } from 'lucide-react';
import { TerminalPanel } from './TerminalPanel';

interface IssueOrderDashboardProps {
  theme: Theme;
  appTheme?: 'light' | 'dark';
  config: AppConfig;
  onChangeConfig: (config: AppConfig | ((prev: AppConfig) => AppConfig)) => void;
  onRun: () => void;
  isRunning: boolean;
  progress: number;
  progressText?: string;
  logs?: LogEntry[];
  taskStats?: any;
  onCheckCookie: (customCookie?: string) => void;
}

export const IssueOrderDashboard: React.FC<IssueOrderDashboardProps> = ({
  theme,
  appTheme = 'dark',
  config,
  onChangeConfig,
  onRun,
  isRunning,
  progress,
  progressText,
  logs,
  taskStats,
  onCheckCookie
}) => {
  const updateConfig = (key: keyof AppConfig, value: any) => {
    onChangeConfig(prev => ({ ...prev, [key]: value }));
  };

  const allCities = config.cities || [];
  const selectedCities = config.issueSelectedCities || [];

  const toggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      updateConfig('issueSelectedCities', selectedCities.filter(c => c !== city));
    } else {
      updateConfig('issueSelectedCities', [...selectedCities, city]);
    }
  };

  const isLight = appTheme === 'light';

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newCity, setNewCity] = useState('');

  const handleCityRemove = (city: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateConfig('cities', allCities.filter(c => c !== city));
    if (selectedCities.includes(city)) {
      updateConfig('issueSelectedCities', selectedCities.filter(c => c !== city));
    }
  };

  const handleCityAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCity.trim()) {
      const city = newCity.trim();
      if (!allCities.includes(city)) {
        updateConfig('cities', [...allCities, city]);
      }
      setNewCity('');
    }
    if (e.key === 'Escape') {
      setIsManageModalOpen(false);
      setNewCity('');
    }
  };

  return (
    <div className="w-full h-full flex flex-col xl:flex-row gap-6">
      
      {/* Left Column: Configuration Panels */}
      <div className="flex-1 flex flex-col gap-6 min-w-[320px] max-w-[650px] overflow-y-auto custom-scrollbar pr-2">
        
        {/* City Coverage Card */}
        <div className={`p-6 rounded-[24px] border transition-all ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#050714] border-indigo-500/20 shadow-[0_4px_30px_rgba(99,102,241,0.05)]'}`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className={`font-semibold flex items-center gap-3 ${isLight ? 'text-slate-800' : 'text-indigo-100'}`}>
              <div className={`p-2.5 rounded-xl ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
                <MapPin className="w-5 h-5" />
              </div>
              业务城市覆盖范围
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setIsManageModalOpen(true)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${isLight ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700' : 'bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300'}`}>
                <Settings className="w-3.5 h-3.5" />
                管理
              </button>
              <button onClick={() => updateConfig('issueSelectedCities', allCities)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isLight ? 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600' : 'bg-slate-800/50 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300'}`}>全选</button>
              <button onClick={() => updateConfig('issueSelectedCities', [])} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isLight ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600' : 'bg-slate-800/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300'}`}>清空</button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allCities.map(city => {
              const isSelected = selectedCities.includes(city);
              return (
                <button
                  key={city}
                  onClick={() => toggleCity(city)}
                  className={`group relative flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    isSelected 
                      ? isLight ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-[inset_0_0_12px_rgba(99,102,241,0.1)]' : 'border-indigo-500/50 bg-indigo-500/15 text-indigo-200 shadow-[inset_0_0_15px_rgba(99,102,241,0.2)]'
                      : isLight ? 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300' : 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate pr-4">{city}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-opacity ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-400 bg-transparent'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Configuration Card */}
        <div className={`p-6 rounded-[24px] border transition-all ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#050714] border-indigo-500/20 shadow-[0_4px_30px_rgba(99,102,241,0.05)]'}`}>
          <h3 className={`font-semibold flex items-center gap-3 mb-5 ${isLight ? 'text-slate-800' : 'text-indigo-100'}`}>
            <div className={`p-2.5 rounded-xl ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
              <CalendarIcon className="w-5 h-5" />
            </div>
            时间与周期配置
          </h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono font-medium ${isLight ? 'text-indigo-400' : 'text-indigo-500/80'}`}>START</span>
              <input 
                type="date"
                value={config.startDate || ''}
                onChange={(e) => updateConfig('startDate', e.target.value)}
                className={`w-full pl-16 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-sm ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/40 border-slate-800 text-slate-200 hover:bg-slate-800/40'}`}
              />
            </div>
            <div className="flex-1 w-full relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono font-medium ${isLight ? 'text-indigo-400' : 'text-indigo-500/80'}`}>END</span>
              <input 
                type="date"
                value={config.endDate || ''}
                onChange={(e) => updateConfig('endDate', e.target.value)}
                className={`w-full pl-14 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-sm ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/40 border-slate-800 text-slate-200 hover:bg-slate-800/40'}`}
              />
            </div>
          </div>
        </div>

        {/* Cookie Verification Card */}
        <div className={`p-6 rounded-[24px] border transition-all ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#050714] border-indigo-500/20 shadow-[0_4px_30px_rgba(99,102,241,0.05)]'}`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className={`font-semibold flex items-center gap-3 ${isLight ? 'text-slate-800' : 'text-indigo-100'}`}>
              <div className={`p-2.5 rounded-xl ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              系统通行凭证 (Cookie)
            </h3>
            <button
              onClick={() => onCheckCookie()}
              className={`text-xs px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${isLight ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              测试连通性
            </button>
          </div>
          
          <textarea
            value={config.cookie || ''}
            onChange={(e) => updateConfig('cookie', e.target.value)}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData('text');
              if (pastedText && pastedText.length > 20) {
                updateConfig('cookie', pastedText);
                onCheckCookie(pastedText);
              }
            }}
            placeholder="在此粘贴最新抓取到的 cookie..."
            className={`w-full min-h-[140px] rounded-xl px-5 py-4 text-[13px] font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700 shadow-inner' : 'bg-[#02030a]/50 border-slate-800/80 text-slate-300 shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)]'}`}
          />
        </div>

      </div>

      {/* Right Column: Terminal & Actions */}
      <div className="flex-[1.5] flex flex-col gap-6 h-full min-w-0">
        
        {/* Execution Action Card */}
        <div className={`p-6 rounded-[24px] border relative overflow-hidden flex flex-col justify-center shrink-0 shadow-sm transition-all ${isLight ? 'bg-white border-slate-200' : 'bg-[#050714] border-indigo-500/20 shadow-[0_4px_30px_rgba(99,102,241,0.05)]'}`}>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex flex-col gap-1.5">
              <h2 className={`text-xl font-bold tracking-tight flex items-center gap-3 ${isLight ? 'text-slate-800' : 'text-indigo-100'}`}>
                <div className={`p-2.5 rounded-xl ${isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'}`}>
                   <Play className="w-4 h-4 fill-current" />
                </div>
                启动问题单引擎
              </h2>
              <p className={`text-sm font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isRunning ? '正在与远程核心通讯，请勿关闭页面...' : (taskStats?.duration ? `上次处理完成，共计耗时 ${taskStats.duration}s` : '所有配置就绪，等待下达执行指令。')}
              </p>
            </div>

            <button
              onClick={onRun}
              disabled={isRunning}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 relative overflow-hidden group ${
                isRunning 
                  ? isLight ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-500/20 text-indigo-300/50 cursor-not-allowed border border-indigo-500/30' 
                  : isLight ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 shadow-sm border border-indigo-200/60' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 border border-indigo-400/30'
              }`}
            >
              {isRunning ? (
                <>
                  <div className={`absolute left-0 top-0 h-full transition-all duration-300 ${isLight ? 'bg-indigo-500/10' : 'bg-white/20'}`} style={{ width: `${progress}%` }} />
                  <Activity className="w-4 h-4 animate-pulse relative z-10" />
                  <span className="relative z-10">处理中 {progress}%</span>
                </>
              ) : (
                <>
                  立即执行
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Embedded Terminal Viewer */}
        <div className={`flex-1 rounded-[32px] border overflow-hidden flex flex-col relative shadow-inner ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#02030a] border-slate-800/80'}`}>
          <div className={`h-14 px-7 flex items-center gap-3 border-b shrink-0 ${isLight ? 'border-slate-200 bg-white/50' : 'border-slate-800/80 bg-[#070919]'}`}>
            <Terminal className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs font-bold tracking-widest uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>引擎监控日志</span>
            <div className="ml-auto flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-[ping_1.5s_ease-in-out_infinite]' : 'bg-slate-400'}`} />
              <span className={`text-[11px] font-mono font-bold tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{isRunning ? 'ACTIVE' : 'STANDBY'}</span>
            </div>
          </div>
          
          <div className="flex-1 relative">
            {/* Dark vignette overlay for depth */}
            {!isLight && <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,1)] z-10"></div>}
            
            <div className="absolute inset-0 overflow-hidden flex flex-col p-2">
              <TerminalPanel
                appTheme={isLight ? 'light' : 'dark'}
                logs={logs || []}
                progress={progress}
                progressText={progressText}
                isRunning={isRunning}
              />
            </div>
          </div>
        </div>
        
      </div>

      {/* City Management Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsManageModalOpen(false)} />
          <div className={`relative w-full max-w-md rounded-[24px] shadow-2xl p-6 flex flex-col gap-5 ${isLight ? 'bg-white border border-slate-200' : 'bg-[#0f1123] border border-indigo-500/20'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-lg ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>业务城市管理</h3>
              <button onClick={() => setIsManageModalOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className={`flex items-center px-3 py-2 rounded-xl border ${isLight ? 'border-indigo-300 bg-slate-50' : 'border-indigo-500/50 bg-slate-900/60'}`}>
              <Plus className={`w-4 h-4 mr-2 ${isLight ? 'text-indigo-400' : 'text-indigo-500'}`} />
              <input 
                autoFocus
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                onKeyDown={handleCityAdd}
                placeholder="输入城市名，回车确认新增"
                className={`w-full bg-transparent text-sm focus:outline-none ${isLight ? 'text-slate-700 placeholder:text-slate-400' : 'text-slate-200 placeholder:text-slate-500'}`}
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {allCities.map(city => (
                <div key={city} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800/80 bg-[#070919]'}`}>
                  <span className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{city}</span>
                  <button
                    onClick={(e) => handleCityRemove(city, e)}
                    className={`p-1.5 rounded-md transition-colors ${isLight ? 'text-rose-500 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-500/20'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {allCities.length === 0 && (
                <div className={`text-center py-6 text-sm ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>暂无城市数据</div>
              )}
            </div>
            
            <div className="pt-2">
              <button onClick={() => setIsManageModalOpen(false)} className={`w-full py-3 rounded-xl font-medium transition-colors ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
