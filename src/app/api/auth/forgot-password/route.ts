import { NextRequest, NextResponse } from 'next/server';
import { withProtection } from '@/lib/api-protection';

export async function POST(request: NextRequest) {
  // Rate limit but do NOT require auth (public endpoint)
  const { error } = await withProtection(request, {
    requireAuth: false,
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    // ── Parse request body ─────────────────────────────────────────
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration.
    // Password reset functionality will be implemented in a future version.
    return NextResponse.json({
      success: true,
      message:
        'If an account exists with this email, password reset instructions will be sent.',
    });
  } catch (err) {
    console.error('[AUTH FORGOT PASSWORD ERROR]', err);
    return NextResponse.json(
      { success: true, message: 'If an account exists with this email, password reset instructions will be sent.' },
      { status: 200 }
    );
  }
}
