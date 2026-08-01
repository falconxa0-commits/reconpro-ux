/**
 * ShitCode Shield — Main Action Entry Point
 *
 * GitHub Action that scans AI-generated code in PRs for security vulnerabilities.
 * Posts branded VibeSec comments with findings.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { detectAIGeneratedCode, parseIgnoreFile, shouldIgnore } from './ai-detector';
import { scanDiff } from './diff-scanner';
import { buildReport, formatComment } from './comment-formatter';
import { scanURL } from './url-scanner';

const SHITCODE_SHIELD_HEADER = '<!-- shitcode-shield-report -->';

async function run(): Promise<void> {
  try {
    // ── Get inputs ────────────────────────────────────────────────────────
    const githubToken = core.getInput('github-token', { required: true });
    const scanDeployedUrl = core.getInput('scan-deployed-url') || '';
    const failOnCritical = core.getInput('fail-on-critical') !== 'false';
    const commentStyle = (core.getInput('comment-style') || 'branded') as 'branded' | 'minimal';

    // ── Get PR context ───────────────────────────────────────────────────
    const context = github.context;
    const pr = context.payload.pull_request;

    if (!pr) {
      core.info('No pull request found in context. Skipping ShitCode Shield.');
      return;
    }

    const prNumber = pr.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    core.info(`\ud83d\udee1\ufe0f ShitCode Shield scanning PR #${prNumber} in ${owner}/${repo}`);

    // ── Create Octokit client ─────────────────────────────────────────────
    const octokit = github.getOctokit(githubToken);

    // ── Fetch PR diff ─────────────────────────────────────────────────────
    let diff: string;
    try {
      const diffResponse = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: {
          format: 'diff',
        },
      });
      // The diff comes back as text in the data field when using diff format
      diff = (diffResponse.data as unknown as string) || '';
      // Handle case where diff might be returned differently
      if (typeof diff !== 'string' || diff.length === 0) {
        // Fallback: fetch via compare API
        const compareResp = await octokit.rest.repos.compareCommits({
          owner,
          repo,
          base: pr.base.sha,
          head: pr.head.sha,
          mediaType: {
            format: 'diff',
          },
        });
        diff = (compareResp.data as unknown as string) || '';
      }
    } catch (err) {
      core.setFailed(`Failed to fetch PR diff: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (!diff || diff.trim().length === 0) {
      core.info('Empty diff. Nothing to scan.');
      return;
    }

    core.info(`Diff size: ${diff.length} bytes`);

    // ── Fetch .vibesec-ignore from repo ───────────────────────────────────
    let ignorePatterns: string[] = [];
    try {
      const ignoreResp = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.vibesec-ignore',
        ref: pr.head.sha,
      });

      if ('content' in ignoreResp.data) {
        const content = Buffer.from(ignoreResp.data.content, 'base64').toString('utf-8');
        ignorePatterns = parseIgnoreFile(content);
        core.info(`Loaded ${ignorePatterns.length} ignore pattern(s) from .vibesec-ignore`);
      }
    } catch {
      core.info('No .vibesec-ignore file found. Using default scan scope.');
    }

    // ── Run AI detection ──────────────────────────────────────────────────
    core.info('Detecting AI-generated code...');
    const aiDetections = detectAIGeneratedCode(diff, ignorePatterns);
    const aiCount = aiDetections.filter((d) => d.isAiGenerated).length;
    core.info(`AI detection complete: ${aiCount} file(s) flagged`);

    // ── Run diff security scan ────────────────────────────────────────────
    core.info('Running VibeSec diff scan...');
    const diffResult = scanDiff(diff, ignorePatterns);
    core.info(
      `Diff scan complete: ${diffResult.findings.length} finding(s), Grade ${diffResult.grade} (${diffResult.score}/100)`
    );

    // ── Optional: Scan deployed URL ───────────────────────────────────────
    let urlFindings = undefined;
    if (scanDeployedUrl) {
      core.info(`Scanning deployed URL: ${scanDeployedUrl}`);
      const urlResult = scanURL(scanDeployedUrl);
      if (urlResult.findings.length > 0) {
        urlFindings = urlResult.findings;
        core.info(`URL scan complete: ${urlResult.findings.length} finding(s), Grade ${urlResult.grade}`);
      } else {
        core.info(urlResult.rawOutput);
      }
    }

    // ── Build report and format comment ───────────────────────────────────
    const report = buildReport(diffResult, aiDetections, urlFindings);
    const comment = formatComment(report, commentStyle);

    core.info(`Generated comment: ${comment.length} characters`);

    // ── Find and update or create comment ─────────────────────────────────
    const commentBody = `${SHITCODE_SHIELD_HEADER}\n\n${comment}`;

    try {
      // List existing comments to find our previous report
      const comments = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      });

      const existingComment = comments.data.find((c) =>
        c.body?.includes(SHITCODE_SHIELD_HEADER)
      );

      if (existingComment) {
        // Update existing comment
        await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: commentBody,
        });
        core.info(`Updated existing ShitCode Shield comment (ID: ${existingComment.id})`);
      } else {
        // Create new comment
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: commentBody,
        });
        core.info('Posted new ShitCode Shield comment');
      }
    } catch (err) {
      core.warning(`Failed to post PR comment: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── Set outputs ───────────────────────────────────────────────────────
    core.setOutput('score', String(report.score));
    core.setOutput('grade', report.grade);
    core.setOutput('findings-count', String(report.diffFindings.length + (report.urlFindings?.length || 0)));
    core.setOutput('ai-files-count', String(aiCount));
    core.setOutput('critical-count', String(report.severityCounts.critical || 0));
    core.setOutput('high-count', String(report.severityCounts.high || 0));

    // ── Optionally fail the check ─────────────────────────────────────────
    if (failOnCritical && (report.severityCounts.critical || 0) > 0) {
      core.setFailed(
        `ShitCode Shield: ${report.severityCounts.critical} critical finding(s) detected. Grade: ${report.grade} (${report.score}/100)`
      );
    } else if (report.diffFindings.length === 0 && aiCount === 0) {
      core.info('\u2705 ShitCode Shield: No issues detected. Clean PR!');
    } else {
      core.info(`ShitCode Shield: Grade ${report.grade} (${report.score}/100)`);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`ShitCode Shield failed: ${error.message}\n${error.stack}`);
    } else {
      core.setFailed(`ShitCode Shield failed: ${String(error)}`);
    }
  }
}

// Run the action
run();
