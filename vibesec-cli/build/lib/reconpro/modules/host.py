"""HOST module — Full local machine security audit.

Scans the laptop/machine for:
- Open ports & listening services
- Firewall status (ufw / iptables / firewalld)
- User accounts & sudoers
- SSH configuration hardening
- Running Docker containers & exposed ports
- Cron jobs & scheduled tasks
- Environment variables leaking secrets
- Sensitive file permissions
- OS & kernel info
- Network interfaces
- Installed services
- Bluetooth & WiFi status
- USB devices
- Auto-start / launch agents
"""
from __future__ import annotations

import os
import re
import subprocess
import stat
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..http import Finding


def _hostname() -> str:
    """Cross-platform hostname (works on Linux, macOS, Windows)."""
    try:
        return os.uname().nodename
    except AttributeError:
        return os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "localhost"))


def _run(cmd: str, timeout: int = 10) -> Tuple[int, str]:
    """Run a shell command, return (exit_code, stdout+stderr)."""
    try:
        r = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return r.returncode, (r.stdout + r.stderr).strip()
    except Exception:
        return -1, ""


def _file_exists(p: str) -> bool:
    return os.path.exists(p)


def _file_perms(p: str) -> Optional[int]:
    try:
        return stat.S_IMODE(os.stat(p).st_mode)
    except Exception:
        return None


def _check_open_ports() -> List[Finding]:
    """Find open listening ports via ss/netstat."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Try ss first (modern Linux), then netstat
    code, out = _run("ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null")
    if code != 0 or not out:
        findings.append(Finding(
            title="Could not enumerate open ports",
            severity="low", category="ports",
            module="host",
            description="Unable to run ss or netstat. Try running with sudo.",
            evidence="ss/netstat returned no output",
            asset=hostname, points_deducted=1,
            remediation="Run with sudo for full port visibility.",
        ))
        return findings

    ports = []
    for line in out.splitlines():
        # Parse ss output: 0.0.0.0:3000 or [::]:8080
        match = re.search(r':(\d+)\s', line)
        if match:
            port = int(match.group(1))
            ports.append(port)

    # Categorize risky ports
    risky_ports = {
        23: ("high", "Telnet (unencrypted)"),
        21: ("high", "FTP (unencrypted)"),
        445: ("high", "SMB/CIFS"),
        3389: ("high", "RDP"),
        5900: ("high", "VNC"),
        6379: ("high", "Redis (no auth by default)"),
        27017: ("high", "MongoDB (no auth by default)"),
        11211: ("high", "Memcached"),
        9200: ("medium", "Elasticsearch"),
        5432: ("medium", "PostgreSQL"),
        3306: ("medium", "MySQL"),
        8080: ("low", "HTTP alt"),
        8443: ("low", "HTTPS alt"),
        3000: ("low", "Node.js dev server"),
        5173: ("low", "Vite dev server"),
        8000: ("low", "Python dev server"),
    }

    for port in sorted(set(ports)):
        if port in risky_ports:
            sev, desc = risky_ports[port]
            findings.append(Finding(
                title=f"Risky open port: {port} ({desc})",
                severity=sev, category="ports",
                module="host",
                description=f"Port {port} ({desc}) is open and listening. This could expose services to network attackers.",
                evidence=f"Port {port} found in ss/netstat output",
                asset=hostname, points_deducted=8 if sev == "high" else 4,
                remediation=f"Close port {port} if not needed, or bind to 127.0.0.1 only.",
            ))

    if not findings and ports:
        findings.append(Finding(
            title=f"{len(set(ports))} open ports detected",
            severity="info", category="ports",
            module="host",
            description=f"Found {len(set(ports))} open ports. None are known high-risk.",
            evidence=", ".join(str(p) for p in sorted(set(ports))[:20]),
            asset=hostname, points_deducted=0,
            remediation="Review all open ports periodically.",
        ))

    return findings


def _check_firewall() -> List[Finding]:
    """Check firewall status."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Check ufw
    code, out = _run("ufw status 2>/dev/null")
    if code == 0:
        if "inactive" in out.lower():
            findings.append(Finding(
                title="UFW firewall is inactive",
                severity="high", category="firewall",
                module="host",
                description="UFW (Uncomplicated Firewall) is installed but not active. Your machine is exposed to network attacks.",
                evidence=out[:200],
                asset=hostname, points_deducted=10,
                remediation="Enable UFW: sudo ufw enable && sudo ufw default deny incoming",
            ))
        else:
            findings.append(Finding(
                title="UFW firewall is active",
                severity="info", category="firewall",
                module="host",
                description="UFW firewall is enabled.",
                evidence=out[:200],
                asset=hostname, points_deducted=0,
                remediation="",
            ))
        return findings

    # Check iptables
    code, out = _run("iptables -L -n 2>/dev/null")
    if code == 0 and out:
        if "ACCEPT" in out and "DROP" not in out and "REJECT" not in out:
            findings.append(Finding(
                title="iptables has no DROP/REJECT rules",
                severity="high", category="firewall",
                module="host",
                description="iptables is running but all chains have ACCEPT policy with no filtering rules.",
                evidence="No DROP or REJECT rules found",
                asset=hostname, points_deducted=10,
                remediation="Configure iptables rules or install UFW: sudo apt install ufw && sudo ufw enable",
            ))
        else:
            findings.append(Finding(
                title="iptables rules found",
                severity="info", category="firewall",
                module="host",
                description="iptables has filtering rules configured.",
                evidence=f"Rules present",
                asset=hostname, points_deducted=0,
                remediation="",
            ))
        return findings

    findings.append(Finding(
        title="No firewall detected",
        severity="high", category="firewall",
        module="host",
        description="Neither UFW nor iptables rules detected. Your machine has no network firewall.",
        evidence="ufw and iptables both unavailable",
        asset=hostname, points_deducted=10,
        remediation="Install and enable a firewall: sudo apt install ufw && sudo ufw enable",
    ))
    return findings


def _check_users() -> List[Finding]:
    """Check user accounts and sudo access."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Check sudo users
    code, out = _run("getent group sudo 2>/dev/null")
    if code == 0 and out:
        users = [u for u in out.split(":")[1].split(",") if u.strip()]
        if len(users) > 2:
            findings.append(Finding(
                title=f"{len(users)} users have sudo privileges",
                severity="medium", category="users",
                module="host",
                description=f"{len(users)} users can run sudo: {', '.join(users[:5])}. Minimize sudo access to reduce risk.",
                evidence=f"sudo group: {out[:200]}",
                asset=hostname, points_deducted=5,
                remediation="Remove unnecessary users from the sudo group. Use specific capabilities instead.",
            ))

    # Check for passwordless sudo
    code, out = _run("sudo -n true 2>&1")
    if code == 0:
        findings.append(Finding(
            title="Passwordless sudo is enabled",
            severity="high", category="users",
            module="host",
            description="Current user can run sudo without a password. Any code running as your user has root access.",
            evidence="sudo -n returned exit code 0",
            asset=hostname, points_deducted=10,
            remediation="Require password for sudo: remove NOPASSWD from /etc/sudoers",
        ))

    # Check for empty password users
    code, out = _run("sudo awk -F: '($2 == \"\") {print $1}' /etc/shadow 2>/dev/null")
    if code == 0 and out.strip():
        users = out.strip().splitlines()
        findings.append(Finding(
            title=f"{len(users)} user(s) with empty password",
            severity="critical", category="users",
            module="host",
            description=f"Users with no password: {', '.join(users[:5])}. This is a critical security risk.",
            evidence=out[:200],
            asset=hostname, points_deducted=15,
            remediation="Set passwords for all users immediately: sudo passwd <username>",
        ))

    return findings


def _check_ssh() -> List[Finding]:
    """Check SSH configuration hardening."""
    findings: List[Finding] = []
    hostname = _hostname()
    sshd_config = "/etc/ssh/sshd_config"

    if not _file_exists(sshd_config):
        return findings

    try:
        with open(sshd_config) as f:
            config = f.read()
    except Exception:
        return findings

    ssh_checks = [
        (r'^#?PermitRootLogin\s+yes', "high", "SSH root login is permitted", "Set PermitRootLogin no"),
        (r'^#?PasswordAuthentication\s+yes', "medium", "SSH password authentication enabled", "Use SSH keys only: PasswordAuthentication no"),
        (r'^#?PermitEmptyPasswords\s+yes', "critical", "SSH allows empty passwords", "Set PermitEmptyPasswords no"),
        (r'^#?X11Forwarding\s+yes', "low", "SSH X11 forwarding enabled", "Set X11Forwarding no if not needed"),
        (r'^#?MaxAuthTries\s+(\d+)', None, "", ""),  # just read value
        (r'^#?Protocol\s+1', "high", "SSH Protocol 1 in use (insecure)", "Use Protocol 2"),
        (r'^#?AllowAgentForwarding\s+yes', "low", "SSH agent forwarding enabled", "Disable if not needed: AllowAgentForwarding no"),
    ]

    for pattern, sev, title, remediation in ssh_checks:
        if re.search(pattern, config, re.MULTILINE | re.IGNORECASE):
            if sev is None:
                # MaxAuthTries check
                match = re.search(r'^#?MaxAuthTries\s+(\d+)', config, re.MULTILINE)
                if match and int(match.group(1)) > 6:
                    findings.append(Finding(
                        title=f"SSH MaxAuthTries is {match.group(1)} (too high)",
                        severity="low", category="ssh",
                        module="host",
                        description=f"MaxAuthTries={match.group(1)} allows more brute-force attempts.",
                        evidence=f"MaxAuthTries {match.group(1)}",
                        asset=hostname, points_deducted=2,
                        remediation="Set MaxAuthTries 4",
                    ))
            else:
                findings.append(Finding(
                    title=title,
                    severity=sev, category="ssh",
                    module="host",
                    description=f"SSH config issue: {title}",
                    evidence=f"Found in {sshd_config}",
                    asset=hostname, points_deducted=8 if sev == "high" else (15 if sev == "critical" else 3),
                    remediation=remediation,
                ))

    return findings


def _check_docker() -> List[Finding]:
    """Check Docker security."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Check if Docker is running
    code, out = _run("docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null")
    if code != 0 or not out:
        return findings

    containers = [l for l in out.splitlines() if l.strip()]
    if containers:
        findings.append(Finding(
            title=f"{len(containers)} Docker container(s) running",
            severity="info", category="docker",
            module="host",
            description=f"Found {len(containers)} running Docker containers.",
            evidence=out[:300],
            asset=hostname, points_deducted=0,
            remediation="",
        ))

    # Check for containers with host networking
    code, out = _run("docker ps --format '{{.Names}}' -q 2>/dev/null | xargs -I{} docker inspect {} --format '{{.Name}} {{.HostConfig.NetworkMode}}' 2>/dev/null")
    if code == 0 and out:
        for line in out.splitlines():
            if "host" in line.lower():
                findings.append(Finding(
                    title=f"Docker container using host networking: {line.split()[0]}",
                    severity="high", category="docker",
                    module="host",
                    description="Container with host network mode shares the host's network stack, bypassing network isolation.",
                    evidence=line[:200],
                    asset=hostname, points_deducted=8,
                    remediation="Use bridge networking instead of host mode.",
                ))

    # Check for privileged containers
    code, out = _run("docker ps -q 2>/dev/null | xargs -I{} docker inspect {} --format '{{.Name}} {{.HostConfig.Privileged}}' 2>/dev/null")
    if code == 0 and out:
        for line in out.splitlines():
            if "true" in line.lower():
                findings.append(Finding(
                    title=f"Privileged Docker container: {line.split()[0]}",
                    severity="critical", category="docker",
                    module="host",
                    description="Privileged containers have full access to the host system. This is extremely dangerous.",
                    evidence=line[:200],
                    asset=hostname, points_deducted=15,
                    remediation="Remove --privileged flag. Use specific capabilities instead.",
                ))

    return findings


def _check_env_secrets() -> List[Finding]:
    """Scan environment variables for leaked secrets."""
    findings: List[Finding] = []
    hostname = _hostname()

    secret_patterns = [
        (r'(?i)api[_-]?key', "API key in environment"),
        (r'(?i)secret[_-]?key', "Secret key in environment"),
        (r'(?i)aws[_-]?(access|secret)', "AWS credential in environment"),
        (r'(?i)github[_-]?token', "GitHub token in environment"),
        (r'(?i)stripe[_-]?secret', "Stripe secret in environment"),
        (r'(?i)jwt[_-]?secret', "JWT secret in environment"),
        (r'(?i)database[_-]?url', "Database URL in environment"),
        (r'(?i)mongodb[_-]?uri', "MongoDB URI in environment"),
        (r'(?i)redis[_-]?url', "Redis URL in environment"),
        (r'(?i)sendgrid[_-]?api', "SendGrid API key in environment"),
        (r'(?i)twilio[_-]?auth', "Twilio auth token in environment"),
        (r'(?i)private[_-]?key', "Private key reference in environment"),
    ]

    for pattern, title in secret_patterns:
        matches = [k for k in os.environ if re.search(pattern, k)]
        if matches:
            for key in matches[:3]:
                val = os.environ.get(key, "")
                masked = val[:6] + "..." if len(val) > 6 else "(set)"
                findings.append(Finding(
                    title=f"{title}: {key}",
                    severity="high", category="env_secrets",
                    module="host",
                    description=f"Environment variable {key} may contain a secret. Val: {masked}",
                    evidence=f"{key}={masked}",
                    asset=hostname, points_deducted=8,
                    remediation=f"Move {key} to a secrets manager (AWS Secrets Manager, Vault, .env file with restricted permissions).",
                ))

    return findings


def _check_file_permissions() -> List[Finding]:
    """Check sensitive file permissions."""
    findings: List[Finding] = []
    hostname = _hostname()

    sensitive_files = [
        ("/etc/shadow", 0o640, "critical", "Password hash file"),
        ("/etc/passwd", 0o644, "medium", "User account file"),
        ("/etc/sudoers", 0o440, "high", "Sudoers file"),
        ("/etc/ssh/sshd_config", 0o600, "medium", "SSH server config"),
        ("~/.ssh/id_rsa", 0o600, "critical", "SSH private key"),
        ("~/.ssh/id_ed25519", 0o600, "critical", "Ed25519 private key"),
        ("~/.ssh/authorized_keys", 0o600, "high", "SSH authorized keys"),
        ("~/.ssh/config", 0o600, "medium", "SSH client config"),
        ("~/.gnupg", 0o700, "high", "GPG directory"),
        ("~/.aws/credentials", 0o600, "critical", "AWS credentials file"),
        ("~/.netrc", 0o600, "high", "netrc credentials file"),
        ("~/.pgpass", 0o600, "high", "PostgreSQL password file"),
    ]

    for path, expected, sev, desc in sensitive_files:
        full_path = os.path.expanduser(path)
        if not _file_exists(full_path):
            continue
        perms = _file_perms(full_path)
        if perms is None:
            continue

        # Check if file is world-readable or world-writable
        if perms & stat.S_IROTH:
            findings.append(Finding(
                title=f"World-readable: {desc} ({path})",
                severity=sev, category="file_permissions",
                module="host",
                description=f"{desc} at {path} has permissions {oct(perms)} and is world-readable.",
                evidence=f"Permissions: {oct(perms)}",
                asset=hostname, points_deducted=10 if sev in ("critical", "high") else 5,
                remediation=f"Restrict permissions: chmod {oct(expected)} {path}",
            ))
        elif perms & stat.S_IWOTH:
            findings.append(Finding(
                title=f"World-writable: {desc} ({path})",
                severity=sev, category="file_permissions",
                module="host",
                description=f"{desc} at {path} has permissions {oct(perms)} and is world-writable.",
                evidence=f"Permissions: {oct(perms)}",
                asset=hostname, points_deducted=12 if sev == "critical" else 6,
                remediation=f"Restrict permissions: chmod {oct(expected)} {path}",
            ))

    return findings


def _check_cron_jobs() -> List[Finding]:
    """Check cron jobs for security issues."""
    findings: List[Finding] = []
    hostname = _hostname()

    code, out = _run("crontab -l 2>/dev/null")
    if code == 0 and out:
        lines = [l for l in out.splitlines() if l.strip() and not l.strip().startswith("#")]
        if lines:
            findings.append(Finding(
                title=f"{len(lines)} cron job(s) found for current user",
                severity="info", category="cron",
                module="host",
                description=f"Found {len(lines)} active cron jobs. Review for any suspicious scheduled tasks.",
                evidence=out[:300],
                asset=hostname, points_deducted=0,
                remediation="Review cron jobs: crontab -l",
            ))

    # Check system crons for world-writable scripts
    cron_dirs = ["/etc/cron.d", "/etc/cron.daily", "/etc/cron.hourly"]
    for cdir in cron_dirs:
        if not os.path.isdir(cdir):
            continue
        for entry in os.listdir(cdir):
            full = os.path.join(cdir, entry)
            if os.path.isfile(full):
                perms = _file_perms(full)
                if perms and (perms & stat.S_IWOTH):
                    findings.append(Finding(
                        title=f"World-writable cron script: {full}",
                        severity="critical", category="cron",
                        module="host",
                        description=f"Cron script {full} is world-writable. Any user can modify it to run code as root.",
                        evidence=f"Permissions: {oct(perms)}",
                        asset=hostname, points_deducted=15,
                        remediation=f"chmod 755 {full}",
                    ))

    return findings


def _check_auto_start() -> List[Finding]:
    """Check auto-start services and launch agents."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Systemd services
    code, out = _run("systemctl list-unit-files --state=enabled --type=service --no-pager 2>/dev/null")
    if code == 0 and out:
        services = [l.strip() for l in out.splitlines() if "enabled" in l]
        if len(services) > 20:
            findings.append(Finding(
                title=f"{len(services)} enabled systemd services (high count)",
                severity="low", category="services",
                module="host",
                description=f"{len(services)} services are enabled at boot. More services = larger attack surface.",
                evidence=f"Count: {len(services)}",
                asset=hostname, points_deducted=2,
                remediation="Disable unnecessary services: sudo systemctl disable <service>",
            ))

    return findings


def _check_network() -> List[Finding]:
    """Check network configuration."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Check if WiFi is connected
    code, out = _run("iwconfig 2>/dev/null | grep -i 'essid'" )
    if code == 0 and out:
        if "off/any" not in out.lower():
            findings.append(Finding(
                title="Connected to WiFi network",
                severity="info", category="network",
                module="host",
                description=f"Machine is connected to WiFi: {out.strip()[:100]}",
                evidence=out.strip()[:100],
                asset=hostname, points_deducted=0,
                remediation="",
            ))

    # Check for promiscuous mode
    code, out = _run("ip link 2>/dev/null | grep -i promisc")
    if code == 0 and out:
        findings.append(Finding(
            title="Network interface in promiscuous mode",
            severity="high", category="network",
            module="host",
            description="A network interface is in promiscuous mode, meaning it captures all network traffic.",
            evidence=out.strip()[:200],
            asset=hostname, points_deducted=8,
            remediation="Check for packet sniffers. Disable promiscuous mode: sudo ip link set <iface> promisc off",
        ))

    return findings


def _check_os_info() -> List[Finding]:
    """Gather OS info and check for known issues."""
    findings: List[Finding] = []
    hostname = _hostname()

    try:
        import platform
        sysname = platform.system()
        machine = platform.machine()
        kernel = platform.release()
        findings.append(Finding(
            title=f"OS: {sysname} {machine} | Kernel: {kernel}",
            severity="info", category="os_info",
            module="host",
            description=f"Running {sysname} on {machine} with kernel {kernel}",
            evidence=kernel,
            asset=hostname, points_deducted=0,
            remediation="Keep your kernel up to date: sudo apt upgrade",
        ))
    except Exception:
        pass

    return findings


def _check_usb_devices() -> List[Finding]:
    """Check for connected USB devices."""
    findings: List[Finding] = []
    hostname = _hostname()

    code, out = _run("lsusb 2>/dev/null")
    if code == 0 and out:
        devices = [l for l in out.splitlines() if l.strip()]
        if devices:
            findings.append(Finding(
                title=f"{len(devices)} USB device(s) connected",
                severity="info", category="usb",
                module="host",
                description=f"USB devices detected. Be cautious of unknown USB devices (BadUSB attacks).",
                evidence=out[:300],
                asset=hostname, points_deducted=0,
                remediation="Only connect trusted USB devices. Consider USB device whitelisting.",
            ))

    return findings


def run_host(target: str = "localhost", base_url: str = "", timeout: int = 8,
             verify_tls: bool = True) -> List[Finding]:
    """Full local machine security audit.

    Scans the entire laptop/machine for security issues.
    """
    findings: List[Finding] = []

    findings.extend(_check_os_info())
    findings.extend(_check_open_ports())
    findings.extend(_check_firewall())
    findings.extend(_check_users())
    findings.extend(_check_ssh())
    findings.extend(_check_docker())
    findings.extend(_check_env_secrets())
    findings.extend(_check_file_permissions())
    findings.extend(_check_cron_jobs())
    findings.extend(_check_auto_start())
    findings.extend(_check_network())
    findings.extend(_check_usb_devices())

    return findings
