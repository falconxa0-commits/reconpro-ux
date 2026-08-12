'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Link2,
  FileText,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Types ────────────────────────────────────────────────────────────────────

interface FrameworkControl {
  id: string;
  description: string;
  status: 'pass' | 'fail' | 'pending';
  category: string;
  evidenceLink?: string;
}

interface ComplianceFramework {
  id: string;
  name: string;
  icon: string;
  score: number;
  status: 'Compliant' | 'Needs Attention' | 'Non-Compliant';
  controlsPassed: number;
  controlsTotal: number;
  lastAssessed: string;
  controls: FrameworkControl[];
}

interface CompliancePanelProps {
  framework?: string;
}

// ── API response types ───────────────────────────────────────────────────────

interface ApiControl {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'warn';
  evidence: string;
}

interface ApiFramework {
  id: string;
  name: string;
  icon: string;
  score: number;
  status: 'pass' | 'warn' | 'fail' | 'needs_review';
  controlsPassed: number;
  controlsTotal: number;
  lastAssessed: string;
  controls: ApiControl[];
}

interface ApiResponse {
  overallScore: number;
  lastAssessed: string;
  frameworks: ApiFramework[];
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

function mapFrameworkStatus(
  apiStatus: ApiFramework['status']
): ComplianceFramework['status'] {
  switch (apiStatus) {
    case 'pass':
      return 'Compliant';
    case 'warn':
    case 'needs_review':
      return 'Needs Attention';
    case 'fail':
      return 'Non-Compliant';
    default:
      return 'Needs Attention';
  }
}

function mapControlStatus(
  apiStatus: ApiControl['status']
): FrameworkControl['status'] {
  switch (apiStatus) {
    case 'pass':
      return 'pass';
    case 'fail':
      return 'fail';
    case 'warn':
      return 'pending';
    default:
      return 'pending';
  }
}

function mapApiToFramework(api: ApiFramework): ComplianceFramework {
  return {
    id: api.id,
    name: api.name,
    icon: api.icon,
    score: api.score,
    status: mapFrameworkStatus(api.status),
    controlsPassed: api.controlsPassed,
    controlsTotal: api.controlsTotal,
    lastAssessed: api.lastAssessed,
    controls: api.controls.map((c) => ({
      id: c.id,
      description: c.name,
      status: mapControlStatus(c.status),
      category: c.category,
      evidenceLink: c.evidence && c.evidence !== 'No relevant findings detected' && !c.evidence.startsWith('Not assessable') ? c.evidence : undefined,
    })),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 90) return '#00ff88';
  if (score >= 75) return '#d29922';
  return '#ff3355';
}

function getScoreGradient(score: number): string {
  if (score >= 90) return 'from-[#00ff88]/20 to-[#00ff88]/5';
  if (score >= 75) return 'from-[#d29922]/20 to-[#d29922]/5';
  return 'from-[#ff3355]/20 to-[#ff3355]/5';
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'Compliant':
      return { color: '#00ff88', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)', icon: ShieldCheck };
    case 'Needs Attention':
      return { color: '#d29922', bg: 'rgba(210,153,34,0.15)', border: 'rgba(210,153,34,0.3)', icon: ShieldAlert };
    case 'Non-Compliant':
      return { color: '#ff3355', bg: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.3)', icon: ShieldX };
    default:
      return { color: '#444444', bg: 'rgba(139,148,158,0.15)', border: 'rgba(139,148,158,0.3)', icon: Shield };
  }
}

// ── Circular Gauge SVG ──────────────────────────────────────────────────────

function ComplianceGauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
        {/* Background circle */}
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#161b22" strokeWidth="10" />
        {/* Progress arc */}
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' as const, delay: 0.3 }}
          style={{
            filter: `drop-shadow(0 0 8px ${color}50)`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-black text-[#f0f0f0]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {score}%
        </motion.span>
        <span className="text-[10px] uppercase tracking-widest text-[#444444] font-medium">Overall</span>
      </div>
    </div>
  );
}

// ── Sparkline SVG ───────────────────────────────────────────────────────────

function TrendSparkline() {
  const points = [62, 65, 68, 72, 70, 75, 78, 82, 85, 84, 87, 89];
  const w = 200;
  const h = 40;
  const step = w / (points.length - 1);

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / 100) * h}`)
    .join(' ');

  const areaData = `${pathData} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaData}
        fill="url(#sparkGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      />
      <motion.path
        d={pathData}
        fill="none"
        stroke="#00ff88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' as const }}
      />
      <motion.circle
        cx={(points.length - 1) * step}
        cy={h - (points[points.length - 1] / 100) * h}
        r="3"
        fill="#00ff88"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.3 }}
      />
    </svg>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#000000]" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-[#000000] rounded" />
            <div className="h-3 w-64 bg-[#000000] rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-[180px] bg-[#000000] rounded" />
          <div className="h-9 w-24 bg-[#000000] rounded" />
        </div>
      </div>

      {/* Gauge area skeleton */}
      <div className="rounded-xl border border-[#21262d] bg-[#080b14] p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-[180px] h-[180px] rounded-full bg-[#000000]" />
          <div className="flex-1 w-full space-y-4">
            <div className="h-4 w-40 bg-[#000000] rounded" />
            <div className="h-10 w-full bg-[#000000] rounded" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="h-16 bg-[#000000] rounded-lg" />
              <div className="h-16 bg-[#000000] rounded-lg" />
              <div className="h-16 bg-[#000000] rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Framework cards skeleton */}
      <div>
        <div className="h-4 w-36 bg-[#000000] rounded mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-[#21262d] bg-[#080b14] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#000000] rounded" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 bg-[#000000] rounded" />
                    <div className="h-2.5 w-16 bg-[#000000] rounded" />
                  </div>
                </div>
                <div className="h-5 w-20 bg-[#000000] rounded-full" />
              </div>
              <div className="h-2 w-full bg-[#000000] rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="rounded-xl border border-[#21262d] bg-[#080b14] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#000000] rounded-md" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-40 bg-[#000000] rounded" />
              <div className="h-3 w-56 bg-[#000000] rounded" />
            </div>
          </div>
          <div className="h-10 w-10 bg-[#000000] rounded-full" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#161b22]">
            <div className="w-4 h-4 bg-[#000000] rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-12 bg-[#000000] rounded" />
              <div className="h-3 w-64 bg-[#000000] rounded" />
            </div>
            <div className="h-5 w-12 bg-[#000000] rounded" />
            <div className="h-5 w-14 bg-[#000000] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const cardHover = {
  scale: 1.02,
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
};

// ── Component ───────────────────────────────────────────────────────────────

export function CompliancePanel({ framework = 'all' }: CompliancePanelProps) {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState(framework === 'all' ? 'soc2' : framework);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [controlStates, setControlStates] = useState<Record<string, boolean>>({});

  const fetchCompliance = useCallback(async () => {
    try {
      const res = await fetch('/api/compliance');
      if (!res.ok) throw new Error('Failed to fetch compliance data');
      const data: ApiResponse = await res.json();
      const mapped = data.frameworks.map(mapApiToFramework);
      setFrameworks(mapped);
      setOverallScore(data.overallScore);
      // Auto-select the first framework if the selected one isn't available
      if (mapped.length > 0 && !mapped.find((f) => f.id === selectedFramework)) {
        setSelectedFramework(mapped[0].id);
      }
    } catch (err) {
      console.error('Failed to load compliance data:', err);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [selectedFramework]);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  const handleRegenerate = () => {
    setRegenerating(true);
    fetchCompliance();
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (frameworks.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-[#333333] mb-4" />
        <h3 className="text-lg font-semibold text-[#f0f0f0] mb-2">No Compliance Data</h3>
        <p className="text-sm text-[#444444] mb-4">Run a scan first to generate compliance assessments.</p>
        <Button variant="outline" size="sm" onClick={handleRegenerate} className="border-[#21262d] text-[#444444] hover:bg-[rgba(52,211,153,0.1)] hover:text-[#00ff88] gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    );
  }

  const selected = frameworks.find((f) => f.id === selectedFramework) || frameworks[0];

  const toggleControlStatus = (controlId: string) => {
    setControlStates((prev) => ({ ...prev, [controlId]: !prev[controlId] }));
  };

  const passedCount = selected.controls.filter((c) => c.status === 'pass').length;
  const failedCount = selected.controls.filter((c) => c.status === 'fail').length;
  const controlPassRate = selected.controls.length > 0
    ? Math.round((passedCount / selected.controls.length) * 100)
    : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.2)]">
            <Shield className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#f0f0f0]">Compliance Framework</h2>
            <p className="text-sm text-[#444444]">Monitor and manage regulatory compliance posture</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="bg-[#080b14] border-[#21262d] text-[#f0f0f0] w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#000000] border-[#21262d] text-[#f0f0f0]">
              {frameworks.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-[#f0f0f0] focus:bg-[rgba(52,211,153,0.1)] focus:text-[#00ff88]">
                  <span className="mr-2">{f.icon}</span>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="border-[#21262d] text-[#444444] hover:bg-[rgba(52,211,153,0.1)] hover:text-[#00ff88] gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </motion.div>

      {/* ── Overall Score + Trend ────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#080b14] p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <ComplianceGauge score={overallScore} />
            <p className="text-sm font-medium text-[#00ff88]">
              {overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Good' : 'Needs Improvement'}
            </p>
          </div>

          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f0f0f0]">Compliance Trend</h3>
              <div className="flex items-center gap-1.5 text-[#00ff88]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">+4.2% from last month</span>
              </div>
            </div>
            <TrendSparkline />
            <div className="flex gap-4 text-xs text-[#444444]">
              <span>Last 12 assessments</span>
              <span>•</span>
              <span>Updated: Jan 20, 2024</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.15)] p-3 text-center">
                <p className="text-lg font-bold text-[#00ff88]">
                  {frameworks.filter((f) => f.status === 'Compliant').length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#444444]">Compliant</p>
              </div>
              <div className="rounded-lg bg-[rgba(210,153,34,0.08)] border border-[rgba(210,153,34,0.15)] p-3 text-center">
                <p className="text-lg font-bold text-[#d29922]">
                  {frameworks.filter((f) => f.status === 'Needs Attention').length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#444444]">Attention</p>
              </div>
              <div className="rounded-lg bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.15)] p-3 text-center">
                <p className="text-lg font-bold text-[#ff3355]">
                  {frameworks.filter((f) => f.status === 'Non-Compliant').length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#444444]">Non-Compliant</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Framework Grid ────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-semibold text-[#f0f0f0] mb-3">Frameworks Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {frameworks.map((fw, idx) => {
            const statusCfg = getStatusConfig(fw.status);
            const StatusIcon = statusCfg.icon;
            const isSelected = fw.id === selectedFramework;
            return (
              <motion.div
                key={fw.id}
                variants={itemVariants}
                whileHover={cardHover}
                onClick={() => setSelectedFramework(fw.id)}
                className={`rounded-xl border cursor-pointer transition-all overflow-hidden ${
                  isSelected
                    ? 'border-[rgba(52,211,153,0.4)] shadow-[0_0_20px_rgba(52,211,153,0.1)]'
                    : 'border-[#21262d] hover:border-[#30363d]'
                }`}
                style={{ backgroundColor: '#0d1117' }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{fw.icon}</span>
                      <div>
                        <h4 className="text-sm font-bold text-[#f0f0f0]">{fw.name}</h4>
                        <p className="text-[10px] text-[#333333]">{fw.controlsPassed}/{fw.controlsTotal} controls</p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                      style={{
                        backgroundColor: statusCfg.bg,
                        borderColor: statusCfg.border,
                        color: statusCfg.color,
                      }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span className="hidden sm:inline">{fw.status === 'Needs Attention' ? 'Attention' : fw.status}</span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[#444444]">Score</span>
                      <span className="text-sm font-bold" style={{ color: getScoreColor(fw.score) }}>
                        {fw.score}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#000000] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: getScoreColor(fw.score) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${fw.score}%` }}
                        transition={{ delay: idx * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' as const }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-[#333333]">
                      <Clock className="w-3 h-3" />
                      <span>Assessed {fw.lastAssessed}</span>
                    </div>
                    <button className="text-[10px] font-medium text-[#00ff88] hover:text-[#00cc6a] transition-colors flex items-center gap-1">
                      Review
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Controls Checklist ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#080b14] overflow-hidden">
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-[rgba(52,211,153,0.1)]">
              <FileText className="w-4 h-4 text-[#00ff88]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">
                {selected.icon} {selected.name} Controls
              </h3>
              <p className="text-xs text-[#444444]">
                {passedCount} passed, {failedCount} failed of {selected.controls.length} controls
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold text-[#f0f0f0]">{controlPassRate}%</p>
              <p className="text-[10px] text-[#444444] uppercase tracking-wider">Pass Rate</p>
            </div>
            <div className="w-12 h-12 relative">
              <svg width="48" height="48" viewBox="0 0 48 48" className="transform -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#161b22" strokeWidth="4" />
                <motion.circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={getScoreColor(controlPassRate)}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 20}
                  initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 20 - (controlPassRate / 100) * 2 * Math.PI * 20 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {selected.controls.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[#444444]">No controls to display. Run a scan to generate compliance data.</p>
            </div>
          ) : (
            selected.controls.map((control, idx) => {
              const isExpanded = expandedControl === control.id;
              const isPass = control.status === 'pass';
              const toggleValue = controlStates[control.id] ?? isPass;

              return (
                <motion.div
                  key={control.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className="border-b border-[#161b22] last:border-b-0"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[rgba(52,211,153,0.02)] transition-colors"
                    onClick={() => setExpandedControl(isExpanded ? null : control.id)}
                  >
                    <Checkbox
                      checked={toggleValue}
                      onCheckedChange={() => toggleControlStatus(control.id)}
                      className={`${
                        toggleValue
                          ? 'data-[state=checked]:bg-[#00ff88] data-[state=checked]:border-[#00ff88]'
                          : 'data-[state=unchecked]:border-[#ff3355]'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#333333]">{control.id}</span>
                        <span className="text-xs text-[#f0f0f0] truncate">{control.description}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        toggleValue
                          ? 'bg-[rgba(52,211,153,0.1)] text-[#00ff88]'
                          : 'bg-[rgba(244,63,94,0.1)] text-[#ff3355]'
                      }`}
                    >
                      {toggleValue ? 'PASS' : 'FAIL'}
                    </span>
                    <span className="text-[10px] text-[#333333] border border-[#21262d] rounded px-1.5 py-0.5">
                      {control.category}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#333333]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#333333]" />
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 ml-9 space-y-2">
                          <p className="text-xs text-[#444444] leading-relaxed">
                            Control {control.id} requires proper implementation of {control.description.toLowerCase()}{' '}
                            across all relevant systems and processes.
                          </p>
                          <div className="flex items-center gap-2">
                            {control.evidenceLink ? (
                              <button className="flex items-center gap-1.5 text-[10px] font-medium text-[#44aaff] hover:text-[#79c0ff] transition-colors">
                                <Link2 className="w-3 h-3" />
                                View Evidence
                              </button>
                            ) : null}
                            <span className="text-[10px] text-[#333333]">•</span>
                            <span className="text-[10px] text-[#333333]">Last verified: {selected.lastAssessed}</span>
                          </div>
                          {control.evidenceLink && (
                            <p className="text-xs text-[#44aaff]/80 bg-[#000000] rounded p-2 leading-relaxed">
                              {control.evidenceLink}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}