import React, { useState, useEffect, useRef } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangeCyclePickerProps {
  cycles: string[];
  currentCycle: string;
  startDate: string;
  endDate: string;
  onChange: (cycle: string, start: string, end: string) => void;
  onUpdateCycles: (cycles: string[]) => void;
}

export function DateRangeCyclePicker({ cycles, currentCycle, startDate, endDate, onChange, onUpdateCycles }: DateRangeCyclePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isEditingCycles, setIsEditingCycles] = useState(false);
  const [newCycle, setNewCycle] = useState('');

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCycleSelect = (cycle: string) => {
    const today = new Date();
    const realY = today.getFullYear();
    const realM = String(today.getMonth() + 1).padStart(2, '0');
    const realD = String(today.getDate()).padStart(2, '0');

    const viewY = currentMonth.getFullYear();
    const viewM = String(currentMonth.getMonth() + 1).padStart(2, '0');
    
    let start = '';
    let end = '';

    if (cycle === '今天' || cycle === '日结') {
      start = `${realY}-${realM}-${realD}`;
      end = `${realY}-${realM}-${realD}`;
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (cycle === '本周' || cycle === '周结') {
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const mon = new Date(today);
      mon.setDate(today.getDate() + diffToMonday);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      start = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
      end = `${sun.getFullYear()}-${String(sun.getMonth()+1).padStart(2,'0')}-${String(sun.getDate()).padStart(2,'0')}`;
      setCurrentMonth(new Date(mon.getFullYear(), mon.getMonth(), 1));
    } else if (cycle === '上半月') {
      start = `${viewY}-${viewM}-01`;
      end = `${viewY}-${viewM}-15`;
    } else if (cycle === '下半月') {
      const lastDay = new Date(viewY, currentMonth.getMonth() + 1, 0).getDate();
      start = `${viewY}-${viewM}-16`;
      end = `${viewY}-${viewM}-${lastDay}`;
    } else if (cycle === '半月结') {
      if (today.getDate() <= 15) {
        start = `${realY}-${realM}-01`;
        end = `${realY}-${realM}-15`;
      } else {
        const lastDay = new Date(realY, today.getMonth() + 1, 0).getDate();
        start = `${realY}-${realM}-16`;
        end = `${realY}-${realM}-${lastDay}`;
      }
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (cycle === '当月' || cycle === '全职' || cycle === '月结') {
      const lastDay = new Date(viewY, currentMonth.getMonth() + 1, 0).getDate();
      start = `${viewY}-${viewM}-01`;
      end = `${viewY}-${viewM}-${lastDay}`;
    }

    if (start && end) {
      onChange(cycle, start, end);
      setIsOpen(false);
    } else {
      onChange(cycle, tempStart, tempEnd);
    }
  };

  const generateCalendar = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
        days.push(null); // padding for previous month, assuming Monday start
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(y, m, i));
    }
    return days;
  };

  const handleDateClick = (date: Date) => {
    const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dStr);
      setTempEnd('');
    } else {
      if (dStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dStr);
      } else {
        setTempEnd(dStr);
      }
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange('自定义', tempStart, tempEnd);
      setIsOpen(false);
    }
  };

  const handleCycleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCycle.trim()) {
      if (!cycles.includes(newCycle.trim())) {
        onUpdateCycles([...cycles, newCycle.trim()]);
      }
      setNewCycle('');
      setIsEditingCycles(false);
    }
  };

  const handleCycleRemove = (e: React.MouseEvent, cycleToRemove: string) => {
    e.stopPropagation();
    const nextCycles = cycles.filter(c => c !== cycleToRemove);
    onUpdateCycles(nextCycles);
  };

  const calendarDays = generateCalendar();
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const isInRange = (dStr: string) => {
    if (!tempStart || !tempEnd) return false;
    return dStr >= tempStart && dStr <= tempEnd;
  };

  const isSelected = (dStr: string) => dStr === tempStart || dStr === tempEnd;

  return (
    <div className="relative z-50 text-sky-100" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 glass-input border border-sky-500/20 hover:border-sky-500/50 rounded-xl transition-all shadow-[inset_0_0_12px_rgba(14,165,233,0.1)] hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] bg-slate-900/40"
      >
        <CalendarIcon className="w-5 h-5 text-sky-400" />
        <span className="text-sky-100 text-[15px] font-mono tracking-wider flex items-center">
          {currentCycle !== '自定义' ? <span className="mr-3 text-sky-300 font-medium px-2 py-0.5 bg-sky-500/20 rounded shadow-sm drop-shadow-md">{currentCycle}</span> : null}
          {startDate === endDate ? startDate?.replace(/-/g, '/') : `${startDate?.replace(/-/g, '/')} - ${endDate?.replace(/-/g, '/')}`}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 p-4 glass-panel-immersive bg-slate-900/90 backdrop-blur-2xl rounded-2xl border border-sky-500/40 shadow-[0_15px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(14,165,233,0.2)] z-[100] w-[460px] flex gap-5">
          
          {/* Quick Select Left Panel */}
          <div className="flex flex-col gap-2 w-[110px] border-r border-sky-500/20 pr-4">
            <div className="text-[12px] text-sky-200/60 mb-2 font-mono tracking-widest uppercase">快捷选择</div>
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[220px] custom-scrollbar pr-1">
              {cycles.map(c => (
                <div key={c} className="group relative">
                  <button
                    onClick={() => handleCycleSelect(c)}
                    className={`w-full text-left px-3 py-2 text-[14px] transition-all rounded-lg font-medium tracking-wide ${currentCycle === c ? 'bg-sky-500/30 text-white shadow-[inset_0_0_12px_rgba(14,165,233,0.5)] border border-sky-400/50' : 'text-slate-300 hover:text-white hover:bg-sky-500/20 border border-transparent'}`}
                  >
                    {c}
                  </button>
                  <button 
                    onClick={(e) => handleCycleRemove(e, c)} 
                    className="absolute p-1 top-1/2 -translate-y-1/2 right-1.5 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 leading-none shadow-md"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-2 mt-auto border-t border-sky-500/20">
              {isEditingCycles ? (
                <input
                  autoFocus
                  value={newCycle}
                  onChange={e => setNewCycle(e.target.value)}
                  onKeyDown={handleCycleAdd}
                  onBlur={() => { setIsEditingCycles(false); setNewCycle(''); }}
                  className="w-full bg-slate-900/60 text-sky-100 px-3 py-2 text-[13px] rounded outline-none border border-sky-500/50 focus:border-sky-400 shadow-inner"
                  placeholder="输入并回车"
                />
              ) : (
                <button 
                  onClick={() => setIsEditingCycles(true)} 
                  className="w-full text-center px-3 py-2 text-[13px] text-sky-400/80 hover:text-sky-300 hover:bg-sky-500/20 rounded-lg transition-colors border border-dashed border-sky-500/30 font-medium"
                >
                  + 添加周期
                </button>
              )}
            </div>
          </div>

          {/* Calendar Right Panel */}
          <div className="flex-1 flex flex-col pt-1">
            <div className="flex justify-between items-center mb-4 px-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-sky-500/20 rounded-lg text-sky-300 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="font-mono text-[15px] text-white font-bold tracking-wider">
                {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
              </div>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-sky-500/20 rounded-lg text-sky-300 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1.5 text-center mb-2 px-2">
              {weekDays.map(d => (
                <div key={d} className="text-sky-200/50 text-[12px] font-mono py-1 font-medium">{d}</div>
              ))}
              {calendarDays.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="p-2" />;
                const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const isSel = isSelected(dStr);
                const isR = isInRange(dStr);
                return (
                  <button
                    key={dStr}
                    onClick={() => handleDateClick(d)}
                    className={`
                      p-1.5 text-[13px] rounded-lg transition-all font-mono aspect-square flex items-center justify-center
                      ${isSel ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.8)] font-bold border border-sky-400' : 
                        isR ? 'bg-sky-500/30 text-sky-100' : 'text-slate-300 hover:bg-sky-500/20 hover:text-white border border-transparent'}
                    `}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-4 flex justify-between items-center px-2">
               <div className="text-[12px] font-mono text-sky-200/60 flex items-center gap-2">
                 {tempStart && tempEnd && tempStart === tempEnd ? (
                   <span>单日: <span className="text-sky-300">{tempStart}</span></span>
                 ) : (
                   <>
                     <span>起: <span className="text-sky-300">{tempStart || '--'}</span></span>
                     <span>-</span>
                     <span>止: <span className="text-sky-300">{tempEnd || '--'}</span></span>
                   </>
                 )}
               </div>
               <button 
                 onClick={handleApply}
                 disabled={!tempStart || !tempEnd}
                 className="px-5 py-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white rounded-lg text-[13px] font-bold tracking-wider transition-all shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:shadow-[0_0_25px_rgba(56,189,248,0.6)] border border-sky-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
               >
                 确定提取
               </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
