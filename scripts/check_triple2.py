"""Find the unmatched bracket by scanning for r''' that might not close properly"""
filepath = '/home/z/my-project/reconpro-work/reconpro/modules/weaponized_report.py'

content = open(filepath, 'r').read()
lines = content.split('\n')

# The v7 fix might have changed some r" to r''' but the inner content 
# might contain ' which breaks r'''

# Let's check every r''' pattern
for i, line in enumerate(lines):
    if "r'''" in line:
        # Find opening r'''
        pos = 0
        while True:
            pos = line.find("r'''", pos)
            if pos < 0:
                break
            
            # Find closing '''
            j = pos + 4
            closing = -1
            while j < len(line) - 2:
                if line[j:j+3] == "'''":
                    closing = j
                    break
                j += 1
            
            if closing < 0:
                print(f"Line {i+1}: UNCLOSED r'''!")
                print(f"  {line.rstrip()[:150]}")
                break
            
            inner = line[pos+4:closing]
            # Check if inner has ' which might be problematic
            # In r''', a single ' is fine, but '' would be problematic
            if "''" in inner and "'''" not in inner:
                print(f"Line {i+1}: Inner has '' which could break r'''")
                print(f"  {line.rstrip()[:150]}")
            
            pos = closing + 3
