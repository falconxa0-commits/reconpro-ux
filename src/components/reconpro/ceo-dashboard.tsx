'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Activity,
  TrendingUp,
  Clock,
  Globe,
  Lock,
  Scan,
  AlertTriangle,
  Bug,
  CheckCircle2,
  ArrowUpRight,
  ExternalLink,
  Zap,
  Radar,
  Target,
  Eye,
  FileWarning,
} from 'lucide-react';
import { AnimatedCounter } from './animated-counter';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Executive API response types
// ─────────────────────────────────────────────────────────────────────────────

interface ExecutiveComplianceItem {
  score: number | null;
  status: string | null;
  controlsPassed: number | null;
  controlsTotal: number | null;
}

interface ExecutiveData {
  overview: {
    mttd: string | null;
    mttr: string | null;
    complianceScore: number | null;
  } | null;
  riskTrend: { date: string; score: number }[];
  compliance: Record<string, ExecutiveComplianceItem>;
  topAssets: Array<{
    id: string;
    riskScore: number;
    totalVulns: number;
    startedAt: string;
    target: { domain: string };
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
    severity: string;
  }>;
}

interface CEODashboardProps {
  stats: {
    totalScans: number;
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    avgRiskScore: number;
  } | null;
  recentScans: any[];
  onNavigate: (view: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 24 },
  },
};

const cardHover = {
  scale: 1.015,
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Framework display names (maps API keys to human-readable names)
// ─────────────────────────────────────────────────────────────────────────────

const FRAMEWORK_LABELS: Record<string, string> = {
  soc2: 'SOC 2 Type II',
  hipaa: 'HIPAA',
  pci_dss: 'PCI-DSS',
  iso27001: 'ISO 27001',
  nist: 'NIST CSF',
  gdpr: 'GDPR',
};

const FRAMEWORK_KEYS = ['soc2', 'hipaa', 'pci_dss', 'iso27001', 'nist', 'gdpr'] as const;

const ACTIVITY_FEED = [
  {
    id: 1,
    timestamp: '2 min ago',
    icon: Bug,
    description: 'Critical SQL injection detected on api.corp.io/v3/users',
    severity: 'critical' as const,
    isNew: true,
  },
  {
    id: 2,
    timestamp: '18 min ago',
    icon: Scan,
    description: 'Full surface scan completed for acme-corp.com — 34 assets discovered',
    severity: 'info' as const,
    isNew: false,
  },
  {
    id: 3,
    timestamp: '1 hr ago',
    icon: ShieldAlert,
    description: 'Exposed AWS S3 bucket discovered: s3://acme-legacy-backups',
    severity: 'high' as const,
    isNew: false,
  },
  {
    id: 4,
    timestamp: '3 hrs ago',
    icon: CheckCircle2,
    description: 'SOC 2 Type II compliance check passed — no deviations',
    severity: 'success' as const,
    isNew: false,
  },
  {
    id: 5,
    timestamp: '5 hrs ago',
    icon: FileWarning,
    description: 'SSL certificate expiring in 14 days for portal.corp.io',
    severity: 'medium' as const,
    isNew: false,
  },
];

const TOP_RISK_ASSETS = [
  { domain: 'api.corp.io', riskScore: 94, findings: 12, lastScan: '12 min ago', category: 'API Gateway' },
  { domain: 'legacy.acme-corp.com', riskScore: 87, findings: 8, lastScan: '45 min ago', category: 'Web Application' },
  { domain: 'staging.corp.io', riskScore: 81, findings: 6, lastScan: '2 hrs ago', category: 'Staging Env' },
  { domain: 'vpn.corp.io', riskScore: 76, findings: 5, lastScan: '1 hr ago', category: 'VPN Gateway' },
  { domain: 'mail.corp.io', riskScore: 69, findings: 4, lastScan: '3 hrs ago', category: 'Mail Server' },
];

const THREAT_MAP_POINTS = [
  { id: 1, x: 18, y: 32, size: 10, severity: 'critical' as const, label: 'New York' },
  { id: 2, x: 22, y: 28, size: 6, severity: 'high' as const, label: 'Toronto' },
  { id: 3, x: 47, y: 25, size: 12, severity: 'critical' as const, label: 'London' },
  { id: 4, x: 50, y: 32, size: 5, severity: 'medium' as const, label: 'Madrid' },
  { id: 5, x: 55, y: 28, size: 7, severity: 'high' as const, label: 'Berlin' },
  { id: 6, x: 72, y: 38, size: 14, severity: 'critical' as const, label: 'Mumbai' },
  { id: 7, x: 78, y: 40, size: 8, severity: 'high' as const, label: 'Singapore' },
  { id: 8, x: 85, y: 35, size: 11, severity: 'critical' as const, label: 'Tokyo' },
  { id: 9, x: 15, y: 62, size: 6, severity: 'medium' as const, label: 'São Paulo' },
  { id: 10, x: 65, y: 62, size: 5, severity: 'low' as const, label: 'Sydney' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// --- Circular Progress Ring ---
function CircularProgressRing({ score, size = 140, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? '#ff3355' : score >= 60 ? '#ff8844' : score >= 40 ? '#ffaa00' : '#00ff88';
  const glowColor = color + '50';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: 'easeOut' as const, delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-bold font-mono text-3xl"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring' as const, stiffness: 200 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#444444]">
          / 100
        </span>
      </div>
    </div>
  );
}

// --- Status Badge ---
function StatusBadge({ status }: { status: 'PASS' | 'WARN' | 'FAIL' }) {
  const config = {
    PASS: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)', text: '#00ff88', icon: ShieldCheck },
    WARN: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)', text: '#ffaa00', icon: AlertTriangle },
    FAIL: { bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.15)', text: '#ff3355', icon: ShieldX },
  };
  const c = config[status];
  const Icon = c.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border"
      style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}

// --- Severity color helper ---
function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#ff3355';
    case 'high': return '#ff8844';
    case 'medium': return '#ffaa00';
    case 'low': return '#00ff88';
    case 'info': return '#44aaff';
    case 'success': return '#00ff88';
    default: return '#64748b';
  }
}

// --- Compliance mini bar ---
function ComplianceBar({ score, status }: { score: number; status: 'PASS' | 'WARN' | 'FAIL' }) {
  const color = status === 'PASS' ? '#00ff88' : status === 'WARN' ? '#ffaa00' : '#ff3355';
  return (
    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.5, ease: 'easeOut' as const, delay: 0.5 }}
      />
    </div>
  );
}

// --- Risk Score color for table ---
function riskScoreColor(score: number): string {
  if (score >= 85) return '#ff3355';
  if (score >= 70) return '#ff8844';
  if (score >= 50) return '#ffaa00';
  return '#00ff88';
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: KPI Hero Row
// ─────────────────────────────────────────────────────────────────────────────

function KPIHeroRow({ stats, onNavigate, mttd, complianceData }: {
  stats: CEODashboardProps['stats'];
  onNavigate: (view: string) => void;
  mttd: string | null;
  complianceData: Record<string, ExecutiveComplianceItem> | null;
}) {
  const attackSurfaceScore = stats ? 100 - stats.avgRiskScore : 87;
  const criticalThreats = stats?.criticalFindings ?? 0;

  // Derive compliance health from real compliance data when available
  let complianceHealth: number | null = null;
  if (complianceData) {
    const scores = Object.values(complianceData)
      .map((c) => c.score)
      .filter((s): s is number => s !== null);
    complianceHealth = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
      {/* Card 1: Attack Surface Score */}
      <motion.div
        variants={itemVariants}
        whileHover={cardHover}
        onClick={() => onNavigate('attack-surface')}
        className="cyber-card relative overflow-hidden cursor-pointer group"
        style={{
          background: 'linear-gradient(135deg, rgba(52,211,153,0.05) 0%, rgba(10,13,20,0.9) 50%, rgba(52,211,153,0.03) 100%)',
          border: '1px solid rgba(52,211,153,0.15)',
        }}
      >
        {/* Glow border effect */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 30px rgba(52,211,153,0.06), 0 0 30px rgba(52,211,153,0.08)' }}
        />
        <div className="relative p-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 w-full">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)' }}>
              <Radar size={18} style={{ color: '#00ff88' }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#444444]">Attack Surface Score</span>
          </div>
          <CircularProgressRing score={attackSurfaceScore} size={130} strokeWidth={7} />
          <div className="flex items-center gap-1.5 text-xs text-[#00ff88]">
            <TrendingUp size={14} />
            <span>↑ 5 from last month</span>
          </div>
        </div>
      </motion.div>

      {/* Card 2: Critical Threats */}
      <motion.div
        variants={itemVariants}
        whileHover={cardHover}
        onClick={() => onNavigate('findings')}
        className="cyber-card relative overflow-hidden cursor-pointer group"
        style={{
          background: 'linear-gradient(135deg, rgba(248,81,73,0.06) 0%, rgba(10,13,20,0.9) 50%, rgba(248,81,73,0.03) 100%)',
          border: '1px solid rgba(248,81,73,0.15)',
        }}
      >
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 30px rgba(248,81,73,0.06), 0 0 30px rgba(248,81,73,0.08)' }}
        />
        <div className="relative p-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 w-full">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,81,73,0.1)' }}>
              <ShieldAlert size={18} style={{ color: '#ff3355' }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#444444]">Critical Threats</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-2">
            <AnimatedCounter target={criticalThreats} duration={1800} color="#ff3355" size="lg" />
            <span className="text-xs text-[#444444]">Active alerts</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#ff3355' }}>
            <ArrowUpRight size={14} />
            <span>↑ 3 this week</span>
          </div>
        </div>
      </motion.div>

      {/* Card 3: Compliance Health */}
      <motion.div
        variants={itemVariants}
        whileHover={cardHover}
        onClick={() => onNavigate('compliance')}
        className="cyber-card relative overflow-hidden cursor-pointer group"
        style={{
          background: 'linear-gradient(135deg, rgba(88,166,255,0.05) 0%, rgba(10,13,20,0.9) 50%, rgba(88,166,255,0.03) 100%)',
          border: '1px solid rgba(88,166,255,0.15)',
        }}
      >
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 30px rgba(88,166,255,0.06), 0 0 30px rgba(88,166,255,0.08)' }}
        />
        <div className="relative p-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 w-full">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(88,166,255,0.1)' }}>
              <ShieldCheck size={18} style={{ color: '#58a6ff' }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#444444]">Compliance Health</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-2">
            {complianceHealth !== null ? (
              <AnimatedCounter target={complianceHealth} duration={1800} color="#58a6ff" size="lg" suffix="%" />
            ) : (
              <span className="text-5xl font-bold font-mono" style={{ color: '#444444' }}>—</span>
            )}
            <span className="text-xs text-[#444444]">Overall score</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {(complianceData ? Object.keys(complianceData) : ['SOC2', 'HIPAA', 'PCI']).slice(0, 3).map((key) => (
              <span
                key={key}
                className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                style={{
                  background: 'rgba(88,166,255,0.1)',
                  color: '#58a6ff',
                  border: '1px solid rgba(88,166,255,0.2)',
                }}
              >
                {FRAMEWORK_LABELS[key] || key.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Card 4: Mean Time to Detect */}
      <motion.div
        variants={itemVariants}
        whileHover={cardHover}
        className="cyber-card relative overflow-hidden cursor-pointer group"
        style={{
          background: 'linear-gradient(135deg, rgba(52,211,153,0.05) 0%, rgba(10,13,20,0.9) 50%, rgba(168,85,247,0.04) 100%)',
          border: '1px solid rgba(52,211,153,0.12)',
        }}
      >
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 30px rgba(52,211,153,0.06), 0 0 30px rgba(168,85,247,0.06)' }}
        />
        <div className="relative p-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 w-full">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)' }}>
              <Zap size={18} style={{ color: '#00ff88' }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#444444]">Mean Time to Detect</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="flex items-baseline gap-1">
              {mttd ? (
                <>
                  <span className="text-5xl font-bold font-mono" style={{ color: '#00ff88' }}>
                    {mttd.split(' ')[0]}
                  </span>
                  <span className="text-lg font-semibold text-[#444444]">{mttd.split(' ').slice(1).join(' ')}</span>
                </>
              ) : (
                <span className="text-5xl font-bold font-mono" style={{ color: '#444444' }}>—</span>
              )}
            </div>
            <span className="text-xs text-[#444444]">Detection latency</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#444444]">
            {mttd ? (
              <>
                <TrendingUp size={14} style={{ color: '#00ff88' }} />
                <span style={{ color: '#00ff88' }}>Real scan data</span>
              </>
            ) : (
              <span>Pending scan data</span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Risk Trend Chart
// ─────────────────────────────────────────────────────────────────────────────

function RiskTrendChart({ riskTrend }: { riskTrend: { date: string; score: number }[] | null }) {
  // Empty state: no scan data yet
  if (!riskTrend || riskTrend.length === 0) {
    return (
      <motion.div
        variants={itemVariants}
        className="cyber-card overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(52,211,153,0.03) 0%, rgba(10,13,20,0.95) 100%)',
          border: '1px solid rgba(52,211,153,0.1)',
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} style={{ color: '#00ff88' }} />
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#f0f0f0]">Risk Score Trend</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity size={40} style={{ color: 'rgba(52,211,153,0.2)' }} />
            <p className="text-sm text-[#444444] font-medium">No scan data yet</p>
            <p className="text-xs text-[#444444]/60">Run a scan to see your risk score trend over time.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Derive data from real riskTrend
  const data = riskTrend.map((d) => d.score);
  const labels = riskTrend.map((d) => {
    const dt = new Date(d.date);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  });

  const width = 700;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minVal = Math.min(...data) - 5;
  const maxVal = Math.max(...data) + 5;

  const points = data.map((v, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding.top + (1 - (v - minVal) / (maxVal - minVal)) * chartH,
  }));

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const y = padding.top + frac * chartH;
    const val = Math.round(maxVal - frac * (maxVal - minVal));
    return { y, val };
  });

  // Pick up to 5 evenly-spaced x-axis labels
  const labelCount = Math.min(5, data.length);
  const xLabelIndices = Array.from({ length: labelCount }, (_, i) =>
    data.length === 1 ? 0 : Math.round((i / (labelCount - 1)) * (data.length - 1))
  );
  const xLabels = xLabelIndices.map((i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    label: labels[i],
  }));

  return (
    <motion.div
      variants={itemVariants}
      className="cyber-card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(52,211,153,0.03) 0%, rgba(10,13,20,0.95) 100%)',
        border: '1px solid rgba(52,211,153,0.1)',
      }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} style={{ color: '#00ff88' }} />
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#f0f0f0]">Risk Score Trend</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#444444]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: '#00ff88' }} />
              <span>Risk Score</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#444444]">{data.length} data point{data.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#00ff88" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#00ff88" stopOpacity="1" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {gridLines.map((g) => (
            <g key={g.y}>
              <line
                x1={padding.left}
                y1={g.y}
                x2={padding.left + chartW}
                y2={g.y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={g.y + 4}
                textAnchor="end"
                fill="#444444"
                fontSize="10"
                fontFamily="monospace"
              >
                {g.val}
              </text>
            </g>
          ))}

          {/* X labels */}
          {xLabels.map((xl) => (
            <text
              key={xl.x}
              x={xl.x}
              y={height - 10}
              textAnchor="middle"
              fill="#444444"
              fontSize="10"
              fontFamily="monospace"
            >
              {xl.label}
            </text>
          ))}

          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill="url(#areaGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
          />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, ease: 'easeInOut' as const, delay: 0.3 }}
          />

          {/* End dot */}
          <motion.circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill="#00ff88"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.5, type: 'spring' as const }}
          />
          <motion.circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="8"
            fill="none"
            stroke="#00ff88"
            strokeWidth="1.5"
            opacity="0.4"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.4, scale: 1 }}
            transition={{ delay: 2.5, type: 'spring' as const }}
          />
        </svg>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Security Posture Matrix
// ─────────────────────────────────────────────────────────────────────────────

function SecurityPostureMatrix({ compliance }: { compliance: Record<string, ExecutiveComplianceItem> | null }) {
  // Build the display items from real compliance data or show pending state
  const items = FRAMEWORK_KEYS.map((fwKey) => {
    const fw = compliance?.[fwKey];
    return {
      key: fwKey,
      framework: FRAMEWORK_LABELS[fwKey] || fwKey,
      score: fw?.score ?? null,
      status: fw?.status ? (fw.status.toUpperCase() as 'PASS' | 'WARN' | 'FAIL') : null,
    };
  });

  return (
    <motion.div
      variants={itemVariants}
      className="cyber-card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(88,166,255,0.03) 0%, rgba(10,13,20,0.95) 100%)',
        border: '1px solid rgba(88,166,255,0.1)',
      }}
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={18} style={{ color: '#58a6ff' }} />
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#f0f0f0]">Security Posture Matrix</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item, idx) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.08 }}
              className="rounded-lg p-4 group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#f0f0f0]">{item.framework}</span>
                {item.status ? (
                  <StatusBadge status={item.status} />
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border"
                    style={{ backgroundColor: 'rgba(139,148,158,0.1)', borderColor: 'rgba(139,148,158,0.2)', color: '#444444' }}
                  >
                    Pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2.5">
                {item.score !== null ? (
                  <span
                    className="text-2xl font-bold font-mono"
                    style={{ color: item.status === 'PASS' ? '#00ff88' : item.status === 'FAIL' ? '#ff3355' : '#ffaa00' }}
                  >
                    {item.score}%
                  </span>
                ) : (
                  <span className="text-2xl font-bold font-mono" style={{ color: '#444444' }}>—</span>
                )}
              </div>
              {item.score !== null && item.status ? (
                <ComplianceBar score={item.score} status={item.status} />
              ) : (
                <div className="w-full h-1.5 rounded-full bg-white/5" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Recent Activity Feed
// ─────────────────────────────────────────────────────────────────────────────

function RecentActivityFeed() {
  return (
    <motion.div
      variants={itemVariants}
      className="cyber-card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.03) 0%, rgba(10,13,20,0.95) 100%)',
        border: '1px solid rgba(168,85,247,0.1)',
      }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: '#888888' }} />
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#f0f0f0]">Recent Activity</h3>
          </div>
          <motion.span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(168,85,247,0.15)', color: '#888888', border: '1px solid rgba(168,85,247,0.25)' }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ● LIVE
          </motion.span>
        </div>

        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {ACTIVITY_FEED.map((event, idx) => {
            const Icon = event.icon;
            const color = severityColor(event.severity);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + idx * 0.1 }}
                className="relative flex gap-4 py-3 group cursor-pointer"
              >
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0">
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: `${color}15`,
                      border: `2px solid ${color}40`,
                    }}
                    animate={event.isNew ? {
                      boxShadow: [`0 0 0px ${color}`, `0 0 12px ${color}`, `0 0 0px ${color}`],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Icon size={16} style={{ color }} />
                  </motion.div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm text-[#f0f0f0] leading-relaxed group-hover:text-white transition-colors">
                    {event.description}
                  </p>
                  <span className="text-xs text-[#444444] mt-1 block">{event.timestamp}</span>
                </div>

                {/* Severity indicator */}
                <div className="flex-shrink-0 pt-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Top Risk Assets
// ─────────────────────────────────────────────────────────────────────────────

function TopRiskAssets({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <motion.div
      variants={itemVariants}
      className="cyber-card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.03) 0%, rgba(10,13,20,0.95) 100%)',
        border: '1px solid rgba(249,115,22,0.1)',
      }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Target size={18} style={{ color: '#ff8844' }} />
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#f0f0f0]">Top Risk Assets</h3>
          </div>
          <button
            onClick={() => onNavigate('findings')}
            className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-[#ff8844]"
            style={{ color: '#444444' }}
          >
            View All <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#444444] border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="col-span-4">Domain</div>
            <div className="col-span-2 text-center">Risk Score</div>
            <div className="col-span-2 text-center">Findings</div>
            <div className="col-span-3 text-right">Last Scan</div>
            <div className="col-span-1" />
          </div>

          {TOP_RISK_ASSETS.map((asset, idx) => {
            const scoreColor = riskScoreColor(asset.riskScore);
            return (
              <motion.div
                key={asset.domain}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + idx * 0.08 }}
                onClick={() => onNavigate('findings')}
                className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 group hover:scale-[1.01]"
                style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid transparent',
                }}
                whileHover={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: `${scoreColor}20`,
                }}
              >
                {/* Domain */}
                <div className="col-span-4 min-w-0">
                  <p className="text-sm font-semibold text-[#f0f0f0] truncate group-hover:text-white transition-colors">
                    {asset.domain}
                  </p>
                  <p className="text-[10px] text-[#444444] mt-0.5">{asset.category}</p>
                </div>

                {/* Risk Score */}
                <div className="col-span-2 flex justify-center">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold font-mono"
                    style={{
                      background: `${scoreColor}12`,
                      color: scoreColor,
                      border: `1px solid ${scoreColor}25`,
                    }}
                  >
                    {asset.riskScore}
                  </span>
                </div>

                {/* Findings */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-mono text-[#f0f0f0]">{asset.findings}</span>
                </div>

                {/* Last Scan */}
                <div className="col-span-3 text-right">
                  <span className="text-xs text-[#444444]">{asset.lastScan}</span>
                </div>

                {/* Action */}
                <div className="col-span-1 flex justify-end">
                  <motion.div
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    whileHover={{ scale: 1.2 }}
                  >
                    <ExternalLink size={14} style={{ color: '#444444' }} />
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section: Global Threat Map Mini
// ─────────────────────────────────────────────────────────────────────────────

function GlobalThreatMapMini() {
  // Simplified world map outline using a path
  const worldOutlinePath = [
    // North America
    'M 12,22 L 16,18 L 22,18 L 26,20 L 24,24 L 28,26 L 26,30 L 24,32 L 20,34 L 18,32 L 16,30 L 14,28 L 12,26 Z',
    // South America
    'M 22,42 L 24,40 L 26,42 L 27,46 L 26,50 L 24,54 L 22,56 L 20,54 L 19,50 L 20,46 Z',
    // Europe
    'M 44,18 L 46,16 L 50,16 L 54,18 L 52,22 L 48,24 L 44,22 Z',
    // Africa
    'M 46,28 L 50,26 L 54,28 L 56,32 L 58,36 L 56,42 L 52,46 L 48,44 L 46,40 L 44,36 L 44,32 Z',
    // Asia
    'M 56,16 L 62,14 L 68,16 L 74,18 L 78,20 L 82,18 L 86,20 L 84,24 L 80,26 L 76,28 L 72,26 L 68,28 L 64,26 L 60,24 L 56,22 Z',
    // Australia
    'M 78,42 L 82,40 L 86,42 L 88,44 L 86,48 L 82,50 L 78,48 L 76,46 Z',
    // Japan/Korea
    'M 82,20 L 84,18 L 86,20 L 85,24 L 82,22 Z',
    // Indonesia
    'M 76,38 L 80,36 L 84,38 L 82,40 L 78,40 Z',
  ].join(' ');

  return (
    <motion.div
      variants={itemVariants}
      className="cyber-card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(248,81,73,0.03) 0%, rgba(10,13,20,0.95) 100%)',
        border: '1px solid rgba(248,81,73,0.1)',
      }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} style={{ color: '#ff3355' }} />
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#f0f0f0]">Global Threat Map</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#ff3355]" />
              <span className="text-[#444444]">Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#ff8844]" />
              <span className="text-[#444444]">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#ffaa00]" />
              <span className="text-[#444444]">Medium</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <svg viewBox="0 0 100 65" className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid overlay */}
            {Array.from({ length: 7 }).map((_, i) => (
              <line
                key={`hg${i}`}
                x1="0"
                y1={i * 10 + 5}
                x2="100"
                y2={i * 10 + 5}
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="0.3"
              />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`vg${i}`}
                x1={i * 10}
                y1="0"
                x2={i * 10}
                y2="65"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="0.3"
              />
            ))}

            {/* World outline */}
            <motion.path
              d={worldOutlinePath}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, ease: 'easeOut' as const }}
            />

            {/* Connection lines between some threat points */}
            <motion.line
              x1={THREAT_MAP_POINTS[0].x}
              y1={THREAT_MAP_POINTS[0].y}
              x2={THREAT_MAP_POINTS[2].x}
              y2={THREAT_MAP_POINTS[2].y}
              stroke="rgba(248,81,73,0.1)"
              strokeWidth="0.3"
              strokeDasharray="1,1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            />
            <motion.line
              x1={THREAT_MAP_POINTS[2].x}
              y1={THREAT_MAP_POINTS[2].y}
              x2={THREAT_MAP_POINTS[7].x}
              y2={THREAT_MAP_POINTS[7].y}
              stroke="rgba(248,81,73,0.08)"
              strokeWidth="0.3"
              strokeDasharray="1,1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            />
            <motion.line
              x1={THREAT_MAP_POINTS[5].x}
              y1={THREAT_MAP_POINTS[5].y}
              x2={THREAT_MAP_POINTS[6].x}
              y2={THREAT_MAP_POINTS[6].y}
              stroke="rgba(248,81,73,0.08)"
              strokeWidth="0.3"
              strokeDasharray="1,1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            />

            {/* Threat dots */}
            {THREAT_MAP_POINTS.map((point, idx) => {
              const color = severityColor(point.severity);
              return (
                <g key={point.id}>
                  {/* Outer pulse ring */}
                  {point.severity === 'critical' && (
                    <motion.circle
                      cx={point.x}
                      cy={point.y}
                      r={point.size * 0.8}
                      fill="none"
                      stroke={color}
                      strokeWidth="0.3"
                      initial={{ opacity: 0, r: point.size * 0.3 }}
                      animate={{
                        opacity: [0, 0.6, 0],
                        r: [point.size * 0.3, point.size * 1.2, point.size * 0.3],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: idx * 0.2,
                      }}
                    />
                  )}

                  {/* Glow */}
                  <motion.circle
                    cx={point.x}
                    cy={point.y}
                    r={point.size * 0.5}
                    fill={color}
                    opacity={0.15}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                  />

                  {/* Core dot */}
                  <motion.circle
                    cx={point.x}
                    cy={point.y}
                    r={point.size * 0.25}
                    fill={color}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.5 + idx * 0.1,
                      type: 'spring' as const,
                      stiffness: 300,
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Stats overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono" style={{
              background: 'rgba(248,81,73,0.15)',
              color: '#ff3355',
              border: '1px solid rgba(248,81,73,0.25)',
            }}>
              {THREAT_MAP_POINTS.filter(p => p.severity === 'critical').length} CRITICAL
            </div>
            <div className="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono" style={{
              background: 'rgba(249,115,22,0.15)',
              color: '#ff8844',
              border: '1px solid rgba(249,115,22,0.25)',
            }}>
              {THREAT_MAP_POINTS.filter(p => p.severity === 'high').length} HIGH
            </div>
          </div>

          {/* Active scanning indicator */}
          <motion.div
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
            <span className="text-[10px] font-bold text-[#00ff88]">SCANNING</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component: CEODashboard
// ─────────────────────────────────────────────────────────────────────────────

export function CEODashboard({ stats, recentScans, onNavigate }: CEODashboardProps) {
  // Fetch executive-specific data from /api/executive
  const [execData, setExecData] = useState<ExecutiveData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/executive');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setExecData({
            overview: json.overview ?? null,
            riskTrend: json.riskTrend ?? [],
            compliance: json.compliance ?? {},
            topAssets: json.topAssets ?? [],
            recentActivity: json.recentActivity ?? [],
          });
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const mttd = execData?.overview?.mttd ?? null;
  const riskTrend = execData?.riskTrend ?? null;
  const complianceData = execData?.compliance ?? null;

  return (
    <div className="min-h-screen" style={{ background: '#0a0d14' }}>
      {/* Subtle background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(52,211,153,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(52,211,153,1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Ambient gradient blobs */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #00ff88, transparent 70%)' }}
      />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.02]"
        style={{ background: 'radial-gradient(circle, #888888, transparent 70%)' }}
      />

      <motion.div
        className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))',
              border: '1px solid rgba(52,211,153,0.2)',
            }}>
              <Eye size={24} style={{ color: '#00ff88' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#f0f0f0] tracking-tight">
                Executive Dashboard
              </h1>
              <p className="text-sm text-[#444444] mt-0.5">
                Attack surface intelligence · Real-time threat overview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.15)',
              }}
              whileHover={{ scale: 1.03 }}
            >
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-xs font-semibold text-[#00ff88]">System Online</span>
            </motion.div>
            <motion.button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e6edf3',
              }}
              whileHover={{ background: 'rgba(255,255,255,0.08)', scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('scans')}
            >
              <Scan size={14} />
              New Scan
            </motion.button>
          </div>
        </motion.div>

        {/* Quick Stats Bar */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
          {[
            { label: 'Total Scans', value: stats?.totalScans ?? 0, color: '#00ff88' },
            { label: 'Findings', value: stats?.totalFindings ?? 0, color: '#ff8844' },
            { label: 'Risk Avg', value: `${stats?.avgRiskScore ?? 0}`, color: '#ffaa00' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className="text-xs text-[#444444]">{item.label}</span>
              <span className="text-sm font-bold font-mono" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
          ))}
        </motion.div>

        {/* KPI Hero Row */}
          <KPIHeroRow stats={stats} onNavigate={onNavigate} mttd={mttd} complianceData={complianceData} />

        {/* Risk Trend Chart */}
        <RiskTrendChart riskTrend={riskTrend} />

        {/* Two-column layout: Security Posture + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SecurityPostureMatrix compliance={complianceData} />
          <RecentActivityFeed />
        </div>

        {/* Two-column layout: Top Risk Assets + Threat Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopRiskAssets onNavigate={onNavigate} />
          <GlobalThreatMapMini />
        </div>

        {/* Footer */}
        <motion.div
          variants={itemVariants}
          className="text-center py-4"
        >
          <p className="text-xs text-[#444444]/50">
            ReconPro Attack Surface Management · Executive Overview · Data refreshed in real-time
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
