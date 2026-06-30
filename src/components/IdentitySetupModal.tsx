import React, { useState } from 'react';
import { User, Monitor, Network, Building2 } from 'lucide-react';
import { Theme } from '../types';

interface IdentitySetupModalProps {
 theme: Theme;
 onComplete: (userName: string, department: string) => void;
}

export function IdentitySetupModal({ theme, onComplete }: IdentitySetupModalProps) {
 const [userName, setUserName] = useState(() => localStorage.getItem("app_identity_user") || "");
 const [department, setDepartment] = useState(() => localStorage.getItem("app_identity_department") || "");
 const [error, setError] = useState("");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!userName.trim() || !department.trim()) {
 setError("请填写完整信息，以便服务器归档");
 return;
 }
 localStorage.setItem("app_identity_user", userName.trim());
 localStorage.setItem("app_identity_department", department.trim());
 onComplete(userName.trim(), department.trim());
 };

 return (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 ">
 <div className="light:bg-slate-50 bg-[#020410] border light:border-slate-200 border-sky-500/20 light:shadow-[0_0_15px_rgba(14,165,233,0.05)] shadow-[0_0_50px_rgba(14,165,233,0.15)] rounded-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
 <div className="flex items-center gap-3 mb-6">
 <div className="w-10 h-10 rounded-xl bg-sky-500/10 border light:border-slate-200 border-sky-500/20 flex items-center justify-center">
 <Network className="w-5 h-5 light:text-sky-600 text-sky-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-sky-50 tracking-wide">节点标识设置</h2>
 <p className="text-sm light:text-sky-600 text-sky-400/60 mt-1">请配置客户端标识，用于溯源查账</p>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="space-y-5">
 <div className="space-y-2">
 <label className="text-sm font-medium light:text-slate-700 text-slate-400 flex items-center gap-2">
 <User className="w-4 h-4 text-sky-500/70" /> 姓名
 </label>
 <input
 type="text"
 value={userName}
 onChange={(e) => setUserName(e.target.value)}
 placeholder="例如：张三"
 className="w-full bg-slate-900/50 border light:border-slate-200 border-sky-500/20 rounded-xl px-4 py-3 text-sky-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition-all font-medium"
 />
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium light:text-slate-700 text-slate-400 flex items-center gap-2">
 <Building2 className="w-4 h-4 text-sky-500/70" /> 部门
 </label>
 <input
 type="text"
 value={department}
 onChange={(e) => setDepartment(e.target.value)}
 placeholder="例如：行政部"
 className="w-full bg-slate-900/50 border light:border-slate-200 border-sky-500/20 rounded-xl px-4 py-3 text-sky-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition-all font-medium"
 />
 </div>

 {error && <div className="text-rose-400 text-sm">{error}</div>}

 <div className="pt-2">
 <button
 type="submit"
 className="w-full relative group overflow-hidden bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 rounded-xl px-4 py-3 transition-all duration-300"
 >
 <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/10 to-sky-500/0 group-hover:translate-x-full transition-transform duration-700 ease-in-out -translate-x-full" />
 <span className="relative z-10 light:text-sky-600 text-sky-400 font-bold tracking-widest text-[15px] group-hover:light:text-sky-700 text-sky-300 transition-colors">
 保存并生成专属工作区
 </span>
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}

