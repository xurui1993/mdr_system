import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { CloudRain, Cloud, Sun, CloudFog, CloudLightning, HardDrive } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  theme: Theme;
  onAction?: (action: string) => void;
  city?: string;
}

const WEATHER_MAP: Record<string, { temp: string, condition: string, icon: any, color: string }> = {
  "深圳": { temp: '28°C', condition: '多云', icon: Cloud, color: 'text-sky-300' },
  "北京": { temp: '18°C', condition: '晴朗', icon: Sun, color: 'text-amber-400' },
  "天津": { temp: '19°C', condition: '晴朗', icon: Sun, color: 'text-amber-400' },
  "大连": { temp: '15°C', condition: '雾霾', icon: CloudFog, color: 'text-slate-300' },
  "保定": { temp: '20°C', condition: '雾霾', icon: CloudFog, color: 'text-slate-400' },
  "广州": { temp: '29°C', condition: '雷阵雨', icon: CloudLightning, color: 'text-indigo-400' },
  "上海": { temp: '24°C', condition: '小雨', icon: CloudRain, color: 'text-blue-400' },
};

export function Header({ theme, onAction, city = '深圳' }: HeaderProps) {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [kiteFrame, setKiteFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('zh-CN', { hour12: false }));
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      setDate(`${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} // ${weekdays[now.getDay()]}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const spinner = setInterval(() => {
      setKiteFrame((prev) => (prev + 1) % theme.spin_frames.length);
    }, 100);
    return () => clearInterval(spinner);
  }, [theme]);

  return (
    <header className="h-[72px] flex items-center justify-between px-8 border-b border-sky-500/20 shrink-0 bg-slate-900/40 backdrop-blur-md relative z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-transparent to-indigo-500/5"></div>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent"></div>
      
      <div className="flex items-center gap-6 relative z-10">
        <div className="flex items-center gap-3 bg-sky-950/40 px-5 py-2.5 rounded-lg border border-sky-500/30 shadow-[inset_0_0_20px_rgba(14,165,233,0.15)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-sky-400/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          </div>
          <span className="text-emerald-400 font-mono text-[16px] font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] mt-[1px]">
            {theme.spin_frames[kiteFrame]}
          </span>
          <span className="tracking-[0.2em] ml-1 text-[15px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-sky-200 animate-breathe uppercase">
            告别公式的堆砌，让每一次核算都轻如羽毛。
          </span>
        </div>


      </div>

      <div className="flex items-center space-x-6 relative z-10">
        {onAction && theme.lbl_workspace && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAction("open_workspace")} 
            className="glass-input bg-slate-900/60 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-400/50 rounded-xl w-11 h-11 flex items-center justify-center transition-all group/workspace shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(56,189,248,0.2)] cursor-pointer" 
            title={theme.lbl_workspace}
          >
            <HardDrive className="w-5 h-5 text-sky-400/80 group-hover/workspace:text-white group-hover/workspace:scale-110 transition-all drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" strokeWidth={1.5} />
          </motion.button>
        )}

        {(() => {
          const weather = WEATHER_MAP[city] || { temp: '25°C', condition: '适宜', icon: Sun, color: 'text-amber-400' };
          const WeatherIcon = weather.icon;
  
          return (
            <div className="flex items-center gap-4 bg-slate-900/80 px-6 py-2.5 rounded-lg border border-sky-500/20 shadow-[inset_0_0_15px_rgba(14,165,233,0.1)] transition-all duration-500">
              <WeatherIcon className={`w-5 h-5 ${weather.color} drop-shadow-[0_0_8px_currentColor]`} />
              <div className="flex items-center gap-3">
                 <span className="text-slate-300 font-medium text-[15px]">{city}</span>
                 <span className="text-slate-500 text-[13px] font-mono tracking-widest">{weather.temp}</span>
              </div>
              <div className="w-px h-4 bg-sky-500/30"></div>
              <span className="text-sky-400 font-mono text-[14px] font-bold tracking-widest">{weather.condition}</span>
            </div>
          );
        })()}

        <div className="flex items-center gap-5 bg-slate-900/80 px-6 py-2.5 rounded-lg border border-sky-500/20 shadow-[inset_0_0_15px_rgba(14,165,233,0.1)] hover:border-sky-400/50 transition-colors duration-300">
            <span className="text-slate-400 font-mono text-[14px] tracking-widest">{date}</span>
            <div className="w-px h-5 bg-sky-500/30"></div>
            <span className="text-sky-300 font-mono text-[16px] font-bold tracking-wider drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">{time}</span>
        </div>
      </div>
    </header>
  );
}
