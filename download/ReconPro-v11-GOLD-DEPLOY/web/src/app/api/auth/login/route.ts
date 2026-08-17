import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { withProtection } from '@/lib/api-protection';

const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

export async function POST(request: NextRequest) {
  // Rate limit but do NOT require auth (public login endpoint)
  const { error } = await withProtection(request, {
    requireAuth: false,
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    // ── Parse request body ─────────────────────────────────────────
    const body = await request.json();
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    // ── Validate inputs ────────────────────────────────────────────
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required.' },
        { status: 400 }
      );
    }

    // ── Find Member by email ────────────────────────────────────────
    const member = await db.member.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: { organization: true },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // ── Verify password with bcrypt ───────────────────────────────
    if (!member.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'This account uses API key authentication only. Please sign in with an API key.' },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(password, member.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // ── Generate session token ──────────────────────────────────────
    const sessionToken = `sess_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    // ── Store session in database ──────────────────────────────────
    await db.session.create({
      data: {
        token: sessionToken,
        memberId: member.id,
        organizationId: member.organizationId,
        expiresAt,
      },
    });

    // ── Find or generate an active API key for the member's org ────
    let apiKey = await db.apiKey.findFirst({
      where: {
        organizationId: member.organizationId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let rawApiKey: string;

    if (apiKey) {
      rawApiKey = apiKey.keyPrefix + '...';
      // Don't rotate keys on every login — return existing prefix info
    } else {
      // No key exists — generate one
      rawApiKey = `rp_live_${crypto.randomBytes(16).toString('hex')}`;
      const keyHash = crypto
        .createHash('sha256')
        .update(rawApiKey)
        .digest('hex');

      await db.apiKey.create({
        data: {
          organizationId: member.organizationId,
          keyHash,
          keyPrefix: rawApiKey.slice(0, 12),
          name: 'Default key',
          scopes: JSON.stringify(['scan:read', 'scan:write', 'telemetry:write']),
        },
      });
    }

    // ── Update last active timestamp ───────────────────────────────
    await db.member.update({
      where: { id: member.id },
      data: { lastActive: new Date() },
    });

    // ── Set HttpOnly Secure SameSite cookie with session token ────
    const response = NextResponse.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
      },
      org_id: member.organizationId,
      api_key: rawApiKey,
    });

    response.cookies.set('reconpro_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during login.' },
      { status: 500 }
    );
  }
}
