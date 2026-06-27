import re

with open('backend/issue_orders.py', 'r') as f:
    content = f.read()

# For SpiderEngine, replace print( with self.log_cb(
def repl(m):
    return m.group(0).replace('print(', 'self.log_cb(')

content = re.sub(r'class SpiderEngine:.*?(?=class DataCleaner:)', repl, content, flags=re.DOTALL)

with open('backend/issue_orders.py', 'w') as f:
    f.write(content)
