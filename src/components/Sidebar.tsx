import React from 'react';
import { Theme } from '../types';
import { motion } from 'motion/react';

interface SidebarProps {
  theme: Theme;
  activeMenu: string;
  onSelectMenu: (menu: string) => void;
  isRunning: boolean;
}

export function Sidebar({ theme, activeMenu, onSelectMenu, isRunning }: SidebarProps) {
  const MENU_ITEMS = [
    { id: 'dashboard', icon: '◱', label: '首页看板' },
    { id: 'core', icon: '✦', label: '兼职薪资核算' },
    { id: 'issue_orders', icon: '▤', label: '问题单生成' },
    { id: 'parttime_details', icon: '◈', label: '兼职核算记录' },
    { id: 'salary_reissue', icon: '◬', label: '薪资补发记录' },
    { id: 'salary_bind', icon: '◎', label: '发薪工具绑定' },
    { id: 'referral_internal', icon: '⊞', label: '内推发放记录' },
    { id: 'referral_field', icon: '◉', label: '地推发放记录' },
    { id: 'abnormal_resignation', icon: '⚠', label: '异常离职流程' },
  ];

  return (
    <div className="w-[240px] glass-panel border-r border-sky-500/10 flex flex-col h-full shrink-0 relative z-20 shadow-[8px_0_30px_rgba(0,0,0,0.6)] bg-[#030614]/80 backdrop-blur-2xl">
      {/* Branding */}
      <div className="px-6 pt-10 pb-6 flex flex-col items-center relative">
        <div className="relative mb-6 group cursor-default shadow-xl rounded-2xl" style={{ animation: 'float 6s ease-in-out infinite' }}>
          <div className="w-16 h-16 bg-[#0a1128] border-2 border-cyan-500/60 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)] relative z-10 mx-auto transition-all duration-500 group-hover:scale-110 group-hover:border-cyan-400 group-hover:shadow-[0_0_50px_rgba(6,182,212,0.8)]" style={{ animation: 'pulse-slow 4s ease-in-out infinite' }}>
            {/* Inner dynamic glow */}
            <div className="absolute inset-0 bg-cyan-400/20 rounded-2xl animate-ping opacity-50" style={{ animationDuration: '3s' }}></div>
            
            {/* Custom glowing abacus SVG */}
            <svg className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,1)] stroke-cyan-400" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Frame */}
              <rect x="2" y="3" width="20" height="18" rx="2" className="stroke-cyan-500" strokeWidth="2" />
              {/* Horizontal divider */}
              <line x1="2" y1="8" x2="22" y2="8" className="stroke-cyan-500" strokeWidth="2" />
              {/* Vertical rods */}
              <line x1="6" y1="3" x2="6" y2="21" className="stroke-cyan-600/60" />
              <line x1="12" y1="3" x2="12" y2="21" className="stroke-cyan-600/60" />
              <line x1="18" y1="3" x2="18" y2="21" className="stroke-cyan-600/60" />
              
              {/* Top beads */}
              <circle cx="6" cy="5.5" r="1.5" fill="currentColor" className="text-cyan-300 animate-pulse" />
              <circle cx="12" cy="5.5" r="1.5" fill="currentColor" className="text-cyan-400" />
              <circle cx="18" cy="5.5" r="1.5" fill="currentColor" className="text-cyan-300" />
              
              {/* Bottom beads (some pushed up, some down) */}
              <circle cx="6" cy="11" r="1.5" fill="currentColor" className="text-cyan-400" />
              <circle cx="6" cy="14" r="1.5" fill="currentColor" className="text-cyan-500" />
              <circle cx="6" cy="17" r="1.5" fill="currentColor" className="text-cyan-400" />
              
              <circle cx="12" cy="10" r="1.5" fill="currentColor" className="text-cyan-300" />
              <circle cx="12" cy="13" r="1.5" fill="currentColor" className="text-cyan-400" />
              <circle cx="12" cy="18" r="1.5" fill="currentColor" className="text-cyan-500" />
              
              <circle cx="18" cy="11" r="1.5" fill="currentColor" className="text-cyan-500" />
              <circle cx="18" cy="14" r="1.5" fill="currentColor" className="text-cyan-400" />
              <circle cx="18" cy="16.5" r="1.5" fill="currentColor" className="text-cyan-300 animate-pulse" />
            </svg>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-cyan-500/30 blur-2xl rounded-full opacity-80 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" style={{ animation: 'breathe 4s ease-in-out infinite' }}></div>
          <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-cyan-400 rounded-full border-[2px] border-[#01030b] z-20 shadow-[0_0_10px_rgba(34,211,238,1)] animate-bounce"></div>
          <div className="absolute -bottom-1.5 -left-1.5 w-2 h-2 bg-indigo-400 rounded-full z-20 shadow-[0_0_8px_rgba(129,140,248,1)]"></div>
        </div>
        <h1 className="font-sans text-[20px] whitespace-nowrap font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-50 to-cyan-400 tracking-[0.15em] text-center drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">{theme.logo}</h1>
        {theme.sub && (
          <div className="flex items-center gap-2 mt-3">
            <span className="w-1.5 h-px bg-sky-500/50"></span>
            <span className="text-sky-400/90 font-mono text-[11px] tracking-[0.1em] font-medium uppercase">{theme.sub}</span>
            <span className="w-1.5 h-px bg-sky-500/50"></span>
          </div>
        )}
        
        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent mt-6 mb-2"></div>
      </div>

      {/* Menus */}
      <div className="flex-1 px-3 overflow-y-auto pb-6 scrollbar-thin scrollbar-thumb-sky-500/20 scrollbar-track-transparent">
        <div className="space-y-[2px]">
          {MENU_ITEMS.map(item => (
            <motion.button
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.98 }}
              key={item.id}
              onClick={() => onSelectMenu(item.id)}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-all duration-300 text-[14px] font-bold tracking-wider relative overflow-hidden group ${
                activeMenu === item.id 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/5 border-l-[3px] border-cyan-400 text-cyan-50 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-sm' 
                  : 'text-slate-400 hover:text-cyan-100 hover:bg-slate-800/60 border-l-[3px] border-transparent'
              }`}
            >
              {activeMenu === item.id && (
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-cyan-400/10 to-transparent pointer-events-none"></div>
              )}
              <span className={`mr-3 flex-shrink-0 text-[18px] transition-all duration-300 ${activeMenu === item.id ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)] scale-110' : 'opacity-70 group-hover:text-cyan-400 group-hover:scale-105'}`}>
                {item.icon}
              </span>
              <span className="relative z-10 font-sans">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
      

    </div>
  );
}
