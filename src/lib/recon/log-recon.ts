// ─── Security Log Analysis ──────────────────────────────────────────
// Reads and analyzes local system and application logs for security events
// such as brute-force attempts, privilege escalation, and service crashes.

import fs from 'fs';
import path from 'path';
import type { ReconFinding } from './types';

// ── Types ──────────────────────────────────────────────────────────

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
  matchedPattern?: string;
}

export interface LogResult {
  logsAnalyzed: { path: string; exists: boolean; linesRead: number }[];
  totalEntries: number;
  errors: LogEntry[];
  warnings: LogEntry[];
  securityEvents: LogEntry[];
  bruteForceAttempts: { ip: string; count: number }[];
  findings: ReconFinding[];
}

// ── Constants ─────────────────────────────────────────────────────

/** Default log paths to check on a Linux system. */
const DEFAULT_LOG_PATHS = [
  '/var/log/auth.log',
  '/var/log/syslog',
  '/var/log/kern.log',
  '/home/z/my-project/dev.log',
  '/home/z/my-project/server.log',
  '/var/log/nginx/access.log',
  '/var/log/nginx/error.log',
  '/var/log/auth.log.1',
  '/var/log/secure',
  '/var/log/messages',
];

/** Maximum number of lines to read per log file. */
const MAX_LINES_PER_FILE = 100;

/** Patterns for security-relevant log entries. */
const LOG_PATTERNS: { pattern: RegExp; category: string; severity: string; description: string }[] = [
  {
    pattern: /Failed|invalid user/i,
    category: 'authentication',
    severity: 'medium',
    description: 'Failed authentication attempt detected.',
  },
  {
    pattern: /Accepted password.*root/i,
    category: 'authentication',
    severity: 'critical',
    description: 'Successful root login via password — potential compromise indicator.',
  },
  {
    pattern: /sudo.*FAILED/i,
    category: 'privilege-escalation',
    severity: 'high',
    description: 'Failed sudo command — potential privilege escalation attempt.',
  },
  {
    pattern: /segfault|core dump|panic/i,
    category: 'crash',
    severity: 'medium',
    description: 'Application crash or kernel panic detected.',
  },
  {
    pattern: /xmrig|miner|cryptonight|cpuminer/i,
    category: 'malware',
    severity: 'critical',
    description: 'Crypto-mining related log entry detected — possible malware.',
  },
  {
    pattern: /denied|forbidden|403/i,
    category: 'access',
    severity: 'low',
    description: 'Access denied event in logs.',
  },
  {
    pattern: /error|exception|traceback/i,
    category: 'error',
    severity: 'low',
    description: 'Error or exception logged by application.',
  },
  {
    pattern: /warning|warn/i,
    category: 'warning',
    severity: 'info',
    description: 'Warning-level log entry.',
  },
];

/** Pattern to extract IPv4 addresses from log lines. */
const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/**
 * Create a ReconFinding for this module.
 */
function makeFinding(
  overrides: Partial<Omit<ReconFinding, 'source'>> & Pick<ReconFinding, 'title'>,
): ReconFinding {
  return {
    severity: 'info',
    category: 'logging',
    description: '',
    evidence: null,
    asset: 'localhost',
    source: 'log-recon',
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Read the last N lines from a file efficiently.
 * Returns an empty array if the file doesn't exist or can't be read.
 */
function readLastLines(filePath: string, maxLines: number): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];

    const stats = fs.statSync(filePath);
    if (!stats.isFile() || stats.size === 0) return [];

    const fd = fs.openSync(filePath, 'r');
    const bufSize = Math.min(stats.size, 65536); // Read up to 64KB from the end
    const buf = Buffer.alloc(bufSize);
    fs.readSync(fd, buf, 0, bufSize, Math.max(0, stats.size - bufSize));
    fs.closeSync(fd);

    const content = buf.toString('utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    // Return only the last maxLines lines
    return lines.length > maxLines ? lines.slice(-maxLines) : lines;
  } catch {
    return [];
  }
}

/**
 * Try to extract a timestamp from a log line.
 * Falls back to "unknown" if no timestamp pattern is found.
 */
function extractTimestamp(line: string): string {
  // Common syslog timestamp format: MMM DD HH:MM:SS
  const syslogMatch = line.match(/^(?:[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/);
  if (syslogMatch) return syslogMatch[0];

  // ISO 8601 format
  const isoMatch = line.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/);
  if (isoMatch) return isoMatch[0];

  // Next.js dev format
  const nextMatch = line.match(/\[\d{4}-\d{2}-\d{2}.*?\]/);
  if (nextMatch) return nextMatch[0];

  return 'unknown';
}

/**
 * Classify a log line's severity level.
 */
function classifyLevel(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('fatal') || lower.includes('crit')) return 'error';
  if (lower.includes('warn')) return 'warning';
  if (lower.includes('info')) return 'info';
  if (lower.includes('debug') || lower.includes('trace')) return 'debug';
  return 'info';
}

/**
 * Analyze a log line against all security patterns.
 * Returns the matched pattern names.
 */
function matchPatterns(line: string): { patternNames: string[]; entries: LogEntry[] } {
  const patternNames: string[] = [];
  const entries: LogEntry[] = [];

  for (const { pattern, category, severity, description } of LOG_PATTERNS) {
    if (pattern.test(line)) {
      patternNames.push(category);
      entries.push({
        timestamp: extractTimestamp(line),
        level: severity,
        message: line.slice(0, 300), // Truncate long lines
        source: category,
        matchedPattern: pattern.source,
      });
    }
  }

  return { patternNames, entries };
}

/**
 * Extract all unique IPs from a log line.
 */
function extractIPs(line: string): string[] {
  const matches = line.match(IP_PATTERN);
  if (!matches) return [];

  // Filter out obvious non-IPs (version numbers, etc.)
  return matches.filter(ip => {
    const parts = ip.split('.').map(Number);
    return parts.every(p => p >= 0 && p <= 255) && !(
      parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0
    );
  });
}

// ── Main Export ───────────────────────────────────────────────────

/**
 * Analyze local system and application logs for security events.
 *
 * - Checks default log paths for existence and readability
 * - Reads the last 100 lines of each accessible log
 * - Searches for failed auth, brute-force, privilege escalation, crashes, and malware indicators
 * - Extracts IP addresses to identify brute-force sources
 *
 * @param logPaths - Optional list of log file paths to analyze. Defaults to common system logs.
 * @returns A `LogResult` with analyzed entries, security events, and findings.
 */
export async function analyzeLogs(logPaths?: string[]): Promise<LogResult> {
  const paths = logPaths ?? DEFAULT_LOG_PATHS;
  const findings: ReconFinding[] = [];
  const logsAnalyzed: { path: string; exists: boolean; linesRead: number }[] = [];
  const errors: LogEntry[] = [];
  const warnings: LogEntry[] = [];
  const securityEvents: LogEntry[] = [];
  const bruteForceMap = new Map<string, number>();
  let totalEntries = 0;

  const FAIL_THRESHOLD = 5; // IPs with >= 5 failed attempts flagged as brute force

  // ── 1. Process each log file ────────────────────────────────────
  for (const logPath of paths) {
    const exists = fs.existsSync(logPath);
    if (!exists) {
      logsAnalyzed.push({ path: logPath, exists: false, linesRead: 0 });
      continue;
    }

    const lines = readLastLines(logPath, MAX_LINES_PER_FILE);
    logsAnalyzed.push({ path: logPath, exists: true, linesRead: lines.length });

    for (const line of lines) {
      totalEntries++;
      const { patternNames, entries } = matchPatterns(line);

      // Collect all matched entries
      for (const entry of entries) {
        // Override source to include log file path
        const sourceFile = path.basename(logPath);
        entry.source = `[${sourceFile}] ${entry.source}`;

        // Categorize
        if (entry.level === 'error' || entry.level === 'high' || entry.level === 'critical') {
          if (entry.level === 'critical' || entry.source.includes('authentication') || entry.source.includes('privilege-escalation') || entry.source.includes('malware')) {
            securityEvents.push(entry);
          } else {
            errors.push(entry);
          }
        } else if (entry.level === 'warning' || entry.level === 'info') {
          warnings.push(entry);
        }
      }

      // Brute force detection: look for failed auth lines and extract IPs
      if (patternNames.includes('authentication')) {
        const ips = extractIPs(line);
        if (ips.length > 0) {
          for (const ip of ips) {
            bruteForceMap.set(ip, (bruteForceMap.get(ip) || 0) + 1);
          }
        }
      }
    }
  }

  // ── 2. Process brute force findings ─────────────────────────────
  const bruteForceAttempts: { ip: string; count: number }[] = [];
  for (const [ip, count] of bruteForceMap.entries()) {
    if (count >= FAIL_THRESHOLD) {
      bruteForceAttempts.push({ ip, count });
    }
  }

  // Sort by count descending
  bruteForceAttempts.sort((a, b) => b.count - a.count);

  // ── 3. Generate findings ────────────────────────────────────────

  const existingLogs = logsAnalyzed.filter(l => l.exists);
  findings.push(
    makeFinding({
      title: `Log Analysis Complete`,
      severity: 'info',
      category: 'logging',
      description: `Analyzed ${existingLogs.length} log file(s) with ${totalEntries} total entries. Found ${errors.length} errors, ${warnings.length} warnings, and ${securityEvents.length} security-relevant events.`,
      evidence: `Files analyzed: ${existingLogs.map(l => `${path.basename(l.path)} (${l.linesRead} lines)`).join(', ')}`,
      asset: 'localhost',
    }),
  );

  if (bruteForceAttempts.length > 0) {
    const topIPs = bruteForceAttempts.slice(0, 10).map(b => `${b.ip} (${b.count} attempts)`).join('; ');
    findings.push(
      makeFinding({
        title: `Brute Force Detected from ${bruteForceAttempts.length} IP(s)`,
        severity: 'high',
        category: 'logging',
        description: `${bruteForceAttempts.length} IP address(es) have ${FAIL_THRESHOLD}+ failed authentication attempts, indicating possible brute-force attacks against SSH or other services.`,
        evidence: topIPs,
        asset: 'localhost',
        remediation: 'Consider implementing fail2ban, increasing password complexity, enabling key-based authentication, or blocking offending IPs at the firewall level.',
      }),
    );
  }

  // Successful root login
  const rootLoginEvents = securityEvents.filter(e => e.message.match(/Accepted password.*root/i));
  if (rootLoginEvents.length > 0) {
    findings.push(
      makeFinding({
        title: 'Successful Root Login Detected',
        severity: 'critical',
        category: 'logging',
        description: `${rootLoginEvents.length} successful root login(s) via password were found in the logs. This is a high-risk event — root password authentication should be disabled in favor of SSH keys.`,
        evidence: rootLoginEvents.map(e => `${e.timestamp}: ${e.message.slice(0, 120)}`).join('; '),
        asset: 'localhost',
        remediation: 'Disable PermitRootLogin and PasswordAuthentication in sshd_config. Use SSH key authentication only.',
      }),
    );
  }

  // Failed sudo
  const sudoFailedEvents = securityEvents.filter(e => e.message.match(/sudo.*FAILED/i));
  if (sudoFailedEvents.length > 0) {
    findings.push(
      makeFinding({
        title: `${sudoFailedEvents.length} Failed sudo Attempt(s)`,
        severity: 'high',
        category: 'logging',
        description: `${sudoFailedEvents.length} failed sudo command(s) were detected. These could indicate a user trying to escalate privileges without authorization.`,
        evidence: sudoFailedEvents.slice(0, 5).map(e => `${e.timestamp}: ${e.message.slice(0, 120)}`).join('; '),
        asset: 'localhost',
        remediation: 'Review sudo access policies. Consider implementing sudoers rules that restrict which users can run which commands.',
      }),
    );
  }

  // Malware indicators
  const malwareEvents = securityEvents.filter(e => e.source.includes('malware'));
  if (malwareEvents.length > 0) {
    findings.push(
      makeFinding({
        title: `${malwareEvents.length} Malware Indicator(s) in Logs`,
        severity: 'critical',
        category: 'logging',
        description: `Log entries matching known crypto-mining or malware patterns were found. This strongly suggests the system has been compromised by malware.`,
        evidence: malwareEvents.map(e => `${e.timestamp}: ${e.message.slice(0, 120)}`).join('; '),
        asset: 'localhost',
        remediation: 'Immediately isolate the system, kill suspicious processes, audit all running services, and perform a full forensic investigation.',
      }),
    );
  }

  // Crash/panic events
  const crashEvents = securityEvents.filter(e => e.source.includes('crash'));
  if (crashEvents.length > 0) {
    findings.push(
      makeFinding({
        title: `${crashEvents.length} Service Crash/Kernel Panic Event(s)`,
        severity: 'medium',
        category: 'logging',
        description: `${crashEvents.length} crash or kernel panic event(s) were detected. Repeated crashes may indicate a vulnerability being exploited or unstable software.`,
        evidence: crashEvents.slice(0, 5).map(e => `${e.timestamp}: ${e.message.slice(0, 120)}`).join('; '),
        asset: 'localhost',
        remediation: 'Review crash logs, update affected software, and check for known vulnerabilities in the crashing component.',
      }),
    );
  }

  // Inaccessible logs
  const inaccessibleLogs = logsAnalyzed.filter(l => !l.exists);
  if (inaccessibleLogs.length > 0) {
    findings.push(
      makeFinding({
        title: `${inaccessibleLogs.length} Log File(s) Not Accessible`,
        severity: 'info',
        category: 'logging',
        description: `${inaccessibleLogs.length} configured log file(s) do not exist or cannot be read. Missing logs may indicate that logging is not configured or that logs have been rotated/cleared.`,
        evidence: inaccessibleLogs.map(l => path.basename(l.path)).join(', '),
        asset: 'localhost',
      }),
    );
  }

  return {
    logsAnalyzed,
    totalEntries,
    errors,
    warnings,
    securityEvents,
    bruteForceAttempts,
    findings,
  };
}

export { type ReconFinding };
