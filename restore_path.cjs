const fs = require('fs');
let code = fs.readFileSync('src/components/SalaryBindDashboard.tsx', 'utf8');

code = code.replace(
  '{!isRunning && config?.salaryBindSourcePath && (\n   <div className="hidden">\n     <div className="text-[12px] text-slate-400 light:text-slate-500 mb-1"></div>\n     <div className="text-[13px] font-mono text-slate-300 light:text-slate-700 truncate" title={config.salaryBindSourcePath}>\n     </div>\n   </div>\n )}',
  '{!isRunning && config?.salaryBindSourcePath && (\n  <div className="flex-1 flex flex-col justify-center px-2 overflow-hidden">\n    <div className="text-[12px] text-slate-400 light:text-slate-500 mb-1">目标数据源目录</div>\n    <div className="text-[13px] font-mono text-slate-300 light:text-slate-700 truncate" title={config.salaryBindSourcePath}>\n      {config.salaryBindSourcePath}\n    </div>\n  </div>\n)}'
);

fs.writeFileSync('src/components/SalaryBindDashboard.tsx', code);
