// ─── System Configuration & Security Settings Analysis ─────────────
// Analyzes Linux system configuration files for security hardening status.
// "Registry" here refers to system configuration files (/etc/*, /proc/*).

import { execSync } from 'child_process';
import fs from 'fs';
import type { ReconFinding } from './types';

// ── Types ──────────────────────────────────────────────────────────

export interface SecurityConfig {
  aslrEnabled: boolean;
  aslrLevel: number;
  shadowReadable: boolean;
  sshRootLogin?: string;
  sshPasswordAuth?: string;
  firewallActive: boolean;
  firewallTool?: string;
  usersWithUID0: string[];
  usersWithShell: string[];
}

export interface RegistryResult {
  security: SecurityConfig;
  configFilesChecked: string[];
  findings: ReconFinding[];
}

// ── Constants ─────────────────────────────────────────────────────

const ASLR_PATH = '/proc/sys/kernel/randomize_va_space';
const SHADOW_PATH = '/etc/shadow';
const PASSWD_PATH = '/etc/passwd';
const SSHD_CONFIG_PATH = '/etc/ssh/sshd_config';

/** Paths to check for configuration file existence. */
const CONFIG_FILES_TO_CHECK = [
  '/etc/passwd',
  '/etc/shadow',
  '/etc/ssh/sshd_config',
  '/etc/security/pam.conf',
  '/etc/pam.d/common-auth',
  '/etc/sysctl.conf',
  ASLR_PATH,
  '/etc/fail2ban/jail.conf',
  '/etc/ufw/ufw.conf',
];

/**
 * Create a ReconFinding for this module.
 */
function makeFinding(
  overrides: Partial<Omit<ReconFinding, 'source'>> & Pick<ReconFinding, 'title'>,
): ReconFinding {
  return {
    severity: 'info',
    category: 'system-config',
    description: '',
    evidence: null,
    asset: 'localhost',
    source: 'registry-recon',
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Safely read a file, returning null on any error.
 */
function safeReadFile(filePath: string, encoding: BufferEncoding = 'utf-8'): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, { encoding, flag: 'r' });
  } catch {
    return null;
  }
}

/**
 * Safely check if a file is readable by the current user.
 */
function isReadable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse /etc/passwd to extract user information.
 *
 * Format: username:x:UID:GID:comment:home:shell
 */
function parsePasswd(content: string): { usersWithUID0: string[]; usersWithShell: string[] } {
  const usersWithUID0: string[] = [];
  const usersWithShell: string[] = [];

  const lines = content.split('\n');
  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length < 7) continue;

    const username = parts[0];
    const uid = parseInt(parts[2], 10);
    const shell = parts[6];

    if (isNaN(uid)) continue;

    // Users with UID 0 (should only be root)
    if (uid === 0) {
      usersWithUID0.push(username);
    }

    // Users with shell access (non-nologin, non-false, non-sync shells)
    const nologinShells = ['/sbin/nologin', '/bin/false', '/bin/sync', '/sbin/halt', '/sbin/shutdown', '/usr/sbin/nologin'];
    if (shell && !nologinShells.includes(shell) && !shell.includes('nologin') && !shell.includes('/false')) {
      usersWithShell.push(`${username} (${shell})`);
    }
  }

  return { usersWithUID0, usersWithShell };
}

/**
 * Parse sshd_config for a specific setting.
 * Handles both "Key Value" and "Key Value" formats, ignoring comments.
 */
function parseSshdConfig(content: string, setting: string): string | undefined {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed.length === 0) continue;

    // Match "PermitRootLogin yes" etc.
    const regex = new RegExp(`^${setting}\\s+(.+)`, 'i');
    const match = trimmed.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * Check if a firewall tool is available on the system.
 */
function checkFirewall(): { active: boolean; tool?: string } {
  // Check for ufw
  try {
    const ufwOutput = execSync('ufw status 2>/dev/null', { timeout: 5000, encoding: 'utf-8' });
    if (ufwOutput.toLowerCase().includes('active')) {
      return { active: true, tool: 'ufw' };
    }
    return { active: false, tool: 'ufw' };
  } catch {
    // ufw not available, try iptables
  }

  // Check for iptables
  try {
    execSync('which iptables 2>/dev/null', { timeout: 5000, encoding: 'utf-8' });
    const rulesOutput = execSync('iptables -L -n 2>/dev/null', { timeout: 5000, encoding: 'utf-8' });
    // If iptables exists and has rules (beyond 3 default chain lines), consider it active
    const ruleLines = rulesOutput.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('Chain') && !l.startsWith('target'));
    if (ruleLines.length > 0) {
      return { active: true, tool: 'iptables' };
    }
    return { active: false, tool: 'iptables' };
  } catch {
    // iptables not available
  }

  // Check for nftables
  try {
    execSync('which nft 2>/dev/null', { timeout: 5000, encoding: 'utf-8' });
    return { active: true, tool: 'nftables' };
  } catch {
    // nft not available
  }

  return { active: false };
}

// ── Main Export ───────────────────────────────────────────────────

/**
 * Analyze Linux system configuration for security hardening status.
 *
 * - Checks ASLR (Address Space Layout Randomization) status
 * - Verifies /etc/shadow permissions
 * - Parses SSH daemon configuration for insecure settings
 * - Checks firewall status (ufw, iptables, nftables)
 * - Analyzes /etc/passwd for privileged users and shell access
 *
 * @returns A `RegistryResult` with security configuration details and findings.
 */
export async function analyzeRegistry(): Promise<RegistryResult> {
  const findings: ReconFinding[] = [];
  const configFilesChecked: string[] = [];

  // Initialize security config with defaults
  const security: SecurityConfig = {
    aslrEnabled: false,
    aslrLevel: 0,
    shadowReadable: false,
    firewallActive: false,
    usersWithUID0: [],
    usersWithShell: [],
  };

  // ── 1. ASLR check ───────────────────────────────────────────────
  const aslrContent = safeReadFile(ASLR_PATH);
  if (aslrContent !== null) {
    const aslrLevel = parseInt(aslrContent.trim(), 10);
    security.aslrLevel = aslrLevel;
    security.aslrEnabled = aslrLevel === 2;

    if (aslrLevel === 0) {
      findings.push(
        makeFinding({
          title: 'ASLR Disabled',
          severity: 'high',
          category: 'system-config',
          description: 'Address Space Layout Randomization (ASLR) is disabled (level 0). This makes the system vulnerable to memory corruption exploits such as buffer overflows, as memory addresses are predictable.',
          evidence: `randomize_va_space = ${aslrLevel}`,
          asset: ASLR_PATH,
          remediation: 'Enable ASLR by running: echo 2 | sudo tee /proc/sys/kernel/randomize_va_space, or set kernel.randomize_va_space=2 in /etc/sysctl.conf.',
        }),
      );
    } else if (aslrLevel === 1) {
      findings.push(
        makeFinding({
          title: 'ASLR Partially Enabled',
          severity: 'medium',
          category: 'system-config',
          description: 'ASLR is partially enabled (level 1 — randomization of stack, heap, libraries but not executable base). This provides some protection but is not the recommended level.',
          evidence: `randomize_va_space = ${aslrLevel}`,
          asset: ASLR_PATH,
          remediation: 'Set ASLR to full randomization (level 2): echo 2 | sudo tee /proc/sys/kernel/randomize_va_space.',
        }),
      );
    } else {
      findings.push(
        makeFinding({
          title: 'ASLR Fully Enabled',
          severity: 'info',
          category: 'system-config',
          description: 'ASLR is fully enabled (level 2). This provides strong protection against memory corruption exploits by randomizing the location of stack, heap, libraries, and executable base.',
          evidence: `randomize_va_space = ${aslrLevel}`,
          asset: ASLR_PATH,
        }),
      );
    }
    configFilesChecked.push(ASLR_PATH);
  } else {
    findings.push(
      makeFinding({
        title: 'ASLR Status Unavailable',
        severity: 'info',
        category: 'system-config',
        description: `Unable to read ${ASLR_PATH}. ASLR status could not be determined — the /proc filesystem may be restricted.`,
        evidence: null,
        asset: ASLR_PATH,
      }),
    );
  }

  // ── 2. Shadow file check ───────────────────────────────────────
  security.shadowReadable = isReadable(SHADOW_PATH);
  configFilesChecked.push(SHADOW_PATH);

  if (security.shadowReadable) {
    findings.push(
      makeFinding({
        title: '/etc/shadow is Readable by Current User',
        severity: 'critical',
        category: 'system-config',
        description: '/etc/shadow is readable by the current process. This file contains password hashes for all system users. Unauthorized read access enables offline password cracking attacks.',
        evidence: 'fs.access(/etc/shadow, R_OK) returned true',
        asset: SHADOW_PATH,
        remediation: 'Ensure /etc/shadow has permissions 640 (rw-r-----) and is owned by root:shadow. Check: ls -la /etc/shadow.',
      }),
    );
  } else {
    findings.push(
      makeFinding({
        title: '/etc/shadow Permissions OK',
        severity: 'info',
        category: 'system-config',
        description: '/etc/shadow is not readable by the current user. This is the expected and secure configuration.',
        evidence: null,
        asset: SHADOW_PATH,
      }),
    );
  }

  // ── 3. SSH daemon configuration ─────────────────────────────────
  const sshdContent = safeReadFile(SSHD_CONFIG_PATH);
  configFilesChecked.push(SSHD_CONFIG_PATH);

  if (sshdContent !== null) {
    // PermitRootLogin
    security.sshRootLogin = parseSshdConfig(sshdContent, 'PermitRootLogin');

    if (security.sshRootLogin && security.sshRootLogin.toLowerCase() !== 'no') {
      const value = security.sshRootLogin.toLowerCase();
      const severity = value === 'yes' ? 'critical' : 'high';
      findings.push(
        makeFinding({
          title: `SSH Root Login Enabled: ${security.sshRootLogin}`,
          severity,
          category: 'system-config',
          description: `SSH root login is set to "${security.sshRootLogin}". Direct root SSH access is a significant security risk — it allows brute-force attacks against the most privileged account.`,
          evidence: `PermitRootLogin ${security.sshRootLogin}`,
          asset: SSHD_CONFIG_PATH,
          remediation: 'Set PermitRootLogin no in sshd_config and use key-based authentication for a regular user account with sudo access.',
        }),
      );
    } else {
      findings.push(
        makeFinding({
          title: 'SSH Root Login Disabled',
          severity: 'info',
          category: 'system-config',
          description: 'SSH root login is properly disabled (PermitRootLogin no). This forces attackers to guess both the username and password, significantly increasing the difficulty of brute-force attacks.',
          evidence: null,
          asset: SSHD_CONFIG_PATH,
        }),
      );
    }

    // PasswordAuthentication
    security.sshPasswordAuth = parseSshdConfig(sshdContent, 'PasswordAuthentication');

    if (security.sshPasswordAuth && security.sshPasswordAuth.toLowerCase() === 'yes') {
      findings.push(
        makeFinding({
          title: 'SSH Password Authentication Enabled',
          severity: 'high',
          category: 'system-config',
          description: 'SSH password authentication is enabled. Password-based auth is susceptible to brute-force, dictionary, and credential stuffing attacks. Key-based authentication is significantly more secure.',
          evidence: 'PasswordAuthentication yes',
          asset: SSHD_CONFIG_PATH,
          remediation: 'Disable password authentication (PasswordAuthentication no) and require SSH key pairs for all access.',
        }),
      );
    } else if (security.sshPasswordAuth && security.sshPasswordAuth.toLowerCase() === 'no') {
      findings.push(
        makeFinding({
          title: 'SSH Password Authentication Disabled',
          severity: 'info',
          category: 'system-config',
          description: 'SSH password authentication is disabled. The server requires key-based authentication, which provides strong protection against brute-force attacks.',
          evidence: 'PasswordAuthentication no',
          asset: SSHD_CONFIG_PATH,
        }),
      );
    }
  } else {
    findings.push(
      makeFinding({
        title: 'SSH Configuration Not Accessible',
        severity: 'info',
        category: 'system-config',
        description: `Unable to read ${SSHD_CONFIG_PATH}. SSH configuration could not be analyzed. The SSH daemon may not be installed or the file is not readable.`,
        evidence: null,
        asset: SSHD_CONFIG_PATH,
      }),
    );
  }

  // ── 4. Firewall check ───────────────────────────────────────────
  const firewallResult = checkFirewall();
  security.firewallActive = firewallResult.active;
  security.firewallTool = firewallResult.tool;

  if (firewallResult.active) {
    findings.push(
      makeFinding({
        title: `Firewall Active (${firewallResult.tool})`,
        severity: 'info',
        category: 'system-config',
        description: `A firewall is active using ${firewallResult.tool}. Firewalls provide a first line of defense by controlling inbound and outbound network traffic.`,
        evidence: `Tool: ${firewallResult.tool}`,
        asset: 'localhost',
      }),
    );
  } else {
    findings.push(
      makeFinding({
        title: 'No Firewall Detected',
        severity: 'medium',
        category: 'system-config',
        description: 'No active firewall (ufw, iptables, or nftables) was detected on the system. Without a firewall, all network ports are accessible, increasing the attack surface significantly.',
        evidence: null,
        asset: 'localhost',
        remediation: 'Enable a firewall: sudo ufw enable (Ubuntu/Debian) or configure iptables/nftables rules manually.',
      }),
    );
  }

  // ── 5. User analysis (/etc/passwd) ───────────────────────────────
  const passwdContent = safeReadFile(PASSWD_PATH);
  configFilesChecked.push(PASSWD_PATH);

  if (passwdContent !== null) {
    const { usersWithUID0, usersWithShell } = parsePasswd(passwdContent);
    security.usersWithUID0 = usersWithUID0;
    security.usersWithShell = usersWithShell;

    // Non-root user with UID 0
    const nonRootUID0 = usersWithUID0.filter(u => u !== 'root');
    if (nonRootUID0.length > 0) {
      findings.push(
        makeFinding({
          title: `Non-Root User(s) with UID 0: ${nonRootUID0.join(', ')}`,
          severity: 'critical',
          category: 'system-config',
          description: `User(s) "${nonRootUID0.join(', ')}" have UID 0 but are not named "root". UID 0 grants full root privileges. This is typically a sign of a backdoor account created by an attacker.`,
          evidence: `UID 0 users: ${usersWithUID0.join(', ')}`,
          asset: PASSWD_PATH,
          remediation: 'Investigate how these accounts were created. If unauthorized, lock the account and audit the system for compromise.',
        }),
      );
    } else {
      findings.push(
        makeFinding({
          title: 'No Unauthorized UID 0 Accounts',
          severity: 'info',
          category: 'system-config',
          description: 'Only the root account has UID 0. This is the expected and secure configuration.',
          evidence: null,
          asset: PASSWD_PATH,
        }),
      );
    }

    // Users with shell access
    if (usersWithShell.length > 0) {
      findings.push(
        makeFinding({
          title: `${usersWithShell.length} Account(s) with Shell Access`,
          severity: 'info',
          category: 'system-config',
          description: `${usersWithShell.length} user account(s) have login shell access. Each shell account is a potential entry point for attackers. Review whether all listed accounts are necessary.`,
          evidence: usersWithShell.slice(0, 10).join('; '),
          asset: PASSWD_PATH,
        }),
      );
    }
  } else {
    findings.push(
      makeFinding({
        title: '/etc/passwd Not Accessible',
        severity: 'info',
        category: 'system-config',
        description: `Unable to read ${PASSWD_PATH}. User account analysis could not be performed.`,
        evidence: null,
        asset: PASSWD_PATH,
      }),
    );
  }

  // ── 6. Additional config file checks ─────────────────────────────
  for (const configPath of CONFIG_FILES_TO_CHECK) {
    if (!configFilesChecked.includes(configPath)) {
      configFilesChecked.push(configPath);
    }
  }

  // ── 7. Summary finding ───────────────────────────────────────────
  findings.push(
    makeFinding({
      title: 'System Security Configuration Analyzed',
      severity: 'info',
      category: 'system-config',
      description: `Analyzed ${configFilesChecked.length} system configuration file(s). ASLR: ${security.aslrEnabled ? 'full' : `level ${security.aslrLevel}`}, Shadow readable: ${security.shadowReadable}, Firewall: ${security.firewallActive ? security.firewallTool : 'none'}.`,
      evidence: `Files checked: ${configFilesChecked.join(', ')}`,
      asset: 'localhost',
    }),
  );

  return {
    security,
    configFilesChecked,
    findings,
  };
}

export { type ReconFinding };
