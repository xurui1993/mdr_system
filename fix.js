const fs = require('fs');
let code = fs.readFileSync('src/components/SalaryBindDashboard.tsx', 'utf8');

code = code.replace('{ (lastOutput && !isRunning && elapsedMs > 0) && (', '{ (lastOutput && elapsedMs > 0) && (');
code = code.replace('<button \n    onClick={() => onDownload && onDownload(selectedMonth)}', '{(isRunning || (lastOutput && elapsedMs > 0)) && (\\n  <button \n    onClick={() => onDownload && onDownload(selectedMonth)}');
code = code.replace('/> 导出目录\n  </button>', '/> 导出目录\n  </button>\\n  )}');
code = code.replace('<button \n  onClick={onRun} \n  disabled={isRunning}\n  className={`w-[132px]', '<button \n  onClick={onRun} \n  disabled={isRunning || !config?.salaryBindSourcePath}\n  title={!config?.salaryBindSourcePath ? "请先上传源数据目录" : ""}\n  className={`w-[132px]');

fs.writeFileSync('src/components/SalaryBindDashboard.tsx', code);
