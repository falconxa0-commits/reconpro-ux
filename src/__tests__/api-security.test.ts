import { describe, it, expect } from "vitest";

describe("API Security — Input Validation", () => {
  // Domain validation regex (same as scan/stream/route.ts)
  const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;
  
  it("should accept valid domains", () => {
    expect(DOMAIN_REGEX.test("example.com")).toBe(true);
    expect(DOMAIN_REGEX.test("sub.example.com")).toBe(true);
    expect(DOMAIN_REGEX.test("api.example.co.uk")).toBe(true);
    expect(DOMAIN_REGEX.test("test-site.example.org")).toBe(true);
  });

  it("should reject invalid domains", () => {
    expect(DOMAIN_REGEX.test("")).toBe(false);
    expect(DOMAIN_REGEX.test("localhost")).toBe(false);
    expect(DOMAIN_REGEX.test("192.168.1.1")).toBe(false);
    expect(DOMAIN_REGEX.test("internal")).toBe(false);
    expect(DOMAIN_REGEX.test("example.com/path")).toBe(false);
    expect(DOMAIN_REGEX.test("https://example.com")).toBe(false);
    expect(DOMAIN_REGEX.test("; rm -rf /")).toBe(false);
    expect(DOMAIN_REGEX.test("$(whoami)")).toBe(false);
    expect(DOMAIN_REGEX.test("`cat /etc/passwd`")).toBe(false);
    expect(DOMAIN_REGEX.test("example.com; curl evil.com")).toBe(false);
  });

  // SSRF protection (same as scan/route.ts)
  function isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    if (a >= 224) return true;
    return false;
  }

  it("should block private/reserved IP ranges", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("192.168.1.1")).toBe(true);
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("169.254.169.254")).toBe(true);
    expect(isPrivateIP("0.0.0.0")).toBe(true);
    expect(isPrivateIP("224.0.0.1")).toBe(true);
    expect(isPrivateIP("255.255.255.255")).toBe(true);
  });

  it("should allow public IP ranges", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
    expect(isPrivateIP("203.0.113.1")).toBe(false);
  });

  it("should reject malformed IPs", () => {
    expect(isPrivateIP("")).toBe(true);
    expect(isPrivateIP("abc")).toBe(true);
    expect(isPrivateIP("1.2.3")).toBe(true);
    expect(isPrivateIP("1.2.3.4.5")).toBe(true);
  });

  // Blocked domains check
  const BLOCKED = ['localhost', 'internal', 'metadata'];
  
  it("should block internal/sensitive domains", () => {
    const isBlocked = (domain: string) => 
      BLOCKED.some(d => domain.includes(d)) || domain.endsWith('.local') || domain.endsWith('.internal');
    
    expect(isBlocked("localhost")).toBe(true);
    expect(isBlocked("metadata.google.internal")).toBe(true);
    expect(isBlocked("test.local")).toBe(true);
    expect(isBlocked("my-internal-service.com")).toBe(true);
    expect(isBlocked("example.com")).toBe(false);
  });

  // Test target validation from bot-hunter
  it("should validate bot-hunter target format", () => {
    const isValidTarget = (target: string) => 
      /^[a-zA-Z0-9][\w.-]+$/.test(target) || /^\d+\.\d+\.\d+\.\d+$/.test(target);
    
    expect(isValidTarget("example.com")).toBe(true);
    expect(isValidTarget("8.8.8.8")).toBe(true);
    expect(isValidTarget("; rm -rf")).toBe(false);
    expect(isValidTarget("$(whoami)")).toBe(false);
    expect(isValidTarget("")).toBe(false);
  });
});
