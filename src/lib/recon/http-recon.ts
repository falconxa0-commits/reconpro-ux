// ─── Real HTTP Security Header Analysis ──────────────────────────
// Makes actual HTTP requests and analyzes security headers.
// This is what tools like SecurityHeaders.com, observatory.mozilla.org do.
// Header misconfigurations are in the OWASP Top 10 and CVE databases.

import type { HTTPResult, SecurityHeaderAnalysis, TechnologyMatch, ReconFinding } from './types';

// ── Security Header Definitions ──────────────────────────────────

interface HeaderCheck {
  header: string;
  name: string;
  check: (value: string | undefined, allHeaders: Record<string, string>) => SecurityHeaderAnalysis;
}

const HEADER_CHECKS: HeaderCheck[] = [
  {
    header: 'strict-transport-security',
    name: 'HTTP Strict Transport Security (HSTS)',
    check: (val) => {
      if (!val) return { name: 'HSTS', present: false, status: 'missing', severity: 'high', finding: 'HSTS not configured. The site is accessible over plain HTTP, making it vulnerable to man-in-the-middle (MITM) attacks, SSL stripping, and session hijacking on unsecured networks.' };
      const maxAge = val.match(/max-age=(\d+)/);
      const age = maxAge ? parseInt(maxAge[1]) : 0;
      const includeSub = val.toLowerCase().includes('includesubdomains');
      const preload = val.toLowerCase().includes('preload');

      if (age < 31536000) {
        return { name: 'HSTS', present: true, value: val, status: 'misconfigured', severity: 'medium', finding: `HSTS max-age is only ${age} seconds (recommended: 31536000+ = 1 year). Short max-age values provide insufficient protection. ${includeSub ? 'includeSubDomains is set. ' : 'includeSubDomains is missing. '}${preload ? 'Preload is enabled.' : 'Preload is not enabled.'}` };
      }
      if (!includeSub) {
        return { name: 'HSTS', present: true, value: val, status: 'warning', severity: 'low', finding: 'HSTS is configured with proper max-age but includeSubDomains is not set. Subdomains remain vulnerable to MITM attacks. Consider adding includeSubDomains.' };
      }
      return { name: 'HSTS', present: true, value: val, status: 'good', severity: 'info', finding: 'HSTS is properly configured with strong max-age, includeSubDomains, and preload. The site enforces HTTPS for all requests.' };
    },
  },
  {
    header: 'content-security-policy',
    name: 'Content Security Policy (CSP)',
    check: (val) => {
      if (!val) return { name: 'CSP', present: false, status: 'missing', severity: 'high', finding: 'No Content Security Policy is set. CSP is the primary defense against XSS (Cross-Site Scripting) attacks, clickjacking, and code injection. Without CSP, the browser will execute any script from any source.' };
      const hasUnsafeInline = val.includes("'unsafe-inline'") || val.includes('unsafe-inline');
      const hasUnsafeEval = val.includes("'unsafe-eval'") || val.includes('unsafe-eval');
      const hasDataUri = val.includes('data:');
      const hasWildCard = val.includes('*');

      const issues: string[] = [];
      if (hasUnsafeInline) issues.push('allows unsafe-inline scripts (defeats XSS protection)');
      if (hasUnsafeEval) issues.push('allows eval() (defeats XSS protection)');
      if (hasDataUri) issues.push('allows data: URIs (potential injection vector)');
      if (hasWildCard) issues.push('has wildcard sources (too permissive)');

      if (issues.length > 0) {
        return { name: 'CSP', present: true, value: val.length > 100 ? val.slice(0, 100) + '...' : val, status: 'misconfigured', severity: 'medium', finding: `CSP is present but has weaknesses: ${issues.join('; ')}. A properly locked-down CSP should use nonce-based or hash-based policies instead.` };
      }
      return { name: 'CSP', present: true, value: val.length > 100 ? val.slice(0, 100) + '...' : val, status: 'good', severity: 'info', finding: 'Content Security Policy is properly configured without unsafe directives. This provides strong XSS and injection attack protection.' };
    },
  },
  {
    header: 'x-content-type-options',
    name: 'X-Content-Type-Options',
    check: (val) => {
      if (!val) return { name: 'X-Content-Type-Options', present: false, status: 'missing', severity: 'medium', finding: 'X-Content-Type-Options header is missing. Without "nosniff", browsers may MIME-sniff content types, which can lead to security vulnerabilities where executable content is served with a benign content type.' };
      if (val.toLowerCase() !== 'nosniff') return { name: 'X-Content-Type-Options', present: true, value: val, status: 'misconfigured', severity: 'medium', finding: `X-Content-Type-Options is set but the value "${val}" is incorrect. It should be "nosniff" to prevent MIME type sniffing.` };
      return { name: 'X-Content-Type-Options', present: true, value: val, status: 'good', severity: 'info', finding: 'X-Content-Type-Options is correctly set to "nosniff". This prevents browsers from MIME-sniffing responses.' };
    },
  },
  {
    header: 'x-frame-options',
    name: 'X-Frame-Options',
    check: (val) => {
      if (!val) return { name: 'X-Frame-Options', present: false, status: 'missing', severity: 'medium', finding: 'X-Frame-Options header is missing. The page can be embedded in iframes on other sites, making it vulnerable to clickjacking attacks where an attacker overlays invisible frames to trick users into clicking malicious elements.' };
      const v = val.toLowerCase();
      if (v === 'deny') return { name: 'X-Frame-Options', present: true, value: val, status: 'good', severity: 'info', finding: 'X-Frame-Options is set to DENY, fully preventing clickjacking by disallowing all framing.' };
      if (v === 'sameorigin') return { name: 'X-Frame-Options', present: true, value: val, status: 'good', severity: 'info', finding: 'X-Frame-Options is set to SAMEORIGIN. The page can only be framed by pages on the same origin. This provides clickjacking protection for cross-origin attacks.' };
      if (v.startsWith('allow-from')) return { name: 'X-Frame-Options', present: true, value: val, status: 'warning', severity: 'low', finding: `X-Frame-Options uses allow-from with specific origins. Note: allow-from is deprecated in some browsers in favor of CSP frame-ancestors.` };
      return { name: 'X-Frame-Options', present: true, value: val, status: 'misconfigured', severity: 'medium', finding: `X-Frame-Options has an unrecognized value: "${val}". Use DENY or SAMEORIGIN.` };
    },
  },
  {
    header: 'x-xss-protection',
    name: 'X-XSS-Protection',
    check: (val) => {
      if (!val) return { name: 'X-XSS-Protection', present: false, status: 'missing', severity: 'low', finding: 'X-XSS-Protection is not set. While modern browsers use CSP for XSS protection, legacy browsers rely on this header. Setting it to "0" is acceptable if CSP is properly configured.' };
      const v = val.toLowerCase();
      if (v.includes('mode=block')) return { name: 'X-XSS-Protection', present: true, value: val, status: 'good', severity: 'info', finding: 'X-XSS-Protection is enabled with mode=block. Legacy XSS filter will block detected attacks rather than sanitizing.' };
      if (v === '0') return { name: 'X-XSS-Protection', present: true, value: val, status: 'good', severity: 'info', finding: 'X-XSS-Protection is explicitly disabled (0). This is acceptable when CSP is properly configured, as the XSS filter can sometimes introduce vulnerabilities.' };
      return { name: 'X-XSS-Protection', present: true, value: val, status: 'warning', severity: 'low', finding: 'X-XSS-Protection is set but mode=block is not specified. The filter may sanitize rather than block malicious content.' };
    },
  },
  {
    header: 'referrer-policy',
    name: 'Referrer-Policy',
    check: (val) => {
      if (!val) return { name: 'Referrer-Policy', present: false, status: 'missing', severity: 'low', finding: 'No Referrer-Policy is set. Browsers may send the full URL as the referrer header when navigating away, potentially leaking sensitive path/query parameters to third-party sites.' };
      const v = val.toLowerCase();
      if (v === 'no-referrer' || v === 'same-origin' || v === 'strict-origin-when-cross-origin') {
        return { name: 'Referrer-Policy', present: true, value: val, status: 'good', severity: 'info', finding: `Referrer-Policy is set to "${val}", which provides good protection against referrer information leakage.` };
      }
      if (v === 'unsafe-url') {
        return { name: 'Referrer-Policy', present: true, value: val, status: 'misconfigured', severity: 'medium', finding: 'Referrer-Policy is set to "unsafe-url", which sends the full URL including path and query to all destinations. This is the most permissive and leaky configuration.' };
      }
      return { name: 'Referrer-Policy', present: true, value: val, status: 'warning', severity: 'low', finding: `Referrer-Policy is set to "${val}". Consider using "strict-origin-when-cross-origin" or "same-origin" for stronger protection.` };
    },
  },
  {
    header: 'permissions-policy',
    name: 'Permissions-Policy',
    check: (val) => {
      if (!val) return { name: 'Permissions-Policy', present: false, status: 'missing', severity: 'low', finding: 'No Permissions-Policy (formerly Feature-Policy) is set. Without it, the page can use all browser features (camera, microphone, geolocation, etc.). Restricting unnecessary features reduces the attack surface.' };
      return { name: 'Permissions-Policy', present: true, value: val.length > 80 ? val.slice(0, 80) + '...' : val, status: 'good', severity: 'info', finding: 'Permissions-Policy is configured, restricting which browser features the page can access.' };
    },
  },
  {
    header: 'x-powered-by',
    name: 'Server Technology Disclosure',
    check: (val, all) => {
      const serverHeader = all['server'] || all['x-powered-by'];
      if (serverHeader) {
        return { name: 'Server Disclosure', present: true, value: serverHeader, status: 'warning', severity: 'low', finding: `Server technology is disclosed via "${serverHeader}". This information helps attackers identify specific vulnerabilities and exploits for the exact software version being used. Remove or obfuscate server headers.` };
      }
      return { name: 'Server Disclosure', present: false, status: 'good', severity: 'info', finding: 'No server technology disclosure headers detected. This is the correct security posture.' };
    },
  },
];

// ── Technology Fingerprinting Database ───────────────────────────

interface TechFingerprint {
  name: string;
  category: string;
  evidence: string;
  confidence: number;
  match: (headers: Record<string, string>, body: string) => boolean;
}

const TECH_FINGERPRINTS: TechFingerprint[] = [
  // CDNs
  { name: 'Cloudflare', category: 'CDN', evidence: 'cf-ray header', confidence: 0.95, match: (h) => !!h['cf-ray'] },
  { name: 'Cloudflare', category: 'CDN', evidence: 'cloudflare headers', confidence: 0.9, match: (h) => !!(h['cf-cache-status'] || h['cf-request-id']) },
  { name: 'Amazon CloudFront', category: 'CDN', evidence: 'x-amz-cf-id header', confidence: 0.95, match: (h) => !!h['x-amz-cf-id'] },
  { name: 'Fastly', category: 'CDN', evidence: 'x-fastly-request-id header', confidence: 0.9, match: (h) => !!h['x-fastly-request-id'] },
  { name: 'Akamai', category: 'CDN', evidence: 'x-akamai header', confidence: 0.9, match: (h) => !!(h['x-akamai'] || h['x-cache-remote'] || h['x-akamai-staging']) },
  { name: 'Vercel', category: 'CDN/Hosting', evidence: 'x-vercel-id header', confidence: 0.95, match: (h) => !!h['x-vercel-id'] },
  { name: 'Netlify', category: 'CDN/Hosting', evidence: 'x-nf-request-id header', confidence: 0.9, match: (h) => !!h['x-nf-request-id'] },
  { name: 'Sucuri', category: 'WAF', evidence: 'x-sucuri-id header', confidence: 0.95, match: (h) => !!h['x-sucuri-id'] },

  // Web Servers
  { name: 'nginx', category: 'Web Server', evidence: 'server header', confidence: 0.95, match: (h) => (h['server'] || '').toLowerCase().includes('nginx') },
  { name: 'Apache', category: 'Web Server', evidence: 'server header', confidence: 0.95, match: (h) => (h['server'] || '').toLowerCase().includes('apache') },
  { name: 'Apache HTTPD', category: 'Web Server', evidence: 'server header with version', confidence: 0.98, match: (h) => /apache\/[\d.]+/i.test(h['server'] || '') },
  { name: 'Microsoft IIS', category: 'Web Server', evidence: 'server header', confidence: 0.95, match: (h) => (h['server'] || '').toLowerCase().includes('microsoft-iis') },
  { name: 'Caddy', category: 'Web Server', evidence: 'server header', confidence: 0.9, match: (h) => (h['server'] || '').toLowerCase().includes('caddy') },
  { name: 'LiteSpeed', category: 'Web Server', evidence: 'server header', confidence: 0.9, match: (h) => (h['server'] || '').toLowerCase().includes('litespeed') },
  { name: 'OpenResty', category: 'Web Server', evidence: 'server header', confidence: 0.9, match: (h) => (h['server'] || '').toLowerCase().includes('openresty') },

  // Backend Frameworks
  { name: 'Next.js', category: 'Framework', evidence: 'x-nextjs headers', confidence: 0.95, match: (h) => !!(h['x-nextjs-cache'] || h['x-nextjs-matched-path']) },
  { name: 'Next.js', category: 'Framework', evidence: '__next data in body', confidence: 0.9, match: (_h, b) => b.includes('__NEXT_DATA__') || b.includes('_next/static') },
  { name: 'React', category: 'Framework', evidence: 'react root in body', confidence: 0.85, match: (_h, b) => b.includes('data-reactroot') || b.includes('__reactRoot') || b.includes('react.production.min.js') },
  { name: 'Nuxt.js', category: 'Framework', evidence: '__nuxt data in body', confidence: 0.9, match: (_h, b) => b.includes('__NUXT__') || b.includes('_nuxt/') },
  { name: 'Vue.js', category: 'Framework', evidence: 'vue.js in body', confidence: 0.85, match: (_h, b) => b.includes('vue.js') || b.includes('vue.min.js') || b.includes('data-v-') },
  { name: 'Angular', category: 'Framework', evidence: 'ng-version attribute', confidence: 0.9, match: (_h, b) => b.includes('ng-version=') || b.includes('ng-app') },
  { name: 'Svelte', category: 'Framework', evidence: 'svelte in body', confidence: 0.8, match: (_h, b) => b.includes('svelte') },
  { name: 'Express.js', category: 'Framework', evidence: 'x-powered-by header', confidence: 0.9, match: (h) => (h['x-powered-by'] || '').toLowerCase().includes('express') },

  // Security
  { name: 'Cloudflare WAF', category: 'WAF', evidence: 'cf-mitigated header', confidence: 0.95, match: (h) => h['cf-mitigated'] === 'challenge' },
  { name: 'AWS WAF', category: 'WAF', evidence: 'awselb header', confidence: 0.8, match: (h) => !!h['x-amzn-requestid'] },

  // Analytics
  { name: 'Google Analytics', category: 'Analytics', evidence: 'gtag/ga script in body', confidence: 0.9, match: (_h, b) => /google-analytics\.com|gtag|googletagmanager/i.test(b) },
  { name: 'Cloudflare Analytics', category: 'Analytics', evidence: 'cf-analytics script', confidence: 0.8, match: (_h, b) => b.includes('static.cloudflareinsights.com') || b.includes('cf-beacon') },
  { name: 'Hotjar', category: 'Analytics', evidence: 'hotjar script in body', confidence: 0.9, match: (_h, b) => b.includes('hotjar.com') },

  // CMS
  { name: 'WordPress', category: 'CMS', evidence: 'wp-content in body', confidence: 0.95, match: (_h, b) => b.includes('wp-content') || b.includes('wp-includes') },
  { name: 'Drupal', category: 'CMS', evidence: 'drupal in body/headers', confidence: 0.9, match: (h, b) => b.includes('Drupal.settings') || (h['x-drupal-cache'] !== undefined) || b.includes('sites/all/themes') },
  { name: 'Joomla', category: 'CMS', evidence: 'joomla in body', confidence: 0.85, match: (_h, b) => b.includes('media/jui/') || b.includes('components/com_') },

  // Ad Platforms
  { name: 'Google Ads', category: 'Advertising', evidence: 'googlesyndication in body', confidence: 0.9, match: (_h, b) => b.includes('googlesyndication') || b.includes('doubleclick.net') },
  { name: 'Facebook Pixel', category: 'Analytics', evidence: 'fbq script in body', confidence: 0.9, match: (_h, b) => b.includes('connect.facebook.net') || b.includes('fbq(') },
];

// ── Main HTTP Analysis Function ─────────────────────────────────

export async function analyzeHTTP(domain: string, timeout = 8000): Promise<HTTPResult> {
  const start = Date.now();
  const urls = [`https://${domain}`, `http://${domain}`];

  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Collect headers (lowercase keys)
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      // Get response body for tech fingerprinting (first 50KB)
      let body = '';
      try {
        body = await response.text();
        body = body.slice(0, 50000);
      } catch {
        body = '';
      }

      // Extract page title
      let title: string | undefined;
      const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();

      // ── Security Header Analysis ──
      const securityHeaders: SecurityHeaderAnalysis[] = HEADER_CHECKS.map(check => {
        const headerValue = headers[check.header.toLowerCase()];
        return check.check(headerValue, headers);
      });

      // ── Technology Detection ──
      const technologies: TechnologyMatch[] = TECH_FINGERPRINTS
        .filter(fp => fp.match(headers, body))
        .map(fp => ({ name: fp.name, category: fp.category, evidence: fp.evidence, confidence: fp.confidence }));

      // Deduplicate by name (keep highest confidence)
      const techMap = new Map<string, TechnologyMatch>();
      for (const tech of technologies) {
        const existing = techMap.get(tech.name);
        if (!existing || existing.confidence < tech.confidence) {
          techMap.set(tech.name, tech);
        }
      }

      const duration = Date.now() - start;

      return {
        type: 'http',
        success: true,
        url,
        statusCode: response.status,
        headers,
        securityHeaders,
        technologies: Array.from(techMap.values()),
        title,
        duration,
      };
    } catch (err) {
      lastError = err as Error;
      if (err instanceof DOMException && err.name === 'AbortError') {
        continue; // Try next URL
      }
      // Network error, try next protocol
      continue;
    }
  }

  return {
    type: 'http',
    success: false,
    url: urls[0],
    statusCode: 0,
    headers: {},
    securityHeaders: HEADER_CHECKS.map(check => check.check(undefined, {})),
    technologies: [],
    duration: Date.now() - start,
  };
}

// ── Convert HTTP results to ReconFindings ───────────────────────

export function httpToFindings(result: HTTPResult, domain: string): ReconFinding[] {
  const findings: ReconFinding[] = [];

  if (!result.success) {
    findings.push({
      title: 'HTTP Connection Failed',
      severity: 'medium',
      category: 'header',
      description: `Could not establish an HTTP/HTTPS connection to ${domain}. The target may be offline, blocking our scanner, or using non-standard ports. This was checked over a ${result.duration}ms timeout period.`,
      evidence: null,
      asset: domain,
      source: 'http',
    });
    return findings;
  }

  // Security header findings
  for (const sh of result.securityHeaders) {
    findings.push({
      title: sh.finding,
      severity: sh.severity,
      category: 'header',
      description: sh.finding,
      evidence: sh.value || null,
      asset: domain,
      source: 'http',
    });
  }

  // Technology findings
  for (const tech of result.technologies) {
    const sev = tech.category === 'WAF' ? 'info' : 'info';
    findings.push({
      title: `Technology Detected: ${tech.name}`,
      severity: sev,
      category: 'technology',
      description: `${tech.name} (${tech.category}) was identified with ${(tech.confidence * 100).toFixed(0)}% confidence. Technology fingerprinting helps attackers find version-specific exploits and misconfigurations. Knowing the tech stack enables targeted vulnerability scanning.`,
      evidence: tech.evidence,
      asset: `${domain} [${tech.category}]`,
      source: 'http',
    });
  }

  // Page title
  if (result.title) {
    findings.push({
      title: `Page Title: "${result.title}"`,
      severity: 'info',
      category: 'header',
      description: `The page title was extracted from the HTML response. Page titles can reveal internal application names, version numbers, or environment indicators that should not be publicly accessible.`,
      evidence: result.title,
      asset: domain,
      source: 'http',
    });
  }

  // Status code analysis
  if (result.statusCode >= 400) {
    findings.push({
      title: `HTTP ${result.statusCode} Error Response`,
      severity: 'low',
      category: 'header',
      description: `The server returned HTTP ${result.statusCode}. Error pages can sometimes reveal server version information, stack traces, or internal paths that aid attackers in reconnaissance.`,
      evidence: `HTTP ${result.statusCode}`,
      asset: domain,
      source: 'http',
    });
  }

  return findings;
}

export { type ReconFinding };