#!/bin/bash
# ReconPro v0.2.0 — Seed Database with Demo Data
# Usage: npx prisma db push && node scripts/seed.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ReconPro demo data...');

  // ── 1. Create Demo Organization ──────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      plan: 'enterprise',
      domain: 'acme-corp.com',
      maxScans: 10000,
      maxMembers: 100,
    },
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  // ── 2. Create Demo Users ──────────────────────────────────────────
  const bcrypt = require('bcryptjs');
  const demoUsers = [
    { name: 'Alex Chen', email: 'alex@acme-corp.com', role: 'owner' },
    { name: 'Sarah Kim', email: 'sarah@acme-corp.com', role: 'security_lead' },
    { name: 'James Wright', email: 'james@acme-corp.com', role: 'analyst' },
    { name: 'Maria Lopez', email: 'maria@acme-corp.com', role: 'viewer' },
  ];

  const members = [];
  for (const user of demoUsers) {
    const member = await prisma.member.upsert({
      where: { email: user.email },
      update: {},
      create: {
        organizationId: org.id,
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash: await bcrypt.hash('Demo123!', 12),
        lastActive: new Date(),
      },
    });
    members.push(member);
    console.log(`  User: ${user.name} (${user.email}) — ${user.role}`);
  }

  // ── 3. Create API Key ─────────────────────────────────────────────
  const crypto = require('crypto');
  const rawKey = 'rp_live_0123456789abcdef0123456789abcdef';
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  await prisma.apiKey.upsert({
    where: { keyHash },
    update: {},
    create: {
      organizationId: org.id,
      keyHash,
      keyPrefix: rawKey.slice(0, 12),
      name: 'Demo API Key',
      scopes: JSON.stringify(['scan:read', 'scan:write', 'telemetry:write']),
      isActive: true,
    },
  });
  console.log(`  API Key: ${rawKey.slice(0, 20)}... (for API testing)`);

  // ── 4. Create Scan Targets ───────────────────────────────────────
  const targets = ['acme-corp.com', 'api.acme-corp.com', 'staging.acme-corp.com'];
  const scanTargets = [];

  for (const domain of targets) {
    const target = await prisma.scanTarget.upsert({
      where: { id: `${domain}-target` },
      update: {},
      create: {
        id: `${domain}-target`,
        organizationId: org.id,
        domain,
        importance: domain === 'acme-corp.com' ? 'critical' : 'high',
        tags: JSON.stringify(['production', 'web']),
        lastScanned: new Date(Date.now() - 86400000),
      },
    });
    scanTargets.push(target);
    console.log(`  Target: ${domain}`);
  }

  // ── 5. Create Scans with Findings ─────────────────────────────────
  const scanTypes = ['full', 'quick', 'compliance'];
  const severities = ['critical', 'high', 'medium', 'low', 'info'];
  const categories = ['dns', 'ssl', 'header', 'port', 'vulnerability', 'technology', 'subdomain'];

  for (let i = 0; i < 3; i++) {
    const scan = await prisma.scan.create({
      data: {
        targetId: scanTargets[i].id,
        status: 'completed',
        scanType: scanTypes[i],
        triggeredBy: 'manual',
        triggeredById: members[0].id,
        riskScore: 72 - (i * 12),
        totalVulns: 8 + (i * 3),
        criticalCount: 1,
        highCount: 2 + i,
        mediumCount: 3 + i,
        lowCount: 2,
        infoCount: 3,
        complianceScore: 78 + (i * 5),
        startedAt: new Date(Date.now() - (86400000 * (i + 1))),
        completedAt: new Date(Date.now() - (86400000 * i)),
        duration: 45000 + (i * 15000),
      },
    });

    // Create findings for each scan
    const findingData = [
      { title: 'Missing SPF Record', severity: 'high', category: 'dns', asset: scanTargets[i].domain, description: 'SPF record is missing or misconfigured, allowing email spoofing.', remediation: 'Add a proper SPF record to your DNS configuration.' },
      { title: 'SSL Certificate Expiring Soon', severity: 'medium', category: 'ssl', asset: scanTargets[i].domain, description: 'SSL certificate expires within 30 days.', remediation: 'Renew the SSL certificate before expiry.' },
      { title: 'Port 22 Open to Internet', severity: 'high', category: 'port', asset: scanTargets[i].domain, description: 'SSH port is exposed to the public internet.', remediation: 'Restrict SSH access via firewall rules or VPN.' },
      { title: 'Missing Content-Security-Policy', severity: 'medium', category: 'header', asset: scanTargets[i].domain, description: 'No CSP header detected. Vulnerable to XSS attacks.', remediation: 'Implement a strict Content-Security-Policy header.' },
      { title: 'Outdated jQuery Detected', severity: 'low', category: 'technology', asset: scanTargets[i].domain, description: 'jQuery 3.6.0 detected. Consider updating to latest version.', remediation: 'Update jQuery to the latest stable version.' },
      { title: 'Open Redis Port', severity: 'critical', category: 'port', asset: scanTargets[i].domain, description: 'Redis (6379) is exposed to the internet without authentication.', remediation: 'Bind Redis to localhost and enable authentication.' },
      { title: 'Subdomain Takeover Risk', severity: 'high', category: 'subdomain', asset: `staging.${scanTargets[i].domain}`, description: 'CNAME record points to a decommissioned service.', remediation: 'Remove the CNAME record or re-provision the service.' },
      { title: 'HSTS Header Missing', severity: 'info', category: 'header', asset: scanTargets[i].domain, description: 'HTTP Strict Transport Security not enabled.', remediation: 'Add HSTS header with a minimum max-age of 1 year.' },
    ];

    for (const finding of findingData) {
      await prisma.finding.create({
        data: {
          scanId: scan.id,
          ...finding,
          status: finding.severity === 'critical' ? 'open' : ['acknowledged', 'mitigated', 'open'][Math.floor(Math.random() * 3)],
        },
      });
    }

    console.log(`  Scan #${i + 1}: ${scanTypes[i]} scan of ${targets[i]} — ${findingData.length} findings`);
  }

  // ── 6. Create Monitoring Policy ───────────────────────────────────
  await prisma.monitorPolicy.create({
    data: {
      organizationId: org.id,
      targetId: scanTargets[0].id,
      name: 'Daily Production Scan',
      schedule: 'daily',
      scanType: 'full',
      enabled: true,
      lastRunAt: new Date(Date.now() - 86400000),
      nextRunAt: new Date(Date.now() + 86400000),
      totalRuns: 42,
    },
  });
  console.log('  Monitor Policy: Daily Production Scan');

  // ── 7. Create Compliance Report ───────────────────────────────────
  await prisma.complianceReport.create({
    data: {
      organizationId: org.id,
      framework: 'soc2',
      overallScore: 82,
      status: 'pass',
      controls: JSON.stringify([
        { name: 'Access Control', status: 'pass', score: 95 },
        { name: 'Encryption', status: 'pass', score: 100 },
        { name: 'Network Security', status: 'needs_review', score: 72 },
        { name: 'Incident Response', status: 'pass', score: 88 },
        { name: 'Data Backup', status: 'pass', score: 90 },
      ]),
    },
  });
  console.log('  Compliance Report: SOC2 — 82%');

  // ── 8. Create Threat Alert ────────────────────────────────────────
  await prisma.threatAlert.create({
    data: {
      title: 'New CVE Detected: CVE-2024-38077',
      severity: 'critical',
      source: 'NVD Feed',
      description: 'Critical remote code execution vulnerability detected in a dependency used by acme-corp.com.',
      ioc: 'CVE-2024-38077',
    },
  });
  console.log('  Threat Alert: CVE-2024-38077');

  // ── 9. Create Integration ────────────────────────────────────────
  await prisma.integration.create({
    data: {
      organizationId: org.id,
      type: 'slack',
      name: '#security-alerts',
      config: JSON.stringify({ channel: '#security-alerts', webhookUrl: 'https://hooks.slack.com/...' }),
      enabled: true,
      lastSync: new Date(),
      eventsTotal: 156,
    },
  });
  console.log('  Integration: Slack #security-alerts');

  console.log('\nSeed complete. Demo credentials:');
  console.log('  Email:    alex@acme-corp.com');
  console.log('  Password: Demo123!');
  console.log('  API Key:  ' + rawKey);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
