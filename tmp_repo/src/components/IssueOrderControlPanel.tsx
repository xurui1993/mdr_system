import React, { useState } from 'react';
import { Theme, AppConfig } from '../types';
import { CalendarIcon } from 'lucide-react';
import { DateRangeCyclePicker } from './DateRangeCyclePicker';

interface IssueOrderControlPanelProps {
  theme: Theme;
  config: AppConfig;
  onChangeConfig: (config: AppConfig) => void;
  onCheckCookie: () => void;
}

export function IssueOrderControlPanel({ theme, config, onChangeConfig, onCheckCookie }: IssueOrderControlPanelProps) {
  const [isEditingCities, setIsEditingCities] = useState(false);
  const [newCity, setNewCity] = useState('');
  
  const updateConfig = (key: keyof AppConfig, value: any) => {
    onChangeConfig({ ...config, [key]: value });
  };

  const handleCityAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCity.trim()) {
      const addedCity = newCity.trim();
      let nextCities = config.cities;
      if (!config.cities.includes(addedCity)) {
        nextCities = [...config.cities, addedCity];
      }
      
      const nextIssueCities = config.issueSelectedCities || [];
      if (!nextIssueCities.includes(addedCity)) {
        onChangeConfig({
          ...config,
          cities: nextCities,
          issueSelectedCities: [...nextIssueCities, addedCity]
        });
      } else if (!config.cities.includes(addedCity)) {
        updateConfig('cities', nextCities);
      }
      
      setNewCity('');
      setIsEditingCities(false);
    }
  };

  const handleCityRemove = (cityToRemove: string) => {
    const nextCities = config.cities.filter(c => c !== cityToRemove);
    const nextIssueCities = (config.issueSelectedCities || []).filter(c => c !== cityToRemove);
    
    onChangeConfig({
      ...config,
      cities: nextCities,
      issueSelectedCities: nextIssueCities,
      city: config.city === cityToRemove && nextCities.length > 0 ? nextCities[0] : config.city
    });
  };

  const toggleIssueCity = (c: string) => {
    const selected = config.issueSelectedCities || [];
    if (selected.includes(c)) {
      if (selected.length > 1) { // prevent removing the last one
        updateConfig('issueSelectedCities', selected.filter(city => city !== c));
      }
    } else {
      updateConfig('issueSelectedCities', [...selected, c]);
    }
  };

  return (
    <div className="glass-panel-immersive rounded-3xl cyber-border flex flex-col justify-between h-full p-6 relative group border border-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.1)]">
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent opacity-30" />
        <div className="absolute -inset-x-20 -inset-y-20 bg-sky-500/5 blur-3xl rounded-full pointer-events-none mix-blend-screen" style={{ animation: 'breathe 8s ease-in-out infinite' }}/>
      </div>

      {/* Row 1: Dropdown & Segments */}
      <div className="flex flex-wrap items-center min-w-0 mb-6 gap-y-4 relative z-30 mt-2">
        {/* Left: City */}
        <div className="flex items-center shrink-0 min-w-0 pr-8">
          <span className="text-[14px] text-slate-400 w-[90px] tracking-widest uppercase font-mono">{theme.lbl_city}</span>
          <div className="flex items-center glass-input rounded-xl focus-within:border-sky-500/50 transition-colors shadow-inner relative px-2 py-1.5 flex-wrap">
            {config.cities.map(c => (
              <div key={c} className="flex items-center group/item relative mr-1.5 mb-1.5">
                <button
                  onClick={() => toggleIssueCity(c)}
                  className={`px-4 py-1.5 text-[14px] transition-all rounded-lg font-medium tracking-wide ${(config.issueSelectedCities || []).includes(c) ? 'bg-sky-500/20 text-sky-300 shadow-[inset_0_0_12px_rgba(14,165,233,0.3)]' : 'text-slate-400 hover:text-sky-200 hover:bg-slate-800/50'}`}
                >
                  {c}
                </button>
                <button aria-label="删除" onClick={() => handleCityRemove(c)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full text-[12px] flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all z-10 shadow-sm leading-none pb-[1px] transform scale-50 group-hover/item:scale-100 focus:opacity-100 duration-200">×</button>
              </div>
            ))}
            {isEditingCities ? (
              <input
                autoFocus
                value={newCity}
                onChange={e => setNewCity(e.target.value)}
                onKeyDown={handleCityAdd}
                onBlur={() => { setIsEditingCities(false); setNewCity(''); }}
                className="w-[70px] bg-sky-500/10 text-sky-200 px-3 py-1.5 text-[14px] rounded outline-none border border-sky-500/50 focus:border-sky-400 focus:shadow-[0_0_8px_rgba(56,189,248,0.4)] transition-all mb-1.5"
                placeholder="键入回车"
              />
            ) : (
              <button 
                onClick={() => setIsEditingCities(true)} 
                className="px-3 py-1.5 text-[16px] text-slate-500 hover:text-sky-300 hover:bg-sky-500/20 rounded font-medium transition-colors mb-1.5"
                title="新增"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Right: Cycle */}
        <div className="flex items-center shrink-0 min-w-0 pr-8">
          <span className="text-[14px] text-slate-400 w-[90px] tracking-widest uppercase font-mono">业务周期</span>
          <DateRangeCyclePicker
            cycles={config.issueCycles || ["今天", "本周", "上半月", "下半月", "当月"]}
            currentCycle={config.issueCycle || "今天"}
            startDate={config.startDate || ''}
            endDate={config.endDate || ''}
            onChange={(cycle, start, end) => {
              onChangeConfig({
                ...config,
                issueCycle: cycle,
                startDate: start,
                endDate: end
              });
            }}
            onUpdateCycles={(cycles) => updateConfig('issueCycles', cycles)}
          />
        </div>
      </div>

      {/* Row 2: Cookie Check */}
      <div className="flex items-start relative z-10 flex-col gap-4">
        <div className="w-full flex items-start">
           <span className="text-[14px] text-slate-400 w-[90px] shrink-0 tracking-widest font-mono mt-4 self-start flex flex-col gap-1">
             <span className="text-sky-400">cookie</span>
             <span>验证</span>
           </span>
           <div className="flex flex-col flex-1 gap-2 w-full">
             <textarea 
               value={config.cookie || ''} 
               onChange={e => updateConfig('cookie', e.target.value)}
               placeholder="在此粘贴最新抓取到的 cookie = ..." 
               className={`glass-input shadow-inner rounded-xl p-4 font-mono text-[13px] outline-none transition-all tracking-wide h-[120px] w-full resize-none overflow-y-auto leading-relaxed border ${
                 !config.cookie ? 'focus:border-sky-500/50 text-sky-100 border-transparent' :
                 config.cookie.length > 20 ? 'border-emerald-500/50 focus:border-emerald-500 text-emerald-300 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]' :
                 'border-rose-500/50 focus:border-rose-500 text-rose-300 shadow-[inset_0_0_10px_rgba(244,63,94,0.1)]'
               }`}
             />
             {config.cookie && (
               <div className="flex items-center justify-end px-1 mt-1">
                 {config.cookie.length > 20 ? (
                   <span className="text-[13px] text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                     cookie有效
                   </span>
                 ) : (
                   <span className="text-[13px] text-rose-400 font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                     cookie失效
                   </span>
                 )}
               </div>
             )}
           </div>
        </div>
      </div>

    </div>
  );
}
