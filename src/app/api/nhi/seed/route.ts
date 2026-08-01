import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ORG_ID = 'org_default';

const SEED_DATA = [
  { identityType: 'aws_iam_role', identifier: 'arn:aws:iam::123456789012:role/EC2-Full-Access-Admin', displayName: 'EC2 Full Access Admin', cloudProvider: 'aws', permissions: JSON.stringify(['ec2:*', 's3:*', 'iam:PassRole', 'lambda:*']), riskLevel: 'critical', blastRadius: 342, status: 'suspect' },
  { identityType: 'aws_iam_role', identifier: 'arn:aws:iam::123456789012:role/Lambda-Execution-Role', displayName: 'Lambda Execution Role', cloudProvider: 'aws', permissions: JSON.stringify(['lambda:InvokeFunction', 'logs:*', 's3:GetObject']), riskLevel: 'normal', blastRadius: 47, status: 'active' },
  { identityType: 'aws_iam_user', identifier: 'arn:aws:iam::123456789012:user/devops-deployer', displayName: 'DevOps Deployer', cloudProvider: 'aws', permissions: JSON.stringify(['ec2:RunInstances', 's3:PutObject', 'cloudformation:*']), riskLevel: 'high', blastRadius: 128, status: 'active' },
  { identityType: 'aws_iam_role', identifier: 'arn:aws:iam::123456789012:role/CI-CD-Pipeline-Role', displayName: 'CI/CD Pipeline Role', cloudProvider: 'aws', permissions: JSON.stringify(['codebuild:*', 'codepipeline:*', 'ecr:*', 's3:*']), riskLevel: 'high', blastRadius: 89, status: 'suspect' },
  { identityType: 'gcp_service_account', identifier: 'prod-data-pipeline@acme-corp.iam.gserviceaccount.com', displayName: 'Prod Data Pipeline SA', cloudProvider: 'gcp', permissions: JSON.stringify(['bigquery.admin', 'storage.objectAdmin', 'pubsub.admin']), riskLevel: 'critical', blastRadius: 567, status: 'suspect' },
  { identityType: 'gcp_service_account', identifier: 'staging-api@acme-corp.iam.gserviceaccount.com', displayName: 'Staging API SA', cloudProvider: 'gcp', permissions: JSON.stringify(['run.invoker', 'storage.objectViewer']), riskLevel: 'normal', blastRadius: 12, status: 'active' },
  { identityType: 'gcp_service_account', identifier: 'ml-training-gpu@acme-corp.iam.gserviceaccount.com', displayName: 'ML Training GPU SA', cloudProvider: 'gcp', permissions: JSON.stringify(['compute.admin', 'storage.objectAdmin', 'aiplatform.admin']), riskLevel: 'high', blastRadius: 203, status: 'active' },
  { identityType: 'azure_app_registration', identifier: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', displayName: 'Azure AD Sync App', cloudProvider: 'azure', permissions: JSON.stringify(['Directory.ReadWrite.All', 'User.ReadWrite.All']), riskLevel: 'critical', blastRadius: 1500, status: 'active' },
  { identityType: 'azure_app_registration', identifier: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', displayName: 'KV Secrets Reader', cloudProvider: 'azure', permissions: JSON.stringify(['KeyVault.Secrets.Get']), riskLevel: 'low', blastRadius: 5, status: 'active' },
  { identityType: 'azure_managed_identity', identifier: '/subscriptions/abc123/resourcegroups/prod-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/app-identity', displayName: 'Prod App Managed Identity', cloudProvider: 'azure', permissions: JSON.stringify(['Microsoft.KeyVault/vaults/secrets/get', 'Microsoft.Storage/storageAccounts/read']), riskLevel: 'normal', blastRadius: 34, status: 'active' },
  { identityType: 'github_pat', identifier: 'ghp_xxxxxxxxxxxxxxxxxxxx-workflow-prod', displayName: 'Production Workflow Token', cloudProvider: 'github', permissions: JSON.stringify(['repo', 'workflow', 'packages', 'admin:org']), riskLevel: 'critical', blastRadius: 78, status: 'revoked' },
  { identityType: 'github_pat', identifier: 'ghp_yyyyyyyyyyyyyyyyyyyy-deploy-bot', displayName: 'Deploy Bot Token', cloudProvider: 'github', permissions: JSON.stringify(['repo', 'deployments', 'read:org']), riskLevel: 'high', blastRadius: 45, status: 'active' },
  { identityType: 'aws_iam_role', identifier: 'arn:aws:iam::987654321098:role/CrossAccount-Admin', displayName: 'Cross-Account Admin', cloudProvider: 'aws', permissions: JSON.stringify(['*']), riskLevel: 'critical', blastRadius: 2100, status: 'revoked' },
  { identityType: 'gcp_service_account', identifier: 'legacy-batch-processor@acme-corp.iam.gserviceaccount.com', displayName: 'Legacy Batch Processor', cloudProvider: 'gcp', permissions: JSON.stringify(['bigquery.dataEditor', 'storage.objectCreator']), riskLevel: 'low', blastRadius: 8, status: 'expired' },
];

export async function POST() {
  try {
    // Clear existing
    await db.nHIRevocation.deleteMany({ where: { organizationId: ORG_ID } });
    await db.nHIAuditLog.deleteMany({ where: { organizationId: ORG_ID } });
    await db.nHIImpactAssessment.deleteMany({ where: { organizationId: ORG_ID } });
    await db.nHIIdentity.deleteMany({ where: { organizationId: ORG_ID } });

    let created = 0;
    for (const data of SEED_DATA) {
      await db.nHIIdentity.create({
        data: {
          organizationId: ORG_ID,
          identityType: data.identityType,
          identifier: data.identifier,
          displayName: data.displayName,
          cloudProvider: data.cloudProvider,
          permissions: data.permissions,
          riskLevel: data.riskLevel,
          blastRadius: data.blastRadius,
          status: data.status,
          lastRotated: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
        },
      });
      created++;
    }

    // Create some revocation history for the revoked identities
    const revoked = await db.nHIIdentity.findMany({ where: { organizationId: ORG_ID, status: 'revoked' } });
    for (const ident of revoked) {
      const revocation = await db.nHIRevocation.create({
        data: {
          organizationId: ORG_ID,
          identityId: ident.id,
          reason: 'breach_detected',
          revokedBy: 'alex.chen',
          cloudProvider: ident.cloudProvider,
          identityType: ident.identityType,
          identifier: ident.identifier,
          permissions: ident.permissions,
          rollbackData: JSON.stringify({ status: 'active', permissions: ident.permissions }),
          executedAt: new Date(Date.now() - Math.floor(Math.random() * 48) * 60 * 60 * 1000),
        },
      });

      await db.nHIAuditLog.create({
        data: {
          organizationId: ORG_ID,
          revocationId: revocation.id,
          action: 'revocation_completed',
          resource: 'revocation',
          resourceId: revocation.id,
          details: JSON.stringify({ identifier: ident.identifier, reason: 'breach_detected' }),
        },
      });
    }

    // Seed audit logs
    await db.nHIAuditLog.create({
      data: {
        organizationId: ORG_ID,
        action: 'identity_scan',
        resource: 'identity',
        details: JSON.stringify({ source: 'automated_scan', identitiesFound: created }),
      },
    });

    return NextResponse.json({ success: true, identities: created, message: `Seeded ${created} identities with sample data` });
  } catch (error) {
    console.error('NHI seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
