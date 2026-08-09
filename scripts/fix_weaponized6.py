"""Fix weaponized_report.py v6 - use sed-like byte-level replacement."""
import re

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

with open(filepath, 'rb') as f:
    content = f.read()

# The problematic pattern in bytes:
# r"....["']....["']"   where the [" and '] and ['] cause issues
# We need to find r" where somewhere inside there's [" or ]' patterns

text = content.decode('utf-8', errors='surrogateescape')

# Strategy: replace ALL occurrences of the specific problematic patterns
# Pattern 1: r"....[\x22']....[\x22']"  ->  r'''....[\x22']....[\x22']'''
# But we can't regex this because Python can't match the [" pattern in r"

# Let's use a different approach: find the specific known patterns by their surrounding context
# and replace the r" with r'''

# Known patterns (from manual inspection):
replacements = [
    # re.search(r"src\s*=\s*["\']([^"\']+)["\']", 
    (b're.search(r"src\\s*=\\s*["\\x27]([^"\\x27]+)["\\x27]"', 
     b"re.search(r'''src\\\\s*=\\\\s*[\"']([^\"']+)[\"']'''"),
    # More patterns will be added as we find them
]

for old, new in replacements:
    count = text.encode('utf-8').count(old)
    if count > 0:
        content = content.replace(old, new)
        print(f"Replaced {count} occurrences of pattern")

# Actually let me try a different approach - find "r\"" followed eventually by "[\"" or "[\'"
# and replace the whole r"..." with r'''...'''

# Find all r" (not r""") positions
positions = []
i = 0
while True:
    pos = text.find('r"', i)
    if pos < 0:
        break
    if pos + 2 < len(text) and text[pos+2] != '"':
        positions.append(pos)
    i = pos + 2

print(f"Found {len(positions)} r\" positions")

# For each, check if the content (up to some reasonable distance) contains ["
problem_positions = []
for pos in positions:
    # Look ahead up to 200 chars
    ahead = text[pos:pos+200]
    # Find [ followed by " within the next 200 chars
    for k in range(len(ahead)):
        if ahead[k] == '[' and k+1 < len(ahead) and ahead[k+1] == '"':
            problem_positions.append(pos)
            break
        if ahead[k] == '[' and k+1 < len(ahead) and ahead[k+1] == '\\' and k+2 < len(ahead) and ahead[k+2] == "'":
            problem_positions.append(pos)
            break

print(f"Found {len(problem_positions)} problematic r\" positions")

# Now fix each one
# We need to find the REAL closing " for each r"
# Since Python breaks at the [" inside, we need to count differently
# The real closing " is the one that makes the regex valid
# In practice, the pattern is: r"X["']Y["']Z" where there are paired ["'] sequences

# Let's try yet another approach: just replace the line entirely using line numbers from the error
lines = text.split('\n')

# Lines known to have issues (from error messages):
# 1208, 1727, 1953, 1982, 2010, 2215, 2221 (0-indexed: 1207, 1726, 1952, 1981, 2009, 2214, 2220)

fixes = {
    1207: '        src_match = re.search(r\'\'\'src\\s*=\\s*["\']([^"\']+)["\']\'\'\', img_attrs, re.IGNORECASE)',
    1726: None,  # will read current content
    1952: None,
    1981: None,
    2009: None,
    2214: None,
    2220: None,
}

# Read the actual current lines to see what they are
for ln in [1726, 1952, 1981, 2009, 2214, 2220]:
    if ln < len(lines):
        print(f"Line {ln+1}: {lines[ln].rstrip()[:100]}")
