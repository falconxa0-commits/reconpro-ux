/**
 * PR Comment Formatter for ShitCode Shield
 *
 * Generates branded or minimal PR comments from scan results.
 */

import { AIDetectionResult } from './ai-detector';
import { DiffFinding, DiffScanResult } from './diff-scanner';

export interface ScanReport {
  score: number;
  grade: string;
  aiDetections: AIDetectionResult[];
  diffFindings: DiffFinding[];
  urlFindings?: DiffFinding[];
  severityCounts: Record<string, number>;
}

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
  info: '⚪',
};

const SEVERITY_ORDER: string[] = ['critical', 'high', 'medium', 'low', 'info'];

/**
 * Format the full scan report as a PR comment.
 *
 * @param report - Aggregated scan report
 * @param style - 'branded' or 'minimal'
 * @returns Markdown string for the PR comment
 */
export function formatComment(report: ScanReport, style: 'branded' | 'minimal' = 'branded'): string {
  if (style === 'minimal') {
    return formatMinimal(report);
  }
  return formatBranded(report);
}

/**
 * Generate the summary line for the report.
 */
function getSummary(report: ScanReport): string {
  const hasCritical = (report.severityCounts.critical || 0) > 0;
  const hasHigh = (report.severityCounts.high || 0) > 0;
  const hasAi = report.aiDetections.some((d) => d.isAiGenerated);

  if (hasCritical) {
    return 'This PR contains **critical security vulnerabilities** that must be fixed before merging.';
  }
  if (hasHigh) {
    return 'This PR contains high-severity security findings that should be reviewed before merging.';
  }
  if (hasAi && report.diffFindings.length > 0) {
    return 'This PR contains AI-generated code with security vulnerabilities. Review findings before merging.';
  }
  if (hasAi) {
    return 'AI-generated code detected. No critical security issues found, but review recommended.';
  }
  if (report.diffFindings.length > 0) {
    return 'Security findings detected. Review before merging.';
  }
  return 'No security issues detected. This PR looks clean. \u2705';
}

/**
 * Format the branded comment.
 */
function formatBranded(report: ScanReport): string {
  const lines: string[] = [];

  // Header
  lines.push('## \u26a0\ufe0f VibeSec ShitCode Shield Report');
  lines.push('');
  lines.push(`\ud83d\udd12 **VibeSec Grade: ${report.grade}** (${report.score}/100)`);
  lines.push('');

  // AI Detection Section
  const aiDetected = report.aiDetections.filter((d) => d.isAiGenerated);
  if (aiDetected.length > 0) {
    lines.push('### \ud83e\udd16 AI-Generated Code Detected');
    for (const detection of aiDetected) {
      const signalCount = detection.signals.length;
      const signalList = detection.signals.slice(0, 3).join(', ');
      const extra = signalCount > 3 ? ` +${signalCount - 3} more` : '';
      lines.push(
        `- \`${detection.file}\` — **${capitalize(detection.confidence)}** confidence (${signalCount} signals: ${signalList}${extra})`
      );
    }
    lines.push('');
  }

  // All findings (diff + url)
  const allFindings = [...report.diffFindings];
  if (report.urlFindings && report.urlFindings.length > 0) {
    allFindings.push(...report.urlFindings);
  }

  if (allFindings.length > 0) {
    lines.push(`### \ud83d\udea8 Security Findings (${allFindings.length})`);
    lines.push('');
    lines.push('| Severity | File | Line | Finding |');
    lines.push('|----------|------|------|--------|');

    for (const f of allFindings) {
      const emoji = SEVERITY_EMOJI[f.severity] || SEVERITY_EMOJI.info;
      const shortFile = f.file.length > 40 ? '...' + f.file.slice(-37) : f.file;
      lines.push(`| ${emoji} ${capitalize(f.severity)} | \`${shortFile}\` | ${f.line} | ${f.finding} |`);
    }
    lines.push('');
  }

  // Severity breakdown
  if (allFindings.length > 0) {
    const parts: string[] = [];
    for (const sev of SEVERITY_ORDER) {
      const count = report.severityCounts[sev] || 0;
      if (count > 0) {
        parts.push(`${count} ${capitalize(sev)}`);
      }
    }
    lines.push(`**Total:** ${parts.join(', ')}`);
    lines.push('');
  }

  // Summary
  lines.push('### Summary');
  lines.push(getSummary(report));
  lines.push('');

  // Footer
  lines.push('---');
  lines.push(
    '*Scanned by [ShitCode Shield](https://github.com/reconpro/shitcode-shield) — Free for open source*'
  );

  return lines.join('\n');
}

/**
 * Format the minimal comment — just the table, no branding.
 */
function formatMinimal(report: ScanReport): string {
  const lines: string[] = [];

  const allFindings = [...report.diffFindings];
  if (report.urlFindings && report.urlFindings.length > 0) {
    allFindings.push(...report.urlFindings);
  }

  if (allFindings.length === 0) {
    lines.push('**ShitCode Shield:** No security issues found. \u2705');
    return lines.join('\n');
  }

  lines.push(`**ShitCode Shield:** ${allFindings.length} finding(s) detected.`);
  lines.push('');
  lines.push('| Severity | File | Line | Finding |');
  lines.push('|----------|------|------|--------|');

  for (const f of allFindings) {
    const emoji = SEVERITY_EMOJI[f.severity] || SEVERITY_EMOJI.info;
    const shortFile = f.file.length > 40 ? '...' + f.file.slice(-37) : f.file;
    lines.push(`| ${emoji} ${capitalize(f.severity)} | \`${shortFile}\` | ${f.line} | ${f.finding} |`);
  }

  lines.push('');
  lines.push(`**Grade: ${report.grade}** (${report.score}/100)`);

  return lines.join('\n');
}

/**
 * Build a ScanReport from the individual results.
 */
export function buildReport(
  diffResult: DiffScanResult,
  aiDetections: AIDetectionResult[],
  urlFindings?: DiffFinding[]
): ScanReport {
  const severityCounts: Record<string, number> = { ...diffResult.severityCounts };

  // Merge URL findings
  if (urlFindings && urlFindings.length > 0) {
    for (const f of urlFindings) {
      severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
    }
  }

  // Recalculate score with URL findings
  const deductionMap: Record<string, number> = {
    critical: 15, high: 10, medium: 5, low: 2, info: 0,
  };

  let deductions = 0;
  for (const f of diffResult.findings) {
    deductions += deductionMap[f.severity] || 0;
  }
  if (urlFindings) {
    for (const f of urlFindings) {
      deductions += deductionMap[f.severity] || 0;
    }
  }

  const score = Math.max(0, 100 - Math.min(deductions, 100));
  let grade: string;
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 65) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 35) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    aiDetections,
    diffFindings: diffResult.findings,
    urlFindings,
    severityCounts,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
