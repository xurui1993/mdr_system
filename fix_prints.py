import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# handleAction is around line 1118
# handleRun is around line 1236

handle_action_start = content.find("const handleAction = async (action: string) => {")
handle_run_start = content.find("const handleRun = async (overrides?: Partial<AppConfig>) => {")

if handle_action_start != -1 and handle_run_start != -1:
    handle_action_code = content[handle_action_start:handle_run_start]
    handle_run_code = content[handle_run_start:]
    
    # replace in handle_action_code
    # appendLog("...", "...") -> appendLog("...", "...", action)
    handle_action_code = re.sub(r'appendLog\((.*?)\);', lambda m: m.group(0) if 'action' in m.group(0) else f"appendLog({m.group(1)}, action);", handle_action_code)
    
    # replace in handle_run_code
    handle_run_code = re.sub(r'appendLog\((.*?)\);', lambda m: m.group(0) if 'targetAction' in m.group(0) else f"appendLog({m.group(1)}, targetAction);", handle_run_code)
    
    # Actually wait, some are appendLog(..., "ERROR") which means it has 2 args.
    # appendLog(..., level) -> appendLog(..., level, target)
    # Let's use a simpler regex for multi-line:
    def replacer(m, target):
        text = m.group(0)
        # if target is already the last arg, skip
        if text.rstrip().endswith(f"{target});"):
            return text
        if text.rstrip().endswith(");"):
            # insert before );
            return text[:-2] + f", {target});"
        return text

    handle_action_code = re.sub(r'appendLog\([\s\S]*?\);', lambda m: replacer(m, "action"), handle_action_code)
    handle_run_code = re.sub(r'appendLog\([\s\S]*?\);', lambda m: replacer(m, "targetAction"), handle_run_code)

    new_content = content[:handle_action_start] + handle_action_code + handle_run_code
    with open("src/App.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
