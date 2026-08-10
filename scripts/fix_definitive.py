"""Definitive fix for weaponized_report.py - use r\"\"\" for all problematic patterns."""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'
with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()

lines = content.split('\n')
fixed_lines = []
total = 0

for lineno, line in enumerate(lines, 1):
    # Find r" (not r""") containing [ followed by "
    # Also find r' (not r''') containing [ followed by ' or containing \'
    
    new_line = line
    offset = 0
    
    # Process r" patterns
    while True:
        pos = new_line.find('r"', offset)
        if pos < 0:
            break
        if pos + 2 < len(new_line) and new_line[pos+2] == '"':
            offset = pos + 3
            continue
        
        # Find closing " with bracket awareness
        j = pos + 2
        bracket_depth = 0
        closing = -1
        while j < len(new_line):
            ch = new_line[j]
            if ch == chr(92) and j + 1 < len(new_line) and new_line[j+1] == '"':
                j += 2
                continue
            if ch == '[':
                bracket_depth += 1
                j += 1
                continue
            if ch == ']' and bracket_depth > 0:
                bracket_depth -= 1
                j += 1
                continue
            if ch == '"' and bracket_depth == 0:
                closing = j
                break
            j += 1
        
        if closing < 0:
            offset = pos + 2
            continue
        
        inner = new_line[pos+2:closing]
        
        # Check if inner has [ followed by " or ' or backslash
        needs = False
        for k in range(len(inner)):
            if inner[k] == '[' and k + 1 < len(inner) and inner[k+1] in ('"', "'", chr(92)):
                needs = True
                break
        
        if needs:
            # Use r\"\"\" (triple double quote) since inner doesn't have \"""
            # (we checked above - only 6 lines have \"\"\" and they already use it)
            new_line = new_line[:pos] + 'r"""' + inner + '"""' + new_line[closing+1:]
            total += 1
            offset = pos + 5 + len(inner) + 3
        else:
            offset = closing + 1
    
    # Process r' patterns  
    offset2 = 0
    while True:
        pos = new_line.find("r'", offset2)
        if pos < 0:
            break
        if pos + 2 < len(new_line) and new_line[pos+2] == "'":
            offset2 = pos + 3
            continue
        
        # Find closing ' (handling \' escapes)
        j = pos + 2
        bracket_depth = 0
        closing = -1
        while j < len(new_line):
            ch = new_line[j]
            if ch == chr(92) and j + 1 < len(new_line) and new_line[j+1] == "'":
                j += 2
                continue
            if ch == '[':
                bracket_depth += 1
                j += 1
                continue
            if ch == ']' and bracket_depth > 0:
                bracket_depth -= 1
                j += 1
                continue
            if ch == "'" and bracket_depth == 0:
                closing = j
                break
            j += 1
        
        if closing < 0:
            offset2 = pos + 2
            continue
        
        inner = new_line[pos+2:closing]
        
        # Check if inner has [ followed by " (which is fine in r') 
        # or [ followed by ' or \'
        needs = False
        for k in range(len(inner)):
            if inner[k] == '[' and k + 1 < len(inner):
                if inner[k+1] in (chr(34), chr(39), chr(92)):
                    needs = True
                    break
        
        # Also check for \' (backslash-quote) anywhere in r' content
        if chr(92) + chr(39) in inner:
            needs = True
        
        if needs:
            # Check if inner has \"\"\" - if so, can't use r\"\"\"
            if '"""' in inner:
                print(f"SKIP line {lineno}: inner has triple-double-quote")
                offset2 = closing + 1
                continue
            new_line = new_line[:pos] + 'r"""' + inner + '"""' + new_line[closing+1:]
            total += 1
            offset2 = pos + 5 + len(inner) + 3
        else:
            offset2 = closing + 1
    
    fixed_lines.append(new_line)

result = chr(10).join(fixed_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result)

try:
    ast.parse(result)
    print(f"SUCCESS! Fixed {total} patterns. File is valid.")
except SyntaxError as e:
    print(f"Fixed {total}. Error at line {e.lineno}: {e.msg}")
    elines = result.split(chr(10))
    for j in range(max(0, e.lineno - 3), min(len(elines), e.lineno + 2)):
        marker = ">>>" if j + 1 == e.lineno else "   "
        print(f"{marker} {j + 1}: {elines[j]}")
