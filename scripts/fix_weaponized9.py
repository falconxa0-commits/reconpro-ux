"""Fix weaponized_report.py v9 - use r''' for converted r' patterns that contain \" """
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()

# The v8 fix converted r'...["\']...' to r"""...["']..."""
# But r""" breaks when the content contains "" (double double-quotes)
# Fix: change r""" back to r''' where the inner content has """

# Find r""" patterns that were converted (they contain ["'] pattern and are on lines
# that originally had r')
# Strategy: find all r""" that contain ['"] and change to r'''

lines = content.split('\n')
fixed_lines = []
fixes = 0

for i, line in enumerate(lines):
    new_line = line
    offset = 0
    
    while True:
        pos = new_line.find('r"""', offset)
        if pos < 0:
            break
        
        # Find closing """
        j = pos + 4
        closing = -1
        while j < len(new_line) - 2:
            if new_line[j:j+3] == '"""':
                closing = j
                break
            j += 1
        
        if closing < 0:
            offset = pos + 4
            continue
        
        inner = new_line[pos+4:closing]
        
        # If inner contains "" (which would break r""") or contains ["'] pattern
        # that should be in r'''
        if '""' in inner or '["' in inner:
            # Check if this is actually one of the converted patterns
            # (contains ["'] character class pattern)
            has_char_class = False
            for k in range(len(inner) - 1):
                if inner[k] == '[' and inner[k+1] in ('"', "'"):
                    has_char_class = True
                    break
                if inner[k] == '[' and inner[k+1] == '\\' and k+2 < len(inner) and inner[k+2] in ('"', "'"):
                    has_char_class = True
                    break
            
            if has_char_class:
                # Convert to r'''...''' instead
                new_line = new_line[:pos] + "r'''" + inner + "'''" + new_line[closing+3:]
                fixes += 1
                offset = pos + 5 + len(inner) + 3
            else:
                offset = closing + 3
        else:
            offset = closing + 3
    
    fixed_lines.append(new_line)

result = '\n'.join(fixed_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result)

try:
    ast.parse(result)
    print(f"SUCCESS! Fixed {fixes} r\"\"\" to r'''. No syntax errors.")
except SyntaxError as e:
    print(f"Fixed {fixes} patterns. Still error at line {e.lineno}: {e.msg}")
    err_lines = result.split('\n')
    for j in range(max(0, e.lineno-3), min(len(err_lines), e.lineno+2)):
        marker = ">>>" if j+1 == e.lineno else "   "
        print(f"{marker} {j+1}: {err_lines[j]}")
