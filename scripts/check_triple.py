"""Find where extra bracket appears"""
filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

content = open(filepath, 'r').read()
lines = content.split('\n')

# Simpler approach: count all [ and ] in non-string contexts
# But since we can't parse (syntax error), just look for patterns that
# might have been broken by our fixes

# Look for r''' patterns where the closing ''' might have been placed wrong
# Check for patterns like r'''....''' where inner contains '''
# which would prematurely close the string

for i, line in enumerate(lines):
    # Count r''' occurrences
    count = line.count("r'''")
    if count > 1:
        print(f"Line {i+1}: Multiple r''' on same line!")
        print(f"  {line.rstrip()[:150]}")
    
    # Check for r'''...''' where inner has unmatched '''
    if "r'''" in line:
        # Find r''' and closing '''
        pos = line.find("r'''")
        if pos >= 0:
            rest = line[pos+4:]
            # Find first '''
            close = rest.find("'''")
            if close >= 0:
                inner = rest[:close]
                if "'''" in inner:
                    print(f"Line {i+1}: Inner content has ''' which breaks!")
                    print(f"  {line.rstrip()[:150]}")
