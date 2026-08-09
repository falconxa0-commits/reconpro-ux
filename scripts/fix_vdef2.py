"""Definitive fix v2 - find the CORRECT closing quote by looking for the last " before ,) or EOL."""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'
with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()


def find_raw_string_closing(line, start):
    """Find the closing quote for a raw string starting at position start+2.
    Uses bracket-aware parsing but also considers that the closing quote
    should be followed by , ) ] or end-of-line (not more regex content).
    """
    q = line[start + 1]  # " or '
    j = start + 2
    bracket_depth = 0
    
    # Collect all candidate closing positions (where " is at bracket_depth 0)
    candidates = []
    while j < len(line):
        ch = line[j]
        if ch == '\\' and j + 1 < len(line) and line[j + 1] == q:
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
        if ch == q and bracket_depth == 0:
            candidates.append(j)
            # Don't break - continue looking for more candidates
        j += 1
    
    if not candidates:
        return -1
    
    # The correct closing is usually the LAST candidate that is followed by:
    # , ) ] whitespace or end-of-line
    # But NOT followed by another alphanumeric/regex char
    
    # Strategy: take the last candidate
    return candidates[-1]


lines = content.split('\n')
fixed_lines = []
total = 0

for lineno, line in enumerate(lines, 1):
    new_line = line
    offset = 0
    
    # Process all r" patterns
    while True:
        pos = new_line.find('r"', offset)
        if pos < 0:
            break
        if pos + 2 < len(new_line) and new_line[pos+2] == '"':
            offset = pos + 3
            continue
        
        closing = find_raw_string_closing(new_line, pos)
        if closing < 0:
            offset = pos + 2
            continue
        
        inner = new_line[pos+2:closing]
        
        # Check if needs fix
        needs = False
        for k in range(len(inner)):
            if inner[k] == '[' and k + 1 < len(inner) and inner[k+1] in ('"', "'", '\\'):
                needs = True
                break
        
        if needs:
            if '"""' in inner:
                print(f"SKIP line {lineno}: has triple-double-quote in inner")
                offset = closing + 1
                continue
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
        
        # Find closing ' - take the last one that makes sense
        q = "'"
        j = pos + 2
        bracket_depth = 0
        candidates = []
        while j < len(new_line):
            ch = new_line[j]
            if ch == '\\' and j + 1 < len(new_line) and new_line[j + 1] == q:
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
            if ch == q and bracket_depth == 0:
                candidates.append(j)
            j += 1
        
        if not candidates:
            offset2 = pos + 2
            continue
        
        # Use the last candidate
        closing = candidates[-1]
        inner = new_line[pos+2:closing]
        
        needs = False
        for k in range(len(inner)):
            if inner[k] == '[' and k + 1 < len(inner) and inner[k+1] in ('"', "'", '\\'):
                needs = True
                break
        if '\\' + "'" in inner:
            needs = True
        
        if needs:
            if '"""' in inner:
                offset2 = closing + 1
                continue
            new_line = new_line[:pos] + 'r"""' + inner + '"""' + new_line[closing+1:]
            total += 1
            offset2 = pos + 5 + len(inner) + 3
        else:
            offset2 = closing + 1
    
    fixed_lines.append(new_line)

result = '\n'.join(fixed_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result)

try:
    ast.parse(result)
    print(f"SUCCESS! Fixed {total} patterns.")
except SyntaxError as e:
    print(f"Fixed {total}. Error at line {e.lineno}: {e.msg}")
    elines = result.split('\n')
    for j in range(max(0, e.lineno - 3), min(len(elines), e.lineno + 2)):
        marker = ">>>" if j + 1 == e.lineno else "   "
        print(f"{marker} {j + 1}: {elines[j]}")
