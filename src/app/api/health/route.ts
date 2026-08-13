import { NextResponse } from "next/server";

export async function GET() {
  const startTime = Date.now();

  // Check database connectivity
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
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
}
