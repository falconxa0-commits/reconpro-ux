import { NextRequest, NextResponse } from "next/server";
import { withProtection } from "@/lib/api-protection";

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 60, windowMs: 60_000 },
  });
  if (error) return error;

  const startTime = Date.now();

  let dbStatus = "ok";
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "degraded";
  }

  return NextResponse.json({
    status: "healthy",
    version: "10.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: Date.now() - startTime,
    checks: {
      database: dbStatus,
    },
  });
}
