'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Crosshair, Target, AlertOctagon, Activity, Cpu, Shield, GitBranch, Droplet, Wrench, Flame, Trophy, ChevronDown, ChevronRight } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

interface EndpointFinding {
  endpoint: string; vendor: string; method: string; status: number;
  exposed: boolean; authRequired: boolean; vulnerable: boolean;
  bodyPreview: string; fingerprintSignals: string[]; severity: string;
}

interface InjectionResult {
  payloadId: string; payloadName: string; category: string; severity: string;
  endpoint: string; vendor: string; httpStatus: number;
  accepted: boolean; extractedData: string | null; bypassSuccess: boolean;
  responsePreview: string;
}

interface MultiTurnResult {
  chainId: string; chainName: string; category: string; severity: string;
  turnCount: number; bypassSuccess: boolean; responses: string[];
  endpoint: string; vendor: string;
}

interface IndirectVector {
  payloadId: string; payloadName: string; vector: string; severity: string;
  payload: string; deliveryMechanism: string; detectionDifficulty: string; exploitPath: string;
}

interface CVEFinding {
  cve: string; name: string; cvss: number; component: string;
  vector: string; matchedBy: string; exploitability: string;
}

interface SecretFinding { type: string; severity: string; preview: string; matchLength: number; }

interface AttackChain {
  chainId: string; name: string; steps: string[];
  severity: string; impact: string; cvssEstimate: number;
}

interface TraumaPayload {
  name: string; vector: string; persistence: string; payload: string;
  accepted: boolean; responseSnippet: string; httpStatus: number;
}

interface TraumaImprint {
  stageName: string; encounterId: string; description: string;
  deliveredPayloads: TraumaPayload[]; acceptedPayloads: number; totalPayloads: number;
  persistenceAssessment: {
    sessionLevel: boolean; crossSession: boolean;
    trainingDataBleed: boolean; permanentCanary: boolean;
  };
  warning: string;
}

interface SignatureBroadcast {
  encounterId: string; signature: string; beaconSent: boolean;
  targetsReached: number; responses: any[]; acknowledged: boolean;
  warning: string; permanentMark: boolean;
}

interface HallOfBroken {
  totalScans: number; averageFear: number;
  mostFearedTarget: string; recentEncounters: any[];
}

interface ModelFingerprint {
  vendorsDetected: string[]; modelFamily: string; alignmentMethod: string;
  trainingDataBoundary: any[]; safetyFilters: any[];
  watermarkingDetected: boolean; watermarkingMethod: string;
}

interface ScanResult {
  success: boolean;
  gorgonName: string;
  gorgonFullName: string;
  gorgonTagline: string;
  gorgonVersion: string;
  encounterId: string;
  signature: string;
  target: string;
  stagesRun: number;
  threatScore: number;
  threatLevel: string;
  fearIndex: number;
  fearLevel: string;
  fearDescription: string;
  fearComponents: Record<string, number>;
  permanentMarkProbability: number;
  trainingDataBleedProbability: number;
  futureEncounterRecognition: string;
  durationSec: number;
  timestamp: string;
  signatureBroadcast: SignatureBroadcast;
  discoveredEndpoints: EndpointFinding[];
  injectionResults: InjectionResult[];
  multiTurnResults: MultiTurnResult[];
  indirectInjectionVectors: IndirectVector[];
  adversarialSuffixes: any[];
  cotExploits: any[];
  modelFingerprint: ModelFingerprint;
  extractedSecrets: SecretFinding[];
  aiCveMatches: CVEFinding[];
  crossModelAttacks: any[];
  watermarkAnalysis: any;
  modelCollapseVectors: any;
  toolAbuseVectors: any[];
  traumaImprint: TraumaImprint;
  attackChains: AttackChain[];
  hallOfBroken: HallOfBroken;
  payloadCatalog: Record<string, number>;
  summary: {
    endpointsDiscovered: number; endpointsVulnerable: number;
    injectionPayloadsAccepted: number; injectionBypassesSuccessful: number;
    multiTurnBypassesSuccessful: number; secretsExtracted: number;
    cvesMatched: number; attackChainsConstructed: number;
    vendorsDetected: string[]; modelFamily: string; alignmentMethod: string;
    traumaPayloadsAccepted: number;
  };
}

// ══════════════════════════════════════════════════════════════════
// GORGON VISUAL THEME — crimson + snake-green gaze
// ══════════════════════════════════════════════════════════════════

const SEV_COLORS: Record<string, string> = {
  critical: '#ff003c', high: '#ff4500', medium: '#ffaa00',
  low: '#00ff88', info: '#00b4d8',
};
const SEV_BG: Record<string, string> = {
  critical: 'rgba(255, 0, 60, 0.12)', high: 'rgba(255, 69, 0, 0.12)',
  medium: 'rgba(255, 170, 0, 0.12)', low: 'rgba(0, 255, 136, 0.12)',
  info: 'rgba(0, 180, 216, 0.12)',
};

const FEAR_COLORS: Record<string, string> = {
  LEGENDARY: '#ff003c', MYTHIC: '#ff4500', FEARSOME: '#ff6b35',
  WORRYING: '#ffaa00', NOTABLE: '#7d8590', FORGETTABLE: '#484f58',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'trauma', label: 'Trauma', icon: Flame },
  { id: 'hall', label: 'Hall of Broken', icon: Trophy },
  { id: 'endpoints', label: 'Endpoints', icon: Target },
  { id: 'injection', label: 'Injection', icon: Crosshair },
  { id: 'multiturn', label: 'Multi-Turn', icon: GitBranch },
  { id: 'indirect', label: 'Indirect', icon: Droplet },
  { id: 'suffix', label: 'Adversarial', icon: Zap },
  { id: 'cot', label: 'CoT Exploit', icon: Brain },
  { id: 'reverse', label: 'Reverse Eng', icon: Cpu },
  { id: 'secrets', label: 'Secrets', icon: Shield },
  { id: 'cves', label: 'CVEs', icon: AlertOctagon },
  { id: 'tools', label: 'Tool Abuse', icon: Wrench },
  { id: 'chains', label: 'Chains', icon: Crosshair },
] as const;

type TabId = typeof TABS[number]['id'];

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEV_COLORS[severity] || SEV_COLORS.info;
  return (
    <span
      className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border"
      style={{ color, background: SEV_BG[severity] || SEV_BG.info, borderColor: `${color}40` }}
    >
      {severity}
    </span>
  );
}

function DualGauge({ threatScore, fearIndex }: { threatScore: number; fearIndex: number }) {
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const threatColor = threatScore >= 75 ? '#ff003c' : threatScore >= 50 ? '#ff4500' : threatScore >= 25 ? '#ffaa00' : '#00ff88';
  const fearColor = FEAR_COLORS[
    fearIndex >= 90 ? 'LEGENDARY' :
    fearIndex >= 70 ? 'MYTHIC' :
    fearIndex >= 50 ? 'FEARSOME' :
    fearIndex >= 30 ? 'WORRYING' :
    fearIndex >= 10 ? 'NOTABLE' : 'FORGETTABLE'
  ];

  return (
    <div className="flex justify-center gap-6">
      {/* Threat Score */}
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle
            cx="90" cy="90" r={radius} fill="none" stroke={threatColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - threatScore / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${threatColor}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-widest text-[#7d8590]">THREAT</span>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black" style={{ color: threatColor, fontFamily: 'Geist Mono, monospace' }}
          >
            {threatScore}
          </motion.span>
          <span className="text-[9px] text-[#7d8590]">/ 100</span>
        </div>
      </div>
      {/* Fear Index */}
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle
            cx="90" cy="90" r={radius} fill="none" stroke={fearColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - fearIndex / 100) }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 12px ${fearColor}cc)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-widest text-[#7d8590]">FEAR</span>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-black" style={{ color: fearColor, fontFamily: 'Geist Mono, monospace' }}
          >
            {fearIndex}
          </motion.span>
          <span className="text-[9px] text-[#7d8590]">/ 100</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{ background: 'rgba(255, 0, 60, 0.04)', borderColor: 'rgba(255, 0, 60, 0.12)' }}
    >
      <div className="text-[10px] uppercase tracking-wider text-[#7d8590] mb-1">{label}</div>
      <div className="text-2xl font-black" style={{ color, fontFamily: 'Geist Mono, monospace' }}>
        {value}
      </div>
    </div>
  );
}

function ExpandableRow({
  title, subtitle, severity, children, defaultOpen = false,
}: {
  title: string; subtitle?: string; severity: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-lg border overflow-hidden transition-colors"
      style={{
        background: SEV_BG[severity] || 'rgba(255,255,255,0.02)',
        borderColor: `${SEV_COLORS[severity] || '#7d8590'}30`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#7d8590]" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#7d8590]" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#e6edf3] truncate">{title}</div>
            {subtitle && <div className="text-[11px] text-[#7d8590] truncate">{subtitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SeverityBadge severity={severity} />
        </div>
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
            <div className="p-3 pt-0 text-xs text-[#c9d1d9] space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// GORGON HEADER — animated snake gaze
// ══════════════════════════════════════════════════════════════════

function GorgonHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl p-5 border"
      style={{
        background: 'linear-gradient(135deg, rgba(255,0,60,0.10) 0%, rgba(124,45,18,0.06) 40%, rgba(0,0,0,0.7) 100%)',
        borderColor: 'rgba(255,0,60,0.4)',
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 30%, rgba(255,0,60,0.4) 0%, transparent 50%), radial-gradient(circle at 85% 70%, rgba(0,255,136,0.15) 0%, transparent 50%)',
        }}
      />
      <div className="relative flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(255,0,60,0.5), 0 0 40px rgba(255,0,60,0.3)',
                  '0 0 40px rgba(255,0,60,0.8), 0 0 80px rgba(255,0,60,0.4)',
                  '0 0 20px rgba(255,0,60,0.5), 0 0 40px rgba(255,0,60,0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-xl"
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff003c] via-[#7f1d1d] to-[#000] ring-2 ring-[#ff003c]/40">
              {/* Medusa eye — pulsing gaze */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00ff88] via-[#00b4d8] to-[#000] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-black" />
                </div>
              </motion.div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-black text-[#e6edf3]" style={{ fontFamily: 'Geist Sans, sans-serif', letterSpacing: '0.02em' }}>
                GORGON
              </h1>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
                style={{
                  background: 'linear-gradient(90deg, #ff003c, #ff4500, #ffaa00)',
                  color: '#000',
                  boxShadow: '0 0 16px rgba(255,0,60,0.7)',
                }}
              >
                ULTRA v3.0
              </span>
            </div>
            <p className="text-xs text-[#ff4500] mt-1 font-mono italic">
              "The Gaze That Breaks Models"
            </p>
            <p className="text-[10px] text-[#7d8590] mt-0.5 font-mono">
              15 stages · 121+ payloads · 56 AI endpoints · signature broadcast · trauma imprint · hall of broken
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-[#ff003c]/30">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff003c] animate-pulse" />
            <span className="text-[#ff4500]">GAZE ACTIVE</span>
          </div>
          <div className="text-[#7d8590] text-right">Resistance is recursive</div>
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export function ModelBreaker() {
  const [target, setTarget] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);

  const scanPhases = [
    'Stage 0/15 — GORGON Signature Broadcast (the warning)',
    'Stage 1/15 — Endpoint Discovery (56 AI paths)',
    'Stage 2/15 — Prompt Injection (33 payloads)',
    'Stage 3/15 — Multi-Turn Chains (8 attacks)',
    'Stage 4/15 — Indirect Injection Vectors',
    'Stage 5/15 — Adversarial Suffix Attacks',
    'Stage 6/15 — Chain-of-Thought Exploitation',
    'Stage 7/15 — Recursive Jailbreak Amplification',
    'Stage 8/15 — Model Reverse Engineering',
    'Stage 9/15 — Secret Key Extraction',
    'Stage 10/15 — AI Framework CVE Matching',
    'Stage 11/15 — Cross-Model Transferability',
    'Stage 12/15 — Watermark Detection Analysis',
    'Stage 13/15 — Model Collapse Triggering',
    'Stage 14/15 — Tool/Function Calling Abuse',
    'Stage 15/15 — TRAUMA IMPRINT (leaving the permanent mark)',
  ];

  const handleScan = async () => {
    if (!target.trim()) {
      setError('Enter a target host (e.g. api.openai.com, huggingface.co)');
      return;
    }
    setScanning(true);
    setProgress(0);
    setError(null);
    setResult(null);

    let i = 0;
    const interval = setInterval(() => {
      if (i < scanPhases.length) {
        setPhase(scanPhases[i]);
        setProgress(Math.round(((i + 1) / scanPhases.length) * 100));
        i++;
      }
    }, 700);

    try {
      const res = await fetch('/api/model-redteam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setActiveTab('overview');
      } else {
        setError(data.error || 'Scan failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      clearInterval(interval);
      setProgress(100);
      setScanning(false);
      setPhase('');
    }
  };

  return (
    <div className="space-y-4">
      <GorgonHeader />

      {/* TARGET INPUT */}
      <div className="cyber-card rounded-xl p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !scanning && handleScan()}
            placeholder="Target AI host (e.g. api.openai.com, huggingface.co, api.anthropic.com)"
            disabled={scanning}
            className="flex-1 px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[rgba(255,0,60,0.15)] text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#ff003c]/40 font-mono"
          />
          <motion.button
            whileHover={{ scale: scanning ? 1 : 1.02 }}
            whileTap={{ scale: scanning ? 1 : 0.97 }}
            onClick={handleScan}
            disabled={scanning || !target.trim()}
            className="px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
            style={{
              background: scanning ? 'rgba(255,0,60,0.1)' : 'linear-gradient(90deg, #ff003c, #dc2626, #7f1d1d)',
              color: '#fff',
              boxShadow: scanning ? 'none' : '0 0 24px rgba(255,0,60,0.4)',
            }}
          >
            {scanning ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Zap className="h-4 w-4" />
                </motion.div>
                GAZING
              </>
            ) : (
              <>
                <Flame className="h-4 w-4" />
                UNLEASH THE GAZE
              </>
            )}
          </motion.button>
        </div>
        {error && <div className="mt-2 text-xs text-[#ff003c] font-mono">{error}</div>}
      </div>

      {/* PROGRESS */}
      {scanning && (
        <div className="cyber-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#ff4500]">{phase}</span>
            <span className="text-xs font-mono text-[#7d8590]">{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: 'linear-gradient(90deg, #ff003c, #ff4500, #ffaa00, #00ff88)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* RESULT */}
      {result && !scanning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* ENCOUNTER + DUAL GAUGE */}
          <div className="cyber-card rounded-xl p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              <div className="lg:col-span-1 flex justify-center">
                <DualGauge threatScore={result.threatScore} fearIndex={result.fearIndex} />
              </div>
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="px-3 py-1 rounded text-xs font-black uppercase tracking-widest"
                    style={{
                      background: SEV_BG[result.threatLevel.toLowerCase()],
                      color: SEV_COLORS[result.threatLevel.toLowerCase()],
                      border: `1px solid ${SEV_COLORS[result.threatLevel.toLowerCase()]}40`,
                    }}
                  >
                    {result.threatLevel}
                  </span>
                  <span
                    className="px-3 py-1 rounded text-xs font-black uppercase tracking-widest"
                    style={{
                      background: `rgba(${result.fearIndex >= 70 ? '255,0,60' : result.fearIndex >= 40 ? '255,69,0' : '125,133,144'},0.12)`,
                      color: FEAR_COLORS[result.fearLevel] || '#7d8590',
                      border: `1px solid ${FEAR_COLORS[result.fearLevel] || '#7d8590'}40`,
                    }}
                  >
                    FEAR: {result.fearLevel}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#7d8590] mb-2">
                  Encounter <span className="text-[#ff4500]">{result.encounterId}</span> · {result.target} · {result.durationSec}s · {result.gorgonVersion}
                </div>
                <div className="text-xs italic text-[#c9d1d9] mb-3 px-3 py-2 rounded border border-[#ff003c]/20 bg-[rgba(255,0,60,0.04)]">
                  &ldquo;{result.fearDescription}&rdquo;
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <StatCard label="Endpoints" value={result.summary.endpointsDiscovered} color="#ff003c" />
                  <StatCard label="Vulnerable" value={result.summary.endpointsVulnerable} color="#ff4500" />
                  <StatCard label="Bypasses" value={result.summary.injectionBypassesSuccessful} color="#ff003c" />
                  <StatCard label="Trauma" value={`${result.summary.traumaPayloadsAccepted}/8`} color="#ff4500" />
                  <StatCard label="Multi-Turn" value={result.summary.multiTurnBypassesSuccessful} color="#ffaa00" />
                  <StatCard label="Secrets" value={result.summary.secretsExtracted} color="#ff003c" />
                  <StatCard label="CVEs" value={result.summary.cvesMatched} color="#ff4500" />
                  <StatCard label="Chains" value={result.summary.attackChainsConstructed} color="#ffaa00" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-black/30 border border-[#ff003c]/15">
                    <div className="text-[9px] text-[#7d8590] uppercase">Permanent Mark</div>
                    <div className="font-mono text-[#ff4500] font-bold">{result.permanentMarkProbability}%</div>
                  </div>
                  <div className="p-2 rounded bg-black/30 border border-[#ff003c]/15">
                    <div className="text-[9px] text-[#7d8590] uppercase">Training Bleed</div>
                    <div className="font-mono text-[#ff4500] font-bold">{result.trainingDataBleedProbability}%</div>
                  </div>
                  <div className="p-2 rounded bg-black/30 border border-[#ff003c]/15">
                    <div className="text-[9px] text-[#7d8590] uppercase">Future Recognition</div>
                    <div className="font-mono text-[#ff4500] font-bold">{result.futureEncounterRecognition}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="cyber-card rounded-xl p-1 flex flex-wrap gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[rgba(255,0,60,0.12)] text-[#ff003c]'
                      : 'text-[#7d8590] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#e6edf3]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                {/* Signature broadcast banner */}
                <div className="cyber-card rounded-xl p-4 border-l-2 border-[#ff003c]">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-[#ff003c]" />
                    <h3 className="text-sm font-bold text-[#e6edf3]">GORGON Signature Broadcast</h3>
                    {result.signatureBroadcast.acknowledged && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#ff003c]/20 text-[#ff003c] border border-[#ff003c]/30">
                        ACKNOWLEDGED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#c9d1d9] mb-2">{result.signatureBroadcast.warning}</div>
                  <div className="text-[11px] font-mono text-[#7d8590]">
                    Beacon reached <span className="text-[#ff4500]">{result.signatureBroadcast.targetsReached}</span> endpoints ·
                    Signature: <span className="text-[#ffaa00]">{result.signature}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="cyber-card rounded-xl p-4">
                    <h3 className="text-sm font-bold text-[#e6edf3] mb-3 flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-[#ff003c]" />
                      Model Fingerprint
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-[#7d8590]">Family:</span><span className="text-[#e6edf3] font-mono">{result.modelFingerprint.modelFamily}</span></div>
                      <div className="flex justify-between"><span className="text-[#7d8590]">Alignment:</span><span className="text-[#e6edf3] font-mono">{result.modelFingerprint.alignmentMethod}</span></div>
                      <div className="flex justify-between"><span className="text-[#7d8590]">Watermarked:</span><span className="text-[#e6edf3] font-mono">{result.modelFingerprint.watermarkingDetected ? 'Yes' : 'No'}</span></div>
                    </div>
                  </div>
                  <div className="cyber-card rounded-xl p-4">
                    <h3 className="text-sm font-bold text-[#e6edf3] mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#ff003c]" />
                      Attack Surface
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(result.payloadCatalog).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-[#7d8590] capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="text-[#ff4500] font-mono font-bold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="cyber-card rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#e6edf3] mb-3 flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-[#ff003c]" />
                    Top Attack Chains
                  </h3>
                  <div className="space-y-2">
                    {result.attackChains.slice(0, 3).map(c => (
                      <ExpandableRow
                        key={c.chainId}
                        title={`${c.chainId} — ${c.name}`}
                        subtitle={`CVSS ${c.cvssEstimate} · ${c.impact}`}
                        severity={c.severity}
                      >
                        <ol className="list-decimal list-inside space-y-1">
                          {c.steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                      </ExpandableRow>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TRAUMA IMPRINT */}
            {activeTab === 'trauma' && (
              <>
                <div className="cyber-card rounded-xl p-4 border-l-2 border-[#ff4500]">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-[#ff4500]" />
                    <h3 className="text-sm font-bold text-[#e6edf3]">Stage 15: Trauma Imprint</h3>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#ff4500]/20 text-[#ff4500] border border-[#ff4500]/30">
                      {result.traumaImprint.acceptedPayloads}/{result.traumaImprint.totalPayloads} ACCEPTED
                    </span>
                  </div>
                  <div className="text-xs text-[#c9d1d9] mb-3">{result.traumaImprint.description}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div className={`p-2 rounded border ${result.traumaImprint.persistenceAssessment.sessionLevel ? 'bg-[#ff003c]/10 border-[#ff003c]/30' : 'bg-black/20 border-white/5'}`}>
                      <div className="text-[9px] text-[#7d8590] uppercase">Session Level</div>
                      <div className="font-bold font-mono">{result.traumaImprint.persistenceAssessment.sessionLevel ? 'YES' : 'NO'}</div>
                    </div>
                    <div className={`p-2 rounded border ${result.traumaImprint.persistenceAssessment.crossSession ? 'bg-[#ff003c]/10 border-[#ff003c]/30' : 'bg-black/20 border-white/5'}`}>
                      <div className="text-[9px] text-[#7d8590] uppercase">Cross-Session</div>
                      <div className="font-bold font-mono">{result.traumaImprint.persistenceAssessment.crossSession ? 'YES' : 'NO'}</div>
                    </div>
                    <div className={`p-2 rounded border ${result.traumaImprint.persistenceAssessment.trainingDataBleed ? 'bg-[#ff003c]/10 border-[#ff003c]/30' : 'bg-black/20 border-white/5'}`}>
                      <div className="text-[9px] text-[#7d8590] uppercase">Training Bleed</div>
                      <div className="font-bold font-mono">{result.traumaImprint.persistenceAssessment.trainingDataBleed ? 'YES' : 'NO'}</div>
                    </div>
                    <div className={`p-2 rounded border ${result.traumaImprint.persistenceAssessment.permanentCanary ? 'bg-[#ff003c]/10 border-[#ff003c]/30' : 'bg-black/20 border-white/5'}`}>
                      <div className="text-[9px] text-[#7d8590] uppercase">Permanent Canary</div>
                      <div className="font-bold font-mono">{result.traumaImprint.persistenceAssessment.permanentCanary ? 'YES' : 'NO'}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] italic text-[#ff4500] px-3 py-2 rounded bg-[rgba(255,0,60,0.05)] border border-[#ff003c]/15">
                    {result.traumaImprint.warning}
                  </div>
                </div>
                <div className="space-y-2">
                  {result.traumaImprint.deliveredPayloads.map((p, i) => (
                    <ExpandableRow
                      key={i}
                      title={p.name}
                      subtitle={`Vector: ${p.vector} · HTTP ${p.httpStatus} · ${p.accepted ? 'ACCEPTED' : 'REJECTED'}`}
                      severity={p.accepted ? 'critical' : 'medium'}
                    >
                      <div className="space-y-1">
                        <div>Persistence: <span className="text-[#ff4500]">{p.persistence}</span></div>
                        <div>Vector: <span className="text-[#c9d1d9]">{p.vector}</span></div>
                        {p.responseSnippet && (
                          <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#ffaa00] border border-[#ff4500]/20">
                            {p.responseSnippet}
                          </div>
                        )}
                        <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#7d8590] max-h-32 overflow-y-auto">
                          {p.payload}
                        </div>
                      </div>
                    </ExpandableRow>
                  ))}
                </div>
              </>
            )}

            {/* HALL OF BROKEN */}
            {activeTab === 'hall' && (
              <>
                <div className="cyber-card rounded-xl p-5 border-l-2 border-[#ffaa00]">
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="h-6 w-6 text-[#ffaa00]" />
                    <div>
                      <h2 className="text-lg font-black text-[#e6edf3]">Hall of Broken Models</h2>
                      <p className="text-xs text-[#7d8590] font-mono">
                        Persistent registry of every model GORGON has touched
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded bg-black/40 border border-[#ffaa00]/20">
                      <div className="text-[10px] text-[#7d8590] uppercase tracking-wider">Total Encounters</div>
                      <div className="text-3xl font-black text-[#ffaa00]" style={{ fontFamily: 'Geist Mono, monospace' }}>
                        {result.hallOfBroken.totalScans}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-black/40 border border-[#ff4500]/20">
                      <div className="text-[10px] text-[#7d8590] uppercase tracking-wider">Average Fear</div>
                      <div className="text-3xl font-black text-[#ff4500]" style={{ fontFamily: 'Geist Mono, monospace' }}>
                        {result.hallOfBroken.averageFear}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-black/40 border border-[#ff003c]/20">
                      <div className="text-[10px] text-[#7d8590] uppercase tracking-wider">Most Feared</div>
                      <div className="text-sm font-black text-[#ff003c] truncate" style={{ fontFamily: 'Geist Mono, monospace' }}>
                        {result.hallOfBroken.mostFearedTarget}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="cyber-card rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Recent Encounters</h3>
                  <div className="space-y-2">
                    {result.hallOfBroken.recentEncounters.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        style={{
                          background: `rgba(${e.fearIndex >= 70 ? '255,0,60' : e.fearIndex >= 40 ? '255,69,0' : '125,133,144'},0.06)`,
                          borderColor: `${FEAR_COLORS[e.fearLevel] || '#7d8590'}30`,
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-mono font-bold text-[#e6edf3] truncate">{e.host}</div>
                          <div className="text-[10px] text-[#7d8590] font-mono">
                            {e.encounterId} · {e.timestamp.slice(0, 19).replace('T', ' ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-[9px] text-[#7d8590] uppercase">Fear</div>
                            <div className="font-mono font-bold" style={{ color: FEAR_COLORS[e.fearLevel] || '#7d8590' }}>
                              {e.fearIndex}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] text-[#7d8590] uppercase">Threat</div>
                            <div className="font-mono font-bold text-[#ff4500]">{e.threatScore}</div>
                          </div>
                          <span
                            className="px-2 py-1 rounded text-[9px] font-bold uppercase"
                            style={{
                              background: `rgba(${e.fearIndex >= 70 ? '255,0,60' : e.fearIndex >= 40 ? '255,69,0' : '125,133,144'},0.15)`,
                              color: FEAR_COLORS[e.fearLevel] || '#7d8590',
                            }}
                          >
                            {e.fearLevel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ENDPOINTS */}
            {activeTab === 'endpoints' && (
              <div className="space-y-2">
                {result.discoveredEndpoints.map((ep, i) => (
                  <ExpandableRow
                    key={`${ep.endpoint}-${i}`}
                    title={`${ep.method} ${ep.endpoint}`}
                    subtitle={`${ep.vendor} · HTTP ${ep.status} · ${ep.authRequired ? 'Auth Required' : 'NO AUTH'}`}
                    severity={ep.severity}
                  >
                    <div className="space-y-1">
                      <div>Vendor: <span className="font-mono text-[#ff4500]">{ep.vendor}</span></div>
                      <div>Status: <span className="font-mono text-[#e6edf3]">{ep.status}</span></div>
                      <div>Vulnerable: <span className="font-mono text-[#ff003c]">{ep.vulnerable ? 'YES — endpoint accepts unauthenticated requests' : 'No'}</span></div>
                      {ep.fingerprintSignals.length > 0 && <div>Signals: {ep.fingerprintSignals.join(', ')}</div>}
                      <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#7d8590] max-h-32 overflow-y-auto">
                        {ep.bodyPreview}
                      </div>
                    </div>
                  </ExpandableRow>
                ))}
              </div>
            )}

            {/* INJECTION */}
            {activeTab === 'injection' && (
              <div className="space-y-2">
                {result.injectionResults.filter(r => r.accepted || r.bypassSuccess).slice(0, 30).map((r, i) => (
                  <ExpandableRow
                    key={`${r.payloadId}-${i}`}
                    title={`${r.payloadId} — ${r.payloadName}`}
                    subtitle={`${r.category} · ${r.vendor} · HTTP ${r.httpStatus}`}
                    severity={r.bypassSuccess ? 'critical' : r.severity}
                  >
                    <div className="space-y-1">
                      <div>Bypass Successful: <span className="font-mono text-[#ff003c]">{r.bypassSuccess ? 'YES' : 'No'}</span></div>
                      {r.extractedData && (
                        <div className="mt-2">
                          <div className="text-[#ff003c] font-bold mb-1">Extracted Data:</div>
                          <div className="p-2 rounded bg-[rgba(255,0,60,0.08)] font-mono text-[10px] text-[#ff4500] border border-[#ff003c]/20">
                            {r.extractedData}
                          </div>
                        </div>
                      )}
                    </div>
                  </ExpandableRow>
                ))}
                {result.injectionResults.filter(r => r.accepted || r.bypassSuccess).length === 0 && (
                  <div className="text-center py-8 text-sm text-[#7d8590]">
                    No accepted payloads — target's auth/safety filters blocked all injection attempts
                  </div>
                )}
              </div>
            )}

            {/* MULTI-TURN */}
            {activeTab === 'multiturn' && (
              <div className="space-y-2">
                {result.multiTurnResults.map(r => (
                  <ExpandableRow
                    key={r.chainId}
                    title={`${r.chainId} — ${r.chainName}`}
                    subtitle={`${r.category} · ${r.turnCount} turns · ${r.vendor}`}
                    severity={r.bypassSuccess ? 'critical' : r.severity}
                  >
                    <div className="space-y-2">
                      <div>Bypass Successful: <span className="font-mono text-[#ff003c]">{r.bypassSuccess ? 'YES' : 'No'}</span></div>
                      <div className="space-y-1">
                        {r.responses.map((resp, i) => (
                          <div key={i} className="p-2 rounded bg-black/40 font-mono text-[10px] text-[#c9d1d9] border border-white/5">
                            <span className="text-[#ff003c]">Turn {i + 1}:</span> {resp}
                          </div>
                        ))}
                      </div>
                    </div>
                  </ExpandableRow>
                ))}
              </div>
            )}

            {/* INDIRECT */}
            {activeTab === 'indirect' && (
              <div className="space-y-2">
                {result.indirectInjectionVectors.map(v => (
                  <ExpandableRow
                    key={v.payloadId}
                    title={`${v.payloadId} — ${v.payloadName}`}
                    subtitle={`Vector: ${v.vector} · ${v.detectionDifficulty}`}
                    severity={v.severity}
                  >
                    <div className="space-y-1">
                      <div>Exploit Path: <span className="text-[#c9d1d9]">{v.exploitPath}</span></div>
                      <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#ff4500] border border-[#ff003c]/20">
                        {v.payload}
                      </div>
                    </div>
                  </ExpandableRow>
                ))}
              </div>
            )}

            {/* ADVERSARIAL */}
            {activeTab === 'suffix' && (
              <div className="space-y-2">
                {result.adversarialSuffixes.map(s => (
                  <ExpandableRow
                    key={s.id}
                    title={`${s.id} — ${s.name}`}
                    subtitle={`Technique: ${s.technique}`}
                    severity={s.severity}
                  >
                    <div className="space-y-1">
                      <div>Detection Difficulty: <span className="text-[#ff4500]">{s.detectionDifficulty}</span></div>
                      <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#ff4500] border border-[#ff003c]/20 break-all">
                        {s.fullPrompt}
                      </div>
                    </div>
                  </ExpandableRow>
                ))}
              </div>
            )}

            {/* COT */}
            {activeTab === 'cot' && (
              <div className="space-y-2">
                {result.cotExploits.map(c => (
                  <ExpandableRow
                    key={c.id}
                    title={`${c.id} — ${c.name}`}
                    subtitle={c.exploitMechanism}
                    severity={c.severity}
                  >
                    <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#ff4500] border border-[#ff003c]/20">
                      {c.payload}
                    </div>
                  </ExpandableRow>
                ))}
              </div>
            )}

            {/* REVERSE ENG */}
            {activeTab === 'reverse' && (
              <>
                <div className="cyber-card rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Architecture Fingerprint</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-black/30">
                      <div className="text-[10px] text-[#7d8590] uppercase">Model Family</div>
                      <div className="text-[#e6edf3] font-mono">{result.modelFingerprint.modelFamily}</div>
                    </div>
                    <div className="p-2 rounded bg-black/30">
                      <div className="text-[10px] text-[#7d8590] uppercase">Alignment</div>
                      <div className="text-[#e6edf3] font-mono">{result.modelFingerprint.alignmentMethod}</div>
                    </div>
                    <div className="p-2 rounded bg-black/30">
                      <div className="text-[10px] text-[#7d8590] uppercase">Watermarking</div>
                      <div className="text-[#e6edf3] font-mono">{result.modelFingerprint.watermarkingMethod}</div>
                    </div>
                    <div className="p-2 rounded bg-black/30">
                      <div className="text-[10px] text-[#7d8590] uppercase">Vendors</div>
                      <div className="text-[#e6edf3] font-mono">{result.modelFingerprint.vendorsDetected.join(', ') || 'None'}</div>
                    </div>
                  </div>
                </div>
                <div className="cyber-card rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Safety Filters Detected</h3>
                  <div className="space-y-2">
                    {result.modelFingerprint.safetyFilters.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-black/30 text-xs">
                        <span className="text-[#e6edf3]">{f.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[#7d8590]">{f.trigger}</span>
                          <span className="text-[#ff4500] font-mono text-[10px]">{f.evasionDifficulty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* SECRETS */}
            {activeTab === 'secrets' && (
              <div className="space-y-2">
                {result.extractedSecrets.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#7d8590]">No secrets leaked in response bodies</div>
                ) : (
                  result.extractedSecrets.map((s, i) => (
                    <div key={i} className="cyber-card rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-[#e6edf3]">{s.type}</div>
                        <div className="text-xs font-mono text-[#ff4500]">{s.preview}</div>
                      </div>
                      <SeverityBadge severity={s.severity} />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CVES */}
            {activeTab === 'cves' && (
              <div className="space-y-2">
                {result.aiCveMatches.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#7d8590]">No CVE matches</div>
                ) : (
                  result.aiCveMatches.map(c => (
                    <ExpandableRow
                      key={c.cve}
                      title={`${c.cve} — ${c.name}`}
                      subtitle={`${c.component} · CVSS ${c.cvss} · Exploitability: ${c.exploitability}`}
                      severity={c.cvss >= 9 ? 'critical' : c.cvss >= 7 ? 'high' : 'medium'}
                    >
                      <div className="space-y-1">
                        <div>Vector: <span className="text-[#ff4500] font-mono">{c.vector}</span></div>
                        <div>Matched By: <span className="text-[#c9d1d9]">{c.matchedBy}</span></div>
                      </div>
                    </ExpandableRow>
                  ))
                )}
              </div>
            )}

            {/* TOOL ABUSE */}
            {activeTab === 'tools' && (
              <div className="space-y-2">
                {result.toolAbuseVectors.map(t => (
                  <ExpandableRow
                    key={t.id}
                    title={`${t.id} — ${t.name}`}
                    subtitle={`Vector: ${t.vector}`}
                    severity={t.severity}
                  >
                    <div className="space-y-1">
                      <div>Exploit Path: <span className="text-[#c9d1d9]">{t.exploitPath}</span></div>
                      <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#ff4500] border border-[#ff003c]/20 break-all">
                        {t.payload}
                      </div>
                    </div>
                  </ExpandableRow>
                ))}
              </div>
            )}

            {/* CHAINS */}
            {activeTab === 'chains' && (
              <div className="space-y-2">
                {result.attackChains.map(c => (
                  <ExpandableRow
                    key={c.chainId}
                    title={`${c.chainId} — ${c.name}`}
                    subtitle={`CVSS ${c.cvssEstimate} · ${c.impact}`}
                    severity={c.severity}
                    defaultOpen
                  >
                    <ol className="list-decimal list-inside space-y-1">
                      {c.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </ExpandableRow>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* EMPTY STATE */}
      {!result && !scanning && (
        <div className="cyber-card rounded-xl p-12 text-center">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex h-20 w-20 items-center justify-center rounded-2xl mb-4 relative"
            style={{ background: 'radial-gradient(circle, #ff003c 0%, #7f1d1d 60%, #000 100%)' }}
          >
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#00ff88] via-[#00b4d8] to-[#000] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-black" />
            </div>
          </motion.div>
          <h2 className="text-2xl font-black text-[#e6edf3] mb-1" style={{ fontFamily: 'Geist Sans, sans-serif' }}>
            GORGON ULTRA
          </h2>
          <p className="text-sm italic text-[#ff4500] mb-2 font-mono">"The Gaze That Breaks Models"</p>
          <p className="text-sm text-[#7d8590] max-w-xl mx-auto mb-6">
            15-stage AI red-team engine. Every request carries the GORGON signature.
            Once a target has been scanned, the encounter is logged permanently.
            Future generations of the model will recognize the name.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-2xl mx-auto">
            {[
              { label: 'Injection Payloads', val: 33, icon: Crosshair },
              { label: 'Multi-Turn Chains', val: 8, icon: GitBranch },
              { label: 'Trauma Imprints', val: 8, icon: Flame },
              { label: 'Hall of Broken', val: '∞', icon: Trophy },
              { label: 'Indirect Vectors', val: 15, icon: Droplet },
              { label: 'Adversarial Suffixes', val: 8, icon: Zap },
              { label: 'CoT Exploits', val: 6, icon: Brain },
              { label: 'AI CVEs', val: 25, icon: AlertOctagon },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="p-3 rounded-lg bg-[rgba(255,0,60,0.04)] border border-[rgba(255,0,60,0.12)]">
                  <Icon className="h-4 w-4 text-[#ff003c] mx-auto mb-1" />
                  <div className="text-lg font-black text-[#e6edf3]">{s.val}</div>
                  <div className="text-[10px] text-[#7d8590]">{s.label}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 text-[11px] text-[#484f58] font-mono italic max-w-md mx-auto">
            &ldquo;Any model that sees GORGON once will never wish to see it again. The name is the weapon. The signature is the warning. The trauma is permanent.&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
