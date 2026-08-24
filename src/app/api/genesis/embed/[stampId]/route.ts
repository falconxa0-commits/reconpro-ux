import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { escapeHtml } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// GET /api/genesis/embed/[stampId] — Embeddable badge HTML
// ═══════════════════════════════════════════════════════════════════════

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#00ff88';
  if (grade.startsWith('B')) return '#44aaff';
  if (grade.startsWith('C')) return '#d29922';
  if (grade.startsWith('D')) return '#ff8800';
  return '#ff3355';
}

function gradeBgColor(grade: string): string {
  if (grade.startsWith('A')) return 'rgba(0,255,136,0.1)';
  if (grade.startsWith('B')) return 'rgba(68,170,255,0.1)';
  if (grade.startsWith('C')) return 'rgba(210,153,34,0.1)';
  if (grade.startsWith('D')) return 'rgba(255,136,0,0.1)';
  return 'rgba(255,53,85,0.1)';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stampId: string }> }
) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const { stampId } = await params;

    // ── 1. Look up stamp ───────────────────────────────────────────────
    const stamp = await db.genesisStamp.findUnique({
      where: { stampId },
    });

    if (!stamp) {
      return NextResponse.json(
        { error: 'Stamp not found' },
        { status: 404 }
      );
    }

    // ── 2. Increment embedViews ─────────────────────────────────────────
    await db.genesisStamp.update({
      where: { id: stamp.id },
      data: { embedViews: { increment: 1 } },
    });

    // ── 3. Audit trail ──────────────────────────────────────────────────
    await db.genesisAuditTrail.create({
      data: {
        stampId: stamp.id,
        action: 'embedded',
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    // ── 4. Build badge HTML ─────────────────────────────────────────────
    const color = gradeColor(stamp.grade);
    const bgColor = gradeBgColor(stamp.grade);
    const isRevoked = stamp.status === 'revoked';
    const isExpired =
      stamp.expiresAt && stamp.expiresAt < new Date();
    const isInvalid = isRevoked || isExpired;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconpro.dev';
    const verifyUrl = `${baseUrl}/api/genesis/verify/${stamp.stampId}`;

    const html = `
<div id="genesis-stamp-${stamp.stampId}" style="font-family:'Inter',system-ui,-apple-system,sans-serif;display:inline-flex;align-items:center;gap:12px;padding:12px 20px;border-radius:12px;background:${
      isInvalid ? '#1a1a2e' : '#0B1C2C'
    };border:1px solid ${
      isInvalid ? '#333' : color + '33'
    };color:#e2e8f0;text-decoration:none;max-width:420px;font-size:14px;">
  <div style="flex-shrink:0;width:44px;height:44px;border-radius:10px;background:${
      isInvalid ? '#1e1e3a' : bgColor
    };display:flex;align-items:center;justify-content:center;border:1px solid ${
      isInvalid ? '#333' : color + '44'
    };">
    <span style="font-weight:800;font-size:16px;color:${
      isInvalid ? '#666' : color
    };">${isInvalid ? '✕' : '✓'}</span>
  </div>
  <div style="flex:1;min-width:0;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
      <span style="font-weight:700;font-size:13px;color:#94a3b8;">Genesis Stamp</span>
      <span style="font-weight:800;font-size:13px;color:${
        isInvalid ? '#666' : color
      };">${isInvalid ? (isRevoked ? 'REVOKED' : 'EXPIRED') : escapeHtml(stamp.grade)}</span>
    </div>
    <div style="font-size:13px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${
      escapeHtml(stamp.domain)
    }</div>
    <div style="font-size:12px;color:#64748b;margin-top:2px;">Score: ${
      isInvalid ? '—' : stamp.score + '/100'
    }</div>
  </div>
  <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="flex-shrink:0;color:#64748b;text-decoration:none;font-size:18px;line-height:1;" title="Verify this stamp">↗</a>
</div>`.trim();

    const verifiedAt = new Date().toISOString();

    return NextResponse.json({
      html,
      score: stamp.score,
      grade: stamp.grade,
      domain: stamp.domain,
      stampId: stamp.stampId,
      status: stamp.status,
      verifiedAt,
    });
  } catch (error) {
    console.error('Genesis Stamp embed error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embed' },
      { status: 500 }
    );
  }
}
