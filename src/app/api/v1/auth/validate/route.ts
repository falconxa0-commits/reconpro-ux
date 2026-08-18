import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'


export async function POST(request: NextRequest) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    // ── Parse request body ─────────────────────────────────────────────
    const body = await request.json()
    const { api_key } = body

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Missing or invalid "api_key" field in request body' },
        { status: 400 }
      )
    }

    // ── Hash the provided key and look it up ───────────────────────────
    const keyHash = crypto.createHash('sha256').update(api_key.trim()).digest('hex')

    const apiKey = await db.apiKey.findUnique({
      where: { keyHash },
      include: { organization: true },
    })

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'API key not found' },
        { status: 200 }
      )
    }

    // ── Check active status ────────────────────────────────────────────
    if (!apiKey.isActive) {
      return NextResponse.json(
        { valid: false, error: 'API key has been deactivated' },
        { status: 200 }
      )
    }

    // ── Check expiration ───────────────────────────────────────────────
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'API key has expired' },
        { status: 200 }
      )
    }

    // ── Parse scopes ───────────────────────────────────────────────────
    let scopes: string[] = []
    try {
      scopes = JSON.parse(apiKey.scopes)
    } catch {
      scopes = []
    }

    // ── Create a session so the browser dashboard works via cookie auth ──
    const sessionToken = `sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Look up a member in this org to associate with the session
    const member = await db.member.findFirst({
      where: { organizationId: apiKey.organizationId },
    });

    await db.session.create({
      data: {
        token: sessionToken,
        memberId: member?.id ?? '',
        organizationId: apiKey.organizationId,
        expiresAt,
      },
    });

    // ── Return validation result with session cookie ─────────────────
    const response = NextResponse.json(
      {
        valid: true,
        org_id: apiKey.organizationId,
        quota_remaining: apiKey.organization.apiQuota,
        scopes,
        key_name: apiKey.name,
        key_prefix: apiKey.keyPrefix,
        created_at: apiKey.createdAt.toISOString(),
      },
      { status: 200 }
    );

    response.cookies.set('reconpro_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('[AUTH VALIDATE ERROR]', error)
    return NextResponse.json(
      {
        valid: false,
        error: 'Internal server error validating API key',
      },
      { status: 500 }
    )
  }
}
