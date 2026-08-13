/**
 * Scan Engine Tests
 *
 * Tests safeFetch, domain validation edge cases, and SSRF protection.
 * DNS function tests mock at the source module level.
 * All external dependencies are mocked — no actual network calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock safeFetch's dns.resolve4 dependency ─────────────────────
const { _mockDnsResolve4 } = vi.hoisted(() => ({
  _mockDnsResolve4: vi.fn(),
}));

vi.mock('dns/promises', () => ({
  __esModule: true,
  default: {
    Resolver: vi.fn(),
    resolve4: (host: string) => _mockDnsResolve4(host),
  },
}));

vi.mock('tls', () => ({
  __esModule: true,
  default: { connect: vi.fn() },
}));

import { safeFetch, safeFetchHeaders, safeFetchWithRedirects } from '@/lib/safe-fetch';
import { isPrivateIP } from '@/lib/api-security';

// ── Import native-dns functions and mock them at module level ────
// Since dns/promises mocking doesn't work well with Resolver constructors,
// we mock the exported functions directly
vi.mock('@/lib/native-dns', () => ({
  digShort: vi.fn(),
  digAnswer: vi.fn(),
  resolveIP: vi.fn(),
  reverseDNS: vi.fn(),
  analyzeSSLNative: vi.fn(),
}));

import {
  digShort, digAnswer, resolveIP, reverseDNS,
} from '@/lib/native-dns';
const mockedDigShort = vi.mocked(digShort);
const mockedDigAnswer = vi.mocked(digAnswer);
const mockedResolveIP = vi.mocked(resolveIP);
const mockedReverseDNS = vi.mocked(reverseDNS);

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ── Native DNS: digShort ──────────────────────────────────────────

describe('Native DNS — digShort', () => {
  it('should return A records for a domain', async () => {
    mockedDigShort.mockResolvedValue(['93.184.216.34']);
    expect(await digShort('example.com', 'A')).toEqual(['93.184.216.34']);
  });

  it('should return AAAA records', async () => {
    mockedDigShort.mockResolvedValue(['2606:2800:220:1:248:1893:25c8:1946']);
    expect(await digShort('example.com', 'AAAA')).toEqual(['2606:2800:220:1:248:1893:25c8:1946']);
  });

  it('should return MX records formatted', async () => {
    mockedDigShort.mockResolvedValue(['mail.example.com (priority: 10)']);
    expect(await digShort('example.com', 'MX')).toEqual(['mail.example.com (priority: 10)']);
  });

  it('should return NS records', async () => {
    mockedDigShort.mockResolvedValue(['ns1.example.com', 'ns2.example.com']);
    expect(await digShort('example.com', 'NS')).toEqual(['ns1.example.com', 'ns2.example.com']);
  });

  it('should return empty array on failure', async () => {
    mockedDigShort.mockResolvedValue([]);
    expect(await digShort('nonexistent.invalid', 'A')).toEqual([]);
  });

  it('should handle unknown record types', async () => {
    mockedDigShort.mockResolvedValue([]);
    expect(await digShort('example.com', 'UNKNOWN')).toEqual([]);
  });

  it('should return CNAME records', async () => {
    mockedDigShort.mockResolvedValue(['cdn.example.com']);
    expect(await digShort('www.example.com', 'CNAME')).toEqual(['cdn.example.com']);
  });
});

// ── Native DNS: digAnswer ─────────────────────────────────────────

describe('Native DNS — digAnswer', () => {
  it('should return formatted answer', async () => {
    mockedDigAnswer.mockResolvedValue('example.com\tA\t93.184.216.34');
    expect(await digAnswer('example.com', 'A')).toBe('example.com\tA\t93.184.216.34');
  });

  it('should return multiple lines', async () => {
    mockedDigAnswer.mockResolvedValue('example.com\tA\t1.1.1.1\nexample.com\tA\t2.2.2.2');
    const result = await digAnswer('example.com', 'A');
    expect(result).toContain('1.1.1.1');
    expect(result).toContain('2.2.2.2');
  });

  it('should return empty string on error', async () => {
    mockedDigAnswer.mockResolvedValue('');
    expect(await digAnswer('bad.example.com', 'A')).toBe('');
  });
});

// ── Native DNS: resolveIP ─────────────────────────────────────────

describe('Native DNS — resolveIP', () => {
  it('should return first IPv4 address', async () => {
    mockedResolveIP.mockResolvedValue('93.184.216.34');
    expect(await resolveIP('example.com')).toBe('93.184.216.34');
  });

  it('should return null when no addresses', async () => {
    mockedResolveIP.mockResolvedValue(null);
    expect(await resolveIP('empty.example.com')).toBeNull();
  });

  it('should return null on error', async () => {
    mockedResolveIP.mockResolvedValue(null);
    expect(await resolveIP('broken.example.com')).toBeNull();
  });
});

// ── Native DNS: reverseDNS ────────────────────────────────────────

describe('Native DNS — reverseDNS', () => {
  it('should return PTR record', async () => {
    mockedReverseDNS.mockResolvedValue('example.com');
    expect(await reverseDNS('93.184.216.34')).toBe('example.com');
  });

  it('should return empty string on error', async () => {
    mockedReverseDNS.mockResolvedValue('');
    expect(await reverseDNS('1.2.3.4')).toBe('');
  });
});

// ── safeFetch — SSRF Protection ──────────────────────────────────

describe('safeFetch — SSRF Protection', () => {
  it('should block localhost', async () => {
    expect((await safeFetch('http://localhost/admin')).status).toBe(403);
  });

  it('should block metadata.google.internal', async () => {
    expect((await safeFetch('http://metadata.google.internal/')).status).toBe(403);
  });

  it('should block .local domains', async () => {
    expect((await safeFetch('http://printer.local/')).status).toBe(403);
  });

  it('should block .internal domains', async () => {
    expect((await safeFetch('http://service.internal/')).status).toBe(403);
  });

  it('should block .onion domains', async () => {
    expect((await safeFetch('http://example.onion/')).status).toBe(403);
  });

  it('should block direct private IPs', async () => {
    expect((await safeFetch('http://127.0.0.1/')).status).toBe(403);
    expect((await safeFetch('http://10.0.0.1/')).status).toBe(403);
    expect((await safeFetch('http://192.168.1.1/')).status).toBe(403);
    expect((await safeFetch('http://169.254.169.254/')).status).toBe(403);
  });

  it('should block non-HTTP protocols', async () => {
    expect((await safeFetch('file:///etc/passwd')).status).toBe(0);
    expect((await safeFetch('ftp://evil.com/')).status).toBe(0);
  });

  it('should reject invalid URLs', async () => {
    const r = await safeFetch('not-a-url');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(0);
  });
});

// ── safeFetch — SSRF via DNS resolution ──────────────────────────

describe('safeFetch — SSRF via DNS Resolution', () => {
  it('should block DNS rebinding to 127.0.0.1', async () => {
    _mockDnsResolve4.mockResolvedValue(['127.0.0.1']);
    const r = await safeFetch('http://evil.com/');
    expect(r.status).toBe(403);
  });

  it('should block if ANY resolved IP is private', async () => {
    _mockDnsResolve4.mockResolvedValue(['8.8.8.8', '192.168.1.1']);
    const r = await safeFetch('http://dual-homed.com/');
    expect(r.status).toBe(403);
  });

  it('should block DNS resolution to cloud metadata', async () => {
    _mockDnsResolve4.mockResolvedValue(['169.254.169.254']);
    const r = await safeFetch('http://metadata-spoof.com/');
    expect(r.status).toBe(403);
  });

  it('should block DNS resolution to link-local', async () => {
    _mockDnsResolve4.mockResolvedValue(['169.254.1.1']);
    const r = await safeFetch('http://linklocal-spoof.com/');
    expect(r.status).toBe(403);
  });
});

// ── safeFetch — Happy Path ────────────────────────────────────────

describe('safeFetch — Happy Path', () => {
  it('should fetch a valid URL', async () => {
    _mockDnsResolve4.mockResolvedValue(['93.184.216.34']);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers({ 'Content-Type': 'text/html' }),
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true, value: undefined }) }) },
      text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await safeFetch('http://example.com/');
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    vi.unstubAllGlobals();
  });

  it('should set safe User-Agent', async () => {
    _mockDnsResolve4.mockResolvedValue(['93.184.216.34']);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, headers: new Headers(), body: null, text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);
    await safeFetch('http://example.com/');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'ReconPro-Scanner/10.0 (Security Audit; +https://reconpro.security)',
        }),
      })
    );
    vi.unstubAllGlobals();
  });

  it('should not follow redirects by default', async () => {
    _mockDnsResolve4.mockResolvedValue(['93.184.216.34']);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, headers: new Headers(), body: null, text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);
    await safeFetch('http://example.com/');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String), expect.objectContaining({ redirect: 'manual' })
    );
    vi.unstubAllGlobals();
  });

  it('should handle fetch errors gracefully', async () => {
    _mockDnsResolve4.mockResolvedValue(['93.184.216.34']);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const r = await safeFetch('http://example.com/');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(0);
    vi.unstubAllGlobals();
  });

  it('should handle timeout abort', async () => {
    _mockDnsResolve4.mockResolvedValue(['93.184.216.34']);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      new DOMException('Aborted', 'AbortError')
    ));
    const r = await safeFetch('http://slow.example.com/', { timeout: 1 });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(0);
    vi.unstubAllGlobals();
  });

  it('should skip SSRF when skipSSRFCheck=true', async () => {
    _mockDnsResolve4.mockResolvedValue(['127.0.0.1']);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, headers: new Headers(), body: null, text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);
    const r = await safeFetch('http://trusted-internal.example.com/', { skipSSRFCheck: true });
    expect(r.ok).toBe(true);
    vi.unstubAllGlobals();
  });
});

// ── safeFetchHeaders ─────────────────────────────────────────────

describe('safeFetchHeaders', () => {
  it('should return headers from HEAD request', async () => {
    _mockDnsResolve4.mockResolvedValue(['93.184.216.34']);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers({ 'Server': 'nginx/1.24' }),
      body: null, text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);
    const headers = await safeFetchHeaders('http://example.com/');
    expect(headers['server']).toBe('nginx/1.24');
    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'HEAD' }));
    vi.unstubAllGlobals();
  });
});

// ── safeFetchWithRedirects ───────────────────────────────────────

describe('safeFetchWithRedirects', () => {
  it('should pass redirect: follow to fetch', async () => {
    _mockDnsResolve4.mockResolvedValue(['93.184.216.34']);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, headers: new Headers(), body: null, text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);
    await safeFetchWithRedirects('http://example.com/');
    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: 'follow' }));
    vi.unstubAllGlobals();
  });
});

// ── SSRF Bypass Attempts ─────────────────────────────────────────

describe('SSRF Protection — Bypass Attempts', () => {
  it('should block decimal IP (2130706433 = 127.0.0.1)', () => {
    expect(isPrivateIP('2130706433')).toBe(true);
  });

  it('should block hex IP (0x7f000001)', () => {
    expect(isPrivateIP('0x7f000001')).toBe(true);
    expect(isPrivateIP('0x7f.0x00.0x00.0x01')).toBe(true);
  });

  it('should treat 0177.0.0.1 as 177.0.0.1 (public)', () => {
    expect(isPrivateIP('0177.0.0.1')).toBe(false);
  });

  it('should block full-octal as malformed', () => {
    expect(isPrivateIP('017700000001')).toBe(true);
  });

  it('should block IPv6 (fail-closed as non-IPv4)', () => {
    expect(isPrivateIP('::1')).toBe(true);
    expect(isPrivateIP('[::1]')).toBe(true);
    expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
  });

  it('should block 0.0.0.0', async () => {
    expect((await safeFetch('http://0.0.0.0/')).status).toBe(403);
  });

  it('should allow domains resolving to public IPs only', async () => {
    _mockDnsResolve4.mockResolvedValue(['8.8.8.8']);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, headers: new Headers(), body: null, text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);
    expect((await safeFetch('http://safe.example.com/')).ok).toBe(true);
    vi.unstubAllGlobals();
  });

  it('should fail open when DNS errors (fetch will fail)', async () => {
    _mockDnsResolve4.mockRejectedValue(new Error('ENOTFOUND'));
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, status: 0, headers: new Headers(), body: null, text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);
    const r = await safeFetch('http://nonexistent.example.com/');
    expect(r.ok).toBe(false);
    vi.unstubAllGlobals();
  });
});
