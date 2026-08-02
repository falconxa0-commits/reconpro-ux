import os

content = open('/dev/stdin').read() if False else ''

# Build the content line by line
lines = []
lines.append('"""Nexus Agent — LLM-powered agentic security engine."""')
lines.append('from __future__ import annotations')
lines.append('')
lines.append('import json')
lines.append('import os')
lines.append('import re')
lines.append('import subprocess')
lines.append('from datetime import datetime')
lines.append('from pathlib import Path')
lines.append('from typing import Any, Callable, Dict, List, Optional')
lines.append('')
lines.append('from rich.console import Console')
lines.append('')
lines.append('console = Console()')
lines.append('MEMORY_DIR = Path.home() / ".reconpro" / "memory"')
lines.append('')

# Write first chunk
with open('/home/z/my-project/vibesec-cli/reconpro/nexus_agent.py', 'w') as f:
    f.write('\n'.join(lines) + '\n')

print('Part 1 written')