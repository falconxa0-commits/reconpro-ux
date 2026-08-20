import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withProtection } from '@/lib/api-protection';

export async function POST(request: NextRequest) {
  const { error } = await withProtection(request, { requireAuth: true });
  if (error) return error;

  try {
    const sessionCookie = request.cookies.get('reconpro_session');
    if (sessionCookie?.value) {
      await db.session.deleteMany({ where: { token: sessionCookie.value } });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('reconpro_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Logout failed.' }, { status: 500 });
  }
}
