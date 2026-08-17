#!/usr/bin/env python3
"""ReconPro v11.0.0 — Post-Installation Verification."""
import importlib, sys, subprocess

def check(name, ok, detail=""):
    status = "\033[32mPASS\033[0m" if ok else "\033[31mFAIL\033[0m"
    print(f"  [{status}] {name}: {detail}")

print("ReconPro v11.0.0 — Installation Verification\n")

# 1. Import
try:
    import reconpro
    check("Import reconpro", True, f"v{reconpro.__version__}")
except ImportError as e:
    check("Import reconpro", False, str(e))
    sys.exit(1)

# 2. Version
check("Version", reconpro.__version__ == "11.0.0", reconpro.__version__)

# 3. CLI
try:
    r = subprocess.run(["reconpro", "--version"], capture_output=True, timeout=10)
    check("CLI --version", r.returncode == 0, r.stdout.decode().strip())
except Exception as e:
    check("CLI --version", False, str(e))

# 4. Help
try:
    r = subprocess.run(["reconpro", "--help"], capture_output=True, timeout=10)
    check("CLI --help", r.returncode == 0, f"{len(r.stdout)} bytes")
except Exception as e:
    check("CLI --help", False, str(e))

# 5. Core modules
for mod in ["engine", "scanner", "cli", "security", "reports"]:
    try:
        importlib.import_module(f"reconpro.{mod}")
        check(f"Module: {mod}", True)
    except ImportError:
        check(f"Module: {mod}", False, "not found")

# 6. Dependencies
for dep in ["rich", "textual", "requests"]:
    try:
        importlib.import_module(dep)
        check(f"Dependency: {dep}", True)
    except ImportError:
        check(f"Dependency: {dep}", False, "missing")

print("\nVerification complete.")
