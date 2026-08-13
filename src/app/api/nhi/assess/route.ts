import { extractClientIP } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/api-security';


const ORG_ID = 'org_default';

const RISK_SCORES: Record<string, number> = { critical: 100, high: 75, normal: 40, low: 15 };

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();
    const { identityIds, scope } = body as { identityIds: string[]; scope: 'single' | 'team' | 'org' | 'multi_cloud' };

    if (!identityIds?.length || !scope) {
      return NextResponse.json({ error: 'identityIds and scope are required' }, { status: 400 });
    }

    // Get the target identities
    const targets = await db.nHIIdentity.findMany({
      where: { id: { in: identityIds }, organizationId: ORG_ID },
    });

    if (!targets.length) {
      return NextResponse.json({ error: 'No matching identities found' }, { status: 404 });
    }

    // Calculate affected identities based on scope
    let affectedIdentities = targets.length;
    let affectedResources = targets.reduce((sum, t) => sum + t.blastRadius, 0);

    if (scope === 'org' || scope === 'multi_cloud') {
      // Include all active identities with similar permissions
      const allActive = await db.nHIIdentity.findMany({
        where: { organizationId: ORG_ID, status: { in: ['active', 'suspect'] } },
      });
      affectedIdentities = allActive.length;
      affectedResources = allActive.reduce((sum, t) => sum + t.blastRadius, 0);
    } else if (scope === 'team') {
      // Include identities sharing same cloud providers
      const clouds = [...new Set(targets.map((t) => t.cloudProvider))];
      const sameCloud = await db.nHIIdentity.findMany({
        where: { organizationId: ORG_ID, cloudProvider: { in: clouds }, status: { in: ['active', 'suspect'] } },
      });
      affectedIdentities = sameCloud.length;
      affectedResources = sameCloud.reduce((sum, t) => sum + t.blastRadius, 0);
    }

    // Risk before = average risk score of affected
    const riskBefore = Math.round(
      targets.reduce((sum, t) => sum + (RISK_SCORES[t.riskLevel] || 40), 0) / targets.length
    );

    // Risk after = what it would be after revocation
    const riskAfter = Math.max(0, Math.round(riskBefore * 0.3));

    // Create assessment record
    const assessment = await db.nHIImpactAssessment.create({
      data: {
        organizationId: ORG_ID,
        targetIdentityId: identityIds[0],
        scope,
        affectedIdentities,
        affectedResources,
        riskBefore,
        riskAfter,
        status: 'draft',
      },
    });

    return NextResponse.json({
      assessment,
      summary: {
        affectedIdentities,
        affectedResources,
        riskBefore,
        riskAfter,
        riskReduction: riskBefore - riskAfter,
        scope,
      },
    });
  } catch (error) {
    console.error('NHI assess error:', error);
    return NextResponse.json({ error: 'Assessment failed' }, { status: 500 });
  }
}
