import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  return NextResponse.json({ message: "Hello, world!" });
}