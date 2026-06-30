import React, { useState } from 'react';

interface CitySelectorProps {
  cities: string[];
  selectedCities: string[];
  onUpdateCities: (newCities: string[]) => void;
  onUpdateSelected: (newSelected: string[]) => void;
  theme?: any;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  cities,
  selectedCities,
  onUpdateCities,
  onUpdateSelected,
  theme
}) => {
  const [isEditingCities, setIsEditingCities] = useState(false);
  const [newCity, setNewCity] = useState('');

  const toggleIssueCity = (city: string) => {
    const current = selectedCities || [];
    if (current.includes(city)) {
      onUpdateSelected(current.filter(c => c !== city));
    } else {
      onUpdateSelected([...current, city]);
    }
  };

  const handleCityRemove = (city: string) => {
    onUpdateCities((cities || []).filter(c => c !== city));
    if ((selectedCities || []).includes(city)) {
      onUpdateSelected((selectedCities || []).filter(c => c !== city));
    }
  };

  const handleCityAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCity.trim()) {
      const city = newCity.trim();
      if (!(cities || []).includes(city)) {
        onUpdateCities([...(cities || []), city]);
      }
      setNewCity('');
      setIsEditingCities(false);
    }
    if (e.key === 'Escape') {
      setIsEditingCities(false);
      setNewCity('');
    }
  };

  return (
    <div className="flex flex-col shrink-0 min-w-0 w-full">
      <div className="flex items-center mb-2">
        <span className="text-[13px] light:text-slate-700 text-slate-400 w-[80px] tracking-widest uppercase font-mono shrink-0">业务城市</span>
        <div className="flex gap-2">
          <button onClick={() => onUpdateSelected(cities || [])} className="text-[12px] px-2 py-1 rounded bg-slate-800/50 light:bg-slate-100 hover:bg-sky-500/20 light:hover:bg-sky-50 text-slate-400 light:text-slate-600 hover:text-sky-300 light:hover:text-sky-600 transition-colors">全选</button>
          <button onClick={() => onUpdateSelected((cities || []).filter(c => !(selectedCities || []).includes(c)))} className="text-[12px] px-2 py-1 rounded bg-slate-800/50 light:bg-slate-100 hover:bg-sky-500/20 light:hover:bg-sky-50 text-slate-400 light:text-slate-600 hover:text-sky-300 light:hover:text-sky-600 transition-colors">反选</button>
          <button onClick={() => onUpdateSelected([])} className="text-[12px] px-2 py-1 rounded bg-slate-800/50 light:bg-slate-100 hover:bg-sky-500/20 light:hover:bg-sky-50 text-slate-400 light:text-slate-600 hover:text-sky-300 light:hover:text-sky-600 transition-colors">清空</button>
        </div>
      </div>
      <div className="flex items-center rounded-xl focus-within:border-sky-500/50 transition-colors shadow-inner relative flex-wrap ml-[80px] gap-2 pt-1 mb-2">
        {(cities || []).map(c => (
          <div key={c} className="flex items-center group/item relative">
            <label className={`flex items-center cursor-pointer px-3 py-1.5 transition-all rounded-lg border ${(selectedCities || []).includes(c) ? 'border-sky-500/50 bg-sky-500/10 text-sky-300 light:border-sky-300 light:bg-sky-50 light:text-sky-700 shadow-[inset_0_0_12px_rgba(14,165,233,0.3)] light:shadow-[inset_0_0_12px_rgba(14,165,233,0.1)]' : 'border-slate-700/50 light:border-slate-300 light:text-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-800/30 light:hover:bg-slate-50'}`}>
              <input
                type="checkbox"
                checked={(selectedCities || []).includes(c)}
                onChange={() => toggleIssueCity(c)}
                className="hidden"
              />
              <div className={`w-3.5 h-3.5 rounded-sm border mr-2 flex items-center justify-center transition-colors ${(selectedCities || []).includes(c) ? 'border-sky-400 light:border-sky-500 bg-sky-500' : 'border-slate-500 light:border-slate-400 bg-transparent'}`}>
                {(selectedCities || []).includes(c) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-[14px] font-medium tracking-wide">{c}</span>
            </label>
            <button aria-label="删除" onClick={() => handleCityRemove(c)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 light:text-slate-900 text-white rounded-full text-[12px] flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all z-10 shadow-sm leading-none pb-[1px] transform scale-50 group-hover/item:scale-100 focus:opacity-100 duration-200">×</button>
          </div>
        ))}
        {isEditingCities ? (
          <input
            autoFocus
            value={newCity}
            onChange={e => setNewCity(e.target.value)}
            onKeyDown={handleCityAdd}
            onBlur={() => { setIsEditingCities(false); setNewCity(''); }}
            className="w-[80px] bg-sky-500/10 text-sky-200 px-3 py-1.5 text-[14px] rounded outline-none border border-sky-500/50 focus:border-sky-400 focus:shadow-[0_0_8px_rgba(56,189,248,0.4)] transition-all"
            placeholder="回车确认"
          />
        ) : (
          <button 
            onClick={() => setIsEditingCities(true)}
            className="px-3 py-1 text-[16px] h-[34px] flex items-center justify-center light:text-slate-600 text-slate-500 hover:light:text-sky-700 text-sky-300 hover:bg-sky-500/20 rounded font-medium transition-colors border border-dashed border-slate-700/50 light:border-slate-300 hover:border-sky-500/50"
            title="新增城市"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};
