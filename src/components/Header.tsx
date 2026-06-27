import React from 'react';
import { Theme } from '../types';
import { Sun, Moon, Search, LayoutTemplate } from 'lucide-react';

interface HeaderProps {
  theme: Theme;
  activeMenu?: string;
  onAction?: (action: string) => void;
  appTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  city?: string;
}

const MENU_LABELS: Record<string, string> = {
  "dashboard": "首页看板",
  "salary_bind": "骑手支付绑定",
  "core": "兼职薪资核算",
  "issue_orders": "问题单生成",
  "chat": "智能控制助手",
  "monitor": "任务监控",
  "deduction_config": "扣款项配置",
  "export_list": "任务下载"
};

export function Header({ theme, activeMenu = 'dashboard', onAction, appTheme = 'dark', onToggleTheme }: HeaderProps) {
  return (
    <header className="h-[64px] flex items-center justify-between px-6 border-b border-slate-800/50 light:border-slate-200/50 shrink-0 bg-[#020410]/60 light:bg-white/60 backdrop-blur-xl relative z-10 transition-colors">
      <div className="flex items-center gap-4">
        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 light:bg-indigo-50 flex items-center justify-center border border-indigo-500/20 light:border-indigo-100">
            <LayoutTemplate className="w-4 h-4 text-indigo-400 light:text-indigo-600" />
          </div>
          <span className="text-slate-500 light:text-slate-400 tracking-wider">控制台</span>
          <span className="text-slate-600 light:text-slate-300">/</span>
          <h1 className="text-slate-100 light:text-slate-800 font-bold tracking-wide">
            {MENU_LABELS[activeMenu] || '概览'}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {onToggleTheme && (
          <button 
            onClick={onToggleTheme}
            className="flex items-center justify-center w-9 h-9 bg-slate-800/50 light:bg-white rounded-lg border border-slate-700/50 light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-indigo-400 light:hover:text-indigo-600 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
}
