import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

describe("Middleware Security Headers", () => {
  const middlewarePath = path.join(process.cwd(), "src/middleware.ts");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(middlewarePath, "utf-8");
  });

  it("should set X-Frame-Options to DENY", () => {
    expect(content).toContain('"X-Frame-Options", "DENY"');
  });

  it("should set X-Content-Type-Options to nosniff", () => {
    expect(content).toContain('"X-Content-Type-Options", "nosniff"');
  });

  it("should set Referrer-Policy", () => {
    expect(content).toContain("Referrer-Policy");
  });

  it("should set Permissions-Policy blocking camera/mic/geolocation", () => {
    expect(content).toContain("Permissions-Policy");
    expect(content).toContain('camera=()');
    expect(content).toContain('microphone=()');
    expect(content).toContain('geolocation=()');
  });

  it("should set HSTS with includeSubDomains and preload", () => {
    expect(content).toContain("Strict-Transport-Security");
    expect(content).toContain("includeSubDomains");
    expect(content).toContain("max-age=31536000");
    expect(content).toContain("preload");
  });

  it("should remove X-Powered-By header", () => {
    expect(content).toContain('headers.delete("X-Powered-By")');
  });

  it("should set frame-ancestors to none in CSP", () => {
    expect(content).toContain("frame-ancestors 'none'");
  });

  it("should set form-action to self in CSP", () => {
    expect(content).toContain("form-action 'self'");
  });

  it("should set base-uri to self in CSP", () => {
    expect(content).toContain("base-uri 'self'");
  });

  it("should use nonce-based CSP for scripts (no unsafe-eval)", () => {
    expect(content).toContain("nonce-");
    expect(content).toContain("script-src");
    // Should NOT contain unsafe-eval
    expect(content).not.toContain("'unsafe-eval'");
  });

  it("should set object-src to none in CSP", () => {
    expect(content).toContain("object-src 'none'");
  });

  it("should include upgrade-insecure-requests in CSP", () => {
    expect(content).toContain("upgrade-insecure-requests");
  });

  it("should set Cross-Origin headers", () => {
    expect(content).toContain("Cross-Origin-Opener-Policy");
    expect(content).toContain("Cross-Origin-Resource-Policy");
  });

  it("should set X-Permitted-Cross-Domain-Policies", () => {
    expect(content).toContain("X-Permitted-Cross-Domain-Policies");
    expect(content).toContain("none");
  });

  it("should exclude API routes from middleware matcher", () => {
    expect(content).toMatch(/matcher[\s\S]*api/);
  });
});
