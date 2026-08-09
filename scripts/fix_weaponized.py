"""Fix all r"..." regex patterns containing ["'] in weaponized_report.py"""
import re

filepath = 'reconpro/modules/weaponized_report.py'
content = open(filepath, 'r').read()
lines = content.split('\n')

# Find all lines with problematic r" patterns
# The issue: r"src\s*=\s*["']..." - Python sees [" as subscript
# Fix: use r''' instead of r"

fixed_lines = []
fixes = 0

for i, line in enumerate(lines):
    # Skip lines that already use r''' or r"""
    if "r'''" in line or 'r"""' in line:
        fixed_lines.append(line)
        continue
    
    # Look for r" followed by content containing ["']
    # The pattern is: some_code(r"CONTENT", rest)
    # where CONTENT has ["'] inside
    
    # Find all r" that need fixing
    if 'r"' in line and '[' in line and "'" in line:
        # Check if ["'] pattern exists
        # We use a simple heuristic: if r" appears and there's [" or '] after it
        idx = line.find('r"')
        while idx >= 0:
            # Make sure it's not r"""
            if idx + 2 < len(line) and line[idx+2] == '"':
                idx = line.find('r"', idx + 3)
                continue
            
            # Found r" - check if there's a ["'] before the closing "
            # Find closing "
            rest = line[idx+2:]
            close = None
            for j in range(len(rest)):
                if rest[j] == '"' and (j == 0 or rest[j-1] != '\\'):
                    close = j
                    break
            
            if close is None:
                idx = line.find('r"', idx + 2)
                continue
            
            inner = rest[:close]
            if "['" in inner or '["' in inner:
                # This needs fixing
                prefix = line[:idx]
                suffix = line[idx+2+close+1:]  # after closing "
                fixed_line = prefix + "r'''" + inner + "'''" + suffix
                line = fixed_line
                fixes += 1
            
            idx = line.find('r"', idx + 3)
    
    fixed_lines.append(line)

result = '\n'.join(fixed_lines)

# Verify
import ast
try:
    ast.parse(result)
    print(f"Fixed {fixes} patterns. No syntax errors!")
    with open(filepath, 'w') as f:
        f.write(result)
except SyntaxError as e:
    print(f"Still has error at line {e.lineno}: {e.msg}")
    err_lines = result.split('\n')
    for j in range(max(0, e.lineno-3), min(len(err_lines), e.lineno+2)):
        marker = ">>>" if j+1 == e.lineno else "   "
        print(f"{marker} {j+1}: {err_lines[j]}")
