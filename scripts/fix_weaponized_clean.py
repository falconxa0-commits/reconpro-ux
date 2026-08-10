"""Fix weaponized_report.py - fix all raw string quote-breaking patterns."""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()


def find_raw_string_spans(line):
    """Find all single-quoted raw string spans in a line.
    Returns list of (start_pos, end_pos, quote_char, inner_content).
    Skips triple-quoted raw strings (they are already safe).
    """
    results = []
    i = 0
    n = len(line)
    while i < n:
        if i < n - 1 and line[i] == 'r' and line[i + 1] in ('"', "'"):
            q = line[i + 1]
            # Skip triple quotes
            if i + 3 < n and line[i + 2] == q and line[i + 3] == q:
                # Find closing triple quote
                j = i + 4
                while j <= n - 3:
                    if line[j] == q and line[j + 1] == q and line[j + 2] == q:
                        i = j + 3
                        break
                    j += 1
                else:
                    i += 4
                continue

            # Single-quoted raw string r"..." or r'...'
            j = i + 2
            closing = -1
            while j < n:
                # In raw strings, backslash before the quote char still escapes it
                if line[j] == '\\' and j + 1 < n and line[j + 1] == q:
                    j += 2
                    continue
                if line[j] == q:
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
    """Check if raw string inner content will break the tokenizer.
    For r"..." content: [" breaks because Python sees subscript.
    For r'...' content: \' breaks because it escapes the closing quote.
    """
    for k in range(len(inner)):
        if inner[k] == '[':
            if k + 1 < len(inner) and inner[k + 1] in ('"', "'", '\\'):
                return True
    # Also check for \' which breaks r'...'
    if qchar == "'":
        idx = 0
        while True:
            pos = inner.find("\\'", idx)
            if pos < 0:
                break
            return True
    return False


def pick_delimiter(inner, orig_qchar):
    """Choose triple-quote delimiter: r triple-single or r triple-double."""
    has_dquote = '"' in inner
    has_squote = "'" in inner
    has_tsingle = "'''" in inner
    has_tdouble = '"""' in inner

    # Can't use r''' if content has '''
    # Can't use r""" if content has """
    can_single = not has_tsingle
    can_double = not has_tdouble

    if can_single and can_double:
        # Prefer r''' (single-quote triple) since " in content is more common
        return "'''"
    if can_single:
        return "'''"
    if can_double:
        return '"""'
    return None  # Both triple quotes appear in content - need manual fix


# Process
lines = content.split('\n')
fixed_lines = []
total_fixes = 0

for lineno, line in enumerate(lines, 1):
    spans = find_raw_string_spans(line)
    if not spans:
        fixed_lines.append(line)
        continue

    new_line = line
    # Process right-to-left to maintain positions
    for start, end, qchar, inner in reversed(spans):
        if raw_needs_fix(inner, qchar):
            delim = pick_delimiter(inner, qchar)
            if delim is None:
                print(f"WARNING line {lineno}: cannot auto-fix")
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
