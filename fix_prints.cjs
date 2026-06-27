const fs = require('fs');
let content = fs.readFileSync('backend/issue_orders.py', 'utf8');

const spiderEngineEnd = content.indexOf('class DataCleaner:');
let spiderEnginePart = content.substring(0, spiderEngineEnd);
const rest = content.substring(spiderEngineEnd);

spiderEnginePart = spiderEnginePart.replace(/print\(/g, 'self.log_cb(');

// Also replace in MergerFiles, but wait we removed MergerFiles.run usage. Let's just fix SpiderEngine.
fs.writeFileSync('backend/issue_orders.py', spiderEnginePart + rest);
