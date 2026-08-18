import re, os, glob

# List of files that need requireAuth: true added
NEEDS_FIX = [
    'src/app/api/route.ts',
    'src/app/api/dashboard/route.ts',
    'src/app/api/executive/route.ts',
    'src/app/api/audit/route.ts',
    'src/app/api/reports/route.ts',
    'src/app/api/threats/route.ts',
    'src/app/api/exposed-assets/route.ts',
    'src/app/api/wall-of-shame/route.ts',
    'src/app/api/cni-sentinel/route.ts',
    'src/app/api/cognitive-dread/route.ts',
    'src/app/api/doom-clock/route.ts',
    'src/app/api/oblivion/route.ts',
    'src/app/api/pqc-vault/route.ts',
    'src/app/api/sandbox/route.ts',
    'src/app/api/ai-advisor/route.ts',
    'src/app/api/ai-leaderboard/route.ts',
    'src/app/api/fear-index/route.ts',
    'src/app/api/fear-index/feed/route.ts',
    'src/app/api/fear-index/history/route.ts',
    'src/app/api/scan/stream/route.ts',
    'src/app/api/scans/history/route.ts',
]

# Dynamic path files
NEEDS_FIX_GLOB = [
    'src/app/api/genesis/verify/*/route.ts',
    'src/app/api/genesis/embed/*/route.ts',
    'src/app/api/broadcast/active/route.ts',
    'src/app/api/broadcast/verify/*/route.ts',
]

all_files = list(NEEDS_FIX)
for g in NEEDS_FIX_GLOB:
    all_files.extend(glob.glob(g))

fixed = 0
for fpath in all_files:
    if not os.path.exists(fpath):
        print(f'SKIP (not found): {fpath}')
        continue
    
    with open(fpath, 'r') as f:
        content = f.read()
    
    if 'requireAuth' in content:
        print(f'SKIP (already has requireAuth): {fpath}')
        continue
    
    # Pattern: withProtection(request, { \n    rateLimit:
    # Replace with: withProtection(request, { \n    requireAuth: true,\n    rateLimit:
    pattern = r'(await withProtection\([^,]+,\s*\{)\s*\n(\s*)(rateLimit)'
    replacement = r'\1\n\2requireAuth: true,\n\2\3'
    
    new_content = re.sub(pattern, replacement, content)
    
    if new_content != content:
        with open(fpath, 'w') as f:
            f.write(new_content)
        fixed += 1
        print(f'FIXED: {fpath}')
    else:
        print(f'NO_MATCH: {fpath}')

print(f'\nTotal fixed: {fixed}')
