"""Fix all problematic r" regex patterns in weaponized_report.py by replacing with r''' """
import re

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

# Read the raw bytes to avoid Python parsing issues
with open(filepath, 'rb') as f:
    content_bytes = f.read()
content = content_bytes.decode('utf-8')

# Replace specific known problematic lines using byte-level replacement
# The patterns to fix (from the error output):
replacements = [
    # Line 1208
    (
        b'r"src\\s*=\\s*[\\"\\x27]([^"\\x27]+)[\\"\\x27]"',
        b"r'''src\\\\s*=\\\\s*[\"']([^\"']+)[\"']'''"
    ),
]

# Actually, let me just read and write line by line, using raw string detection
lines = content.split('\n')
fixed_lines = []

for i, line in enumerate(lines):
    # Check if this line has the problem: r" containing character class with quotes
    # Pattern: r"something["']something"
    # In the actual file bytes, this looks like: r"...\["'...]..."  which Python can't parse
    
    # Detect: does line have r" and also contain ["'] ?
    if 'r"' in line and '["\']' in line and 'r"""' not in line and "r'''" not in line:
        # Use a regex to find and replace
        # Find r"...." where .... contains ["']
        def replacer(m):
            inner = m.group(1)
            return "r'''" + inner + "'''"
        
        # Match r" followed by non-greedy content until closing " 
        # But the content contains ["'] which makes regex tricky
        # Let's do it differently: find r" position, then manually find closing "
        
        result_line = line
        offset = 0
        while True:
            search_start = result_line.find('r"', offset)
            if search_start < 0:
                break
            # Check it's not r"""
            if search_start + 2 < len(result_line) and result_line[search_start + 2] == '"':
                offset = search_start + 3
                continue
            
            # From r", find the closing " (accounting for \" escapes)
            pos = search_start + 2
            closing = -1
            while pos < len(result_line):
                if result_line[pos] == '\\' and pos + 1 < len(result_line):
                    pos += 2  # skip escaped char
                    continue
                if result_line[pos] == '"':
                    closing = pos
                    break
                pos += 1
            
            if closing < 0:
                break
            
            inner = result_line[search_start+2:closing]
            
            # Only fix if inner contains ["'] pattern  
            if "['" in inner or '["' in inner or '[' in inner and "'" in inner:
                result_line = result_line[:search_start] + "r'''" + inner + "'''" + result_line[closing+1:]
                offset = search_start + 5 + len(inner) + 3  # after r'''+content+'''
            else:
                offset = closing + 1
        
        fixed_lines.append(result_line)
    else:
        fixed_lines.append(line)

result = '\n'.join(fixed_lines)

# Verify
import ast
try:
    ast.parse(result)
    print("SUCCESS! All syntax errors fixed.")
    with open(filepath, 'w') as f:
        f.write(result)
except SyntaxError as e:
    print(f"Still error at line {e.lineno}: {e.msg}")
    err_lines = result.split('\n')
    for j in range(max(0, e.lineno-3), min(len(err_lines), e.lineno+2)):
        marker = ">>>" if j+1 == e.lineno else "   "
        print(f"{marker} {j+1}: {err_lines[j]}")
