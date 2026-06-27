const fs = require('fs');
let content = fs.readFileSync('src/components/TerminalPanel.tsx', 'utf-8');
content = content.replace('{progress > 0 && (', '{isRunning && progress > 0 && (');
fs.writeFileSync('src/components/TerminalPanel.tsx', content, 'utf-8');
