import React, { useState, useEffect } from 'react';
import { Theme, AppConfig } from '../types';
import { File, Folder, HardDriveDownload, FileText, FileSpreadsheet } from 'lucide-react';

export function RightPanel({ theme, activeTab, config, isRunning }: { theme: Theme, activeTab: 'task' | 'output', config?: AppConfig, isRunning?: boolean }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');

  const fetchFiles = async (targetPath: string) => {
    if (!targetPath) return;
    setLoading(true);
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/files?path=${encodeURIComponent(targetPath)}`);
      const data = await resp.json();
      setFiles(data.files || []);
      setCurrentPath(targetPath);
    } catch(err) {
      console.error('Failed to fetch files:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!config) return;
    const base = activeTab === 'task' ? config.sourcePath : (config.workspacePath || config.basePath);
    fetchFiles(base);
  }, [activeTab, config, isRunning]);

  const handleItemClick = (item: any) => {
    if (item.is_dir) {
      fetchFiles(item.path);
    } else {
      // open file logic
      fetch(`http://127.0.0.1:8000/api/open/explorer?path=${encodeURIComponent(item.path)}`);
    }
  };

  const handleGoUp = () => {
    if (!config) return;
    const base = activeTab === 'task' ? config.sourcePath : (config.workspacePath || config.basePath);
    if (currentPath.length > base.length) {
       // Just split to go back, we do a very naive parent directory finding
       const parts = currentPath.split(/[/\\]/);
       parts.pop();
       const parent = parts.join('/');
       if (parent) {
         fetchFiles(parent);
       } else {
         fetchFiles(base);
       }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!config) return null;

  const base = activeTab === 'task' ? config.sourcePath : (config.workspacePath || config.basePath);
  const isSubFolder = currentPath && currentPath.length > base.length;

  return (
    <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-sm relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-sky-500/10 shrink-0 bg-slate-900/40">
        <div className="flex items-center gap-2">
           <span className="text-sky-400 text-sm font-medium">{activeTab === 'task' ? '源文件区块' : '生成产物仓库'}</span>
        </div>
        <span className="text-xs text-slate-500 font-mono truncate max-w-[200px]" title={currentPath}>{currentPath}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-sky-500/20 scrollbar-track-transparent">
        {loading ? (
           <div className="flex items-center justify-center h-full">
             <div className="w-5 h-5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></div>
           </div>
        ) : files.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-slate-500 select-none pb-10">
             <HardDriveDownload className="w-12 h-12 mb-3 opacity-20" />
             <p className="text-sm font-medium">目录为空</p>
           </div>
        ) : (
          <div className="flex flex-col gap-1">
            {isSubFolder && (
              <div 
                onClick={handleGoUp}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sky-500/10 cursor-pointer transition-colors group"
              >
                 <Folder className="w-4 h-4 text-slate-400 group-hover:text-sky-300" />
                 <span className="text-[13px] text-slate-400 font-medium tracking-wide">.. (返回上一级)</span>
              </div>
            )}
            {files.map((file, i) => (
              <div 
                key={i}
                onClick={() => handleItemClick(file)}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sky-500/10 group cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  {file.is_dir ? (
                    <Folder className="w-4 h-4 shrink-0 text-sky-400/80 group-hover:text-sky-300" />
                  ) : file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? (
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400/80 group-hover:text-emerald-300" />
                  ) : (
                    <FileText className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-amber-300" />
                  )}
                  <span className="text-[13px] text-slate-300 font-medium truncate group-hover:text-white transition-colors">
                    {file.name}
                  </span>
                </div>
                {!file.is_dir && (
                  <div className="text-[11px] text-slate-500 font-mono tracking-wider shrink-0">{formatSize(file.size)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
