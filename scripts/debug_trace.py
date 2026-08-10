"""Detailed trace of bracket-aware parser on line 1275."""
filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'
lines = open(filepath, 'r').readlines()
line = lines[1274]  # line 1275

# Simulate parser
q = '"'
j = 8 + 2  # skip r"
bracket_depth = 0

while j < len(line):
    ch = line[j]
    if ch == '\\' and j + 1 < len(line) and line[j + 1] == q:
        print(f"  j={j}: ESCAPED QUOTE \\{q}")
        j += 2
        continue
    if ch == '[':
        bracket_depth += 1
        print(f"  j={j}: [ -> depth={bracket_depth}  char={repr(ch)}")
        j += 1
        continue
    if ch == ']' and bracket_depth > 0:
        bracket_depth -= 1
        print(f"  j={j}: ] -> depth={bracket_depth}  char={repr(ch)}")
        j += 1
        continue
    if ch == q and bracket_depth == 0:
        print(f"  j={j}: CLOSING QUOTE at depth 0  char={repr(ch)}")
        inner = line[8+2:j]
        print(f"  Inner ({j-10} chars): {repr(inner[:120])}")
        break
    if ch == q:
        print(f"  j={j}: quote but depth={bracket_depth}, skip  char={repr(ch)}")
    j += 1
