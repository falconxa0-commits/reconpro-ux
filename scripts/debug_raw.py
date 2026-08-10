"""Debug find_raw_string_spans on the problematic line."""
line = '    r"<meta[^>]+http-equiv\\s*=\\s*["\']refresh["\'][^>]+content\\s*=\\s*["\']([^"\']+)["\']",'

# The actual file content (after git restore)
# Note: in the file, the \' is actual backslash followed by quote

q = '"'
i = 0
n = len(line)

# Find r"
while i < n:
    if line[i] == 'r' and i + 1 < n and line[i + 1] == '"':
        print(f"Found r\" at pos {i}")
        j = i + 2
        while j < n:
            if line[j] == '\\' and j + 1 < n and line[j + 1] == '"':
                print(f"  pos {j}: escaped quote (\\\")")
                j += 2
                continue
            if line[j] == '"':
                print(f"  pos {j}: closing quote found!")
                inner = line[i + 2:j]
                print(f"  inner ({len(inner)} chars): {repr(inner)}")
                break
            print(f"  pos {j}: {repr(line[j])}")
            j += 1
        break
    i += 1
