"""Debug: trace what happens with line 1275 in the fix script."""
import sys
sys.path.insert(0, '/home/z/my-project/scripts')

# Read the original file
filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'
with open(filepath, 'r') as f:
    content = f.read()

lines = content.split('\n')
line = lines[1274]  # 0-indexed, so line 1275
print(f"Original line 1275: {line.rstrip()[:120]}")
print(f"Repr: {repr(line[:120])}")

# Now apply the v3 logic
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
                if ch == '\\' and j + 1 < n and line[j + 1] == q:
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

spans = find_raw_string_spans(line)
print(f"\nFound {len(spans)} raw strings:")
for start, end, qchar, inner in spans:
    print(f"  pos {start}-{end}, q={repr(qchar)}, inner={repr(inner[:80])}")
    
    # Check needs_fix
    for k in range(len(inner)):
        if inner[k] == '[' and k + 1 < len(inner) and inner[k + 1] in ('"', "'", '\\'):
            print(f"  -> needs_fix: TRUE (at inner pos {k}: {repr(inner[k:k+3])})")
            break
    else:
        if "'" in qchar and "\\'" in inner:
            print(f"  -> needs_fix: TRUE (escaped quote)")
        else:
            print(f"  -> needs_fix: FALSE")
