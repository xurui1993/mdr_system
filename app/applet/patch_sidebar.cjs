const fs = require('fs');

const sidebarCode = `import React, { useRef, useCallback, useEffect, useState } from "react";
import { Theme } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, Command, 
  Link, 
  CircleDollarSign, 
  FileWarning, 
  CloudDownload, 
  SlidersHorizontal, 
  Coffee, 
  Activity,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  theme: Theme;
  activeMenu: string;
  onSelectMenu: (menu: string) => void;
  isRunning: boolean;
  hasUnreadChat?: boolean;
}

export function Sidebar({
  theme,
  activeMenu,
  onSelectMenu,
  isRunning,
  hasUnreadChat
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const MENU_ITEMS = [
    { id: "dashboard", icon: <LayoutDashboard size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "首页看板", color: "text-blue-400" },
    { id: "salary_bind", icon: <Link size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "骑手支付绑定", color: "text-emerald-400" },
    { id: "core", icon: <CircleDollarSign size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "兼职薪资核算", color: "text-amber-400" },
    { id: "issue_orders", icon: <FileWarning size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "问题单生成", color: "text-rose-400" },
    { id: "deduction_config", icon: <SlidersHorizontal size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "扣款项配置", color: "text-purple-400" },
    { id: "chat", icon: <Coffee size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "带薪摸鱼官", color: "text-sky-400" },
    { id: "monitor", icon: <Activity size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "任务监控", color: "text-teal-400" },
    { id: "export_list", icon: <CloudDownload size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "任务下载", color: "text-indigo-400" },
  ];

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((id: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      onSelectMenu(id);
    }, 200);
  }, [onSelectMenu]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="bg-[#030614]/60 light:bg-[#f8fafc]/80 backdrop-blur-xl border-r border-slate-800/50 light:border-slate-200/50 flex flex-col h-full shrink-0 relative z-20 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] bg-indigo-500/20 light:bg-indigo-400/10 rounded-full blur-[80px]"></div>
        <div className="absolute top-[40%] -right-[50px] w-[200px] h-[200px] bg-sky-500/10 light:bg-sky-400/10 rounded-full blur-[60px]"></div>
      </div>

      {/* Branding */}
      <div className={\`px-5 pt-8 pb-8 flex flex-col items-center relative z-10 \${isCollapsed ? 'justify-center' : ''}\`}>
        <h1 className="font-sans text-2xl font-black tracking-tight text-slate-100 light:text-slate-800 cursor-pointer flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Command size={18} strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap"
            >
              {theme.logo}
            </motion.span>
          )}
        </h1>
        {!isCollapsed && theme.sub && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-400 light:text-slate-500 text-xs mt-1.5 font-medium tracking-wide uppercase whitespace-nowrap"
          >
            {theme.sub}
          </motion.span>
        )}
      </div>

      {/* Menus */}
      <div className="flex-1 px-3 overflow-y-auto overflow-x-hidden pb-6 scrollbar-thin scrollbar-thumb-slate-700/50 light:scrollbar-thumb-slate-300/50 scrollbar-track-transparent relative z-10">
        <div className="space-y-1.5">
          {MENU_ITEMS.map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { handleMouseLeave(); onSelectMenu(item.id); }}
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
                className={\`w-full flex items-center \${isCollapsed ? 'justify-center px-0' : 'px-3'} py-3 rounded-xl transition-all duration-300 text-[14px] font-medium relative group \${
                  isActive
                    ? "text-slate-100 light:text-slate-900 bg-white/5 light:bg-slate-200/50 shadow-sm border border-white/5 light:border-slate-300/50"
                    : "text-slate-400 light:text-slate-500 hover:bg-slate-800/40 light:hover:bg-slate-100/80 hover:text-slate-200 light:hover:text-slate-800 border border-transparent"
                }\`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 light:bg-indigo-600 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                  />
                )}
                {item.id === 'chat' && hasUnreadChat && activeMenu !== 'chat' && (
                  <div className={\`absolute \${isCollapsed ? 'top-1 right-1' : 'top-3 right-3'} w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse\`}></div>
                )}
                <span className={\`\${isCollapsed ? '' : 'mr-3 ml-1'} flex-shrink-0 transition-all duration-300 \${isActive ? 'scale-110 ' + item.color : 'group-hover:scale-110 group-hover:' + item.color}\`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="whitespace-nowrap flex-1 text-left"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Collapse Toggle Button */}
      <div className="relative z-10 p-4 border-t border-slate-800/50 light:border-slate-200/50 flex justify-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 rounded-full bg-slate-800/50 light:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700 light:hover:bg-slate-300 transition-colors border border-slate-700/50 light:border-slate-300 shadow-sm group"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft size={16} className="group-hover:scale-110 transition-transform" />
          </motion.div>
        </button>
      </div>
    </motion.div>
  );
}
`;
fs.writeFileSync('src/components/Sidebar.tsx', sidebarCode);
