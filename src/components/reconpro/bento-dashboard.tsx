'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Zap, TrendingUp, Activity, Globe,
  ArrowUpRight, ShieldCheck, Terminal,
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
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 180, damping: 22 } },
};

// ─── Severity Donut (SVG) ────────────────────────────────────────────

function SeverityDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-xs text-[#333333] text-center py-8">No findings yet</div>;

  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const off = data.slice(0, i).reduce((s, prev) => s + prev.value / total, 0);
    return { ...d, dasharray: `${pct * 283} ${283}`, offset: -off * 283 };
  });

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {segments.map((d) => (
        <circle key={d.name} cx="60" cy="60" r="45" fill="none"
          stroke={d.color} strokeWidth="16" strokeDasharray={d.dasharray}
          strokeDashoffset={d.offset} strokeLinecap="round" opacity={0.8} />
      ))}
      <text x="60" y="55" textAnchor="middle" fill="#f0f0f0" fontSize="24" fontWeight="bold" fontFamily="Geist Sans, sans-serif">{total}</text>
      <text x="60" y="72" textAnchor="middle" fill="#333333" fontSize="8" fontFamily="Geist Sans, sans-serif" letterSpacing="0.15em">FINDINGS</text>
    </svg>
  );
}

// ─── Mini stat sparkline (decorative) ───────────────────────────────

function MiniSparkline({ color }: { color: string }) {
  const points = 'M0,20 L8,14 L16,18 L24,8 L32,12 L40,4 L48,10 L56,2 L64,6';
  return (
    <svg viewBox="0 0 64 24" className="w-16 h-6 opacity-30">
      <path d={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Live activity feed item ────────────────────────────────────────

function ActivityItem({ text, time, dotColor }: { text: string; time: string; dotColor: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#7a7873] leading-relaxed truncate">{text}</p>
        <p className="text-[10px] text-[#333333] mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// ─── BENTO DASHBOARD ────────────────────────────────────────────────

export function BentoDashboard({ stats, recentScans, onNavigate }: BentoDashboardProps) {
  const score = stats?.avgRiskScore ?? 0;
  const scoreColor = score >= 70 ? '#ff3355' : score >= 40 ? '#ffaa00' : '#00ff88';

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="p-4 md:p-6 pb-32 max-w-[1400px] mx-auto"
    >
      {/* Hero headline */}
      <motion.div variants={fadeUp} className="mb-8 md:mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffffff] animate-pulse" />
          <span className="text-[10px] font-mono text-[#444444] tracking-[0.2em] uppercase">Live Command Center</span>
        </div>
        <h1 className="text-2xl md:text-[32px] font-bold text-[#f0f0f0] tracking-tight">
          Security <span className="text-gradient-void">Overview</span>
        </h1>
        <p className="text-[13px] text-[#444444] mt-2 max-w-md">Enterprise threat intelligence across your entire attack surface.</p>
      </motion.div>

      {/* ── BENTO GRID ── */}
      <div className="grid grid-cols-4 md:grid-cols-6 gap-3 md:gap-4 auto-rows-[minmax(120px,auto)]">

        {/* Risk Score — Large hero tile (2x2) */}
        <motion.div
          variants={fadeUp}
          className="col-span-2 row-span-2 bento-tile p-6 md:p-8 flex flex-col justify-between cursor-pointer"
          onClick={() => onNavigate('surface')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#333333] tracking-[0.15em] uppercase">Risk Score</span>
            <MiniSparkline color={scoreColor} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <AnimatedCounter target={score} color={scoreColor} size="xl" />
              <span className="text-[#333333] text-lg">/100</span>
            </div>
            <p className="text-[11px] text-[#444444] mt-1">
              {score >= 70 ? 'Elevated threat posture' : score >= 40 ? 'Moderate exposure detected' : 'Surface within acceptable bounds'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-[3px] flex-1 rounded-full bg-[rgba(255,255,255,0.03)] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${scoreColor}90, ${scoreColor})` }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
              />
            </div>
            <span className="text-[10px] font-mono" style={{ color: scoreColor }}>{score >= 70 ? 'HIGH RISK' : score >= 40 ? 'MODERATE' : 'LOW'}</span>
          </div>
        </motion.div>

        {/* Scans — stat tile (1x1) */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col justify-between">
          <ShieldCheck className="w-4 h-4 text-[#44aaff] opacity-40" />
          <div>
            <div className="text-xl font-bold font-mono text-[#f0f0f0]">{stats?.totalScans ?? 0}</div>
            <div className="text-[9px] text-[#333333] uppercase tracking-wider mt-0.5">Scans</div>
          </div>
        </motion.div>

        {/* Critical — stat tile (1x1) */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col justify-between cursor-pointer" onClick={() => onNavigate('threats')}>
          <ShieldAlert className="w-4 h-4 text-[#ff3355] opacity-40" />
          <div>
            <div className="text-xl font-bold font-mono text-[#ff3355]">{stats?.criticalFindings ?? 0}</div>
            <div className="text-[9px] text-[#333333] uppercase tracking-wider mt-0.5">Critical</div>
          </div>
        </motion.div>

        {/* Findings — stat tile (1x1) */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col justify-between">
          <Zap className="w-4 h-4 text-[#ffaa00] opacity-40" />
          <div>
            <div className="text-xl font-bold font-mono text-[#f0f0f0]">{stats?.totalFindings ?? 0}</div>
            <div className="text-[9px] text-[#333333] uppercase tracking-wider mt-0.5">Findings</div>
          </div>
        </motion.div>

        {/* High — stat tile (1x1) */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col justify-between">
          <TrendingUp className="w-4 h-4 text-[#ff8844] opacity-40" />
          <div>
            <div className="text-xl font-bold font-mono text-[#ff8844]">{stats?.highFindings ?? 0}</div>
            <div className="text-[9px] text-[#333333] uppercase tracking-wider mt-0.5">High</div>
          </div>
        </motion.div>

        {/* Severity Donut — (1x1) */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col items-center justify-center">
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
          className="col-span-3 row-span-2 bento-tile p-0 overflow-hidden cursor-pointer"
          onClick={() => onNavigate('unified-cli')}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#ffffff] opacity-60" />
              <span className="text-[10px] font-mono text-[#333333] tracking-[0.15em] uppercase">ReconPro CLI</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onNavigate('unified-cli'); }} className="text-[10px] text-[#ffffff] hover:text-[#cccccc] transition-colors flex items-center gap-1">
              Launch CLI <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="px-4 pb-4 h-full">
            <CLIPreview className="h-full" />
          </div>
        </motion.div>

        {/* Recent Scans — wide tile (2x1) */}
        <motion.div variants={fadeUp} className="col-span-2 row-span-1 bento-tile p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-[#333333] tracking-[0.15em] uppercase">Recent Scans</span>
            <button onClick={() => onNavigate('history')} className="text-[10px] text-[#ffffff] hover:text-[#cccccc] transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-none">
            {recentScans.length === 0 ? (
              <div className="text-[12px] text-[#333333] py-4 text-center">No scans yet</div>
            ) : (
              recentScans.slice(0, 4).map((scan, i) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.015)] hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                  onClick={() => onNavigate('surface')}
                >
                  <span className="text-[12px] font-mono text-[#7a7873]">{scan.target.domain}</span>
                  <span
                    className="text-[12px] font-mono font-bold"
                    style={{ color: scan.riskScore > 70 ? '#ff3355' : scan.riskScore > 40 ? '#ffaa00' : '#00ff88' }}
                  >
                    {scan.riskScore}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions — (1x1) */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col gap-2 justify-center">
          <span className="text-[10px] font-mono text-[#333333] tracking-[0.15em] uppercase mb-1">Quick</span>
          {[
            { label: 'New Scan', icon: '→', color: '#ffffff', view: 'scan' },
            { label: 'Compliance', icon: '◇', color: '#44aaff', view: 'compliance' },
            { label: 'Threats', icon: '△', color: '#ff3355', view: 'threats' },
          ].map((action) => (
            <button
              key={action.view}
              onClick={() => onNavigate(action.view)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-[#6b6960] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#c8c6c0] transition-all duration-300"
            >
              <span style={{ color: action.color }} className="font-mono text-sm">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </motion.div>

        {/* Activity Feed — wide tile (2x1) */}
        <motion.div variants={fadeUp} className="col-span-2 bento-tile p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-[#ffffff] opacity-40" />
            <span className="text-[10px] font-mono text-[#333333] tracking-[0.15em] uppercase">Activity</span>
          </div>
          <div className="space-y-0">
            <ActivityItem text="Full scan completed for acme-corp.com — 34 assets" time="2m ago" dotColor="#00ff88" />
            <ActivityItem text="Critical SQL injection detected on api.corp.io" time="18m ago" dotColor="#ff3355" />
            <ActivityItem text="SOC 2 Type II compliance passed — no deviations" time="1h ago" dotColor="#44aaff" />
            <ActivityItem text="Exposed S3 bucket discovered: s3://acme-legacy" time="3h ago" dotColor="#ffaa00" />
          </div>
        </motion.div>

        {/* System Status — (1x1) */}
        <motion.div variants={fadeUp} className="col-span-1 bento-tile p-4 flex flex-col justify-between">
          <Globe className="w-4 h-4 text-[#00ff88] opacity-40" />
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[11px] text-[#00ff88] font-medium">Online</span>
            </div>
            <div className="text-[9px] text-[#333333]">All systems nominal</div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
