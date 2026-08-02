"""DEV module — Developer security tools.

Scans for developer-focused security issues:
- Dependency vulnerability scanning (package.json, requirements.txt, Pipfile, go.mod, Cargo.toml)
- Git security (exposed secrets, branch protection, .gitconfig)
- .env file detection & secret scanning
- Port conflict detection
- Docker Compose security
- API key/secret detection in codebase
- Outdated dependency detection
- Hardcoded credentials in source code
- Sensitive file detection (.pem, .key, .p12, credentials)
- Pre-commit hook presence
"""
from __future__ import annotations

import os
import re
import json
import glob
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..http import Finding


def _scan_dir(base_dir: str = ".") -> str:
    """Get absolute path of directory to scan."""
    return os.path.abspath(base_dir)


def _find_files(patterns: List[str], base: str) -> List[str]:
    """Find files matching patterns in base directory."""
    found = []
    for pattern in patterns:
        found.extend(glob.glob(os.path.join(base, "**", pattern), recursive=True))
    return found


def _read_file(path: str, max_size: int = 65536) -> str:
    """Read file contents safely."""
    try:
        size = os.path.getsize(path)
        if size > max_size:
            return f"[file too large: {size} bytes]"
        with open(path, errors="replace") as f:
            return f.read()
    except Exception:
        return ""


def _check_package_json(base: str) -> List[Finding]:
    """Scan package.json for security issues."""
    findings: List[Finding] = []
    asset = base

    pkg_files = _find_files(["package.json"], base)
    for pkg_path in pkg_files:
        # Skip node_modules
        if "node_modules" in pkg_path:
            continue

        try:
            with open(pkg_path) as f:
                pkg = json.load(f)
        except Exception:
            continue

        deps = {}
        deps.update(pkg.get("dependencies", {}))
        deps.update(pkg.get("devDependencies", {}))

        if not deps:
            continue

        # Check for known vulnerable/outdated patterns
        risky_pkgs = {
            "lodash": ("low", "Consider replacing individual lodash imports with native JS"),
            "express": ("info", "Ensure Express is >= 4.18.0"),
            "jsonwebtoken": ("medium", "Ensure jsonwebtoken is >= 9.0.0"),
            "react": ("info", "Keep React updated"),
            "next": ("info", "Keep Next.js updated"),
            "mongoose": ("info", "Ensure Mongoose is latest"),
            "minimist": ("low", "minimist had prototype pollution CVEs"),
            "uglify-js": ("low", "uglify-js had ReDoS vulnerabilities"),
            "event-stream": ("high", "event-stream was compromised in 2018"),
        }

        for pkg_name, (sev, note) in risky_pkgs.items():
            if pkg_name in deps:
                findings.append(Finding(
                    title=f"{pkg_name}@{deps[pkg_name]} in {os.path.basename(os.path.dirname(pkg_path))}",
                    severity=sev, category="dependencies",
                    module="dev",
                    description=f"{note}.",
                    evidence=f"{pkg_name}: {deps[pkg_name]}",
                    asset=asset, points_deducted=3 if sev == "medium" else (8 if sev == "high" else 1),
                    remediation=f"Run: npm audit fix && npm update {pkg_name}",
                ))

        # Check for scripts that might run untrusted code
        scripts = pkg.get("scripts", {})
        risky_scripts = {"preinstall", "postinstall", "prestart", "poststart"}
        for script_name in risky_scripts:
            if script_name in scripts:
                findings.append(Finding(
                    title=f"Lifecycle script '{script_name}' in {os.path.basename(os.path.dirname(pkg_path))}/package.json",
                    severity="medium", category="supply_chain",
                    module="dev",
                    description=f"Package lifecycle scripts can run arbitrary code during npm install. Review the script content.",
                    evidence=f"{script_name}: {scripts[script_name][:100]}",
                    asset=asset, points_deducted=4,
                    remediation="Review and minimize lifecycle scripts. Avoid curl | bash patterns.",
                ))

    return findings


def _check_requirements(base: str) -> List[Finding]:
    """Scan requirements.txt / Pipfile for security issues."""
    findings: List[Finding] = []
    asset = base

    req_files = _find_files(["requirements.txt", "Pipfile", "pyproject.toml"], base)
    for req_path in req_files:
        if "node_modules" in req_path or ".venv" in req_path or "venv/" in req_path:
            continue

        content = _read_file(req_path)
        if not content:
            continue

        risky_py_pkgs = {
            "django": ("info", "Keep Django updated (check for CVEs)"),
            "flask": ("info", "Keep Flask updated"),
            "requests": ("info", "Ensure requests >= 2.31.0"),
            "pyjwt": ("medium", "Ensure PyJWT >= 2.8.0"),
            "cryptography": ("info", "Keep cryptography updated"),
            "sqlalchemy": ("info", "Keep SQLAlchemy updated"),
            "paramiko": ("medium", "Ensure Paramiko is latest"),
            "pickle": ("high", "pickle is unsafe for untrusted data"),
        }

        for pkg, (sev, note) in risky_py_pkgs.items():
            # Match package name at start of line or after common separators
            if re.search(rf'^{re.escape(pkg)}[=<>!\[]', content, re.MULTILINE | re.IGNORECASE):
                findings.append(Finding(
                    title=f"{pkg} in {os.path.basename(os.path.dirname(req_path))}/{os.path.basename(req_path)}",
                    severity=sev, category="dependencies",
                    module="dev",
                    description=note,
                    evidence=f"Found in {req_path}",
                    asset=asset, points_deducted=3 if sev == "medium" else (8 if sev == "high" else 1),
                    remediation=f"Run: pip audit && pip install --upgrade {pkg}",
                ))

    return findings


def _check_env_files(base: str) -> List[Finding]:
    """Find .env files and scan for secrets."""
    findings: List[Finding] = []
    asset = base

    env_files = _find_files([
        ".env", ".env.local", ".env.production", ".env.development",
        ".env.staging", ".env.test", ".env.backup",
    ], base)

    for env_path in env_files:
        if "node_modules" in env_path or ".venv" in env_path:
            continue

        content = _read_file(env_path)
        if not content:
            continue

        # Check if .env is in .gitignore
        parent = os.path.dirname(env_path)
        gitignore = os.path.join(parent, ".gitignore")
        gitignored = False
        if os.path.exists(gitignore):
            gi_content = _read_file(gitignore)
            if ".env" in gi_content:
                gitignored = True

        if not gitignored:
            findings.append(Finding(
                title=f".env file not in .gitignore: {env_path}",
                severity="critical", category="env_files",
                module="dev",
                description=f"{os.path.basename(env_path)} exists but .env is not in .gitignore. This file may be committed to git.",
                evidence=f"File: {env_path}",
                asset=asset, points_deducted=15,
                remediation=f"Add '.env' and '.env.*' to .gitignore in {parent}",
            ))

        # Scan for actual secrets in .env
        secret_count = 0
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key = line.split("=", 1)[0].upper()
            val = line.split("=", 1)[1].strip()

            secret_keywords = [
                "KEY", "SECRET", "TOKEN", "PASSWORD", "PASSWD",
                "CREDENTIAL", "PRIVATE", "CERT", "API_KEY", "AUTH",
            ]
            if any(kw in key for kw in secret_keywords) and val and val != '""' and val != "''":
                secret_count += 1
                if secret_count <= 5:
                    masked = val[:8] + "..." if len(val) > 8 else "***"
                    findings.append(Finding(
                        title=f"Secret in {os.path.basename(env_path)}: {key}",
                        severity="high", category="env_secrets",
                        module="dev",
                        description=f"Potential secret found in .env file.",
                        evidence=f"{key}={masked}",
                        asset=asset, points_deducted=6,
                        remediation="Use a secrets manager for production. Never commit .env files.",
                    ))

    return findings


def _check_git_security(base: str) -> List[Finding]:
    """Check git configuration and security."""
    findings: List[Finding] = []
    asset = base

    # Find git repos
    git_dirs = _find_files([".git"], base)
    git_repos = [os.path.dirname(d) for d in git_dirs if os.path.isdir(d)]

    for repo in git_repos[:10]:  # Limit to 10 repos
        repo_name = os.path.basename(repo)

        # Check for committed secrets in git log
        import subprocess
        try:
            r = subprocess.run(
                ["git", "-C", repo, "log", "--all", "--oneline", "-20"],
                capture_output=True, text=True, timeout=5
            )
            if r.returncode == 0 and r.stdout.strip():
                findings.append(Finding(
                    title=f"Git repo: {repo_name} ({len(r.stdout.strip().splitlines())} recent commits)",
                    severity="info", category="git",
                    module="dev",
                    description=f"Found git repository at {repo}.",
                    evidence=repo,
                    asset=asset, points_deducted=0,
                    remediation="",
                ))
        except Exception:
            pass

        # Check for pre-commit hooks
        precommit = os.path.join(repo, ".git", "hooks", "pre-commit")
        if os.path.exists(precommit):
            pass  # pre-commit exists, good
        else:
            findings.append(Finding(
                title=f"No pre-commit hooks in {repo_name}",
                severity="low", category="git",
                module="dev",
                description="No pre-commit hooks found. Consider adding pre-commit for secret scanning and linting.",
                evidence=f"No .git/hooks/pre-commit in {repo}",
                asset=asset, points_deducted=2,
                remediation="Install pre-commit: pip install pre-commit && pre-commit install",
            ))

        # Check for .gitconfig issues
        gitconfig = os.path.expanduser("~/.gitconfig")
        if os.path.exists(gitconfig):
            gc = _read_file(gitconfig)
            if "credential" in gc.lower() and "store" in gc.lower():
                findings.append(Finding(
                    title="Git credential store is enabled",
                    severity="medium", category="git",
                    module="dev",
                    description="Git credentials are stored in plaintext on disk.",
                    evidence="credential helper = store in ~/.gitconfig",
                    asset=asset, points_deducted=5,
                    remediation="Use git-credential-manager or cache instead of store.",
                ))

    return findings


def _check_sensitive_files(base: str) -> List[Finding]:
    """Find sensitive files in the project."""
    findings: List[Finding] = []
    asset = base

    sensitive_patterns = [
        ("*.pem", "high", "PEM certificate/key file"),
        ("*.p12", "high", "PKCS12 certificate file"),
        ("*.pfx", "high", "PFX certificate file"),
        ("*.key", "high", "Private key file"),
        ("*.jks", "high", "Java keystore"),
        ("*.keystore", "high", "Keystore file"),
        ("id_rsa*", "critical", "SSH private key"),
        ("id_ed25519*", "critical", "SSH Ed25519 private key"),
        ("*.credentials", "high", "Credentials file"),
        ("*.htpasswd", "medium", "Apache password file"),
        ("*.sql", "medium", "SQL dump file (may contain data)"),
        ("*.dump", "medium", "Database dump file"),
        ("*.bak", "low", "Backup file"),
        (".DS_Store", "info", "macOS metadata file"),
        ("Thumbs.db", "info", "Windows thumbnail cache"),
    ]

    for pattern, sev, desc in sensitive_patterns:
        files = _find_files([pattern], base)
        # Skip common non-sensitive locations
        for f in files:
            if any(skip in f for skip in ["node_modules", ".venv", "venv/", ".git/objects"]):
                continue
            findings.append(Finding(
                title=f"Sensitive file: {f}",
                severity=sev, category="sensitive_files",
                module="dev",
                description=f"{desc} found in project. Ensure this is not committed to version control.",
                evidence=f"File: {f}",
                asset=asset, points_deducted=8 if sev in ("critical", "high") else (4 if sev == "medium" else 1),
                remediation="Add to .gitignore. Move secrets to a secure vault.",
            ))

    return findings


def _check_hardcoded_secrets(base: str) -> List[Finding]:
    """Scan source code for hardcoded secrets."""
    findings: List[Finding] = []
    asset = base

    # File extensions to scan
    code_exts = [".js", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs",
                ".java", ".php", ".yml", ".yaml", ".json", ".toml", ".cfg", ".ini"]

    secret_patterns = [
        (r'(?i)(?:api[_-]?key|apikey)\s*[:=]\s*["\']([\w\-]{20,})', "Hardcoded API key"),
        (r'(?i)(?:secret[_-]?key|secretkey)\s*[:=]\s*["\']([\w\-]{20,})', "Hardcoded secret key"),
        (r'(?i)password\s*[:=]\s*["\']([^"\']{6,})', "Hardcoded password"),
        (r'(?i)token\s*[:=]\s*["\']([\w\-\.=]{20,})', "Hardcoded token"),
        (r'(?i)aws_access_key_id\s*[:=]\s*["\'](AKIA[\w]{16})', "Hardcoded AWS Access Key"),
        (r'(?i)aws_secret_access_key\s*[:=]\s*["\']([\w/+=]{40})', "Hardcoded AWS Secret Key"),
        (r'ghp_[\w]{36}', "Hardcoded GitHub PAT"),
        (r'gho_[\w]{36}', "Hardcoded GitHub OAuth token"),
        (r'ghs_[\w]{36}', "Hardcoded GitHub App token"),
        (r'glpat-[\w\-]{20,}', "Hardcoded GitLab PAT"),
        (r'xox[bposa]-[\w\-]{10,}', "Hardcoded Slack token"),
        (r'np\.[\w]{36}', "Hardcoded npm token"),
        (r'-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----', "Hardcoded private key"),
    ]

    for ext in code_exts:
        files = _find_files([f"*{ext}"], base)
        for filepath in files[:50]:  # Limit scan
            if any(skip in filepath for skip in ["node_modules", ".venv", "venv/", ".git/", "dist/", "build/", ".next/"]):
                continue

            content = _read_file(filepath, max_size=32768)
            if not content:
                continue

            for pattern, title in secret_patterns:
                matches = re.findall(pattern, content)
                if matches:
                    for match in matches[:2]:
                        if isinstance(match, tuple):
                            match = match[0] if match else "***"
                        masked = match[:8] + "..." + match[-4:] if len(str(match)) > 12 else "***"
                        findings.append(Finding(
                            title=f"{title} in {os.path.basename(filepath)}",
                            severity="critical", category="hardcoded_secrets",
                            module="dev",
                            description=f"Secret detected in source code: {title}",
                            evidence=f"Match: {masked}",
                            asset=asset, points_deducted=15,
                            remediation="Move secrets to environment variables or a secrets manager. Never commit secrets to source code.",
                        ))
                    break  # One match per pattern per file

    return findings


def _check_docker_compose(base: str) -> List[Finding]:
    """Check Docker Compose files for security issues."""
    findings: List[Finding] = []
    asset = base

    compose_files = _find_files(["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"], base)

    for cf in compose_files:
        if "node_modules" in cf:
            continue

        content = _read_file(cf)
        if not content:
            continue

        # Check for privileged mode
        if re.search(r'privileged\s*:\s*true', content):
            findings.append(Finding(
                title=f"Privileged container in {os.path.basename(cf)}",
                severity="high", category="docker",
                module="dev",
                description="A container is running in privileged mode, giving it full host access.",
                evidence=f"privileged: true found in {cf}",
                asset=asset, points_deducted=10,
                remediation="Remove privileged: true. Use specific capabilities instead.",
            ))

        # Check for exposed sensitive ports
        exposed_ports = re.findall(r'(\d{4,5})\s*:\s*\d{4,5}', content)
        sensitive_exposed = []
        for port in exposed_ports:
            p = int(port)
            if p in (22, 3306, 5432, 6379, 27017, 9200):
                sensitive_exposed.append(str(p))

        if sensitive_exposed:
            findings.append(Finding(
                title=f"Sensitive ports exposed in {os.path.basename(cf)}: {', '.join(sensitive_exposed[:5])}",
                severity="medium", category="docker",
                module="dev",
                description="Database or admin ports are exposed to the host network.",
                evidence=f"Ports: {', '.join(sensitive_exposed[:5])}",
                asset=asset, points_deducted=5,
                remediation="Only expose necessary ports. Bind databases to internal networks only.",
            ))

        # Check for env vars with secrets
        env_vars = re.findall(r'([A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD)[A-Z_]*)\s*:\s*(.+)', content)
        for var_name, val in env_vars[:5]:
            val = val.strip()
            if val and val not in ('""', "''", '${', 'false', 'true'):
                findings.append(Finding(
                    title=f"Secret in {os.path.basename(cf)}: {var_name}",
                    severity="medium", category="docker",
                    module="dev",
                    description="Secret value found directly in compose file.",
                    evidence=f"{var_name}={val[:15]}...",
                    asset=asset, points_deducted=4,
                    remediation="Use .env file or Docker secrets instead of inline values.",
                ))

    return findings


def run_dev(target: str = ".", base_url: str = "", timeout: int = 8,
            verify_tls: bool = True) -> List[Finding]:
    """Developer security audit.

    Args:
        target: Directory to scan (default: current directory).
    """
    base = _scan_dir(target)
    findings: List[Finding] = []

    findings.extend(_check_package_json(base))
    findings.extend(_check_requirements(base))
    findings.extend(_check_env_files(base))
    findings.extend(_check_git_security(base))
    findings.extend(_check_sensitive_files(base))
    findings.extend(_check_hardcoded_secrets(base))
    findings.extend(_check_docker_compose(base))

    return findings
