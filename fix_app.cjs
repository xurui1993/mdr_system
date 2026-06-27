const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/<TerminalPanel\s+appTheme={appTheme}\s+logs={logs}\s+progress={progress}\s+progressText={progressText}\s*\/>/, '<TerminalPanel\n                    appTheme={appTheme}\n                    logs={logs}\n                    progress={progress}\n                    progressText={progressText}\n                    isRunning={runningTask !== null}\n                  />');
fs.writeFileSync('src/App.tsx', content, 'utf-8');
