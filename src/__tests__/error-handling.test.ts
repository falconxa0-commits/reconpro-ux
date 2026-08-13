import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Error Handling Infrastructure", () => {
  it("should have a global error boundary (error.tsx)", () => {
    const errorPath = path.join(process.cwd(), "src/app/error.tsx");
    expect(fs.existsSync(errorPath)).toBe(true);
    
    const content = fs.readFileSync(errorPath, "utf-8");
    expect(content).toContain("reset");
    expect(content).toContain("error");
  });

  it("should have a not-found page (not-found.tsx)", () => {
    const notFoundPath = path.join(process.cwd(), "src/app/not-found.tsx");
    expect(fs.existsSync(notFoundPath)).toBe(true);
    
    const content = fs.readFileSync(notFoundPath, "utf-8");
    expect(content).toContain("404");
    expect(content).toContain("Return home");
  });

  it("should have a loading state (loading.tsx)", () => {
    const loadingPath = path.join(process.cwd(), "src/app/loading.tsx");
    expect(fs.existsSync(loadingPath)).toBe(true);
    
    const content = fs.readFileSync(loadingPath, "utf-8");
    expect(content).toContain("role=\"status\"");
  });

  it("error boundary should show error digest when available", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/error.tsx"), "utf-8"
    );
    expect(content).toContain("error.digest");
    expect(content).toContain("Error ID");
  });

  it("error boundary should use OLED design system", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/error.tsx"), "utf-8"
    );
    expect(content).toContain("bg-black");
    expect(content).toContain("text-white");
  });

  it("not-found page should provide navigation back", () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), "src/app/not-found.tsx"), "utf-8"
    );
    expect(content).toContain("href=\"/\"");
  });
});
