#!/usr/bin/env python3
"""Fix rate-limit IP spoofing vulnerability across all API routes."""
import re, os, glob

API_DIR = '/home/z/my-project/src/app/api'

fixed = 0
skipped = 0
errors = 0

for filepath in sorted(glob.glob(os.path.join(API_DIR, '**', 'route.ts'), recursive=True)):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        
        # Skip if already uses extractClientIP
        if 'extractClientIP' in content:
            skipped += 1
            continue
        
        # Skip if no vulnerable pattern
        if "x-forwarded-for" not in content:
            skipped += 1
            continue
        
        # Determine request variable name
        req_var = 'request'
        if re.search(r'checkRateLimit\(\s*req\.', content):
            req_var = 'req'
        elif re.search(r'checkRateLimit\(\s*_req\.', content):
            req_var = '_req'
        
        # Add import for extractClientIP
        # Check if api-protection is already imported
        if "from '@/lib/api-protection'" in content:
            # Add extractClientIP to existing import
            content = re.sub(
                r"import\s*\{\s*([^}]+)\s*\}\s*from\s*'@/lib/api-protection'",
                lambda m: f"import {{ {m.group(1).rstrip()}, extractClientIP }} from '@/lib/api-protection'",
                content
            )
        else:
            # Add new import at top
            content = "import { extractClientIP } from '@/lib/api-protection';\n" + content
        
        # Replace vulnerable pattern
        # Pattern: checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000)
        pattern = rf"checkRateLimit\(\s*{req_var}\.headers\.get\(['\"]x-forwarded-for['\"]\)\s*\|\|\s*['\"]unknown['\"]"
        replacement = f"checkRateLimit(extractClientIP({req_var})"
        content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            rel_path = os.path.relpath(filepath, '/home/z/my-project')
            print(f"FIXED: {rel_path}")
            fixed += 1
        else:
            print(f"NO CHANGE: {os.path.relpath(filepath, '/home/z/my-project')}")
            skipped += 1
            
    except Exception as e:
        print(f"ERROR: {filepath}: {e}")
        errors += 1

print(f"\n=== RESULTS: {fixed} fixed, {skipped} skipped, {errors} errors ===")
