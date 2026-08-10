"""Definitive fix v4 - also handles rf\" and fr\" f-strings."""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'
with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()


def find_raw_like_strings(line):
    """Find all raw-string-like patterns: r\", rf\", fr\", r', rf', fr'"""
    results = []
    i = 0
    n = len(line)
    while i < n - 1:
        # Match r" or r' or rf" or fr" etc.
        if line[i] in ('r', 'f'):
            prefix_start = i
            if line[i] == 'f':
                if i + 1 < n and line[i+1] == 'r':
                    i += 1
                else:
                    i += 1
                    continue
            if line[i] == 'r':
                if i + 1 < n and line[i+1] == 'f':
                    i += 1
            
            if i + 1 < n and line[i+1] in ('"', "'"):
                q = line[i+1]
                # Triple quote?
                if i + 3 < n and line[i+2] == q and line[i+3] == q:
                    j = i + 4
                    while j <= n - 3:
                        if line[j] == q and line[j+1] == q and line[j+2] == q:
                            i = j + 3
                            break
                        j += 1
                    else:
                        i += 4
                    continue
                
                # Single quote - bracket-aware closing
                j = i + 2
                bracket_depth = 0
                candidates = []
                while j < n:
                    ch = line[j]
                    if ch == '\\' and j + 1 < n and line[j+1] == q:
                        j += 2
                        continue
                    if ch == '{' and 'f' in line[prefix_start:i+2]:
                        j += 1
                        continue  # f-string expression, skip {
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
                
                if candidates:
                    inner = line[i+2:candidates[-1]]
                    prefix = line[prefix_start:i+2]
                    results.append((prefix_start, candidates[-1]+1, prefix, q, inner))
                    i = candidates[-1] + 1
                else:
                    i += 2
            else:
                i += 1
        else:
            i += 1
    return results


def needs_fix(inner, qchar):
    """Check if raw string content will break Python tokenizer."""
    j = 0
    while j < len(inner):
        if inner[j] == '\\' and j + 1 < len(inner) and inner[j+1] == qchar:
            j += 2
            continue
        if inner[j] == qchar:
            bracket = 0
            for k in range(j):
                if inner[k] == '[':
                    bracket += 1
                elif inner[k] == ']':
                    bracket -= 1
            if bracket > 0:
                return True
            return False
        j += 1
    return False


lines = content.split('\n')
fixed_lines = []
total = 0

for lineno, line in enumerate(lines, 1):
    spans = find_raw_like_strings(line)
    if not spans:
        fixed_lines.append(line)
        continue
    
    new_line = line
    for start, end, prefix, qchar, inner in reversed(spans):
        fix = needs_fix(inner, qchar)
        if not fix and qchar == "'" and "\\'" in inner:
            fix = True
        
        if fix:
            if '"""' in inner:
                continue
            # Use prefix + """ delimiter
            # For rf" -> rf"""  or r" -> r"""
            new_prefix = prefix[:-1] + '"""'  # Replace trailing " with """
            new_line = new_line[:start] + new_prefix + inner + '"""' + new_line[end:]
            total += 1
    
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
