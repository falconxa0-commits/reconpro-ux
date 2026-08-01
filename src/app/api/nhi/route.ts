import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ORG_ID = 'org_default';

const RISK_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };

// Sample identity templates derived from reconpro.py NHI_IDENTITY_PATTERNS
const SAMPLE_IDENTITIES = [
  { identityType: 'aws_iam_role', identifier: 'arn:aws:iam::123456789012:role/EC2-Full-Access-Admin', displayName: 'EC2 Full Access Admin', cloudProvider: 'aws', permissions: JSON.stringify(['ec2:*', 's3:*', 'iam:PassRole', 'lambda:*']), riskLevel: 'critical', blastRadius: 342 },
  { identityType: 'aws_iam_role', identifier: 'arn:aws:iam::123456789012:role/Lambda-Execution-Role', displayName: 'Lambda Execution Role', cloudProvider: 'aws', permissions: JSON.stringify(['lambda:InvokeFunction', 'logs:*', 's3:GetObject']), riskLevel: 'normal', blastRadius: 47 },
  { identityType: 'aws_iam_user', identifier: 'arn:aws:iam::123456789012:user/devops-deployer', displayName: 'DevOps Deployer', cloudProvider: 'aws', permissions: JSON.stringify(['ec2:RunInstances', 's3:PutObject', 'cloudformation:*']), riskLevel: 'high', blastRadius: 128 },
  { identityType: 'aws_iam_role', identifier: 'arn:aws:iam::123456789012:role/CI-CD-Pipeline-Role', displayName: 'CI/CD Pipeline Role', cloudProvider: 'aws', permissions: JSON.stringify(['codebuild:*', 'codepipeline:*', 'ecr:*', 's3:*']), riskLevel: 'high', blastRadius: 89 },
  { identityType: 'gcp_service_account', identifier: 'prod-data-pipeline@acme-corp.iam.gserviceaccount.com', displayName: 'Prod Data Pipeline SA', cloudProvider: 'gcp', permissions: JSON.stringify(['bigquery.admin', 'storage.objectAdmin', 'pubsub.admin']), riskLevel: 'critical', blastRadius: 567 },
  { identityType: 'gcp_service_account', identifier: 'staging-api@acme-corp.iam.gserviceaccount.com', displayName: 'Staging API SA', cloudProvider: 'gcp', permissions: JSON.stringify(['run.invoker', 'storage.objectViewer']), riskLevel: 'normal', blastRadius: 12 },
  { identityType: 'gcp_service_account', identifier: 'ml-training-gpu@acme-corp.iam.gserviceaccount.com', displayName: 'ML Training GPU SA', cloudProvider: 'gcp', permissions: JSON.stringify(['compute.admin', 'storage.objectAdmin', 'aiplatform.admin']), riskLevel: 'high', blastRadius: 203 },
  { identityType: 'azure_app_registration', identifier: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', displayName: 'Azure AD Sync App', cloudProvider: 'azure', permissions: JSON.stringify(['Directory.ReadWrite.All', 'User.ReadWrite.All']), riskLevel: 'critical', blastRadius: 1500 },
  { identityType: 'azure_app_registration', identifier: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', displayName: 'KV Secrets Reader', cloudProvider: 'azure', permissions: JSON.stringify(['KeyVault.Secrets.Get']), riskLevel: 'low', blastRadius: 5 },
  { identityType: 'azure_managed_identity', identifier: '/subscriptions/abc123/resourcegroups/prod-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/app-identity', displayName: 'Prod App Managed Identity', cloudProvider: 'azure', permissions: JSON.stringify(['Microsoft.KeyVault/vaults/secrets/get', 'Microsoft.Storage/storageAccounts/read']), riskLevel: 'normal', blastRadius: 34 },
  { identityType: 'github_pat', identifier: 'ghp_xxxxxxxxxxxxxxxxxxxx workflow-token-prod', displayName: 'Production Workflow Token', cloudProvider: 'github', permissions: JSON.stringify(['repo', 'workflow', 'packages', 'admin:org']), riskLevel: 'critical', blastRadius: 78 },
  { identityType: 'github_pat', identifier: 'ghp_yyyyyyyyyyyyyyyyyyyy deploy-bot-token', displayName: 'Deploy Bot Token', cloudProvider: 'github', permissions: JSON.stringify(['repo', 'deployments', 'read:org']), riskLevel: 'high', blastRadius: 45 },
];

// GET — list identities with revocation stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const cloudFilter = searchParams.get('cloud');

    const where: Record<string, unknown> = { organizationId: ORG_ID };
    if (statusFilter) where.status = statusFilter;
    if (cloudFilter) where.cloudProvider = cloudFilter;

    const identities = await db.nHIIdentity.findMany({
      where,
      include: {
        _count: { select: { revocations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sort by risk level
    const sorted = identities.sort((a, b) => {
      const ra = RISK_ORDER[a.riskLevel] ?? 99;
      const rb = RISK_ORDER[b.riskLevel] ?? 99;
      return ra - rb;
    });

    const stats = {
      total: await db.nHIIdentity.count({ where: { organizationId: ORG_ID } }),
      active: await db.nHIIdentity.count({ where: { organizationId: ORG_ID, status: 'active' } }),
      suspect: await db.nHIIdentity.count({ where: { organizationId: ORG_ID, status: 'suspect' } }),
      revoked: await db.nHIIdentity.count({ where: { organizationId: ORG_ID, status: 'revoked' } }),
      critical: await db.nHIIdentity.count({ where: { organizationId: ORG_ID, riskLevel: 'critical' } }),
      totalBlastRadius: await db.nHIIdentity.aggregate({
        where: { organizationId: ORG_ID, status: { in: ['active', 'suspect'] } },
        _sum: { blastRadius: true },
      }),
      revoked24h: await db.nHIRevocation.count({
        where: {
          organizationId: ORG_ID,
          executedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    };

    return NextResponse.json({ identities: sorted, stats });
  } catch (error) {
    console.error('NHI GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch identities' }, { status: 500 });
  }
}

// POST — scan for identities (MVP: generate sample data)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { target, cloudProviders } = body as { target?: string; cloudProviders?: string[] };

    // Filter by cloud providers if specified
    const filtered = cloudProviders?.length
      ? SAMPLE_IDENTITIES.filter((i) => cloudProviders.includes(i.cloudProvider))
      : SAMPLE_IDENTITIES;

    // Create identities (skip duplicates by identifier)
    let created = 0;
    for (const id of filtered) {
      const exists = await db.nHIIdentity.findFirst({ where: { identifier: id.identifier, organizationId: ORG_ID } });
      if (!exists) {
        // Use a deterministic id based on identifier length for uniqueness
        try {
          await db.nHIIdentity.create({
            data: {
              organizationId: ORG_ID,
              identityType: id.identityType,
              identifier: id.identifier,
              displayName: id.displayName,
              cloudProvider: id.cloudProvider,
              permissions: id.permissions,
              riskLevel: id.riskLevel,
              blastRadius: id.blastRadius,
              lastRotated: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
            },
          });
          created++;
        } catch {
          // unique constraint on identifier may fail
        }
      }
    }

    // Audit log
    await db.nHIAuditLog.create({
      data: {
        organizationId: ORG_ID,
        action: 'identity_scan',
        resource: 'identity',
        details: JSON.stringify({ target: target || 'all', cloudProviders: cloudProviders || 'all', identitiesFound: filtered.length, created }),
      },
    });

    return NextResponse.json({ success: true, scanned: filtered.length, created, message: `Found ${filtered.length} identities, ${created} new` });
  } catch (error) {
    console.error('NHI POST error:', error);
    return NextResponse.json({ error: 'Failed to scan identities' }, { status: 500 });
  }
}
