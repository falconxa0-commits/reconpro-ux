/**
 * VibeSec Diff Scanner for ShitCode Shield
 *
 * Pattern-based security scanning of PR diffs WITHOUT making HTTP requests.
 * Detects exposed secrets, insecure patterns, missing auth, and debug code.
 */

export interface DiffFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line: number;
  finding: string;
  category: string;
  match: string;
}

export interface DiffScanResult {
  findings: DiffFinding[];
  score: number;
  grade: string;
  severityCounts: Record<string, number>;
}

/** Line context from a parsed diff */
interface DiffLine {
  filename: string;
  lineNum: number;
  content: string;
}

// ══════════════════════════════════════════════════════════════════════════
// SECRET PATTERNS
// ══════════════════════════════════════════════════════════════════════════

const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string; severity: 'critical' | 'high' }> = [
  // Stripe
  { pattern: /\bsk_live_[a-zA-Z0-9]{24,}/, label: 'Exposed Stripe live key', severity: 'critical' },
  { pattern: /\bsk_test_[a-zA-Z0-9]{24,}/, label: 'Exposed Stripe test key', severity: 'high' },
  // GitHub
  { pattern: /\bghp_[a-zA-Z0-9]{36,}/, label: 'Exposed GitHub PAT', severity: 'critical' },
  { pattern: /\bgho_[a-zA-Z0-9]{36,}/, label: 'Exposed GitHub OAuth token', severity: 'critical' },
  { pattern: /\bghu_[a-zA-Z0-9]{36,}/, label: 'Exposed GitHub user token', severity: 'critical' },
  // AWS
  { pattern: /\bAKIA[A-Z0-9]{16}/, label: 'Exposed AWS access key', severity: 'critical' },
  // GCP
  { pattern: /\bAIza[a-zA-Z0-9_-]{35}/, label: 'Exposed GCP API key', severity: 'critical' },
  // JWT tokens
  { pattern: /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, label: 'Exposed JWT token', severity: 'critical' },
  // Connection strings
  { pattern: /DATABASE_URL\s*[:=]\s*['"]?[\w+]+:\/\/[\w:]+@[\w.-]+/, label: 'Exposed DATABASE_URL', severity: 'critical' },
  { pattern: /MONGODB_URI\s*[:=]\s*['"]?mongodb(?:\+srv)?:\/\//, label: 'Exposed MONGODB_URI', severity: 'critical' },
  { pattern: /REDIS_URL\s*[:=]\s*['"]?redis(?:\+srv)?:\/\//, label: 'Exposed REDIS_URL', severity: 'critical' },
  // Supabase
  { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?[\w.-]+['"]?/, label: 'Exposed SUPABASE_SERVICE_ROLE_KEY', severity: 'critical' },
  { pattern: /SUPABASE_ANON_KEY\s*[:=]\s*['"]?[\w.-]+['"]?/, label: 'Exposed SUPABASE_ANON_KEY', severity: 'high' },
  // Firebase
  { pattern: /FIREBASE_API_KEY\s*[:=]\s*['"]?[\w.-]+['"]?/, label: 'Exposed FIREBASE_API_KEY', severity: 'high' },
  // Generic dangerous assignments
  { pattern: /(?:password|secret|api_key|api_secret|token|private_key)\s*[:=]\s*['"][^'"]{8,}['"]/i, label: 'Hardcoded credential assignment', severity: 'critical' },
  // Slack
  { pattern: /xox[baprs]-[a-zA-Z0-9-]+/, label: 'Exposed Slack token', severity: 'critical' },
  // Twilio
  { pattern: /SK[a-fA-F0-9]{32}/, label: 'Exposed Twilio API key', severity: 'critical' },
  // SendGrid
  { pattern: /SG\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, label: 'Exposed SendGrid API key', severity: 'critical' },
];

// ══════════════════════════════════════════════════════════════════════════
// HARDCODED CREDENTIALS
// ══════════════════════════════════════════════════════════════════════════

const HARDCODED_CRED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /['"]admin['"]\s*[,\/]|['"]admin['"]\s*:\s*['"](?:admin|password|1234)['"]/i, label: 'Hardcoded admin credentials' },
  { pattern: /['"]root['"]\s*[,\/]|['"]root['"]\s*:\s*['"](?:password|root|toor)['"]/i, label: 'Hardcoded root credentials' },
  { pattern: /['"]test['"]\s*:\s*['"]test['"]/, label: 'Hardcoded test credentials' },
  { pattern: /['"](?:user|pass|password)['"]\s*:\s*['"](?:user|pass|password|123|test)['"\s]/i, label: 'Hardcoded user/password' },
];

// ══════════════════════════════════════════════════════════════════════════
// INSECURE PATTERNS
// ══════════════════════════════════════════════════════════════════════════

const INSECURE_PATTERNS: Array<{ pattern: RegExp; label: string; severity: 'critical' | 'high' | 'medium' | 'low' }> = [
  // Code injection
  { pattern: /\beval\s*\(/, label: '`eval()` usage detected', severity: 'high' },
  { pattern: /\binnerHTML\s*=/, label: '`innerHTML` assignment detected', severity: 'high' },
  { pattern: /dangerouslySetInnerHTML/, label: '`dangerouslySetInnerHTML` usage detected', severity: 'high' },
  // CORS
  { pattern: /origin\s*:\s*['"]\*['"]/i, label: 'Wildcard CORS origin `*`', severity: 'medium' },
  { pattern: /Access-Control-Allow-Origin\s*:\s*['"]\*['"]/, label: 'Wildcard CORS header', severity: 'medium' },
  // TLS
  { pattern: /--insecure/, label: '`--insecure` flag detected', severity: 'high' },
  { pattern: /verify\s*=\s*False/, label: 'TLS verification disabled', severity: 'high' },
  { pattern: /NODE_TLS_REJECT_UNAUTHORIZED\s*[:=]\s*['"]?0/, label: 'Node TLS verification disabled', severity: 'high' },
  // SQL injection
  { pattern: /SELECT\s+\*\s+FROM.*['"+]/i, label: 'Potential SQL injection (string concat)', severity: 'high' },
  { pattern: /\$(?:\{|\w+)\s*(?:===|==|!=).*['"\w]/, label: 'Potential template literal injection', severity: 'medium' },
  // Command injection
  { pattern: /(?:exec|spawn|system|shell_exec)\s*\([^)]*(?:req\.(?:query|body|params)|process\.env)/, label: 'Potential command injection via user input', severity: 'critical' },
  // Path traversal
  { pattern: /(?:readFile|writeFile|unlink|createReadStream)\s*\([^)]*(?:req\.(?:query|body|params)|path\.join\s*\(\s*__dirname\s*,\s*req)/, label: 'Potential path traversal', severity: 'high' },
];

// ══════════════════════════════════════════════════════════════════════════
// DEBUG CODE PATTERNS
// ══════════════════════════════════════════════════════════════════════════

const DEBUG_PATTERNS: Array<{ pattern: RegExp; label: string; productionFiles?: boolean }> = [
  { pattern: /\bconsole\.(log|debug|info|warn|error|trace)\s*\(/, label: '`console.log()` debug statement', productionFiles: true },
  { pattern: /^\s*debugger\s*;?\s*$/, label: '`debugger` statement', productionFiles: true },
  { pattern: /\bprint\s*\(/, label: '`print()` debug statement', productionFiles: true },
  { pattern: /\bconsole\.table\s*\(/, label: '`console.table()` debug statement', productionFiles: true },
  { pattern: /\bconsole\.dir\s*\(/, label: '`console.dir()` debug statement', productionFiles: true },
];

// ══════════════════════════════════════════════════════════════════════════
// MISSING AUTH CHECK PATTERNS
// ══════════════════════════════════════════════════════════════════════════

const API_ROUTE_EXTENSIONS = [
  '/api/',
  '.api.',
  'routes/',
  'controller',
  'handler',
  'middleware',
];

const AUTH_IMPORT_PATTERNS = [
  /auth/i,
  /middleware/i,
  /session/i,
  /jwt/i,
  /passport/i,
  /next-auth/i,
  /clerk/i,
  /lucia/i,
  /supabase.*auth/i,
  /firebase.*auth/i,
  /requireAuth/i,
  /withAuth/i,
  /protect/i,
  /authenticate/i,
  /authorize/i,
];

/**
 * Parse a unified diff into added lines with file/line context.
 */
function parseDiffLines(diff: string): DiffLine[] {
  const result: DiffLine[] = [];
  let currentFile = '';
  let newLineNum = 0;

  const lines = diff.split('\n');
  for (const line of lines) {
    // File header
    const fileMatch = line.match(/^diff --git a\/(.*) b\/(.*)$/);
    if (fileMatch) {
      currentFile = fileMatch[2];
      newLineNum = 0;
      continue;
    }

    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@\s*-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s*@@/);
    if (hunkMatch) {
      newLineNum = parseInt(hunkMatch[1], 10) - 1;
      continue;
    }

    // Added line
    if (line.startsWith('+') && !line.startsWith('+++')) {
      newLineNum++;
      result.push({
        filename: currentFile,
        lineNum: newLineNum,
        content: line.slice(1),
      });
    } else if (!line.startsWith('-') && !line.startsWith('\\')) {
      // Context line
      if (newLineNum > 0) newLineNum++;
    }
  }

  return result;
}

/**
 * Check if a file is a production file (not test/dev).
 */
function isProductionFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return !(
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('__tests__') ||
    lower.includes('__mocks__') ||
    lower.includes('node_modules') ||
    lower.includes('.stories.') ||
    lower.endsWith('.test.ts') ||
    lower.endsWith('.test.tsx') ||
    lower.endsWith('.test.js') ||
    lower.endsWith('.spec.ts') ||
    lower.endsWith('.spec.js') ||
    lower.endsWith('.test.py') ||
    lower.endsWith('test.yml') ||
    lower.endsWith('test.yaml')
  );
}

/**
 * Scan for exposed secrets.
 */
function scanSecrets(diffLines: DiffLine[]): DiffFinding[] {
  const findings: DiffFinding[] = [];

  for (const dl of diffLines) {
    for (const { pattern, label, severity } of SECRET_PATTERNS) {
      if (pattern.test(dl.content)) {
        const match = dl.content.match(pattern);
        findings.push({
          severity,
          file: dl.filename,
          line: dl.lineNum,
          finding: label,
          category: 'exposed_secret',
          match: match ? match[0].slice(0, 40) : '',
        });
        break; // One finding per line for secrets
      }
    }
  }

  return findings;
}

/**
 * Scan for hardcoded credentials.
 */
function scanHardcodedCreds(diffLines: DiffLine[]): DiffFinding[] {
  const findings: DiffFinding[] = [];

  for (const dl of diffLines) {
    for (const { pattern, label } of HARDCODED_CRED_PATTERNS) {
      if (pattern.test(dl.content)) {
        findings.push({
          severity: 'high',
          file: dl.filename,
          line: dl.lineNum,
          finding: label,
          category: 'hardcoded_credentials',
          match: dl.content.trim().slice(0, 40),
        });
        break;
      }
    }
  }

  return findings;
}

/**
 * Scan for insecure code patterns.
 */
function scanInsecurePatterns(diffLines: DiffLine[]): DiffFinding[] {
  const findings: DiffFinding[] = [];

  for (const dl of diffLines) {
    for (const { pattern, label, severity } of INSECURE_PATTERNS) {
      if (pattern.test(dl.content)) {
        findings.push({
          severity,
          file: dl.filename,
          line: dl.lineNum,
          finding: label,
          category: 'insecure_pattern',
          match: dl.content.trim().slice(0, 40),
        });
        break; // One finding per line
      }
    }
  }

  return findings;
}

/**
 * Scan for debug code left in.
 */
function scanDebugCode(diffLines: DiffLine[]): DiffFinding[] {
  const findings: DiffFinding[] = [];

  for (const dl of diffLines) {
    // Skip non-production files for debug checks
    if (!isProductionFile(dl.filename)) continue;

    for (const { pattern, label } of DEBUG_PATTERNS) {
      if (pattern.test(dl.content)) {
        findings.push({
          severity: 'low',
          file: dl.filename,
          line: dl.lineNum,
          finding: label,
          category: 'debug_code',
          match: dl.content.trim().slice(0, 40),
        });
        break;
      }
    }
  }

  return findings;
}

/**
 * Scan for new API routes without auth checks.
 */
function scanMissingAuth(diffLines: DiffLine[]): DiffFinding[] {
  const findings: DiffFinding[] = [];

  // Group lines by file
  const fileLines = new Map<string, DiffLine[]>();
  for (const dl of diffLines) {
    if (!fileLines.has(dl.filename)) {
      fileLines.set(dl.filename, []);
    }
    fileLines.get(dl.filename)!.push(dl);
  }

  for (const [filename, lines] of fileLines) {
    // Check if this is an API route file
    const isApiRoute = API_ROUTE_EXTENSIONS.some((ext) =>
      filename.toLowerCase().includes(ext)
    );
    if (!isApiRoute) continue;

    // Check if any auth import exists in the file
    const allContent = lines.map((l) => l.content).join('\n');
    const hasAuthImport = AUTH_IMPORT_PATTERNS.some((p) => p.test(allContent));

    if (!hasAuthImport && lines.length >= 5) {
      findings.push({
        severity: 'medium',
        file: filename,
        line: lines[0].lineNum,
        finding: 'No auth check on new API route',
        category: 'missing_auth',
        match: filename,
      });
    }
  }

  return findings;
}

/**
 * Compute VibeSec grade from findings.
 */
function computeGrade(findings: DiffFinding[]): { score: number; grade: string } {
  const deductionMap: Record<string, number> = {
    critical: 15,
    high: 10,
    medium: 5,
    low: 2,
    info: 0,
  };

  let deductions = 0;
  for (const f of findings) {
    deductions += deductionMap[f.severity] || 0;
  }

  // Cap deductions at 100
  deductions = Math.min(deductions, 100);
  const score = Math.max(0, 100 - deductions);

  let grade: string;
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 65) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 35) grade = 'D';
  else grade = 'F';

  return { score, grade };
}

/**
 * Parse ignore patterns and filter out findings from matching files.
 */
function applyIgnorePatterns(
  findings: DiffFinding[],
  ignorePatterns: string[]
): DiffFinding[] {
  if (ignorePatterns.length === 0) return findings;

  return findings.filter((f) => {
    for (const pattern of ignorePatterns) {
      const regexStr = pattern
        .trim()
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      try {
        const regex = new RegExp(`^${regexStr}$`, 'i');
        if (regex.test(f.file)) return false;
      } catch {
        // Invalid regex, skip
      }
    }
    return true;
  });
}

/**
 * Scan a PR diff for security vulnerabilities.
 *
 * @param diff - The unified diff string
 * @param ignorePatterns - Glob patterns from .vibesec-ignore
 * @returns Scan result with findings, score, and grade
 */
export function scanDiff(
  diff: string,
  ignorePatterns: string[] = []
): DiffScanResult {
  const diffLines = parseDiffLines(diff);

  // Skip lines from ignored files
  const filteredLines = diffLines.filter((dl) => {
    for (const pattern of ignorePatterns) {
      const regexStr = pattern
        .trim()
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      try {
        const regex = new RegExp(`^${regexStr}$`, 'i');
        if (regex.test(dl.filename)) return false;
      } catch {
        // skip
      }
    }
    return true;
  });

  // Run all scanners
  const allFindings: DiffFinding[] = [
    ...scanSecrets(filteredLines),
    ...scanHardcodedCreds(filteredLines),
    ...scanInsecurePatterns(filteredLines),
    ...scanDebugCode(filteredLines),
    ...scanMissingAuth(filteredLines),
  ];

  // Apply ignore patterns
  const findings = applyIgnorePatterns(allFindings, ignorePatterns);

  // Deduplicate by file+line+category
  const seen = new Set<string>();
  const deduped = findings.filter((f) => {
    const key = `${f.file}:${f.line}:${f.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by severity
  const severityOrder: Record<string, number> = {
    critical: 0, high: 1, medium: 2, low: 3, info: 4,
  };
  deduped.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

  // Count severities
  const severityCounts: Record<string, number> = {};
  for (const f of deduped) {
    severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
  }

  // Compute grade
  const { score, grade } = computeGrade(deduped);

  return {
    findings: deduped,
    score,
    grade,
    severityCounts,
  };
}
