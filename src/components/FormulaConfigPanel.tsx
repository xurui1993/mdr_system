import React, { useState, useRef } from 'react';
import { Theme } from '../types';
import { Calculator, Plus, Save, Trash2, HelpCircle, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FormulaConfigPanelProps {
  theme: Theme;
}

export function FormulaConfigPanel({ theme }: FormulaConfigPanelProps) {
  const [formulas, setFormulas] = useState([
    { id: 1, field: '完成单', type: 'formula', expression: '=SUMIFS(日单量!F:F, 日单量!C:C, 骑手ID)' },
    { id: 2, field: '完成单-不准时', type: 'formula', expression: '=SUMIFS(日单量!I:I, 日单量!C:C, 骑手ID)' },
    { id: 3, field: '总单量', type: 'formula', expression: '=完成单' },
    { id: 4, field: '不准时单剔除', type: 'formula', expression: '=SUMIFS(问题单!J:J, 问题单!D:D, 骑手ID, 问题单!A:A, "不准时单", 问题单!H:H, "是")' },
    { id: 5, field: '餐损', type: 'formula', expression: '=SUMIFS(问题单!J:J, 问题单!D:D, 骑手ID, 问题单!A:A, "餐损")' },
    { id: 6, field: '不计提成单', type: 'formula', expression: '=SUMIFS(配送单!K:K, 配送单!D:D, 骑手ID, 配送单!O:O, "不计提成")' },
    { id: 7, field: '配送所得', type: 'formula', expression: '=完成单 * 雷神单价' },
    { id: 8, field: '安全基金', type: 'formula', expression: '=IFERROR(VLOOKUP(骑手ID, 安全基金!B:D, 3, FALSE), 0)' },
    { id: 9, field: '非蜂卡', type: 'formula', expression: '=IFERROR(VLOOKUP(骑手ID, 安全基金!B:F, 5, FALSE), 0)' },
    { id: 10, field: '违规扣款', type: 'formula', expression: '=SUMIFS(违规索赔!E:E, 违规索赔!C:C, 骑手ID)' },
    { id: 11, field: '应结费用', type: 'formula', expression: '=配送所得 + 补发 - (不准时单剔除 + 餐损 + 安全基金 + 非蜂卡 + 违规扣款 + 投诉 + 违规虚假 + 物流责 + 差评)' },
    { id: 12, field: '结算费用（税前）', type: 'formula', expression: '=应结费用 - 工具费 - 住宿扣款 - 物资扣款 - 装备未绑 - 站点处罚 - 月预支 - 周预支 - 备用金销账 - 电动车扣款 - 电池扣款 - 站点代扣 - 餐费 - 补扣' },
    { id: 13, field: '预扣个税', type: 'formula', expression: '=IFERROR(VLOOKUP(骑手ID, \'个税(预扣)\'!B:D, 3, FALSE), 0)' },
    { id: 14, field: '实发费用（税后）', type: 'formula', expression: '=结算费用（税前） - 预扣个税' }
  ]);

  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseStatus("正在上传并读取工资表文件...");
    
    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          setParseStatus("正在分析工作表结构与数据流...");
          
          const workbook = XLSX.read(data, { type: 'array', cellFormula: true });
          
          setParseStatus("正在提取 Excel 公式逻辑与深层函数嵌套...");
          
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          setParseStatus("正在转换为高精度模版引擎规则...");
          
          const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:A1");
          const newFormulas = [];
          let idCounter = 1;
          
          for (let C = range.s.c; C <= range.e.c; ++C) {
            // Check headers in row 0, 1, or 2
            let headerText = `Column ${C + 1}`;
            for (let R = 0; R <= 2; ++R) {
              const headerCell = sheet[XLSX.utils.encode_cell({ c: C, r: R })];
              if (headerCell && headerCell.v) {
                headerText = String(headerCell.v).trim();
                break;
              }
            }
            
            // Look for formula in the first 10 rows for this column
            for (let R = 0; R <= Math.min(range.e.r, 10); ++R) {
               const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })];
               if (cell && cell.f) {
                  newFormulas.push({
                     id: idCounter++,
                     field: headerText,
                     type: 'formula',
                     expression: '=' + cell.f
                  });
                  break; // Found formula for this column
               }
            }
          }
          
          if (newFormulas.length > 0) {
             setFormulas(newFormulas);
             setIsParsing(false);
             setParseStatus(`解析成功，已自动提取 ${newFormulas.length} 个公式配置！`);
          } else {
             setIsParsing(false);
             setParseStatus("解析完毕，但未在文件中检测到公式。");
          }
          
          setTimeout(() => setParseStatus(null), 3000);
          
        } catch (err) {
          console.error(err);
          setIsParsing(false);
          setParseStatus("解析失败，请检查文件格式。");
          setTimeout(() => setParseStatus(null), 3000);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      setIsParsing(false);
      setParseStatus("加载解析库失败。");
      setTimeout(() => setParseStatus(null), 3000);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#020410] light:bg-white border border-pink-500/10 light:border-slate-200 rounded-3xl cyber-border flex-1 flex flex-col overflow-hidden relative shadow-[0_0_15px_rgba(236,72,153,0.05)]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-pink-500/10 light:border-slate-200 flex items-center justify-between bg-pink-500/5 light:bg-pink-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 light:from-pink-100 light:to-rose-100 flex items-center justify-center border border-pink-500/30 light:border-pink-200">
              <Calculator className="w-5 h-5 text-pink-400 light:text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 light:text-slate-800 tracking-wide">薪资表模板引擎配置</h2>
              <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5 flex items-center gap-1">
                支持直接上传旧版工资表一键解析，或手动配置关联数据源及行列公式 <HelpCircle size={12} className="text-pink-400 cursor-pointer hover:text-pink-300" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 light:bg-slate-100 text-slate-200 light:text-slate-700 hover:bg-slate-700 light:hover:bg-slate-200 border border-slate-700 light:border-slate-300 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span className="text-sm font-medium">{isParsing ? '解析中...' : '上传工资表解析'}</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 text-pink-400 hover:bg-pink-500 hover:text-white border border-pink-500/50 rounded-xl transition-all shadow-sm">
              <Save size={16} />
              <span className="text-sm font-medium">保存配置</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Formula Editor */}
          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 light:scrollbar-thumb-slate-300/50">
            <div className="space-y-6 max-w-5xl mx-auto">
              {parseStatus && (
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  {isParsing ? (
                    <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <span className={`text-sm font-medium ${isParsing ? 'text-sky-400' : 'text-emerald-400'}`}>
                    {parseStatus}
                  </span>
                </div>
              )}

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-500 mb-1">系统建议</h4>
                  <p className="text-xs text-amber-400/80 leading-relaxed">
                    为解决原旧版模板无法直接跨表引用数据的问题，推荐使用本引擎配置。引擎会在生成薪资表时，动态将您配置的跨表公式（如 <code className="bg-black/20 px-1 rounded mx-0.5">SUMIFS</code>、<code className="bg-black/20 px-1 rounded mx-0.5">XLOOKUP</code>）注入到每一行，并完美保持引用关系，财务复核时可直接查看由引擎写入的标准 Excel 公式。
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-200 light:text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                  动态公式列配置 (Row 4 开始自动递增)
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-500 mb-4 leading-relaxed">
                  此处配置的公式将在薪资表生成时，自动填充到数据行的对应列，并动态递增行号。可以直接引用任意关联工作表名和列名。
                </p>

                <div className="space-y-3">
                  {formulas.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200 p-3 rounded-lg group hover:border-pink-500/30 transition-colors shadow-sm">
                      <div className="w-8 h-8 rounded bg-slate-900 light:bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-500">
                        {idx + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <input 
                          type="text" 
                          value={item.field}
                          onChange={(e) => {
                            const newFormulas = [...formulas];
                            newFormulas[idx].field = e.target.value;
                            setFormulas(newFormulas);
                          }}
                          className="bg-transparent border-b border-slate-800 light:border-slate-200 focus:border-pink-500 px-2 py-1.5 text-sm text-slate-200 light:text-slate-700 outline-none font-medium"
                          placeholder="目标列名 (如: 应结费用)"
                        />
                        <input 
                          type="text" 
                          value={item.expression}
                          onChange={(e) => {
                            const newFormulas = [...formulas];
                            newFormulas[idx].expression = e.target.value;
                            setFormulas(newFormulas);
                          }}
                          className="col-span-3 bg-transparent border-b border-slate-800 light:border-slate-200 focus:border-pink-500 px-2 py-1.5 text-sm text-slate-200 light:text-slate-700 outline-none font-mono"
                          placeholder="Excel 公式 (如 =SUMIFS(日单量!F:F, 日单量!C:C, 骑手ID))"
                        />
                      </div>
                      <button 
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                        onClick={() => {
                          const newFormulas = [...formulas];
                          newFormulas.splice(idx, 1);
                          setFormulas(newFormulas);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setFormulas([...formulas, { id: Date.now(), field: '', type: 'formula', expression: '=' }])}
                    className="w-full py-3 border border-dashed border-slate-700 light:border-slate-300 rounded-lg text-slate-400 hover:text-pink-400 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus size={16} /> 添加公式列
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-200 light:text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  合计行配置 (Bottom Row)
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-500 mb-4 leading-relaxed">
                  配置最后一行（合计行）的汇总方式，系统将自动识别数据行的起始和结束位置生成公式，例如 <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">=SUBTOTAL(9, C4:C100)</code>。
                </p>
                <div className="flex items-center gap-4 text-sm text-slate-400 bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200 p-4 rounded-lg shadow-sm">
                  <span>合计行模式：</span>
                  <select className="bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded px-3 py-1.5 outline-none focus:border-indigo-500 text-slate-200 light:text-slate-700">
                    <option>自动生成 SUBTOTAL(9, ...) 用于可见筛选结果</option>
                    <option>自动生成 SUM(...) 用于全部结果</option>
                    <option>不生成合计行</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
