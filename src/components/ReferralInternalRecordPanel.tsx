import React, { useState, useMemo, useRef } from 'react';
import { Theme, AppConfig } from '../types';
import { Search, Download, Upload, ChevronDown, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface ReferralInternalRecordPanelProps {
  theme: Theme;
  config: AppConfig;
  isRunning: boolean;
  onRun: (action: string) => void;
  onBrowseFolder: () => void;
}

export function ReferralInternalRecordPanel({ theme, config, isRunning }: ReferralInternalRecordPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedApprovalNum, setSelectedApprovalNum] = useState('');
  
  // Mock data for the table
  const [data, setData] = useState([
    { id: 1, month: '2026-05', approvalNum: 'IN-202605-001', city: '深圳', site: '南山中心', referrerName: '吴刚', referrerPhone: '13811112222', refereeName: '张三', reward: 500.00, type: '内推', status: '已发放' },
    { id: 2, month: '2026-05', approvalNum: 'IN-202605-002', city: '广州', site: '天河一站', referrerName: '赵铁柱', referrerPhone: '13922223333', refereeName: '李四', reward: 300.00, type: '内推', status: '待审核' },
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const approvalNums = useMemo(() => Array.from(new Set(data.map(item => item.approvalNum))), [data]);
  const cities = useMemo(() => Array.from(new Set(data.map(item => item.city))), [data]);
  const months = useMemo(() => Array.from(new Set(data.map(item => item.month))), [data]);
  const statuses = useMemo(() => Array.from(new Set(data.map(item => item.status))), [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.referrerName.includes(searchQuery) || item.refereeName.includes(searchQuery);
      const matchApproval = selectedApprovalNum ? item.approvalNum === selectedApprovalNum : true;
      const matchCity = selectedCity ? item.city === selectedCity : true;
      const matchMonth = selectedMonth ? item.month === selectedMonth : true;
      const matchStatus = selectedStatus ? item.status === selectedStatus : true;
      return matchSearch && matchApproval && matchCity && matchMonth && matchStatus;
    });
  }, [data, searchQuery, selectedApprovalNum, selectedCity, selectedMonth, selectedStatus]);

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId !== null) {
      setData(data.filter(item => item.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setEditForm({ ...record });
  };

  const handleSave = () => {
    if (editingId) {
      if (editingId === -1) {
        setData([{ ...editForm, id: Date.now() }, ...data]);
      } else {
        setData(data.map(item => item.id === editingId ? { ...item, ...editForm } : item));
      }
      setEditingId(null);
    }
  };

  const handleAdd = () => {
    const newRecord = {
      id: -1, month: '2026-06', approvalNum: 'IN-NEW', city: '未知', site: '未知', referrerName: '', referrerPhone: '', refereeName: '', reward: 0, type: '内推', status: '待审核'
    };
    setEditingId(-1);
    setEditForm(newRecord);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const headers = ['核算月份', '核算单号', '城市', '站点', '推荐人姓名', '被推荐人姓名', '奖励金额', '状态'];
    const csvContent = [
      headers.join(','),
      ...data.map(item => [item.month, item.approvalNum, item.city, item.site, item.referrerName, item.refereeName, item.reward, item.status].join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `内推发放记录_${Date.now()}.csv`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.trim()).filter(row => row);
      if (rows.length <= 1) return;
      
      const newRecords = rows.slice(1).map((row, index) => {
        const cols = row.split(',');
        return {
          id: Date.now() + index,
          month: cols[0] || '2026-06',
          approvalNum: cols[1] || `IN-IMP-${Date.now().toString().slice(-4)}`,
          city: cols[2] || '未知',
          site: cols[3] || '未知',
          referrerName: cols[4] || '未知',
          referrerPhone: '未知',
          refereeName: cols[5] || '未知',
          reward: Number(cols[6]) || 0,
          type: '内推',
          status: cols[7] || '待审核'
        };
      });
      setData(prev => [...newRecords, ...prev]);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="glass-panel-immersive rounded-3xl cyber-border flex flex-col p-6 relative overflow-hidden h-full min-h-[400px] border border-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.1)]">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-transparent opacity-30" />
      
      <div className="relative z-10 flex flex-col h-full gap-6">
        {/* Header & Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[24px] drop-shadow-md filter text-sky-400">⊞</span>
            <h2 className="text-[20px] font-bold text-sky-100 tracking-wide">内推发放记录</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="glass-input rounded-xl px-3 py-2 flex items-center gap-2 border border-white/5 focus-within:border-sky-500/50 transition-all w-48">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索推荐人/被推荐人姓名..."
                className="bg-transparent border-none outline-none text-[13px] text-sky-100 placeholder:text-slate-500 flex-1 w-full"
              />
            </div>
            
            {/* Filter Dropdowns */}
            <div className="hidden xl:flex items-center gap-2">
              <div className="relative flex items-center">
                <select 
                  value={selectedCity} 
                  onChange={e => setSelectedCity(e.target.value)}
                  className="appearance-none glass-input hover:bg-slate-800/80 rounded-xl px-3 py-2 pr-8 text-[13px] text-slate-300 cursor-pointer border border-transparent hover:border-white/10 transition-all outline-none bg-transparent"
                >
                  <option value="" className="bg-slate-800">全部城市</option>
                  {cities.map(city => <option key={city} value={city} className="bg-slate-800">{city}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 pointer-events-none" />
              </div>
              <div className="relative flex items-center">
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="appearance-none glass-input hover:bg-slate-800/80 rounded-xl px-3 py-2 pr-8 text-[13px] text-slate-300 cursor-pointer border border-transparent hover:border-white/10 transition-all outline-none bg-transparent"
                >
                  <option value="" className="bg-slate-800">全部月份</option>
                  {months.map(month => <option key={month} value={month} className="bg-slate-800">{month}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 pointer-events-none" />
              </div>
              <div className="relative flex items-center">
                <select 
                  value={selectedApprovalNum} 
                  onChange={e => setSelectedApprovalNum(e.target.value)}
                  className="appearance-none glass-input hover:bg-slate-800/80 rounded-xl px-3 py-2 pr-8 text-[13px] text-slate-300 cursor-pointer border border-transparent hover:border-white/10 transition-all outline-none bg-transparent"
                >
                  <option value="" className="bg-slate-800">全部编号</option>
                  {approvalNums.map(a => <option key={a} value={a} className="bg-slate-800">{a}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 pointer-events-none" />
              </div>
              <div className="relative flex items-center">
                <select 
                  value={selectedStatus} 
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="appearance-none glass-input hover:bg-slate-800/80 rounded-xl px-3 py-2 pr-8 text-[13px] text-slate-300 cursor-pointer border border-transparent hover:border-white/10 transition-all outline-none bg-transparent"
                >
                  <option value="" className="bg-slate-800">全部状态</option>
                  {statuses.map(status => <option key={status} value={status} className="bg-slate-800">{status}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 pointer-events-none" />
              </div>
            </div>

            <div className="h-6 w-px bg-white/10 mx-1"></div>

            <button onClick={handleAdd} className="glass-input bg-sky-500/20 hover:bg-sky-500/30 text-sky-100 hover:text-sky-300 border border-sky-500/30 hover:border-sky-500/50 rounded-xl px-4 py-2 text-[13px] flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(14,165,233,0.1)]">
              <Plus className="w-4 h-4" />
              <span>新增记录</span>
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleImport} />
            <button onClick={() => fileInputRef.current?.click()} className="glass-input hover:bg-sky-500/10 text-sky-100 hover:text-sky-300 border border-white/5 hover:border-sky-500/30 rounded-xl px-4 py-2 text-[13px] flex items-center gap-2 transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>导入</span>
            </button>
            <button onClick={handleExport} className="glass-input hover:bg-sky-500/10 text-sky-100 hover:text-sky-300 border border-white/5 hover:border-sky-500/30 rounded-xl px-4 py-2 text-[13px] flex items-center gap-2 transition-all cursor-pointer">
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-slate-900/40 backdrop-blur-sm">
          <table className="w-full text-left border-collapse text-[13px] whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-800/90 backdrop-blur-md border-b border-white/10 z-10">
              <tr>
                <th className="px-4 py-4 font-medium text-slate-400">发放月份</th>
                <th className="px-4 py-4 font-medium text-slate-400">发放审批编号</th>
                <th className="px-4 py-4 font-medium text-slate-400">业务城市</th>
                <th className="px-4 py-4 font-medium text-slate-400">站点名称</th>
                <th className="px-4 py-4 font-medium text-slate-400">推荐人姓名</th>
                <th className="px-4 py-4 font-medium text-slate-400">被推荐人姓名</th>
                <th className="px-4 py-4 font-medium text-slate-400 text-right">奖励金额(元)</th>
                <th className="px-4 py-4 font-medium text-slate-400 text-center">状态</th>
                <th className="px-4 py-4 font-medium text-slate-400 text-center min-w-[100px]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {editingId === -1 && (
                <tr className="bg-sky-500/10">
                  <td className="px-4 py-3"><input type="text" className="w-20 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 placeholder:text-slate-500" value={editForm.month} onChange={e => setEditForm({...editForm, month: e.target.value})} /></td>
                  <td className="px-4 py-3"><input type="text" className="w-24 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 placeholder:text-slate-500" value={editForm.approvalNum} onChange={e => setEditForm({...editForm, approvalNum: e.target.value})} /></td>
                  <td className="px-4 py-3"><input type="text" className="w-16 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 placeholder:text-slate-500" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} /></td>
                  <td className="px-4 py-3"><input type="text" className="w-20 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 placeholder:text-slate-500" value={editForm.site} onChange={e => setEditForm({...editForm, site: e.target.value})} /></td>
                  <td className="px-4 py-3"><input type="text" className="w-16 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 placeholder:text-slate-500" value={editForm.referrerName} onChange={e => setEditForm({...editForm, referrerName: e.target.value})} /></td>
                  <td className="px-4 py-3"><input type="text" className="w-16 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 placeholder:text-slate-500" value={editForm.refereeName} onChange={e => setEditForm({...editForm, refereeName: e.target.value})} /></td>
                  <td className="px-4 py-3 text-right"><input type="number" className="w-20 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 placeholder:text-slate-500 text-right" value={editForm.reward} onChange={e => setEditForm({...editForm, reward: Number(e.target.value)})} /></td>
                  <td className="px-4 py-3"><input type="text" className="w-16 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 placeholder:text-slate-500 mx-auto block" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} /></td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button onClick={handleSave} className="p-1 text-green-400 hover:bg-green-400/10 rounded transition-colors" title="保存"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-400/10 rounded transition-colors" title="取消"><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              )}
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-sky-500/5 transition-colors">
                    {editingId === row.id ? (
                      <>
                        <td className="px-4 py-3"><input type="text" className="w-20 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100" value={editForm.month} onChange={e => setEditForm({...editForm, month: e.target.value})} /></td>
                        <td className="px-4 py-3"><input type="text" className="w-24 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100" value={editForm.approvalNum} onChange={e => setEditForm({...editForm, approvalNum: e.target.value})} /></td>
                        <td className="px-4 py-3"><input type="text" className="w-16 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} /></td>
                        <td className="px-4 py-3"><input type="text" className="w-20 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100" value={editForm.site} onChange={e => setEditForm({...editForm, site: e.target.value})} /></td>
                        <td className="px-4 py-3"><input type="text" className="w-16 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100" value={editForm.referrerName} onChange={e => setEditForm({...editForm, referrerName: e.target.value})} /></td>
                        <td className="px-4 py-3"><input type="text" className="w-16 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100" value={editForm.refereeName} onChange={e => setEditForm({...editForm, refereeName: e.target.value})} /></td>
                        <td className="px-4 py-3 text-right"><input type="number" className="w-20 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 text-right" value={editForm.reward} onChange={e => setEditForm({...editForm, reward: Number(e.target.value)})} /></td>
                        <td className="px-4 py-3"><input type="text" className="w-16 bg-slate-900/50 border border-sky-500/30 rounded px-2 py-1 text-sky-100 mx-auto block" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} /></td>
                        <td className="px-4 py-3 flex justify-center gap-2">
                          <button onClick={handleSave} className="p-1 text-green-400 hover:bg-green-400/10 rounded transition-colors" title="保存"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-400/10 rounded transition-colors" title="取消"><X className="w-4 h-4" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 font-mono text-slate-300">{row.month}</td>
                        <td className="px-4 py-4 font-mono text-slate-400">{row.approvalNum}</td>
                        <td className="px-4 py-4 text-sky-100">{row.city}</td>
                        <td className="px-4 py-4 text-slate-300">{row.site}</td>
                        <td className="px-4 py-4 font-medium text-sky-100">{row.referrerName}</td>
                        <td className="px-4 py-4 font-medium text-sky-100">{row.refereeName}</td>
                        <td className="px-4 py-4 text-right font-mono text-sky-300">¥ {row.reward.toFixed(2)}</td>
                        <td className="px-4 py-4 flex justify-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border ${
                            row.status === '已发放' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                            row.status === '异常' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleEdit(row)} className="p-1 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded transition-colors" title="编辑"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(row.id)} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="删除"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    暂无匹配的数据记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination mock */}
        <div className="flex items-center justify-between text-[12px] text-slate-400">
          <span>共找到 {data.length} 条记录</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded hover:bg-white/5 disabled:opacity-50" disabled>上一页</button>
            <span className="text-sky-400 font-medium bg-sky-500/10 px-2 py-1 rounded">1</span>
            <button className="px-3 py-1 rounded hover:bg-white/5 disabled:opacity-50" disabled>下一页</button>
          </div>
        </div>
      </div>

      {deleteConfirmId !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-sky-500/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-sky-100 mb-2">确认删除</h3>
            <p className="text-slate-400 text-sm mb-6">您确定要删除这条记录吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-colors text-sm"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors text-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
