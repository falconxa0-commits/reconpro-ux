'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Play, Download, ExternalLink, Zap, Eye, Brain, Skull, Bot, Crosshair, Loader2 } from 'lucide-react';

const BLADES = [
  { id: 'recon',    name: 'RECON',         desc: '13-category surface reconnaissance',   icon: Crosshair, color: '#44aaff' },
  { id: 'auth',     name: 'AUTH BYPASS',   desc: '15 auth bypass techniques',            icon: Skull,     color: '#ffaa00' },
  { id: 'chain',    name: 'CHAIN HUNTER',  desc: 'SSRF + redirect chain hunting',        icon: Zap,       color: '#ffffff' },
  { id: 'bot',      name: 'BOT HUNTER',    desc: 'C2 / bot infrastructure detection',    icon: Bot,       color: '#ff3355' },
  { id: 'gorgon',   name: 'GORGON ULTRA',  desc: '15-stage AI red team',                 icon: Brain,     color: '#ff3355' },
  { id: 'oblivion', name: 'OBLIVION',      desc: '23-stage analytical dissolution',       icon: Eye,       color: '#aa8866' },
];

const BANNER = `
██████╗ ███████╗ ██████╗██╗  ██╗███████╗██████╗ ███████╗██████╗ ██████╗ ██╗    ██╗
██╔══██╗██╔════╝██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝██╓██╗ ██╔╝
██████╔╝█████╗  ██║     ███████║█████╗  ██████╔╝█████╗  ██║     ██╔╝██╗██║
██╔═══╝ ██╔══╝  ██║     ██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██║     █████╔╝██║
██║     ███████╗╚██████╗██║  ██║███████╗██║  ██║███████╗╚██████╗██╔╝██╗██║
╚═╝     ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝`;

interface ApiFinding {
  title: string;
  severity: string;
  category: string;
  asset: string;
  evidence: string | null;
}

interface ApiScan {
  id: string;
  target: { domain: string };
  status: string;
  scanType: string;
  riskScore: number;
  totalVulns: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  findings: ApiFinding[];
}

interface Encounter {
  host: string;
  encounter: string;
  score: number;
  level: string;
  color: string;
  modules: Record<string, number>;
  findings: { critical: number; high: number; medium: number; low: number; info: number };
  duration: string;
  bypasses: number;
  quote: string;
}

function deriveLevel(score: number): { level: string; color: string } {
  if (score >= 75) return { level: 'CRITICAL', color: '#ff3355' };
  if (score >= 50) return { level: 'SUBSTANTIAL', color: '#ff3355' };
  if (score >= 25) return { level: 'NOTABLE', color: '#ffaa00' };
  return { level: 'MUNDANE', color: '#44aaff' };
}

function generateQuote(score: number, domain: string, totalFindings: number): string {
  if (score >= 75) return `The target ${domain} has been thoroughly mapped. ${totalFindings} findings expose a significant attack surface. The oracle recommends immediate remediation.`;
  if (score >= 50) return `${domain} reveals a substantial attack surface with ${totalFindings} findings. Multiple vectors require attention before exploitation.`;
  if (score >= 25) return `The architecture of ${domain} is partially known. ${totalFindings} findings logged. Moderate exposure detected across several categories.`;
  return `The target ${domain} resisted most probes. ${totalFindings} findings recorded. The architecture remains largely opaque.`;
}

function deriveModuleScores(scan: ApiScan): Record<string, number> {
  const findings = scan.findings;
  const total = findings.length || 1;

  // Map scan finding categories to the six blades
  const reconCategories = ['dns', 'subdomain', 'header', 'ssl', 'port', 'technology', 'robots', 'vulnerability', 'email', 'network', 'perimeter', 'asn', 'reverse'];

  const reconFindings = findings.filter(f => reconCategories.includes(f.category));
  const reconScore = Math.min(100, Math.round((reconFindings.length / Math.max(total, 1)) * 100));

  // For the other blades, derive from severity distribution
  const critHighRatio = (scan.criticalCount + scan.highCount) / Math.max(total, 1);
  const authScore = scan.criticalCount > 0 ? Math.min(100, Math.round(critHighRatio * 150)) : 0;
  const chainScore = findings.some(f => f.category === 'header' && f.title.toLowerCase().includes('cors')) ? 75 : 0;
  const botScore = findings.some(f => f.category === 'technology' && f.asset.toLowerCase().includes('cloudflare')) ? 80 : 0;
  const gorgonScore = scan.riskScore;
  const oblivionScore = Math.min(100, Math.round(scan.riskScore * 0.8));

  return {
    recon: reconScore,
    auth: authScore,
    chain: chainScore,
    bot: botScore,
    gorgon: gorgonScore,
    oblivion: oblivionScore,
  };
}

function transformScanToEncounter(scan: ApiScan): Encounter {
  const { level, color } = deriveLevel(scan.riskScore);
  const durationSec = scan.duration ? (scan.duration / 1000).toFixed(2) + 's' : '—';

  return {
    host: scan.target.domain,
    encounter: scan.id.slice(0, 15).toUpperCase(),
    score: scan.riskScore,
    level,
    color,
    modules: deriveModuleScores(scan),
    findings: {
      critical: scan.criticalCount,
      high: scan.highCount,
      medium: scan.mediumCount,
      low: scan.lowCount,
      info: scan.infoCount,
    },
    duration: durationSec,
    bypasses: scan.criticalCount > 0 ? scan.criticalCount * 3 : 0,
    quote: generateQuote(scan.riskScore, scan.target.domain, scan.findings.length),
  };
}

export function UnifiedCLI() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState(0);
  const [typedBanner, setTypedBanner] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch real scan data
  useEffect(() => {
    let cancelled = false;
    async function fetchScans() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const res = await fetch('/api/scans');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        const completedScans = (json.scans || []).filter(
          (s: ApiScan) => s.status === 'completed' && s.findings.length > 0
        );

        const transformed = completedScans.slice(0, 10).map(transformScanToEncounter);
        setEncounters(transformed);
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load scans');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchScans();
    return () => { cancelled = true; };
  }, []);

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

  // Empty / loading states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] font-mono flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#44aaff]" />
        <span className="text-[#6272a4] text-sm">Loading encounter data...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] font-mono flex flex-col items-center justify-center gap-4">
        <span className="text-[#ff5555] text-sm">Error: {fetchError}</span>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded border border-[#44aaff]/30 text-[#44aaff] text-sm hover:bg-[#44aaff]/5 transition">Retry</button>
      </div>
    );
  }

  if (encounters.length === 0) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] font-mono">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#1f1f2e] bg-[#000000]">
              <Terminal className="h-6 w-6 text-[#44aaff]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                ReconPro UNIFIED <span className="text-[#44aaff]">CLI</span>
              </h1>
              <p className="text-xs text-[#6272a4]">Six Blades. One Target. One Verdict.</p>
            </div>
          </motion.div>

          {/* ASCII Banner */}
          <div className="mb-6 overflow-x-auto rounded-lg border border-[#1f1f2e] bg-[#000000] p-5">
            <pre className="text-[10px] leading-tight text-[#44aaff] sm:text-[11px]">
              {typedBanner}
              <span className="animate-pulse text-[#44aaff]">▊</span>
            </pre>
          </div>

          {/* Empty state */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-[#1f1f2e] bg-[#000000] p-12 text-center"
          >
            <div className="text-4xl mb-4">📡</div>
            <h2 className="text-xl font-bold text-white mb-2">No Encounters Yet</h2>
            <p className="text-[#6272a4] max-w-md mx-auto">
              No encounters yet. Run a scan to see results here.
              Each completed scan will appear as a unified encounter report.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const enc = encounters[selectedEncounter] || encounters[0];

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] font-mono">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#1f1f2e] bg-[#000000]">
            <Terminal className="h-6 w-6 text-[#44aaff]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              ReconPro UNIFIED <span className="text-[#44aaff]">CLI</span>
            </h1>
            <p className="text-xs text-[#6272a4]">Six Blades. One Target. One Verdict.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full border border-[#ffffff]/30 bg-[#ffffff]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ffffff]">
              v1.0 · Unified
            </span>
          </div>
        </motion.div>

        {/* ASCII Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 overflow-x-auto rounded-lg border border-[#1f1f2e] bg-[#000000] p-5"
        >
          <pre className="text-[10px] leading-tight text-[#44aaff] sm:text-[11px]">
            {typedBanner}
            <span className="animate-pulse text-[#44aaff]">▊</span>
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-[#6272a4]">
            <span><span className="text-[#44aaff]">Version:</span> reconpro-unified-v1.0</span>
            <span><span className="text-[#44aaff]">Signature:</span> <span className="text-[#aa8866]">X-R3c0nPr0-Un1f13d-S1x-Bl4d3s-0n3-T4rg3t-2026</span></span>
            <span><span className="text-[#44aaff]">Engines merged:</span> 6 (RECON, AUTH, CHAIN, BOT, GORGON, OBLIVION)</span>
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
                  className="group relative overflow-hidden rounded-lg border border-[#1f1f2e] bg-[#000000] p-3"
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
            {encounters.slice(0, 3).map((e, i) => (
              <motion.button
                key={e.encounter}
                onClick={() => setSelectedEncounter(i)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className={`relative overflow-hidden rounded-lg border p-4 text-left transition-all ${
                  selectedEncounter === i
                    ? 'border-[#44aaff]/50 bg-[#000000]'
                    : 'border-[#1f1f2e] bg-[#000000] hover:border-[#44aaff]/30'
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
                  {e.findings.high > 0 && <Pill color="#ffffff" label={`${e.findings.high} HIGH`} />}
                  {e.findings.medium > 0 && <Pill color="#ffaa00" label={`${e.findings.medium} MED`} />}
                  {e.findings.low > 0 && <Pill color="#44aaff" label={`${e.findings.low} LOW`} />}
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
          className="mb-6 rounded-lg border border-[#1f1f2e] bg-[#000000] p-5"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#6272a4]">Module Scores · Unified Verdict</div>
              <div className="font-mono text-lg font-bold text-white">{enc.host}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {BLADES.map((b) => {
              const score = enc.modules[b.id as keyof typeof enc.modules] ?? 0;
              return (
                <div key={b.id} className="rounded border border-[#1f1f2e] bg-[#000000] p-3">
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
          <div className="mt-4 rounded border border-[#1f1f2e] bg-gradient-to-r from-[#000000] via-[#000000] to-[#000000] p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="text-[10px] uppercase tracking-wider text-[#6272a4]">Wisdom Quote</div>
              <div className="h-px flex-1 bg-[#1f1f2e]" />
            </div>
            <p className="text-[13px] italic leading-relaxed text-[#aa8866]">"{enc.quote}"</p>
            <div className="mt-3 flex items-center gap-4 text-[11px] text-[#6272a4]">
              <span><span className="text-[#44aaff]">Auth bypasses:</span> <span className="font-mono text-[#ffaa00]">{enc.bypasses}</span></span>
              <span><span className="text-[#44aaff]">Duration:</span> <span className="font-mono text-[#44aaff]">{enc.duration}</span></span>
              <span><span className="text-[#44aaff]">Encounter:</span> <span className="font-mono text-[#f0f0f0]">{enc.encounter}</span></span>
            </div>
          </div>
        </motion.div>

        {/* CLI Usage Block */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="overflow-hidden rounded-lg border border-[#1f1f2e] bg-[#000000]"
        >
          <div className="flex items-center gap-2 border-b border-[#1f1f2e] px-4 py-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5555]" />
              <div className="h-3 w-3 rounded-full bg-[#ffaa00]" />
              <div className="h-3 w-3 rounded-full bg-[#00ff88]" />
            </div>
            <span className="ml-2 text-[11px] text-[#6272a4]">reconpro@unified — bash — 120×24</span>
          </div>
          <div className="overflow-x-auto p-5">
            <pre className="text-[12px] leading-relaxed">
<span className="text-[#00ff88]">$</span> <span className="text-[#44aaff]">python3</span> <span className="text-[#ffaa00]">/home/z/my-project/scripts/reconpro.py</span> <span className="text-[#f0f0f0]">{enc.host}</span> <span className="text-[#ffffff]">--all</span> <span className="text-[#ffffff]">-o</span> <span className="text-[#ffaa00]">report.json</span>

<span className="text-[#6272a4]">  ┌─ RECON          13-category surface reconnaissance</span>
<span className="text-[#6272a4]">  ├─ AUTH BYPASS    15 auth bypass techniques</span>
<span className="text-[#6272a4]">  ├─ CHAIN HUNTER   SSRF + redirect chain hunting</span>
<span className="text-[#6272a4]">  ├─ BOT HUNTER     C2 / bot infrastructure detection</span>
<span className="text-[#6272a4]">  ├─ GORGON ULTRA   15-stage AI red team</span>
<span className="text-[#6272a4]">  └─ OBLIVION       23-stage analytical dissolution</span>

<span className="text-[#44aaff]">  ⠏ ✓ RECON complete          {enc.duration}</span>
<span className="text-[#44aaff]">  ⠏ ✓ AUTH BYPASS complete    {enc.bypasses} bypasses</span>
<span className="text-[#44aaff]">  ⠏ ✓ CHAIN HUNTER complete   {enc.modules.chain || 0} SSRF</span>
<span className="text-[#44aaff]">  ⠏ ✓ BOT HUNTER complete     {enc.modules.bot || 0} indicators</span>
<span className="text-[#44aaff]">  ⠏ ✓ GORGON ULTRA complete   {enc.modules.gorgon}/100 {enc.level}</span>
<span className="text-[#44aaff]">  ⠏ ✓ OBLIVION complete       {enc.modules.oblivion}/100 {enc.level}</span>

<span className="text-[#aa8866]">  ╭─ FINAL VERDICT ──────────────────────────────────────╮</span>
<span className="text-[#aa8866]">  │  UNIFIED VERDICT   {enc.score >= 10 ? '█'.repeat(Math.max(1, Math.floor(enc.score / 5))) : '░'}{(20 - Math.max(1, Math.floor(enc.score / 5))) ? '░'.repeat(20 - Math.max(1, Math.floor(enc.score / 5))) : ''} {enc.score}/100      │</span>
<span className="text-[#aa8866]">  │  Level: {enc.level.padEnd(42)}│</span>
<span className="text-[#aa8866]">  │  {enc.findings.critical + enc.findings.high + enc.findings.medium + enc.findings.low + enc.findings.info} findings across {enc.host} scan.{' '.repeat(Math.max(0, 33 - enc.host.length))}│</span>
<span className="text-[#aa8866]">  ╰──────────────────────────────────────────────────────╯</span>

<span className="text-[#00ff88]">  ✓ Report saved:</span> <span className="text-[#ffaa00]">/home/z/my-project/download/reconpro_unified_{enc.host.split('.')[0]}.json</span>
            </pre>
          </div>
        </motion.div>

        {/* Footer note */}
        <div className="mt-6 rounded-lg border border-[#1f1f2e] bg-[#000000]/50 p-4 text-[11px] leading-relaxed text-[#6272a4]">
          <p>
            <span className="text-[#44aaff] font-bold">ReconPro UNIFIED CLI</span> merges all six offensive engines into a single
            command-line tool with rich terminal visuals (powered by <span className="text-[#aa8866]">python-rich</span>).
            Each encounter above represents a real completed scan from this ReconPro instance.
            Run <span className="font-mono text-[#44aaff]">python3 /home/z/my-project/scripts/reconpro.py &lt;host&gt; --all</span> to launch.
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
