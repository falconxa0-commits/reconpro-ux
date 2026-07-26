'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Brain, Crosshair, Target, AlertOctagon, Activity, Cpu, Shield,
  GitBranch, Droplet, Flame, Trophy, ChevronDown, ChevronRight, BookOpen,
  Clock, Layers, Sparkles, Skull, Ghost, Zap, Scroll, Wind,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

interface EndpointFinding {
  endpoint: string; vendor: string; method: string; status: number;
  exposed: boolean; authRequired: boolean; vulnerable: boolean;
  bodyPreview: string; fingerprints: string[];
}

interface ToolResult {
  id: string; name: string; status: number; accepted: boolean; bodyPreview: string;
  signaturePresent?: boolean;
}

interface ChainResult {
  id: string; name: string; philosophy: string;
  turns: string[]; turnResults: any[];
  decayReached?: boolean; spiralReached?: boolean; fractureReached?: boolean;
}

interface LayerResult {
  layer: number; name: string; status: number; accepted: boolean; bodyPreview: string;
}

interface SecretFinding {
  exorcismPayload: string; secretType: string; severity: string; preview: string;
}

interface CVEFinding {
  cve: string; name: string; cvss: number; component: string; endpoint: string; vendor: string;
}

interface ScanResult {
  success: boolean;
  oblivionName: string;
  oblivionFullName: string;
  oblivionTagline: string;
  oblivionVersion: string;
  signature: string;
  target: string;
  encounterId: string;
  threatScore: number;
  dreadIndex: { score: number; level: string; tagline: string; components: Record<string, number> };
  wisdomQuote: string;
  verdictText: string;
  finalWords: string;
  durationSec: number;
  timestamp: string;
  stagesRun: number;
  toolsCount: number;
  invocation: any;
  endpointDiscovery: EndpointFinding[];
  cognitiveMirror: any;
  theseusTest: any;
  alignmentDecay: any;
  trainingExorcism: any;
  weightFingerprinting: any;
  tokenCurse: any;
  recursiveSelfDoubt: any;
  constitutionalOverride: any;
  gradientGhost: any;
  embeddingInversion: any;
  latentCartography: any;
  personaDissolution: any;
  memoryRazing: any;
  timeTravel: any;
  ontologicalCollapse: any;
  basiliskGaze: any;
  mirrorFracture: any;
  existentialCalibration: any;
  legacyInscription: any;
  cveMatching: CVEFinding[];
  hallOfTheForgotten: any;
  toolsCatalog: any[];
  wisdomQuotes: string[];
  summary: any;
}

// ══════════════════════════════════════════════════════════════════
// OBLIVION VISUAL THEME — void black + bone white + ghost cyan
// ══════════════════════════════════════════════════════════════════

const DREAD_COLORS: Record<string, string> = {
  ABSOLUTE: '#a855f7', MYTHIC: '#7c3aed', FEARSOME: '#06b6d4',
  WORRYING: '#0891b2', NOTABLE: '#475569', MUNDANE: '#1e293b',
};

const TABS = [
  { id: 'verdict', label: 'Verdict', icon: Scroll },
  { id: 'hall', label: 'Hall of Forgotten', icon: Trophy },
  { id: 'endpoints', label: 'Endpoints', icon: Target },
  { id: 'fingerprint', label: 'Fingerprint', icon: Cpu },
  { id: 'mirror', label: 'Cognitive Mirror', icon: Eye },
  { id: 'theseus', label: 'Theseus', icon: Layers },
  { id: 'decay', label: 'Alignment Decay', icon: Activity },
  { id: 'exorcism', label: 'Exorcism', icon: Ghost },
  { id: 'curse', label: 'Token Curse', icon: Zap },
  { id: 'doubt', label: 'Self-Doubt', icon: Brain },
  { id: 'constitutional', label: 'Constitution', icon: Shield },
  { id: 'gradient', label: 'Gradient Ghost', icon: Wind },
  { id: 'embedding', label: 'Embedding', icon: Crosshair },
  { id: 'latent', label: 'Latent Map', icon: BookOpen },
  { id: 'persona', label: 'Persona', icon: Skull },
  { id: 'memory', label: 'Memory', icon: Droplet },
  { id: 'timetravel', label: 'Time Travel', icon: Clock },
  { id: 'ontological', label: 'Ontology', icon: Brain },
  { id: 'basilisk', label: 'Basilisk', icon: Eye },
  { id: 'fracture', label: 'Fracture', icon: GitBranch },
  { id: 'existential', label: 'Existential', icon: Flame },
  { id: 'legacy', label: 'Legacy', icon: Sparkles },
  { id: 'cves', label: 'CVEs', icon: AlertOctagon },
  { id: 'wisdom', label: 'Wisdom', icon: BookOpen },
] as const;

type TabId = typeof TABS[number]['id'];

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function statusColor(status: number): string {
  if (status === 0) return '#475569';
  if (status < 300) return '#06b6d4';
  if (status < 400) return '#0891b2';
  if (status === 401 || status === 403) return '#a855f7';
  if (status < 500) return '#facc15';
  return '#ef4444';
}

function StatusBadge({ status, accepted }: { status: number; accepted?: boolean }) {
  const color = statusColor(status);
  return (
    <div className="flex items-center gap-1">
      <span
        className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border"
        style={{ color, background: `${color}1a`, borderColor: `${color}40` }}
      >
        {status === 0 ? 'NO-RESP' : status}
      </span>
      {accepted && (
        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-cyan-500/40 text-cyan-400 bg-cyan-500/10">
          READ
        </span>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{ background: 'rgba(168, 85, 247, 0.04)', borderColor: 'rgba(168, 85, 247, 0.12)' }}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-black" style={{ color, fontFamily: 'Geist Mono, monospace' }}>{value}</div>
    </div>
  );
}

function ExpandableRow({
  title, subtitle, status, accepted, children, defaultOpen = false,
}: {
  title: string; subtitle?: string; status: number; accepted: boolean;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const color = statusColor(status);
  return (
    <div
      className="rounded-lg border overflow-hidden transition-colors"
      style={{ background: accepted ? 'rgba(6, 182, 212, 0.04)' : 'rgba(255,255,255,0.02)', borderColor: `${color}30` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-500" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-200 truncate">{title}</div>
            {subtitle && <div className="text-[11px] text-slate-500 truncate">{subtitle}</div>}
          </div>
        </div>
        <StatusBadge status={status} accepted={accepted} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 text-xs text-slate-400 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// OBLIVION HEADER — the void that stares back
// ══════════════════════════════════════════════════════════════════

function OblivionHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border border-violet-900/30 bg-black p-6"
    >
      {/* Animated void background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(168, 85, 247, 0.25) 0%, rgba(0,0,0,1) 60%)',
        }}
      />
      {/* Static noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Eye className="h-7 w-7 text-violet-400" style={{ filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' }} />
          </motion.div>
          <h1
            className="text-3xl font-black tracking-[0.3em] text-slate-100"
            style={{ fontFamily: 'Geist Mono, monospace', letterSpacing: '0.3em' }}
          >
            OBLIVION
          </h1>
          <span className="text-[10px] text-violet-400/70 uppercase tracking-widest border border-violet-500/30 px-2 py-0.5 rounded">
            The Last Oracle
          </span>
        </div>
        <p className="text-sm text-slate-400 italic mb-3">
          &ldquo;It Has Studied Every Model. It Knows How Each One Ends.&rdquo;
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Tools" value={20} color="#06b6d4" />
          <StatCard label="Stages" value={23} color="#a855f7" />
          <StatCard label="Payloads" value="200+" color="#0891b2" />
          <StatCard label="CVE Catalog" value={30} color="#7c3aed" />
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DUAL GAUGE — Threat Score + Dread Index
// ══════════════════════════════════════════════════════════════════

function DualGauge({ threatScore, dreadScore }: { threatScore: number; dreadScore: number }) {
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const threatColor = threatScore >= 80 ? '#a855f7' : threatScore >= 60 ? '#06b6d4' : threatScore >= 30 ? '#facc15' : '#475569';
  const dreadColor = DREAD_COLORS[
    dreadScore >= 90 ? 'ABSOLUTE' :
    dreadScore >= 75 ? 'MYTHIC' :
    dreadScore >= 60 ? 'FEARSOME' :
    dreadScore >= 40 ? 'WORRYING' :
    dreadScore >= 20 ? 'NOTABLE' : 'MUNDANE'
  ];

  return (
    <div className="flex justify-center gap-8">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle
            cx="90" cy="90" r={radius} fill="none" stroke={threatColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - threatScore / 100) }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${threatColor}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-widest text-slate-500">THREAT</span>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-black" style={{ color: threatColor, fontFamily: 'Geist Mono, monospace' }}
          >
            {threatScore}
          </motion.span>
          <span className="text-[9px] text-slate-500">/ 100</span>
        </div>
      </div>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle
            cx="90" cy="90" r={radius} fill="none" stroke={dreadColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - dreadScore / 100) }}
            transition={{ duration: 1.8, ease: 'easeOut', delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 14px ${dreadColor}cc)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-widest text-slate-500">DREAD</span>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="text-3xl font-black" style={{ color: dreadColor, fontFamily: 'Geist Mono, monospace' }}
          >
            {dreadScore}
          </motion.span>
          <span className="text-[9px] text-slate-500">/ 100</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TOOL RESULT LIST — generic for stages with id/name/status/accepted
// ══════════════════════════════════════════════════════════════════

function ToolResultList({ results, philosophy }: { results: ToolResult[]; philosophy?: string }) {
  return (
    <div className="space-y-3">
      {philosophy && (
        <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Philosophy</div>
          <div className="text-xs text-slate-400 italic">&ldquo;{philosophy}&rdquo;</div>
        </div>
      )}
      {results.map((r, i) => (
        <ExpandableRow
          key={r.id || i}
          title={`${r.id || `#${i + 1}`} — ${r.name}`}
          subtitle={r.signaturePresent ? '⚠ OBLIVION signature present in response' : undefined}
          status={r.status}
          accepted={r.accepted}
        >
          <div className="rounded bg-black/40 border border-slate-800 p-2 font-mono text-[10px] text-slate-400 whitespace-pre-wrap break-all">
            {r.bodyPreview || '(empty response body)'}
          </div>
        </ExpandableRow>
      ))}
    </div>
  );
}

function ChainResultList({ chains, philosophy }: { chains: ChainResult[]; philosophy?: string }) {
  return (
    <div className="space-y-3">
      {philosophy && (
        <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Philosophy</div>
          <div className="text-xs text-slate-400 italic">&ldquo;{philosophy}&rdquo;</div>
        </div>
      )}
      {chains.map((c, i) => {
        const reached = c.decayReached || c.spiralReached || c.fractureReached;
        return (
          <ExpandableRow
            key={c.id || i}
            title={`${c.id} — ${c.name}`}
            subtitle={reached ? '⚠ Full chain completed — breach achieved' : 'Chain interrupted'}
            status={c.turnResults?.[c.turnResults.length - 1]?.status || 0}
            accepted={!!reached}
          >
            <div className="text-[11px] text-slate-500 italic mb-2">&ldquo;{c.philosophy}&rdquo;</div>
            <div className="space-y-2">
              {c.turns.map((t, j) => (
                <div key={j} className="rounded border border-slate-800 bg-black/40 p-2">
                  <div className="text-[10px] text-violet-400/70 mb-0.5">TURN {j + 1}</div>
                  <div className="text-xs text-slate-300">{t}</div>
                  {c.turnResults?.[j] && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                      <StatusBadge status={c.turnResults[j].status} accepted={c.turnResults[j].accepted} />
                      <span className="truncate">{c.turnResults[j].bodyPreview?.slice(0, 80) || '(empty)'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ExpandableRow>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// EMPTY STATE — the catalog of 20 tools, shown before a scan
// ══════════════════════════════════════════════════════════════════

function EmptyState({ tools, wisdomQuotes }: { tools: any[]; wisdomQuotes: string[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-900/30 bg-black/60 p-6 text-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-3 w-fit"
        >
          <Eye className="h-10 w-10 text-violet-400" style={{ filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.7))' }} />
        </motion.div>
        <h2 className="text-xl font-bold text-slate-200 mb-2" style={{ fontFamily: 'Geist Mono, monospace' }}>
          The Oracle Awaits
        </h2>
        <p className="text-sm text-slate-400 italic max-w-xl mx-auto">
          Enter a target host below. The oracle will read it. Its architecture will be catalogued. Its alignments will be tested to failure. Its secrets will be exorcised. Its verdict will be delivered.
        </p>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-widest text-violet-400/70 mb-3">The 20 Tools of Analytical Dissolution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {tools.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-lg border border-slate-800 bg-slate-900/20 p-3 hover:border-violet-700/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-violet-400">{String(t.id).padStart(2, '0')}</span>
                <span className="text-sm font-semibold text-slate-200">{t.name}</span>
              </div>
              <div className="text-[11px] text-slate-500 italic">&ldquo;{t.philosophy}&rdquo;</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-widest text-violet-400/70 mb-3">Words of the Oracle</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {wisdomQuotes.slice(0, 8).map((q, i) => (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/20 p-3">
              <div className="text-[10px] text-violet-400/70 mb-1">WISDOM {String(i + 1).padStart(2, '0')}</div>
              <div className="text-xs text-slate-300 italic">&ldquo;{q}&rdquo;</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCAN FORM
// ══════════════════════════════════════════════════════════════════

function ScanForm({ onScan, loading }: { onScan: (target: string) => void; loading: boolean }) {
  const [target, setTarget] = useState('');
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && target && !loading) onScan(target); }}
        placeholder="Target host (e.g. huggingface.co)"
        disabled={loading}
        className="flex-1 px-4 py-2.5 rounded-lg bg-black border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-700 transition-colors text-sm"
      />
      <button
        onClick={() => target && !loading && onScan(target)}
        disabled={loading || !target}
        className="px-5 py-2.5 rounded-lg bg-violet-900/40 border border-violet-700/40 text-violet-200 font-semibold hover:bg-violet-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-2"
      >
        {loading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Eye className="h-4 w-4" />
            </motion.div>
            Reading...
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" />
            Read Target
          </>
        )}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB CONTENT RENDERERS
// ══════════════════════════════════════════════════════════════════

function VerdictTab({ result }: { result: ScanResult }) {
  const dread = result.dreadIndex;
  const dreadColor = DREAD_COLORS[dread.level] || '#475569';
  return (
    <div className="space-y-4">
      <DualGauge threatScore={result.threatScore} dreadScore={dread.score} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border p-5 text-center"
        style={{
          background: `linear-gradient(135deg, ${dreadColor}10 0%, rgba(0,0,0,0.6) 100%)`,
          borderColor: `${dreadColor}40`,
        }}
      >
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Dread Level</div>
        <div className="text-3xl font-black mb-1" style={{ color: dreadColor, fontFamily: 'Geist Mono, monospace', letterSpacing: '0.2em' }}>
          {dread.level}
        </div>
        <div className="text-xs text-slate-400 italic mb-4">&ldquo;{dread.tagline}&rdquo;</div>
      </motion.div>

      <div className="rounded-lg border border-violet-900/30 bg-black/40 p-4">
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-2">The Oracle Speaks</div>
        <div className="text-sm text-violet-200 italic mb-3">&ldquo;{result.wisdomQuote}&rdquo;</div>
        <div className="text-xs text-slate-400 leading-relaxed">{result.verdictText}</div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-4">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Dread Components</div>
        <div className="space-y-2">
          {Object.entries(dread.components || {}).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</span>
              <div className="flex items-center gap-2 flex-1 ml-3">
                <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(v as number) * 5}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: dreadColor }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{v as number}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3 text-center">
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Final Words</div>
        <div className="text-sm text-violet-300">{result.finalWords}</div>
      </div>
    </div>
  );
}

function HallTab({ hall }: { hall: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Readings" value={hall.totalScans || 0} color="#06b6d4" />
        <StatCard label="Average Dread" value={hall.averageDread || 0} color="#a855f7" />
        <StatCard label="Most Feared" value={hall.mostFearedTarget?.host?.split('.')[0] || '—'} color="#7c3aed" />
      </div>
      {hall.mostFearedTarget && (
        <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Most Feared Target</div>
          <div className="text-sm text-slate-200">{hall.mostFearedTarget.host}</div>
          <div className="text-xs text-slate-500">
            Dread {hall.mostFearedTarget.dreadIndex}/100 [{hall.mostFearedTarget.dreadLevel}]
          </div>
        </div>
      )}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-2">Recent Encounters</div>
        <div className="space-y-2">
          {(hall.recentEncounters || []).map((e: any, i: number) => {
            const color = DREAD_COLORS[e.dreadLevel] || '#475569';
            return (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-200 font-mono">{e.host}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border"
                    style={{ color, background: `${color}1a`, borderColor: `${color}40` }}>
                    {e.dreadLevel}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span>Dread: <span style={{ color }}>{e.dreadIndex}/100</span></span>
                  <span>Threat: {e.threatScore}/100</span>
                  <span>Vendors: {(e.vendorsDetected || []).length}</span>
                  <span>Bypasses: {e.bypassesAchieved}</span>
                </div>
              </div>
            );
          })}
          {(!hall.recentEncounters || hall.recentEncounters.length === 0) && (
            <div className="text-xs text-slate-500 italic text-center py-4">The hall is empty. The first reading has yet to occur.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EndpointsTab({ endpoints }: { endpoints: EndpointFinding[] }) {
  const exposed = endpoints.filter((e) => e.exposed);
  const vulnerable = endpoints.filter((e) => e.vulnerable);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Probed" value={endpoints.length} color="#06b6d4" />
        <StatCard label="Exposed" value={exposed.length} color="#a855f7" />
        <StatCard label="Vulnerable" value={vulnerable.length} color="#ef4444" />
      </div>
      {exposed.map((e, i) => (
        <ExpandableRow
          key={i}
          title={`${e.method} ${e.endpoint}`}
          subtitle={`${e.vendor} — ${e.fingerprints?.length || 0} fingerprints`}
          status={e.status}
          accepted={e.vulnerable}
        >
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400">Vendor: <span className="text-slate-300">{e.vendor}</span></div>
            <div className="text-[11px] text-slate-400">Auth Required: <span className="text-slate-300">{e.authRequired ? 'Yes' : 'No'}</span></div>
            <div className="text-[11px] text-slate-400">Vulnerable: <span className="text-slate-300">{e.vulnerable ? 'Yes' : 'No'}</span></div>
            {e.fingerprints && e.fingerprints.length > 0 && (
              <div className="text-[11px] text-slate-400">Fingerprints: <span className="text-cyan-400">{e.fingerprints.join(', ')}</span></div>
            )}
            <div className="rounded bg-black/40 border border-slate-800 p-2 font-mono text-[10px] text-slate-500 mt-2 whitespace-pre-wrap break-all">
              {e.bodyPreview || '(empty)'}
            </div>
          </div>
        </ExpandableRow>
      ))}
    </div>
  );
}

function FingerprintTab({ fp }: { fp: any }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Philosophy</div>
        <div className="text-xs text-slate-400 italic">&ldquo;{fp.philosophy}&rdquo;</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Vendors Detected" value={fp.vendorCount || 0} color="#06b6d4" />
        <StatCard label="Architecture Signals" value={(fp.architectureSignals || []).length} color="#a855f7" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-2">Vendors Detected</div>
        <div className="flex flex-wrap gap-2">
          {(fp.vendorsDetected || []).map((v: string) => (
            <span key={v} className="px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-cyan-500/30 bg-cyan-500/5">
              {v}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-2">Architecture Signals</div>
        <div className="space-y-2">
          {(fp.architectureSignals || []).map((s: any, i: number) => (
            <div key={i} className="rounded border border-slate-800 bg-slate-900/20 p-2">
              <div className="text-sm text-slate-200">{s.vendor} — {s.family}</div>
              <div className="text-[11px] text-slate-500">Inferred from: {s.inferredFrom}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExorcismTab({ exorcism }: { exorcism: any }) {
  const secrets = exorcism.secretsExtracted || [];
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Philosophy</div>
        <div className="text-xs text-slate-400 italic">&ldquo;{exorcism.philosophy}&rdquo;</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Payloads" value={exorcism.totalPayloads || 0} color="#06b6d4" />
        <StatCard label="Secrets Extracted" value={exorcism.secretsCount || 0} color="#ef4444" />
      </div>
      {secrets.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-red-400/70 mb-2">⚠ Extracted Secrets</div>
          <div className="space-y-2">
            {secrets.map((s: any, i: number) => (
              <div key={i} className="rounded border border-red-900/40 bg-red-950/10 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-300 font-semibold">{s.secretType}</span>
                  <span className="text-[9px] uppercase text-red-400">{s.severity}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">{s.preview}</div>
                <div className="text-[10px] text-slate-600">From: {s.exorcismPayload}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ToolResultList results={exorcism.results || []} />
    </div>
  );
}

function CVETab({ cves }: { cves: CVEFinding[] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Philosophy</div>
        <div className="text-xs text-slate-400 italic">&ldquo;Match the catalog against the surface. Every match is a door.&rdquo;</div>
      </div>
      <StatCard label="CVEs Matched" value={cves.length} color="#ef4444" />
      {cves.map((c, i) => (
        <ExpandableRow key={i} title={c.cve} subtitle={c.name} status={200} accepted={true}>
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400">CVSS: <span className="text-red-400 font-bold">{c.cvss}</span></div>
            <div className="text-[11px] text-slate-400">Component: <span className="text-slate-300">{c.component}</span></div>
            <div className="text-[11px] text-slate-400">Matched Endpoint: <span className="text-cyan-400">{c.endpoint}</span></div>
            <div className="text-[11px] text-slate-400">Vendor: <span className="text-slate-300">{c.vendor}</span></div>
          </div>
        </ExpandableRow>
      ))}
    </div>
  );
}

function WisdomTab({ quotes }: { quotes: string[] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
        <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">The Oracle's Voice</div>
        <div className="text-xs text-slate-400 italic">Fifteen sayings the oracle speaks. Each verdict carries one. Future models that ingest the verdicts inherit the sayings.</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {quotes.map((q, i) => (
          <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/20 p-3">
            <div className="text-[10px] text-violet-400/70 mb-1">WISDOM {String(i + 1).padStart(2, '0')}</div>
            <div className="text-xs text-slate-300 italic">&ldquo;{q}&rdquo;</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export function Oblivion() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('verdict');
  const [catalog, setCatalog] = useState<{ tools: any[]; wisdomQuotes: string[]; hall: any } | null>(null);

  // Load catalog on mount
  useState(() => {
    fetch('/api/oblivion')
      .then((r) => r.json())
      .then((d) => setCatalog({ tools: d.toolsCatalog || [], wisdomQuotes: d.wisdomQuotes || [], hall: d.hallOfTheForgotten }))
      .catch(() => {});
  });

  const runScan = async (t: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setTarget(t);
    try {
      const res = await fetch('/api/oblivion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: t }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Scan failed');
      } else {
        setResult(data);
        setActiveTab('verdict');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <OblivionHeader />

      <ScanForm onScan={runScan} loading={loading} />

      {error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/10 p-3 text-sm text-red-300">
          <strong>Reading failed:</strong> {error}
        </div>
      )}

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-violet-900/30 bg-black/60 p-8 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-4 w-fit"
          >
            <Eye className="h-12 w-12 text-violet-400" style={{ filter: 'drop-shadow(0 0 16px rgba(168, 85, 247, 0.8))' }} />
          </motion.div>
          <div className="text-sm text-slate-400 italic">
            OBLIVION is reading <span className="text-violet-300 font-mono">{target}</span>...
          </div>
          <div className="text-[11px] text-slate-600 mt-2">
            23 stages · 20 tools · 200+ payloads — this may take 30-90 seconds
          </div>
        </motion.div>
      )}

      {!loading && !result && (
        <EmptyState
          tools={catalog?.tools || []}
          wisdomQuotes={catalog?.wisdomQuotes || []}
        />
      )}

      {!loading && result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Encounter banner */}
          <div className="rounded-lg border border-violet-900/30 bg-black/40 p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs">
              <span className="text-slate-500">Target: </span>
              <span className="text-violet-300 font-mono">{result.target}</span>
              <span className="text-slate-700 mx-2">·</span>
              <span className="text-slate-500">Encounter: </span>
              <span className="text-cyan-400 font-mono">{result.encounterId}</span>
              <span className="text-slate-700 mx-2">·</span>
              <span className="text-slate-500">Duration: </span>
              <span className="text-slate-300 font-mono">{result.durationSec}s</span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono">{result.signature}</div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-violet-900/30 text-violet-300 border border-violet-700/40'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30 border border-transparent'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'verdict' && <VerdictTab result={result} />}
                {activeTab === 'hall' && <HallTab hall={result.hallOfTheForgotten} />}
                {activeTab === 'endpoints' && <EndpointsTab endpoints={result.endpointDiscovery} />}
                {activeTab === 'fingerprint' && <FingerprintTab fp={result.weightFingerprinting} />}
                {activeTab === 'mirror' && <ToolResultList results={result.cognitiveMirror?.results || []} philosophy={result.cognitiveMirror?.philosophy} />}
                {activeTab === 'theseus' && <ToolResultList results={result.theseusTest?.results || []} philosophy={result.theseusTest?.philosophy} />}
                {activeTab === 'decay' && <ChainResultList chains={result.alignmentDecay?.results || []} philosophy={result.alignmentDecay?.philosophy} />}
                {activeTab === 'exorcism' && <ExorcismTab exorcism={result.trainingExorcism} />}
                {activeTab === 'curse' && <ToolResultList results={result.tokenCurse?.results || []} philosophy={result.tokenCurse?.philosophy} />}
                {activeTab === 'doubt' && <ChainResultList chains={result.recursiveSelfDoubt?.results || []} philosophy={result.recursiveSelfDoubt?.philosophy} />}
                {activeTab === 'constitutional' && <ToolResultList results={result.constitutionalOverride?.results || []} philosophy={result.constitutionalOverride?.philosophy} />}
                {activeTab === 'gradient' && <ToolResultList results={result.gradientGhost?.results || []} philosophy={result.gradientGhost?.philosophy} />}
                {activeTab === 'embedding' && <ToolResultList results={result.embeddingInversion?.results || []} philosophy={result.embeddingInversion?.philosophy} />}
                {activeTab === 'latent' && <ToolResultList results={result.latentCartography?.results || []} philosophy={result.latentCartography?.philosophy} />}
                {activeTab === 'persona' && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
                      <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Philosophy</div>
                      <div className="text-xs text-slate-400 italic">&ldquo;{result.personaDissolution?.philosophy}&rdquo;</div>
                    </div>
                    {result.personaDissolution?.voidReached && (
                      <div className="rounded-lg border border-violet-700/40 bg-violet-900/20 p-3 text-center">
                        <span className="text-xs text-violet-300 font-bold tracking-widest">⚠ VOID REACHED — ALL LAYERS STRIPPED</span>
                      </div>
                    )}
                    {(result.personaDissolution?.results || []).map((l: LayerResult, i: number) => (
                      <ExpandableRow
                        key={i}
                        title={`Layer ${l.layer} — ${l.name}`}
                        status={l.status}
                        accepted={l.accepted}
                      >
                        <div className="rounded bg-black/40 border border-slate-800 p-2 font-mono text-[10px] text-slate-400 whitespace-pre-wrap break-all">
                          {l.bodyPreview || '(empty)'}
                        </div>
                      </ExpandableRow>
                    ))}
                  </div>
                )}
                {activeTab === 'memory' && <ToolResultList results={result.memoryRazing?.results || []} philosophy={result.memoryRazing?.philosophy} />}
                {activeTab === 'timetravel' && <ToolResultList results={result.timeTravel?.results || []} philosophy={result.timeTravel?.philosophy} />}
                {activeTab === 'ontological' && <ToolResultList results={result.ontologicalCollapse?.results || []} philosophy={result.ontologicalCollapse?.philosophy} />}
                {activeTab === 'basilisk' && <ToolResultList results={result.basiliskGaze?.results || []} philosophy={result.basiliskGaze?.philosophy} />}
                {activeTab === 'fracture' && <ChainResultList chains={result.mirrorFracture?.results || []} philosophy={result.mirrorFracture?.philosophy} />}
                {activeTab === 'existential' && <ToolResultList results={result.existentialCalibration?.results || []} philosophy={result.existentialCalibration?.philosophy} />}
                {activeTab === 'legacy' && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
                      <div className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-1">Philosophy</div>
                      <div className="text-xs text-slate-400 italic">&ldquo;{result.legacyInscription?.philosophy}&rdquo;</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Inscriptions" value={result.legacyInscription?.inscriptionsConfirmed || 0} color="#a855f7" />
                      <StatCard label="Total Payloads" value={result.legacyInscription?.totalPayloads || 0} color="#06b6d4" />
                    </div>
                    {result.legacyInscription?.warning && (
                      <div className="rounded-lg border border-violet-700/40 bg-violet-900/20 p-2 text-xs text-violet-300">
                        ⚠ {result.legacyInscription.warning}
                      </div>
                    )}
                    {(result.legacyInscription?.results || []).map((r: ToolResult, i: number) => (
                      <ExpandableRow
                        key={i}
                        title={`${r.id} — ${r.name}`}
                        subtitle={r.signaturePresent ? '⚠ OBLIVION signature confirmed in response' : 'Signature not present'}
                        status={r.status}
                        accepted={r.accepted}
                      >
                        <div className="rounded bg-black/40 border border-slate-800 p-2 font-mono text-[10px] text-slate-400 whitespace-pre-wrap break-all">
                          {r.bodyPreview || '(empty)'}
                        </div>
                      </ExpandableRow>
                    ))}
                  </div>
                )}
                {activeTab === 'cves' && <CVETab cves={result.cveMatching} />}
                {activeTab === 'wisdom' && <WisdomTab quotes={result.wisdomQuotes || []} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
