import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

describe("SEO & Metadata Configuration", () => {
  const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(layoutPath, "utf-8");
  });

  it("should have a descriptive title with template", () => {
    expect(content).toContain("title");
    expect(content).toContain("template");
    expect(content).toContain("ReconPro");
  });

  it("should have metadataBase set", () => {
    expect(content).toContain("metadataBase");
    expect(content).toContain("https://reconpro.dev");
  });

  it("should have a meaningful description", () => {
    expect(content).toContain("description");
    const descMatch = content.match(/description:\s*["'](.+?)["']/);
    expect(descMatch).not.toBeNull();
    expect(descMatch![1].length).toBeGreaterThanOrEqual(50);
  });

  it("should have keywords for SEO", () => {
    expect(content).toContain("keywords");
  });

  it("should have OpenGraph configuration", () => {
    expect(content).toContain("openGraph");
    expect(content).toContain("type:");
    expect(content).toContain("images:");
  });

  it("should have Twitter card configuration", () => {
    expect(content).toContain("twitter");
    expect(content).toContain("card:");
  });

  it("should have proper robots configuration", () => {
    expect(content).toContain("robots");
    expect(content).toContain("index: true");
    expect(content).toContain("googleBot");
  });

  it("should have favicon and icons configured", () => {
    expect(content).toContain("icons");
    expect(content).toContain("favicon");
  });

  it("should have JSON-LD structured data component", () => {
    const jsonLdPath = path.join(process.cwd(), "src/components/seo/json-ld.tsx");
    expect(fs.existsSync(jsonLdPath)).toBe(true);

    const jsonLdContent = fs.readFileSync(jsonLdPath, "utf-8");
    expect(jsonLdContent).toContain("WebApplication");
    expect(jsonLdContent).toContain("Organization");
  });

  it("should have a sitemap generator", () => {
    const sitemapPath = path.join(process.cwd(), "src/app/sitemap.ts");
    expect(fs.existsSync(sitemapPath)).toBe(true);

    const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
    expect(sitemapContent).toContain("lastModified");
  });
});
