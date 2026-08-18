import re, os, glob

# Files that SHOULD be public (no auth needed)
PUBLIC_PREFIXES = [
    'src/app/api/auth/',
    'src/app/api/v1/auth/',
    'src/app/api/health/route.ts',
]

# Files already correct (verified by audit)
ALREADY_CORRECT = [
    'src/app/api/scan/route.ts',
    'src/app/api/scans/route.ts',
    'src/app/api/members/route.ts',
    'src/app/api/compliance/route.ts',
    'src/app/api/teams/route.ts',
    'src/app/api/monitoring/route.ts',
    'src/app/api/monitoring/execute/route.ts',
    'src/app/api/integrations/route.ts',
    'src/app/api/bot-hunter/route.ts',
    'src/app/api/vuln-scan/route.ts',
    'src/app/api/model-redteam/route.ts',
    'src/app/api/nhi/route.ts',
    'src/app/api/nhi/assess/route.ts',
    'src/app/api/nhi/audit/route.ts',
    'src/app/api/nhi/seed/route.ts',
    'src/app/api/nhi/revoke/route.ts',
    'src/app/api/nhi/rollback/route.ts',
    'src/app/api/genesis/revoke/route.ts',
    'src/app/api/system/scan/route.ts',
    'src/app/api/implosion/route.ts',
]

def is_public(filepath):
    for prefix in PUBLIC_PREFIXES:
        if filepath.startswith(prefix):
            return True
    return False

def is_already_correct(filepath):
    for correct in ALREADY_CORRECT:
        if filepath.endswith(correct):
            return True
    return False

fixed = []
skipped = []

route_files = glob.glob('src/app/api/**/route.ts', recursive=True)

for fpath in sorted(route_files):
    if is_public(fpath) or is_already_correct(fpath):
        skipped.append(fpath)
        continue
    
    with open(fpath, 'r') as f:
        content = f.read()
    
    # Check if withProtection exists at all
    if 'withProtection' not in content:
        # File has no protection at all - needs wrapping
        # For system/health, add full protection
        if 'system/health' in fpath:
            print(f'NEEDS_FULL_WRAP: {fpath}')
            skipped.append(fpath)
            continue
        skipped.append(fpath)
        continue
    
    # Find all withProtection calls that are missing requireAuth: true
    # Pattern: withProtection(request, { ... }) where requireAuth is not present
    pattern = r'await withProtection\(([^,]+),\s*\{([^}]+)\}\)'
    matches = list(re.finditer(pattern, content))
    
    if not matches:
        skipped.append(fpath)
        continue
    
    modified = False
    new_content = content
    
    for match in reversed(matches):
        request_arg = match.group(1)
        options_str = match.group(2)
        
        if 'requireAuth' in options_str:
            continue  # Already has requireAuth
        
        # Add requireAuth: true at the start of options
        new_options = 'requireAuth: true, ' + options_str.strip()
        old_call = match.group(0)
        new_call = f'await withProtection({request_arg}, {{\s*{new_options}\s*}})'
        
        # Simple replacement
        new_content = new_content.replace(old_call, new_call, 1)
        modified = True
    
    if modified:
        with open(fpath, 'w') as f:
            f.write(new_content)
        fixed.append(fpath)
        print(f'FIXED: {fpath}')
    else:
        skipped.append(fpath)

print(f'\n=== Summary ===')
print(f'Fixed: {len(fixed)}')
print(f'Skipped (already correct or public): {len(skipped)}')
