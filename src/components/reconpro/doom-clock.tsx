'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Shield, AlertTriangle, ShieldAlert, Zap, ArrowDown,
  FileText, Share2, ExternalLink, Lock, Unlock, Key, Globe,
  Server, ChevronDown, ChevronUp, Radiation, Activity,
  TrendingDown, Target, BarChart3, Flame, Timer,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────

interface AssetAssessment {
  domain: string;
  port: number;
  protocol: string;
  cipherSuite: string;
  keyExchange: string;
  keySize: number;
  currentAlgorithm: string;
  algorithmFamily: string;
  qubitsRequired: number;
  estimatedBreakYear: number;
  yearsUntilBreak: number;
  doomDate: string;
  riskLevel: string;
  confidence: string;
  pqcRecommendation: string;
  pqcAlgorithm: string;
  pqcNistLevel: number;
  certExpiry?: string;
}

interface HNDLRisk {
  score: number;
  description: string;
  dataAtRisk: string;
  recommendation: string;
  captureWindowYears: number;
  estimatedRecords: string;
  regulatoryExposure: string;
}

interface IndustryStats {
  industry: string;
  doomScore: number;
  averageBreakYear: number;
  pctQuantumReady: number;
  averageYearsRemaining: number;
  topThreats: string[];
  description: string;
}

interface MigrationStep {
  priority: number;
  asset: string;
  currentCrypto: string;
  recommendedCrypto: string;
  nistLevel: number;
  estimatedEffort: string;
  costEstimate: string;
  category: string;
  urgency: string;
}

interface QuantumHardware {
  currentQubits: number;
  projected2030: number;
  projected2035: number;
  projected2040: number;
  growthRate: number;
}

interface DoomClockData {
  overallDoomDate: string;
  doomScore: number;
  urgencyLevel: string;
  urgencyDescription: string;
  assets: AssetAssessment[];
  totalAssets: number;
  criticalAssets: number;
  highRiskAssets: number;
  quantumReadyAssets: number;
  hndlRisk: HNDLRisk;
  industryAverage: IndustryStats;
  migrationPlan: MigrationStep[];
  companyName?: string;
  industry?: string;
  calculatedAt: string;
  quantumHardwareProjection: QuantumHardware;
}

// ── Constants ─────────────────────────────────────────────────────────

const INDUSTRIES = [
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'technology', label: 'Technology' },
  { value: 'government', label: 'Government' },
  { value: 'retail', label: 'Retail & E-Commerce' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'telecom', label: 'Telecommunications' },
  { value: 'education', label: 'Education' },
];

const URGENCY_COLORS: Record<string, { bg: string; text: string; glow: string; border: string; gradient: string }> = {
  CRITICAL: { bg: 'bg-red-950/40', text: 'text-red-400', glow: '0 0 60px rgba(239,68,68,0.5), 0 0 120px rgba(239,68,68,0.2)', border: 'border-red-500/50', gradient: 'from-red-600 to-red-800' },
  HIGH: { bg: 'bg-orange-950/40', text: 'text-orange-400', glow: '0 0 60px rgba(251,146,60,0.4), 0 0 120px rgba(251,146,60,0.15)', border: 'border-orange-500/50', gradient: 'from-orange-500 to-orange-700' },
  MODERATE: { bg: 'bg-yellow-950/40', text: 'text-yellow-400', glow: '0 0 40px rgba(250,204,21,0.3)', border: 'border-yellow-500/50', gradient: 'from-yellow-500 to-yellow-700' },
  LOW: { bg: 'bg-green-950/40', text: 'text-green-400', glow: '0 0 30px rgba(34,197,94,0.2)', border: 'border-green-500/50', gradient: 'from-green-500 to-green-700' },
  SECURE: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', glow: '0 0 30px rgba(52,211,153,0.2)', border: 'border-emerald-500/50', gradient: 'from-emerald-500 to-emerald-700' },
};

const RISK_ROW_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-950/20 border-red-500/20',
  HIGH: 'bg-orange-950/20 border-orange-500/20',
  MODERATE: 'bg-yellow-950/15 border-yellow-500/20',
  LOW: 'bg-green-950/10 border-green-500/20',
};

// ── Sub-components ────────────────────────────────────────────────────

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const target = new Date(targetDate);
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      // Approximate years/months
      let years = target.getFullYear() - now.getFullYear();
      let months = target.getMonth() - now.getMonth();
      let days = target.getDate() - now.getDate();
      if (days < 0) {
        months--;
        const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years--;
        months += 12;
      }

      const hours = 23 - now.getHours();
      const minutes = 59 - now.getMinutes();
      const seconds = 59 - now.getSeconds();

      setTimeLeft({ years, months, days, hours, minutes, seconds });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

function DoomCountdown({ doomDate, doomScore, urgencyLevel }: { doomDate: string; doomScore: number; urgencyLevel: string }) {
  const time = useCountdown(doomDate);
  const colors = URGENCY_COLORS[urgencyLevel] || URGENCY_COLORS.LOW;
  const formattedDate = new Date(doomDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const isCritical = doomScore >= 70;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Warning label */}
      <motion.div
        className="flex items-center gap-2"
        animate={{ opacity: isCritical ? [1, 0.5, 1] : 1 }}
        transition={{ duration: isCritical ? 2 : 0, repeat: isCritical ? Infinity : 0 }}
      >
        <Radiation className="w-5 h-5 text-red-500" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
          Quantum Threat Timeline
        </span>
        <Radiation className="w-5 h-5 text-red-500" />
      </motion.div>

      {/* Giant countdown */}
      <div className="flex items-center gap-3">
        {[
          { value: time.years, label: 'YEARS' },
          { value: time.months, label: 'MONTHS' },
          { value: time.days, label: 'DAYS' },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center">
            <motion.div
              className={`relative flex items-center justify-center w-24 h-28 rounded-xl border ${colors.border} ${colors.bg}`}
              style={{ boxShadow: colors.glow }}
              animate={isCritical ? {
                boxShadow: [
                  colors.glow,
                  '0 0 80px rgba(239,68,68,0.7), 0 0 160px rgba(239,68,68,0.3)',
                  colors.glow,
                ],
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className={`text-5xl font-black tabular-nums ${colors.text} font-mono`}>
                {String(value).padStart(2, '0')}
              </span>
              {/* Scan line effect */}
              <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ y: [0, 112] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>
            <span className="mt-2 text-[10px] font-bold tracking-[0.2em] text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Doom date */}
      <div className="text-center">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">YOUR ENCRYPTION EXPIRES</div>
        <div className={`text-xl font-bold ${colors.text} font-mono tracking-wide`}>
          {formattedDate}
        </div>
      </div>

      {/* Doom Score Arc */}
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          {/* Background arc */}
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Score arc */}
          <motion.circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke="url(#doomGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={314}
            initial={{ strokeDashoffset: 314 }}
            animate={{ strokeDashoffset: 314 - (314 * doomScore / 100) }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="doomGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={doomScore >= 70 ? '#ff3355' : doomScore >= 50 ? '#ff8844' : '#22c55e'} />
              <stop offset="100%" stopColor={doomScore >= 70 ? '#dc2626' : doomScore >= 50 ? '#ea580c' : '#16a34a'} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black tabular-nums ${colors.text} font-mono`}>
            {doomScore}
          </span>
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">DOOM SCORE</span>
        </div>
      </div>

      {/* Urgency Badge */}
      <motion.div
        className={`px-6 py-2 rounded-full border ${colors.border} ${colors.bg}`}
        animate={isCritical ? {
          scale: [1, 1.05, 1],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className={`text-sm font-black tracking-[0.15em] ${colors.text}`}>
          ⚠ {urgencyLevel}
        </span>
      </motion.div>
    </div>
  );
}

function HNDLWarning({ hndlRisk }: { hndlRisk: HNDLRisk }) {
  const [expanded, setExpanded] = useState(false);
  const severityColor = hndlRisk.score >= 70 ? 'text-red-400' : hndlRisk.score >= 40 ? 'text-orange-400' : 'text-yellow-400';
  const severityGlow = hndlRisk.score >= 70
    ? '0 0 30px rgba(239,68,68,0.3)'
    : hndlRisk.score >= 40
      ? '0 0 20px rgba(251,146,60,0.2)'
      : 'none';

  return (
    <motion.div
      className="rounded-xl border border-red-500/20 bg-red-950/10 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      style={{ boxShadow: severityGlow }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-red-950/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </motion.div>
          <div className="text-left">
            <div className="text-sm font-bold text-red-400">HARVEST NOW, DECRYPT LATER</div>
            <div className="text-xs text-gray-400">Attackers are ALREADY capturing your encrypted traffic</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-black tabular-nums ${severityColor} font-mono`}>
            {hndlRisk.score}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-red-500/10 p-4 space-y-3">
              <p className="text-xs text-gray-300 leading-relaxed">{hndlRisk.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-black/30 p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Data at Risk</div>
                  <div className="text-sm font-bold text-red-400">{hndlRisk.dataAtRisk}</div>
                </div>
                <div className="rounded-lg bg-black/30 p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Capture Window</div>
                  <div className="text-sm font-bold text-orange-400">{hndlRisk.captureWindowYears} years</div>
                </div>
              </div>

              <div className="rounded-lg bg-black/30 p-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Regulatory Exposure</div>
                <div className="text-xs text-gray-300">{hndlRisk.regulatoryExposure}</div>
              </div>

              <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/20 p-3">
                <div className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1">Recommendation</div>
                <div className="text-xs text-emerald-300">{hndlRisk.recommendation}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AssetBreakdown({ assets, sortBy, onSortChange }: {
  assets: AssetAssessment[];
  sortBy: 'doomDate' | 'risk' | 'domain';
  onSortChange: (s: 'doomDate' | 'risk' | 'domain') => void;
}) {
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      if (sortBy === 'doomDate') return a.estimatedBreakYear - b.estimatedBreakYear;
      if (sortBy === 'risk') {
        const order = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
        return (order[a.riskLevel] ?? 4) - (order[b.riskLevel] ?? 4);
      }
      return a.domain.localeCompare(b.domain);
    });
  }, [assets, sortBy]);

  return (
    <div className="space-y-2">
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">Sort by:</span>
        {(['doomDate', 'risk', 'domain'] as const).map(s => (
          <button
            key={s}
            onClick={() => onSortChange(s)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              sortBy === s
                ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            {s === 'doomDate' ? 'Doom Date' : s === 'risk' ? 'Risk Level' : 'Domain'}
          </button>
        ))}
      </div>

      {/* Asset rows */}
      <div className="space-y-1.5">
        {sortedAssets.map((asset, idx) => (
          <motion.div
            key={`${asset.domain}-${asset.port}-${idx}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-lg border p-3 ${RISK_ROW_COLORS[asset.riskLevel] || 'bg-gray-900/50 border-gray-800'}`}
          >
            <div className="flex flex-col gap-2">
              {/* Top row: domain + port + risk badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-200">{asset.domain}</span>
                  <span className="text-xs text-gray-500 font-mono">:{asset.port}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    asset.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    asset.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                    asset.riskLevel === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {asset.riskLevel}
                  </span>
                  {asset.algorithmFamily === 'pqc' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      PQC ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Detail row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">Algorithm:</span>{' '}
                  <span className="text-gray-300">{asset.currentAlgorithm}</span>
                </div>
                <div>
                  <span className="text-gray-500">Key Size:</span>{' '}
                  <span className="text-gray-300">{asset.keySize}-bit</span>
                </div>
                <div>
                  <span className="text-gray-500">Qubits Req:</span>{' '}
                  <span className="text-gray-300">{asset.qubitsRequired.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Break Year:</span>{' '}
                  <span className={`font-semibold ${
                    asset.yearsUntilBreak <= 3 ? 'text-red-400' :
                    asset.yearsUntilBreak <= 5 ? 'text-orange-400' :
                    asset.yearsUntilBreak <= 7 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {asset.estimatedBreakYear} ({asset.yearsUntilBreak}y left)
                  </span>
                </div>
              </div>

              {/* PQC Recommendation */}
              <div className="flex items-start gap-2 text-[11px] bg-black/20 rounded p-2">
                <Shield className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-emerald-400 font-semibold">PQC: </span>
                  <span className="text-gray-300">{asset.pqcRecommendation}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MigrationRoadmap({ steps }: { steps: MigrationStep[] }) {
  const totalCost = useMemo(() => {
    // Parse cost estimates and sum ranges
    let minTotal = 0;
    let maxTotal = 0;
    for (const step of steps) {
      const match = step.costEstimate.match(/\$(\d+)K-\$(\d+)K/);
      if (match) {
        minTotal += parseInt(match[1]);
        maxTotal += parseInt(match[2]);
      }
    }
    return `$${minTotal}K-$${maxTotal}K`;
  }, [steps]);

  const urgencyColor = (urgency: string) =>
    urgency === 'CRITICAL' ? 'bg-red-500' :
    urgency === 'HIGH' ? 'bg-orange-500' :
    urgency === 'MODERATE' ? 'bg-yellow-500' :
    'bg-green-500';

  return (
    <div className="space-y-4">
      {/* Total cost header */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-[#00ff88]/10 bg-[#00ff88]/5">
        <div>
          <div className="text-xs text-gray-500">Estimated Total Migration Cost</div>
          <div className="text-2xl font-black text-[#00ff88] font-mono">{totalCost}</div>
        </div>
        <button className="px-4 py-2 rounded-lg bg-[#00ff88] text-black font-bold text-sm hover:bg-[#00ff88]/90 transition-colors">
          Request Quote
        </button>
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {steps.map((step, idx) => (
          <motion.div
            key={step.priority}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative flex gap-4 pb-4"
          >
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${urgencyColor(step.urgency)} ring-4 ring-gray-950 z-10`} />
              {idx < steps.length - 1 && (
                <div className="w-px flex-1 bg-gray-800" />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900/50 p-3 mb-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">#{step.priority}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                    {step.category}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${urgencyColor(step.urgency)}/20 ${
                    step.urgency === 'CRITICAL' ? 'text-red-400' :
                    step.urgency === 'HIGH' ? 'text-orange-400' :
                    'text-yellow-400'
                  }`}>
                    {step.urgency}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-500">{step.costEstimate}</span>
              </div>

              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-red-400" />
                  <span className="text-gray-400">{step.currentCrypto}</span>
                  <ArrowDown className="w-3 h-3 text-[#00ff88]" />
                  <Unlock className="w-3 h-3 text-[#00ff88]" />
                  <span className="text-emerald-400 font-semibold">{step.recommendedCrypto}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>NIST Level {step.nistLevel}</span>
                  <span>•</span>
                  <span>{step.estimatedEffort}</span>
                  <span>•</span>
                  <span className="text-gray-300">{step.asset}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function IndustryComparison({ yourScore, industry }: {
  yourScore: number;
  industry: IndustryStats;
}) {
  const percentile = useMemo(() => {
    if (yourScore >= industry.doomScore + 20) return 95;
    if (yourScore >= industry.doomScore + 10) return 85;
    if (yourScore >= industry.doomScore) return 65;
    if (yourScore >= industry.doomScore - 10) return 45;
    return 25;
  }, [yourScore, industry.doomScore]);

  return (
    <div className="space-y-4">
      {/* Bar comparison */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Your Company</span>
            <span className={`text-xs font-bold tabular-nums ${
              yourScore >= 70 ? 'text-red-400' : yourScore >= 50 ? 'text-orange-400' : 'text-green-400'
            }`}>
              {yourScore}
            </span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                yourScore >= 70 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                yourScore >= 50 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                'bg-gradient-to-r from-green-600 to-green-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${yourScore}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{industry.industry} Average</span>
            <span className="text-xs font-bold tabular-nums text-gray-300">{industry.doomScore}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
              initial={{ width: 0 }}
              animate={{ width: `${industry.doomScore}%` }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-900/50 border border-gray-800 p-2.5 text-center">
          <div className="text-[10px] text-gray-500 mb-1">Avg Break Year</div>
          <div className="text-sm font-bold text-gray-200">{industry.averageBreakYear}</div>
        </div>
        <div className="rounded-lg bg-gray-900/50 border border-gray-800 p-2.5 text-center">
          <div className="text-[10px] text-gray-500 mb-1">PQC Ready</div>
          <div className="text-sm font-bold text-emerald-400">{industry.pctQuantumReady}%</div>
        </div>
        <div className="rounded-lg bg-gray-900/50 border border-gray-800 p-2.5 text-center">
          <div className="text-[10px] text-gray-500 mb-1">Your Percentile</div>
          <div className={`text-sm font-bold ${
            percentile >= 70 ? 'text-red-400' : percentile >= 40 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {percentile}th
          </div>
        </div>
      </div>

      {/* Industry description */}
      <div className="text-[11px] text-gray-400 leading-relaxed bg-gray-900/30 rounded-lg p-3">
        {industry.description}
      </div>
    </div>
  );
}

function QuantumHardwareTimeline({ hw }: { hw: QuantumHardware }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Quantum Hardware Projections</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Current (2023)', value: hw.currentQubits, color: 'text-blue-400' },
          { label: 'Projected 2030', value: hw.projected2030, color: 'text-orange-400' },
          { label: 'Projected 2035', value: hw.projected2035, color: 'text-red-400' },
          { label: 'Projected 2040', value: hw.projected2040, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-gray-900/50 border border-gray-800 p-2.5">
            <div className="text-[10px] text-gray-500 mb-1">{label}</div>
            <div className={`text-sm font-bold tabular-nums font-mono ${color}`}>
              {value.toLocaleString()} qubits
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-gray-500">
        Growth rate: {hw.growthRate}x per year (qubit Moore&apos;s law)
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export function DoomClockPanel() {
  const [domain, setDomain] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DoomClockData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'doomDate' | 'risk' | 'domain'>('doomDate');
  const [activeTab, setActiveTab] = useState<'assets' | 'migration' | 'industry' | 'hardware'>('assets');

  const runDoomClock = useCallback(async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/doom-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          companyName: companyName.trim() || undefined,
          industry: industry || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Failed to calculate doom clock');
      }

      const json = await res.json();
      setData(json.doomClock);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [domain, companyName, industry]);

  const handleShare = useCallback(() => {
    if (!data) return;
    const text = `🚨 Post-Quantum Doom Clock for ${data.companyName || domain}\n\n` +
      `Doom Score: ${data.doomScore}/100 (${data.urgencyLevel})\n` +
      `Encryption Expires: ${new Date(data.overallDoomDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n` +
      `Critical Assets: ${data.criticalAssets} | HNDL Risk: ${data.hndlRisk.score}/100\n\n` +
      `⚠️ Harvest Now, Decrypt Later threat is REAL. Is your organization quantum-ready?\n\n` +
      `#PostQuantum #QuantumComputing #CyberSecurity #PQC #DoomClock`;

    if (navigator.share) {
      navigator.share({ title: 'Post-Quantum Doom Clock', text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }, [data, domain]);

  const handleExportReport = useCallback(() => {
    if (!data) return;
    const report = generateTextReport(data, domain);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doom-clock-${domain.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, domain]);

  return (
    <div className="space-y-6">
      {/* ── Input Section ── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <Timer className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100">Post-Quantum Doom Clock</h2>
            <p className="text-xs text-gray-500">When will quantum computers break your encryption?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
              Target Domain *
            </label>
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="example.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20 font-mono"
              onKeyDown={e => e.key === 'Enter' && !loading && runDoomClock()}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
              Industry
            </label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5 text-sm text-gray-200 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20"
            >
              <option value="">Select industry...</option>
              {INDUSTRIES.map(ind => (
                <option key={ind.value} value={ind.value}>{ind.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={runDoomClock}
          disabled={loading || !domain.trim()}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-800 text-white font-bold text-sm tracking-wide hover:from-red-500 hover:to-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              CALCULATING QUANTUM THREAT TIMELINE...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              ACTIVATE DOOM CLOCK
            </>
          )}
        </button>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-500/20">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <AnimatePresence>
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* A. THE CLOCK — Hero section */}
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-8 flex flex-col items-center">
              <DoomCountdown
                doomDate={data.overallDoomDate}
                doomScore={data.doomScore}
                urgencyLevel={data.urgencyLevel}
              />

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 w-full max-w-2xl">
                {[
                  { label: 'Total Assets', value: data.totalAssets, icon: Server, color: 'text-gray-300' },
                  { label: 'Critical', value: data.criticalAssets, icon: ShieldAlert, color: 'text-red-400' },
                  { label: 'High Risk', value: data.highRiskAssets, icon: AlertTriangle, color: 'text-orange-400' },
                  { label: 'Quantum Ready', value: data.quantumReadyAssets, icon: Shield, color: 'text-emerald-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-lg bg-gray-900/50 border border-gray-800 p-3 text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
                    <div className="text-[10px] text-gray-500">{label}</div>
                  </div>
                ))}
              </div>

              {/* Urgency description */}
              <p className="text-sm text-gray-400 mt-4 text-center max-w-lg">
                {data.urgencyDescription}
              </p>
            </div>

            {/* HNDL Warning */}
            <HNDLWarning hndlRisk={data.hndlRisk} />

            {/* Tab navigation */}
            <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg border border-gray-800 p-1">
              {[
                { key: 'assets', label: 'Asset Breakdown', icon: Server },
                { key: 'migration', label: 'Migration Roadmap', icon: Target },
                { key: 'industry', label: 'Industry Comparison', icon: BarChart3 },
                { key: 'hardware', label: 'Quantum Hardware', icon: Activity },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-gray-800 text-gray-200'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'assets' && (
                  <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AssetBreakdown assets={data.assets} sortBy={sortBy} onSortChange={setSortBy} />
                  </motion.div>
                )}
                {activeTab === 'migration' && (
                  <motion.div key="migration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <MigrationRoadmap steps={data.migrationPlan} />
                  </motion.div>
                )}
                {activeTab === 'industry' && (
                  <motion.div key="industry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <IndustryComparison yourScore={data.doomScore} industry={data.industryAverage} />
                  </motion.div>
                )}
                {activeTab === 'hardware' && (
                  <motion.div key="hardware" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <QuantumHardwareTimeline hw={data.quantumHardwareProjection} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* F. Share/Export */}
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-900 text-gray-300 text-xs font-medium hover:bg-gray-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Report
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-900 text-gray-300 text-xs font-medium hover:bg-gray-800 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ── */}
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <motion.div
            animate={{
              boxShadow: [
                '0 0 20px rgba(239,68,68,0.1)',
                '0 0 40px rgba(239,68,68,0.2)',
                '0 0 20px rgba(239,68,68,0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-950/30 border border-red-500/20 mb-4"
          >
            <Timer className="w-10 h-10 text-red-400" />
          </motion.div>
          <h3 className="text-lg font-bold text-gray-200 mb-2">Post-Quantum Threat Assessment</h3>
          <p className="text-sm text-gray-500 max-w-md">
            Enter a domain to calculate when quantum computers will be able to break your TLS encryption.
            Based on NIST PQC transition timelines and current quantum hardware research.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Text Report Generator ─────────────────────────────────────────────

function generateTextReport(data: DoomClockData, domain: string): string {
  const divider = '═'.repeat(60);
  const now = new Date().toLocaleString();

  let report = '';
  report += `${divider}\n`;
  report += `  POST-QUANTUM DOOM CLOCK — THREAT ASSESSMENT REPORT\n`;
  report += `  Generated: ${now}\n`;
  report += `  Target: ${domain}\n`;
  if (data.companyName) report += `  Company: ${data.companyName}\n`;
  if (data.industry) report += `  Industry: ${data.industry}\n`;
  report += `${divider}\n\n`;

  report += `OVERALL ASSESSMENT\n`;
  report += `  Doom Score: ${data.doomScore}/100 (${data.urgencyLevel})\n`;
  report += `  Encryption Expires: ${new Date(data.overallDoomDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  report += `  ${data.urgencyDescription}\n\n`;

  report += `ASSET SUMMARY\n`;
  report += `  Total Assets Scanned: ${data.totalAssets}\n`;
  report += `  Critical (<3 years): ${data.criticalAssets}\n`;
  report += `  High Risk (<5 years): ${data.highRiskAssets}\n`;
  report += `  Quantum Ready: ${data.quantumReadyAssets}\n\n`;

  report += `HARVEST NOW, DECRYPT LATER RISK\n`;
  report += `  HNDL Score: ${data.hndlRisk.score}/100\n`;
  report += `  Data at Risk: ${data.hndlRisk.dataAtRisk}\n`;
  report += `  Capture Window: ${data.hndlRisk.captureWindowYears} years\n`;
  report += `  ${data.hndlRisk.description}\n\n`;

  report += `PER-ASSET BREAKDOWN\n`;
  report += `${'─'.repeat(60)}\n`;
  for (const asset of data.assets) {
    report += `  ${asset.domain}:${asset.port}\n`;
    report += `    Algorithm: ${asset.currentAlgorithm} (${asset.keySize}-bit)\n`;
    report += `    Qubits Required: ${asset.qubitsRequired.toLocaleString()}\n`;
    report += `    Estimated Break: ${asset.estimatedBreakYear} (${asset.yearsUntilBreak} years)\n`;
    report += `    Risk: ${asset.riskLevel} | Confidence: ${asset.confidence}\n`;
    report += `    PQC Migration: ${asset.pqcAlgorithm} (NIST L${asset.pqcNistLevel})\n\n`;
  }

  report += `MIGRATION ROADMAP\n`;
  report += `${'─'.repeat(60)}\n`;
  for (const step of data.migrationPlan) {
    report += `  #${step.priority} [${step.urgency}] ${step.asset}\n`;
    report += `    ${step.currentCrypto} → ${step.recommendedCrypto}\n`;
    report += `    Effort: ${step.estimatedEffort} | Cost: ${step.costEstimate}\n\n`;
  }

  if (data.industry) {
    report += `INDUSTRY COMPARISON (${data.industry})\n`;
    report += `${'─'.repeat(60)}\n`;
    report += `  Industry Doom Score: ${data.industryAverage.doomScore}\n`;
    report += `  Industry Avg Break Year: ${data.industryAverage.averageBreakYear}\n`;
    report += `  Industry PQC Ready: ${data.industryAverage.pctQuantumReady}%\n\n`;
  }

  report += `QUANTUM HARDWARE PROJECTIONS\n`;
  report += `${'─'.repeat(60)}\n`;
  report += `  Current (2023): ${data.quantumHardwareProjection.currentQubits.toLocaleString()} qubits\n`;
  report += `  Projected 2030: ${data.quantumHardwareProjection.projected2030.toLocaleString()} qubits\n`;
  report += `  Projected 2035: ${data.quantumHardwareProjection.projected2035.toLocaleString()} qubits\n`;
  report += `  Projected 2040: ${data.quantumHardwareProjection.projected2040.toLocaleString()} qubits\n`;
  report += `  Growth Rate: ${data.quantumHardwareProjection.growthRate}x per year\n\n`;

  report += `${divider}\n`;
  report += `  Report generated by ReconPro Post-Quantum Doom Clock\n`;
  report += `  Data sources: NIST PQC standards, IBM Quantum Roadmap, CNSA 2.0\n`;
  report += `${divider}\n`;

  return report;
}
