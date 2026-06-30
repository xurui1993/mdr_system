import React, { useState } from 'react';
import { User, Building2, Image as ImageIcon } from 'lucide-react';
import { UserProfile, Theme } from '../types';

interface ProfileEditModalProps {
  theme: Theme;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const MODERN_AVATARS = ["🐏", "🐂", "👯", "🦀", "🦁", "🧚", "⚖️", "🦂", "🏹", "🐐", "🏺", "🐟"];

export function ProfileEditModal({ theme, profile, onSave, onClose }: ProfileEditModalProps) {
  const [name, setName] = useState(profile.name);
  const [department, setDepartment] = useState(profile.department);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !department.trim()) {
      setError("请填写完整信息");
      return;
    }
    onSave({ name: name.trim(), department: department.trim(), avatar, status: profile.status });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 " onClick={onClose}>
      <div 
        className="light:bg-slate-50 bg-[#020410] border light:border-slate-200 border-sky-500/20 shadow-[0_0_50px_rgba(14,165,233,0.15)] rounded-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom-4 fade-in duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xl">
            {avatar}
          </div>
          <div>
            <h2 className="text-xl font-bold text-sky-50 tracking-wide">修改个人信息</h2>
            <p className="text-sm light:text-sky-600 text-sky-400/60 mt-1">更新您的头像、姓名和部门</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium light:text-slate-700 text-slate-400 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-sky-500/70" /> 头像
            </label>
            <div className="flex flex-wrap gap-2 p-2 bg-slate-900/50 light:bg-slate-100 rounded-xl border border-sky-500/20 light:border-slate-200">
              {MODERN_AVATARS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`w-10 h-10 rounded-lg text-2xl flex items-center justify-center transition-all ${
                    avatar === emoji ? 'bg-sky-500/20 border border-sky-500 scale-110' : 'hover:bg-slate-800 light:hover:bg-slate-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium light:text-slate-700 text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-500/70" /> 姓名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              className="w-full bg-slate-900/50 border light:border-slate-200 border-sky-500/20 rounded-xl px-4 py-3 text-sky-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition-all font-medium"
            />
          </div>

          {error && <div className="text-rose-400 text-sm">{error}</div>}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl border border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600 hover:bg-slate-800 light:hover:bg-slate-100 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="w-2/3 relative group overflow-hidden bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 rounded-xl px-4 py-3 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/10 to-sky-500/0 group-hover:translate-x-full transition-transform duration-700 ease-in-out -translate-x-full" />
              <span className="relative z-10 light:text-sky-600 text-sky-400 font-bold tracking-widest text-[15px] group-hover:light:text-sky-700 text-sky-300 transition-colors">
                保存
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
