import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ── Landing Page Architecture ──────────────────────────────────────────────

describe("ReconPro Architecture", () => {
  it("should have a valid root layout", () => {
    // Verify the project structure exists
    const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
    expect(fs.existsSync(layoutPath)).toBe(true);
  });

  it("should have the home section component", () => {
    const homePath = path.join(process.cwd(), "src/app/home-section.tsx");
    expect(fs.existsSync(homePath)).toBe(true);
  });

  it("should have security middleware", () => {
    const middlewarePath = path.join(process.cwd(), "src/middleware.ts");
    expect(fs.existsSync(middlewarePath)).toBe(true);

    const content = fs.readFileSync(middlewarePath, "utf-8");
    expect(content).toContain("X-Frame-Options");
    expect(content).toContain("DENY");
    expect(content).toContain("X-Content-Type-Options");
    expect(content).toContain("nosniff");
    expect(content).toContain("Strict-Transport-Security");
    expect(content).toContain("Content-Security-Policy");
    expect(content).toContain("Referrer-Policy");
  });

  it("should have a sitemap generator", () => {
    const sitemapPath = path.join(process.cwd(), "src/app/sitemap.ts");
    expect(fs.existsSync(sitemapPath)).toBe(true);
  });

  it("should have JSON-LD structured data", () => {
    const jsonLdPath = path.join(process.cwd(), "src/components/seo/json-ld.tsx");
    expect(fs.existsSync(jsonLdPath)).toBe(true);

    const content = fs.readFileSync(jsonLdPath, "utf-8");
    expect(content).toContain("WebApplication");
    expect(content).toContain("Organization");
  });
});

// ── Security Configuration ──────────────────────────────────────────────

describe("Security Configuration", () => {
  it("CSP should disallow frame ancestors", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/middleware.ts"),
      "utf-8"
    );
    expect(content).toContain("frame-ancestors 'none'");
  });

  it("CSP should restrict script sources", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/middleware.ts"),
      "utf-8"
    );
    expect(content).toContain("script-src");
    expect(content).toContain("'self'");
  });

  it("should remove X-Powered-By header", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/middleware.ts"),
      "utf-8"
    );
    expect(content).toContain("X-Powered-By");
    expect(content).toContain("headers.delete");
  });

  it("should have HSTS with includeSubDomains", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/middleware.ts"),
      "utf-8"
    );
    expect(content).toContain("includeSubDomains");
  });
});

// ── Accessibility ──────────────────────────────────────────────

describe("Accessibility", () => {
  it("home section should have a skip link", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/home-section.tsx"),
      "utf-8"
    );
    // home-section.tsx has "skip" in the skip link text
    expect(content).toContain("Skip to main content");
  });

  it("main content should use accessible markup", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/home-section.tsx"),
      "utf-8"
    );
    expect(content).toContain('id="main-content"');
    expect(content).toContain('sr-only');
  });

  it("layout should set lang attribute", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/layout.tsx"),
      "utf-8"
    );
    expect(content).toContain('lang="en"');
  });

  it("navbar should have aria-label", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/reconpro/Navbar.tsx"),
      "utf-8"
    );
    expect(content).toContain('aria-label="Main navigation"');
  });

  it("command palette should have ARIA dialog role", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/reconpro/CommandPalette.tsx"),
      "utf-8"
    );
    expect(content).toContain('role="dialog"');
    expect(content).toContain('aria-modal="true"');
  });

  it("ObsidianShader should be aria-hidden", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/backgrounds/ObsidianShader.tsx"),
      "utf-8"
    );
    expect(content).toContain('aria-hidden="true"');
  });
});

// ── Performance ──────────────────────────────────────────────

describe("Performance Optimization", () => {
  it("below-fold sections should use dynamic imports", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/home-section.tsx"),
      "utf-8"
    );
    expect(content).toContain("dynamic(");
    expect(content).toContain("ssr: false");
  });

  it("WebGL shader should cap DPR at 2x", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/backgrounds/ObsidianShader.tsx"),
      "utf-8"
    );
    expect(content).toContain("Math.min(window.devicePixelRatio");
    expect(content).toContain(", 2");
  });

  it("shader should use high-performance power preference", () => {
    // Home section uses ObsidianShader for the WebGL background
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/backgrounds/ObsidianShader.tsx"),
      "utf-8"
    );
    expect(content).toContain("high-performance");
  });

  it("should use next/font for premium fonts", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/layout.tsx"),
      "utf-8"
    );
    expect(content).toContain("next/font/google");
    expect(content).toContain("Space_Grotesk");
    expect(content).toContain("Inter");
    expect(content).toContain("JetBrains_Mono");
  });

  it("fonts should use display swap", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/layout.tsx"),
      "utf-8"
    );
    expect(content).toContain('display: "swap"');
  });

  it("next.config should remove console in production", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "next.config.ts"),
      "utf-8"
    );
    expect(content).toContain("removeConsole");
  });
});

// ── SEO ──────────────────────────────────────────────

describe("SEO", () => {
  it("layout should have comprehensive metadata", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/layout.tsx"),
      "utf-8"
    );
    expect(content).toContain("metadataBase");
    expect(content).toContain("description");
    expect(content).toContain("keywords");
    expect(content).toContain("openGraph");
    expect(content).toContain("twitter");
    expect(content).toContain("robots");
  });

  it("should have favicon configured", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/layout.tsx"),
      "utf-8"
    );
    expect(content).toContain("favicon");
  });
});
