import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DOMAIN_REGEX,
  IPV4_REGEX,
  isValidTarget,
  sanitizeDomain,
  sanitizeTarget,
  isPrivateIP,
  isBlockedDomain,
  checkRateLimit,
  parseValidatedBody,
  safeErrorResponse,
} from "@/lib/api-security";

describe("api-security — Domain Validation", () => {
  it("should accept valid domains", () => {
    expect(DOMAIN_REGEX.test("example.com")).toBe(true);
    expect(DOMAIN_REGEX.test("sub.example.com")).toBe(true);
    expect(DOMAIN_REGEX.test("api.example.co.uk")).toBe(true);
    expect(DOMAIN_REGEX.test("test-site.example.org")).toBe(true);
    expect(DOMAIN_REGEX.test("a.co")).toBe(true);
  });

  it("should reject invalid domains", () => {
    expect(DOMAIN_REGEX.test("")).toBe(false);
    expect(DOMAIN_REGEX.test("localhost")).toBe(false);
    expect(DOMAIN_REGEX.test("192.168.1.1")).toBe(false);
    expect(DOMAIN_REGEX.test("example.com/path")).toBe(false);
    expect(DOMAIN_REGEX.test("https://example.com")).toBe(false);
    expect(DOMAIN_REGEX.test("; rm -rf /")).toBe(false);
    expect(DOMAIN_REGEX.test("$(whoami)")).toBe(false);
    expect(DOMAIN_REGEX.test("`cat /etc/passwd`")).toBe(false);
    expect(DOMAIN_REGEX.test("example.com; curl evil.com")).toBe(false);
    expect(DOMAIN_REGEX.test("a")).toBe(false);
    expect(DOMAIN_REGEX.test("-evil.com")).toBe(false);
  });
});

describe("api-security — IP Validation", () => {
  it("should match valid IPv4 addresses", () => {
    expect(IPV4_REGEX.test("8.8.8.8")).toBe(true);
    expect(IPV4_REGEX.test("192.168.1.1")).toBe(true);
    expect(IPV4_REGEX.test("0.0.0.0")).toBe(true);
    expect(IPV4_REGEX.test("255.255.255.255")).toBe(true);
  });

  it("should reject invalid IPv4", () => {
    expect(IPV4_REGEX.test("")).toBe(false);
    expect(IPV4_REGEX.test("example.com")).toBe(false);
    expect(IPV4_REGEX.test("1.2.3.4.5")).toBe(false);
  });
});

describe("api-security — isValidTarget", () => {
  it("should accept valid domains and IPs", () => {
    expect(isValidTarget("example.com")).toBe(true);
    expect(isValidTarget("8.8.8.8")).toBe(true);
  });

  it("should reject non-string, empty, and invalid targets", () => {
    expect(isValidTarget("")).toBe(false);
    expect(isValidTarget(null as unknown as string)).toBe(false);
    expect(isValidTarget(undefined as unknown as string)).toBe(false);
    expect(isValidTarget(123 as unknown as string)).toBe(false);
    expect(isValidTarget(" ")).toBe(false);
  });
});

describe("api-security — sanitizeDomain", () => {
  it("should strip protocol and path, lowercase", () => {
    expect(sanitizeDomain("https://Example.com/path")).toBe("example.com");
    expect(sanitizeDomain("http://sub.example.COM")).toBe("sub.example.com");
  });

  it("should return null for invalid input", () => {
    expect(sanitizeDomain("")).toBe(null);
    expect(sanitizeDomain("localhost")).toBe(null);
    expect(sanitizeDomain(null)).toBe(null);
    expect(sanitizeDomain(123)).toBe(null);
    expect(sanitizeDomain("$(whoami)")).toBe(null);
  });
});

describe("api-security — sanitizeTarget", () => {
  it("should accept domains and IPs", () => {
    expect(sanitizeTarget("example.com")).toBe("example.com");
    expect(sanitizeTarget("8.8.8.8")).toBe("8.8.8.8");
    expect(sanitizeTarget("https://Example.COM/")).toBe("example.com");
  });

  it("should return null for invalid", () => {
    expect(sanitizeTarget("")).toBe(null);
    expect(sanitizeTarget("; rm -rf")).toBe(null);
  });
});

describe("api-security — isPrivateIP (SSRF Protection)", () => {
  it("should block private ranges", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
    expect(isPrivateIP("192.168.1.1")).toBe(true);
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("169.254.169.254")).toBe(true);  // Cloud metadata
    expect(isPrivateIP("0.0.0.0")).toBe(true);
  });

  it("should block multicast and reserved", () => {
    expect(isPrivateIP("224.0.0.1")).toBe(true);
    expect(isPrivateIP("240.0.0.1")).toBe(true);
    expect(isPrivateIP("255.255.255.255")).toBe(true);
  });

  it("should allow public IPs", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
  });

  it("should block documentation/benchmark ranges", () => {
    expect(isPrivateIP("192.0.2.1")).toBe(true);    // TEST-NET-1
    expect(isPrivateIP("198.51.100.1")).toBe(true); // TEST-NET-2
    expect(isPrivateIP("203.0.113.1")).toBe(true);  // TEST-NET-3
  });

  it("should reject malformed IPs", () => {
    expect(isPrivateIP("")).toBe(true);
    expect(isPrivateIP("abc")).toBe(true);
    expect(isPrivateIP("1.2.3")).toBe(true);
    expect(isPrivateIP("1.2.3.4.5")).toBe(true);
    expect(isPrivateIP("999.999.999.999")).toBe(true);
  });
});

describe("api-security — isBlockedDomain", () => {
  it("should block internal/sensitive domains", () => {
    expect(isBlockedDomain("localhost")).toBe(true);
    expect(isBlockedDomain("metadata.google.internal")).toBe(true);
    expect(isBlockedDomain("test.local")).toBe(true);
    expect(isBlockedDomain("service.localhost")).toBe(true);
    expect(isBlockedDomain("evil.onion")).toBe(true);
  });

  it("should allow normal domains", () => {
    expect(isBlockedDomain("example.com")).toBe(false);
    expect(isBlockedDomain("google.com")).toBe(false);
    expect(isBlockedDomain("my-internal-blog.com")).toBe(false); // "internal" is substring, not a suffix
    expect(isBlockedDomain("internal.com")).toBe(false);  // "internal" is TLD, not in blocked list
  });

  it("should block subdomains of blocked names", () => {
    expect(isBlockedDomain("metadata.google.internal")).toBe(true);
    expect(isBlockedDomain("vault.service.consul")).toBe(true);
    expect(isBlockedDomain("kube-system.svc.cluster.local")).toBe(true);
  });
});

describe("api-security — Rate Limiting", () => {
  beforeEach(() => {
    // Rate limit store is module-level; we can't easily reset it,
    // but we use unique keys per test to avoid collisions.
  });

  it("should allow requests under the limit", () => {
    const key = `test-${Date.now()}-a`;
    const result1 = checkRateLimit(key, 3, 60_000);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = checkRateLimit(key, 3, 60_000);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it("should block requests over the limit", () => {
    const key = `test-${Date.now()}-b`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);

    const result = checkRateLimit(key, 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("api-security — parseValidatedBody", () => {
  it("should parse valid JSON", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "example.com" }),
    });
    const { body, error } = await parseValidatedBody(request);
    expect(error).toBeNull();
    expect((body as Record<string, string>).target).toBe("example.com");
  });

  it("should reject invalid JSON", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { error } = await parseValidatedBody(request);
    expect(error).not.toBeNull();
    expect(error?.status).toBe(400);
  });
});

describe("api-security — safeErrorResponse", () => {
  async function parseResponseBody(response: Response): Promise<Record<string, unknown>> {
    const text = await response.text();
    return JSON.parse(text);
  }

  it("should not leak error details in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const response = safeErrorResponse(
      new Error("Database connection failed: postgresql://admin:pass@db:5432"),
      500,
      "test-api"
    );

    const data = await parseResponseBody(response as unknown as Response);
    expect(data.error).toBe("An internal error occurred");
    expect(data.detail).toBeUndefined();
    expect(data.requestId).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });

  it("should include details in development", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const response = safeErrorResponse(
      new Error("Test error"),
      500,
      "test-api"
    );

    const data = await parseResponseBody(response as unknown as Response);
    expect(data.error).toBe("Test error");
    expect(data.detail).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });
});
