import { extractClientIP } from '@/lib/api-protection';
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from '@/lib/api-security';


export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  return NextResponse.json({ message: "Hello, world!" });
}