"""Find unmatched [ in the current weaponized_report.py"""
import ast

content = open('/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py').read()

# Since we can't parse, count brackets outside of strings manually
# Simple approach: just count all [ and ] in the file
total_open = content.count('[')
total_close = content.count(']')
print(f"Total [ = {total_open}, total ] = {total_close}, diff = {total_open - total_close}")

# The error is at line 1599. Let's check if any earlier r''' pattern is broken
# Look for r''' followed by content that contains '''
lines = content.split('\n')
for i, line in enumerate(lines):
    if "r'''" in line:
        count_start = line.count("r'''")
        # Count ''' occurrences
        count_triple = line.count("'''")
        if count_triple > count_start * 2:
            print(f"Line {i+1}: Possible mismatch - {count_start} r''' but {count_triple} total '''")
            print(f"  {line.rstrip()[:120]}")
