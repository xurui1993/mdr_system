import React, { useState } from 'react';
import { Theme, AppConfig } from '../types';

interface ControlPanelProps {
  theme: Theme;
  config: AppConfig;
  onChangeConfig: (config: AppConfig) => void;
  onAction: (action: string) => void;
}

export function ControlPanel({ theme, config, onChangeConfig, onAction }: ControlPanelProps) {
  const [isEditingCities, setIsEditingCities] = useState(false);
  const [newCity, setNewCity] = useState('');
  
  const [isEditingCycles, setIsEditingCycles] = useState(false);
  const [newCycle, setNewCycle] = useState('');

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

  const handleCycleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCycle.trim()) {
      if (!config.cycles.includes(newCycle.trim())) {
        updateConfig('cycles', [...config.cycles, newCycle.trim()]);
      }
      setNewCycle('');
      setIsEditingCycles(false);
    }
  };

  const handleCycleRemove = (cycleToRemove: string) => {
    const nextCycles = config.cycles.filter(c => c !== cycleToRemove);
    if (config.cycle === cycleToRemove && nextCycles.length > 0) {
      onChangeConfig({ ...config, cycles: nextCycles, cycle: nextCycles[0] });
    } else {
      updateConfig('cycles', nextCycles);
    }
  };

  return (
    <div className="glass-panel-immersive rounded-3xl cyber-border flex flex-col p-5 gap-5 relative overflow-hidden group border border-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.1)] h-max flex-shrink-0">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent opacity-30" />
      <div className="absolute -inset-x-20 -inset-y-20 bg-sky-500/5 blur-3xl rounded-full pointer-events-none mix-blend-screen" style={{ animation: 'breathe 8s ease-in-out infinite' }}/>

      {/* Row 1: Dropdown & Segments */}
      <div className="flex flex-wrap items-center min-w-0 gap-y-3 relative z-10 mt-0">
        {/* Left: City */}
        <div className="flex items-center shrink-0 min-w-0 pr-8">
          <span className="text-[14px] text-slate-400 w-[90px] tracking-widest uppercase font-mono">{theme.lbl_city}</span>
          <div className="flex items-center glass-input rounded-xl focus-within:border-sky-500/50 transition-colors shadow-inner relative px-2 py-1.5">
            {config.cities.map(c => (
              <div key={c} className="flex items-center group/item relative mr-1.5">
                <button
                  onClick={() => updateConfig('city', c)}
                  className={`px-4 py-1.5 text-[14px] transition-all rounded-lg font-medium tracking-wide ${config.city === c ? 'bg-sky-500/20 text-sky-300 shadow-[inset_0_0_12px_rgba(14,165,233,0.3)]' : 'text-slate-400 hover:text-sky-200 hover:bg-slate-800/50'}`}
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
                className="w-[70px] bg-sky-500/10 text-sky-200 px-3 py-1.5 text-[14px] rounded outline-none border border-sky-500/50 focus:border-sky-400 focus:shadow-[0_0_8px_rgba(56,189,248,0.4)] transition-all"
                placeholder="键入回车"
              />
            ) : (
              <button 
                onClick={() => setIsEditingCities(true)} 
                className="px-3 py-1.5 text-[16px] text-slate-500 hover:text-sky-300 hover:bg-sky-500/20 rounded font-medium transition-colors"
                title="新增"
              >
                +
              </button>
            )}
          </div>
        </div>

       {/* Right: Cycle */}
        <div className="flex items-center shrink-0 min-w-0 z-50">
          <span className="text-[14px] text-slate-400 w-[90px] tracking-widest uppercase font-mono">{theme.lbl_type}</span>
          <div className="flex items-center rounded-xl glass-input overflow-hidden shadow-inner px-2 py-1.5">
            {config.cycles.map(c => (
              <div key={c} className="flex items-center group/item relative mr-1.5">
                <button
                  onClick={() => updateConfig('cycle', c)}
                  className={`px-4 py-1.5 text-[14px] transition-all rounded-lg font-medium tracking-wide ${config.cycle === c ? 'bg-sky-500/20 text-sky-300 shadow-[inset_0_0_12px_rgba(14,165,233,0.3)] border border-sky-400/30' : 'text-slate-400 hover:text-sky-200 hover:bg-slate-800/50 border border-transparent'}`}
                >
                  {c}
                </button>
                <button aria-label="删除" onClick={() => handleCycleRemove(c)} className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full text-[12px] flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all z-10 shadow-sm leading-none pb-[1px] transform scale-50 group-hover/item:scale-100 focus:opacity-100 duration-200">×</button>
              </div>
            ))}
            {isEditingCycles ? (
              <input
                autoFocus
                value={newCycle}
                onChange={e => setNewCycle(e.target.value)}
                onKeyDown={handleCycleAdd}
                onBlur={() => { setIsEditingCycles(false); setNewCycle(''); }}
                className="w-[70px] bg-sky-500/10 text-sky-200 px-3 py-1.5 text-[14px] rounded outline-none border border-sky-500/50 focus:border-sky-400 focus:shadow-[0_0_8px_rgba(56,189,248,0.4)] transition-all"
                placeholder="键入回车"
              />
            ) : (
              <button 
                onClick={() => setIsEditingCycles(true)} 
                className="px-3 py-1.5 text-[16px] text-slate-500 hover:text-sky-300 hover:bg-sky-500/20 rounded font-medium transition-colors"
                title="新增"
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Config Path */}
      <div className="flex items-center relative z-10">
        <span className="text-[14px] text-slate-400 w-[90px] shrink-0 tracking-widest uppercase font-mono">{theme.lbl_config}</span>
        <input 
          type="text" 
          value={config.basePath || ''} 
          onChange={e => updateConfig('basePath', e.target.value)}
          className="glass-input shadow-inner focus:border-sky-500/50 rounded-xl px-4 py-3 font-mono text-[14px] text-sky-100 flex-1 outline-none mr-4 transition-all tracking-wide" 
        />
        <button onClick={() => onAction("open_config")} className="glass-input hover:bg-sky-500/20 hover:text-sky-300 hover:border-sky-500/50 rounded-xl px-0 w-[140px] font-bold tracking-widest text-[14px] py-3.5 transition-all text-slate-300 shadow-sm shrink-0 uppercase">
          {theme.btn_config}
        </button>
      </div>

      {/* Row 3: Source Path */}
      <div className="flex items-center relative z-10">
        <span className="text-[14px] text-slate-400 w-[90px] shrink-0 tracking-widest uppercase font-mono">{theme.lbl_source}</span>
        <input 
          type="text" 
          value={config.sourcePath || ''} 
          onChange={e => updateConfig('sourcePath', e.target.value)}
          className="glass-input shadow-inner focus:border-sky-500/50 rounded-xl px-4 py-3 font-mono text-[14px] text-sky-100 flex-1 outline-none mr-4 transition-all tracking-wide" 
        />
        <button onClick={() => onAction("open_source")} className="glass-input hover:bg-sky-500/20 hover:text-sky-300 hover:border-sky-500/50 rounded-xl px-0 w-[140px] font-bold tracking-widest text-[14px] py-3.5 transition-all text-slate-300 shadow-sm shrink-0 uppercase">
          {theme.btn_source}
        </button>
      </div>

    </div>
  );
}
