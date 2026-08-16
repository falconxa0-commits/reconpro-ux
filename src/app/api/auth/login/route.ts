import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { withProtection } from '@/lib/api-protection';

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

    // ── Verify password hash ────────────────────────────────────────
    if (!member.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'This account uses API key authentication only. Please sign in with an API key.' },
        { status: 401 }
      );
    }

    const providedHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    if (providedHash !== member.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // ── Generate session token ──────────────────────────────────────
    const sessionToken = `sess_${crypto.randomBytes(16).toString('hex')}`;

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
      // We cannot retrieve the raw key from a hash — return key prefix info
      // The client should already have the key stored from registration.
      // For login we return the session token; the API key is the credential for API calls.
      // If the member's API key exists but we can't show the raw value,
      // generate a new one so the user has it.
      const newRawApiKey = `rp_live_${crypto.randomBytes(16).toString('hex')}`;
      const newKeyHash = crypto
        .createHash('sha256')
        .update(newRawApiKey)
        .digest('hex');

      // Deactivate the old key and create a new one
      await db.apiKey.updateMany({
        where: { organizationId: member.organizationId, isActive: true },
        data: { isActive: false },
      });

      await db.apiKey.create({
        data: {
          organizationId: member.organizationId,
          keyHash: newKeyHash,
          keyPrefix: newRawApiKey.slice(0, 12),
          name: 'Session key',
          scopes: JSON.stringify(['scan:read', 'scan:write', 'telemetry:write']),
        },
      });

      rawApiKey = newRawApiKey;
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

    // ── Parse scopes from organization's default API key ───────────
    let scopes: string[] = ['scan:read', 'scan:write', 'telemetry:write'];

    // ── Return success ─────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
      },
      org_id: member.organizationId,
      api_key: rawApiKey,
      session_token: sessionToken,
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during login.' },
      { status: 500 }
    );
  }
}
