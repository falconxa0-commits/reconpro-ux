import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

describe("Database Schema Integrity", () => {
  const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(schemaPath, "utf-8");
  });

  // Core models that must exist
  const requiredModels = [
    "Organization",
    "Team",
    "Member",
    "ScanTarget",
    "Scan",
    "Finding",
    "ApiKey",
    "AuditLog",
    "ComplianceReport",
    "ThreatAlert",
    "GenesisStamp",
    "NHIIdentity",
  ];

  requiredModels.forEach(model => {
    it(`should have model: ${model}`, () => {
      expect(content).toContain(`model ${model}`);
    });
  });

  it("should have API key security fields", () => {
    expect(content).toContain("keyHash");
    expect(content).toContain("isActive");
    expect(content).toContain("expiresAt");
  });

  it("should have scan status tracking", () => {
    expect(content).toContain("status");
    expect(content).toContain("riskScore");
    expect(content).toContain("completedAt");
  });

  it("should have finding severity classification", () => {
    expect(content).toContain("severity");
    expect(content).toContain("category");
    expect(content).toContain("evidence");
  });

  it("should use cuid for primary keys", () => {
    expect(content).toContain("@default(cuid())");
  });

  it("should have audit trail with IP addresses", () => {
    expect(content).toContain("ipAddress");
  });
});
