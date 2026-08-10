"""Fix weaponized_report.py v3 - properly handles escaped parens in raw strings."""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()


def find_raw_string_spans(line):
    results = []
    i = 0
    n = len(line)
    while i < n:
        if i < n - 1 and line[i] == 'r' and line[i + 1] in ('"', "'"):
            q = line[i + 1]
            if i + 3 < n and line[i + 2] == q and line[i + 3] == q:
                j = i + 4
                while j <= n - 3:
                    if line[j] == q and line[j + 1] == q and line[j + 2] == q:
                        i = j + 3
                        break
                    j += 1
                else:
                    i += 4
                continue

            j = i + 2
            bracket_depth = 0
            closing = -1
            while j < n:
                ch = line[j]
                # Backslash + quote char: skip both (escaped quote)
                if ch == '\\' and j + 1 < n and line[j + 1] == q:
                    j += 2
                    continue
                # Backslash + bracket or paren: skip both (these are escaped in regex)
                # We only care about unescaped [ ] ( ) for depth tracking
                # Actually, in raw strings \[ is literal \[, not an escape
                # But for depth tracking, \[ means literal bracket, not a char class
                # However: we need to match the raw string closing, not parse regex
                # The ONLY thing that matters is: can the quote char appear inside?
                # Answer: YES, if inside a char class [...]
                # So: track ONLY bracket depth, ignore parens
                if ch == '[':
                    bracket_depth += 1
                    j += 1
                    continue
                if ch == ']' and bracket_depth > 0:
                    bracket_depth -= 1
                    j += 1
                    continue
                if ch == q and bracket_depth == 0:
                    closing = j
                    break
                j += 1

            if closing >= 0:
                inner = line[i + 2:closing]
                results.append((i, closing + 1, q, inner))
                i = closing + 1
            else:
                i += 2
        else:
            i += 1
    return results


def needs_fix(inner, qchar):
    for k in range(len(inner)):
        if inner[k] == '[' and k + 1 < len(inner) and inner[k + 1] in ('"', "'", '\\'):
            return True
    if qchar == "'" and "\\'" in inner:
        return True
    return False


def pick_delim(inner):
    if "'''" not in inner:
        return "'''"
    if '"""' not in inner:
        return '"""'
    return None


lines = content.split('\n')
fixed_lines = []
total = 0

for lineno, line in enumerate(lines, 1):
    spans = find_raw_string_spans(line)
    if not spans:
        fixed_lines.append(line)
        continue

    new_line = line
    for start, end, qchar, inner in reversed(spans):
        if needs_fix(inner, qchar):
            d = pick_delim(inner)
            if d is None:
                print(f"WARN {lineno}: has both triple quotes")
                continue
            new_line = new_line[:start] + 'r' + d + inner + d + new_line[end:]
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
