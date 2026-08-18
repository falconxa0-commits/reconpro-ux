import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import { db } from '@/lib/db';
import { withProtection } from '@/lib/api-protection';

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    // Database connectivity check
    let dbStatus: 'connected' | 'error' = 'error';
    try {
      await db.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    const mem = process.memoryUsage();

    return NextResponse.json({
      uptime: process.uptime(),
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
      },
      database: {
        status: dbStatus,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 },
    );
  }
}
