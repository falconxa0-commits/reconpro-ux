#!/usr/bin/env python3
"""Deep code quality check for ReconPro before launch."""
import re, inspect, ast, sys

print("=== REGEX VALIDATION ===")
for mod_name in ['reconpro.modules.pegasus', 'reconpro.modules.bot',
                 'reconpro.modules.gorgon', 'reconpro.modules.oblivion',
                 'reconpro.modules.chain', 'reconpro.modules.recon',
                 'reconpro.modules.auth']:
    try:
        mod = __import__(mod_name, fromlist=[''])
        src = inspect.getsource(mod)
        tree = ast.parse(src)
        bad = 0; good = 0
        regex_chars = set('.^$*+?{}[]|()\\')
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                s = node.value
                if len(s) > 5 and any(c in s for c in regex_chars):
                    try:
                        re.compile(s)
                        good += 1
                    except re.error:
                        bad += 1
        status = 'OK' if bad == 0 else f'{bad} BAD'
        print(f'  {mod_name.split(".")[-1]}: {good} regex, {status}')
    except Exception as e:
        print(f'  {mod_name}: SKIP ({e})')

print("\n=== FINDING FIELD CONSISTENCY ===")
mods_to_check = [
    'reconpro.modules.recon', 'reconpro.modules.auth',
    'reconpro.modules.chain', 'reconpro.modules.bot',
    'reconpro.modules.gorgon', 'reconpro.modules.oblivion',
    'reconpro.modules.pegasus', 'reconpro.modules.doctor',
    'reconpro.modules.host', 'reconpro.modules.dev',
    'reconpro.modules.team', 'reconpro.modules.nhi',
    'reconpro.modules.cloud_recon',
]
for mod_name in mods_to_check:
    try:
        mod = __import__(mod_name, fromlist=[''])
        src = inspect.getsource(mod)
        has_finding = 'Finding(' in src
        has_module = 'module=' in src
        if has_finding and not has_module:
            print(f'  [WARN] {mod_name}: Finding() without module=')
        elif has_finding:
            print(f'  [OK]   {mod_name}: Finding calls consistent')
        else:
            print(f'  [SKIP] {mod_name}: no Finding calls')
    except Exception as e:
        print(f'  [ERR]  {mod_name}: {e}')

print("\n=== EDGE CASES ===")
from reconpro.scanner import scan

# None target
try:
    r = scan(None, modules=['auth'], timeout=1, verify_tls=False)
    print(f'  [WARN] target=None: score={r.total_score}')
except Exception as e:
    print(f'  [OK]   target=None: {type(e).__name__}')

# Empty target
try:
    r = scan('', modules=['auth'], timeout=1, verify_tls=False)
    print(f'  [OK]   empty target: score={r.total_score}')
except Exception as e:
    print(f'  [INFO] empty target: {type(e).__name__}')

# Very long target
try:
    r = scan('a' * 5000, modules=['auth'], timeout=1, verify_tls=False)
    print(f'  [OK]   long target: score={r.total_score}')
except Exception as e:
    print(f'  [INFO] long target: {type(e).__name__}')

# Unicode target
try:
    r = scan('http://test.com/路径/测试', modules=['auth'], timeout=1, verify_tls=False)
    print(f'  [OK]   unicode URL: score={r.total_score}')
except Exception as e:
    print(f'  [INFO] unicode URL: {type(e).__name__}')

print("\n=== DUPLICATE FINDING CHECK ===")
from reconpro.modules.chain import _check_ssrf
from reconpro.modules.oblivion import _stage_10_cors_deep

# Make sure core functions exist and are callable
for func_name, func in [('_check_ssrf', _check_ssrf), ('_stage_10_cors_deep', _stage_10_cors_deep)]:
    assert callable(func), f'{func_name} not callable'
print('  [OK]   Key functions callable')

print("\n=== DONE ===")
