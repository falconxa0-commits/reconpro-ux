// ─── Local Process Security Analysis ────────────────────────────────
// Analyzes running processes on the local system using native Node.js APIs
// and child_process for system-level process enumeration.

import { execSync } from 'child_process';
import os from 'os';
import type { ReconFinding } from './types';

// ── Types ──────────────────────────────────────────────────────────

export interface ProcessInfo {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  command: string;
}

export interface ProcessResult {
  totalProcesses: number;
  rootProcesses: ProcessInfo[];
  highMemoryProcesses: ProcessInfo[];
  suspiciousProcesses: ProcessInfo[];
  debugToolsRunning: ProcessInfo[];
  webServersRunning: ProcessInfo[];
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  sensitiveEnvVars: string[];
  findings: ReconFinding[];
}

// ── Constants ───────────────────────────────────────────────────────

/** Process names that suggest crypto-mining malware. */
const MINER_PATTERNS = /xmrig|minerd|cryptonight|kworkerds|cpuminer|bfgminer|cgminer|ethminer| Claymore/i;

/** Debugging / packet-capture tools that should not run in production. */
const DEBUG_TOOL_PATTERNS = /strace|gdb|ltrace|tcpdump|tshark|wireshark|valgrind|radare2|ida/i;

/** Common web server process names. */
const WEB_SERVER_PATTERNS = /node|nginx|apache2?|httpd|caddy|express|next/i;

/** Environment variable name patterns that indicate secrets. */
const SENSITIVE_ENV_PATTERNS = /api_key|apikey|secret|password|passwd|token|credential|private_key|auth_key|access_key|database_url|db_url|jwt_secret/i;

const HIGH_MEMORY_THRESHOLD = 50; // percent

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Parse a single line from `ps aux` output into a ProcessInfo object.
 * Format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
 */
function parsePsLine(line: string): ProcessInfo | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 11) return null;

  // The command may contain spaces, so everything from index 10 onward is the command
  const user = parts[0];
  const pid = parseInt(parts[1], 10);
  const cpu = parseFloat(parts[2]);
  const mem = parseFloat(parts[3]);
  const command = parts.slice(10).join(' ');

  if (isNaN(pid) || isNaN(cpu) || isNaN(mem)) return null;

  return { pid, user, cpu, mem, command };
}

/**
 * Check whether an environment variable name looks sensitive.
 */
function isSensitiveEnvVar(name: string): boolean {
  return SENSITIVE_ENV_PATTERNS.test(name);
}

/**
 * Create a ReconFinding for this module.
 */
function makeFinding(
  overrides: Partial<Omit<ReconFinding, 'source'>> & Pick<ReconFinding, 'title'>,
): ReconFinding {
  return {
    severity: 'info',
    category: 'process',
    description: '',
    evidence: null,
    asset: `${os.hostname()} (${os.type()})`,
    source: 'process-recon',
    ...overrides,
  };
}

// ── Main Export ───────────────────────────────────────────────────

/**
 * Analyze running processes on the local system.
 *
 * - Enumerates all running processes via `ps aux`
 * - Identifies root-owned processes, high-memory consumers, and suspicious binaries
 * - Gathers Node.js runtime information and checks for leaked secrets in env vars
 *
 * @returns A `ProcessResult` containing process list, security findings, and Node.js metadata.
 */
export async function analyzeProcesses(): Promise<ProcessResult> {
  const findings: ReconFinding[] = [];
  const allProcesses: ProcessInfo[] = [];
  const rootProcesses: ProcessInfo[] = [];
  const highMemoryProcesses: ProcessInfo[] = [];
  const suspiciousProcesses: ProcessInfo[] = [];
  const debugToolsRunning: ProcessInfo[] = [];
  const webServersRunning: ProcessInfo[] = [];

  // ── 1. Enumerate processes via ps aux ────────────────────────────
  try {
    const output = execSync('ps aux', { timeout: 5000, encoding: 'utf-8' });
    const lines = output.trim().split('\n');

    for (let i = 1; i < lines.length; i++) {
      const proc = parsePsLine(lines[i]);
      if (!proc) continue;

      allProcesses.push(proc);

      // Root-owned processes
      if (proc.user === 'root') {
        rootProcesses.push(proc);
      }

      // High memory consumers
      if (proc.mem > HIGH_MEMORY_THRESHOLD) {
        highMemoryProcesses.push(proc);
      }

      // Suspicious / miner processes
      if (MINER_PATTERNS.test(proc.command)) {
        suspiciousProcesses.push(proc);
      }

      // Debug tools
      if (DEBUG_TOOL_PATTERNS.test(proc.command)) {
        debugToolsRunning.push(proc);
      }

      // Web servers
      if (WEB_SERVER_PATTERNS.test(proc.command)) {
        webServersRunning.push(proc);
      }
    }
  } catch {
    findings.push(
      makeFinding({
        title: 'Process Enumeration Failed',
        severity: 'medium',
        description: 'Unable to enumerate running processes via `ps aux`. The system may be resource-constrained or the command is not available.',
        evidence: 'ps aux returned an error',
        asset: os.hostname(),
      }),
    );
  }

  // ── Generate findings for processes ──────────────────────────────

  if (rootProcesses.length > 0) {
    const criticalCount = rootProcesses.length;
    findings.push(
      makeFinding({
        title: `${criticalCount} Process(es) Running as Root`,
        severity: 'critical',
        category: 'process',
        description: `${criticalCount} process(es) are running with root privileges. In a production environment this significantly increases the attack surface — a compromised root process can take full control of the system.`,
        evidence: rootProcesses.map(p => `PID ${p.pid}: ${p.command.slice(0, 80)}`).join('; '),
      }),
    );
  }

  if (highMemoryProcesses.length > 0) {
    findings.push(
      makeFinding({
        title: `${highMemoryProcesses.length} Process(es) Using > ${HIGH_MEMORY_THRESHOLD}% Memory`,
        severity: 'medium',
        category: 'process',
        description: `${highMemoryProcesses.length} process(es) exceed the ${HIGH_MEMORY_THRESHOLD}% memory threshold. This could indicate a memory leak, misconfiguration, or denial-of-service condition.`,
        evidence: highMemoryProcesses.map(p => `PID ${p.pid} (${p.mem}%): ${p.command.slice(0, 60)}`).join('; '),
      }),
    );
  }

  if (suspiciousProcesses.length > 0) {
    findings.push(
      makeFinding({
        title: `${suspiciousProcesses.length} Suspicious Process(es) Detected (Possible Miner)`,
        severity: 'critical',
        category: 'process',
        description: `Process(es) matching known crypto-mining patterns were found running on the system. This is a strong indicator of a cryptocurrency mining malware infection.`,
        evidence: suspiciousProcesses.map(p => `PID ${p.pid}: ${p.command.slice(0, 100)}`).join('; '),
        remediation: 'Immediately kill the suspicious processes, investigate how they were deployed, and audit all running services.',
      }),
    );
  }

  if (debugToolsRunning.length > 0) {
    findings.push(
      makeFinding({
        title: `${debugToolsRunning.length} Debug/Diagnostic Tool(s) Running`,
        severity: 'medium',
        category: 'process',
        description: `Debug or diagnostic tools (${debugToolsRunning.map(d => d.command.split(' ')[0]).join(', ')}) are running. These can be used to inspect sensitive data or modify process behaviour in production.`,
        evidence: debugToolsRunning.map(p => `PID ${p.pid}: ${p.command.slice(0, 80)}`).join('; '),
        remediation: 'Ensure debug tools are only used in development environments and are not left running in production.',
      }),
    );
  }

  if (webServersRunning.length > 0) {
    findings.push(
      makeFinding({
        title: `${webServersRunning.length} Web Server Process(es) Running`,
        severity: 'info',
        category: 'process',
        description: `Web server processes detected: ${webServersRunning.map(w => w.command.split(' ')[0]).join(', ')}. These expose network services and should be properly secured.`,
        evidence: webServersRunning.map(p => `PID ${p.pid}: ${p.command.slice(0, 80)}`).join('; '),
      }),
    );
  }

  findings.push(
    makeFinding({
      title: `Total ${allProcesses.length} Processes Enumerated`,
      severity: 'info',
      category: 'process',
      description: `Successfully enumerated ${allProcesses.length} running processes on ${os.hostname()} (${os.type()} ${os.release()}).`,
      evidence: `Platform: ${process.platform}, Arch: ${process.arch}`,
    }),
  );

  // ── 2. Node.js process information ──────────────────────────────

  const sensitiveEnvVars: string[] = [];
  for (const key of Object.keys(process.env)) {
    if (isSensitiveEnvVar(key)) {
      sensitiveEnvVars.push(key);
    }
  }

  if (sensitiveEnvVars.length > 0) {
    findings.push(
      makeFinding({
        title: `${sensitiveEnvVars.length} Sensitive Environment Variable(s) Detected`,
        severity: 'high',
        category: 'process',
        description: `Environment variables matching sensitive patterns were found in the process environment: ${sensitiveEnvVars.join(', ')}. These could be leaked through process info, crash dumps, or error reporting.`,
        evidence: sensitiveEnvVars.join(', '),
        remediation: 'Use a secrets manager (e.g., HashiCorp Vault, AWS Secrets Manager) instead of environment variables for sensitive values.',
      }),
    );
  }

  // ── 3. Build result ─────────────────────────────────────────────

  return {
    totalProcesses: allProcesses.length,
    rootProcesses,
    highMemoryProcesses,
    suspiciousProcesses,
    debugToolsRunning,
    webServersRunning,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    sensitiveEnvVars,
    findings,
  };
}

export { type ReconFinding };
