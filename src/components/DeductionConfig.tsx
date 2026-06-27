import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Theme } from '../types';
import { Plus, Trash2, Save, MapPin, Building2, Tag, ChevronRight, Settings2, FileText, Check, Upload, Download, FileSpreadsheet, Edit2 } from 'lucide-react';
import { getWorkspaceId } from '../utils';
import * as XLSX from 'xlsx';

interface DeductionConfigProps {
  theme: Theme;
}

interface KeywordAmount {
  id: string;
  keyword: string;
  amount: number;
}

interface DeductionItem {
  id: string;
  name: string;
  amount: number;
  isKeywordBased: boolean;
  keywords: string;
  keywordAmounts?: KeywordAmount[];
  maxDays?: number | string;
}

interface ChangeLog {
  id: string;
  timestamp: string;
  content: string;
}

interface Site {
  id: string;
  name: string;
  siteId: string;
  deductionItems: DeductionItem[];
}

interface City {
  id: string;
  name: string;
  sites: Site[];
}

const defaultData: City[] = [
  {
    id: 'c1',
    name: '上海市',
    sites: [
      {
        id: 's1',
        name: '浦东耀华站',
        siteId: 'SH-PD-01',
        deductionItems: [
          { id: 'i1', name: '安全基金', amount: 50, isKeywordBased: false, keywords: '' },
          { id: 'i2', name: '非蜂卡扣款', amount: 100, isKeywordBased: false, keywords: '' },
          { id: 'i3', name: '装备扣款', amount: 150, isKeywordBased: false, keywords: '' },
        ]
      }
    ]
  }
];

export function DeductionConfigPanel({ theme }: DeductionConfigProps) {
  const [data, setData] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([]);
  const [pendingLogs, setPendingLogs] = useState<ChangeLog[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const logPanelRef = useRef<HTMLDivElement>(null);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCityMouseEnter = useCallback((cityId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setSelectedCityId(cityId);
      
    }, 200);
  }, []);

  const handleSiteMouseEnter = useCallback((siteId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setSelectedSiteId(siteId);
    }, 200);
  }, []);

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

  useEffect(() => {
    if (selectedCityId) {
      const city = data.find(c => c.id === selectedCityId);
      if (city) {
        const siteExists = city.sites.some(s => s.id === selectedSiteId);
        if (!siteExists && city.sites.length > 0) {
          setSelectedSiteId(city.sites[0].id);
        } else if (!siteExists && city.sites.length === 0) {
          setSelectedSiteId(null);
        }
      }
    }
  }, [selectedCityId, data, selectedSiteId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wid = getWorkspaceId();

  useEffect(() => {
    const savedLogs = localStorage.getItem(`deduction_logs_v5_${wid}`);
    if (savedLogs) {
      try { setChangeLogs(JSON.parse(savedLogs)); } catch (e) {}
    }
  }, [wid]);

  useEffect(() => {
    if (changeLogs.length > 0) {
      localStorage.setItem(`deduction_logs_v5_${wid}`, JSON.stringify(changeLogs));
    }
  }, [changeLogs, wid]);

  useEffect(() => {
    const saved = localStorage.getItem(`deduction_config_v5_${wid}`);
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migration: fix existing data where isKeywordBased might be incorrect
          const kwCols = ["投诉", "差评", "违规虚假", "物流责", "不准时单", "超时", "T10", "提前点送达"];
          parsed = parsed.map((city: any) => {
            if (city.sites) {
              city.sites = city.sites.map((site: any) => {
                if (site.deductionItems) {
                  site.deductionItems = site.deductionItems.map((item: any) => {
                    if (kwCols.some(kw => item.name.includes(kw))) {
                      return { 
                        ...item, 
                        isKeywordBased: true, 
                        keywords: item.keywords || item.name,
                        keywordAmounts: item.keywordAmounts && item.keywordAmounts.length > 0 ? item.keywordAmounts : [
                          { id: Math.random().toString(36).substring(7), keyword: item.name, amount: item.amount }
                        ]
                      };
                    }
                    return item;
                  });
                }
                return site;
              });
            }
            return city;
          });
          setData(parsed);
          setSelectedCityId(parsed[0]?.id || null);
          return;
        }
      } catch (e) {
        console.error('Failed to parse deduction rules', e);
      }
    }
    
    // Auto load public/config.xlsx if no data saved
    fetch('/config.xlsx')
      .then(res => res.arrayBuffer())
      .then(ab => {
        const wb = XLSX.read(ab, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (rows.length > 0) {
          const parsedData = parseExcelData(rows);
          setData(parsedData);
          setSelectedCityId(parsedData[0]?.id || null);
        } else {
          setData(defaultData);
          setSelectedCityId(defaultData[0].id);
        }
      })
      .catch(() => {
        setData(defaultData);
        setSelectedCityId(defaultData[0].id);
      });
  }, [wid]);

  const parseExcelData = (rows: any[]): City[] => {
    const citiesMap = new Map<string, City>();

    rows.forEach(row => {
      const cityName = row['城市'];
      const siteName = row['团队名称'];
      if (!cityName || !siteName) return;

      if (!citiesMap.has(cityName)) {
        citiesMap.set(cityName, {
          id: Math.random().toString(36).substring(7),
          name: cityName,
          sites: []
        });
      }

      const city = citiesMap.get(cityName)!;
      const deductionItems: DeductionItem[] = [];
      
      Object.keys(row).forEach(key => {
        if (key === '城市' || key === '团队名称' || key === '团队ID') return;
        
        const kwCols = ["投诉", "差评", "违规虚假", "物流责", "不准时单", "超时", "T10", "提前点送达"];
        const isKw = kwCols.some(kw => key.includes(kw));
        
        deductionItems.push({
          id: Math.random().toString(36).substring(7),
          name: key,
          amount: Number(row[key]) || 0,
          isKeywordBased: isKw,
          keywords: isKw ? key : '',
          keywordAmounts: isKw ? [{ id: Math.random().toString(36).substring(7), keyword: key, amount: Number(row[key]) || 0 }] : undefined,
          maxDays: undefined
        });
      });

      city.sites.push({
        id: Math.random().toString(36).substring(7),
        name: siteName,
        siteId: '', 
        deductionItems
      });
    });

    return Array.from(citiesMap.values());
  };

  const saveRules = () => {
    setIsSaving(true);
    localStorage.setItem(`deduction_config_v5_${wid}`, JSON.stringify(data));
    
    if (pendingLogs.length > 0) {
      setChangeLogs(prev => {
        const newLogs = [...pendingLogs, ...prev].slice(0, 100);
        return newLogs;
      });
      setPendingLogs([]);
    }

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 500);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws);
        
        if (rows.length > 0) {
          const parsedData = parseExcelData(rows);
          setData(parsedData);
          if (parsedData.length > 0) {
            setSelectedCityId(parsedData[0].id);
            
          }
        }
      } catch (error) {
        console.error('Error importing Excel:', error);
        alert('导入失败，请检查文件格式。');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (data.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    const exportRows: any[] = [];
    data.forEach(city => {
      city.sites.forEach(site => {
        const row: any = {
          '城市': city.name,
          '团队名称': site.name
        };
        site.deductionItems.forEach(item => {
          row[item.name] = item.amount;
        });
        exportRows.push(row);
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "扣款配置");
    XLSX.writeFile(wb, "城市扣款配置.xlsx");
  };

  // --- Handlers for City ---
  const addCity = () => {
    const newCity: City = {
      id: Math.random().toString(36).substring(7),
      name: '新城市',
      sites: []
    };
    setData([...data, newCity]);
    setSelectedCityId(newCity.id);
    
  };

  const updateCityName = (id: string, name: string) => {
    setData(data.map(c => c.id === id ? { ...c, name } : c));
  };

  const removeCity = (id: string) => {
    const newData = data.filter(c => c.id !== id);
    setData(newData);
    if (selectedCityId === id) {
      setSelectedCityId(newData.length > 0 ? newData[0].id : null);
      
    }
  };

  // --- Handlers for Site ---
  const selectedCity = data.find(c => c.id === selectedCityId);

  const addSite = () => {
    if (!selectedCityId) return;
    const newSite: Site = {
      id: Math.random().toString(36).substring(7),
      name: '新站点',
      siteId: '',
      deductionItems: []
    };
    setData(data.map(c => c.id === selectedCityId ? { ...c, sites: [...c.sites, newSite] } : c));
    setSelectedSiteId(newSite.id);
  };

  const updateSite = (siteId: string, updates: Partial<Site>) => {
    if (!selectedCityId) return;
    setData(data.map(c => {
      if (c.id !== selectedCityId) return c;
      return {
        ...c,
        sites: c.sites.map(s => s.id === siteId ? { ...s, ...updates } : s)
      };
    }));
  };

  const removeSite = (siteId: string) => {
    if (!selectedCityId) return;
    setData(data.map(c => {
      if (c.id !== selectedCityId) return c;
      const newSites = c.sites.filter(s => s.id !== siteId);
      if (selectedSiteId === siteId) {
        setSelectedSiteId(newSites.length > 0 ? newSites[0].id : null);
      }
      return { ...c, sites: newSites };
    }));
  };

  // --- Handlers for Deduction Items ---
  const selectedSite = selectedCity?.sites.find(s => s.id === selectedSiteId);

  const addItem = () => {
    if (!selectedCityId || !selectedSiteId) return;
    const newItem: DeductionItem = {
      id: Math.random().toString(36).substring(7),
      name: '新扣款项',
      amount: 0,
      isKeywordBased: false,
      keywords: ''
    };
    setData(data.map(c => {
      if (c.id !== selectedCityId) return c;
      return {
        ...c,
        sites: c.sites.map(s => {
          if (s.id !== selectedSiteId) return s;
          return { ...s, deductionItems: [...s.deductionItems, newItem] };
        })
      };
    }));
  };

  const updateItem = (itemId: string, updates: Partial<DeductionItem>) => {
    if (!selectedCityId || !selectedSiteId) return;
    
    let logMessage = '';

    setData(data.map(c => {
      if (c.id !== selectedCityId) return c;
      return {
        ...c,
        sites: c.sites.map(s => {
          if (s.id !== selectedSiteId) return s;
          return {
            ...s,
            deductionItems: s.deductionItems.map(i => {
              if (i.id === itemId) {
                if ('amount' in updates && updates.amount !== i.amount) {
                  logMessage = `修改了 [${s.name}] - [${i.name}] 的默认扣款金额: ${i.amount} -> ${updates.amount}`;
                } else if ('maxDays' in updates && updates.maxDays !== i.maxDays) {
                  logMessage = `修改了 [${s.name}] - [${i.name}] 的出勤天数阈值: ${i.maxDays || '无'} -> ${updates.maxDays || '无'}`;
                } else if ('isKeywordBased' in updates && updates.isKeywordBased !== i.isKeywordBased) {
                  logMessage = `${updates.isKeywordBased ? '开启' : '关闭'}了 [${s.name}] - [${i.name}] 的按关键字匹配`;
                } else if ('keywordAmounts' in updates) {
                  logMessage = `更新了 [${s.name}] - [${i.name}] 的特定金额关键字规则`;
                }
                return { ...i, ...updates };
              }
              return i;
            })
          };
        })
      };
    }));

    if (logMessage) {
      setPendingLogs(prev => [
        {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
          content: logMessage
        },
        ...prev
      ]);
    }
  };

  const removeItem = (itemId: string) => {
    if (!selectedCityId || !selectedSiteId) return;
    setData(data.map(c => {
      if (c.id !== selectedCityId) return c;
      return {
        ...c,
        sites: c.sites.map(s => {
          if (s.id !== selectedSiteId) return s;
          return { ...s, deductionItems: s.deductionItems.filter(i => i.id !== itemId) };
        })
      };
    }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 light:bg-slate-50 dark:bg-[#030614]/80 p-5 rounded-[24px] border border-slate-200 dark:border-sky-500/20 shadow-lg relative overflow-hidden">
      
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-cyan-300 tracking-wide">扣款项配置</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">多层级管理：城市 ➔ 站点 ➔ 扣款规则（支持关键字匹配）</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium shadow-sm cursor-pointer">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImport} 
              className="hidden" 
              accept=".xlsx, .xls" 
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
            />
            <Upload size={16} className="text-sky-500" />
            导入配置
          </label>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium shadow-sm"
          >
            <Download size={16} className="text-emerald-500" />
            导出配置
          </button>
          <button
            onClick={() => {
              setShowLogPanel(!showLogPanel);
              if (!showLogPanel) {
                setTimeout(() => {
                  logPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
                }, 100);
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 border text-sm font-medium rounded-xl shadow-sm transition-all ${
              showLogPanel 
                ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <FileText size={16} className={showLogPanel ? 'text-indigo-500' : 'text-slate-400'} />
            {showLogPanel ? '隐藏日志' : '变更日志'}
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button
            onClick={saveRules}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-semibold border ${
              saveSuccess 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-sky-500 text-white border-sky-500 hover:bg-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]'
            } disabled:opacity-70`}
          >
            {saveSuccess ? <Check size={16} /> : <Save size={16} />}
            {saveSuccess ? "已保存" : (isSaving ? "保存中..." : "保存配置")}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-2">
        
        {/* Column 1: Cities */}
        <div className="w-64 flex flex-col bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden flex-shrink-0">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-500" />
              城市 ({data.length})
            </h3>
            <button onClick={addCity} className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {data.map(city => (
              <div
                key={city.id}
                onClick={() => { handleMouseLeave(); setSelectedCityId(city.id);  }}
                onMouseEnter={() => handleCityMouseEnter(city.id)}
                onMouseLeave={handleMouseLeave}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  selectedCityId === city.id
                    ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                } border`}
              >
                {editingCityId === city.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={city.name}
                    onChange={(e) => updateCityName(city.id, e.target.value)}
                    onBlur={() => setEditingCityId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingCityId(null); }}
                    className={`bg-white dark:bg-slate-800 px-2 py-1 outline-none text-sm font-medium w-full rounded border border-sky-300 dark:border-sky-500/50 ${
                      selectedCityId === city.id ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-400'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    className={`text-sm font-medium truncate flex-1 pr-16 ${
                      selectedCityId === city.id ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-400'
                    }`}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingCityId(city.id);
                    }}
                  >
                    {city.name}
                  </span>
                )}
                
                <div className={`flex items-center gap-1 transition-opacity ${editingCityId === city.id ? 'hidden' : ''}`}>
                  <div className="flex items-center gap-1 opacity-100 group-hover:opacity-0 absolute right-3 transition-opacity">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                      selectedCityId === city.id ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <Building2 size={10} />
                      {city.sites.length}
                    </span>
                    <ChevronRight size={14} className={selectedCityId === city.id ? 'text-sky-400' : 'text-slate-400'} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 absolute right-3 transition-opacity bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 rounded-lg">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCityId(city.id); }}
                      className={`p-1.5 rounded-lg ${
                        selectedCityId === city.id ? 'text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-500/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCity(city.id); }}
                      className={`p-1.5 rounded-lg ${
                        selectedCityId === city.id ? 'text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 hover:text-red-500' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-red-500'
                      }`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">暂无城市</div>
            )}
          </div>
        </div>

        {/* Column 2: Sites */}
        <div className="w-80 flex flex-col bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden flex-shrink-0">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              站点 ({selectedCity?.sites.length || 0})
            </h3>
            {selectedCityId && (
              <button onClick={addSite} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors">
                <Plus size={16} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {!selectedCityId ? (
              <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center gap-2">
                <MapPin className="w-6 h-6 opacity-20" />
                请先选择或添加一个城市
              </div>
            ) : selectedCity?.sites.map(site => (
              <div
                key={site.id}
                onClick={() => { handleMouseLeave(); setSelectedSiteId(site.id); }}
                onMouseEnter={() => handleSiteMouseEnter(site.id)}
                onMouseLeave={handleMouseLeave}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                  selectedSiteId === site.id
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                  {editingSiteId === site.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={site.name}
                      onChange={(e) => updateSite(site.id, { name: e.target.value })}
                      onBlur={() => setEditingSiteId(null)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setEditingSiteId(null); }}
                      className={`bg-white dark:bg-slate-800 px-2 py-1 outline-none text-sm font-medium flex-1 w-full rounded border border-emerald-300 dark:border-emerald-500/50 ${
                        selectedSiteId === site.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
                      }`}
                      placeholder="站点名称"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span 
                      title={site.name}
                      className={`text-sm font-medium flex-1 truncate pr-2 ${
                        selectedSiteId === site.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
                      }`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingSiteId(site.id);
                      }}
                    >
                      {site.name}
                    </span>
                  )}

                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2 ${editingSiteId === site.id ? 'hidden' : ''}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingSiteId(site.id); }}
                      className={`p-1.5 rounded-lg ${
                        selectedSiteId === site.id ? 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-500/20' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSite(site.id); }}
                      className={`p-1.5 rounded-lg ${
                        selectedSiteId === site.id ? 'text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-red-500' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-red-500'
                      }`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
              </div>
            ))}
            {selectedCityId && selectedCity?.sites.length === 0 && (
               <div className="text-center py-8 text-xs text-slate-400">当前城市暂无站点</div>
            )}
          </div>
        </div>

        {/* Column 3: Configs */}
        <div className="flex-1 min-w-[400px] flex flex-col bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
               <FileText className="w-4 h-4 text-indigo-500" />
               <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                 扣款项目规则 
                 {selectedSite ? ` - ${selectedSite.name}` : ''}
               </h3>
               {selectedSite && (
                 <span className="text-xs bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full ml-2">
                   共 {(selectedSite.deductionItems || []).length} 项
                 </span>
               )}
            </div>
            {selectedSiteId && (
              <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors">
                <Plus size={14} />
                添加规则
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 dark:bg-slate-900/20">
             {!selectedSiteId ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Building2 className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-sm">请先在左侧选择一个具体的站点</p>
                </div>
             ) : (
                <div className="flex flex-col gap-6">
                  {(() => {
                    if (!selectedSite) return null;
                    
                    const getItemType = (item: DeductionItem) => {
                      const name = item.name || '';
                      if (name.includes('投诉') || name.includes('差评') || name.includes('违规') || name.includes('虚假') || name.includes('物流')) {
                        return 'keyword';
                      }
                      if (name.includes('安全基金') || name.includes('使用费')) {
                        return 'days';
                      }
                      return 'fixed';
                    };

                    const items = selectedSite.deductionItems || [];

                    const keywordItems = items.filter(i => getItemType(i) === 'keyword');
                    const daysItems = items.filter(i => getItemType(i) === 'days');
                    const fixedItems = items.filter(i => getItemType(i) === 'fixed');

                    const renderGroup = (title: string, items: DeductionItem[]) => {
                      if (items.length === 0) return null;
                      return (
                        <div className="flex flex-col gap-3">
                          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50 pb-2">{title}</h4>
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {items.map(item => (
                              <div key={item.id} className="flex flex-col bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors shadow-sm">
                                {/* Header */}
                                <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/80">
                                  <div className="flex items-center gap-2 flex-1 mr-4">
                                    <Tag className="w-4 h-4 text-slate-400" />
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                      className="bg-transparent outline-none text-sm font-semibold text-slate-700 dark:text-slate-200 w-full placeholder-slate-400"
                                      placeholder="扣款项名称，如: 安全基金"
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                {/* Body */}
                                <div className="p-4 flex flex-col gap-3">
                                  <div className="flex items-center justify-between">
                                     <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium tracking-wide">默认扣款金额 (元)</span>
                                     <input
                                       type="number"
                                       value={item.amount || ''}
                                       onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) })}
                                       className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500 text-sm text-right text-slate-700 dark:text-slate-200"
                                       placeholder="0.00"
                                     />
                                  </div>

                                  {((item.name || '').includes('安全基金') || (item.name || '').includes('使用费')) && (
                                  <div className="flex items-center justify-between mt-1">
                                     <div className="flex flex-col">
                                       <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium tracking-wide">出勤天数阈值</span>
                                       <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">大于等于扣款天数按月 (可选)</span>
                                     </div>
                                     <input
                                       type="number"
                                       value={item.maxDays ?? ''}
                                       onChange={(e) => updateItem(item.id, { maxDays: e.target.value ? Number(e.target.value) : undefined })}
                                       className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-500 text-sm text-right text-slate-700 dark:text-slate-200"
                                       placeholder="无"
                                     />
                                  </div>
                                  )}

                                  {((item.name || '').includes('投诉') || (item.name || '').includes('差评') || (item.name || '').includes('违规') || (item.name || '').includes('虚假') || (item.name || '').includes('物流')) && (
                                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                     <label className="flex items-center justify-between cursor-pointer group">
                                       <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium tracking-wide group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">按关键字匹配扣款</span>
                                       <div className="relative inline-flex items-center cursor-pointer">
                                          <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={item.isKeywordBased}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              const updates: Partial<DeductionItem> = { isKeywordBased: checked };
                                              if (checked && (!item.keywordAmounts || item.keywordAmounts.length === 0)) {
                                                updates.keywordAmounts = [{ id: Math.random().toString(36).substring(7), keyword: '', amount: item.amount }];
                                              }
                                              updateItem(item.id, updates);
                                            }}
                                          />
                                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
                                       </div>
                                     </label>
                                     
                                     {item.isKeywordBased && (
                                       <div className="mt-2 animate-in slide-in-from-top-2 duration-300 fade-in flex flex-col gap-2">
                                         <div>
                                           <div className="flex items-center justify-between mb-1">
                                             <div className="text-[10px] text-slate-500">关键字匹配及对应金额:</div>
                                             <button 
                                               onClick={() => {
                                                 const ka = item.keywordAmounts || [];
                                                 updateItem(item.id, { keywordAmounts: [...ka, { id: Math.random().toString(36).substring(7), keyword: '', amount: item.amount }] });
                                               }} 
                                               className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-indigo-500"
                                             >
                                               <Plus size={14} />
                                             </button>
                                           </div>
                                           {(item.keywordAmounts || []).map((ka, idx) => (
                                             <div key={ka.id} className="flex items-center gap-2 mb-1.5">
                                                <input 
                                                  type="text"
                                                  value={ka.keyword}
                                                  onChange={(e) => {
                                                    const newKa = [...(item.keywordAmounts || [])];
                                                    newKa[idx].keyword = e.target.value;
                                                    updateItem(item.id, { keywordAmounts: newKa });
                                                  }}
                                                  className="flex-1 px-2 py-1 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-lg outline-none focus:border-indigo-500 text-xs text-slate-700 dark:text-slate-200 placeholder-indigo-300 dark:placeholder-slate-500"
                                                  placeholder="包含的关键字"
                                                />
                                                <input 
                                                  type="number"
                                                  value={ka.amount}
                                                  onChange={(e) => {
                                                    const newKa = [...(item.keywordAmounts || [])];
                                                    newKa[idx].amount = Number(e.target.value);
                                                    updateItem(item.id, { keywordAmounts: newKa });
                                                  }}
                                                  className="w-20 px-2 py-1 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-lg outline-none focus:border-indigo-500 text-xs text-right text-slate-700 dark:text-slate-200"
                                                />
                                                <button onClick={() => {
                                                    const newKa = [...(item.keywordAmounts || [])];
                                                    newKa.splice(idx, 1);
                                                    updateItem(item.id, { keywordAmounts: newKa });
                                                }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                             </div>
                                           ))}
                                         </div>
                                         <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                           系统在解析【问题单】时，若【事件原因】G列内容包含关键字，将判定为该扣款项，并优先扣除对应金额；若未匹配到具体关键字，则按上方初始金额扣除。
                                         </p>
                                       </div>
                                     )}
                                  </div>
                                  )}

                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {renderGroup('按关键字匹配扣款项', keywordItems)}
                        {renderGroup('按天数扣款项', daysItems)}
                        {renderGroup('固定金额扣款项', fixedItems)}
                        {items.length === 0 && (
                          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                             <Tag className="w-6 h-6 opacity-40 mb-1" />
                             <span className="text-sm">该站点暂无扣款项目配置</span>
                             <button onClick={addItem} className="text-xs text-indigo-500 hover:underline mt-1">
                               立即添加
                             </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
           </div>
        </div>

        {/* Column 4: Change Logs */}
        {showLogPanel && (
          <div ref={logPanelRef} className="w-64 flex flex-col bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden flex-shrink-0">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                变更日志
              </h3>
              {changeLogs.length > 0 && (
                confirmClear ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">确定?</span>
                    <button 
                      onClick={() => {
                        setChangeLogs([]);
                        localStorage.removeItem(`deduction_logs_v5_${wid}`);
                        setConfirmClear(false);
                      }}
                      className="text-xs text-red-500 hover:text-red-600 transition-colors font-medium"
                    >
                      是
                    </button>
                    <button 
                      onClick={() => setConfirmClear(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
                    >
                      否
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmClear(true)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    清空
                  </button>
                )
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {changeLogs.length === 0 ? (
                <div className="text-xs text-slate-400 text-center mt-10">暂无变更记录</div>
              ) : (
                changeLogs.map(log => (
                  <div key={log.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2.5 rounded-xl shadow-sm">
                    <div className="text-[10px] text-slate-400 mb-1.5">{log.timestamp}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{log.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

