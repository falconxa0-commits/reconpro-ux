'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Activity, Globe, AlertTriangle, FileSearch, History,
  Radar, TrendingUp, Lock, Cpu, Wifi, Zap, ArrowUpRight,
  Clock, Target, ShieldCheck, Eye, Radio,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanInput } from '@/components/reconpro/scan-input';
import { ScanResults } from '@/components/reconpro/scan-results';
import { AttackSurface } from '@/components/reconpro/attack-surface';
import { RiskGauge } from '@/components/reconpro/risk-gauge';

// ─── Types ───────────────────────────────────────────────────

type View = 'dashboard' | 'scan' | 'surface' | 'threats' | 'history';

interface Finding {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string | null;
  asset: string;
}

interface ScanResult {
  id: string;
  domain: string;
  status: string;
  riskScore: number;
  totalVulns: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  findings: Finding[];
}

interface DashboardStats {
  totalScans: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
  avgRiskScore: number;
}

interface Threat {
  id: string;
  title: string;
  severity: string;
  source: string;
  description: string;
  ioc: string | null;
  createdAt: string;
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
  target: { domain: string; ip: string | null };
  findings: Finding[];
}

// ─── Navigation ──────────────────────────────────────────────

const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
  { id: 'scan', label: 'New Scan', icon: <Radar className="w-4 h-4" /> },
  { id: 'surface', label: 'Attack Surface', icon: <Globe className="w-4 h-4" /> },
  { id: 'threats', label: 'Threat Intel', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'history', label: 'Scan History', icon: <History className="w-4 h-4" /> },
];

const severityColors: Record<string, string> = {
  critical: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30',
  high: 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30',
  medium: 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30',
  low: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  info: 'bg-[#6b7280]/15 text-[#6b7280] border-[#6b7280]/30',
};

// ─── Mini severity chart (SVG) ───────────────────────────────

function SeverityDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const segments = useMemo(() => {
    if (total === 0) return [];
    let off = 0;
    return data.map((d) => {
      const pct = d.value / total;
      const seg = { ...d, pct, dasharray: `${pct * 283} ${283}`, offset: -off };
      off += pct * 283;
      return seg;
    });
  }, [data, total]);
  if (total === 0) return <div className="text-xs text-muted-foreground text-center py-4">No data yet</div>;
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto">
      {segments.map((d) => (
        <circle
          key={d.name}
          cx="60" cy="60" r="45"
          fill="none"
          stroke={d.color}
          strokeWidth="18"
          strokeDasharray={d.dasharray}
          strokeDashoffset={d.offset}
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
      <text x="60" y="56" textAnchor="middle" fill="#e6edf3" fontSize="22" fontWeight="bold" fontFamily="Geist Sans, sans-serif">{total}</text>
      <text x="60" y="72" textAnchor="middle" fill="#7d8590" fontSize="9" fontFamily="Geist Sans, sans-serif">FINDINGS</text>
    </svg>
  );
}

// ─── Main App ────────────────────────────────────────────────

export default function Home() {
  const [activeView, setActiveView] = useState<View>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [allScans, setAllScans] = useState<RecentScan[]>([]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardStats(data.stats);
      setRecentScans(data.recentScans || []);
    } catch { /* silent */ }
  }, []);

  const fetchThreats = useCallback(async () => {
    try {
      const res = await fetch('/api/threats');
      const data = await res.json();
      setThreats(data.threats || []);
    } catch { /* silent */ }
  }, []);

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch('/api/scans');
      const data = await res.json();
      setAllScans(data.scans || []);
    } catch { /* silent */ }
  }, []);

  // Initial data load
  const initRef = useRef<boolean | null>(null);
  if (initRef.current == null) {
    initRef.current = true;
    // Schedule fetches to run after render
    queueMicrotask(() => {
      fetchDashboard();
      fetchThreats();
      fetchScans();
    });
  }

  // Handle scan
  const handleScan = async (domain: string, scanType: string) => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, scanType }),
      });
      const data = await res.json();
      if (data.success) {
        setScanResult(data.scan);
        setActiveView('surface');
        // Refresh dashboard and scans in background
        fetchDashboard();
        fetchScans();
      }
    } catch { /* silent */ }
    setIsScanning(false);
  };

  // ─── Dashboard View ─────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Scans', value: dashboardStats?.totalScans ?? 0, icon: <Radar className="w-5 h-5" />, color: '#00ff88' },
          { label: 'Total Findings', value: dashboardStats?.totalFindings ?? 0, icon: <AlertTriangle className="w-5 h-5" />, color: '#f97316' },
          { label: 'Critical Issues', value: dashboardStats?.criticalFindings ?? 0, icon: <Shield className="w-5 h-5" />, color: '#ef4444' },
          { label: 'Avg Risk Score', value: dashboardStats?.avgRiskScore ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: '#eab308' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cyber-card rounded-xl p-4 group hover:border-[rgba(0,255,136,0.2)] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.04)] text-muted-foreground group-hover:text-[#00ff88] transition-colors">
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Middle Row: Chart + Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Severity Breakdown */}
        <div className="cyber-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#06b6d4]" />
            Severity Breakdown
          </h3>
          <SeverityDonut
            data={[
              { name: 'Critical', value: dashboardStats?.criticalFindings ?? 0, color: '#ef4444' },
              { name: 'High', value: dashboardStats?.highFindings ?? 0, color: '#f97316' },
              { name: 'Medium', value: dashboardStats?.mediumFindings ?? 0, color: '#eab308' },
              { name: 'Low', value: dashboardStats?.lowFindings ?? 0, color: '#22c55e' },
              { name: 'Info', value: dashboardStats?.infoFindings ?? 0, color: '#6b7280' },
            ]}
          />
          <div className="mt-4 space-y-1.5">
            {[
              { label: 'Critical', val: dashboardStats?.criticalFindings ?? 0, c: '#ef4444' },
              { label: 'High', val: dashboardStats?.highFindings ?? 0, c: '#f97316' },
              { label: 'Medium', val: dashboardStats?.mediumFindings ?? 0, c: '#eab308' },
              { label: 'Low', val: dashboardStats?.lowFindings ?? 0, c: '#22c55e' },
              { label: 'Info', val: dashboardStats?.infoFindings ?? 0, c: '#6b7280' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.c }} />
                  <span className="text-muted-foreground">{s.label}</span>
                </div>
                <span className="font-mono" style={{ color: s.c }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Scans */}
        <div className="lg:col-span-2 cyber-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#e6edf3] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00ff88]" />
              Recent Scans
            </h3>
            <button onClick={() => setActiveView('history')} className="text-xs text-[#00ff88] hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {recentScans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Radar className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No scans yet</p>
              <button onClick={() => setActiveView('scan')} className="text-xs text-[#00ff88] mt-2 hover:underline">
                Launch your first scan
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {recentScans.map((scan, i) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(0,255,136,0.15)] transition-all cursor-pointer"
                  onClick={() => {
                    if (scan.findings.length > 0) {
                      setScanResult({
                        id: scan.id,
                        domain: scan.target.domain,
                        status: scan.status,
                        riskScore: scan.riskScore,
                        totalVulns: scan.totalVulns,
                        critical: scan.criticalCount,
                        high: scan.highCount,
                        medium: scan.mediumCount,
                        low: scan.lowCount,
                        info: scan.infoCount,
                        findings: scan.findings,
                      });
                      setActiveView('surface');
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      scan.riskScore > 70 ? 'bg-[#ef4444]/15 text-[#ef4444]' : scan.riskScore > 40 ? 'bg-[#f97316]/15 text-[#f97316]' : 'bg-[#00ff88]/15 text-[#00ff88]'
                    }`}>
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-mono text-[#e6edf3]">{scan.target.domain}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(scan.startedAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-mono font-bold" style={{
                        color: scan.riskScore > 70 ? '#ef4444' : scan.riskScore > 40 ? '#f97316' : '#00ff88'
                      }}>{scan.riskScore}</div>
                      <div className="text-[10px] text-muted-foreground">Risk</div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-sm font-mono text-[#e6edf3]">{scan.totalVulns}</div>
                      <div className="text-[10px] text-muted-foreground">Findings</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Threat Feed Preview */}
      <div className="cyber-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#e6edf3] flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#ef4444] animate-pulse" />
            Live Threat Intelligence
          </h3>
          <button onClick={() => setActiveView('threats')} className="text-xs text-[#00ff88] hover:underline flex items-center gap-1">
            Full Feed <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {threats.slice(0, 5).map((threat, i) => (
            <motion.div
              key={threat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(239,68,68,0.15)] transition-all"
            >
              <Badge variant="outline" className={`text-[10px] px-2 py-0 mt-0.5 flex-shrink-0 ${severityColors[threat.severity]}`}>
                {threat.severity.toUpperCase()}
              </Badge>
              <div className="min-w-0">
                <div className="text-sm text-[#e6edf3] truncate">{threat.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{threat.description}</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-muted-foreground">{threat.source}</span>
                  {threat.ioc && <span className="text-[10px] font-mono text-[#06b6d4]">{threat.ioc}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Scan View ──────────────────────────────────────────
  const renderScan = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.15)]"
        >
          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-glow" />
          <span className="text-xs font-mono text-[#00ff88] tracking-wider">RECONPRO ASM ENGINE v2.4.1</span>
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[#e6edf3]">
          Attack Surface <span className="text-glow-green text-[#00ff88]">Intelligence</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
          Discover subdomains, open ports, technologies, and security vulnerabilities across your entire digital footprint. Enterprise-grade reconnaissance in seconds.
        </p>

        {/* Scan Input */}
        <ScanInput onScan={handleScan} isScanning={isScanning} />
      </div>

      {/* Scanning Animation */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="cyber-card rounded-2xl p-8 overflow-hidden"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-2 border-[rgba(0,255,136,0.1)]" />
                <div className="absolute inset-2 rounded-full border-2 border-[rgba(0,255,136,0.2)] animate-radar" style={{ borderTopColor: '#00ff88' }} />
                <div className="absolute inset-4 rounded-full border-2 border-[rgba(0,255,136,0.15)] animate-radar" style={{ borderTopColor: '#00ff88', animationDuration: '3s', animationDirection: 'reverse' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-[#00ff88] animate-pulse" />
                </div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-[#e6edf3] mb-1">Scanning Target...</div>
                <div className="text-sm text-muted-foreground font-mono">Enumerating attack surface assets</div>
              </div>

              <div className="w-full max-w-md space-y-3">
                {[
                  { label: 'DNS Enumeration', icon: <Wifi className="w-4 h-4" />, active: true },
                  { label: 'Subdomain Discovery', icon: <Globe className="w-4 h-4" />, active: true },
                  { label: 'Port Scanning', icon: <Zap className="w-4 h-4" />, active: true },
                  { label: 'Technology Fingerprinting', icon: <Cpu className="w-4 h-4" />, active: true },
                  { label: 'Vulnerability Assessment', icon: <ShieldCheck className="w-4 h-4" />, active: true },
                ].map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <div className="p-2 rounded-lg bg-[rgba(0,255,136,0.08)] text-[#00ff88]">
                      {step.icon}
                    </div>
                    <span className="text-sm text-[#e6edf3] flex-1">{step.label}</span>
                    <div className="w-32 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#00ff88]"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ delay: i * 0.3, duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-xs text-[#00ff88] font-mono">DONE</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Results (if viewing results on scan page) */}
      {scanResult && activeView === 'scan' && <ScanResults result={scanResult} />}
    </div>
  );

  // ─── Attack Surface View ────────────────────────────────
  const renderSurface = () => (
    <div className="space-y-6">
      {scanResult ? (
        <>
          {/* Quick Stats Bar */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.12)]">
              <Globe className="w-4 h-4 text-[#00ff88]" />
              <span className="text-sm font-mono text-[#00ff88]">{scanResult.domain}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Risk: <span className="font-bold" style={{
                color: scanResult.riskScore > 70 ? '#ef4444' : scanResult.riskScore > 40 ? '#f97316' : '#00ff88'
              }}>{scanResult.riskScore}</span>/100</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{scanResult.totalVulns} findings</span>
            </div>
          </div>

          {/* Attack Surface Map */}
          <AttackSurface
            findings={scanResult.findings}
            domain={scanResult.domain}
            riskScore={scanResult.riskScore}
          />

          {/* Findings */}
          <ScanResults result={scanResult} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Globe className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">No Scan Data</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Run a scan first to visualize the attack surface. The interactive map will show all discovered assets and their connections.
          </p>
          <button
            onClick={() => setActiveView('scan')}
            className="px-6 py-3 rounded-xl bg-[#00ff88] text-[#080a10] font-semibold hover:bg-[#00cc6e] transition-all flex items-center gap-2"
          >
            <Radar className="w-4 h-4" />
            Launch Scan
          </button>
        </div>
      )}
    </div>
  );

  // ─── Threat Intel View ──────────────────────────────────
  const renderThreats = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
          <h2 className="text-lg font-semibold text-[#e6edf3]">Threat Intelligence Feed</h2>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{threats.length} threats</span>
      </div>

      <div className="space-y-3">
        {threats.map((threat, i) => (
          <motion.div
            key={threat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="cyber-card rounded-xl p-5 hover:border-[rgba(239,68,68,0.2)] transition-all group cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className={`mt-0.5 p-2.5 rounded-lg flex-shrink-0 ${
                threat.severity === 'critical' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                threat.severity === 'high' ? 'bg-[#f97316]/10 text-[#f97316]' :
                'bg-[#eab308]/10 text-[#eab308]'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityColors[threat.severity]}`}>
                    {threat.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-2 py-0 border-[rgba(6,182,212,0.3)] text-[#06b6d4]">
                    {threat.source}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(threat.createdAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#e6edf3] group-hover:text-[#00ff88] transition-colors mb-1">
                  {threat.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{threat.description}</p>
                {threat.ioc && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.15)]">
                    <span className="text-[10px] text-[#06b6d4]">IOC:</span>
                    <span className="text-[11px] font-mono text-[#06b6d4]">{threat.ioc}</span>
                  </div>
                )}
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-[#00ff88] transition-colors mt-1 flex-shrink-0" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ─── Scan History View ──────────────────────────────────
  const renderHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e6edf3]">Scan History</h2>
        <span className="text-xs text-muted-foreground font-mono">{allScans.length} scans</span>
      </div>

      {allScans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <History className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">No Scan History</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Your past scans will appear here. Each scan records the full attack surface analysis.
          </p>
          <button
            onClick={() => setActiveView('scan')}
            className="px-6 py-3 rounded-xl bg-[#00ff88] text-[#080a10] font-semibold hover:bg-[#00cc6e] transition-all flex items-center gap-2"
          >
            <Radar className="w-4 h-4" />
            Launch Your First Scan
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {allScans.map((scan, i) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="cyber-card rounded-xl p-4 hover:border-[rgba(0,255,136,0.2)] transition-all cursor-pointer group"
              onClick={() => {
                if (scan.findings.length > 0) {
                  setScanResult({
                    id: scan.id,
                    domain: scan.target.domain,
                    status: scan.status,
                    riskScore: scan.riskScore,
                    totalVulns: scan.totalVulns,
                    critical: scan.criticalCount,
                    high: scan.highCount,
                    medium: scan.mediumCount,
                    low: scan.lowCount,
                    info: scan.infoCount,
                    findings: scan.findings,
                  });
                  setActiveView('surface');
                }
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    scan.riskScore > 70 ? 'bg-[#ef4444]/10 text-[#ef4444]' : scan.riskScore > 40 ? 'bg-[#f97316]/10 text-[#f97316]' : 'bg-[#00ff88]/10 text-[#00ff88]'
                  }`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-mono text-[#e6edf3] group-hover:text-[#00ff88] transition-colors">{scan.target.domain}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(scan.startedAt).toLocaleString()} • {scan.scanType} scan • {scan.target.ip}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-3">
                    {[
                      { label: 'C', val: scan.criticalCount, color: '#ef4444' },
                      { label: 'H', val: scan.highCount, color: '#f97316' },
                      { label: 'M', val: scan.mediumCount, color: '#eab308' },
                      { label: 'L', val: scan.lowCount, color: '#22c55e' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className="text-xs font-mono font-bold" style={{ color: s.color }}>{s.val}</div>
                        <div className="text-[9px] text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-mono font-bold" style={{
                      color: scan.riskScore > 70 ? '#ef4444' : scan.riskScore > 40 ? '#f97316' : '#00ff88'
                    }}>{scan.riskScore}</div>
                    <div className="text-[9px] text-muted-foreground">RISK</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-[#00ff88] transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Render Active View ─────────────────────────────────
  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return renderDashboard();
      case 'scan': return renderScan();
      case 'surface': return renderSurface();
      case 'threats': return renderThreats();
      case 'history': return renderHistory();
    }
  };

  // ─── Main Layout ────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[#080a10] cyber-grid">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[rgba(0,255,136,0.08)] bg-[#080a10]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#00ff88]" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00ff88] animate-pulse-glow" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#e6edf3] tracking-tight">
                  Recon<span className="text-[#00ff88]">Pro</span>
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[rgba(0,255,136,0.2)] text-[#00ff88] hidden sm:inline-flex">
                  ASM
                </Badge>
              </div>
            </div>

            {/* Nav Items */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeView === item.id
                      ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.15)]'
                      : 'text-muted-foreground hover:text-[#e6edf3] hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline text-xs">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Status */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-xs text-muted-foreground font-mono">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.04)] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              SOC 2 Compliant
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground/50">
            ReconPro ASM Platform v2.4.1
          </div>
        </div>
      </footer>
    </div>
  );
}