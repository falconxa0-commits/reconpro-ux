import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Production Readiness", () => {
  it("next.config should remove console.log in production", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "next.config.ts"), "utf-8"
    );
    expect(content).toContain("removeConsole");
  });

  it("next.config should enable reactStrictMode", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "next.config.ts"), "utf-8"
    );
    expect(content).toContain("reactStrictMode: true");
  });

  it("next.config should NOT ignore TypeScript build errors", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "next.config.ts"), "utf-8"
    );
    expect(content).toContain("ignoreBuildErrors: false");
  });

  it("next.config should configure image optimization", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "next.config.ts"), "utf-8"
    );
    expect(content).toContain("image/avif");
    expect(content).toContain("image/webp");
  });

  it("tsconfig should have strict mode enabled", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "tsconfig.json"), "utf-8"
    );
    expect(content).toContain('"strict": true');
  });

  it("should have a Prisma schema", () => {
    expect(fs.existsSync(
      path.join(process.cwd(), "prisma/schema.prisma")
    )).toBe(true);
  });

  it("Prisma schema should use SQLite datasource", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "prisma/schema.prisma"), "utf-8"
    );
    expect(content).toContain('provider = "sqlite"');
  });

  it("should have robots.txt", () => {
    expect(fs.existsSync(
      path.join(process.cwd(), "public/robots.txt")
    )).toBe(true);
  });

  it("should have favicon", () => {
    expect(fs.existsSync(
      path.join(process.cwd(), "public/favicon.svg")
    )).toBe(true);
  });

  it("should have a sitemap generator", () => {
    expect(fs.existsSync(
      path.join(process.cwd(), "src/app/sitemap.ts")
    )).toBe(true);
  });
});
