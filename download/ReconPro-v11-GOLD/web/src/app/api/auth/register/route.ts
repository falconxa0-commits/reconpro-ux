import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { withProtection } from '@/lib/api-protection';

const BCRYPT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  // Rate limit but do NOT require auth (public registration endpoint)
  const { error } = await withProtection(request, {
    requireAuth: false,
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    // ── Parse request body ─────────────────────────────────────────
    const body = await request.json();
    const { name, email, password } = body as {
      name?: string;
      email?: string;
      password?: string;
    };

    // ── Validate inputs ────────────────────────────────────────────
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // ── Check if a member with this email already exists ───────────
    const existingMember = await db.member.findFirst({
      where: { email: normalizedEmail },
    });
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // ── Derive organization slug from email domain ──────────────────
    const domain = normalizedEmail.split('@')[1] || 'default';
    let slug = domain.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/g, '').slice(0, 30);
    if (!slug) slug = 'org';

    // Ensure slug uniqueness
    let slugExists = await db.organization.findUnique({ where: { slug } });
    let suffix = 1;
    let uniqueSlug = slug;
    while (slugExists) {
      uniqueSlug = `${slug}-${suffix}`;
      suffix++;
      slugExists = await db.organization.findUnique({ where: { slug: uniqueSlug } });
    }

    // ── Create Organization ────────────────────────────────────────
    const org = await db.organization.create({
      data: {
        name: `${name.trim()}'s Organization`,
        slug: uniqueSlug,
      },
    });

    // ── Hash password with bcrypt (salted, adaptive) ──────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // ── Generate API key: rp_live_<32 random hex chars> ────────────
    const rawApiKey = `rp_live_${crypto.randomBytes(16).toString('hex')}`;
    const apiKeyHash = crypto
      .createHash('sha256')
      .update(rawApiKey)
      .digest('hex');
    const apiKeyPrefix = rawApiKey.slice(0, 12);

    // ── Create Member (role: owner) ────────────────────────────────
    const member = await db.member.create({
      data: {
        organizationId: org.id,
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role: 'owner',
      },
    });

    // ── Create API Key record ─────────────────────────────────────
    await db.apiKey.create({
      data: {
        organizationId: org.id,
        keyHash: apiKeyHash,
        keyPrefix: apiKeyPrefix,
        name: 'Default key',
        scopes: JSON.stringify(['scan:read', 'scan:write', 'telemetry:write']),
      },
    });

    // ── Return success with raw API key (shown only once) ─────────
    return NextResponse.json(
      {
        success: true,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
        },
        api_key: rawApiKey,
        org_id: org.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[AUTH REGISTER ERROR]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
