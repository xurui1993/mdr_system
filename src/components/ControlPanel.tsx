import React, { useState, useRef, useEffect } from 'react';
import { Theme, AppConfig } from '../types';
import { UploadCloud } from 'lucide-react';

interface ControlPanelProps {
  theme: Theme;
  config: AppConfig;
  onChangeConfig: (config: AppConfig) => void;
  onAction: (action: string) => void;
  onUploadFiles?: (files: { file: File; relativePath: string }[]) => Promise<void>;
  isRunning?: boolean;
}

export function ControlPanel({ theme, config, onChangeConfig, onAction, onUploadFiles, isRunning }: ControlPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUpPressTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        const now = Date.now();
        if (now - lastUpPressTime.current < 500) { // 500ms for double press
          handleClick();
          lastUpPressTime.current = 0; // reset
        } else {
          lastUpPressTime.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!onUploadFiles) return;

    const items = e.dataTransfer.items;
    const filesToUpload: { file: File; relativePath: string }[] = [];

    const traverseFileTree = async (item: any, path?: string) => {
      path = path || "";
      if (item.isFile) {
        const file = await new Promise<File>((resolve) => item.file(resolve));
        filesToUpload.push({ file, relativePath: path + file.name });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const readAllEntries = async () => {
          let allEntries: any[] = [];
          let entries: any[] = [];
          do {
            entries = await new Promise<any[]>((resolve) => {
              dirReader.readEntries((result: any[]) => resolve(result));
            });
            allEntries = allEntries.concat(entries);
          } while (entries.length > 0);
          return allEntries;
        };
        const entries = await readAllEntries();
        for (const entry of entries) {
          await traverseFileTree(entry, path + item.name + "/");
        }
      }
    };

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          await traverseFileTree(item);
        }
      }
    }

    if (filesToUpload.length > 0) {
      await onUploadFiles(filesToUpload);
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUploadFiles || !e.target.files) return;
    const files = e.target.files;
    const filesToUpload: { file: File; relativePath: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      filesToUpload.push({
        file: files[i],
        relativePath: files[i].webkitRelativePath || files[i].name,
      });
    }
    if (filesToUpload.length > 0) {
      await onUploadFiles(filesToUpload);
    }
  };

  return (
    <div 
      className={`light:bg-slate-50/50 light:shadow-sm rounded-3xl flex flex-col justify-center items-center p-5 relative overflow-hidden group border-2 border-dashed transition-all duration-300 h-full w-full cursor-pointer ${
        isDragging 
          ? 'border-sky-500 bg-sky-500/10 light:bg-sky-50 shadow-[0_0_30px_rgba(14,165,233,0.3)]' 
          : 'light:border-slate-300 border-sky-500/30 bg-slate-900/20 hover:border-sky-400 hover:bg-slate-900/40 light:hover:bg-slate-50 light:hover:border-sky-400/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={processDrop}
      onClick={handleClick}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        webkitdirectory="true" 
        {...({ directory: "true" } as any)} 
      />
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent opacity-30" />
      <div className="absolute -inset-x-20 -inset-y-20 bg-sky-500/5 blur-3xl rounded-full pointer-events-none mix-blend-screen" style={{ animation: 'breathe 8s ease-in-out infinite' }}/>

      <div className="flex flex-col items-center justify-center relative z-10 gap-4">
        <div className={`p-4 rounded-full transition-all duration-300 ${isDragging ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.6)] scale-110' : 'bg-slate-800/50 light:bg-slate-100 text-sky-400 light:text-sky-600 group-hover:bg-sky-500/20 light:group-hover:bg-sky-100 group-hover:scale-105'}`}>
          <UploadCloud size={32} />
        </div>
        <div className="text-center flex flex-col items-center gap-3">
          <div>
            <h3 className={`font-bold text-lg tracking-wide transition-colors duration-300 ${isDragging ? 'text-sky-300 light:text-sky-700' : 'text-slate-300 light:text-slate-700'}`}>
              一键拖拽 + 自动执行
            </h3>
            <p className="text-[13px] text-slate-500 light:text-slate-500 mt-1.5 font-medium tracking-wide max-w-sm">
              将包含源数据表格的文件夹拖拽至此区域，或点击选择
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-full border border-slate-700/50 light:border-slate-200 bg-slate-800/30 light:bg-slate-100/50 text-[11px] text-slate-400 font-medium">
            <span>快捷键</span>
            <div className="flex items-center gap-0.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-700 light:bg-white border border-slate-600 light:border-slate-200 shadow-sm text-slate-300 light:text-slate-600 font-sans">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-700 light:bg-white border border-slate-600 light:border-slate-200 shadow-sm text-slate-300 light:text-slate-600 font-sans">↑</kbd>
            </div>
            <span>打开弹窗</span>
          </div>
        </div>
      </div>
    </div>
  );
}
