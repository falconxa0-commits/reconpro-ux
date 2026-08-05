#!/usr/bin/env python3
"""Audit the 'bad' regex patterns to see if they're real bugs or false positives."""
import re, inspect, ast

regex_chars = set('.^$*+?{}[]|()\\')

for mod_name in ['reconpro.modules.bot', 'reconpro.modules.gorgon',
                 'reconpro.modules.oblivion', 'reconpro.modules.chain',
                 'reconpro.modules.recon']:
    mod = __import__(mod_name, fromlist=[''])
    src = inspect.getsource(mod)
    lines = src.split('\n')
    tree = ast.parse(src)

    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            s = node.value
            if len(s) > 5 and any(c in s for c in regex_chars):
                try:
                    re.compile(s)
                except re.error as e:
                    # Find line number
                    print(f'[{mod_name.split(".")[-1]}] Bad regex: {s[:80]}...')
                    print(f'  Error: {e}')
                    # Find which line
                    for i, line in enumerate(lines, 1):
                        if s[:40] in line:
                            print(f'  Line {i}: {line.strip()[:100]}')
                            break
                    print()
