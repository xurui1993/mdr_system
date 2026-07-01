const fs = require('fs');
let code = fs.readFileSync('src/components/SalaryBindDashboard.tsx', 'utf8');

// Replace the lastOutput duration check to remove the !isRunning check so it applies later
code = code.replace(
  '{ (lastOutput && !isRunning && elapsedMs > 0) && (\\n  <div className="flex items-center',
  '{ (lastOutput && elapsedMs > 0) && (\\n  <div className="flex items-center'
);

// Wrap download button
code = code.replace(
  '<button \\n    onClick={() => onDownload && onDownload(selectedMonth)}',
  '{(isRunning || (lastOutput && elapsedMs > 0)) && (\\n  <button \\n    onClick={() => onDownload && onDownload(selectedMonth)}'
);

// Add the closing brace after the download button
code = code.replace(
  '    <FolderDown className={`w-4 h-4 shrink-0 ${isRunning || cityNames.length === 0 ? \\'text-slate-500\\' : \\'text-emerald-400 light:text-emerald-500\\'}  />} 导出目录\\n  </button>',
  '    <FolderDown className={`w-4 h-4 shrink-0 ${isRunning || cityNames.length === 0 ? \\'text-slate-500\\' : \\'text-emerald-400 light:text-emerald-500\\'}  />} 导出目录\\n  </button>\\n  )}'
);

// We need a more robust replace for the download button closing:
code = code.replace(
  '导出目录\\n  </button>\\n\\n  <button onClick={() => onAction("open_source_salary_bind")}',
  '导出目录\\n  </button>\\n  )}\\n\\n  <button onClick={() => onAction("open_source_salary_bind")}'
);

code = code.replace(
  '<button \\n  onClick={onRun} \\n  disabled={isRunning}',
  '<button \\n  onClick={onRun} \\n  disabled={isRunning || !config?.salaryBindSourcePath}\\n  title={!config?.salaryBindSourcePath ? "请先上传源数据目录" : ""}'
);

fs.writeFileSync('src/components/SalaryBindDashboard.tsx', code);
