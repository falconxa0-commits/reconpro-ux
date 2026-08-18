#!/usr/bin/env python3
import importlib, sys, subprocess
def check(name, ok, detail=""):
    s = "\033[32mPASS\033[0m" if ok else "\033[31mFAIL\033[0m"
    print(f"  [{s}] {name}: {detail}")
print("Installation Verification\n")
try:
    import reconpro; check("Import", True, f"v{reconpro.__version__}")
except ImportError as e: check("Import", False, str(e)); sys.exit(1)
for m in ["engine", "scanner", "cli", "security", "reports"]:
    try: importlib.import_module(f"reconpro.{m}"); check(f"Module:{m}", True)
    except ImportError: check(f"Module:{m}", False)
