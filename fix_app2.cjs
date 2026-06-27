const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/<IssueOrderActionPanel\s+theme={theme}\s+isRunning={runningTask === "core"}/, '<IssueOrderActionPanel\n                  theme={theme}\n                  isRunning={runningTask === "issue_orders"}');
fs.writeFileSync('src/App.tsx', content, 'utf-8');
