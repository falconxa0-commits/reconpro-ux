"""Fix weaponized_report.py v5 - also detect [\x22 and [\x27 patterns."""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    lines = f.readlines()

fixed = 0
for i, line in enumerate(lines):
    if 'r"' in line:
        idx = 0
        while True:
            pos = line.find('r"', idx)
            if pos < 0:
                break
            if pos + 2 < len(line) and line[pos+2] == '"':
                idx = pos + 3
                continue
            
            j = pos + 2
            closing = -1
            while j < len(line):
                if line[j] == '\\' and j + 1 < len(line):
                    j += 2
                    continue
                if line[j] == '"':
                    closing = j
                    break
                j += 1
            
            if closing < 0:
                idx = pos + 2
                continue
            
            inner = line[pos+2:closing]
            
            # Check if inner contains [ followed by " or ' or \" or \'
            # This means: [\x22 or [\x27 or [\\" or [\\'
            has_problem = False
            for k in range(len(inner) - 1):
                if inner[k] == '[':
                    if inner[k+1] in ('"', "'"):
                        has_problem = True
                        break
                    # Also check ["'] as two chars: [ then " then '
                    if inner[k+1] == '"' or (inner[k+1] == '\\' and k+2 < len(inner) and inner[k+2] == "'"):
                        has_problem = True
                        break
                    # Pattern: ["\'] or [\"\']
                    if k+3 < len(inner) and inner[k+1] == '"' and inner[k+2] == '\\' and inner[k+3] == "'":
                        has_problem = True
                        break
            
            if has_problem:
                line = line[:pos] + "r'''" + inner + "'''" + line[closing+1:]
                fixed += 1
                # Re-check from same position
            else:
                idx = closing + 1
    
    lines[i] = line

result = ''.join(lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result)

try:
    ast.parse(result)
    print(f"SUCCESS! Fixed {fixed} patterns total. No syntax errors.")
except SyntaxError as e:
    print(f"Fixed {fixed} patterns this pass. Still error at line {e.lineno}: {e.msg}")
    err_lines = result.split('\n')
    for j in range(max(0, e.lineno-3), min(len(err_lines), e.lineno+2)):
        marker = ">>>" if j+1 == e.lineno else "   "
        print(f"{marker} {j+1}: {err_lines[j]}")
