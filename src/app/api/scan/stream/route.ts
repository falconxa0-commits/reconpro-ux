import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeDomain, isBlockedDomain, isPrivateIP, isPrivateIPv6 } from '@/lib/api-security';
import dns from 'dns/promises';

// ═══════════════════════════════════════════════════════════════════════
// Scan Stream API — Server-Sent Events for real-time scan progress
// STATUS: SIMULATED — This endpoint emits pre-programmed phase events
// with setTimeout delays. No actual network reconnaissance is performed.
// Real scans happen via /api/scan (POST) which uses the recon/ modules.
// ═══════════════════════════════════════════════════════════════════════

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

      // SIMULATED phase events — no real network operations
      const phases = [
        { event: 'phase', data: { phase: 'dns', label: 'DNS Enumeration', progress: 0, simulated: true } },
        { event: 'log', data: { type: 'command', text: `dig +short A ${sanitized}` } },
        { event: 'log', data: { type: 'command', text: `dig +short AAAA ${sanitized}` } },
        { event: 'log', data: { type: 'command', text: `dig +short MX ${sanitized}` } },
        { event: 'log', data: { type: 'command', text: `dig +short NS ${sanitized}` } },
        { event: 'log', data: { type: 'command', text: `dig +short TXT ${sanitized}` } },
        { event: 'log', data: { type: 'command', text: `dig +short TXT _dmarc.${sanitized}` } },
        { event: 'finding', data: { severity: 'info', category: 'dns', title: `DNS resolution started for ${sanitized}`, simulated: true } },
        { event: 'phase', data: { phase: 'headers', label: 'HTTP Header Analysis', progress: 20, simulated: true } },
        { event: 'log', data: { type: 'command', text: `curl -sI -L https://${sanitized}` } },
        { event: 'phase', data: { phase: 'ssl', label: 'SSL/TLS Analysis', progress: 35, simulated: true } },
        { event: 'log', data: { type: 'command', text: `openssl s_client -connect ${sanitized}:443` } },
        { event: 'phase', data: { phase: 'ports', label: 'Port Scanning', progress: 50, simulated: true } },
        { event: 'log', data: { type: 'command', text: `Probing common ports on ${sanitized}` } },
        { event: 'phase', data: { phase: 'subdomains', label: 'Subdomain Enumeration', progress: 65, simulated: true } },
        { event: 'log', data: { type: 'command', text: `Enumerating subdomains for ${sanitized}` } },
        { event: 'phase', data: { phase: 'vulns', label: 'Vulnerability Probing', progress: 80, simulated: true } },
        { event: 'log', data: { type: 'command', text: `Testing path traversal and rate limiting on ${sanitized}` } },
        { event: 'phase', data: { phase: 'osint', label: 'OSINT Collection', progress: 90, simulated: true } },
        { event: 'log', data: { type: 'command', text: `Checking CT logs, robots.txt for ${sanitized}` } },
        { event: 'phase', data: { phase: 'complete', label: 'Scan Complete', progress: 100, simulated: true } },
      ];

      for (const phase of phases) {
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
        send(phase.event, phase.data);
      }
      await new Promise(r => setTimeout(r, 500));
      send('done', { simulated: true });
      controller.close();
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
