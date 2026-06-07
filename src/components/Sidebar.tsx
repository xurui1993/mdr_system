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
    { id: 'core', icon: '🏠', label: '综合算薪终端' },
    { id: 'problem', icon: '🗑️', label: '问题单剔除' },
    { id: 'price', icon: '💰', label: '单价重刷提审' },
    { id: 'overdue', icon: '⏰', label: '超期申诉提审' },
    { id: 'summary', icon: '📊', label: '兼职已发汇总' },
  ];

  return (
    <div className="w-[280px] glass-panel border border-sky-500/10 flex flex-col h-full shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      {/* Branding */}
      <div className="px-8 pt-10 pb-8 flex flex-col items-center relative">
        <div className="relative mb-8 group cursor-default shadow-2xl rounded-2xl" style={{ animation: 'float 6s ease-in-out infinite' }}>
          <div className="w-20 h-20 bg-[#0a1128] border-2 border-cyan-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.6)] relative z-10 mx-auto transition-all duration-500 group-hover:scale-110 group-hover:border-cyan-400 group-hover:shadow-[0_0_60px_rgba(6,182,212,0.8)]" style={{ animation: 'pulse-slow 4s ease-in-out infinite' }}>
            {/* Inner dynamic glow */}
            <div className="absolute inset-0 bg-cyan-400/20 rounded-2xl animate-ping opacity-50" style={{ animationDuration: '3s' }}></div>
            
            {/* Custom glowing abacus SVG */}
            <svg className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,1)] stroke-cyan-400" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/30 blur-3xl rounded-full opacity-80 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" style={{ animation: 'breathe 4s ease-in-out infinite' }}></div>
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-cyan-400 rounded-full border-[2px] border-[#01030b] z-20 shadow-[0_0_10px_rgba(34,211,238,1)] animate-bounce"></div>
          <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-indigo-400 rounded-full z-20 shadow-[0_0_8px_rgba(129,140,248,1)]"></div>
        </div>
        <h1 className="font-sans text-[22px] whitespace-nowrap font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-500 tracking-[0.2em] text-center drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{theme.logo}</h1>
        {theme.sub && (
          <div className="flex items-center gap-2 mt-4">
            <span className="w-2 h-px bg-sky-500/50"></span>
            <span className="text-sky-400/80 font-mono text-[12px] tracking-[0.1em] font-medium uppercase">{theme.sub}</span>
            <span className="w-2 h-px bg-sky-500/50"></span>
          </div>
        )}
        
        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent mt-8"></div>
      </div>

      {/* Menus */}
      <div className="flex-1 px-4 overflow-y-auto pb-6">
        <div className="space-y-2 mt-2">
          {MENU_ITEMS.map(item => (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              key={item.id}
              onClick={() => onSelectMenu(item.id)}
              className={`w-full flex items-center px-5 py-4 rounded-xl transition-all duration-300 text-[15px] font-medium tracking-wider relative overflow-hidden group ${
                activeMenu === item.id 
                  ? 'bg-gradient-to-r from-sky-500/20 to-transparent border-l-2 border-sky-400 text-sky-100 shadow-[inset_0px_0px_20px_rgba(56,189,248,0.05)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent'
              }`}
            >
              {activeMenu === item.id && (
                <div className="absolute top-0 right-0 h-full w-[50px] bg-gradient-to-l from-sky-500/10 to-transparent"></div>
              )}
              <span className={`mr-4 text-[18px] transition-all duration-300 ${activeMenu === item.id ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'opacity-60 group-hover:text-sky-300'}`}>
                {item.icon}
              </span>
              <span className="relative z-10 font-display">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
      

    </div>
  );
}
