"""Fix weaponized_report.py v7 - comprehensive byte-level fix."""
import ast

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'rb') as f:
    content = f.read()

text = content.decode('utf-8', errors='surrogateescape')

# Find all r" (not r""") that contain [" or [\' pattern
# Strategy: find r" pos, then scan ahead for [ followed by " or [ followed by \'
# Then find the REAL closing " by looking for the pattern where the regex would be valid
# The real closing " is typically after ["']...["']" - the final " that closes the char class

positions = []
i = 0
while True:
    pos = text.find('r"', i)
    if pos < 0:
        break
    if pos + 2 < len(text) and text[pos+2] != '"':
        # Check if this r" contains [" or [\'
        ahead = text[pos:pos+500]
        has_problem = False
        for k in range(len(ahead)):
            if ahead[k] == '[' and k+1 < len(ahead):
                if ahead[k+1] == '"' or (ahead[k+1] == '\\' and k+2 < len(ahead) and ahead[k+2] == "'"):
                    has_problem = True
                    break
        if has_problem:
            positions.append(pos)
    i = pos + 2

print(f"Found {len(positions)} problematic r\" positions to fix")

# For each position, we need to find the true closing "
# The pattern is r"REGEX" where REGEX contains ["' somewhere
# Since Python's parser breaks at the [" inside, we can't just find matching quotes
# Instead, we look for the pattern: ["'][^"]*["']" (closing char class followed by closing string)
# The real closing " is after the last ["']...["'] sequence
# Heuristic: find the LAST occurrence of ["'] or ["\'] before a " that is followed by , or )

# Better approach: scan forward from r" and count ["'] pairs
# Each ["'] should have a matching ] somewhere after
# The real end of the raw string is after the last balanced [...] and the closing "

fixes_made = 0
offset = 0  # track how much we've shifted the string

for pos in sorted(positions):
    real_pos = pos + offset
    if real_pos >= len(text):
        break
    
    # Scan forward to find the real closing "
    # We look for the pattern: ...["']...[chars]...["']..."
    # Then find the " that closes the r" string
    # Strategy: scan forward, track bracket depth, find " at depth 0
    
    j = real_pos + 2  # skip r"
    bracket_depth = 0
    closing = -1
    
    while j < len(text):
        ch = text[j]
        if ch == '[' and j > 0 and text[j-1] != '\\':
            bracket_depth += 1
        elif ch == ']' and j > 0 and text[j-1] != '\\':
            bracket_depth -= 1
        elif ch == '\\' and bracket_depth == 0:
            j += 2  # skip escaped char
            continue
        elif ch == '"' and bracket_depth == 0:
            # Check it's not \"
            if j > 0 and text[j-1] != '\\':
                closing = j
                break
        j += 1
    
    if closing < 0:
        continue
    
    inner = text[real_pos+2:closing]
    
    # Replace r"..." with r'''...'''
    text = text[:real_pos] + "r'''" + inner + "'''" + text[closing+1:]
    offset += 3 + 3 - 2  # r''' (3) + ''' (3) vs r" (2) + " (1) = net +3
    fixes_made += 1

print(f"Made {fixes_made} replacements")

# Verify
try:
    ast.parse(text)
    print("SUCCESS! No syntax errors!")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
except SyntaxError as e:
    print(f"Still error at line {e.lineno}: {e.msg}")
    err_lines = text.split('\n')
    for j in range(max(0, e.lineno-3), min(len(err_lines), e.lineno+2)):
        marker = ">>>" if j+1 == e.lineno else "   "
        print(f"{marker} {j+1}: {err_lines[j]}")
    # Save anyway for inspection
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
