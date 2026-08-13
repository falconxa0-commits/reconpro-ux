import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from '@/lib/api-security';


export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown', 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  return NextResponse.json({ message: "Hello, world!" });
}