'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { escapeHtml } from '@/lib/utils';
import {
  Terminal,
  Maximize2,
  Minimize2,
  Share2,
  Copy,
  Download,
  X,
  ExternalLink,
} from 'lucide-react';

/* ─── types ─── */
interface TermLine {
  id: number;
  html: string;
  cls: string;
}

type ScanPhase =
  | 'recon'
  | 'portscan'
  | 'sslcheck'
  | 'headers'
  | 'vulndetect';

/* ─── constants ─── */
const PROMPT = 'reconpro@scan:~$ ';
const BANNER = `
 ██████╗██╗  ██╗██████╗  ██████╗ ███╗   ██╗ █████╗
██╔════╝██║  ██║██╔══██╗██╔═══██╗████╗  ██║██╔══██╗
██║     ███████║██████╔╝██║   ██║██╔██╗ ██║███████║
██║     ██╔══██║██╔══██╗██║   ██║██║╚██╗██║██╔══██║
╚██████╗██║  ██║██║  ██║╚██████╔╝██║ ╚████║██║  ██║
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝
       Advanced Attack Surface Intelligence Platform
`.trim();

const DEMO_TARGETS = [
  { domain: 'demo-bank.com', desc: 'Financial services demo target' },
  { domain: 'shop-example.io', desc: 'E-commerce platform demo' },
  { domain: 'cloud-test.dev', desc: 'Cloud infrastructure demo' },
  { domain: 'gov-sim.org', desc: 'Government portal simulation' },
  { domain: 'health-api.net', desc: 'Healthcare API demo' },
];

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const SIMULATED_FINDINGS: Record<string, Array<{ severity: string; title: string; detail: string }>> = {
  recon: [
    { severity: 'INFO', title: 'DNS Resolution', detail: 'A: 104.18.42.12, 172.67.182.31 | CNAME: none | SOA: ns1.digitalocean.com' },
    { severity: 'LOW', title: 'DMARC Policy Weak', detail: 'p=none; pct=50 — domain is not protected against email spoofing' },
  ],
  portscan: [
    { severity: 'INFO', title: 'Port Scan Complete', detail: '22/tcp SSH, 80/tcp HTTP, 443/tcp HTTPS — 3 open / 997 filtered' },
    { severity: 'MEDIUM', title: 'Port 8080 Open', detail: 'HTTP alt detected on 8080/tcp — possible admin panel or proxy' },
    { severity: 'MEDIUM', title: 'Port 3306 Filtered', detail: 'MySQL port responds with RST — database may be exposed to internal net' },
  ],
  sslcheck: [
    { severity: 'LOW', title: 'TLS 1.2 Minimum', detail: 'Server supports TLSv1.2 but not TLSv1.3 — modern cipher mismatch' },
    { severity: 'MEDIUM', title: 'Certificate SAN Mismatch', detail: 'Leaf cert does not cover *.internal.{domain} — mixed content risk' },
    { severity: 'HIGH', title: 'HSTS Missing', detail: 'Strict-Transport-Security header not set — downgrade attack possible' },
  ],
  headers: [
    { severity: 'CRITICAL', title: 'Missing CSP Header', detail: 'Content-Security-Policy absent — XSS risk on every page' },
    { severity: 'HIGH', title: 'X-Frame-Options Missing', detail: 'Page can be embedded in iframes — clickjacking possible' },
    { severity: 'MEDIUM', title: 'Server Version Disclosed', detail: 'Server: nginx/1.18.0 (Ubuntu) — exact version aids fingerprinting' },
    { severity: 'LOW', title: 'X-Powered-By: Express', detail: 'Technology stack leaked via response header' },
  ],
  vulndetect: [
    { severity: 'CRITICAL', title: 'Path Traversal (CVE-2024-XXXX)', detail: '/api/files?path=../../../etc/passwd returns 200 — arbitrary file read' },
    { severity: 'HIGH', title: 'SQL Injection (CVE-2024-YYYY)', detail: '/api/search?q=1%27%20OR%201%3D1 returns all records' },
    { severity: 'HIGH', title: 'SSRF in Webhook Endpoint', detail: '/api/webhook?url=http://169.254.169.254/latest/meta-data/ returns cloud metadata' },
    { severity: 'MEDIUM', title: 'IDOR on User Profiles', detail: 'Changing /api/users/123 to /api/users/124 returns another user\'s data' },
  ],
};

/* ─── severity color helper ─── */
function sevColor(s: string): string {
  switch (s.toLowerCase()) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-400';
    case 'low': return 'text-blue-400';
    default: return 'text-green-400';
  }
}

/* ─── progress bar builder ─── */
function progressBar(pct: number, width = 40): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pct}%`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function MatrixTerminalPanel() {
  /* ─── state ─── */
  const [lines, setLines] = useState<TermLine[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [isScanning, setIsScanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showCTA, setShowCTA] = useState(false);
  const [copied, setCopied] = useState(false);

  const lineIdRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanAbortRef = useRef(false);

  /* auto-scroll */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  /* session timer */
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* show CTA after a scan */
  useEffect(() => {
    if (lines.length > 30 && !showCTA) setShowCTA(true);
  }, [lines, showCTA]);

  /* focus input on click */
  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  /* ─── helpers ─── */
  const push = useCallback((html: string, cls = 'text-[#00ff88]') => {
    setLines(prev => [...prev, { id: lineIdRef.current++, html, cls }]);
  }, []);

  const pushBlank = useCallback(() => push('', ''), [push]);

  /* ─── command handlers ─── */
  const cmdBanner = useCallback(() => {
    push('<pre class="text-cyan-400 text-xs leading-tight">' + BANNER.replace(/</g, '&lt;') + '</pre>');
    push('  Type "help" for available commands', 'text-gray-500');
    pushBlank();
  }, [push, pushBlank]);

  const cmdHelp = useCallback(() => {
    const cmds = [
      ['help',          'Show this help message'],
      ['scan <domain>', 'Run a simulated recon scan on a target'],
      ['vibesec <domain>', 'Check VibeSec security score'],
      ['status',        'Show ReconPro platform status'],
      ['targets',       'List available demo targets'],
      ['clear',         'Clear terminal'],
      ['banner',        'Show ReconPro ASCII art banner'],
      ['about',         'About ReconPro'],
      ['export <format>','Export session (text)'],
    ];
    push('Available Commands:', 'text-cyan-400 font-bold');
    push('─'.repeat(50), 'text-gray-600');
    for (const [c, d] of cmds) {
      push(`  <span class="text-yellow-300">${c.padEnd(18)}</span> ${d}`);
    }
    pushBlank();
  }, [push, pushBlank]);

  const cmdStatus = useCallback(() => {
    push('ReconPro Platform Status', 'text-cyan-400 font-bold');
    push('─'.repeat(50), 'text-gray-600');
    push('  <span class="text-green-400">●</span>  API Gateway          Online');
    push('  <span class="text-green-400">●</span>  Scan Engine           Online');
    push('  <span class="text-green-400">●</span>  VibeSec Engine        Online');
    push('  <span class="text-green-400">●</span>  Threat Intelligence   Online');
    push('  <span class="text-yellow-400">●</span>  CNI Sentinel          Degraded (regional)');
    push('  <span class="text-green-400">●</span>  Pegasus Inspector     Online');
    push('');
    push(`  Uptime: ${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m ${elapsed % 60}s`);
    push(`  Scans processed: ${lines.filter(l => l.html.includes('Scan Complete')).length}`);
    pushBlank();
  }, [push, pushBlank, elapsed, lines]);

  const cmdTargets = useCallback(() => {
    push('Demo Targets Available:', 'text-cyan-400 font-bold');
    push('─'.repeat(50), 'text-gray-600');
    for (const t of DEMO_TARGETS) {
      push(`  <span class="text-yellow-300">${t.domain.padEnd(22)}</span> ${t.desc}`);
    }
    push('');
    push('  Usage: <span class="text-green-400">scan ' + DEMO_TARGETS[0].domain + '</span>', 'text-gray-500');
    pushBlank();
  }, [push, pushBlank]);

  const cmdAbout = useCallback(() => {
    push('ReconPro — Advanced Attack Surface Intelligence', 'text-cyan-400 font-bold');
    push('─'.repeat(50), 'text-gray-600');
    push('  Version:     2.0.0-beta (Matrix Terminal Edition)');
    push('  Engine:      Hybrid recon (DNS + HTTP + TLS + Fuzz)');
    push('  VibeSec:     LLM-powered security grading');
    push('  Pegasus:     Shadow-C2 spyware detection');
    push('  License:     Proprietary — ReconPro Labs');
    push('  Repository:  github.com/reconpro/reconpro');
    push('');
    push('  Built with ♥ by the ReconPro team.', 'text-gray-500');
    pushBlank();
  }, [push, pushBlank]);

  const cmdExport = useCallback(() => {
    const text = lines.map(l => l.html.replace(/<[^>]+>/g, '')).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconpro-session-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    push('Session exported as reconpro-session-*.txt', 'text-green-400');
    pushBlank();
  }, [lines, push, pushBlank]);

  const cmdVibeSec = useCallback((domain: string) => {
    if (isScanning) return;
    setIsScanning(true);
    push(`VibeSec Analysis: <span class="text-white">${escapeHtml(domain)}</span>`, 'text-cyan-400 font-bold');
    push('─'.repeat(50), 'text-gray-600');

    const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];
    const gradeIdx = Math.floor(Math.random() * 4);
    const grade = grades[gradeIdx];
    const score = 95 - gradeIdx * 6 + Math.floor(Math.random() * 4);
    const spinner = SPINNER_FRAMES;

    let frame = 0;
    const iv = setInterval(() => {
      setLines(prev => {
        const next = [...prev];
        const last = next.length - 1;
        if (next[last] && next[last].html.includes('Analyzing')) {
          next[last] = { ...next[last], html: `<span class="text-gray-400">${spinner[frame % spinner.length]}</span> Analyzing security posture...` };
        }
        return next;
      });
      frame++;
    }, 80);

    push(`  <span class="text-gray-400">⠋</span> Analyzing security posture...`);

    setTimeout(() => {
      clearInterval(iv);
      pushBlank();
      push(`  VibeSec Score: <span class="text-white text-2xl font-bold">${score}/100</span>`, 'text-green-400');
      push(`  Grade:        <span class="text-yellow-300 text-2xl font-bold">${grade}</span>`);
      pushBlank();
      push('  Category Breakdown:', 'text-gray-400');
      push(`    TLS/SSL:          <span class="text-green-400">${85 + Math.floor(Math.random() * 15)}/100</span>`);
      push(`    Headers:          <span class="${score > 80 ? 'text-green-400' : 'text-yellow-400'}">${70 + Math.floor(Math.random() * 30)}/100</span>`);
      push(`    DNS Security:     <span class="${score > 80 ? 'text-green-400' : 'text-yellow-400'}">${60 + Math.floor(Math.random() * 40)}/100</span>`);
      push(`    Exposed Ports:    <span class="text-green-400">${80 + Math.floor(Math.random() * 20)}/100</span>`);
      push(`    Vuln Posture:     <span class="${score > 85 ? 'text-green-400' : 'text-orange-400'}">${55 + Math.floor(Math.random() * 45)}/100</span>`);
      pushBlank();
      push('  Verdict: ' + (gradeIdx < 2 ? 'Excellent security posture ✓' : gradeIdx < 4 ? 'Good with minor issues' : 'Needs improvement'), gradeIdx < 2 ? 'text-green-400' : gradeIdx < 4 ? 'text-yellow-400' : 'text-orange-400');
      pushBlank();
      setIsScanning(false);
    }, 2500);
  }, [push, pushBlank, isScanning]);

  /* ─── scan simulation ─── */
  const runScan = useCallback((domain: string) => {
    if (isScanning) return;
    setIsScanning(true);
    scanAbortRef.current = false;

    push(`Scanning: <span class="text-white">${escapeHtml(domain)}</span>`, 'text-cyan-400 font-bold');
    push('─'.repeat(50), 'text-gray-600');
    pushBlank();

    const phases: ScanPhase[] = ['recon', 'portscan', 'sslcheck', 'headers', 'vulndetect'];
    const phaseLabels: Record<ScanPhase, string> = {
      recon: 'Reconnaissance',
      portscan: 'Port Scan',
      sslcheck: 'SSL/TLS Check',
      headers: 'Header Analysis',
      vulndetect: 'Vulnerability Detection',
    };

    let phaseIdx = 0;

    const runPhase = () => {
      if (phaseIdx >= phases.length || scanAbortRef.current) {
        /* summary */
        if (!scanAbortRef.current) {
          pushBlank();
          push(`Scan Complete: <span class="text-white">${escapeHtml(domain)}</span>`, 'text-green-400 font-bold');
          push('─'.repeat(50), 'text-gray-600');
          const totalFindings = phases.reduce(
            (sum, p) => sum + (SIMULATED_FINDINGS[p]?.length || 0), 0
          );
          push(`  Total Findings:     <span class="text-white">${totalFindings}</span>`);
          push(`  Critical:           <span class="text-red-500">${SIMULATED_FINDINGS.vulndetect.filter(f => f.severity === 'CRITICAL').length + SIMULATED_FINDINGS.headers.filter(f => f.severity === 'CRITICAL').length}</span>`);
          push(`  High:               <span class="text-orange-500">${phases.reduce((s, p) => s + SIMULATED_FINDINGS[p].filter(f => f.severity === 'HIGH').length, 0)}</span>`);
          push(`  Medium:             <span class="text-yellow-400">${phases.reduce((s, p) => s + SIMULATED_FINDINGS[p].filter(f => f.severity === 'MEDIUM').length, 0)}</span>`);
          push(`  Low/Info:           <span class="text-blue-400">${phases.reduce((s, p) => s + SIMULATED_FINDINGS[p].filter(f => !['CRITICAL', 'HIGH', 'MEDIUM'].includes(f.severity)).length, 0)}</span>`);
          pushBlank();
        }
        setIsScanning(false);
        return;
      }

      const phase = phases[phaseIdx];
      const label = phaseLabels[phase];
      push(`▸ Phase ${phaseIdx + 1}/5: ${label}`, 'text-white font-bold');

      /* animated progress */
      let pct = 0;
      const progressLineId = lineIdRef.current;
      push(`<span class="text-gray-400">  ${progressBar(0)}</span>`);

      const progressIv = setInterval(() => {
        pct += Math.random() * 12 + 3;
        if (pct > 100) pct = 100;
        setLines(prev => prev.map(l =>
          l.id === progressLineId
            ? { ...l, html: `<span class="text-gray-400">  ${progressBar(pct)}</span>` }
            : l
        ));
      }, 60);

      const phaseTime = 1000 + Math.random() * 1000;

      setTimeout(() => {
        clearInterval(progressIv);
        /* update progress to 100% */
        setLines(prev => prev.map(l =>
          l.id === progressLineId
            ? { ...l, html: `<span class="text-green-400">  ${progressBar(100)}</span>` }
            : l
        ));

        /* output findings */
        const findings = SIMULATED_FINDINGS[phase] || [];
        setTimeout(() => {
          for (const f of findings) {
            push(`  <span class="${sevColor(f.severity)}">[${f.severity.padEnd(8)}]</span> <span class="text-white">${f.title}</span>`);
            push(`             <span class="text-gray-500">${f.detail.replace('{domain}', escapeHtml(domain))}</span>`, 'text-gray-500');
          }
          pushBlank();
          phaseIdx++;
          setTimeout(runPhase, 300);
        }, 400);
      }, phaseTime);
    };

    setTimeout(runPhase, 300);
  }, [push, pushBlank, isScanning]);

  /* ─── command router ─── */
  const exec = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    /* echo command */
    push(`<span class="text-gray-400">${PROMPT}</span><span class="text-white">${escapeHtml(trimmed)}</span>`);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (cmd) {
      case 'help':    void cmdHelp(); break;
      case 'scan':    { if (arg) { runScan(arg); } else { push('  Usage: scan <domain>', 'text-red-400'); } break; }
      case 'vibesec': { if (arg) { cmdVibeSec(arg); } else { push('  Usage: vibesec <domain>', 'text-red-400'); } break; }
      case 'status':  void cmdStatus(); break;
      case 'targets': void cmdTargets(); break;
      case 'clear':   setLines([]); break;
      case 'banner':  void cmdBanner(); break;
      case 'about':   void cmdAbout(); break;
      case 'export':  void cmdExport(); break;
      case 'exit':
        push('  This terminal runs in your browser — no process to exit :)', 'text-gray-500');
        pushBlank();
        break;
      case 'whoami':
        push('  reconpro-matrix-user (browser shell)', 'text-gray-400');
        pushBlank();
        break;
      case 'ls':
        push('  <span class="text-blue-400">scans/</span>  <span class="text-blue-400">reports/</span>  <span class="text-blue-400">targets/</span>  <span class="text-blue-400">config.yaml</span>');
        pushBlank();
        break;
      case 'pwd':
        push('  /home/reconpro', 'text-gray-400');
        pushBlank();
        break;
      default:
        push(`  <span class="text-red-400">Command not found:</span> ${escapeHtml(cmd)}`, 'text-red-400');
        push('  Type <span class="text-green-400">help</span> for available commands.', 'text-gray-500');
        pushBlank();
    }

    /* add to history */
    setHistory(prev => [trimmed, ...prev.filter(h => h !== trimmed)]);
    setHistIdx(-1);
  }, [cmdHelp, cmdStatus, cmdTargets, cmdBanner, cmdAbout, cmdExport, cmdVibeSec, runScan, push]);

  /* ─── key handling ─── */
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const val = input;
      setInput('');
      exec(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistory(prev => {
        const newIdx = Math.min(histIdx + 1, prev.length - 1);
        setHistIdx(newIdx);
        if (prev[newIdx]) setInput(prev[newIdx]);
        return prev;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx <= 0) {
        setHistIdx(-1);
        setInput('');
      } else {
        setHistory(prev => {
          const newIdx = histIdx - 1;
          setHistIdx(newIdx);
          if (prev[newIdx]) setInput(prev[newIdx]);
          return prev;
        });
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  }, [input, histIdx, history, exec]);

  /* ─── session sharing ─── */
  const handleShare = useCallback(() => {
    const text = lines.map(l => l.html.replace(/<[^>]+>/g, '')).join('\n');
    const encoded = btoa(encodeURIComponent(text));
    const fakeUrl = `https://reconpro.io/share/session/${Date.now().toString(36)}?d=${encoded.slice(0, 40)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fakeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [lines]);

  /* ─── copy all ─── */
  const handleCopy = useCallback(() => {
    const text = lines.map(l => l.html.replace(/<[^>]+>/g, '')).join('\n');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [lines]);

  /* ─── download ─── */
  const handleDownload = useCallback(() => {
    const text = lines.map(l => l.html.replace(/<[^>]+>/g, '')).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconpro-terminal-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lines]);

  /* ─── format timer ─── */
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  /* ─── init: show banner on mount ─── */
  useEffect(() => {
    void cmdBanner();
  }, []);

  /* ═══════════ RENDER ═══════════ */
  return (
    <div
      className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative'} flex flex-col bg-[#0a0e17] border border-green-900/30 rounded-lg overflow-hidden font-mono text-sm`}
      style={{ minHeight: isFullscreen ? undefined : '600px', height: isFullscreen ? '100vh' : '80vh' }}
      onClick={focusInput}
    >
      {/* ─── TOP BAR ─── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1320] border-b border-green-900/30 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00ff88]" />
          <span className="text-[#00ff88] font-bold text-xs tracking-wide">RECONPRO MATRIX TERMINAL</span>
          <span className="text-gray-600 text-[10px]">v2.0.0-beta</span>
        </div>
        <div className="flex items-center gap-3">
          {/* session timer */}
          <span className="text-gray-500 text-[10px] font-mono">{fmtTime(elapsed)}</span>
          <span className="text-gray-700 text-[10px]">|</span>

          <button
            onClick={handleShare}
            className="text-gray-500 hover:text-[#00ff88] transition-colors"
            title="Share session"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="text-gray-500 hover:text-[#00ff88] transition-colors"
            title="Copy all output"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied && <span className="text-[10px] text-[#00ff88] ml-1">Copied!</span>}
          </button>
          <button
            onClick={handleDownload}
            className="text-gray-500 hover:text-[#00ff88] transition-colors"
            title="Download session"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="text-gray-500 hover:text-[#00ff88] transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── TERMINAL OUTPUT ─── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-thin" style={{ scrollBehavior: 'smooth' }}>
        {lines.map(line => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap break-all leading-relaxed text-[13px] ${line.cls}`}
            dangerouslySetInnerHTML={{ __html: line.html }}
          />
        ))}
        <div ref={endRef} />
      </div>

      {/* ─── CTA ─── */}
      <AnimatePresence>
        {showCTA && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-[#0d1a0d] to-[#0a0e17] border-t border-green-900/20 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <span className="text-gray-400 text-xs">
                Liked this? Get the full CLI with real scans:
              </span>
              <code className="text-[#00ff88] text-xs bg-black/40 px-2 py-1 rounded">
                pip install reconpro
              </code>
              <a
                href="https://github.com/reconpro/reconpro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#00ff88] text-xs flex items-center gap-1 transition-colors"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setShowCTA(false)}
                className="sm:ml-auto text-gray-600 hover:text-gray-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── INPUT LINE ─── */}
      <div className="flex items-center px-3 py-2 bg-[#060a12] border-t border-green-900/20 shrink-0">
        <span className="text-[#00ff88] text-xs font-bold shrink-0 select-none">{PROMPT}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isScanning}
          placeholder={isScanning ? 'scanning...' : 'type a command...'}
          className="flex-1 bg-transparent text-[#00ff88] outline-none placeholder-gray-700 text-[13px] font-mono caret-[#00ff88]"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
        {isScanning && (
          <span className="text-red-500 text-[10px] animate-pulse ml-2">SCANNING</span>
        )}
      </div>
    </div>
  );
}
