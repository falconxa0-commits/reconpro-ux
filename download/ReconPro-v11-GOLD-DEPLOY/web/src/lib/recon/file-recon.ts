// ─── Local File System Security Scanner ─────────────────────────────
// Scans the project directory and common sensitive paths for security issues
// such as exposed secrets, insecure permissions, and suspicious configurations.

import fs from 'fs';
import path from 'path';
import type { ReconFinding } from './types';

// ── Types ──────────────────────────────────────────────────────────

export interface SensitiveFile {
  path: string;
  exists: boolean;
  size?: number;
  permissions?: string;
  containsSecrets?: boolean;
  matchedPatterns?: string[];
}

export interface FileResult {
  scannedPath: string;
  totalFilesChecked: number;
  sensitiveFiles: SensitiveFile[];
  insecurePermissions: string[];
  findings: ReconFinding[];
}

// ── Constants ─────────────────────────────────────────────────────

const DEFAULT_SCAN_PATH = '/home/z/my-project';

/** Pattern matching for secrets in file contents. */
const SECRET_PATTERNS = [
  /password\s*[=:]\s*['"][^'"]{4,}['"]/gi,
  /secret\s*[=:]\s*['"][^'"]{4,}['"]/gi,
  /api_?key\s*[=:]\s*['"][^'"]{8,}['"]/gi,
  /token\s*[=:]\s*['"][^'"]{8,}['"]/gi,
  /credential\s*[=:]\s*['"][^'"]{4,}['"]/gi,
  /private_?key\s*[=:]\s*['"][^'"]{8,}['"]/gi,
  /DATABASE_URL\s*[=:]\s*['"][^'"]{4,}['"]/gi,
  /DB_PASSWORD\s*[=:]\s*['"][^'"]{4,}['"]/gi,
];

/** Files to check for existence and content. */
const SENSITIVE_FILE_PATHS = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.staging',
  '.git/config',
  '.git/HEAD',
  'package.json',
  'prisma/schema.prisma',
  'tsconfig.json',
  'next.config.ts',
  'next.config.js',
  'next.config.mjs',
  '.npmrc',
  '.pypirc',
  'docker-compose.yml',
  'Dockerfile',
  'webpack.config.js',
  'credentials.json',
  'service-account.json',
  'firebase.json',
  '.firebase/service-account.json',
];

/** Suspicious patterns in package.json scripts. */
const SUSPICIOUS_SCRIPT_PATTERNS = [
  /curl.*\|.*sh/gi,           // curl | sh pipeline
  /wget.*\|.*sh/gi,           // wget | sh pipeline
  /chmod.*777/gi,             // 777 permissions
  /eval\s/gi,                 // eval usage
  /base64.*-d/gi,             // base64 decode
  /nc\s+-[el]/gi,             // netcat listener
  /\/dev\/tcp/gi,             // bash network
];

/**
 * Create a ReconFinding for this module.
 */
function makeFinding(
  overrides: Partial<Omit<ReconFinding, 'source'>> & Pick<ReconFinding, 'title'>,
): ReconFinding {
  return {
    severity: 'info',
    category: 'filesystem',
    description: '',
    evidence: null,
    asset: DEFAULT_SCAN_PATH,
    source: 'file-recon',
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Check a single file path for existence, permissions, and secret patterns.
 */
function checkFile(
  filePath: string,
): SensitiveFile {
  const result: SensitiveFile = {
    path: filePath,
    exists: false,
  };

  try {
    // Check existence
    if (!fs.existsSync(filePath)) {
      return result;
    }

    result.exists = true;

    // Get stats
    const stats = fs.statSync(filePath);
    result.size = stats.size;

    // Check permissions (symbolic notation)
    const mode = (stats.mode & 0o777);
    result.permissions = `0o${mode.toString(8)}`;

    // Only scan file contents for regular files under 1 MB
    if (stats.isFile() && stats.size > 0 && stats.size < 1024 * 1024) {
      try {
        const content = fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' });
        const matchedPatterns: string[] = [];

        for (const pattern of SECRET_PATTERNS) {
          const matches = content.match(pattern);
          if (matches) {
            for (const match of matches) {
              // Truncate the evidence to avoid leaking actual secrets
              const truncated = match.length > 60 ? match.slice(0, 60) + '...' : match;
              matchedPatterns.push(truncated);
            }
          }
        }

        if (matchedPatterns.length > 0) {
          result.containsSecrets = true;
          result.matchedPatterns = matchedPatterns;
        }
      } catch {
        // Cannot read file — permission denied or encoding issue
      }
    }
  } catch {
    // Cannot stat — permission denied
  }

  return result;
}

/**
 * Analyze package.json for suspicious scripts.
 */
function analyzePackageScripts(filePath: string): string[] {
  const suspicious: string[] = [];

  try {
    if (!fs.existsSync(filePath)) return suspicious;

    const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const pkg = JSON.parse(content) as { scripts?: Record<string, string> };

    if (pkg.scripts) {
      for (const [name, cmd] of Object.entries(pkg.scripts)) {
        for (const pattern of SUSPICIOUS_SCRIPT_PATTERNS) {
          if (pattern.test(cmd)) {
            suspicious.push(`script "${name}": ${cmd.slice(0, 100)}`);
            break;
          }
        }
      }
    }
  } catch {
    // Cannot parse
  }

  return suspicious;
}

/**
 * Check if file permissions are overly permissive.
 */
function isInsecurePermission(mode: number): boolean {
  // World-writable (others have write permission)
  return (mode & 0o002) !== 0;
}

// ── Main Export ───────────────────────────────────────────────────

/**
 * Scan the local file system for security-sensitive files and configurations.
 *
 * - Checks common sensitive paths (.env, .git, config files)
 * - Searches file contents for hardcoded secrets and credentials
 * - Analyzes package.json for suspicious script patterns
 * - Checks file permissions for insecure modes (world-writable)
 *
 * @param basePath - The root directory to scan. Defaults to `/home/z/my-project`.
 * @returns A `FileResult` containing checked files, permissions issues, and findings.
 */
export async function scanFileSystem(basePath?: string): Promise<FileResult> {
  const scanRoot = basePath || DEFAULT_SCAN_PATH;
  const findings: ReconFinding[] = [];
  const sensitiveFiles: SensitiveFile[] = [];
  const insecurePermissions: string[] = [];
  let totalFilesChecked = 0;

  // ── 1. Scan each sensitive file path ────────────────────────────
  for (const relPath of SENSITIVE_FILE_PATHS) {
    const absPath = path.resolve(scanRoot, relPath);
    const fileResult = checkFile(absPath);
    totalFilesChecked++;
    sensitiveFiles.push(fileResult);

    if (!fileResult.exists) continue;

    // Generate findings based on what we found

    // .env files
    if (relPath.startsWith('.env')) {
      if (fileResult.containsSecrets && fileResult.matchedPatterns && fileResult.matchedPatterns.length > 0) {
        findings.push(
          makeFinding({
            title: `Secrets Found in ${relPath}`,
            severity: 'critical',
            category: 'filesystem',
            description: `The environment file "${relPath}" contains potential secrets matching known patterns. Environment files should never be committed to version control and should be protected with strict file permissions.`,
            evidence: fileResult.matchedPatterns.slice(0, 5).join('; '),
            asset: absPath,
            remediation: 'Move secrets to a secure vault (e.g., HashiCorp Vault, AWS Secrets Manager) and use environment injection at deployment time.',
          }),
        );
      } else {
        findings.push(
          makeFinding({
            title: `Sensitive File Exists: ${relPath}`,
            severity: 'low',
            category: 'filesystem',
            description: `The environment file "${relPath}" exists. While no secrets were matched by pattern, this file may still contain sensitive configuration values. Verify it is not committed to version control.`,
            evidence: `Size: ${fileResult.size ?? 'unknown'} bytes, Permissions: ${fileResult.permissions ?? 'unknown'}`,
            asset: absPath,
          }),
        );
      }
    }

    // .git directory
    if (relPath.startsWith('.git/')) {
      findings.push(
        makeFinding({
          title: `Git Directory Exposed: ${relPath}`,
          severity: 'high',
          category: 'filesystem',
          description: `The Git metadata file "${relPath}" is accessible. If this application is deployed to a publicly accessible location, the entire repository history including committed secrets could be downloaded.`,
          evidence: `Path: ${absPath}, Permissions: ${fileResult.permissions ?? 'unknown'}`,
          asset: absPath,
          remediation: 'Ensure .git directories are never deployed to production or accessible via web servers.',
        }),
      );
    }

    // package.json — check scripts
    if (relPath === 'package.json') {
      const suspiciousScripts = analyzePackageScripts(absPath);
      if (suspiciousScripts.length > 0) {
        findings.push(
          makeFinding({
            title: `${suspiciousScripts.length} Suspicious Script(s) in package.json`,
            severity: 'high',
            category: 'filesystem',
            description: `Package.json contains scripts matching suspicious patterns (e.g., shell pipelines, eval, reverse shells). These could be indicators of supply chain compromise or misconfiguration.`,
            evidence: suspiciousScripts.join('; '),
            asset: absPath,
            remediation: 'Review all scripts in package.json. Remove any that download and execute remote code or modify system permissions.',
          }),
        );
      }
    }

    // Config files — check for hardcoded database URLs
    if (relPath === 'prisma/schema.prisma' || relPath === 'docker-compose.yml') {
      if (fileResult.containsSecrets && fileResult.matchedPatterns) {
        findings.push(
          makeFinding({
            title: `Hardcoded Credentials in ${relPath}`,
            severity: 'high',
            category: 'filesystem',
            description: `Configuration file "${relPath}" contains patterns matching hardcoded credentials or database URLs. These should be externalized via environment variables.`,
            evidence: fileResult.matchedPatterns.slice(0, 5).join('; '),
            asset: absPath,
            remediation: 'Replace hardcoded values with environment variable references (e.g., env("DATABASE_URL")).',
          }),
        );
      }
    }

    // Credential files
    if (relPath.includes('credential') || relPath.includes('service-account')) {
      findings.push(
        makeFinding({
          title: `Credential File Detected: ${relPath}`,
          severity: 'high',
          category: 'filesystem',
          description: `A credential or service account file "${relPath}" was found in the project directory. These files typically contain long-lived secrets with broad permissions.`,
          evidence: `Path: ${absPath}, Size: ${fileResult.size ?? 'unknown'} bytes`,
          asset: absPath,
          remediation: 'Store credential files outside the project tree and reference them via environment variables. Add to .gitignore.',
        }),
      );
    }

    // Check permissions
    if (fileResult.permissions) {
      const mode = parseInt(fileResult.permissions.replace('0o', ''), 8);
      if (isInsecurePermission(mode)) {
        insecurePermissions.push(absPath);
        findings.push(
          makeFinding({
            title: `Insecure File Permissions: ${relPath}`,
            severity: 'medium',
            category: 'filesystem',
            description: `File "${relPath}" has world-writable permissions (${fileResult.permissions}). Any user on the system can modify this file, potentially injecting malicious code or secrets.`,
            evidence: `Permissions: ${fileResult.permissions}`,
            asset: absPath,
            remediation: `Run: chmod 640 ${absPath} or more restrictive.`,
          }),
        );
      }
    }
  }

  // ── 2. Summary finding ─────────────────────────────────────────
  const existingCount = sensitiveFiles.filter(f => f.exists).length;
  findings.push(
    makeFinding({
      title: `File System Scan Complete`,
      severity: 'info',
      category: 'filesystem',
      description: `Scanned ${totalFilesChecked} file path(s) in "${scanRoot}". Found ${existingCount} existing files, ${sensitiveFiles.filter(f => f.containsSecrets).length} with secret patterns, and ${insecurePermissions.length} with insecure permissions.`,
      evidence: `Scanned path: ${scanRoot}`,
      asset: scanRoot,
    }),
  );

  return {
    scannedPath: scanRoot,
    totalFilesChecked,
    sensitiveFiles,
    insecurePermissions,
    findings,
  };
}

export { type ReconFinding };
