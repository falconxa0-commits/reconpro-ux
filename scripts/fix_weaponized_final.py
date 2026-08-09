"""Fix weaponized_report.py - comprehensive fix for all raw string quote issues.

Root cause: Raw strings r"..." or r'...' contain character classes ["'] or ["\']
which break Python's tokenizer because [" or ]' get interpreted as subscripts.

Fix: Convert affected raw strings to triple-quoted raw strings.
  - If the inner content contains ", use r'''  (avoid r"""")
  - If the inner content contains ', use r"""  (avoid r''')
  - If it contains both " and ' as part of ["'] char class, use r''' and keep ['"] as-is

Strategy: Process the file line by line, find each raw string, check if it needs fixing.
"""

import ast
import sys

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()

def find_raw_strings(line):
    """Find all raw string literals in a line. Returns list of (start, end, quote_char, content)."""
    results = []
    i = 0
    while i < len(line):
        # Look for r" or r' (not r""" or r''')
        if line[i] == 'r' and i + 1 < len(line) and line[i+1] in ('"', "'"):
            q = line[i+1]
            # Check for triple quote
            if i + 3 < len(line) and line[i+2] == q and line[i+3] == q:
                # Triple-quoted raw string
                # Find closing triple quote
                j = i + 4
                while j < len(line) - 2:
                    if line[j] == q and line[j+1] == q and line[j+2] == q:
                        results.append((i, j+3, q*3, line[i+4:j]))
                        i = j + 3
                        break
                    j += 1
                else:
                    # Unclosed - skip
                    i += 4
            else:
                # Single-quoted raw string
                j = i + 2
                closing = -1
                while j < len(line):
                    if line[j] == '\\' and j + 1 < len(line) and line[j+1] == q:
                        j += 2  # skip escaped quote (in r strings, \ before quote still escapes)
                        continue
                    if line[j] == q:
                        closing = j
                        break
                    j += 1
                
                if closing >= 0:
                    results.append((i, closing + 1, q, line[i+2:closing]))
                    i = closing + 1
                else:
                    i += 2
        else:
            i += 1
    return results


def needs_fix(content_of_raw, quote_char):
    """Check if a raw string content needs fixing (contains [" or ]' pattern that breaks tokenizer)."""
    # In r"...", [" breaks tokenizer
    # In r'...', ]' or \' at end breaks tokenizer
    if quote_char == '"':
        # Check for [ followed by "
        for k in range(len(content_of_raw) - 1):
            if content_of_raw[k] == '[' and content_of_raw[k+1] == '"':
                return True
            # Also [ followed by \' (escaped single quote in double-quoted string)
            # Actually in r", \ is literal, so \' is just backslash and quote
            # But [" still breaks
    elif quote_char == "'":
        # Check for [ followed by " (in single-quoted string, " is fine)
        # But ]' breaks
        for k in range(len(content_of_raw) - 1):
            if content_of_raw[k] == '[' and content_of_raw[k+1] == '"':
                # This is fine in r'...' actually... unless the " somehow causes issues
                # Actually in r'...', " is fine. The issue is [' (bracket followed by single quote)
                pass
            if content_of_raw[k] == '[' and content_of_raw[k+1] == "'":
                return True
            # Also check for \' which escapes the closing '
            if content_of_raw[k] == '\\' and content_of_raw[k+1] == "'":
                # In raw string r'...\'...', the \' escapes the quote
                # This is actually fine as long as the \' is not at the end
                # But if followed by ], it becomes \' ] which is actually ] closing bracket then '
                # Hmm, this is getting complicated
                return True  # Conservative: flag all \' in raw strings as needing fix
    return False


def choose_triple_quote(content_of_raw, original_quote):
    """Choose between r''' and r''' based on content."""
    has_double = '"' in content_of_raw
    has_single = "'" in content_of_raw
    has_triple_single = "'''" in content_of_raw
    has_triple_double = '"""' in content_of_raw
    
    if has_triple_single and has_triple_double:
        return None  # Can't fix easily
    
    # If content has ''' but not """, use r"""
    if has_triple_single and not has_triple_double:
        return '"""'
    # If content has """ but not ''', use r'''
    if has_triple_double and not has_triple_single:
        return "'''"
    # If content has neither triple, prefer r''' if content has "
    if has_double and not has_single:
        return "'''"  # r''' is safe when content has " but not '
    if has_single and not has_double:
        return '"""'  # r""" is safe when content has ' but not "
    # If content has both " and ', prefer r''' (since ' in content is less common issue)
    return "'''"


# Process each line
lines = content.split('\n')
fixed_lines = []
total_fixes = 0

for lineno, line in enumerate(lines, 1):
    raw_strings = find_raw_strings(line)
    
    if not raw_strings:
        fixed_lines.append(line)
        continue
    
    # Process from right to left to preserve positions
    new_line = line
    for start, end, quote_char, inner in reversed(raw_strings):
        if len(quote_char) == 3:
            continue  # Already triple-quoted
        
        if needs_fix(inner, quote_char):
            new_quote = choose_triple_quote(inner, quote_char)
            if new_quote is None:
                print(f"WARNING Line {lineno}: Can't fix (has both triple quotes): {line.rstrip()[:80]}")
                continue
            
            new_line = new_line[:start] + 'r' + new_quote + inner + new_quote + new_line[end:]
            total_fixes += 1
    
    fixed_lines.append(new_line)

result = '\n'.join(fixed_lines)

# Verify
try:
    ast.parse(result)
    print(f"SUCCESS! Fixed {total_fixes} raw strings. No syntax errors!")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(result)
except SyntaxError as e:
    print(f"Fixed {total_fixes} raw strings. Still error at line {e.lineno}: {e.msg}")
    err_lines = result.split('\n')
    for j in range(max(0, e.lineno-3), min(len(err_lines), e.lineno+2)):
        marker = ">>>" if j+1 == e.lineno else "   "
        print(f"{marker} {j+1}: {err_lines[j]}")
    # Save anyway for inspection
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(result)
