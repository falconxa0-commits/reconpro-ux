import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/api-security';


const ORG_ID = 'org_default';

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();
    const { identityIds, reason, revokedBy } = body as {
      identityIds: string[];
      reason: string;
      revokedBy?: string;
    };

    if (!identityIds?.length || !reason) {
      return NextResponse.json({ error: 'identityIds and reason are required' }, { status: 400 });
    }

    let revoked = 0;
    let failed = 0;
    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const identityId of identityIds) {
      const identity = await db.nHIIdentity.findUnique({ where: { id: identityId } });
      if (!identity || identity.organizationId !== ORG_ID) {
        failed++;
        results.push({ id: identityId, status: 'failed', error: 'Identity not found' });
        continue;
      }

      try {
        // Create revocation record
        const revocation = await db.nHIRevocation.create({
          data: {
            organizationId: ORG_ID,
            identityId,
            reason,
            revokedBy: revokedBy || 'system',
            cloudProvider: identity.cloudProvider,
            identityType: identity.identityType,
            identifier: identity.identifier,
            permissions: identity.permissions,
            rollbackData: JSON.stringify({
              status: identity.status,
              permissions: identity.permissions,
              riskLevel: identity.riskLevel,
            }),
          },
        });

        // Simulate revocation — mark identity as revoked
        await db.nHIIdentity.update({
          where: { id: identityId },
          data: { status: 'revoked' },
        });

        // Audit log
        await db.nHIAuditLog.create({
          data: {
            organizationId: ORG_ID,
            revocationId: revocation.id,
            action: 'revocation_completed',
            resource: 'revocation',
            resourceId: revocation.id,
            details: JSON.stringify({ identityId, identifier: identity.identifier, cloud: identity.cloudProvider, reason }),
          },
        });

        revoked++;
        results.push({ id: identityId, status: 'completed' });
      } catch (err) {
        console.error('NHI individual revocation error:', err);
        failed++;
        results.push({ id: identityId, status: 'failed', error: 'Internal revocation error' });
      }
    }

    return NextResponse.json({ revoked, failed, identities: results });
  } catch (error) {
    console.error('NHI revoke error:', error);
    return NextResponse.json({ error: 'Revocation failed' }, { status: 500 });
  }
}
