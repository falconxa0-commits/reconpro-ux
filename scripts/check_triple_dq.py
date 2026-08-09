"""Find all raw strings needing fix and check if any contain triple-double-quotes."""
import sys

filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'
content = open(filepath, 'r').read()
lines = content.split('\n')

triple_dquote_lines = []
for i, line in enumerate(lines, 1):
    if 'r"' in line and '[' in line:
        # Check for [" pattern using ord to avoid quoting issues
        for k in range(len(line) - 1):
            if line[k] == '[' and ord(line[k+1]) == 34:  # 34 is "
                # This line needs fixing
                # Check if the rough inner content has """
                if '"""' in line:
                    triple_dquote_lines.append((i, line.rstrip()[:100]))
                break

print(f"Lines needing fix that also contain triple-double-quotes: {len(triple_dquote_lines)}")
for ln, text in triple_dquote_lines:
    print(f"  Line {ln}: {text}")
