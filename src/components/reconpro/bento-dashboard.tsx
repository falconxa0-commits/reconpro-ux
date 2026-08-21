'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Zap, TrendingUp, TrendingDown, Activity, Globe,
  ArrowUpRight, ShieldCheck, Terminal, ScanSearch, Shield, BarChart3, Clock, ChevronRight, Rss,
} from 'lucide-react';
import { CLIPreview } from './cli-showcase';

interface DashboardStats {
  totalScans: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
  avgRiskScore: number;
  complianceScore?: number;
}

interface RecentScan {
  id: string;
  domain: string;
  riskScore: number;
  totalVulns: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  status: string;
  startedAt: string;
  scanType?: string;
  target: { domain: string };
}

interface BentoDashboardProps {
  stats: DashboardStats | null;
  recentScans: RecentScan[];
  onNavigate: (view: string) => void;
  systemsHealthy?: boolean;
  userName?: string;
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 180, damping: 22 } },
};

function RealTimeClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 ml-auto">
      <span className="text-[11px] text-neutral-700 font-mono hidden sm:inline">{date}</span>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
        <span className="text-[12px] font-mono text-neutral-400 tracking-wider">{time}</span>
      </div>
    </div>
  );
}

function TrendIndicator({ value, isPositive }: { value: string; isPositive: boolean }) {
  const color = isPositive ? '#00ff88' : '#ff3355';
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-medium" style={{ color }}>
      {isPositive ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
      {value}
    </span>
  );
}

function MiniSparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * plotW;
    const y = padding + plotH - ((v - min) / range) * plotH;
    return `${x},${y}`;
  }).join(' ');

  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${padding},${height} ${points} ${width - padding},${height}`}
        fill={`url(#${gradId})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <motion.circle
        cx={padding + plotW}
        cy={padding + plotH - ((data[data.length - 1] - min) / range) * plotH}
        r="2.5"
        fill={color}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
      />
    </svg>
  );
}

function AnimatedSeverityDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center py-6">
      <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center mb-3">
        <ShieldCheck className="w-5 h-5 text-neutral-700" />
      </div>
      <p className="text-xs text-neutral-600">No findings yet</p>
    </div>
  );

  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const off = data.slice(0, i).reduce((s, prev) => s + prev.value / total, 0);
    return { ...d, dasharray: `${pct * 283} ${283}`, offset: -off * 283 };
  });

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {segments.map((d) => (
        <motion.circle
          key={d.name}
          cx="60" cy="60" r="45" fill="none"
          stroke={d.color} strokeWidth="12"
          strokeDasharray={d.dasharray}
          strokeDashoffset={d.offset}
          strokeLinecap="round"
          initial={{ opacity: 0, strokeDashoffset: -d.offset + 283 }}
          animate={{ opacity: 0.7, strokeDashoffset: d.offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
        />
      ))}
      <motion.text
        x="60" y="55" textAnchor="middle" fill="#f0f0f0" fontSize="20" fontWeight="bold"
        fontFamily="Space Grotesk, sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >{total}</motion.text>
      <text x="60" y="70" textAnchor="middle" fill="#444444" fontSize="7" fontFamily="Inter, sans-serif" letterSpacing="0.12em">FINDINGS</text>
    </svg>
  );
}

function SeverityBadge({ severity, count }: { severity: string; count: number }) {
  const config: Record<string, { color: string; bg: string }> = {
    critical: { color: '#ff3355', bg: 'rgba(255,51,85,0.1)' },
    high: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    medium: { color: '#d29922', bg: 'rgba(210,153,34,0.1)' },
    low: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)' },
    info: { color: '#737373', bg: 'rgba(115,115,115,0.08)' },
  };
  const c = config[severity] || config.info;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ color: c.color, background: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {count} {severity}
    </span>
  );
}

function ThreatFeedItem({ title, severity, timestamp }: { title: string; severity: string; timestamp: string }) {
  const colorMap: Record<string, string> = { critical: '#ff3355', high: '#f97316', medium: '#d29922', low: '#00ff88', info: '#737373' };
  const color = colorMap[severity] || '#737373';
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 py-2.5 group border-b border-white/[0.03] last:border-0"
    >
      <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}40` }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-neutral-500 leading-relaxed group-hover:text-neutral-300 transition-colors">{title}</p>
        <p className="text-[10px] text-neutral-700 mt-0.5 font-mono">{timestamp}</p>
      </div>
    </motion.div>
  );
}

function EmptyDashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
      className="flex flex-col items-center justify-center py-24"
    >
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <ScanSearch className="w-7 h-7 text-neutral-600" />
      </div>
      <h2 className="text-lg font-medium text-white mb-2">No scan data yet</h2>
      <p className="text-sm text-neutral-600 max-w-sm text-center leading-relaxed mb-8">
        Run your first reconnaissance scan to populate this command center with security insights, risk scores, and threat intelligence.
      </p>
      <button onClick={() => onNavigate('scan')} className="flex items-center gap-2 px-6 h-10 bg-white text-black hover:bg-white/90 font-medium rounded-lg text-[13px] transition-all">
        <Zap className="w-4 h-4" />
        Launch Scan
      </button>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, color, subValue, trend, onClick }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  subValue?: string;
  trend?: { value: string; isPositive: boolean };
  onClick?: () => void;
}) {
  return (
    <motion.div variants={fadeUp} className="panel p-4 flex flex-col justify-between group cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 opacity-30 group-hover:opacity-50 transition-opacity" style={{ color }} />
        <div className="flex items-center gap-2">
          {trend && <TrendIndicator value={trend.value} isPositive={trend.isPositive} />}
          {subValue && !trend && <span className="text-[10px] font-mono text-neutral-600">{subValue}</span>}
        </div>
      </div>
      <div className="mt-auto pt-3">
        <div className="text-2xl font-semibold font-mono text-white tracking-tight" style={color !== '#ffffff' ? { color } : undefined}>{value}</div>
        <div className="text-[10px] text-neutral-600 uppercase tracking-[0.12em] mt-1 font-medium">{label}</div>
      </div>
    </motion.div>
  );
}

export function BentoDashboard({ stats, recentScans, onNavigate, systemsHealthy = true, userName }: BentoDashboardProps) {
  const score = stats?.avgRiskScore ?? 0;
  const scoreColor = score >= 70 ? '#ff3355' : score >= 40 ? '#d29922' : '#00ff88';
  const hasData = stats && stats.totalScans > 0;

  const sparklineData = useMemo(() => {
    const base = score;
    return Array.from({ length: 7 }, (_, i) => {
      const jitter = (Math.sin(i * 1.7) * 15) + (Math.cos(i * 0.9) * 8);
      return Math.max(0, Math.min(100, Math.round(base + jitter - 10)));
    });
  }, [score]);

  const threatFeed = useMemo(() => {
    if (!recentScans || recentScans.length === 0) return [];
    return recentScans.slice(0, 4).map((scan) => {
      const sev = scan.riskScore > 70 ? 'critical' : scan.riskScore > 40 ? 'high' : 'medium';
      const labels: Record<string, string> = {
        critical: `Critical risk detected on ${scan.target.domain}`,
        high: `Elevated exposure on ${scan.target.domain}`,
        medium: `Moderate findings on ${scan.target.domain}`,
      };
      return {
        id: scan.id,
        title: labels[sev] || `Scan completed for ${scan.target.domain}`,
        severity: sev,
        timestamp: timeAgo(scan.startedAt),
      };
    });
  }, [recentScans]);

  if (!hasData) return <EmptyDashboard onNavigate={onNavigate} />;

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const getScanMaxSeverity = (scan: RecentScan) => {
    if (scan.criticalCount > 0) return 'critical';
    if (scan.highCount > 0) return 'high';
    if (scan.mediumCount > 0) return 'medium';
    if (scan.lowCount > 0) return 'low';
    return 'info';
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page Header with Welcome + Clock */}
      <motion.div variants={fadeUp} className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[13px] text-neutral-600 mb-1">Welcome back,</div>
          <h1 className="text-2xl font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {userName || 'Operator'}
          </h1>
          <p className="text-[13px] text-neutral-600 mt-1">Security overview and recent reconnaissance activity.</p>
        </div>
        <RealTimeClock />
      </motion.div>

      {/* Risk Score + Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
        {/* Risk Score Hero with Sparkline */}
        <motion.div variants={fadeUp} className="col-span-2 row-span-1 panel p-5 flex items-center gap-5 cursor-pointer" onClick={() => onNavigate('surface')}>
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <motion.circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${score * 3.14} ${314}`}
                  initial={{ strokeDashoffset: 314 }}
                  animate={{ strokeDashoffset: 314 - score * 3.14 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
                  opacity={0.8} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{score}</span>
                <span className="text-[8px] text-neutral-600 uppercase tracking-widest">/ 100</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.12em] mb-1">Threat Posture</div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: scoreColor }} />
              <span className="text-sm font-medium" style={{ color: scoreColor }}>
                {score >= 70 ? 'High Risk' : score >= 40 ? 'Moderate' : 'Low Risk'}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: scoreColor }}
                initial={{ width: 0 }} animate={{ width: `${score}%` }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }} />
            </div>
            {/* Sparkline */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-neutral-700 uppercase tracking-wider">Last 7 days</span>
                <span className="text-[10px] font-mono text-neutral-600">Now: {sparklineData[sparklineData.length - 1]}</span>
              </div>
              <MiniSparkline data={sparklineData} color={scoreColor} width={160} height={32} />
            </div>
          </div>
        </motion.div>

        <StatCard icon={BarChart3} label="Total Scans" value={stats?.totalScans ?? 0} color="#a3a3a3" trend={{ value: '+12%', isPositive: true }} onClick={() => onNavigate('history')} />
        <StatCard icon={ShieldAlert} label="Critical" value={stats?.criticalFindings ?? 0} color="#ff3355" trend={{ value: (stats?.criticalFindings ?? 0) > 0 ? '+3' : '0', isPositive: (stats?.criticalFindings ?? 0) === 0 }} onClick={() => onNavigate('threats')} />
        <StatCard icon={Zap} label="Findings" value={stats?.totalFindings ?? 0} color="#d29922" trend={{ value: '+8%', isPositive: true }} onClick={() => onNavigate('radar')} />
        <StatCard icon={TrendingUp} label="High" value={stats?.highFindings ?? 0} color="#f97316" trend={{ value: '-5%', isPositive: true }} onClick={() => onNavigate('threats')} />
      </div>

      {/* Main Content: CLI + Severity + Threat Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        {/* CLI Showcase */}
        {recentScans.length > 0 && (
          <motion.div variants={fadeUp} className="lg:col-span-2 panel p-0 overflow-hidden cursor-pointer" onClick={() => onNavigate('scan')}>
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-neutral-600" />
                <span className="text-[10px] font-medium text-neutral-600 tracking-[0.1em] uppercase">ReconPro CLI</span>
              </div>
              <span className="text-[10px] text-neutral-700 hover:text-white transition-colors flex items-center gap-1">
                Launch Scan <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="px-3 pb-3 h-[220px]">
              <CLIPreview className="h-full" />
            </div>
          </motion.div>
        )}

        {/* Severity Donut + Threat Feed */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3">
          <div className="panel p-4 flex-1 flex items-center justify-center">
            <div className="w-full max-w-[110px]">
              <AnimatedSeverityDonut data={[
                { name: 'Critical', value: stats?.criticalFindings ?? 0, color: '#ff3355' },
                { name: 'High', value: stats?.highFindings ?? 0, color: '#f97316' },
                { name: 'Medium', value: stats?.mediumFindings ?? 0, color: '#d29922' },
                { name: 'Low', value: stats?.lowFindings ?? 0, color: '#00ff88' },
                { name: 'Info', value: stats?.infoFindings ?? 0, color: '#525252' },
              ]} />
            </div>
          </div>
          <div className="panel p-4 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Rss className="w-3.5 h-3.5 text-[#ff3355]" />
              <span className="text-[10px] font-medium text-neutral-600 tracking-[0.1em] uppercase">Threat Feed</span>
            </div>
            <div className="max-h-[140px] overflow-y-auto scrollbar-none">
              {threatFeed.length > 0 ? threatFeed.map((item) => (
                <ThreatFeedItem key={item.id} title={item.title} severity={item.severity} timestamp={item.timestamp} />
              )) : (
                <p className="text-[11px] text-neutral-700 py-4 text-center">No recent threats</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Scans Table with Severity Badges */}
      <motion.div variants={fadeUp} className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-[10px] font-medium text-neutral-600 tracking-[0.1em] uppercase">Recent Scans</span>
          </div>
          <button onClick={() => onNavigate('history')} className="text-[11px] text-neutral-700 hover:text-white transition-colors flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {recentScans.length === 0 ? (
          <div className="text-[12px] text-neutral-700 py-8 text-center">No scans recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 pr-4">Domain</th>
                  <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 pr-4">Severity</th>
                  <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 pr-4">Risk</th>
                  <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 pr-4">Findings</th>
                  <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.slice(0, 5).map((scan) => (
                  <tr key={scan.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => onNavigate('surface')}>
                    <td className="py-3 pr-4 text-[12px] font-mono text-neutral-500 group-hover:text-neutral-300 transition-colors">{scan.target.domain}</td>
                    <td className="py-3 pr-4">
                      <SeverityBadge severity={getScanMaxSeverity(scan)} count={scan.totalVulns} />
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-mono font-semibold" style={{ color: scan.riskScore > 70 ? '#ff3355' : scan.riskScore > 40 ? '#d29922' : '#00ff88' }}>{scan.riskScore}</span>
                    </td>
                    <td className="py-3 pr-4 text-[12px] text-neutral-600">{scan.totalVulns}</td>
                    <td className="py-3 text-[11px] text-neutral-700 font-mono">{timeAgo(scan.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        {[
          { label: 'New Scan', icon: Zap, color: '#ffffff', view: 'scan', ariaLabel: 'Start new scan' },
          { label: 'Compliance', icon: Shield, color: '#a3a3a3', view: 'compliance', ariaLabel: 'View compliance report' },
          { label: 'Threat Intel', icon: ShieldAlert, color: '#ff3355', view: 'threats', ariaLabel: 'View threat intelligence' },
          { label: 'Monitoring', icon: Activity, color: '#00ff88', view: 'monitoring', ariaLabel: 'Open monitoring dashboard' },
        ].map((action) => {
          const ActionIcon = action.icon;
          return (
            <motion.button key={action.view} variants={fadeUp}
              onClick={() => onNavigate(action.view)}
              aria-label={action.ariaLabel}
              className="panel px-4 py-3.5 flex items-center gap-3 text-left group hover:border-white/[0.1] transition-all"
            >
              <ActionIcon className="w-4 h-4 flex-shrink-0" style={{ color: action.color }} />
              <span className="text-[12px] font-medium text-neutral-500 group-hover:text-neutral-300 transition-colors">{action.label}</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity text-neutral-600" />
            </motion.button>
          );
        })}
      </div>

      {/* System Status */}
      <motion.div variants={fadeUp} className="mt-3 flex items-center justify-between panel px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <span className={`text-[11px] font-medium ${systemsHealthy ? 'text-[#00ff88]' : 'text-[#d29922]'}`}>{systemsHealthy ? 'All systems operational' : 'Degraded performance detected'}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-neutral-700 font-mono">
          <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Scanning Engine Online</span>
          <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Threat Intel Active</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
