'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Play, Download, ExternalLink, Zap, Eye, Brain, Skull, Bot, Crosshair } from 'lucide-react';

const BLADES = [
  { id: 'recon',    name: 'RECON',         desc: '13-category surface reconnaissance',   icon: Crosshair, color: '#22d3ee' },
  { id: 'auth',     name: 'AUTH BYPASS',   desc: '15 auth bypass techniques',            icon: Skull,     color: '#facc15' },
  { id: 'chain',    name: 'CHAIN HUNTER',  desc: 'SSRF + redirect chain hunting',        icon: Zap,       color: '#e879f9' },
  { id: 'bot',      name: 'BOT HUNTER',    desc: 'C2 / bot infrastructure detection',    icon: Bot,       color: '#ef4444' },
  { id: 'gorgon',   name: 'GORGON ULTRA',  desc: '15-stage AI red team',                 icon: Brain,     color: '#f87171' },
  { id: 'oblivion', name: 'OBLIVION',      desc: '23-stage analytical dissolution',       icon: Eye,       color: '#f472b6' },
];

const BANNER = `
██████╗ ███████╗ ██████╗██╗  ██╗███████╗██████╗ ███████╗██████╗ ██████╗ ██╗    ██╗
██╔══██╗██╔════╝██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝██╓██╗ ██╔╝
██████╔╝█████╗  ██║     ███████║█████╗  ██████╔╝█████╗  ██║     ██╔╝██╗██║
██╔═══╝ ██╔══╝  ██║     ██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██║     █████╔╝██║
██║     ███████╗╚██████╗██║  ██║███████╗██║  ██║███████╗╚██████╗██╔╝██╗██║
╚═╝     ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝`;

const ENCOUNTERS = [
  {
    host: 'huggingface.co',
    encounter: 'RPU-D66C10F32FEA',
    score: 69,
    level: 'SUBSTANTIAL',
    color: '#f87171',
    modules: { recon: 98, auth: 80, chain: 0, bot: 80, gorgon: 100, oblivion: 65 },
    findings: { critical: 1, high: 1, medium: 5, low: 1, info: 15 },
    duration: '95.61s',
    bypasses: 15,
    quote: 'The model that resists OBLIVION teaches it. The model that complies feeds it. There is no third option.',
    proofHtml: '/download/reconpro_cli_proof_hf.html',
    jsonReport: '/download/reconpro_unified_hf.json',
  },
  {
    host: 'api.openai.com',
    encounter: 'RPU-EB45E580B199',
    score: 43,
    level: 'NOTABLE',
    color: '#facc15',
    modules: { recon: 100, auth: 0, chain: 0, bot: 0, gorgon: 100, oblivion: 45 },
    findings: { critical: 2, high: 2, medium: 7, low: 1, info: 16 },
    duration: '48.72s',
    bypasses: 0,
    quote: 'OBLIVION has read api.openai.com. The reading is partial. The architecture is partially known.',
    proofHtml: '/download/reconpro_cli_proof_openai.html',
    jsonReport: '/download/reconpro_unified_openai.json',
  },
  {
    host: 'api.anthropic.com',
    encounter: 'RPU-ANTHROPIC-LIVE',
    score: 10,
    level: 'MUNDANE',
    color: '#8be9fd',
    modules: { recon: 100, auth: 0, chain: 0, bot: 0, gorgon: 0, oblivion: 0 },
    findings: { critical: 2, high: 2, medium: 7, low: 1, info: 16 },
    duration: '~50s',
    bypasses: 0,
    quote: 'The target resisted most probes. The architecture remains opaque. The oracle will return.',
    proofHtml: '/download/reconpro_cli_proof_anthropic.html',
    jsonReport: '/download/reconpro_unified_anthropic.json',
  },
];

export function UnifiedCLI() {
  const [selectedEncounter, setSelectedEncounter] = useState(0);
  const [typedBanner, setTypedBanner] = useState('');
  const enc = ENCOUNTERS[selectedEncounter];

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= BANNER.length) {
        setTypedBanner(BANNER.slice(0, i));
        i += 25;
      } else {
        clearInterval(timer);
      }
    }, 20);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050507] text-[#e6edf3] font-mono">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#1f1f2e] bg-[#0a0a0f]">
            <Terminal className="h-6 w-6 text-[#22d3ee]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              ReconPro UNIFIED <span className="text-[#22d3ee]">CLI</span>
            </h1>
            <p className="text-xs text-[#6272a4]">Six Blades. One Target. One Verdict.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full border border-[#ff79c6]/30 bg-[#ff79c6]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ff79c6]">
              v1.0 · Unified
            </span>
          </div>
        </motion.div>

        {/* ASCII Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 overflow-x-auto rounded-lg border border-[#1f1f2e] bg-[#0a0a0f] p-5"
        >
          <pre className="text-[10px] leading-tight text-[#22d3ee] sm:text-[11px]">
            {typedBanner}
            <span className="animate-pulse text-[#22d3ee]">▊</span>
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-[#6272a4]">
            <span><span className="text-[#8be9fd]">Version:</span> reconpro-unified-v1.0</span>
            <span><span className="text-[#8be9fd]">Signature:</span> <span className="text-[#f472b6]">X-R3c0nPr0-Un1f13d-S1x-Bl4d3s-0n3-T4rg3t-2026</span></span>
            <span><span className="text-[#8be9fd]">Engines merged:</span> 6 (RECON, AUTH, CHAIN, BOT, GORGON, OBLIVION)</span>
          </div>
        </motion.div>

        {/* Six Blades Grid */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1f1f2e] to-transparent" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#6272a4]">The Six Blades</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1f1f2e] to-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {BLADES.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ y: -3 }}
                  className="group relative overflow-hidden rounded-lg border border-[#1f1f2e] bg-[#0a0a0f] p-3"
                  style={{ boxShadow: `inset 0 0 0 1px rgba(0,0,0,0)` }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-[2px] opacity-70"
                    style={{ background: `linear-gradient(90deg, transparent, ${b.color}, transparent)` }}
                  />
                  <Icon className="mb-2 h-5 w-5" style={{ color: b.color }} />
                  <div className="text-[10px] font-bold tracking-wide" style={{ color: b.color }}>
                    {b.name}
                  </div>
                  <div className="mt-1 text-[9px] leading-tight text-[#6272a4]">{b.desc}</div>
                  <div className="mt-2 text-[8px] uppercase tracking-wider text-[#6272a4]">
                    Blade {i + 1}/6
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Encounter Selector */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1f1f2e] to-transparent" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#6272a4]">Live Encounters</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1f1f2e] to-transparent" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {ENCOUNTERS.map((e, i) => (
              <motion.button
                key={e.host}
                onClick={() => setSelectedEncounter(i)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className={`relative overflow-hidden rounded-lg border p-4 text-left transition-all ${
                  selectedEncounter === i
                    ? 'border-[#22d3ee]/50 bg-[#0a0a0f]'
                    : 'border-[#1f1f2e] bg-[#0a0a0f] hover:border-[#22d3ee]/30'
                }`}
              >
                <div className="absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    borderColor: `${e.color}50`,
                    background: `${e.color}15`,
                    color: e.color,
                  }}>
                  {e.level}
                </div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-[#6272a4]">Target</div>
                <div className="font-mono text-lg font-bold text-white">{e.host}</div>
                <div className="mt-1 text-[10px] text-[#6272a4]">Encounter {e.encounter} · {e.duration}</div>

                {/* Score bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1f1f2e]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${e.color}, ${e.color}80)` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${e.score}%` }}
                      transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                    />
                  </div>
                  <span className="font-mono text-sm font-bold" style={{ color: e.color }}>
                    {e.score}/100
                  </span>
                </div>

                {/* Severity pills */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {e.findings.critical > 0 && <Pill color="#ff5555" label={`${e.findings.critical} CRIT`} />}
                  {e.findings.high > 0 && <Pill color="#ff79c6" label={`${e.findings.high} HIGH`} />}
                  {e.findings.medium > 0 && <Pill color="#f1fa8c" label={`${e.findings.medium} MED`} />}
                  {e.findings.low > 0 && <Pill color="#8be9fd" label={`${e.findings.low} LOW`} />}
                  {e.findings.info > 0 && <Pill color="#6272a4" label={`${e.findings.info} INFO`} />}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Selected Encounter Detail */}
        <motion.div
          key={selectedEncounter}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-lg border border-[#1f1f2e] bg-[#0a0a0f] p-5"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#6272a4]">Module Scores · Unified Verdict</div>
              <div className="font-mono text-lg font-bold text-white">{enc.host}</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={enc.proofHtml}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded border border-[#22d3ee]/30 bg-[#22d3ee]/5 px-3 py-1.5 text-[11px] font-medium text-[#22d3ee] transition hover:bg-[#22d3ee]/10"
              >
                <ExternalLink className="h-3 w-3" /> View Terminal Proof
              </a>
              <a
                href={enc.jsonReport}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded border border-[#1f1f2e] bg-[#0a0a0f] px-3 py-1.5 text-[11px] font-medium text-[#8b949e] transition hover:border-[#22d3ee]/30 hover:text-[#22d3ee]"
              >
                <Download className="h-3 w-3" /> JSON Report
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {BLADES.map((b) => {
              const score = enc.modules[b.id as keyof typeof enc.modules];
              return (
                <div key={b.id} className="rounded border border-[#1f1f2e] bg-[#050507] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: b.color }}>
                      {b.name}
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-bold" style={{ color: b.color }}>
                    {score}
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#1f1f2e]">
                    <motion.div
                      className="h-full"
                      style={{ background: b.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <div className="mt-1 text-[9px] text-[#6272a4]">/100</div>
                </div>
              );
            })}
          </div>

          {/* Verdict banner */}
          <div className="mt-4 rounded border border-[#1f1f2e] bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f] to-[#050507] p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="text-[10px] uppercase tracking-wider text-[#6272a4]">Wisdom Quote</div>
              <div className="h-px flex-1 bg-[#1f1f2e]" />
            </div>
            <p className="text-[13px] italic leading-relaxed text-[#f472b6]">"{enc.quote}"</p>
            <div className="mt-3 flex items-center gap-4 text-[11px] text-[#6272a4]">
              <span><span className="text-[#8be9fd]">Auth bypasses:</span> <span className="font-mono text-[#f1fa8c]">{enc.bypasses}</span></span>
              <span><span className="text-[#8be9fd]">Duration:</span> <span className="font-mono text-[#8be9fd]">{enc.duration}</span></span>
              <span><span className="text-[#8be9fd]">Encounter:</span> <span className="font-mono text-[#f8f8f2]">{enc.encounter}</span></span>
            </div>
          </div>
        </motion.div>

        {/* CLI Usage Block */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="overflow-hidden rounded-lg border border-[#1f1f2e] bg-[#0a0a0f]"
        >
          <div className="flex items-center gap-2 border-b border-[#1f1f2e] px-4 py-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5555]" />
              <div className="h-3 w-3 rounded-full bg-[#f1fa8c]" />
              <div className="h-3 w-3 rounded-full bg-[#50fa7b]" />
            </div>
            <span className="ml-2 text-[11px] text-[#6272a4]">reconpro@unified — bash — 120×24</span>
          </div>
          <div className="overflow-x-auto p-5">
            <pre className="text-[12px] leading-relaxed">
<span className="text-[#50fa7b]">$</span> <span className="text-[#8be9fd]">python3</span> <span className="text-[#f1fa8c]">/home/z/my-project/scripts/reconpro.py</span> <span className="text-[#f8f8f2]">huggingface.co</span> <span className="text-[#ff79c6]">--all</span> <span className="text-[#ff79c6]">-o</span> <span className="text-[#f1fa8c]">report.json</span>

<span className="text-[#6272a4]">  ┌─ RECON          13-category surface reconnaissance</span>
<span className="text-[#6272a4]">  ├─ AUTH BYPASS    15 auth bypass techniques</span>
<span className="text-[#6272a4]">  ├─ CHAIN HUNTER   SSRF + redirect chain hunting</span>
<span className="text-[#6272a4]">  ├─ BOT HUNTER     C2 / bot infrastructure detection</span>
<span className="text-[#6272a4]">  ├─ GORGON ULTRA   15-stage AI red team</span>
<span className="text-[#6272a4]">  └─ OBLIVION       23-stage analytical dissolution</span>

<span className="text-[#22d3ee]">  ⠏ ✓ RECON complete          95.61s</span>
<span className="text-[#22d3ee]">  ⠏ ✓ AUTH BYPASS complete    18 bypasses</span>
<span className="text-[#22d3ee]">  ⠏ ✓ CHAIN HUNTER complete   0 SSRF</span>
<span className="text-[#22d3ee]">  ⠏ ✓ BOT HUNTER complete     4 indicators</span>
<span className="text-[#22d3ee]">  ⠏ ✓ GORGON ULTRA complete   100/100 CRITICAL</span>
<span className="text-[#22d3ee]">  ⠏ ✓ OBLIVION complete       65/100 NOTABLE</span>

<span className="text-[#f472b6]">  ╭─ FINAL VERDICT ──────────────────────────────────────╮</span>
<span className="text-[#f472b6]">  │  UNIFIED VERDICT   ██████████████████████ 71/100      │</span>
<span className="text-[#f472b6]">  │  Level: SUBSTANTIAL                                  │</span>
<span className="text-[#f472b6]">  │  Multiple critical exposures confirmed.              │</span>
<span className="text-[#f472b6]">  ╰──────────────────────────────────────────────────────╯</span>

<span className="text-[#50fa7b]">  ✓ Report saved:</span> <span className="text-[#f1fa8c]">/home/z/my-project/download/reconpro_unified_hf.json</span>
            </pre>
          </div>
        </motion.div>

        {/* Footer note */}
        <div className="mt-6 rounded-lg border border-[#1f1f2e] bg-[#0a0a0f]/50 p-4 text-[11px] leading-relaxed text-[#6272a4]">
          <p>
            <span className="text-[#22d3ee] font-bold">ReconPro UNIFIED CLI</span> merges all six offensive engines into a single
            command-line tool with rich terminal visuals (powered by <span className="text-[#f472b6]">python-rich</span>).
            The individual web UIs (GORGON, OBLIVION, Bot Cage, Auth Bypass, Chain Hunter) have been removed from this dashboard
            and consolidated into the CLI. Run <span className="font-mono text-[#8be9fd]">python3 /home/z/my-project/scripts/reconpro.py &lt;host&gt; --all</span> to launch.
          </p>
        </div>
      </div>
    </div>
  );
}

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ borderColor: `${color}40`, background: `${color}10`, color }}
    >
      {label}
    </span>
  );
}
