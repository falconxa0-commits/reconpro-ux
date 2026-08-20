'use client';

import { motion } from 'framer-motion';
import {
  ShieldAlert, Zap, TrendingUp, Activity, Globe,
  ArrowUpRight, ShieldCheck, Terminal, ScanSearch, Shield, BarChart3, Clock, ChevronRight,
} from 'lucide-react';
import { AnimatedCounter } from './animated-counter';
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
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 180, damping: 22 } },
};

function SeverityDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
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
        <circle key={d.name} cx="60" cy="60" r="45" fill="none"
          stroke={d.color} strokeWidth="12" strokeDasharray={d.dasharray}
          strokeDashoffset={d.offset} strokeLinecap="round" opacity={0.7} />
      ))}
      <text x="60" y="55" textAnchor="middle" fill="#f0f0f0" fontSize="20" fontWeight="bold" fontFamily="Space Grotesk, sans-serif">{total}</text>
      <text x="60" y="70" textAnchor="middle" fill="#444444" fontSize="7" fontFamily="Inter, sans-serif" letterSpacing="0.12em">FINDINGS</text>
    </svg>
  );
}

function ActivityItem({ text, time, dotColor }: { text: string; time: string; dotColor: string }) {
  return (
    <div className="flex items-start gap-3 py-2 group">
      <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ background: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-neutral-600 leading-relaxed truncate group-hover:text-neutral-400 transition-colors">{text}</p>
        <p className="text-[10px] text-neutral-700 mt-0.5 font-mono">{time}</p>
      </div>
    </div>
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
function StatCard({ icon: Icon, label, value, color, subValue, onClick }: {
  icon: React.ElementType;
  label: string;  value: number | string;  color: string;  subValue?: string;  onClick?: () => void;
}) {
  return (
    <motion.div variants={fadeUp} className="panel p-4 flex flex-col justify-between group cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 opacity-30 group-hover:opacity-50 transition-opacity" style={{ color }} />
        {subValue && <span className="text-[10px] font-mono text-neutral-600">{subValue}</span>}
      </div>
      <div className="mt-auto pt-3">
        <div className="text-2xl font-semibold font-mono text-white tracking-tight" style={color !== '#ffffff' ? { color } : undefined}>{value}</div>
        <div className="text-[10px] text-neutral-600 uppercase tracking-[0.12em] mt-1 font-medium">{label}</div>
      </div>
    </motion.div>
  );
}

export function BentoDashboard({ stats, recentScans, onNavigate, systemsHealthy = true }: BentoDashboardProps) {
  const score = stats?.avgRiskScore ?? 0;
  const scoreColor = score >= 70 ? '#ff3355' : score >= 40 ? '#d29922' : '#00ff88';
  const hasData = stats && stats.totalScans > 0;

  if (!hasData) return <EmptyDashboard onNavigate={onNavigate} />;

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-neutral-600 mt-1">Security overview and recent reconnaissance activity.</p>
      </motion.div>

      {/* Risk Score + Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
        {/* Risk Score Hero */}
        <motion.div variants={fadeUp} className="col-span-2 row-span-1 panel p-5 flex items-center gap-5 cursor-pointer" onClick={() => onNavigate('surface')}>
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${score * 3.14} ${314}`} opacity={0.8} />
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
            <p className="text-[11px] text-neutral-600 mt-1.5">
              {score >= 70 ? 'Elevated exposure across attack surface' : score >= 40 ? 'Moderate risk indicators detected' : 'Surface within acceptable parameters'}
            </p>
          </div>
        </motion.div>

        <StatCard icon={BarChart3} label="Total Scans" value={stats?.totalScans ?? 0} color="#a3a3a3" subValue="all time" onClick={() => onNavigate('history')} />
        <StatCard icon={ShieldAlert} label="Critical" value={stats?.criticalFindings ?? 0} color="#ff3355" onClick={() => onNavigate('threats')} />
        <StatCard icon={Zap} label="Findings" value={stats?.totalFindings ?? 0} color="#d29922" onClick={() => onNavigate('radar')} />
        <StatCard icon={TrendingUp} label="High" value={stats?.highFindings ?? 0} color="#f97316" onClick={() => onNavigate('threats')} />
      </div>

      {/* Main Content: CLI + Findings + Activity */}
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

        {/* Severity + Activity */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3">
          <div className="panel p-4 flex-1 flex items-center justify-center">
            <div className="w-full max-w-[110px]">
              <SeverityDonut data={[
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
              <Activity className="w-3.5 h-3.5 text-neutral-600" />
              <span className="text-[10px] font-medium text-neutral-600 tracking-[0.1em] uppercase">Activity</span>
            </div>
            <div className="space-y-0 max-h-[140px] overflow-y-auto scrollbar-none">
              {recentScans.slice(0, 4).map((scan) => {
                const severityColors: Record<string, string> = { critical: '#ff3355', high: '#d29922', low: '#00ff88' };
                return (
                  <ActivityItem
                    key={scan.id}
                    text={`Scan completed for ${scan.target.domain} — risk ${scan.riskScore}/100`}
                    time={timeAgo(scan.startedAt)}
                    dotColor={severityColors[scan.riskScore > 70 ? 'critical' : scan.riskScore > 40 ? 'high' : 'low'] ?? '#525252'}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Scans Table */}
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
