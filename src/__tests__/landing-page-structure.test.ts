import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

describe("Landing Page Structure", () => {
  const homePath = path.join(process.cwd(), "src/app/home-section.tsx");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(homePath, "utf-8");
  });

  // Required sections
  const requiredSections = [
    { component: "HeroSection", desc: "Hero" },
    { component: "FeaturesSection", desc: "Features" },
    { component: "ArchitectureSection", desc: "Architecture" },
    { component: "ModulesSection", desc: "Modules" },
    { component: "CLISection", desc: "CLI" },
    { component: "DocsSection", desc: "Docs" },
    { component: "BenchmarksSection", desc: "Benchmarks" },
    { component: "EnterpriseSection", desc: "Enterprise" },
    { component: "CommunitySection", desc: "Community" },
    { component: "Footer", desc: "Footer" },
  ];

  requiredSections.forEach(({ component, desc }) => {
    it(`should include ${desc} section`, () => {
      expect(content).toContain(component);
    });
  });

  it("should have semantic HTML structure", () => {
    expect(content).toContain('id="main-content"');
    expect(content).toContain("ScrollProgress");
  });

  it("should have scroll progress indicator", () => {
    expect(content).toContain("ScrollProgress");
  });

  it("should have back-to-top button", () => {
    expect(content).toContain("BackToTop");
  });

  it("should have command palette", () => {
    expect(content).toContain("CommandPalette");
  });

  it("should use glass-morphism separators between sections", () => {
    expect(content).toContain("via-white/[0.03]");
  });
});
