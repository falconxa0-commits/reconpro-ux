import { extractClientIP } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/api-security';


// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface ControlDef {
  id: string;
  name: string;
  category: string;
  findingCategories: string[]; // which finding categories map to this control
}

interface FrameworkDef {
  name: string;
  icon: string;
  controls: ControlDef[];
}

interface EvaluatedControl {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'warn';
  evidence: string;
}

interface FrameworkResult {
  id: string;
  name: string;
  icon: string;
  score: number;
  status: 'pass' | 'warn' | 'fail' | 'needs_review';
  controlsPassed: number;
  controlsTotal: number;
  lastAssessed: string;
  controls: EvaluatedControl[];
}

// ═══════════════════════════════════════════════════════════════════════
// Finding category → Framework control mappings
// ═══════════════════════════════════════════════════════════════════════
// Finding categories from scan engine: subdomain, port, technology, ssl, dns, header, vulnerability
// Mapping logic:
//   security headers  → SOC2 CC6/CC7, GDPR Art.32, NIST PR.DS-1, ISO A.8.3, PCI-DSS 6.x
//   SSL/TLS           → HIPAA 164.312(e), PCI-DSS 4.1, ISO A.8.24, NIST PR.DS-2, SOC2 CC6.3, GDPR Art.32
//   open ports        → PCI-DSS 1.x, NIST PR.AC-5, ISO A.8.20, SOC2 CC7.1, HIPAA 164.310
//   DNS issues        → ISO A.8.x, NIST PR.DS-5, SOC2 CC9.1, GDPR Art.32
//   technology        → SOC2 CC8.1, NIST ID.AM-2, ISO A.5.1
//   vulnerability     → PCI-DSS 6.x, HIPAA 164.308(a)(1), NIST DE.CM-8, ISO A.8.8, SOC2 CC7.2, GDPR Art.32
//   subdomain         → NIST ID.AM-1, SOC2 CC9.1, PCI-DSS 2.x, ISO A.5.9

const FRAMEWORK_DEFS: Record<string, FrameworkDef> = {
  soc2: {
    name: 'SOC 2',
    icon: '🔒',
    controls: [
      { id: 'SOC2-CC6.1', name: 'Logical and Physical Access Controls', category: 'Access', findingCategories: ['header', 'port'] },
      { id: 'SOC2-CC6.2', name: 'User Authentication Mechanisms', category: 'Access', findingCategories: ['header'] },
      { id: 'SOC2-CC6.3', name: 'Role-Based Access Management', category: 'Access', findingCategories: ['vulnerability'] },
      { id: 'SOC2-CC7.1', name: 'Detection and Monitoring of System Events', category: 'Monitoring', findingCategories: ['port', 'subdomain'] },
      { id: 'SOC2-CC7.2', name: 'Incident Response Procedures', category: 'Incident', findingCategories: ['vulnerability', 'port'] },
      { id: 'SOC2-CC7.3', name: 'Security Event Evaluation', category: 'Monitoring', findingCategories: ['header', 'dns', 'ssl'] },
      { id: 'SOC2-CC8.1', name: 'Change Management Controls', category: 'Change', findingCategories: ['technology'] },
      { id: 'SOC2-CC8.2', name: 'Development and Testing Environments', category: 'Change', findingCategories: ['technology', 'subdomain'] },
      { id: 'SOC2-CC9.1', name: 'Risk Mitigation Strategies', category: 'Risk', findingCategories: ['subdomain', 'dns'] },
      { id: 'SOC2-CC9.2', name: 'Vulnerability Management', category: 'Risk', findingCategories: ['vulnerability', 'ssl', 'port'] },
      { id: 'SOC2-A1.2', name: 'Management Communication of Objectives', category: 'Governance', findingCategories: ['header'] },
      { id: 'SOC2-A1.3', name: 'Organizational Structure and Responsibilities', category: 'Governance', findingCategories: [] },
    ],
  },
  hipaa: {
    name: 'HIPAA',
    icon: '🏥',
    controls: [
      { id: 'HIPAA-164.308a1', name: 'Security Management Process', category: 'Administrative', findingCategories: ['vulnerability', 'port'] },
      { id: 'HIPAA-164.308a3', name: 'Workforce Security', category: 'Administrative', findingCategories: [] },
      { id: 'HIPAA-164.308a4', name: 'Information Access Management', category: 'Administrative', findingCategories: ['header', 'vulnerability'] },
      { id: 'HIPAA-164.308a5', name: 'Security Awareness Training', category: 'Administrative', findingCategories: [] },
      { id: 'HIPAA-164.308a6', name: 'Incident Response Plan', category: 'Administrative', findingCategories: ['vulnerability'] },
      { id: 'HIPAA-164.310a1', name: 'Facility Access Controls', category: 'Physical', findingCategories: ['port'] },
      { id: 'HIPAA-164.312a1', name: 'Access Control Mechanisms', category: 'Technical', findingCategories: ['header', 'vulnerability'] },
      { id: 'HIPAA-164.312a2', name: 'Audit Controls', category: 'Technical', findingCategories: [] },
      { id: 'HIPAA-164.312c1', name: 'Integrity Controls', category: 'Technical', findingCategories: ['ssl', 'dns'] },
      { id: 'HIPAA-164.312e1', name: 'Transmission Security', category: 'Technical', findingCategories: ['ssl'] },
      { id: 'HIPAA-164.314a1', name: 'Encryption in Transit and At Rest', category: 'Technical', findingCategories: ['ssl'] },
      { id: 'HIPAA-164.312b', name: 'Person or Entity Authentication', category: 'Technical', findingCategories: ['vulnerability'] },
    ],
  },
  pci_dss: {
    name: 'PCI-DSS',
    icon: '💳',
    controls: [
      { id: 'PCI-1.1', name: 'Network Firewall Configuration', category: 'Network', findingCategories: ['port'] },
      { id: 'PCI-1.2', name: 'Network Security Configurations', category: 'Network', findingCategories: ['port', 'subdomain'] },
      { id: 'PCI-2.1', name: 'Default Vendor-Supplied Passwords Changed', category: 'Config', findingCategories: ['technology', 'vulnerability'] },
      { id: 'PCI-2.2', name: 'Unnecessary Services Removed', category: 'Config', findingCategories: ['port', 'technology'] },
      { id: 'PCI-3.4', name: 'Cardholder Data Encryption', category: 'Data', findingCategories: ['ssl'] },
      { id: 'PCI-4.1', name: 'Encryption Key Management', category: 'Cryptography', findingCategories: ['ssl'] },
      { id: 'PCI-5.1', name: 'Malware Protection Mechanisms', category: 'Security', findingCategories: ['vulnerability'] },
      { id: 'PCI-5.2', name: 'Malware Definitions Updated', category: 'Security', findingCategories: ['vulnerability'] },
      { id: 'PCI-6.1', name: 'Secure System Development Process', category: 'Development', findingCategories: ['vulnerability'] },
      { id: 'PCI-6.3', name: 'Secure Application Coding Practices', category: 'Development', findingCategories: ['vulnerability'] },
      { id: 'PCI-7.1', name: 'Access to Cardholder Data Restricted', category: 'Access', findingCategories: ['vulnerability', 'header'] },
      { id: 'PCI-8.1', name: 'Unique User IDs for Each Person', category: 'Access', findingCategories: ['vulnerability'] },
    ],
  },
  iso27001: {
    name: 'ISO 27001',
    icon: '📋',
    controls: [
      { id: 'ISO-A.5.1', name: 'Information Security Policies', category: 'Policy', findingCategories: ['header'] },
      { id: 'ISO-A.5.2', name: 'Information Security Roles and Responsibilities', category: 'Policy', findingCategories: [] },
      { id: 'ISO-A.6.1', name: 'Screening and Background Checks', category: 'HR', findingCategories: [] },
      { id: 'ISO-A.6.2', name: 'Terms and Conditions of Employment', category: 'HR', findingCategories: [] },
      { id: 'ISO-A.7.1', name: 'Physical Security Perimeters', category: 'Physical', findingCategories: ['port'] },
      { id: 'ISO-A.7.2', name: 'Physical Entry Controls', category: 'Physical', findingCategories: [] },
      { id: 'ISO-A.8.1', name: 'User Endpoint Devices', category: 'Asset', findingCategories: ['technology'] },
      { id: 'ISO-A.8.2', name: 'Privileged Access Rights', category: 'Access', findingCategories: ['vulnerability', 'port'] },
      { id: 'ISO-A.8.3', name: 'Information Access Restriction', category: 'Access', findingCategories: ['header', 'vulnerability'] },
      { id: 'ISO-A.9.1', name: 'Exhibit A - Information Access Management', category: 'Access', findingCategories: ['header', 'vulnerability'] },
      { id: 'ISO-A.9.2', name: 'Secure Authentication', category: 'Access', findingCategories: ['ssl', 'vulnerability'] },
      { id: 'ISO-A.9.4', name: 'System and Application Access Control', category: 'Access', findingCategories: ['header', 'vulnerability'] },
    ],
  },
  nist: {
    name: 'NIST CSF',
    icon: '🏛️',
    controls: [
      { id: 'NIST-ID.AM-1', name: 'Asset Inventory Management', category: 'Identify', findingCategories: ['subdomain', 'port', 'technology'] },
      { id: 'NIST-ID.AM-2', name: 'Software Platform Inventory', category: 'Identify', findingCategories: ['technology'] },
      { id: 'NIST-ID.RA-1', name: 'Risk Assessment Process', category: 'Identify', findingCategories: ['vulnerability', 'port'] },
      { id: 'NIST-PR.AC-1', name: 'Access Control Policy', category: 'Protect', findingCategories: ['header'] },
      { id: 'NIST-PR.AC-3', name: 'Access Authorization Management', category: 'Protect', findingCategories: ['vulnerability'] },
      { id: 'NIST-PR.DS-1', name: 'Data-at-Rest Protection', category: 'Protect', findingCategories: ['ssl'] },
      { id: 'NIST-PR.DS-2', name: 'Data-in-Transit Protection', category: 'Protect', findingCategories: ['ssl', 'header'] },
      { id: 'NIST-DE.CM-1', name: 'Continuous Monitoring', category: 'Detect', findingCategories: ['port', 'subdomain', 'dns'] },
      { id: 'NIST-DE.AE-1', name: 'Event Detection Capability', category: 'Detect', findingCategories: ['vulnerability', 'port'] },
      { id: 'NIST-RS.RP-1', name: 'Incident Response Plan Execution', category: 'Respond', findingCategories: ['vulnerability'] },
      { id: 'NIST-RC.RP-1', name: 'Recovery Plan Execution', category: 'Recover', findingCategories: [] },
      { id: 'NIST-RC.CO-1', name: 'Recovery Testing', category: 'Recover', findingCategories: [] },
    ],
  },
  gdpr: {
    name: 'GDPR',
    icon: '🇪🇺',
    controls: [
      { id: 'GDPR-Art.5', name: 'Principles of Processing Personal Data', category: 'Principles', findingCategories: ['header'] },
      { id: 'GDPR-Art.6', name: 'Lawfulness of Processing', category: 'Legal', findingCategories: [] },
      { id: 'GDPR-Art.13', name: 'Information to be Provided to Data Subjects', category: 'Rights', findingCategories: ['header'] },
      { id: 'GDPR-Art.15', name: 'Right of Access by Data Subject', category: 'Rights', findingCategories: [] },
      { id: 'GDPR-Art.17', name: 'Right to Erasure', category: 'Rights', findingCategories: ['vulnerability'] },
      { id: 'GDPR-Art.20', name: 'Right to Data Portability', category: 'Rights', findingCategories: [] },
      { id: 'GDPR-Art.25', name: 'Data Protection by Design', category: 'Design', findingCategories: ['ssl', 'header'] },
      { id: 'GDPR-Art.30', name: 'Records of Processing Activities', category: 'Records', findingCategories: [] },
      { id: 'GDPR-Art.32', name: 'Security of Processing', category: 'Security', findingCategories: ['ssl', 'vulnerability', 'header', 'dns'] },
      { id: 'GDPR-Art.33', name: 'Notification of Breach to Supervisory Authority', category: 'Breach', findingCategories: ['vulnerability'] },
      { id: 'GDPR-Art.34', name: 'Communication of Breach to Data Subject', category: 'Breach', findingCategories: ['vulnerability'] },
      { id: 'GDPR-Art.35', name: 'Data Protection Impact Assessment', category: 'Assessment', findingCategories: [] },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Severity ordering for worst-case determination
// ═══════════════════════════════════════════════════════════════════════

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

// ═══════════════════════════════════════════════════════════════════════
// Evaluate a single framework's controls against findings
// ═══════════════════════════════════════════════════════════════════════

function evaluateControls(
  controls: ControlDef[],
  findings: { severity: string; category: string; description: string }[]
): EvaluatedControl[] {
  return controls.map((control) => {
    // If no categories mapped, control is not scannable — auto-pass
    if (control.findingCategories.length === 0) {
      return {
        id: control.id,
        name: control.name,
        category: control.category,
        status: 'pass' as const,
        evidence: 'Not assessable via automated scanning — requires manual review',
      };
    }

    // Find all relevant findings for this control
    const relevant = findings.filter((f) =>
      control.findingCategories.includes(f.category)
    );

    if (relevant.length === 0) {
      return {
        id: control.id,
        name: control.name,
        category: control.category,
        status: 'pass' as const,
        evidence: 'No relevant findings detected',
      };
    }

    // Sort by severity to find the worst
    const sorted = [...relevant].sort(
      (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
    );

    const worst = sorted[0];

    let status: 'pass' | 'fail' | 'warn';
    if (worst.severity === 'critical' || worst.severity === 'high') {
      status = 'fail';
    } else if (worst.severity === 'medium') {
      status = 'warn';
    } else {
      status = 'pass';
    }

    // Build evidence from all relevant non-info/low findings
    const notable = sorted.filter(
      (f) => (SEVERITY_RANK[f.severity] ?? 0) >= 2
    );
    const evidence =
      notable.length > 0
        ? notable.map((f) => `${f.description} [${f.severity}]`).join('; ')
        : 'No significant findings detected';

    return {
      id: control.id,
      name: control.name,
      category: control.category,
      status,
      evidence,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Determine framework-level status from score
// ═══════════════════════════════════════════════════════════════════════

function frameworkStatus(score: number): 'pass' | 'warn' | 'fail' {
  if (score >= 90) return 'pass';
  if (score >= 70) return 'warn';
  return 'fail';
}

// ═══════════════════════════════════════════════════════════════════════
// Format ISO date to YYYY-MM-DD
// ═══════════════════════════════════════════════════════════════════════

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════════
// GET handler
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');

    // ── Query findings ────────────────────────────────────────────────
    const findings = await db.finding.findMany({
      ...(scanId ? { where: { scanId } } : {}),
    });

    // ── Query scans ───────────────────────────────────────────────────
    const scans = await db.scan.findMany({
      ...(scanId ? { where: { id: scanId } } : {}),
      orderBy: { completedAt: 'desc' },
    });

    // ── No scans → return zero/needs_review state ─────────────────────
    if (scans.length === 0) {
      const emptyFrameworks = Object.entries(FRAMEWORK_DEFS).map(
        ([key, def]) => ({
          id: key,
          name: def.name,
          icon: def.icon,
          score: 0,
          status: 'needs_review' as const,
          controlsPassed: 0,
          controlsTotal: def.controls.length,
          lastAssessed: formatDate(new Date().toISOString()),
          controls: [] as EvaluatedControl[],
        })
      );

      return NextResponse.json({
        overallScore: 0,
        lastAssessed: formatDate(new Date().toISOString()),
        frameworks: emptyFrameworks,
      });
    }

    // ── Determine most recent scan timestamp ──────────────────────────
    const mostRecentScan = scans[0];
    const lastAssessed = mostRecentScan.completedAt
      ? formatDate(mostRecentScan.completedAt.toISOString())
      : formatDate(new Date().toISOString());

    // ── Evaluate each framework ───────────────────────────────────────
    const frameworks: FrameworkResult[] = Object.entries(FRAMEWORK_DEFS).map(
      ([key, def]) => {
        const evaluatedControls = evaluateControls(def.controls, findings);

        const passCount = evaluatedControls.filter(
          (c) => c.status === 'pass'
        ).length;
        const total = evaluatedControls.length;
        const score = Math.round((passCount / total) * 100);
        const status = frameworkStatus(score);

        return {
          id: key,
          name: def.name,
          icon: def.icon,
          score,
          status,
          controlsPassed: passCount,
          controlsTotal: total,
          lastAssessed,
          controls: evaluatedControls,
        };
      }
    );

    // ── Write ComplianceReport records only when tied to a specific scan ──
    // (prevents DB bloat from repeated GET calls without a scan)
    if (scanId) {
      const scanRecord = await db.scan.findUnique({ where: { id: scanId } });
      if (scanRecord) {
        for (const fw of frameworks) {
          await db.complianceReport.upsert({
            where: {
              id: `${scanId}-${fw.id}`,
            },
            create: {
              id: `${scanId}-${fw.id}`,
              organizationId: scanRecord.targetId ?? 'default',
              framework: fw.id,
              scanId: scanId,
              overallScore: fw.score,
              status: fw.status,
              controls: JSON.stringify(fw.controls),
            },
            update: {
              overallScore: fw.score,
              status: fw.status,
              controls: JSON.stringify(fw.controls),
            },
          });
        }
      }
    }

    // ── Return response ───────────────────────────────────────────────
    const overallScore = Math.round(
      frameworks.reduce((sum, fw) => sum + fw.score, 0) / frameworks.length
    );

    return NextResponse.json({
      overallScore,
      lastAssessed,
      frameworks,
    });
  } catch (error) {
    console.error('Compliance API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate compliance data' },
      { status: 500 }
    );
  }
}
