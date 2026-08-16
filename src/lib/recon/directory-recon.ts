// ─── Web Directory Enumeration ─────────────────────────────
// Probes common web paths via HTTP HEAD requests to discover
// exposed directories, admin panels, config files, and backups.
// This is what tools like DirBuster, Gobuster, and Feroxbuster do.
//
// Exposed directories and files are a top finding in penetration
// test reports and bug bounty programs worldwide.

import type { ReconFinding } from './types';

export interface DirectoryEntry {
  path: string;
  statusCode: number | null;
  contentLength?: number;
  contentType?: string;
  redirectedTo?: string;
  category: 'sensitive' | 'admin' | 'api' | 'config' | 'backup' | 'info' | 'other';
}

export interface DirectoryResult {
  domain: string;
  totalChecked: number;
  found: DirectoryEntry[];
  findings: ReconFinding[];
}

// ── 80 Common Paths to Probe ─────────────────────────────────

const WORDLIST = [
  '/admin', '/login', '/api', '/dashboard', '/config', '/backup', '/.env', '/.git', '/.svn', '/.hg',
  '/wp-admin', '/wp-login', '/wp-json', '/xmlrpc', '/administrator', '/phpmyadmin',
  '/server-status', '/server-info', '/test', '/debug', '/console', '/actuator', '/actuator/health',
  '/graphql', '/swagger', '/swagger-ui', '/api-docs', '/docs', '/redoc', '/openapi.json',
  '/sitemap.xml', '/robots.txt', '/crossdomain.xml', '/clientaccesspolicy.xml',
  '/.well-known', '/.well-known/security.txt', '/.well-known/openpgpkey',
  '/package.json', '/composer.json', '/web.config', '/web.config.bak',
  '/.htaccess', '/.htpasswd', '/wp-config.php.bak', '/config.php.bak',
  '/uploads', '/upload', '/files', '/media', '/images', '/static', '/assets',
  '/cgi-bin', '/cgi-mod', '/portal', '/intranet', '/internal', '/private', '/staging',
  '/dev', '/qa', '/uat', '/ci', '/jenkins', '/jenkins/job', '/gitlab', '/github',
  '/health', '/healthcheck', '/ping', '/status', '/metrics', '/info', '/version',
  '/v1', '/v2', '/api/v1', '/api/v2', '/rest', '/graphql', '/socket.io',
  '/.DS_Store', '/Thumbs.db', '/README.md', '/CHANGELOG.md', '/LICENSE',
] as const;

// ── Path Category Classification ─────────────────────────────

const SENSITIVE_PATHS = new Set([
  '/.env', '/.git', '/.svn', '/.hg', '/.htaccess', '/.htpasswd', '/web.config.bak',
  '/wp-config.php.bak', '/config.php.bak', '/.DS_Store',
]);

const ADMIN_PATHS = new Set([
  '/admin', '/administrator', '/wp-admin', '/wp-login', '/phpmyadmin',
  '/dashboard', '/portal', '/intranet', '/internal', '/private',
  '/cpanel', '/whm', '/plesk',
]);

const API_DOC_PATHS = new Set([
  '/swagger', '/swagger-ui', '/api-docs', '/docs', '/redoc', '/openapi.json',
  '/graphql', '/wp-json', '/xmlrpc',
]);

const DEBUG_PATHS = new Set([
  '/debug', '/console', '/actuator', '/actuator/health', '/test',
  '/server-status', '/server-info',
]);

const BACKUP_PATHS = new Set([
  '/backup', '/web.config.bak', '/wp-config.php.bak', '/config.php.bak',
]);

const INFO_PATHS = new Set([
  '/README.md', '/CHANGELOG.md', '/LICENSE', '/sitemap.xml', '/robots.txt',
  '/crossdomain.xml', '/clientaccesspolicy.xml', '/package.json', '/composer.json',
  '/.well-known', '/.well-known/security.txt', '/.well-known/openpgpkey',
]);

function classifyPath(path: string): DirectoryEntry['category'] {
  if (SENSITIVE_PATHS.has(path)) return 'sensitive';
  if (ADMIN_PATHS.has(path)) return 'admin';
  if (API_DOC_PATHS.has(path)) return 'api';
  if (DEBUG_PATHS.has(path)) return 'config';
  if (BACKUP_PATHS.has(path)) return 'backup';
  if (INFO_PATHS.has(path)) return 'info';
  return 'other';
}

// ── Concurrency-Limited Batch Executor ────────────────────────

async function batchExec<T>(
  items: readonly string[],
  fn: (item: string) => Promise<T>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const promise = fn(item).then(result => {
      results.push(result);
      executing.delete(promise as unknown as Promise<void>);
    });

    executing.add(promise as unknown as Promise<void>);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// ── Single Path Probe ──────────────────────────────────────────

const SCANNER_USER_AGENT = 'Mozilla/5.0 (compatible; ReconPro/0.2.0)';

async function probePath(
  domain: string,
  path: string,
): Promise<DirectoryEntry | null> {
  const url = `https://${domain}${path}`;
  const category = classifyPath(path);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': SCANNER_USER_AGENT,
        'Accept': '*/*',
      },
    });

    clearTimeout(timer);

    const statusCode = response.status;
    const contentType = response.headers.get('content-type') || undefined;
    const contentLengthStr = response.headers.get('content-length');
    const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : undefined;
    const location = response.headers.get('location') || undefined;

    // Skip 404s — not found
    if (statusCode === 404) return null;

    return {
      path,
      statusCode,
      contentLength,
      contentType,
      redirectedTo: location,
      category,
    };
  } catch {
    // Timeout, network error, DNS failure — skip
    return null;
  }
}

// ── Findings Generation ─────────────────────────────────────────

function generateFindings(entries: DirectoryEntry[], domain: string): ReconFinding[] {
  const findings: ReconFinding[] = [];

  if (entries.length === 0) {
    findings.push({
      title: 'No Interesting Directories Found',
      severity: 'info',
      category: 'vulnerability',
      description: `Directory enumeration of ${domain} did not reveal any interesting paths from the checked wordlist. This may indicate the server returns custom 404 pages, uses URL rewriting, or has a minimal attack surface.`,
      evidence: null,
      asset: domain,
      source: 'directory',
    });
    return findings;
  }

  // Group by category for summary
  const byCategory = new Map<DirectoryEntry['category'], DirectoryEntry[]>();
  for (const entry of entries) {
    const list = byCategory.get(entry.category) || [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  // ── CRITICAL: Sensitive files exposed ──
  const sensitive = byCategory.get('sensitive') || [];
  for (const entry of sensitive) {
    findings.push({
      title: `Sensitive File Exposed: ${entry.path}`,
      severity: 'critical',
      category: 'vulnerability',
      description: `A sensitive file or directory is publicly accessible at ${entry.path}. This can expose environment variables (${entry.path.includes('.env') ? 'containing database credentials, API keys, and secrets' : ''}), version control history, or server configuration. Attackers can download this data to gain credentials, source code, or internal paths for further exploitation.`,
      evidence: `HTTP ${entry.statusCode}${entry.contentLength ? ` (${entry.contentLength} bytes)` : ''}${entry.redirectedTo ? ` → ${entry.redirectedTo}` : ''}`,
      asset: `${domain}${entry.path}`,
      source: 'directory',
    });
  }

  // ── HIGH: Admin panels accessible ──
  const admin = byCategory.get('admin') || [];
  for (const entry of admin) {
    const code = entry.statusCode;
    const isAccessible = code === 200 || code === 301 || code === 302 || code === 401 || code === 403;
    if (!isAccessible) continue;

    findings.push({
      title: `Admin Panel Accessible: ${entry.path}`,
      severity: 'high',
      category: 'vulnerability',
      description: `An administrative interface is accessible at ${entry.path} (HTTP ${code}). Admin panels are prime targets for brute-force attacks, credential stuffing, and privilege escalation. ${code === 200 ? 'The page returned content, meaning it may be accessible without authentication or with default credentials.' : code === 401 || code === 403 ? 'Authentication is required but the panel exists. This confirms the admin interface is deployed and reachable.' : `The path redirects (${code}), confirming the admin panel is deployed.`}`,
      evidence: `HTTP ${code}${entry.redirectedTo ? ` → ${entry.redirectedTo}` : ''}${entry.contentType ? ` [${entry.contentType}]` : ''}`,
      asset: `${domain}${entry.path}`,
      source: 'directory',
    });
  }

  // ── HIGH: Backup files found ──
  const backup = byCategory.get('backup') || [];
  for (const entry of backup) {
    findings.push({
      title: `Backup File Found: ${entry.path}`,
      severity: 'high',
      category: 'vulnerability',
      description: `A backup file is publicly accessible at ${entry.path}. Backup files often contain copies of configuration files with embedded credentials, database dumps, or source code. These files are frequently forgotten after deployments and provide attackers with a treasure trove of sensitive information.`,
      evidence: `HTTP ${entry.statusCode}${entry.contentLength ? ` (${entry.contentLength} bytes)` : ''}`,
      asset: `${domain}${entry.path}`,
      source: 'directory',
    });
  }

  // ── MEDIUM: API documentation exposed ──
  const apiDocs = byCategory.get('api') || [];
  for (const entry of apiDocs) {
    const code = entry.statusCode;
    if (code === 404) continue;

    findings.push({
      title: `API Documentation Exposed: ${entry.path}`,
      severity: 'medium',
      category: 'vulnerability',
      description: `API documentation is publicly accessible at ${entry.path}. Exposed API documentation reveals endpoints, parameters, authentication methods, and data models. This information significantly reduces the effort required for API abuse, unauthorized data access, and business logic attacks.`,
      evidence: `HTTP ${code}${entry.redirectedTo ? ` → ${entry.redirectedTo}` : ''}`,
      asset: `${domain}${entry.path}`,
      source: 'directory',
    });
  }

  // ── MEDIUM: Debug endpoints accessible ──
  const debug = byCategory.get('config') || [];
  for (const entry of debug) {
    const code = entry.statusCode;
    if (code === 404) continue;

    findings.push({
      title: `Debug/Management Endpoint Accessible: ${entry.path}`,
      severity: 'medium',
      category: 'vulnerability',
      description: `A debug or management endpoint is accessible at ${entry.path}. These endpoints often expose application internals, environment variables, thread dumps, health metrics, or administrative functions. They should be restricted to internal networks or removed in production.`,
      evidence: `HTTP ${code}${entry.contentLength ? ` (${entry.contentLength} bytes)` : ''}${entry.contentType ? ` [${entry.contentType}]` : ''}`,
      asset: `${domain}${entry.path}`,
      source: 'directory',
    });
  }

  // ── LOW: Information disclosure ──
  const info = byCategory.get('info') || [];
  for (const entry of info) {
    const code = entry.statusCode;
    if (code === 404) continue;

    findings.push({
      title: `Information Disclosure: ${entry.path}`,
      severity: 'low',
      category: 'vulnerability',
      description: `A file that may disclose information is accessible at ${entry.path}. Files like sitemap.xml, robots.txt, and package.json reveal directory structures, technology stacks, and internal paths that aid attackers in reconnaissance.`,
      evidence: `HTTP ${code}${entry.contentLength ? ` (${entry.contentLength} bytes)` : ''}`,
      asset: `${domain}${entry.path}`,
      source: 'directory',
    });
  }

  // ── INFO: Redirected paths ──
  const redirected = entries.filter(e => e.statusCode === 301 || e.statusCode === 302);
  if (redirected.length > 0) {
    // Only report redirects that aren't already covered by other categories
    const alreadyReported = new Set([
      ...sensitive.map(e => e.path),
      ...admin.map(e => e.path),
      ...backup.map(e => e.path),
    ]);
    const uniqueRedirects = redirected.filter(e => !alreadyReported.has(e.path));
    if (uniqueRedirects.length > 0) {
      findings.push({
        title: `${uniqueRedirects.length} Redirected Path(s) Detected`,
        severity: 'info',
        category: 'vulnerability',
        description: `${uniqueRedirects.length} path(s) returned redirects (301/302). Redirected paths confirm that resources exist or existed, and the redirect target may reveal internal architecture or renamed resources.`,
        evidence: uniqueRedirects.map(e => `${e.path} → ${e.redirectedTo || 'unknown'}`).join(' | '),
        asset: domain,
        source: 'directory',
      });
    }
  }

  // ── INFO: Forbidden paths (401/403) not covered above ──
  const forbidden = entries.filter(e => (e.statusCode === 401 || e.statusCode === 403) && e.category === 'other');
  if (forbidden.length > 0) {
    findings.push({
      title: `${forbidden.length} Restricted Path(s) Found (401/403)`,
      severity: 'low',
      category: 'vulnerability',
      description: `${forbidden.length} path(s) returned authentication/authorization errors. While access is denied, the existence of these paths reveals deployed functionality and application structure to attackers.`,
      evidence: forbidden.map(e => `${e.path} (HTTP ${e.statusCode})`).join(' | '),
      asset: domain,
      source: 'directory',
    });
  }

  return findings;
}

/**
 * Enumerate web directories and files for a domain using HTTP HEAD requests
 * against a wordlist of 80 common paths.
 *
 * Uses native fetch() directly (not safeFetch) since directory enumeration
 * targets the domain itself and needs to probe actual paths.
 *
 * @param domain - The domain to scan (e.g., "example.com")
 * @returns DirectoryResult with discovered paths and security findings
 */
export async function enumerateDirectories(domain: string): Promise<DirectoryResult> {
  const totalChecked = WORDLIST.length;

  // Probe all paths with concurrency limit of 15
  const results = await batchExec(
    WORDLIST,
    (path) => probePath(domain, path),
    15,
  );

  // Filter out nulls (404s and errors)
  const found = results.filter((r): r is DirectoryEntry => r !== null);

  const findings = generateFindings(found, domain);

  return {
    domain,
    totalChecked,
    found,
    findings,
  };
}

export { type ReconFinding };
