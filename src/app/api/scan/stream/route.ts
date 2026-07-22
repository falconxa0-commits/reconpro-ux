import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) return new Response('Missing domain', { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const phases = [
        { event: 'phase', data: { phase: 'dns', label: 'DNS Enumeration', progress: 0 } },
        { event: 'log', data: { type: 'command', text: `dig +short A ${domain}` } },
        { event: 'log', data: { type: 'command', text: `dig +short AAAA ${domain}` } },
        { event: 'log', data: { type: 'command', text: `dig +short MX ${domain}` } },
        { event: 'log', data: { type: 'command', text: `dig +short NS ${domain}` } },
        { event: 'log', data: { type: 'command', text: `dig +short TXT ${domain}` } },
        { event: 'log', data: { type: 'command', text: `dig +short TXT _dmarc.${domain}` } },
        { event: 'finding', data: { severity: 'info', category: 'dns', title: `DNS resolution started for ${domain}` } },
        { event: 'phase', data: { phase: 'headers', label: 'HTTP Header Analysis', progress: 20 } },
        { event: 'log', data: { type: 'command', text: `curl -sI -L https://${domain}` } },
        { event: 'phase', data: { phase: 'ssl', label: 'SSL/TLS Analysis', progress: 35 } },
        { event: 'log', data: { type: 'command', text: `openssl s_client -connect ${domain}:443` } },
        { event: 'phase', data: { phase: 'ports', label: 'Port Scanning', progress: 50 } },
        { event: 'log', data: { type: 'command', text: `Probing 13 common ports on ${domain}` } },
        { event: 'phase', data: { phase: 'subdomains', label: 'Subdomain Enumeration', progress: 65 } },
        { event: 'log', data: { type: 'command', text: `Enumerating 60+ subdomains for ${domain}` } },
        { event: 'log', data: { type: 'command', text: `Batch 1: www, api, mail, admin, dashboard...` } },
        { event: 'log', data: { type: 'command', text: `Batch 2: dev, staging, blog, cdn, static...` } },
        { event: 'log', data: { type: 'command', text: `Batch 3: ftp, ssh, db, graphql, auth...` } },
        { event: 'phase', data: { phase: 'vulns', label: 'Vulnerability Probing', progress: 80 } },
        { event: 'log', data: { type: 'command', text: `Testing path traversal and rate limiting...` } },
        { event: 'phase', data: { phase: 'osint', label: 'OSINT Collection', progress: 90 } },
        { event: 'log', data: { type: 'command', text: `Checking CT logs, robots.txt, Wayback...` } },
        { event: 'phase', data: { phase: 'complete', label: 'Scan Complete', progress: 100 } },
      ];

      for (const phase of phases) {
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
        send(phase.event, phase.data);
      }
      await new Promise(r => setTimeout(r, 500));
      send('done', {});
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
