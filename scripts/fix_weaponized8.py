"""Fix ALL remaining r'...[' pattern issues in weaponized_report.py"""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()

# Find all r' patterns (not r''') that contain [ followed by " or [ followed by \'
# These break because \' escapes the closing ' in a raw string

lines = content.split('\n')
fixed_lines = []
fixes = 0

for i, line in enumerate(lines):
    # Find r' (not r''') positions
    new_line = line
    offset = 0
    
    while True:
        pos = new_line.find("r'", offset)
        if pos < 0:
            break
        # Skip r'''
        if pos + 2 < len(new_line) and new_line[pos+2] == "'":
            offset = pos + 3
            continue
        
        # Find closing ' - but need to handle \' properly
        # In r'..\'...' the \' escapes the closing quote
        # We want to find the REAL closing quote
        j = pos + 2
        closing = -1
        while j < len(new_line):
            if new_line[j] == '\\' and j + 1 < len(new_line) and new_line[j+1] == "'":
                j += 2  # skip \'
                continue
            if new_line[j] == "'":
                closing = j
                break
            j += 1
        
        if closing < 0:
            offset = pos + 2
            continue
        
        inner = new_line[pos+2:closing]
        
        # Check if inner contains [ followed by " or [\']
        has_problem = False
        for k in range(len(inner) - 1):
            if inner[k] == '[':
                if inner[k+1] == '"' or (inner[k+1] == '\\' and k+2 < len(inner) and inner[k+2] == "'"):
                    has_problem = True
                    break
        
        if has_problem:
            # Replace r'...' with r"""..."""
            new_line = new_line[:pos] + 'r"""' + inner + '"""' + new_line[closing+1:]
            fixes += 1
            offset = pos + 5 + len(inner) + 3  # after r"""+content+"""
        else:
            offset = closing + 1
    
    fixed_lines.append(new_line)

result = '\n'.join(fixed_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result)

try:
    ast.parse(result)
    print(f"SUCCESS! Fixed {fixes} r' patterns. No syntax errors.")
except SyntaxError as e:
    print(f"Fixed {fixes} r' patterns. Still error at line {e.lineno}: {e.msg}")
    err_lines = result.split('\n')
    for j in range(max(0, e.lineno-3), min(len(err_lines), e.lineno+2)):
        marker = ">>>" if j+1 == e.lineno else "   "
        print(f"{marker} {j+1}: {err_lines[j]}")
