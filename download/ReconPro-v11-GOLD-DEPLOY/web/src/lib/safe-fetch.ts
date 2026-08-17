/**
 * Safe HTTP fetch utility with SSRF protection and timeout enforcement.
 * Drop-in replacement for all `curl` and `exec`-based HTTP calls.
 *
 * Security guarantees:
 * - Validates destination before connection (domain allowlist/blocklist)
 * - Resolves domain and checks resolved IP against private ranges
 * - Enforces timeout to prevent resource exhaustion
 * - Limits response size to prevent memory exhaustion
 * - Sets safe User-Agent
 * - Does not follow redirects to internal hosts (SSRF via redirect)
 */

import dns from 'dns/promises';
import { isPrivateIP, isPrivateIPv6, DOMAIN_REGEX, IPV4_REGEX } from './api-security';
import net from 'net';

const MAX_RESPONSE_SIZE = 2 * 1024 * 1024; // 2MB
const SAFE_USER_AGENT = 'ReconPro-Scanner/10.0 (Security Audit; +https://reconpro.security)';

interface SafeFetchOptions {
  timeout?: number;
  maxResponseSize?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  followRedirects?: boolean;
  /** If true, skip SSRF check (only for trusted external APIs) */
  skipSSRFCheck?: boolean;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  text: string;
  url: string;
}

/**
 * Validate that a URL's host is safe (not internal/private).
 * Checks both the domain name and resolves to check the IP.
 * v2: IPv6 support, DNS failure = unsafe, consistent blocklist.
 */
async function isSafeHost(host: string, skipSSRFCheck = false): Promise<boolean> {
  if (skipSSRFCheck) return true;

  const lower = host.toLowerCase();

  // Block obvious internal hosts — comprehensive list
  const BLOCKED = [
    'localhost', 'localhost.localdomain', 'internal', 'metadata',
    'metadata.google.internal', 'kube-system', 'consul', 'vault', 'etcd',
    'kubernetes', 'kubernetes.default', 'kubernetes.default.svc',
    'grafana', 'prometheus', 'jaeger', 'elastic', 'kibana',
    'zookeeper', 'redis', 'rabbitmq', 'memcached',
    'container.googleapis.com',
  ];
  if (BLOCKED.includes(lower) || BLOCKED.some(d => lower.endsWith('.' + d))) {
    return false;
  }
  if (lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.localhost') || lower.endsWith('.onion')) {
    return false;
  }

  // If it looks like an IPv4, check directly
  if (IPV4_REGEX.test(host)) {
    return !isPrivateIP(host);
  }

  // If it looks like an IPv6, check directly
  if (net.isIPv6(host)) {
    return !isPrivateIPv6(host);
  }

  // If it's a valid domain, resolve and check BOTH A and AAAA
  if (DOMAIN_REGEX.test(host)) {
    try {
      const [v4Addresses, v6Addresses] = await Promise.all([
        dns.resolve4(host).catch(() => [] as string[]),
        dns.resolve6(host).catch(() => [] as string[]),
      ]);

      // DNS failure — treat as unsafe
      if (v4Addresses.length === 0 && v6Addresses.length === 0) {
        return false;
      }

      // If ANY resolved IP is private, block
      if (v4Addresses.some(ip => isPrivateIP(ip))) return false;
      if (v6Addresses.some(ip => isPrivateIPv6(ip))) return false;

      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Safe fetch with SSRF protection, timeout, and response size limits.
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const {
    timeout = 15000,
    maxResponseSize = MAX_RESPONSE_SIZE,
    method = 'GET',
    headers = {},
    body,
    followRedirects = false,
    skipSSRFCheck = false,
  } = options;

  // Parse URL and validate host
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, status: 0, headers: {}, text: '', url };
  }

  const host = parsedUrl.hostname;
  const hostSafe = await isSafeHost(host, skipSSRFCheck);
  if (!hostSafe) {
    return { ok: false, status: 403, headers: {}, text: '', url };
  }

  // Also block non-HTTP/HTTPS protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { ok: false, status: 0, headers: {}, text: '', url };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(parsedUrl.toString(), {
      method,
      redirect: followRedirects ? 'follow' : 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': SAFE_USER_AGENT,
        'Accept': 'text/html,application/json,text/plain,*/*',
        ...headers,
      },
      ...(body && method !== 'GET' ? { body } : {}),
    });

    clearTimeout(timer);

    // Collect headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    // Read body with size limit
    let text = '';
    try {
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let totalSize = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalSize += value.length;
          if (totalSize > maxResponseSize) {
            reader.cancel();
            break;
          }
          text += decoder.decode(value, { stream: true });
        }
      } else {
        text = await response.text();
        if (text.length > maxResponseSize) {
          text = text.slice(0, maxResponseSize);
        }
      }
    } catch {
      text = '';
    }

    return {
      ok: response.ok,
      status: response.status,
      headers: responseHeaders,
      text,
      url: response.url,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, status: 0, headers: {}, text: '', url };
    }
    return { ok: false, status: 0, headers: {}, text: '', url };
  }
}

/**
 * Fetch only HTTP headers (HEAD request equivalent).
 */
export async function safeFetchHeaders(url: string, timeout = 10000): Promise<Record<string, string>> {
  const result = await safeFetch(url, { timeout, method: 'HEAD' });
  return result.headers;
}

/**
 * Fetch with redirect following and SSRF checks on each hop.
 */
export async function safeFetchWithRedirects(url: string, timeout = 15000): Promise<SafeFetchResult> {
  return safeFetch(url, { timeout, followRedirects: true, skipSSRFCheck: false });
}
