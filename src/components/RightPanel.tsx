import React, { useState, useEffect, useRef } from 'react';
import { Theme, AppConfig } from '../types';
import { File, Folder, HardDriveDownload, FileText, FileSpreadsheet, Download, ChevronRight, Clock, RefreshCw, Trash2, FolderPlus, Search, FolderTree, UploadCloud, ChevronDown } from 'lucide-react';

// Added TreeHoverMenu for Quick Access
function TreeHoverMenu({ title, basePath, fetchFiles, fetchWithAuth }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<any>(null);

  const handleMouseEnter = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
    if (treeData.length === 0 && !loading) {
      setLoading(true);
      try {
        const resp = await fetchWithAuth(`/api/files/tree`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: basePath }),
        });
        const data = await resp.json();
        setTreeData(data.tree || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const renderTree = (items: any[]) => {

    return (
      <ul className="pl-4 border-l border-cyan-500/10 ml-2 mt-1 space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="relative">
            {item.is_dir ? (
              <div className="group/tree">
                <button
                  onClick={() => { fetchFiles(item.path); setIsOpen(false); }}
                  className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-cyan-400 py-1"
                >
                  <Folder className="w-3 h-3" />
                  {item.name}
                </button>
                {item.children && item.children.length > 0 && renderTree(item.children)}
              </div>
            ) : (
              <button
                onClick={() => { fetchFiles(item.path); setIsOpen(false); }}
                className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-cyan-300 py-1"
              >
                <File className="w-3 h-3" />
                {item.name}
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div 
      className="relative z-50 group" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      <button 
        onClick={() => fetchFiles(basePath)} 
        className="px-3 py-1 flex items-center gap-1 text-[12px] bg-cyan-500/10 text-cyan-400 light:bg-slate-200 light:text-slate-700 rounded hover:bg-cyan-500/20 light:hover:bg-slate-300 shrink-0"
      >
        {title}
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-[300px] overflow-y-auto bg-[#0a0f1c] light:bg-white border border-sky-500/20 light:border-slate-200 rounded-lg shadow-xl p-3 scrollbar-thin scrollbar-thumb-sky-500/20">
          <div className="text-[11px] font-mono text-slate-500 mb-2 border-b border-slate-800 pb-1">
            快速跳转至子目录:
          </div>
          {loading ? (
            <div className="text-[12px] text-slate-400 animate-pulse">加载目录树中...</div>
          ) : (
            treeData.length > 0 ? (
              <div className="text-[12px]">
                {renderTree(treeData)}
              </div>
            ) : (
              <div className="text-[12px] text-slate-500">无子目录</div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function RightPanel({ theme, activeTab, config, isRunning }: { theme: Theme, activeTab: 'task' | 'output', config?: AppConfig, isRunning?: boolean }) {
 const [files, setFiles] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);
 const [currentPath, setCurrentPath] = useState<string>('');
 const [searchQuery, setSearchQuery] = useState('');
 const [internalTab, setInternalTab] = useState<'outputs' | 'uploads'>('outputs');
 const fileInputRef = useRef<HTMLInputElement>(null);

 const getWorkspaceId = () => {
 let wid = localStorage.getItem('app_workspace_id');
 return wid || 'default-workspace';
 };

 const fetchWithAuth = (url: string, options: any = {}) => {
 const headers = options.headers || {};
 headers['x-workspace-id'] = encodeURIComponent(getWorkspaceId());
 return fetch(url, { ...options, headers });
 };

 const fetchFiles = async (targetPath: string) => {
 if (!targetPath) return;
 setLoading(true);
 try {
 const resp = await fetchWithAuth(`/api/files`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ path: targetPath }),
 });
 const data = await resp.json();
 setFiles(data.files || []);
 setCurrentPath(targetPath);
 } catch(err) {
 console.error('Failed to fetch files:', err);
 }
 setLoading(false);
 };

 const handleDelete = async (e: React.MouseEvent, path: string) => {
 e.stopPropagation();
 if (!confirm('确定删除此项目吗？')) return;
 try {
 await fetchWithAuth(`/api/action_file`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ action: 'delete', path }),
 });
 fetchFiles(currentPath);
 } catch(err) {
 console.error('Failed to delete:', err);
 }
 };

 const handleCreateFolder = async () => {
 const name = prompt('请输入新文件夹名称：');
 if (!name) return;
 const newPath = currentPath + '/' + name;
 try {
 await fetchWithAuth(`/api/action_file`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ action: 'create_dir', path: newPath }),
 });
 fetchFiles(currentPath);
 } catch(err) {
 console.error('Failed to create folder:', err);
 }
 };

 const handleRefresh = () => {
 fetchFiles(currentPath);
 };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;
 
 // We upload each file to currentPath
 setLoading(true);
 try {
 for (let i = 0; i < files.length; i++) {
 const file = files[i];
 const formData = new FormData();
 formData.append('file', file);
 formData.append('targetPath', currentPath + '/' + file.name);
 
 await fetchWithAuth('/api/upload_file', {
 method: 'POST',
 body: formData,
 });
 }
 fetchFiles(currentPath);
 } catch (err) {
 console.error('Upload failed:', err);
 alert('上传失败: ' + err);
 }
 if (fileInputRef.current) fileInputRef.current.value = '';
 setLoading(false);
 };

 const getBasePath = () => {
 if (!config) return '';
 if (activeTab === 'output') {
 return internalTab === 'outputs' ? './outputs' : './uploads';
 }
 
 let base = config.sourcePath || config.basePath;
 
 // Safety check: if base points to a file, get its directory
 if (base && (base.toLowerCase().endsWith('.xlsx') || base.toLowerCase().endsWith('.csv') || base.toLowerCase().endsWith('.json'))) {
 const parts = base.split(/[/\\]/);
 parts.pop();
 base = parts.join('/');
 }

 return base;
 };

 useEffect(() => {
 if (!config) return;
 fetchFiles(getBasePath());
 }, [activeTab, internalTab, config, isRunning]);

 const handleItemClick = (item: any) => {
 if (item.is_dir) {
 fetchFiles(item.path);
 } else {
 const url = `/api/download?path=${encodeURIComponent(item.path)}&workspace_id=${encodeURIComponent(getWorkspaceId())}`;
 const a = document.createElement('a');
 a.href = url;
 a.download = item.name || 'download';
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 }
 };

 const handleGoUp = () => {
 if (!config) return;
 const base = getBasePath();
 if (currentPath.length > base.length) {
 const parts = currentPath.split(/[/\\]/);
 parts.pop();
 const parent = parts.join('/');
 if (parent && parent.length >= base.length) {
 fetchFiles(parent);
 } else {
 fetchFiles(base);
 }
 }
 };

 const navigateToBreadcrumb = (index: number, breadcrumbs: string[]) => {
 if (!config) return;
 const base = getBasePath();
 if (index === -1) {
 fetchFiles(base);
 return;
 }
 const targetPath = base + '/' + breadcrumbs.slice(0, index + 1).join('/');
 fetchFiles(targetPath);
 };

 const formatSize = (bytes: number) => {
 if (bytes === 0) return '';
 const k = 1024;
 const sizes = ['B', 'KB', 'MB', 'GB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
 };

 const formatTime = (ts: number) => {
 if (!ts) return '';
 const d = new Date(ts);
 return `${d.getMonth()+1}-${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
 };

 if (!config) return null;

 const base = getBasePath();
 const isSubFolder = currentPath && currentPath.length > base.length;
 
 // Create breadcrumbs array from the relative path
 let relativePath = currentPath.substring(base.length);
 if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
 relativePath = relativePath.substring(1);
 }
 const breadcrumbs = relativePath ? relativePath.split(/[/\\]/) : [];

 const IGNORE_LIST_OUTPUT = ['app', 'app.zip', 'node_modules', 'dist', 'src', 'public', 'backend', '.git'];
 const filteredFiles = files.filter(f => {
 if (!isSubFolder && activeTab === 'output' && internalTab === 'outputs' && IGNORE_LIST_OUTPUT.includes(f.name)) {
 return false;
 }
 if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) {
 return false;
 }
 return true;
 });

 return (
 <div className="flex flex-col h-full bg-slate-950/50 light:bg-slate-50 relative light:shadow-sm shadow-2xl rounded-tr-none rounded-br-none border-l light:border-slate-200 border-sky-500/10 overflow-hidden">
 {/* Premium Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b light:border-slate-200 border-sky-500/20 light:bg-white bg-[#0f172a] shrink-0">
 {/* Interactive Breadcrumbs */}
 <div className="flex items-center text-[13px] light:text-slate-500 text-slate-400 font-mono overflow-x-auto scrollbar-hide flex-1">
 <button 
 className={`flex items-center gap-2 hover:light:text-slate-800 hover:text-cyan-300 transition-colors ${!isSubFolder ? 'light:text-slate-900 text-cyan-400 font-bold' : ''}`}
 onClick={() => navigateToBreadcrumb(-1, breadcrumbs)}
 >
 <FolderTree className="w-4 h-4" />
 {activeTab === 'task' ? '任务资源目录' : '任务中心'}
 </button>
 
 {breadcrumbs.map((part, i) => (
 <React.Fragment key={i}>
 <ChevronRight className="w-4 h-4 mx-2 text-slate-600 light:text-slate-300 shrink-0" />
 <button 
 className={`hover:light:text-slate-800 hover:text-cyan-300 transition-colors ${i === breadcrumbs.length - 1 ? 'light:text-slate-900 text-cyan-400 font-bold' : ''}`}
 onClick={() => navigateToBreadcrumb(i, breadcrumbs)}
 >
 {part}
 </button>
 </React.Fragment>
 ))}
 </div>

 {/* Actions & Search */}
 <div className="flex items-center gap-4">
 {/* Folder Action */}
 {(activeTab === 'task' || (activeTab === 'output' && internalTab === 'uploads')) && (
 <>
 {activeTab === 'output' && internalTab === 'uploads' && (
 <>
 <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
 <button onClick={() => fileInputRef.current?.click()} className="p-1.5 light:text-slate-500 text-slate-400 hover:light:text-slate-800 hover:text-cyan-300 hover:bg-cyan-500/10 light:hover:bg-slate-100 rounded-lg transition-all" title="上传文件">
 <UploadCloud className="w-4 h-4" />
 </button>
 </>
 )}
 <button onClick={handleCreateFolder} className="p-1.5 light:text-slate-500 text-slate-400 hover:light:text-slate-800 hover:text-cyan-300 hover:bg-cyan-500/10 light:hover:bg-slate-100 rounded-lg transition-all" title="新建文件夹">
 <FolderPlus className="w-4 h-4" />
 </button>
 </>
 )}
 <button onClick={handleRefresh} className="p-1.5 light:text-slate-500 text-slate-400 hover:light:text-slate-800 hover:text-cyan-300 hover:bg-cyan-500/10 light:hover:bg-slate-100 rounded-lg transition-all" title="刷新目录">
 <RefreshCw className="w-4 h-4" />
 </button>
 <div className="w-[1px] h-4 bg-slate-700/50"></div>
 <div className="relative shrink-0 w-56">
 <Search className="w-4 h-4 light:text-slate-600 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="检索文件..."
 className="w-full light:bg-slate-50 bg-[#020410] border light:border-slate-200 border-sky-500/20 rounded-md pl-9 pr-3 py-1.5 text-[12px] light:text-slate-800 text-slate-300 light:font-medium placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
 />
 </div>
 </div>
 </div>

 {activeTab === 'output' && (
 <div className="flex flex-col">
  <div className="flex px-6 border-b light:border-slate-200 border-sky-500/10 light:bg-slate-100 bg-[#060b18]">
  <button
  onClick={() => { setInternalTab('outputs'); setCurrentPath(''); }}
  className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-all ${internalTab === 'outputs' ? 'border-cyan-400 light:border-slate-800 light:text-slate-900 text-cyan-400 font-bold bg-sky-500/10 light:bg-white' : 'border-transparent light:text-slate-600 text-slate-500 hover:light:text-slate-800 hover:text-slate-300'}`}
  >
  输出文件 (Outputs)
  </button>
  <button
  onClick={() => { setInternalTab('uploads'); setCurrentPath(''); }}
  className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-all ${internalTab === 'uploads' ? 'border-cyan-400 light:border-slate-800 light:text-slate-900 text-cyan-400 font-bold bg-sky-500/10 light:bg-white' : 'border-transparent light:text-slate-600 text-slate-500 hover:light:text-slate-800 hover:text-slate-300'}`}
  >
  云端上传资源 (Uploads)
  </button>
  </div>
  <div className="flex px-6 py-2 gap-2 bg-[#060b18] light:bg-slate-50 border-b border-sky-500/10 light:border-slate-200 flex-wrap">
  <span className="text-[12px] text-slate-500 my-auto mr-1 font-mono shrink-0">快速访问:</span>
  {internalTab === 'outputs' ? (
  <>
  <TreeHoverMenu title="问题单生成" basePath="./outputs/问题单生成" fetchFiles={fetchFiles} fetchWithAuth={fetchWithAuth} />
  <TreeHoverMenu title="兼职薪资" basePath="./outputs/兼职薪资" fetchFiles={fetchFiles} fetchWithAuth={fetchWithAuth} />
  <TreeHoverMenu title="骑手支付绑定" basePath="./outputs/骑手支付绑定" fetchFiles={fetchFiles} fetchWithAuth={fetchWithAuth} />
  </>
  ) : (
  <>
  <TreeHoverMenu title="我的工作区" basePath={`./uploads/${getWorkspaceId()}`} fetchFiles={fetchFiles} fetchWithAuth={fetchWithAuth} />
  </>
  )}
  </div>
 </div>
 )}

 <div className="flex-1 overflow-y-auto light:bg-slate-50 bg-[#020410] p-4 scrollbar-thin scrollbar-thumb-sky-500/20 scrollbar-track-transparent">
 <div className="flex flex-col h-full rounded-xl border light:border-slate-200 border-sky-500/20 bg-slate-950/40 shadow-[0_0_30px_rgba(14,165,233,0.05)] relative overflow-hidden">
 {/* Tech accents */}
 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent z-10"></div>
 
 <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sky-500/20 scrollbar-track-transparent relative z-0">
 <table className="w-full text-left text-[13px] whitespace-nowrap">
 <thead className="light:bg-white bg-[#0f172a]/90 light:text-slate-600 text-sky-300 border-b light:border-slate-200 border-sky-500/20 sticky top-0 z-20">
 <tr>
 <th className="py-4 px-5 font-semibold tracking-wider">列表任务/文件名称</th>
 <th className="py-4 px-5 font-semibold tracking-wider w-32">大小</th>
 <th className="py-4 px-5 font-semibold tracking-wider w-40">生成时间</th>
 <th className="py-4 px-5 font-semibold tracking-wider text-right w-32">操作</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-sky-500/10">
 {filteredFiles.map((file, i) => (
 <tr 
 key={i}
 onClick={() => handleItemClick(file)}
 className="hover:bg-sky-500/10 group cursor-pointer transition-colors"
 >
 <td className="py-3 px-5 relative">
 {/* Hover accent line */}
 <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
 <div className="flex items-center gap-3.5">
 <div className={`p-1.5 rounded-lg transition-colors border border-transparent group-hover:light:border-slate-200 border-sky-500/20 ${file.is_dir ? 'bg-sky-500/10' : file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? 'bg-emerald-500/10' : 'bg-slate-800/50'}`}>
 {file.is_dir ? (
 <Folder className="w-4 h-4 shrink-0 light:text-slate-500 text-sky-400 group-hover:light:text-slate-800 text-cyan-300 transition-colors" />
 ) : file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? (
 <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
 ) : (
 <FileText className="w-4 h-4 shrink-0 light:text-slate-700 text-slate-400 group-hover:light:text-slate-800 text-slate-300 light:font-medium transition-colors" />
 )}
 </div>
 <span className={`font-medium transition-colors tracking-wide ${file.is_dir ? 'text-sky-100 group-hover:light:text-slate-900 text-white' : 'light:text-slate-800 text-slate-300 light:font-medium group-hover:light:text-slate-900 text-white'}`}>
 {file.name}
 </span>
 </div>
 </td>
 <td className="py-3 px-5 light:text-slate-700 text-slate-400 font-mono text-[12px]">
 {!file.is_dir && formatSize(file.size)}
 {file.is_dir && <span className="text-slate-600">-</span>}
 </td>
 <td className="py-3 px-5 light:text-slate-700 text-slate-400 font-mono text-[12px] flex items-center gap-2">
 {file.mtime ? (
 <>
 <Clock className="w-3.5 h-3.5 light:text-slate-600 text-slate-500 opacity-60" />
 {formatTime(file.mtime)}
 </>
 ) : (
 <span className="text-slate-600">-</span>
 )}
 </td>
 <td className="py-3 px-5 text-right">
 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={(e) => handleDelete(e, file.path)} className="p-1.5 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 light:text-slate-600 text-slate-500 hover:text-red-400 transition-all shadow-sm" title="删除">
 <Trash2 className="w-4 h-4" />
 </button>
 {!file.is_dir && (
 <div className="p-1.5 rounded-lg border border-transparent hover:border-sky-500/30 hover:bg-sky-500/10 light:text-slate-500 text-slate-500 hover:light:text-slate-800 text-cyan-400 light:hover:bg-slate-100 transition-all shadow-sm" title="下载">
 <Download className="w-4 h-4" />
 </div>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Seamless empty state filler background to make empty space look intended */}
 {filteredFiles.length > 0 && !loading && (
 <div className="h-full min-h-[300px] border-t light:border-slate-200 border-sky-500/10 pointer-events-none opacity-20"
 style={{
 backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 52px, rgba(14, 165, 233, 0.1) 52px, rgba(14, 165, 233, 0.1) 53px)'
 }}>
 </div>
 )}
 
 {loading ? (
 <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 z-30">
 <div className="flex flex-col items-center gap-3">
 <div className="w-8 h-8 border-2 light:border-slate-200 border-sky-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
 <span className="text-xs light:text-slate-500 text-sky-400 font-mono animate-pulse">正在扫描链路层...</span>
 </div>
 </div>
 ) : filteredFiles.length === 0 ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center light:text-slate-600 text-slate-500 select-none bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.05)_0%,transparent_70%)]">
 <div className="relative mb-5 group">
 <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full group-hover:bg-sky-500/30 transition-all"></div>
 <div className="w-20 h-20 rounded-2xl light:bg-white bg-[#0f172a] border light:border-slate-200 border-sky-500/20 flex items-center justify-center light:shadow-[inset_0_2px_10px_rgba(14,165,233,0.05)] shadow-[inset_0_2px_20px_rgba(14,165,233,0.1)] relative z-10">
 <HardDriveDownload className="w-10 h-10 light:text-slate-300 text-sky-400/50" strokeWidth={1.5} />
 </div>
 </div>
 <p className="text-[14px] font-medium tracking-widest text-sky-100/70">节点暂无任务资源</p>
 <p className="text-[12px] font-mono tracking-widest light:text-slate-600 text-slate-500/60 mt-2">NO DATA AVAILABLE</p>
 </div>
 ) : null}
 </div>
 </div>
 </div>
 </div>
 );
}
