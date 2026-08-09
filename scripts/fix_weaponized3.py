"""Fix weaponized_report.py by directly replacing problematic byte sequences."""
import re

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    lines = f.readlines()

fixed = 0
for i, line in enumerate(lines):
    original = line
    
    # Check if line contains the pattern: r"...["']..."
    # We detect this by looking for the byte sequence: r" then later [" followed by '
    # Use a simple string check - look for r" and ["' as substrings
    
    if 'r"' in line:
        # Find all positions where r" appears (not r""")
        idx = 0
        while True:
            pos = line.find('r"', idx)
            if pos < 0:
                break
            # Skip r"""
            if pos + 2 < len(line) and line[pos+2] == '"':
                idx = pos + 3
                continue
            
            # From this r", find closing "
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
            
            # Check if inner contains [ followed by either " or '
            # This is the problematic pattern: ["'] in a character class
            has_problem = False
            for k in range(len(inner) - 1):
                if inner[k] == '[' and inner[k+1] in ('"', "'"):
                    has_problem = True
                    break
            
            if has_problem:
                line = line[:pos] + "r'''" + inner + "'''" + line[closing+1:]
                fixed += 1
                # Don't increment idx, re-check from same position since we modified the line
            else:
                idx = closing + 1
    
    lines[i] = line

result = ''.join(lines)

# Verify with ast
import ast
try:
    ast.parse(result)
    print(f"SUCCESS! Fixed {fixed} patterns. No syntax errors.")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(result)
except SyntaxError as e:
    print(f"Still error at line {e.lineno}: {e.msg}")
    err_lines = result.split('\n')
    for j in range(max(0, e.lineno-3), min(len(err_lines), e.lineno+2)):
        marker = ">>>" if j+1 == e.lineno else "   "
        print(f"{marker} {j+1}: {err_lines[j]}")
