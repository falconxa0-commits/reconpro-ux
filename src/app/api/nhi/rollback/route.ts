import { extractClientIP } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/api-security';


const ORG_ID = 'org_default';

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();
    const { revocationIds } = body as { revocationIds: string[] };

    if (!revocationIds?.length) {
      return NextResponse.json({ error: 'revocationIds is required' }, { status: 400 });
    }

    let rolledBack = 0;
    let failed = 0;
    const results: Array<{ revocationId: string; status: string; error?: string }> = [];

    for (const revId of revocationIds) {
      const revocation = await db.nHIRevocation.findUnique({
        where: { id: revId },
        include: { identity: true },
      });

      if (!revocation || revocation.organizationId !== ORG_ID) {
        failed++;
        results.push({ revocationId: revId, status: 'failed', error: 'Revocation not found' });
        continue;
      }

      if (revocation.status === 'rolled_back') {
        failed++;
        results.push({ revocationId: revId, status: 'failed', error: 'Already rolled back' });
        continue;
      }

      try {
        // Restore identity status
        let restoreStatus = 'active';
        if (revocation.rollbackData) {
          try {
            const data = JSON.parse(revocation.rollbackData);
            restoreStatus = data.status || 'active';
          } catch { /* use default */ }
        }

        await db.nHIIdentity.update({
          where: { id: revocation.identityId },
          data: { status: restoreStatus },
        });

        // Mark revocation as rolled back
        await db.nHIRevocation.update({
          where: { id: revId },
          data: { status: 'rolled_back', rolledBackAt: new Date() },
        });

        // Audit log
        await db.nHIAuditLog.create({
          data: {
            organizationId: ORG_ID,
            revocationId: revId,
            action: 'rollback_completed',
            resource: 'revocation',
            resourceId: revId,
            details: JSON.stringify({ identityId: revocation.identityId, restoredStatus: restoreStatus }),
          },
        });

        rolledBack++;
        results.push({ revocationId: revId, status: 'rolled_back' });
      } catch (err) {
        console.error('NHI individual rollback error:', err);
        failed++;
        results.push({ revocationId: revId, status: 'failed', error: 'Internal rollback error' });
      }
    }

    return NextResponse.json({ rolledBack, failed, revocations: results });
  } catch (error) {
    console.error('NHI rollback error:', error);
    return NextResponse.json({ error: 'Rollback failed' }, { status: 500 });
  }
}
