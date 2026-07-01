const fs = require('fs');
let code = fs.readFileSync('src/components/SalaryBindDashboard.tsx', 'utf8');

code = code.replace(/\{ \(lastOutput && elapsedMs > 0\) && \(/, '{ (lastOutput && !isRunning && elapsedMs > 0) && (');

fs.writeFileSync('src/components/SalaryBindDashboard.tsx', code);
