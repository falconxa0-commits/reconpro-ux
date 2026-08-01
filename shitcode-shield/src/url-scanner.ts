/**
 * Optional Live URL Scanner for ShitCode Shield
 *
 * If `scan-deployed-url` is provided, shells out to the VibeSec Python scanner
 * and merges the results into the diff scan results.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { DiffFinding } from './diff-scanner';

export interface URLScanResult {
  findings: DiffFinding[];
  score: number;
  grade: string;
  rawOutput: string;
}

/**
 * Find the VibeSec scanner.py in common locations.
 */
function findScannerPath(): string | null {
  const candidates = [
    // Same repo root
    path.join(process.cwd(), 'vibesec-cli', 'vibesec', 'scanner.py'),
    path.join(process.cwd(), 'scanner.py'),
    // Adjacent repos (monorepo)
    path.join(process.cwd(), '..', 'vibesec-cli', 'vibesec', 'scanner.py'),
    // Global install
    'scanner.py',
  ];

  for (const candidate of candidates) {
    try {
      execSync(`test -f ${candidate}`, { stdio: 'pipe' });
      return candidate;
    } catch {
      // not found, try next
    }
  }

  return null;
}

/**
 * Run a VibeSec scan against a deployed URL.
 *
 * Shells out to the Python VibeSec scanner.
 * If the scanner is not available, returns an empty result.
 *
 * @param url - The deployed URL to scan
 * @param timeout - Timeout in seconds (default 10)
 * @returns URLScanResult with findings mapped to DiffFinding format
 */
export function scanURL(url: string, timeout: number = 10): URLScanResult {
  const scannerPath = findScannerPath();

  if (!scannerPath) {
    return {
      findings: [],
      score: -1,
      grade: '?',
      rawOutput: 'VibeSec scanner not found. Skipping live URL scan.',
    };
  }

  try {
    const result = execSync(
      `python3 ${scannerPath} ${url} --json --timeout ${timeout}`,
      {
        encoding: 'utf-8',
        timeout: (timeout + 5) * 1000, // Extra buffer for startup
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    const parsed = JSON.parse(result);
    const findings = mapFindings(parsed, url);

    return {
      findings,
      score: parsed.vibesec_score ?? parsed.score ?? -1,
      grade: parsed.grade ?? '?',
      rawOutput: result,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      findings: [],
      score: -1,
      grade: '?',
      rawOutput: `URL scan failed: ${errMsg}`,
    };
  }
}

/**
 * Map VibeSec Python scanner results to DiffFinding format.
 */
function mapFindings(parsed: Record<string, unknown>, url: string): DiffFinding[] {
  const findings: DiffFinding[] = [];
  const rawFindings = parsed.findings as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(rawFindings)) return findings;

  for (const f of rawFindings) {
    findings.push({
      severity: (f.severity as DiffFinding['severity']) || 'medium',
      file: `[Live] ${url}`,
      line: 0,
      finding: (f.title as string) || (f.description as string) || 'Unknown finding',
      category: (f.category as string) || 'live_scan',
      match: (f.evidence as string) || '',
    });
  }

  return findings;
}
