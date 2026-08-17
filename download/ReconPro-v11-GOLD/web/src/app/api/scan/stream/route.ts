import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeDomain, isBlockedDomain, isPrivateIP, isPrivateIPv6 } from '@/lib/api-security';
import dns from 'dns/promises';
import type { ReconFinding } from '@/lib/recon/types';

// Real scan modules
import { enumerateDNS } from '@/lib/recon/dns-recon';
import { analyzeHTTP, httpToFindings } from '@/lib/recon/http-recon';
import { scanPorts, portsToFindings } from '@/lib/recon/port-check';
import { analyzeSSL, sslToFindings } from '@/lib/recon/ssl-recon';

// ═══════════════════════════════════════════════════════════════════════
// Scan Stream API — Server-Sent Events for real-time scan progress
// STATUS: LIVE — This endpoint runs actual reconnaissance modules
// sequentially and emits real SSE events as each module completes.
// ═══════════════════════════════════════════════════════════════════════

interface ScanPhase {
  name: string;
  label: string;
  run: (domain: string) => Promise<{ findings?: ReconFinding[]; [key: string]: unknown }>;
  toFindings?: (result: unknown, domain: string) => ReconFinding[];
}

const PHASES: ScanPhase[] = [
  {
    name: 'dns',
    label: 'DNS Reconnaissance',
    run: (domain: string) => enumerateDNS(domain) as unknown as Promise<{ findings?: ReconFinding[]; [key: string]: unknown }>,
  },
  {
    name: 'ssl',
    label: 'SSL/TLS Analysis',
    run: (domain: string) => analyzeSSL(domain) as unknown as Promise<{ findings?: ReconFinding[]; [key: string]: unknown }>,
    toFindings: (result, domain) => sslToFindings(result as Parameters<typeof sslToFindings>[0], domain),
  },
  {
    name: 'port',
    label: 'Port Scanning',
    run: (domain: string) => scanPorts(domain) as unknown as Promise<{ findings?: ReconFinding[]; [key: string]: unknown }>,
    toFindings: (result, domain) => portsToFindings(result as Parameters<typeof portsToFindings>[0], domain),
  },
  {
    name: 'http',
    label: 'HTTP Header Analysis',
    run: (domain: string) => analyzeHTTP(domain) as unknown as Promise<{ findings?: ReconFinding[]; [key: string]: unknown }>,
    toFindings: (result, domain) => httpToFindings(result as Parameters<typeof httpToFindings>[0], domain),
  },
];

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  });
  if (error) return error;

  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });

  // Sanitize and validate domain format
  const sanitized = sanitizeDomain(domain);
  if (!sanitized) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  // Block internal/sensitive domains using centralized list
  if (isBlockedDomain(sanitized)) {
    return NextResponse.json({ error: 'Internal domains not permitted' }, { status: 403 });
  }

  // SSRF protection: resolve DNS and verify target is not a private IP
  try {
    const resolutions = await Promise.allSettled([
      dns.resolve4(sanitized).catch(() => []),
      dns.resolve6(sanitized).catch(() => []),
    ]);

    const ipv4Results = resolutions[0].status === 'fulfilled' ? resolutions[0].value : [];
    const ipv6Results = resolutions[1].status === 'fulfilled' ? resolutions[1].value : [];

    for (const ip of ipv4Results) {
      if (isPrivateIP(ip)) {
        return NextResponse.json({ error: 'Resolution to private IP not permitted' }, { status: 403 });
      }
    }
    for (const ip of ipv6Results) {
      if (isPrivateIPv6(ip)) {
        return NextResponse.json({ error: 'Resolution to private IP not permitted' }, { status: 403 });
      }
    }
  } catch {
    // DNS resolution failure — treat as unsafe (same as ssrf-guard.ts)
    return NextResponse.json({ error: 'Domain resolution failed' }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const allFindings: ReconFinding[] = [];
        const totalPhases = PHASES.length;

        for (let i = 0; i < totalPhases; i++) {
          const phase = PHASES[i];
          const progress = Math.round((i / totalPhases) * 100);

          // Emit phase_start before running the module
          send('phase_start', {
            phase: phase.name,
            label: phase.label,
            progress,
          });

          // Run the actual scan module — catch errors per-module so we continue
          let findings: ReconFinding[] = [];
          let result: { findings?: ReconFinding[]; [key: string]: unknown } | undefined;

          try {
            result = await phase.run(sanitized);

            // Extract findings: some modules return them directly, others need conversion
            if (result && Array.isArray((result as { findings?: ReconFinding[] }).findings) && (result as { findings?: ReconFinding[] }).findings!.length > 0) {
              findings = (result as { findings: ReconFinding[] }).findings;
            } else if (phase.toFindings && result) {
              findings = phase.toFindings(result, sanitized);
            }
          } catch (moduleError) {
            // Log the error but continue with remaining modules
            const msg = moduleError instanceof Error ? moduleError.message : 'Unknown error';
            send('phase_error', {
              phase: phase.name,
              label: phase.label,
              error: msg,
            });
          }

          allFindings.push(...findings);

          // Emit phase_complete with real counts
          const phaseCompleteProgress = Math.round(((i + 1) / totalPhases) * 100);
          send('phase_complete', {
            phase: phase.name,
            label: phase.label,
            findings: findings.length,
            progress: phaseCompleteProgress,
            details: result || null,
          });

          // Emit individual findings as they come in
          for (const finding of findings) {
            send('finding', finding);
          }
        }

        // Compute aggregate risk score
        const critical = allFindings.filter(f => f.severity === 'critical').length;
        const high = allFindings.filter(f => f.severity === 'high').length;
        const medium = allFindings.filter(f => f.severity === 'medium').length;
        const low = allFindings.filter(f => f.severity === 'low').length;
        const info = allFindings.filter(f => f.severity === 'info').length;
        const riskScore = Math.min(100, critical * 25 + high * 15 + medium * 8 + low * 2);

        // Emit final scan_complete with aggregate results
        send('scan_complete', {
          domain: sanitized,
          totalFindings: allFindings.length,
          critical,
          high,
          medium,
          low,
          info,
          riskScore,
          findings: allFindings,
          progress: 100,
        });
      } catch (error) {
        send('scan_error', {
          error: error instanceof Error ? error.message : 'Scan failed unexpectedly',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
