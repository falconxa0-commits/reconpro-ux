"""DOCTOR module — Security health check with actionable fixes.

Provides a quick security health check with:
- Overall security posture score
- Category breakdown (network, auth, files, deps, env)
- Actionable fix commands the user can copy-paste
- Color-coded severity
- Quick wins section
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


def _run(cmd: str, timeout: int = 8) -> Tuple[int, str]:
    """Run a shell command, return (exit_code, output)."""
    try:
        r = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return r.returncode, (r.stdout + r.stderr).strip()
    except Exception:
        return -1, ""


def _is_windows() -> bool:
    """Check if running on Windows."""
    return os.name == "nt"


def _is_macos() -> bool:
    """Check if running on macOS."""
    return os.name == "posix" and hasattr(os, "uname") and os.uname().sysname == "Darwin"


def _check_password_policy() -> List[Finding]:
    """Check password and authentication policies."""
    findings: List[Finding] = []
    hostname = _hostname()

    if _is_windows():
        # Windows: check password policy via net accounts
        code, out = _run('net accounts 2>NUL')
        if code == 0 and out:
            max_age = None
            min_len = None
            for line in out.splitlines():
                line_lower = line.lower().strip()
                if "maximum password age" in line_lower:
                    parts = line.split(":")
                    if len(parts) >= 2:
                        try:
                            val = parts[-1].strip()
                            max_age = int(val) if val.lower() != "unlimited" else 99999
                        except (ValueError, IndexError):
                            pass
                elif "minimum password length" in line_lower:
                    parts = line.split(":")
                    if len(parts) >= 2:
                        try:
                            min_len = int(parts[-1].strip())
                        except (ValueError, IndexError):
                            pass
            if max_age is not None and max_age > 90:
                findings.append(Finding(
                    title=f"Password max age is {max_age} days (too long)",
                    severity="medium", category="auth_policy",
                    module="doctor",
                    description=f"Password expiration is set to {max_age} days. NIST recommends 90 days or less.",
                    evidence=f"Maximum password age: {max_age}",
                    asset=hostname, points_deducted=4,
                    remediation="Set password expiration: net accounts /maxpwage:90",
                ))
            if min_len is not None and min_len < 12:
                findings.append(Finding(
                    title=f"Minimum password length is {min_len} (too short)",
                    severity="medium", category="auth_policy",
                    module="doctor",
                    description="Minimum password length is less than 12 characters. Longer passwords are more secure.",
                    evidence=f"Minimum password length: {min_len}",
                    asset=hostname, points_deducted=5,
                    remediation="Set minimum password length: net accounts /minpwlen:12",
                ))
        return findings

    # Non-Windows: check Linux password policies
    # Check if password aging is configured
    code, out = _run("cat /etc/login.defs 2>/dev/null")
    if code == 0 and out:
        max_days = 99999
        for line in out.splitlines():
            if line.strip().startswith("PASS_MAX_DAYS"):
                try:
                    max_days = int(line.split()[1])
                except (ValueError, IndexError):
                    pass
        if max_days > 90:
            findings.append(Finding(
                title=f"Password max age is {max_days} days (too long)",
                severity="medium", category="auth_policy",
                module="doctor",
                description=f"Password expiration is set to {max_days} days. NIST recommends 90 days or less.",
                evidence=f"PASS_MAX_DAYS={max_days}",
                asset=hostname, points_deducted=4,
                remediation="Set PASS_MAX_DAYS=90 in /etc/login.defs",
            ))

    # Check minimum password length
    code, out = _run("cat /etc/security/pwquality.conf 2>/dev/null || cat /etc/pam.d/common-password 2>/dev/null")
    if code == 0 and out:
        if "minlen" not in out.lower() and "pam_pwquality" not in out and "pam_cracklib" not in out:
            findings.append(Finding(
                title="No password complexity requirements configured",
                severity="medium", category="auth_policy",
                module="doctor",
                description="No minimum password length or complexity requirements found.",
                evidence="pwquality.conf not configured",
                asset=hostname, points_deducted=5,
                remediation="Configure /etc/security/pwquality.conf: minlen=12 dcredit=-1 ucredit=-1 ocredit=-1 lcredit=-1",
            ))

    return findings


def _check_disk_encryption() -> List[Finding]:
    """Check if disk encryption is active."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Windows: check BitLocker
    if _is_windows():
        code, out = _run('manage-bde -status C: 2>NUL')
        if code == 0 and out and "Percentage Encrypted" in out:
            pct_match = re.search(r'Percentage Encrypted[:\s]+(\d+)%', out)
            if pct_match and int(pct_match.group(1)) > 0:
                return findings  # BitLocker is active
        findings.append(Finding(
            title="No disk encryption detected",
            severity="medium", category="disk_security",
            module="doctor",
            description="No BitLocker encryption found on the system drive. Laptop data is at risk if stolen.",
            evidence="BitLocker not active or not detected",
            asset=hostname, points_deducted=5,
            remediation="Enable BitLocker: Settings > System > BitLocker or manage-bde -on C:",
        ))
        return findings

    # macOS: check FileVault
    if _is_macos():
        code, out = _run("fdesetup status 2>/dev/null")
        if code == 0 and "On" in (out or ""):
            return findings  # FileVault is active
        findings.append(Finding(
            title="No disk encryption detected",
            severity="medium", category="disk_security",
            module="doctor",
            description="No FileVault encryption found. Laptop data is at risk if stolen.",
            evidence="FileVault not active",
            asset=hostname, points_deducted=5,
            remediation="Enable FileVault: System Preferences > Security & Privacy > FileVault",
        ))
        return findings

    # Linux: check LUKS / ecryptfs
    code, out = _run("lsblk -o NAME,FSTYPE,TYPE -n 2>/dev/null | grep -i crypt")
    if code != 0 or not out:
        # Check for ecryptfs
        code2, out2 = _run("mount | grep -i ecryptfs")
        if code2 != 0 or not out2:
            findings.append(Finding(
                title="No disk encryption detected",
                severity="medium", category="disk_security",
                module="doctor",
                description="No LUKS or ecryptfs encryption found. Laptop data is at risk if stolen.",
                evidence="No encrypted volumes found",
                asset=hostname, points_deducted=5,
                remediation="Enable full disk encryption: cryptsetup luksFormat /dev/sdX",
            ))
    return findings


def _check_auto_lock() -> List[Finding]:
    """Check screen lock / auto-lock settings."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Windows: check screen saver lock via registry
    if _is_windows():
        code, out = _run('reg query "HKCU\\Control Panel\\Desktop" /v ScreenSaveActive 2>NUL')
        if code == 0 and out:
            if "REG_SZ" in out and "1" in out.split("REG_SZ")[-1]:
                return findings  # Screen saver with lock is active
        findings.append(Finding(
            title="Screen lock may not be enabled",
            severity="medium", category="physical_security",
            module="doctor",
            description="Windows screen lock does not appear to be active. Your machine can be accessed when unattended.",
            evidence="ScreenSaveActive not set to 1",
            asset=hostname, points_deducted=5,
            remediation="Enable screen lock: Settings > Personalization > Lock screen > Screen timeout",
        ))
        return findings

    # macOS: check screen saver idle time
    if _is_macos():
        code, out = _run("defaults read com.apple.screensaver idleTime 2>/dev/null")
        if code == 0 and out.strip():
            try:
                seconds = int(out.strip())
                if seconds > 0 and seconds <= 300:  # 5 minutes or less
                    return findings  # Auto-lock is configured
            except ValueError:
                pass
        findings.append(Finding(
            title="Screen lock may not be configured",
            severity="medium", category="physical_security",
            module="doctor",
            description="macOS screen lock idle time is not set or too long. Your machine can be accessed when unattended.",
            evidence=f"idleTime: {out.strip() if code == 0 else 'not set'}",
            asset=hostname, points_deducted=5,
            remediation="Enable screen lock: System Preferences > Desktop & Screen Saver > Start After",
        ))
        return findings

    # Linux: check gnome screensaver or xautolock
    code, out = _run("gsettings get org.gnome.desktop.screensaver lock-enabled 2>/dev/null")
    if code == 0:
        if "false" in out.lower():
            findings.append(Finding(
                title="Screen lock is disabled",
                severity="medium", category="physical_security",
                module="doctor",
                description="GNOME screen lock is disabled. Your machine can be accessed when unattended.",
                evidence="lock-enabled: false",
                asset=hostname, points_deducted=5,
                remediation="Enable screen lock: gsettings set org.gnome.desktop.screensaver lock-enabled true",
            ))
    else:
        # Check xautolock or xscreensaver
        code2, out2 = _run("pgrep -x xautolock 2>/dev/null || pgrep -x xscreensaver 2>/dev/null")
        if code2 != 0 or not out2:
            findings.append(Finding(
                title="No auto-lock mechanism detected",
                severity="low", category="physical_security",
                module="doctor",
                description="No screen locker daemon (xautolock/xscreensaver) is running.",
                evidence="No lock process found",
                asset=hostname, points_deducted=3,
                remediation="Install xautolock: sudo apt install xautolock && xautolock -time 5 -locker lock",
            ))

    return findings


def _check_antivirus() -> List[Finding]:
    """Check for antivirus / malware protection."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Windows: check Windows Defender and common third-party AV
    if _is_windows():
        found_av = []
        code, out = _run('sc query WinDefend 2>NUL')
        if code == 0 and "RUNNING" in out:
            found_av.append("Windows Defender")
        # Check for common third-party AV processes
        third_party_av = [
            ("Malwarebytes", "where mbamtray 2>NUL"),
            ("Kaspersky", "where avpui 2>NUL"),
            ("Norton", "where ccSvcHst 2>NUL"),
            ("Sophos", "where SophosUI 2>NUL"),
        ]
        for name, cmd in third_party_av:
            c, _ = _run(cmd)
            if c == 0:
                found_av.append(name)
        if found_av:
            findings.append(Finding(
                title=f"Security tools installed: {', '.join(found_av)}",
                severity="info", category="malware_protection",
                module="doctor",
                description=f"Found security tools: {', '.join(found_av)}.",
                evidence=str(found_av),
                asset=hostname, points_deducted=0,
                remediation="",
            ))
        else:
            findings.append(Finding(
                title="No antivirus or security tools detected",
                severity="medium", category="malware_protection",
                module="doctor",
                description="No Windows Defender or third-party antivirus found. Your system has no malware detection.",
                evidence="No AV tools found",
                asset=hostname, points_deducted=5,
                remediation="Enable Windows Defender: Settings > Update & Security > Windows Security",
            ))
        return findings

    # Non-Windows: check common Linux AV tools
    av_tools = [
        ("clamav", "clamdscan --version"),
        ("rkhunter", "rkhunter --version"),
        ("chkrootkit", "chkrootkit -V 2>/dev/null | head -1"),
        ("lynis", "lynis version 2>/dev/null"),
        ("fail2ban", "fail2ban-client --version"),
    ]

    found_av = []
    for name, cmd in av_tools:
        code, out = _run(cmd)
        if code == 0 and out:
            found_av.append(name)

    if found_av:
        findings.append(Finding(
            title=f"Security tools installed: {', '.join(found_av)}",
            severity="info", category="malware_protection",
            module="doctor",
            description=f"Found security tools: {', '.join(found_av)}.",
            evidence=str(found_av),
            asset=hostname, points_deducted=0,
            remediation="",
        ))
    else:
        findings.append(Finding(
            title="No antivirus or security tools detected",
            severity="medium", category="malware_protection",
            module="doctor",
            description="No ClamAV, rkhunter, chkrootkit, Lynis, or fail2ban found. Your system has no malware detection.",
            evidence="No AV tools found",
            asset=hostname, points_deducted=5,
            remediation="Install security tools: sudo apt install clamav rkhunter lynis fail2ban",
        ))

    return findings


def _check_system_updates() -> List[Finding]:
    """Check for pending system updates."""
    findings: List[Finding] = []
    hostname = _hostname()

    # Windows: check last update date via PowerShell
    if _is_windows():
        code, out = _run('powershell -command "(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1).InstalledOn" 2>NUL')
        if code == 0 and out.strip():
            findings.append(Finding(
                title=f"Last Windows update: {out.strip()[:30]}",
                severity="info", category="updates",
                module="doctor",
                description=f"Last system update was installed on {out.strip()[:30]}. Check Windows Update regularly.",
                evidence=out.strip()[:50],
                asset=hostname, points_deducted=0,
                remediation="Update Windows: Settings > Windows Update",
            ))
        else:
            findings.append(Finding(
                title="Could not determine last Windows update",
                severity="low", category="updates",
                module="doctor",
                description="Unable to check when Windows was last updated.",
                evidence="Get-HotFix failed",
                asset=hostname, points_deducted=2,
                remediation="Update Windows: Settings > Windows Update",
            ))
        return findings

    # macOS: check for pending updates
    if _is_macos():
        code, out = _run("softwareupdate -l 2>&1 | grep -c 'restart' 2>/dev/null")
        if code == 0 and out.strip():
            try:
                count = int(out.strip())
                if count > 0:
                    findings.append(Finding(
                        title=f"{count} pending macOS update(s) requiring restart",
                        severity="medium", category="updates",
                        module="doctor",
                        description=f"{count} macOS updates are available and require a restart. Unpatched software is a common attack vector.",
                        evidence=f"{count} updates pending",
                        asset=hostname, points_deducted=3 + count,
                        remediation="Update macOS: System Preferences > Software Update",
                    ))
            except ValueError:
                pass
        return findings

    # Linux: Ubuntu/Debian
    code, out = _run("apt list --upgradable 2>/dev/null | grep -c 'upgradable'")
    if code == 0 and out.strip():
        try:
            count = int(out.strip())
            if count > 0:
                sev = "high" if count > 20 else ("medium" if count > 5 else "low")
                findings.append(Finding(
                    title=f"{count} pending system updates",
                    severity=sev, category="updates",
                    module="doctor",
                    description=f"{count} packages have updates available. Unpatched packages are a common attack vector.",
                    evidence=f"{count} upgradable packages",
                    asset=hostname, points_deducted=3 + count,
                    remediation="Update system: sudo apt update && sudo apt upgrade -y",
                ))
        except ValueError:
            pass

    return findings


def _check_shared_memory() -> List[Finding]:
    """Check /dev/shm is mounted noexec."""
    findings: List[Finding] = []
    hostname = _hostname()

    code, out = _run("mount | grep /dev/shm")
    if code == 0 and out:
        if "noexec" not in out:
            findings.append(Finding(
                title="/dev/shm is not mounted with noexec",
                severity="medium", category="hardening",
                module="doctor",
                description="/dev/shm allows execution of files. Attackers can use this to run malware from shared memory.",
                evidence=out.strip()[:200],
                asset=hostname, points_deducted=5,
                remediation="Add to /etc/fstab: tmpfs /dev/shm tmpfs defaults,noexec,nosuid 0 0",
            ))

    return findings


def _check_core_dumps() -> List[Finding]:
    """Check if core dumps are restricted."""
    findings: List[Finding] = []
    hostname = _hostname()

    code, out = _run("ulimit -c")
    if code == 0 and out.strip() not in ("0", "unlimited"):
        pass  # some limit set
    elif code == 0 and out.strip() == "unlimited":
        findings.append(Finding(
            title="Core dumps are unlimited",
            severity="low", category="hardening",
            module="doctor",
            description="Core dumps can contain sensitive data from memory (keys, passwords, etc.).",
            evidence="ulimit -c: unlimited",
            asset=hostname, points_deducted=2,
            remediation="Set ulimit -c 0 or add 'fs.suid_dumpable=0' to /etc/sysctl.conf",
        ))

    return findings


def _check_browser_security() -> List[Finding]:
    """Check for browser security extensions/configs."""
    findings: List[Finding] = []
    hostname = _hostname()

    # This is informational - we can check if common privacy/security browsers are installed
    browsers_found = []
    browser_checks = []
    if _is_windows():
        browser_checks = [
            ("firefox", "where firefox 2>NUL"),
            ("chrome", "where chrome 2>NUL"),
            ("brave", "where brave 2>NUL"),
        ]
    else:
        browser_checks = [
            ("firefox", "which firefox 2>/dev/null"),
            ("chromium", "which chromium-browser 2>/dev/null || which chromium 2>/dev/null"),
            ("brave", "which brave-browser 2>/dev/null"),
        ]

    for name, cmd in browser_checks:
        code, _ = _run(cmd)
        if code == 0:
            browsers_found.append(name)

    if browsers_found:
        findings.append(Finding(
            title=f"Browsers installed: {', '.join(browsers_found)}",
            severity="info", category="browser_security",
            module="doctor",
            description="Consider installing privacy extensions: uBlock Origin, HTTPS Everywhere, Privacy Badger.",
            evidence=str(browsers_found),
            asset=hostname, points_deducted=0,
            remediation="Install security extensions: uBlock Origin, Privacy Badger, HTTPS Everywhere",
        ))

    return findings


def run_doctor(target: str = "localhost", base_url: str = "", timeout: int = 8,
               verify_tls: bool = True) -> List[Finding]:
    """Security health check with actionable fixes.

    Runs a comprehensive health check and provides
    copy-paste fix commands for every issue found.
    """
    findings: List[Finding] = []

    findings.extend(_check_password_policy())
    findings.extend(_check_disk_encryption())
    findings.extend(_check_auto_lock())
    findings.extend(_check_antivirus())
    findings.extend(_check_system_updates())
    findings.extend(_check_shared_memory())
    findings.extend(_check_core_dumps())
    findings.extend(_check_browser_security())

    return findings
