import React, { useRef, useCallback, useEffect } from "react";
import { Theme } from "../types";
import { motion } from "motion/react";
import { 
  LayoutDashboard, Command, 
  WalletCards, 
  Calculator, 
  FileWarning, 
  Download, 
  Settings, 
  MessageSquareHeart, 
  Activity,
  FolderOpen
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
  const MENU_ITEMS = [
    { id: "dashboard", icon: <LayoutDashboard size={18} strokeWidth={2} />, label: "首页看板" },
    { id: "salary_bind", icon: <WalletCards size={18} strokeWidth={2} />, label: "骑手支付绑定" },
    { id: "core", icon: <Calculator size={18} strokeWidth={2} />, label: "兼职薪资核算" },
    { id: "issue_orders", icon: <FileWarning size={18} strokeWidth={2} />, label: "问题单生成" },
    { id: "chat", icon: <MessageSquareHeart size={18} strokeWidth={2} />, label: "智能控制助手" },
    { id: "monitor", icon: <Activity size={18} strokeWidth={2} />, label: "任务监控" },
    { id: "deduction_config", icon: <Settings size={18} strokeWidth={2} />, label: "扣款项配置" },
    { id: "export_list", icon: <Download size={18} strokeWidth={2} />, label: "任务下载" },
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
    <div className="w-[240px] bg-[#030614]/60 light:bg-[#f8fafc]/80 backdrop-blur-xl border-r border-slate-800/50 light:border-slate-200/50 flex flex-col h-full shrink-0 relative z-20 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] bg-indigo-500/20 light:bg-indigo-400/10 rounded-full blur-[80px]"></div>
        <div className="absolute top-[40%] -right-[50px] w-[200px] h-[200px] bg-sky-500/10 light:bg-sky-400/10 rounded-full blur-[60px]"></div>
      </div>

      {/* Branding */}
      <div className="px-5 pt-8 pb-8 flex flex-col items-center relative z-10">
        <h1 className="font-sans text-2xl font-black tracking-tight text-slate-100 light:text-slate-800 cursor-pointer flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
            <Command size={18} strokeWidth={2.5} />
          </div>
          {theme.logo}
        </h1>
        {theme.sub && (
          <span className="text-slate-400 light:text-slate-500 text-xs mt-1.5 font-medium tracking-wide uppercase">
            {theme.sub}
          </span>
        )}
      </div>

      {/* Menus */}
      <div className="flex-1 px-3 overflow-y-auto pb-6 scrollbar-thin scrollbar-thumb-slate-700/50 light:scrollbar-thumb-slate-300/50 scrollbar-track-transparent relative z-10">
        <div className="space-y-1">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { handleMouseLeave(); onSelectMenu(item.id); }}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-300 text-[14px] font-medium relative group ${
                activeMenu === item.id
                  ? "text-indigo-400 light:text-indigo-600 bg-indigo-500/10 light:bg-indigo-50/80 font-bold"
                  : "text-slate-500 light:text-slate-500 hover:bg-slate-800/40 light:hover:bg-slate-100/80 hover:text-slate-200 light:hover:text-slate-800"
              }`}
            >
              {activeMenu === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 light:bg-indigo-600 rounded-r-full" />
              )}
              {item.id === 'chat' && hasUnreadChat && activeMenu !== 'chat' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"></div>
              )}
              <span className={`mr-3 ml-1 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${activeMenu === item.id ? "text-indigo-400 light:text-indigo-600" : ""}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

