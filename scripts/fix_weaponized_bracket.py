"""Fix weaponized_report.py - bracket-aware raw string fixing.

The key insight: when parsing r"...", a [ opens a character class that can contain
the quote character. We must track bracket depth to find the TRUE closing quote.
"""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()


def find_raw_string_spans_bracket_aware(line):
    """Find all single-quoted raw string spans, bracket-aware for char classes.
    Returns list of (start, end, quote_char, inner_content).
    """
    results = []
    i = 0
    n = len(line)
    while i < n:
        if i < n - 1 and line[i] == 'r' and line[i + 1] in ('"', "'"):
            q = line[i + 1]
            # Skip triple quotes
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

            # Parse with bracket awareness
            j = i + 2
            bracket_depth = 0
            closing = -1
            while j < n:
                ch = line[j]
                # In raw strings, backslash before quote escapes it
                if ch == '\\' and j + 1 < n and line[j + 1] == q:
                    j += 2
                    continue
                # Track bracket depth for character classes
                if ch == '[' and bracket_depth >= 0:
                    bracket_depth += 1
                    j += 1
                    continue
                if ch == ']' and bracket_depth > 0:
                    bracket_depth -= 1
                    j += 1
                    continue
                # Only match closing quote when bracket depth is 0
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


def raw_needs_fix(inner, qchar):
    """Check if raw string inner will break the tokenizer."""
    for k in range(len(inner)):
        if inner[k] == '[':
            if k + 1 < len(inner) and inner[k + 1] in ('"', "'", '\\'):
                return True
    if qchar == "'" and "\\'" in inner:
        return True
    return False


def pick_delimiter(inner):
    """Choose triple-quote delimiter."""
    has_tsingle = "'''" in inner
    has_tdouble = '"""' in inner
    if not has_tsingle:
        return "'''"
    if not has_tdouble:
        return '"""'
    return None


# Process
lines = content.split('\n')
fixed_lines = []
total_fixes = 0

for lineno, line in enumerate(lines, 1):
    spans = find_raw_string_spans_bracket_aware(line)
    if not spans:
        fixed_lines.append(line)
        continue

    new_line = line
    for start, end, qchar, inner in reversed(spans):
        if raw_needs_fix(inner, qchar):
            delim = pick_delimiter(inner)
            if delim is None:
                print(f"WARNING line {lineno}: cannot auto-fix (has both triple quotes)")
                continue
            replacement = 'r' + delim + inner + delim
            new_line = new_line[:start] + replacement + new_line[end:]
            total_fixes += 1

    fixed_lines.append(new_line)

result = '\n'.join(fixed_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result)

try:
    ast.parse(result)
    print(f"SUCCESS! Fixed {total_fixes} patterns. File is syntactically valid.")
except SyntaxError as e:
    print(f"Fixed {total_fixes} patterns. Remaining error at line {e.lineno}: {e.msg}")
    elines = result.split('\n')
    for j in range(max(0, e.lineno - 3), min(len(elines), e.lineno + 2)):
        marker = ">>>" if j + 1 == e.lineno else "   "
        print(f"{marker} {j + 1}: {elines[j]}")
