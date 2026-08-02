'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// ─── CLI Showcase — Luxury terminal display for the dashboard ────

const CLI_LINES = [
  { type: 'banner', text: '' },
  { type: 'banner', text: '  ██████╗ ███████╗███████╗██████╗  ██████╗ ███████╗' },
  { type: 'banner', text: ' ██╔════╝ ██╔════╝██╔════╝██╔══██╗██╔═══██╗██╔════╝' },
  { type: 'banner', text: ' ██║  ███╗█████╗  ███████╗██████╔╝██║   ██║███████╗' },
  { type: 'banner', text: ' ██║   ██║██╔══╝  ╚════██║██╔═══╝ ██║   ██║╚════██║' },
  { type: 'banner', text: ' ╚██████╔╝███████╗███████║██║     ╚██████╔╝███████║' },
  { type: 'banner', text: '  ╚═════╝ ╚══════╝╚══════╝╚═╝      ╚═════╝ ╚══════╝' },
  { type: 'banner', text: '          E N T E R P R I S E   v 4 . 0' },
  { type: 'banner', text: '' },
  { type: 'output', text: ' ────────────────────────────────────────────' },
  { type: 'muted', text: ' Target: acme-corp.com' },
  { type: 'muted', text: ' Blade:  RECON (13-category surface recon)' },
  { type: 'muted', text: ' Mode:   FULL STEALTH' },
  { type: 'output', text: ' ────────────────────────────────────────────' },
  { type: 'output', text: '' },
  { type: 'prompt', text: '$ ' },
  { type: 'command', text: 'reconpro' },
  { type: 'flag', text: ' --target' },
  { type: 'string', text: ' acme-corp.com' },
  { type: 'flag', text: ' --blade' },
  { type: 'string', text: ' recon' },
  { type: 'flag', text: ' --stealth' },
  { type: 'flag', text: ' --output' },
  { type: 'string', text: ' json' },
  { type: 'output', text: '' },
  { type: 'accent', text: ' [■■■■■■■■■■■■■■■■■■■■] 100% Complete' },
  { type: 'output', text: '' },
  { type: 'muted', text: ' ├─ DNS Records        42 assets discovered' },
  { type: 'success', text: ' │  └─ SPF/DKIM/DMARC   ✓ PASS' },
  { type: 'muted', text: ' ├─ Subdomains         127 found (active: 89)' },
  { type: 'error', text: ' │  └─ Exposed Panel     ✗ CRITICAL — admin.staging' },
  { type: 'muted', text: ' ├─ SSL/TLS            Valid — expires in 47d' },
  { type: 'muted', text: ' ├─ Ports (Top 1000)   23 open' },
  { type: 'error', text: ' │  └─ 3389/RDP          ✗ EXPOSED — no NLA' },
  { type: 'muted', text: ' ├─ Headers             4 misconfigurations' },
  { type: 'success', text: ' │  └─ CSP               ✓ Strict policy' },
  { type: 'muted', text: ' └─ WAF Detection      Cloudflare (fingerprint match)' },
  { type: 'output', text: '' },
  { type: 'accent', text: ' ════════════════════════════════════════════════' },
  { type: 'accent', text: '  RISK SCORE: 73/100  │  FINDINGS: 34  │  2 CRITICAL' },
  { type: 'accent', text: ' ════════════════════════════════════════════════' },
  { type: 'output', text: '' },
  { type: 'muted', text: ' Report: ./output/acme-corp_2026-08-02.json' },
  { type: 'muted', text: ' Duration: 47.3s  │  Modules: 13/13  │  Bypasses: 3' },
  { type: 'output', text: '' },
  { type: 'prompt', text: '$ ' },
  { type: 'cursor' },
];

interface CLIShowcaseProps {
  className?: string;
  animated?: boolean;
}

export function CLIShowcase({ className = '', animated = true }: CLIShowcaseProps) {
  const [visibleLines, setVisibleLines] = useState(animated ? 0 : CLI_LINES.length);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) return;
    if (visibleLines >= CLI_LINES.length) return;

    const delay = visibleLines < 8
      ? 30
      : visibleLines < 14
        ? 50
        : visibleLines < 18
          ? 80
          : 35;

    const timer = setTimeout(() => {
      setVisibleLines(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [visibleLines, animated]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <div className={`cli-showcase ${className}`}>
      {/* Title bar */}
      <div className="cli-titlebar">
        <div className="cli-dot cli-dot-red" />
        <div className="cli-dot cli-dot-yellow" />
        <div className="cli-dot cli-dot-green" />
        <span className="ml-3 text-[11px] text-[#444444] font-mono tracking-wide">reconpro — acme-corp.com</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] text-[#333333] font-mono">zsh</span>
        </div>
      </div>

      {/* Terminal body */}
      <div ref={containerRef} className="cli-body max-h-[320px] overflow-y-auto scrollbar-none">
        {CLI_LINES.slice(0, visibleLines).map((line, i) => {
          if (line.type === 'cursor') {
            return (
              <span key={i} className="cli-cursor" />
            );
          }

          if (line.type === 'banner') {
            return (
              <div key={i} className="cli-banner">{line.text || ' '}</div>
            );
          }

          return (
            <div key={i}>
              <span className={`cli-${line.type}`}>{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Compact CLI Preview (for bento tiles) ────────────────────

export function CLIPreview({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#000000] border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden font-mono ${className}`}>
      {/* Mini titlebar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(255,255,255,0.015)] border-b border-[rgba(255,255,255,0.03)]">
        <div className="w-2 h-2 rounded-full bg-[#ff3355]/60" />
        <div className="w-2 h-2 rounded-full bg-[#ffaa00]/60" />
        <div className="w-2 h-2 rounded-full bg-[#00ff88]/60" />
        <span className="ml-2 text-[8px] text-[#333333] tracking-wider">RECONPRO</span>
      </div>
      <div className="p-3 text-[10px] leading-[1.7] space-y-0">
        <div><span className="text-[#ffffff]">$ </span><span className="text-[#f0f0f0]">reconpro</span> <span className="text-[#44aaff]">--target</span> <span className="text-[#00ff88]">acme.io</span></div>
        <div className="text-[#444444]">  ████████████████████ 100%</div>
        <div className="text-[#444444]">  ├─ 42 assets  │  2 critical  │  73/100 risk</div>
        <div className="text-[#00ff88]">  └─ Report: ./output/acme.json</div>
        <div className="mt-1"><span className="text-[#ffffff]">$ </span><span className="cli-cursor" style={{ width: '6px', height: '12px' }} /></div>
      </div>
    </div>
  );
}
