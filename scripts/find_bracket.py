"""Find unmatched bracket in weaponized_report.py"""
filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

content = open(filepath, 'r').read()
lines = content.split('\n')

# Track bracket depth more carefully, handling strings
depth = 0
in_string = False
string_char = None
escape_next = False

for lineno, line in enumerate(lines, 1):
    for ch in line:
        if escape_next:
            escape_next = False
            continue
        
        if ch == '\\' and in_string:
            escape_next = True
            continue
        
        if ch in ('"', "'") and not in_string:
            in_string = True
            string_char = ch
        elif ch == string_char and in_string:
            in_string = False
        elif not in_string:
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth < 0:
                    print(f"Line {lineno}: UNMATCHED ] (depth went to {depth})")
    
    if depth != 0 and lineno < 1620:
        # Only show suspicious lines near the error area
        if any(k in line for k in ['[', ']']):
            pass  # too noisy
    
    if lineno == 1599 or (lineno >= 1590 and lineno <= 1610):
        print(f"  Line {lineno}: bracket_depth={depth}  {line.rstrip()[:80]}")

print(f"\nFinal depth at line 1600: {depth}")

# Now scan more carefully - look for lines where depth changes unexpectedly
depth = 0
in_string = False
string_char = None
escape_next = False

print("\n--- Bracket depth changes in range 1550-1600 ---")
for lineno, line in enumerate(lines, 1):
    old_depth = depth
    for ch in line:
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch in ('"', "'") and not in_string:
            in_string = True
            string_char = ch
        elif ch == string_char and in_string:
            in_string = False
        elif not in_string:
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
    
    if 1550 <= lineno <= 1600 and old_depth != depth:
        print(f"  Line {lineno}: depth {old_depth}->{depth}  {'  '.join(ch for ch in line if ch in '[]') or '(none)'}  {line.rstrip()[:60]}")
