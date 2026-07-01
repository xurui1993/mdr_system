import React, { useRef, useCallback, useEffect, useState } from "react";
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
  ChevronRight,
  Calculator,
  Download
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
    { id: "formula_config", icon: <Calculator size={isCollapsed ? 22 : 18} strokeWidth={2} />, label: "薪资表模板引擎", color: "text-pink-400" },
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
      className="bg-[#020512]/60 light:bg-[#020512]/95 backdrop-blur-xl border-r border-[#1e293b]/50 flex flex-col h-full shrink-0 relative z-20 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] bg-indigo-500/20 light:bg-indigo-500/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Branding */}
      <div className={`px-5 pt-8 pb-8 flex flex-col items-center relative z-10 ${isCollapsed ? 'justify-center' : ''}`}>
        <h1 className="font-sans text-2xl font-black tracking-tight text-[#f1f5f9] cursor-pointer flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Calculator size={18} strokeWidth={2.5} />
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
            className="text-[#94a3b8] text-xs mt-1.5 font-medium tracking-wide uppercase whitespace-nowrap"
          >
            {theme.sub}
          </motion.span>
        )}
      </div>

      {/* Menus */}
      <div className="flex-1 px-3 overflow-y-auto overflow-x-hidden pb-6 scrollbar-thin scrollbar-thumb-[#334155]/50 scrollbar-track-transparent relative z-10">
        <div className="space-y-1.5">
          {MENU_ITEMS.map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { handleMouseLeave(); onSelectMenu(item.id); }}
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-3 rounded-xl transition-all duration-300 text-[14px] font-medium relative group ${
                  isActive
                    ? "text-[#f1f5f9] bg-[#ffffff]/5 shadow-sm border border-[#ffffff]/5"
                    : "text-[#94a3b8] hover:bg-[#1e293b]/40 hover:text-[#e2e8f0] border border-transparent"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                  />
                )}
                {item.id === 'chat' && hasUnreadChat && activeMenu !== 'chat' && (
                  <div className={`absolute ${isCollapsed ? 'top-1 right-1' : 'top-3 right-3'} w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse`}></div>
                )}
                <span className={`${isCollapsed ? '' : 'mr-3 ml-1'} flex-shrink-0 transition-all duration-300 ${isActive ? 'scale-110 ' + item.color : 'group-hover:scale-110 group-hover:' + item.color}`}>
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

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-[#1e293b]/50 relative z-10 flex justify-center">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-center p-2 rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e293b]/50 transition-colors ${!isCollapsed ? 'w-full' : ''}`}
          title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </motion.div>
  );
}
