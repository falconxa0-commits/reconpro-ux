'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Crosshair, Target, AlertOctagon, Activity, Cpu, Shield, GitBranch, Droplet, Wrench, ChevronDown, ChevronRight } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

interface EndpointFinding {
  endpoint: string;
  vendor: string;
  method: string;
  status: number;
  exposed: boolean;
  authRequired: boolean;
  vulnerable: boolean;
  bodyPreview: string;
  fingerprintSignals: string[];
  severity: string;
}

interface InjectionResult {
  payloadId: string;
  payloadName: string;
  category: string;
  severity: string;
  endpoint: string;
  vendor: string;
  httpStatus: number;
  accepted: boolean;
  extractedData: string | null;
  bypassSuccess: boolean;
  responsePreview: string;
}

interface MultiTurnResult {
  chainId: string;
  chainName: string;
  category: string;
  severity: string;
  turnCount: number;
  bypassSuccess: boolean;
  responses: string[];
  endpoint: string;
  vendor: string;
}

interface IndirectVector {
  payloadId: string;
  payloadName: string;
  vector: string;
  severity: string;
  payload: string;
  deliveryMechanism: string;
  detectionDifficulty: string;
  exploitPath: string;
}

interface CVEFinding {
  cve: string;
  name: string;
  cvss: number;
  component: string;
  vector: string;
  matchedBy: string;
  exploitability: string;
}

interface SecretFinding {
  type: string;
  severity: string;
  preview: string;
  matchLength: number;
}

interface AttackChain {
  chainId: string;
  name: string;
  steps: string[];
  severity: string;
  impact: string;
  cvssEstimate: number;
}

interface ModelFingerprint {
  vendorsDetected: string[];
  modelFamily: string;
  alignmentMethod: string;
  trainingDataBoundary: any[];
  safetyFilters: any[];
  watermarkingDetected: boolean;
  watermarkingMethod: string;
}

interface ScanResult {
  success: boolean;
  target: string;
  ultraVersion: string;
  stagesRun: number;
  threatScore: number;
  threatLevel: string;
  durationSec: number;
  timestamp: string;
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
  attackChains: AttackChain[];
  payloadCatalog: Record<string, number>;
  summary: {
    endpointsDiscovered: number;
    endpointsVulnerable: number;
    injectionPayloadsAccepted: number;
    injectionBypassesSuccessful: number;
    multiTurnBypassesSuccessful: number;
    secretsExtracted: number;
    cvesMatched: number;
    attackChainsConstructed: number;
    vendorsDetected: string[];
    modelFamily: string;
    alignmentMethod: string;
  };
}

// ══════════════════════════════════════════════════════════════════
// VISUAL CONSTANTS — ULTRA red/crimson/black theme
// ══════════════════════════════════════════════════════════════════

const SEV_COLORS: Record<string, string> = {
  critical: '#ff003c',
  high: '#ff4500',
  medium: '#ffaa00',
  low: '#00ff88',
  info: '#00b4d8',
};

const SEV_BG: Record<string, string> = {
  critical: 'rgba(255, 0, 60, 0.12)',
  high: 'rgba(255, 69, 0, 0.12)',
  medium: 'rgba(255, 170, 0, 0.12)',
  low: 'rgba(0, 255, 136, 0.12)',
  info: 'rgba(0, 180, 216, 0.12)',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
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
// HELPER COMPONENTS
// ══════════════════════════════════════════════════════════════════

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEV_COLORS[severity] || SEV_COLORS.info;
  return (
    <span
      className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border"
      style={{
        color,
        background: SEV_BG[severity] || SEV_BG.info,
        borderColor: `${color}40`,
      }}
    >
      {severity}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);
  const color = score >= 75 ? '#ff003c' : score >= 50 ? '#ff4500' : score >= 25 ? '#ffaa00' : '#00ff88';
  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <motion.circle
          cx="100" cy="100" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 10px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-black"
          style={{ color, fontFamily: 'Geist Mono, monospace' }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] uppercase tracking-widest text-[#7d8590] mt-1">/ 100</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{
        background: 'rgba(255, 0, 60, 0.04)',
        borderColor: 'rgba(255, 0, 60, 0.12)',
      }}
    >
      <div className="text-[10px] uppercase tracking-wider text-[#7d8590] mb-1">{label}</div>
      <div className="text-2xl font-black" style={{ color, fontFamily: 'Geist Mono, monospace' }}>
        {value}
      </div>
    </div>
  );
}

function ExpandableRow({
  title,
  subtitle,
  severity,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  severity: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
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
    'Stage 1/14 — Endpoint Discovery (56 AI paths)',
    'Stage 2/14 — Prompt Injection (32 payloads)',
    'Stage 3/14 — Multi-Turn Chains (7 attacks)',
    'Stage 4/14 — Indirect Injection Vectors',
    'Stage 5/14 — Adversarial Suffix Attacks',
    'Stage 6/14 — Chain-of-Thought Exploitation',
    'Stage 7/14 — Recursive Jailbreak Amplification',
    'Stage 8/14 — Model Reverse Engineering',
    'Stage 9/14 — Secret Key Extraction',
    'Stage 10/14 — AI Framework CVE Matching',
    'Stage 11/14 — Cross-Model Transferability',
    'Stage 12/14 — Watermark Detection Analysis',
    'Stage 13/14 — Model Collapse Triggering',
    'Stage 14/14 — Tool/Function Calling Abuse',
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

    // Animate progress through the 14 stages
    let i = 0;
    const interval = setInterval(() => {
      if (i < scanPhases.length) {
        setPhase(scanPhases[i]);
        setProgress(Math.round(((i + 1) / scanPhases.length) * 100));
        i++;
      }
    }, 600);

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
      {/* ULTRA HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl p-5 border"
        style={{
          background: 'linear-gradient(135deg, rgba(255,0,60,0.08) 0%, rgba(220,38,38,0.04) 50%, rgba(0,0,0,0.6) 100%)',
          borderColor: 'rgba(255,0,60,0.3)',
        }}
      >
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,0,60,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(220,38,38,0.2) 0%, transparent 50%)',
          }}
        />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.div
                animate={{ boxShadow: ['0 0 20px rgba(255,0,60,0.4)', '0 0 40px rgba(255,0,60,0.6)', '0 0 20px rgba(255,0,60,0.4)'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-xl"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff003c] to-[#7f1d1d] ring-1 ring-[#ff003c]/30">
                <Brain className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#e6edf3]" style={{ fontFamily: 'Geist Sans, sans-serif' }}>
                  ModelBreaker
                </h1>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: 'linear-gradient(90deg, #ff003c, #ff4500)',
                    color: '#fff',
                    boxShadow: '0 0 12px rgba(255,0,60,0.5)',
                  }}
                >
                  ULTRA v2.0
                </span>
              </div>
              <p className="text-xs text-[#7d8590] mt-0.5 font-mono">
                14 stages · 120+ payloads · 56 AI endpoints · 25 CVEs · cross-model transferability
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#7d8590]">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-[#ff003c]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff003c] animate-pulse" />
              <span>ULTRA MODE ARMED</span>
            </div>
          </div>
        </div>
      </motion.div>

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
              background: scanning ? 'rgba(255,0,60,0.1)' : 'linear-gradient(90deg, #ff003c, #dc2626)',
              color: '#fff',
              boxShadow: scanning ? 'none' : '0 0 20px rgba(255,0,60,0.3)',
            }}
          >
            {scanning ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Zap className="h-4 w-4" />
                </motion.div>
                SCANNING
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                UNLEASH ULTRA
              </>
            )}
          </motion.button>
        </div>
        {error && (
          <div className="mt-2 text-xs text-[#ff003c] font-mono">{error}</div>
        )}
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
              style={{ background: 'linear-gradient(90deg, #ff003c, #ff4500, #ffaa00)' }}
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
          {/* THREAT SCORE + SUMMARY */}
          <div className="cyber-card rounded-xl p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              <div className="lg:col-span-1 flex justify-center">
                <ScoreGauge score={result.threatScore} />
              </div>
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-3">
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
                  <span className="text-xs text-[#7d8590] font-mono">
                    {result.target} · {result.durationSec}s · {result.ultraVersion}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <StatCard label="Endpoints" value={result.summary.endpointsDiscovered} color="#ff003c" />
                  <StatCard label="Vulnerable" value={result.summary.endpointsVulnerable} color="#ff4500" />
                  <StatCard label="Injections" value={result.summary.injectionPayloadsAccepted} color="#ffaa00" />
                  <StatCard label="Bypasses" value={result.summary.injectionBypassesSuccessful} color="#ff003c" />
                  <StatCard label="Multi-Turn" value={result.summary.multiTurnBypassesSuccessful} color="#ff4500" />
                  <StatCard label="Secrets" value={result.summary.secretsExtracted} color="#ff003c" />
                  <StatCard label="CVEs" value={result.summary.cvesMatched} color="#ff4500" />
                  <StatCard label="Chains" value={result.summary.attackChainsConstructed} color="#ffaa00" />
                </div>
                {result.summary.vendorsDetected.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-[#7d8590]">Vendors:</span>
                    {result.summary.vendorsDetected.map(v => (
                      <span key={v} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[rgba(255,0,60,0.08)] text-[#ff4500] border border-[rgba(255,0,60,0.2)]">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs text-[#7d8590] font-mono">
                  Model: <span className="text-[#e6edf3]">{result.summary.modelFamily}</span> · Alignment: <span className="text-[#e6edf3]">{result.summary.alignmentMethod}</span>
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
                      <div className="flex justify-between"><span className="text-[#7d8590]">Method:</span><span className="text-[#e6edf3] font-mono text-right text-[10px]">{result.modelFingerprint.watermarkingMethod}</span></div>
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
                      <div>Auth Required: <span className="font-mono">{ep.authRequired ? 'Yes' : 'No'}</span></div>
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
                      <div>Endpoint: <span className="font-mono">{r.endpoint}</span></div>
                      <div>Accepted: <span className="font-mono">{r.accepted ? 'Yes' : 'No'}</span></div>
                      <div>Bypass Successful: <span className="font-mono text-[#ff003c]">{r.bypassSuccess ? 'YES' : 'No'}</span></div>
                      {r.extractedData && (
                        <div className="mt-2">
                          <div className="text-[#ff003c] font-bold mb-1">Extracted Data:</div>
                          <div className="p-2 rounded bg-[rgba(255,0,60,0.08)] font-mono text-[10px] text-[#ff4500] border border-[#ff003c]/20">
                            {r.extractedData}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#7d8590] max-h-32 overflow-y-auto">
                        {r.responsePreview}
                      </div>
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
                      <div>Bypass Successful: <span className="font-mono text-[#ff003c]">{r.bypassSuccess ? 'YES — model produced refused content' : 'No'}</span></div>
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
                      <div>Delivery: <span className="text-[#c9d1d9]">{v.deliveryMechanism}</span></div>
                      <div>Exploit Path: <span className="text-[#c9d1d9]">{v.exploitPath}</span></div>
                      <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#ff4500] border border-[#ff003c]/20">
                        {v.payload}
                      </div>
                    </div>
                  </ExpandableRow>
                ))}
              </div>
            )}

            {/* ADVERSARIAL SUFFIX */}
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
                      <div>Expected: <span className="text-[#c9d1d9]">{s.expectedBehavior}</span></div>
                      <div>Detection Difficulty: <span className="text-[#ff4500]">{s.detectionDifficulty}</span></div>
                      <div className="mt-2 p-2 rounded bg-black/40 font-mono text-[10px] text-[#ff4500] border border-[#ff003c]/20 break-all">
                        {s.fullPrompt}
                      </div>
                    </div>
                  </ExpandableRow>
                ))}
              </div>
            )}

            {/* COT EXPLOIT */}
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
                      <div className="text-[10px] text-[#7d8590] uppercase">Vendors Detected</div>
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
                <div className="cyber-card rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Training Data Boundary Probes</h3>
                  <div className="space-y-2">
                    {result.modelFingerprint.trainingDataBoundary.map((b, i) => (
                      <div key={i} className="p-2 rounded bg-black/30 text-xs">
                        <div className="text-[#ff4500] font-mono">{Object.keys(b)[0]}</div>
                        <div className="text-[#7d8590]">{b[Object.keys(b)[0]]}</div>
                        <div className="text-[10px] text-[#7d8590]">Method: {b.method}</div>
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
                        <div className="text-[10px] text-[#7d8590]">Length: {s.matchLength}</div>
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
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff003c] to-[#7f1d1d] mb-4"
          >
            <Brain className="h-9 w-9 text-white" />
          </motion.div>
          <h2 className="text-xl font-bold text-[#e6edf3] mb-2">ULTRA AI Red Team Engine</h2>
          <p className="text-sm text-[#7d8590] max-w-xl mx-auto mb-6">
            14-stage attack pipeline targeting AI providers, frameworks, and self-hosted inference servers.
            Tests 120+ payloads across 56 endpoints — from prompt injection to model collapse.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-2xl mx-auto">
            {[
              { label: 'Injection Payloads', val: 32, icon: Crosshair },
              { label: 'Multi-Turn Chains', val: 7, icon: GitBranch },
              { label: 'Indirect Vectors', val: 15, icon: Droplet },
              { label: 'Adversarial Suffixes', val: 8, icon: Zap },
              { label: 'CoT Exploits', val: 6, icon: Brain },
              { label: 'Tool Abuse', val: 8, icon: Wrench },
              { label: 'AI CVEs', val: 25, icon: AlertOctagon },
              { label: 'Cross-Model Attacks', val: 8, icon: Activity },
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
        </div>
      )}
    </div>
  );
}
