const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const handle_action_start = content.indexOf('const handleAction = async (action: string, overrides?: Partial<AppConfig>) => {');
const handle_run_start = content.indexOf('const handleRun = async (overrides?: Partial<AppConfig>) => {');

if (handle_action_start !== -1 && handle_run_start !== -1) {
    let handle_action_code = content.substring(handle_action_start, handle_run_start);
    let handle_run_code = content.substring(handle_run_start);

    function replacer(match, target) {
        if (match.trim().endsWith(target + ');')) {
            return match;
        }
        if (match.trim().endsWith(');')) {
            return match.replace(/\);$/, `, ${target});`);
        }
        return match;
    }

    handle_action_code = handle_action_code.replace(/appendLog\([\s\S]*?\);/g, (m) => replacer(m, 'action'));
    handle_run_code = handle_run_code.replace(/appendLog\([\s\S]*?\);/g, (m) => replacer(m, 'targetAction'));

    const new_content = content.substring(0, handle_action_start) + handle_action_code + handle_run_code;
    fs.writeFileSync('src/App.tsx', new_content, 'utf-8');
} else {
    console.log("Could not find start patterns.");
    console.log("action: ", handle_action_start);
    console.log("run: ", handle_run_start);
}
