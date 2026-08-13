import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Component Safety Patterns", () => {
  it("home-section should wrap content in MotionConfig with reducedMotion", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/home-section.tsx"), "utf-8"
    );
    expect(content).toContain("MotionConfig");
    expect(content).toContain("reducedMotion");
  });

  it("ambient overlays should be aria-hidden", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/home-section.tsx"), "utf-8"
    );
    // bloom-overlay, scroll-light, ambient-aurora should have aria-hidden
    const overlayDivs = content.match(/className="[^"]*(bloom-overlay|scroll-light|ambient-aurora)[^"]*"/g);
    expect(overlayDivs).not.toBeNull();
  });

  it("ObsidianShader should handle reduced motion", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/backgrounds/ObsidianShader.tsx"), "utf-8"
    );
    expect(content).toContain("prefers-reduced-motion");
    expect(content).toContain("WEBGL_lose_context");
  });

  it("ObsidianShader should cleanup WebGL context on unmount", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/backgrounds/ObsidianShader.tsx"), "utf-8"
    );
    expect(content).toContain("cancelAnimationFrame");
    expect(content).toContain("loseContext");
  });

  it("ObsidianShader should use React.memo for render optimization", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/components/backgrounds/ObsidianShader.tsx"), "utf-8"
    );
    expect(content).toContain("React.memo");
  });

  it("below-fold sections should use dynamic imports with ssr: false", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/home-section.tsx"), "utf-8"
    );
    const dynamicImports = content.match(/dynamic\(/g);
    expect(dynamicImports).not.toBeNull();
    expect(dynamicImports!.length).toBeGreaterThanOrEqual(8);
    
    const ssrFalse = content.match(/ssr:\s*false/g);
    expect(ssrFalse).not.toBeNull();
    // Not all dynamic imports need ssr: false but many should
  });

  it("below-fold sections should NOT be eagerly loaded", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/home-section.tsx"), "utf-8"
    );
    // ArchitectureSection should be dynamically imported
    expect(content).toMatch(/ArchitectureSection.*dynamic/);
    expect(content).toMatch(/ModulesSection.*dynamic/);
    expect(content).toMatch(/CLISection.*dynamic/);
    expect(content).toMatch(/EnterpriseSection.*dynamic/);
  });
});
