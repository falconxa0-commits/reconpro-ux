/**
 * Database Schema Tests
 *
 * Tests that the Prisma schema has proper models, relations, required fields,
 * correct primary key strategies, indexing, and security-related constraints.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Database Schema Integrity', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(schemaPath, 'utf-8');
  });

  // ── Core Models Must Exist ──────────────────────────────────────

  const requiredModels = [
    'Organization',
    'Team',
    'Member',
    'TeamMember',
    'ScanTarget',
    'Scan',
    'Finding',
    'ThreatAlert',
    'ComplianceReport',
    'MonitorPolicy',
    'Integration',
    'ApiKey',
    'AuditLog',
    'VibeSecEntry',
    'NHIIdentity',
    'NHIRevocation',
    'NHIAuditLog',
    'NHIImpactAssessment',
    'GenesisStamp',
    'GenesisAuditTrail',
    'ImplosionScenario',
  ];

  requiredModels.forEach(model => {
    it(`should have model: ${model}`, () => {
      expect(content).toContain(`model ${model}`);
    });
  });

  it('should have at least 20 models', () => {
    const modelCount = (content.match(/^model \w+/gm) || []).length;
    expect(modelCount).toBeGreaterThanOrEqual(20);
  });

  // ── Primary Key Strategy ────────────────────────────────────────

  it('should use cuid for primary keys', () => {
    const cuidCount = (content.match(/@default\(cuid\(\)\)/g) || []).length;
    expect(cuidCount).toBeGreaterThanOrEqual(15);
  });

  it('should NOT use autoincrement for primary keys (prefer cuid)', () => {
    expect(content).not.toContain('@default(autoincrement())');
  });

  // ── Organization Relations ──────────────────────────────────────

  it('Organization should have relations to Team, Member, ScanTarget, etc.', () => {
    const orgBlock = content.match(/model Organization \{[\s\S]*?\n\}/);
    expect(orgBlock).not.toBeNull();
    const block = orgBlock![0];

    expect(block).toContain('teams');
    expect(block).toContain('members');
    expect(block).toContain('scanTargets');
    expect(block).toContain('monitorPolicies');
    expect(block).toContain('integrations');
    expect(block).toContain('apiKeys');
    expect(block).toContain('auditLogs');
    expect(block).toContain('genesisStamps');
  });

  it('Organization should have required fields', () => {
    const orgBlock = content.match(/model Organization \{[\s\S]*?\n\}/);
    expect(orgBlock).not.toBeNull();
    const block = orgBlock![0];

    expect(block).toContain('name');
    expect(block).toContain('slug');
    expect(block).toContain('plan');
  });

  it('Organization should have unique slug', () => {
    const orgBlock = content.match(/model Organization \{[\s\S]*?\n\}/);
    expect(orgBlock).not.toBeNull();
    expect(orgBlock![0]).toContain('slug');
    expect(orgBlock![0]).toContain('@unique');
  });

  // ── Scan Engine Relations ───────────────────────────────────────

  it('Scan should belong to ScanTarget', () => {
    const scanBlock = content.match(/model Scan \{[\s\S]*?\n\}/);
    expect(scanBlock).not.toBeNull();
    const block = scanBlock![0];
    expect(block).toContain('targetId');
    expect(block).toContain('ScanTarget');
    expect(block).toContain('@relation');
  });

  it('Finding should belong to Scan', () => {
    const findingBlock = content.match(/model Finding \{[\s\S]*?\n\}/);
    expect(findingBlock).not.toBeNull();
    const block = findingBlock![0];
    expect(block).toContain('scanId');
    expect(block).toContain('Scan');
    expect(block).toContain('@relation');
  });

  it('Scan should have risk score fields', () => {
    const scanBlock = content.match(/model Scan \{[\s\S]*?\n\}/);
    expect(scanBlock).not.toBeNull();
    const block = scanBlock![0];
    expect(block).toContain('riskScore');
    expect(block).toContain('totalVulns');
    expect(block).toContain('criticalCount');
    expect(block).toContain('highCount');
    expect(block).toContain('mediumCount');
    expect(block).toContain('lowCount');
  });

  it('Finding should have severity classification', () => {
    const findingBlock = content.match(/model Finding \{[\s\S]*?\n\}/);
    expect(findingBlock).not.toBeNull();
    const block = findingBlock![0];
    expect(block).toContain('severity');
    expect(block).toContain('category');
    expect(block).toContain('evidence');
    expect(block).toContain('remediation');
  });

  it('Finding should support CVE linking', () => {
    const findingBlock = content.match(/model Finding \{[\s\S]*?\n\}/);
    expect(findingBlock).not.toBeNull();
    const block = findingBlock![0];
    expect(block).toContain('cve');
    expect(block).toContain('cvss');
  });

  // ── API Key Security ─────────────────────────────────────────────

  it('ApiKey should have security fields', () => {
    const apiKeyBlock = content.match(/model ApiKey \{[\s\S]*?\n\}/);
    expect(apiKeyBlock).not.toBeNull();
    const block = apiKeyBlock![0];
    expect(block).toContain('keyHash');
    expect(block).toContain('keyPrefix');
    expect(block).toContain('isActive');
    expect(block).toContain('expiresAt');
  });

  it('ApiKey should have unique keyHash', () => {
    const apiKeyBlock = content.match(/model ApiKey \{[\s\S]*?\n\}/);
    expect(apiKeyBlock).not.toBeNull();
    const block = apiKeyBlock![0];
    // keyHash line should have @unique
    const keyHashLine = block.split('\n').find(l => l.includes('keyHash'));
    expect(keyHashLine).toBeDefined();
    expect(keyHashLine).toContain('@unique');
  });

  it('ApiKey should have scopes (JSON array)', () => {
    const apiKeyBlock = content.match(/model ApiKey \{[\s\S]*?\n\}/);
    expect(apiKeyBlock).not.toBeNull();
    expect(apiKeyBlock![0]).toContain('scopes');
  });

  // ── Audit Trail ────────────────────────────────────────────────

  it('AuditLog should have IP address tracking', () => {
    const auditBlock = content.match(/model AuditLog \{[\s\S]*?\n\}/);
    expect(auditBlock).not.toBeNull();
    const block = auditBlock![0];
    expect(block).toContain('ipAddress');
  });

  it('AuditLog should track actor (member or apiKey)', () => {
    const auditBlock = content.match(/model AuditLog \{[\s\S]*?\n\}/);
    expect(auditBlock).not.toBeNull();
    const block = auditBlock![0];
    expect(block).toContain('memberId');
    expect(block).toContain('apiKeyId');
  });

  it('AuditLog should have action and resource fields', () => {
    const auditBlock = content.match(/model AuditLog \{[\s\S]*?\n\}/);
    expect(auditBlock).not.toBeNull();
    const block = auditBlock![0];
    expect(block).toContain('action');
    expect(block).toContain('resource');
    expect(block).toContain('resourceId');
  });

  // ── NHI (Non-Human Identity) ────────────────────────────────────

  it('NHIIdentity should have cloud provider and permissions', () => {
    const nhiBlock = content.match(/model NHIIdentity \{[\s\S]*?\n\}/);
    expect(nhiBlock).not.toBeNull();
    const block = nhiBlock![0];
    expect(block).toContain('cloudProvider');
    expect(block).toContain('permissions');
    expect(block).toContain('identityType');
    expect(block).toContain('riskLevel');
  });

  it('NHIIdentity should have revocation tracking', () => {
    const nhiBlock = content.match(/model NHIIdentity \{[\s\S]*?\n\}/);
    expect(nhiBlock).not.toBeNull();
    const block = nhiBlock![0];
    expect(block).toContain('status');
    expect(block).toContain('blastRadius');
    expect(block).toContain('revocations');
  });

  it('NHIRevocation should have rollback support', () => {
    const revBlock = content.match(/model NHIRevocation \{[\s\S]*?\n\}/);
    expect(revBlock).not.toBeNull();
    const block = revBlock![0];
    expect(block).toContain('rollbackData');
    expect(block).toContain('rolledBackAt');
  });

  // ── Genesis Stamp ──────────────────────────────────────────────

  it('GenesisStamp should have cryptographic attestation fields', () => {
    const stampBlock = content.match(/model GenesisStamp \{[\s\S]*?\n\}/);
    expect(stampBlock).not.toBeNull();
    const block = stampBlock![0];
    expect(block).toContain('signature');
    expect(block).toContain('publicKey');
    expect(block).toContain('payloadHash');
    expect(block).toContain('stampId');
  });

  it('GenesisStamp should have unique stampId', () => {
    const stampBlock = content.match(/model GenesisStamp \{[\s\S]*?\n\}/);
    expect(stampBlock).not.toBeNull();
    const block = stampBlock![0];
    const stampIdLine = block.split('\n').find(l => l.includes('stampId'));
    expect(stampIdLine).toBeDefined();
    expect(stampIdLine).toContain('@unique');
  });

  it('GenesisStamp should track verification count', () => {
    const stampBlock = content.match(/model GenesisStamp \{[\s\S]*?\n\}/);
    expect(stampBlock).not.toBeNull();
    expect(stampBlock![0]).toContain('verifiedCount');
    expect(stampBlock![0]).toContain('embedViews');
  });

  // ── Timestamps — models that have createdAt ───────────────────

  it('models with createdAt should correctly define it', () => {
    // Only include models that actually have createdAt in the schema
    const modelsWithCreatedAt = [
      'Organization', 'Team', 'Member', 'ScanTarget',
      'Finding', 'ThreatAlert', 'MonitorPolicy',
      'Integration', 'ApiKey', 'AuditLog',
      'NHIIdentity', 'VibeSecEntry', 'ImplosionScenario',
    ];

    for (const model of modelsWithCreatedAt) {
      const block = content.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`));
      expect(block).not.toBeNull();
      expect(block![0]).toContain('createdAt');
    }
  });

  // ── Models with non-standard timestamp fields ─────────────────

  it('Scan should use startedAt instead of createdAt', () => {
    const scanBlock = content.match(/model Scan \{[\s\S]*?\n\}/);
    expect(scanBlock).not.toBeNull();
    expect(scanBlock![0]).toContain('startedAt');
  });

  it('ComplianceReport should use generatedAt', () => {
    const compBlock = content.match(/model ComplianceReport \{[\s\S]*?\n\}/);
    expect(compBlock).not.toBeNull();
    expect(compBlock![0]).toContain('generatedAt');
  });

  it('NHIRevocation should use executedAt', () => {
    const revBlock = content.match(/model NHIRevocation \{[\s\S]*?\n\}/);
    expect(revBlock).not.toBeNull();
    expect(revBlock![0]).toContain('executedAt');
  });

  it('GenesisStamp should use issuedAt', () => {
    const stampBlock = content.match(/model GenesisStamp \{[\s\S]*?\n\}/);
    expect(stampBlock).not.toBeNull();
    expect(stampBlock![0]).toContain('issuedAt');
  });

  it('mutable models should have updatedAt', () => {
    const mutableModels = ['Organization', 'NHIIdentity'];
    for (const model of mutableModels) {
      const block = content.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`));
      expect(block).not.toBeNull();
      expect(block![0]).toContain('updatedAt');
    }
  });

  // ── Compliance ───────────────────────────────────────────────────

  it('ComplianceReport should support multiple frameworks', () => {
    const compBlock = content.match(/model ComplianceReport \{[\s\S]*?\n\}/);
    expect(compBlock).not.toBeNull();
    const block = compBlock![0];
    expect(block).toContain('framework');
    expect(block).toContain('overallScore');
    expect(block).toContain('status');
  });

  // ── Integration ────────────────────────────────────────────────

  it('Integration should have type, config, and enabled fields', () => {
    const intBlock = content.match(/model Integration \{[\s\S]*?\n\}/);
    expect(intBlock).not.toBeNull();
    const block = intBlock![0];
    expect(block).toContain('type');
    expect(block).toContain('config');
    expect(block).toContain('enabled');
  });

  // ── Team Relations ───────────────────────────────────────────────

  it('Team should belong to Organization', () => {
    const teamBlock = content.match(/model Team \{[\s\S]*?\n\}/);
    expect(teamBlock).not.toBeNull();
    const block = teamBlock![0];
    expect(block).toContain('organizationId');
    expect(block).toContain('Organization');
  });

  it('TeamMember should be a join model', () => {
    const tmBlock = content.match(/model TeamMember \{[\s\S]*?\n\}/);
    expect(tmBlock).not.toBeNull();
    const block = tmBlock![0];
    expect(block).toContain('teamId');
    expect(block).toContain('memberId');
    expect(block).toContain('role');
  });

  // ── Unique Constraints ──────────────────────────────────────────

  it('should have at least 3 unique constraints', () => {
    const uniqueCount = (content.match(/@unique/g) || []).length;
    expect(uniqueCount).toBeGreaterThanOrEqual(3);
  });

  // ── ImplosionScenario ───────────────────────────────────────────

  it('ImplosionScenario should have financial impact fields', () => {
    const impBlock = content.match(/model ImplosionScenario \{[\s\S]*?\n\}/);
    expect(impBlock).not.toBeNull();
    const block = impBlock![0];
    expect(block).toContain('dataBreachCost');
    expect(block).toContain('regulatoryFines');
    expect(block).toContain('reputationalDamage');
  });

  // ── Database Provider ──────────────────────────────────────────

  it('should use sqlite as the database provider', () => {
    expect(content).toContain('provider = "sqlite"');
    expect(content).toContain('prisma-client-js');
  });

  it('should use env variable for DATABASE_URL', () => {
    expect(content).toContain('url      = env("DATABASE_URL")');
  });
});
