import React from 'react';
import { Theme, UserProfile } from '../types';
import { Sun, Moon, LayoutTemplate } from 'lucide-react';

interface HeaderProps {
  theme: Theme;
  activeMenu?: string;
  onAction?: (action: string) => void;
  appTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  city?: string;
  userProfile?: UserProfile;
  onEditProfile?: () => void;
}

const MENU_LABELS: Record<string, string> = {
  "dashboard": "首页看板",
  "salary_bind": "骑手支付绑定",
  "core": "兼职薪资核算",
  "issue_orders": "问题单生成",
  "chat": "带薪摸鱼官",
  "monitor": "任务监控",
  "deduction_config": "扣款项配置",
  "formula_config": "薪资表模板引擎",
  "export_list": "任务下载"
};

export function Header({ theme, activeMenu = 'dashboard', onAction, appTheme = 'dark', onToggleTheme, userProfile, onEditProfile }: HeaderProps) {
  return (
    <header className="h-[72px] flex items-center justify-between px-6 border-b border-slate-800/50 light:border-slate-200/50 shrink-0 bg-[#020410]/80 light:bg-white/80 backdrop-blur-xl relative z-10 transition-colors">
      <div className="flex items-center gap-4">
        {/* Breadcrumb / Title with new styling */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-indigo-500/30 rounded-xl blur-md group-hover:blur-lg transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 light:from-indigo-50 light:to-purple-50 flex items-center justify-center border border-indigo-500/30 light:border-indigo-200 shadow-sm">
              <LayoutTemplate className="w-5 h-5 text-indigo-400 light:text-indigo-600 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-bold text-slate-100 light:text-slate-800 tracking-wide flex items-center gap-2">
              {MENU_LABELS[activeMenu] || '概览'}
              {activeMenu === 'chat' && <span className="flex w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)] animate-pulse ml-1.5"></span>}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <div className="flex items-center pl-1.5 pr-1.5 py-1.5 rounded-full bg-slate-800/40 light:bg-white border border-slate-700/50 light:border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-600 light:hover:border-slate-300 gap-2">
          {userProfile && (
            <button 
              onClick={onEditProfile}
              className="group flex items-center gap-3 pr-2 rounded-full transition-all"
            >
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 light:from-indigo-100 light:to-purple-100 flex items-center justify-center text-[18px] border border-indigo-500/30 light:border-indigo-200 group-hover:scale-105 transition-transform duration-300 shadow-inner">
                {userProfile.avatar}
                {userProfile.status && userProfile.status !== '离开' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px] border-[#020410] light:border-white bg-emerald-500 shadow-sm"></div>
                )}
              </div>
              <div className="flex items-center gap-2 pr-1">
                <span className="text-[15px] font-bold text-slate-200 light:text-slate-700 group-hover:text-indigo-400 light:group-hover:text-indigo-600 transition-colors">{userProfile.name}</span>
                <span className="text-[11px] text-indigo-300 light:text-indigo-600 font-medium px-1.5 py-0.5 bg-indigo-500/20 light:bg-indigo-50 border border-indigo-500/20 light:border-indigo-100 rounded">{userProfile.department}</span>
              </div>
            </button>
          )}

          {onToggleTheme && (
            <>
              <div className="w-[1px] h-6 bg-slate-700/50 light:bg-slate-200 mx-1"></div>
              <button 
                onClick={onToggleTheme}
                className="group flex items-center justify-center w-9 h-9 rounded-full text-slate-400 light:text-slate-500 hover:text-amber-400 light:hover:text-amber-500 hover:bg-slate-700/50 light:hover:bg-slate-100 transition-all shadow-sm"
                title="切换主题"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {appTheme === 'dark' ? <Sun className="w-[18px] h-[18px] relative z-10" /> : <Moon className="w-[18px] h-[18px] relative z-10" />}
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
