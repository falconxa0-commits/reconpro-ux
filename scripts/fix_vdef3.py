"""Definitive fix v3 - also detect ["'] when [ is followed by ^ first (negated char class)."""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'
with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
    content = f.read()


def find_closing_bracket_aware(line, start):
    """Find ALL candidate closing positions for raw string at start.
    Returns list of positions where quote char appears at bracket_depth 0.
    """
    q = line[start + 1]
    j = start + 2
    bracket_depth = 0
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
        j += 1
    return candidates if candidates else [-1]


def needs_fix_v2(inner):
    """Check if raw string inner content will break Python's tokenizer.
    Python's tokenizer doesn't understand regex brackets. It finds the 
    FIRST unescaped quote char as closing. So if inner contains the quote
    char ANYWHERE (not inside [...]), Python will close early.
    
    But if the quote is inside [...], our bracket-aware parser skips it.
    The issue: Python doesn't skip it. So we need to check if the FIRST
    occurrence of the quote char in inner is at bracket_depth > 0.
    
    Actually simpler: if inner contains the quote char at all AND there's
    a bracket before it that's still open, then Python breaks.
    
    Even simpler: just check if inner has the quote char AND has [ before it.
    """
    # For r"..." content: if it contains " and [ appears before it, Python breaks
    # For r'...' content: if it contains ' and [ appears before it, same issue
    # Also for r'...' content: \' always breaks (escapes closing quote)
    
    # Actually the simplest check: does the content have [ followed (at any distance) 
    # by the quote char before a ] closes it?
    
    # Simplest of all: if content has the quote char at all, it's potentially broken
    # But that would flag too many...
    
    # Better: simulate Python's simple parsing (no bracket awareness)
    # Find where Python would close the string
    for k in range(len(inner)):
        if inner[k] == '[':
            # After [, check if quote appears before ]
            for m in range(k + 1, len(inner)):
                if inner[m] == ']':
                    break
                if inner[m] == '"' or inner[m] == "'":
                    return True  # Quote inside [...] will break Python
            continue
    
    return False


def needs_fix_v3(inner, qchar):
    """Check if raw string will break Python tokenizer."""
    # Method: simulate Python's non-bracket-aware parsing
    # Find first unescaped qchar in inner
    j = 0
    while j < len(inner):
        if inner[j] == '\\' and j + 1 < len(inner) and inner[j+1] == qchar:
            j += 2
            continue
        if inner[j] == qchar:
            # Python would close here. Is our bracket-aware parser past this?
            # If bracket-aware parser would have found a DIFFERENT closing,
            # then Python breaks.
            # Simple check: is there a [ before this that hasn't been closed?
            bracket = 0
            for k in range(j):
                if inner[k] == '[':
                    bracket += 1
                elif inner[k] == ']':
                    bracket -= 1
            if bracket > 0:
                return True  # Quote inside unclosed bracket
            return False  # Python's closing matches our understanding
        j += 1
    return False


lines = content.split('\n')
fixed_lines = []
total = 0

for lineno, line in enumerate(lines, 1):
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
        
        candidates = find_closing_bracket_aware(new_line, pos)
        if candidates == [-1]:
            offset = pos + 2
            continue
        closing = candidates[-1]
        inner = new_line[pos+2:closing]
        
        if needs_fix_v3(inner, '"'):
            if '"""' in inner:
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
        
        candidates = find_closing_bracket_aware(new_line, pos)
        if candidates == [-1]:
            offset2 = pos + 2
            continue
        closing = candidates[-1]
        inner = new_line[pos+2:closing]
        
        fix = needs_fix_v3(inner, "'")
        if not fix and "\\'" in inner:
            fix = True  # \' always breaks r'
        
        if fix:
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
