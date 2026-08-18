import { NextRequest, NextResponse } from 'next/server';
import { analyzeProcesses } from '@/lib/recon/process-recon';
import { analyzeNetworkInterfaces } from '@/lib/recon/network-recon';
import { scanFileSystem } from '@/lib/recon/file-recon';
import { analyzeLogs } from '@/lib/recon/log-recon';
import { analyzeRegistry } from '@/lib/recon/registry-recon';
import { withProtection } from '@/lib/api-protection';

const SCANNER_MAP: Record<string, () => Promise<unknown>> = {
  process: analyzeProcesses,
  network: analyzeNetworkInterfaces,
  filesystem: scanFileSystem,
  logs: analyzeLogs,
  registry: analyzeRegistry,
};

export async function POST(request: NextRequest) {
  // System scan requires authentication — reads server internals
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 2, windowMs: 60_000 },
  });
  if (error) return error;

  // System scan is restricted — only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'System scan is not available in production' },
      { status: 403 },
    );
  }

  try {
    let scannersToRun: string[];

    try {
      const body = await request.json();
      scannersToRun = Array.isArray(body.scanners) ? body.scanners : [];
    } catch {
      scannersToRun = [];
    }

    const keys = scannersToRun.length > 0
      ? scannersToRun.filter(s => s in SCANNER_MAP)
      : Object.keys(SCANNER_MAP);

    if (keys.length === 0) {
      return NextResponse.json(
        { error: 'No valid scanners specified' },
        { status: 400 },
      );
    }

    const results: Record<string, unknown> = {};
    const errors: string[] = [];

    await Promise.allSettled(
      keys.map(async (name) => {
        try {
          results[name] = await SCANNER_MAP[name]();
        } catch (err) {
          errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }),
    );

    // Combine all findings from scanner results
    const allFindings: unknown[] = [];
    for (const result of Object.values(results)) {
      const r = result as Record<string, unknown>;
      if (Array.isArray(r.findings)) {
        allFindings.push(...r.findings);
      }
    }

    return NextResponse.json({
      scanners: keys,
      results,
      findingsCount: allFindings.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('System scan error:', error);
    return NextResponse.json(
      { error: 'System scan failed' },
      { status: 500 },
    );
  }
}
