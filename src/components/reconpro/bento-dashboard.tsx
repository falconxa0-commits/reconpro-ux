'use client';

import { motion } from 'framer-motion';
import {
  ShieldAlert, Zap, TrendingUp, Activity, Globe,
  ArrowUpRight, ShieldCheck, Terminal, ScanSearch, Shield, BarChart3,
} from 'lucide-react';
import { AnimatedCounter } from './animated-counter';
import { CLIPreview } from './cli-showcase';

// ─── Types ───────────────────────────────────────────────────────────

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
  target: { domain: string };
}

interface BentoDashboardProps {
  stats: DashboardStats | null;
  recentScans: RecentScan[];
  onNavigate: (view: string) => void;
}

// ─── Animation ────────────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } },
};

// ─── Severity Donut (SVG) ────────────────────────────────────────────

function SeverityDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center py-6">
      <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center mb-3">
        <ShieldCheck className="w-5 h-5 text-[#444444]" />
      </div>
      <p className="text-xs text-[#555555]">No findings yet</p>
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
          stroke={d.color} strokeWidth="14" strokeDasharray={d.dasharray}
          strokeDashoffset={d.offset} strokeLinecap="round" opacity={0.75} />
      ))}
      <text x="60" y="55" textAnchor="middle" fill="#f0f0f0" fontSize="22" fontWeight="bold" fontFamily="var(--font-heading)">{total}</text>
      <text x="60" y="70" textAnchor="middle" fill="#555555" fontSize="8" fontFamily="var(--font-body)" letterSpacing="0.12em">FINDINGS</text>
    </svg>
  );
}

// ─── Mini stat sparkline (decorative) ───────────────────────────────

function MiniSparkline({ color }: { color: string }) {
  const points = 'M0,20 L8,14 L16,18 L24,8 L32,12 L40,4 L48,10 L56,2 L64,6';
  return (
    <svg viewBox="0 0 64 24" className="w-14 h-5 opacity-25">
      <path d={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="bento-tile p-4 flex flex-col justify-between group cursor-pointer"
      onClick={onClick}
    >
      <Icon className="w-4 h-4 opacity-30 group-hover:opacity-50 transition-opacity" style={{ color }} />
      <div className="mt-auto">
        <div className="text-xl font-semibold font-mono text-white tracking-tight" style={color !== '#ffffff' ? { color } : undefined}>
          {value}
        </div>
        <div className="text-[10px] text-[#555555] uppercase tracking-widest mt-0.5 font-medium">{label}</div>
      </div>
    </motion.div>
  );
}

// ─── Live activity feed item ────────────────────────────────────────

function ActivityItem({ text, time, dotColor }: { text: string; time: string; dotColor: string }) {
  return (
    <div className="flex items-start gap-3 py-2 group">
      <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 transition-opacity group-hover:opacity-100 opacity-60" style={{ background: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#777777] leading-relaxed truncate group-hover:text-[#999999] transition-colors">{text}</p>
        <p className="text-[10px] text-[#444444] mt-0.5 font-mono">{time}</p>
      </div>
    </div>
  );
}

// ─── Empty Dashboard State ─────────────────────────────────────────

function EmptyDashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <ScanSearch className="w-7 h-7 text-[#555555]" />
      </div>
      <h2 className="text-lg font-medium text-white mb-2">No scan data yet</h2>
      <p className="text-sm text-[#555555] max-w-sm text-center leading-relaxed mb-8">
        Run your first reconnaissance scan to see security insights, risk scores, and threat intelligence here.
      </p>
      <button
        onClick={() => onNavigate('scan')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
      >
        <Zap className="w-4 h-4" />
        Launch Your First Scan
      </button>
    </motion.div>
  );
}

// ─── BENTO DASHBOARD ────────────────────────────────────────────────

export function BentoDashboard({ stats, recentScans, onNavigate }: BentoDashboardProps) {
  const score = stats?.avgRiskScore ?? 0;
  const scoreColor = score >= 70 ? '#ff3355' : score >= 40 ? '#ffaa00' : '#00ff88';
  const hasData = stats && stats.totalScans > 0;

  if (!hasData) {
    return <EmptyDashboard onNavigate={onNavigate} />;
  }

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
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Page Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-[#555555] mt-1">Security overview and recent reconnaissance activity.</p>
      </motion.div>

      {/* ── BENTO GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 auto-rows-[minmax(120px,auto)]">

        {/* Risk Score — Large hero tile (2x2) */}
        <motion.div
          variants={fadeUp}
          className="col-span-2 row-span-2 bento-tile p-6 flex flex-col justify-between cursor-pointer"
          onClick={() => onNavigate('surface')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#555555] tracking-[0.12em] uppercase">Risk Score</span>
            <MiniSparkline color={scoreColor} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <AnimatedCounter target={score} color={scoreColor} size="xl" />
              <span className="text-[#444444] text-lg font-mono">/100</span>
            </div>
            <p className="text-[12px] text-[#666666] mt-1.5">
              {score >= 70 ? 'Elevated threat posture' : score >= 40 ? 'Moderate exposure detected' : 'Surface within acceptable bounds'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-[2px] flex-1 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})` }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
              />
            </div>
            <span className="text-[10px] font-mono font-semibold" style={{ color: scoreColor }}>{score >= 70 ? 'HIGH RISK' : score >= 40 ? 'MODERATE' : 'LOW'}</span>
          </div>
        </motion.div>

        {/* Stat cards */}
        <StatCard icon={ShieldCheck} label="Scans" value={stats?.totalScans ?? 0} color="#44aaff" />
        <StatCard icon={ShieldAlert} label="Critical" value={stats?.criticalFindings ?? 0} color="#ff3355" onClick={() => onNavigate('threats')} />
        <StatCard icon={Zap} label="Findings" value={stats?.totalFindings ?? 0} color="#ffaa00" />
        <StatCard icon={TrendingUp} label="High" value={stats?.highFindings ?? 0} color="#ff8844" />

        {/* Severity Donut */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex items-center justify-center">
          <div className="w-full max-w-[100px]">
            <SeverityDonut data={[
              { name: 'Critical', value: stats?.criticalFindings ?? 0, color: '#ff3355' },
              { name: 'High', value: stats?.highFindings ?? 0, color: '#ff8844' },
              { name: 'Medium', value: stats?.mediumFindings ?? 0, color: '#ffaa00' },
              { name: 'Low', value: stats?.lowFindings ?? 0, color: '#00ff88' },
              { name: 'Info', value: stats?.infoFindings ?? 0, color: '#444444' },
            ]} />
          </div>
        </motion.div>

        {/* ── CLI SHOWCASE — Wide tile (3x2) ── */}
        <motion.div
          variants={fadeUp}
          className="col-span-2 md:col-span-3 row-span-2 bento-tile p-0 overflow-hidden cursor-pointer"
          onClick={() => onNavigate('scan')}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#888888]" />
              <span className="text-[10px] font-medium text-[#555555] tracking-[0.1em] uppercase">ReconPro CLI</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onNavigate('scan'); }} className="text-[10px] text-[#888888] hover:text-white transition-colors flex items-center gap-1">
              Launch Scan <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="px-3 pb-3 h-full">
            <CLIPreview className="h-full" />
          </div>
        </motion.div>

        {/* Recent Scans — wide tile (2x1) */}
        <motion.div variants={fadeUp} className="col-span-2 bento-tile p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-[#555555] tracking-[0.1em] uppercase">Recent Scans</span>
            <button onClick={() => onNavigate('history')} className="text-[10px] text-[#666666] hover:text-white transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-none">
            {recentScans.length === 0 ? (
              <div className="text-[12px] text-[#444444] py-4 text-center">No scans yet</div>
            ) : (
              recentScans.slice(0, 4).map((scan, i) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.015] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  onClick={() => onNavigate('surface')}
                >
                  <span className="text-[12px] font-mono text-[#666666] group-hover:text-[#999999] transition-colors">{scan.target.domain}</span>
                  <span
                    className="text-[12px] font-mono font-semibold"
                    style={{ color: scan.riskScore > 70 ? '#ff3355' : scan.riskScore > 40 ? '#ffaa00' : '#00ff88' }}
                  >
                    {scan.riskScore}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col gap-1.5 justify-center">
          <span className="text-[10px] font-medium text-[#555555] tracking-[0.1em] uppercase mb-1">Quick</span>
          {[
            { label: 'New Scan', icon: Zap, color: '#ffffff', view: 'scan' },
            { label: 'Compliance', icon: Shield, color: '#44aaff', view: 'compliance' },
            { label: 'Threats', icon: ShieldAlert, color: '#ff3355', view: 'threats' },
          ].map((action) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.view}
                onClick={() => onNavigate(action.view)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[#555555] hover:bg-white/[0.03] hover:text-[#bbbbbb] transition-all duration-200 group"
              >
                <ActionIcon className="w-3.5 h-3.5" style={{ color: action.color }} />
                {action.label}
              </button>
            );
          })}
        </motion.div>

        {/* Activity Feed */}
        <motion.div variants={fadeUp} className="col-span-2 bento-tile p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-[#888888]" />
            <span className="text-[10px] font-medium text-[#555555] tracking-[0.1em] uppercase">Activity</span>
          </div>
          <div className="space-y-0">
            {(() => {
              const activityItems = recentScans.slice(0, 5).map(scan => ({
                id: scan.id,
                type: 'scan' as const,
                message: `Scan completed for ${scan.domain} — risk score ${scan.riskScore}/100`,
                severity: scan.riskScore > 70 ? 'critical' as const : scan.riskScore > 40 ? 'high' as const : 'low' as const,
                timestamp: scan.startedAt || new Date().toISOString(),
              }));
              if (activityItems.length === 0) {
                return <div className="text-[12px] text-[#444444] py-4 text-center">No recent activity</div>;
              }
              const severityColors: Record<string, string> = { critical: '#ff3355', high: '#ffaa00', low: '#00ff88' };
              return activityItems.map(item => (
                <ActivityItem
                  key={item.id}
                  text={item.message}
                  time={timeAgo(item.timestamp)}
                  dotColor={severityColors[item.severity] ?? '#444444'}
                />
              ));
            })()}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col justify-between">
          <Globe className="w-4 h-4 text-[#00ff88] opacity-30" />
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[12px] text-[#00ff88] font-medium">Online</span>
            </div>
            <div className="text-[10px] text-[#444444]">All systems nominal</div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}