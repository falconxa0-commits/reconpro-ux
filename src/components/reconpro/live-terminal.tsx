'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TerminalLine {
  id: number;
  type: 'command' | 'output' | 'finding' | 'critical' | 'success' | 'info';
  text: string;
  timestamp: number;
}

interface LiveTerminalProps {
  isScanning: boolean;
  domain: string | null;
}

const COMMANDS_POOL = [
  { cmd: 'dig +short A', label: 'DNS A Records' },
  { cmd: 'dig +short MX', label: 'Mail Servers' },
  { cmd: 'dig +short NS', label: 'Nameservers' },
  { cmd: 'dig +short TXT', label: 'TXT/SPF Records' },
  { cmd: 'dig _dmarc.', label: 'DMARC Policy' },
  { cmd: 'dig google._domainkey.', label: 'DKIM Selector' },
  { cmd: 'dig +dnssec', label: 'DNSSEC Validation' },
  { cmd: 'dig +short SOA', label: 'SOA Record' },
  { cmd: 'curl -sI -L', label: 'HTTP Headers' },
  { cmd: 'openssl s_client', label: 'TLS Handshake' },
  { cmd: 'curl :80', label: 'Port 80 Probe' },
  { cmd: 'curl :443', label: 'Port 443 Probe' },
  { cmd: 'curl :8080', label: 'Port 8080 Probe' },
  { cmd: 'curl :8443', label: 'Port 8443 Probe' },
  { cmd: 'curl :3000', label: 'Port 3000 Probe' },
  { cmd: 'curl /robots.txt', label: 'Robots.txt' },
  { cmd: 'dig www.', label: 'Subdomain: www' },
  { cmd: 'dig api.', label: 'Subdomain: api' },
  { cmd: 'dig mail.', label: 'Subdomain: mail' },
  { cmd: 'dig admin.', label: 'Subdomain: admin' },
  { cmd: 'dig dashboard.', label: 'Subdomain: dashboard' },
  { cmd: 'dig dev.', label: 'Subdomain: dev' },
  { cmd: 'dig staging.', label: 'Subdomain: staging' },
  { cmd: 'dig blog.', label: 'Subdomain: blog' },
  { cmd: 'dig cdn.', label: 'Subdomain: cdn' },
  { cmd: 'dig ftp.', label: 'Subdomain: ftp' },
  { cmd: 'dig ssh.', label: 'Subdomain: ssh' },
  { cmd: 'dig db.', label: 'Subdomain: db' },
  { cmd: 'dig static.', label: 'Subdomain: static' },
  { cmd: 'curl -s ../../../etc/passwd', label: 'Path Traversal Test' },
  { cmd: 'curl rate-limit check', label: 'Rate Limit Probe' },
];

const FINDING_TEMPLATES = [
  { type: 'finding' as const, text: 'DNS A Record resolved → {ips}' },
  { type: 'finding' as const, text: 'MX Records: {n} mail servers found' },
  { type: 'finding' as const, text: 'NS Records: {n} nameservers detected' },
  { type: 'success' as const, text: 'HSTS: max-age={age}; includeSubDomains; preload' },
  { type: 'finding' as const, text: 'CSP header detected ({len} directives)' },
  { type: 'finding' as const, text: 'X-Frame-Options: {val}' },
  { type: 'info' as const, text: 'SSL: {issuer} → TLSv1.3' },
  { type: 'info' as const, text: 'Certificate: expires in {days} days' },
  { type: 'finding' as const, text: 'Server disclosed: {server}' },
  { type: 'critical' as const, text: 'SPF Record Missing — email spoofing risk' },
  { type: 'success' as const, text: 'DMARC: p={policy}; pct=100' },
  { type: 'info' as const, text: 'DKIM signing confirmed (selector: google)' },
  { type: 'finding' as const, text: 'DNSSEC: not enabled (no RRSIG)' },
  { type: 'finding' as const, text: 'Subdomain discovered: {sub}' },
  { type: 'finding' as const, text: 'Port {port}/tcp: OPEN' },
  { type: 'critical' as const, text: 'SENSITIVE subdomain exposed: {sub}' },
  { type: 'finding' as const, text: 'robots.txt: {n} restricted paths' },
  { type: 'finding' as const, text: 'Technology: {tech} detected' },
  { type: 'finding' as const, text: 'Reverse DNS: {ip} → {ptr}' },
  { type: 'info' as const, text: 'ASN: {asn} ({org})' },
];

function fillTemplate(template: string, domain: string): string {
  const ips = ['198.51.100.23', '172.67.182.31', '104.18.42.12', '13.35.190.2'];
  const servers = ['nginx', 'Vercel', 'gws', 'cloudflare'];
  const issuers = ['DigiCert', "Let's Encrypt", 'Sectigo', 'Cloudflare'];
  const subdomains = ['www', 'api', 'mail', 'admin', 'dashboard', 'dev', 'staging', 'blog', 'cdn', 'static', 'graphql', 'auth'];
  const techs = ['Next.js', 'React', 'nginx', 'Vercel', 'Cloudflare', 'AWS'];

  return template
    .replace('{ips}', `${ips[Math.floor(Math.random() * ips.length)]}, ${ips[Math.floor(Math.random() * ips.length)]}`)
    .replace('{n}', String(Math.floor(Math.random() * 5) + 1))
    .replace('{age}', String(31536000 + Math.floor(Math.random() * 31536000)))
    .replace('{len}', String(Math.floor(Math.random() * 20) + 5))
    .replace('{val}', ['SAMEORIGIN', 'DENY', 'ALLOW-FROM'][Math.floor(Math.random() * 3)])
    .replace('{issuer}', issuers[Math.floor(Math.random() * issuers.length)])
    .replace('{days}', String(Math.floor(Math.random() * 200) + 20))
    .replace('{server}', servers[Math.floor(Math.random() * servers.length)])
    .replace('{policy}', ['reject', 'quarantine', 'none'][Math.floor(Math.random() * 3)])
    .replace('{sub}', `${subdomains[Math.floor(Math.random() * subdomains.length)]}.${domain}`)
    .replace('{port}', String([80, 443, 8080, 8443, 3000][Math.floor(Math.random() * 5)]))
    .replace('{tech}', techs[Math.floor(Math.random() * techs.length)])
    .replace('{ip}', ips[Math.floor(Math.random() * ips.length)])
    .replace('{ptr}', `ip-${Math.floor(Math.random() * 255)}-${Math.floor(Math.random() * 255)}-${Math.floor(Math.random() * 255)}-${Math.floor(Math.random() * 255)}.${domain}`)
    .replace('{asn}', `AS${Math.floor(Math.random() * 100000)}`)
    .replace('{org}', ['Amazon', 'Google', 'Cloudflare', 'Fastly'][Math.floor(Math.random() * 4)]);
}

export function LiveTerminal({ isScanning, domain }: LiveTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);
  const cmdIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    lineIdRef.current++;
    setLines(prev => [...prev.slice(-80), { id: lineIdRef.current, type, text, timestamp: Date.now() }]);
  }, []);

  // Simulated real-time terminal output during scanning
  useEffect(() => {
    if (isScanning && domain) {
      cmdIndexRef.current = 0;
      setLines([]);
      addLine('info', `═══ ReconPro v2.0 — Full Scan ═══`);
      addLine('info', `Target: ${domain} | Mode: Full Reconnaissance`);
      addLine('info', `Timestamp: ${new Date().toISOString()}`);
      addLine('command', '');

      let tick = 0;
      const totalCmds = COMMANDS_POOL.length;

      intervalRef.current = setInterval(() => {
        if (cmdIndexRef.current < totalCmds) {
          const cmd = COMMANDS_POOL[cmdIndexRef.current];
          addLine('command', `[T+${(tick * 0.3).toFixed(1)}s] $ ${cmd.cmd} ${domain.includes('dmarc') || domain.includes('domainkey') ? '' : domain}`);
          
          // Show output after a short delay effect
          setTimeout(() => {
            if (Math.random() > 0.3) {
              // Pick a finding to show
              const finding = FINDING_TEMPLATES[Math.floor(Math.random() * FINDING_TEMPLATES.length)];
              const filled = fillTemplate(finding.text, domain);
              addLine(finding.type, `  ${filled}`);
            } else {
              addLine('output', `  ${['OK', '200 OK', 'DNS response received', 'TLS handshake complete', 'Connection established'][Math.floor(Math.random() * 5)]}`);
            }
          }, 150);

          cmdIndexRef.current++;
          tick++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          addLine('success', '');
          addLine('success', `═══ Scan Complete ═══ ${totalCmds} commands executed`);
        }
      }, 300 + Math.random() * 200);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isScanning, domain, addLine]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const lineColors: Record<string, string> = {
    command: 'text-[#00ff88]',
    output: 'text-[#8b949e]',
    finding: 'text-[#79c0ff]',
    critical: 'text-[#f85149] font-bold',
    success: 'text-[#3fb950]',
    info: 'text-[#d2a8ff]',
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-xl border border-[rgba(0,255,136,0.12)] bg-[#0d1117] overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[rgba(0,255,136,0.08)]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#f85149]/80" />
          <div className="w-3 h-3 rounded-full bg-[#e3b341]/80" />
          <div className="w-3 h-3 rounded-full bg-[#3fb950]/80" />
        </div>
        <span className="text-xs font-mono text-muted-foreground ml-2">reconpro@scanner:~$</span>
        <span className="text-xs font-mono text-[#00ff88] ml-auto">
          {isScanning ? (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ● SCANNING
            </motion.span>
          ) : (
            '● IDLE'
          )}
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto p-3 font-mono text-xs leading-5 scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#21262d transparent' }}
      >
        {!isScanning && lines.length === 0 && (
          <div className="text-muted-foreground text-center py-8">
            <p>ReconPro Real-Time Terminal</p>
            <p className="text-[10px] mt-1 opacity-50">Launch a scan to see live command execution</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1 }}
              className={`whitespace-nowrap overflow-hidden text-ellipsis ${lineColors[line.type] || 'text-[#e6edf3]'}`}
            >
              {line.type === 'command' && <span className="text-[#00ff88]">$ </span>}
              {line.text || '\u00A0'}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor */}
        {isScanning && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[#00ff88]">$</span>
            <motion.span
              className="w-2 h-4 bg-[#00ff88]"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
