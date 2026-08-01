'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter } from '@/components/reconpro/animated-counter';
import { ScanInput } from '@/components/reconpro/scan-input';
import { ScanResults } from '@/components/reconpro/scan-results';
import { AttackSurface } from '@/components/reconpro/attack-surface';
import { RadarMap } from '@/components/reconpro/radar-map';
import { AIAdvisor } from '@/components/reconpro/ai-advisor';
import { ThreatGlobe } from '@/components/reconpro/threat-globe';
import { LiveTerminal } from '@/components/reconpro/live-terminal';
import { ScanOverlay } from '@/components/reconpro/scan-overlay';
import { CriticalAlertFeed } from '@/components/reconpro/critical-alerts';
import { EnterpriseSidebar } from '@/components/reconpro/sidebar';
import { CEODashboard } from '@/components/reconpro/ceo-dashboard';
import { TeamManagement } from '@/components/reconpro/team-management';
import { CompliancePanel } from '@/components/reconpro/compliance-panel';
import { IntegrationHub } from '@/components/reconpro/integration-hub';
import { MonitoringPanel } from '@/components/reconpro/monitoring-panel';
import { PricingPlans } from '@/components/reconpro/pricing-plans';
import { LiveProofPanel } from '@/components/reconpro/live-proof';
import { VulnArsenal } from '@/components/reconpro/vuln-arsenal';
import { UnifiedCLI } from '@/components/reconpro/unified-cli';
import { HallOfFame } from '@/components/reconpro/hall-of-fame';
import { NHIKillSwitch } from '@/components/reconpro/nhi-kill-switch';
import { DemoModeProvider, DemoModeToggle, InvestorWalkthrough } from '@/components/reconpro/demo-mode';
import { WhiteLabelPanel } from '@/components/reconpro/white-label';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { useXPSystem, XPBar, BadgePopup } from '@/hooks/use-xp-system';
import {
  useDopamineEngine, ConfettiCanvas, FloatingXPCanvas, ScreenEffects,
  CelebrationScreen, AchievementToasts, ComboCounter,
  MilestoneCelebration, AnticipationProgressBar,
} from '@/components/reconpro/dopamine-engine';

// ─── Types ───────────────────────────────────────────────────

type View = 'dashboard' | 'executive' | 'scan' | 'radar' | 'globe' | 'advisor' | 'surface' | 'threats' | 'history' | 'team' | 'compliance' | 'integrations' | 'monitoring' | 'proof' | 'vulns' | 'unified-cli' | 'pricing' | 'white-label' | 'hall-of-fame' | 'nhi-kill-switch';

interface Finding {
  id: string; title: string; severity: string; category: string;
  description: string; evidence: string | null; asset: string;
}

interface ScanResult {
  id: string; domain: string; status: string; riskScore: number;
  totalVulns: number; critical: number; high: number; medium: number;
  low: number; info: number; findings: Finding[];
}

interface DashboardStats {
  totalScans: number; totalFindings: number; criticalFindings: number;
  highFindings: number; mediumFindings: number; lowFindings: number;
  infoFindings: number; avgRiskScore: number; complianceScore?: number;
}

interface Threat {
  id: string; title: string; severity: string; source: string;
  description: string; ioc: string | null; createdAt: string;
}

interface RecentScan {
  id: string; domain: string; riskScore: number; totalVulns: number;
  criticalCount: number; highCount: number; mediumCount: number;
  lowCount: number; infoCount: number; status: string; startedAt: string;
  target: { domain: string; ip: string | null }; findings: Finding[];
}

const severityColors: Record<string, string> = {
  critical: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30',
  high: 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30',
  medium: 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30',
  low: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  info: 'bg-[#6b7280]/15 text-[#6b7280] border-[#6b7280]/30',
};

const SEVERITY_RADAR_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308',
  low: '#22c55e', info: '#6b7280',
};

// ─── Mini severity donut (SVG) ──────────────────────────────

function SeverityDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const segments = data.map((d, i) => {
    const pct = total === 0 ? 0 : d.value / total;
    const off = data.slice(0, i).reduce((s2, prev) => s2 + (total === 0 ? 0 : prev.value / total), 0);
    return { ...d, pct, dasharray: `${pct * 283} ${283}`, offset: -off * 283 };
  });
  if (total === 0) return <div className="text-xs text-muted-foreground text-center py-4">No data yet</div>;
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto">
      {segments.map((d) => (
        <circle key={d.name} cx="60" cy="60" r="45" fill="none"
          stroke={d.color} strokeWidth="18" strokeDasharray={d.dasharray}
          strokeDashoffset={d.offset} strokeLinecap="round" opacity={0.85} />
      ))}
      <text x="60" y="56" textAnchor="middle" fill="#e6edf3" fontSize="22" fontWeight="bold" fontFamily="Geist Sans, sans-serif">{total}</text>
      <text x="60" y="72" textAnchor="middle" fill="#7d8590" fontSize="9" fontFamily="Geist Sans, sans-serif">FINDINGS</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function Home() {
  const [activeView, setActiveView] = useState<View>('executive');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [allScans, setAllScans] = useState<RecentScan[]>([]);
  const [scanDomain, setScanDomain] = useState<string | null>(null);
  const [liveFindingCount, setLiveFindingCount] = useState(0);
  const [lastNewBadge, setLastNewBadge] = useState<{ id: string; name: string; description: string; unlockedAt: string | null } | null>(null);

  const sound = useSoundEffects();
  const xp = useXPSystem();
  const criticalFeed = CriticalAlertFeed();
  const dopamine = useDopamineEngine();

  const prevBadgeCount = useRef(0);
  useEffect(() => {
    const unlockedCount = xp.state.badges.filter(b => b.unlockedAt).length;
    if (unlockedCount > prevBadgeCount.current && prevBadgeCount.current > 0) {
      for (const badge of xp.state.badges) {
        if (badge.unlockedAt) { setLastNewBadge(badge); sound.play('levelUp'); break; }
      }
    }
    prevBadgeCount.current = unlockedCount;
  }, [xp.state.badges]);

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

  const initRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (initRef.current == null) {
      initRef.current = true;
      void Promise.all([fetchDashboard(), fetchThreats(), fetchScans()]);
    }
  });

  const handleScan = async (domain: string, scanType: string) => {
    setIsScanning(true);
    setScanResult(null);
    setScanDomain(domain);
    setLiveFindingCount(0);
    sound.play('scanStart');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, scanType }),
      });
      const data = await res.json();
      if (data.success) {
        setScanResult(data.scan);
        setActiveView('radar');
        sound.play('scanComplete');
        const findings = data.scan.findings || [];
        for (const f of findings) {
          if (f.severity === 'critical') { criticalFeed.addAlert('critical', f.title, f.evidence || ''); sound.play('criticalHit'); }
          else if (f.severity === 'high') { criticalFeed.addAlert('high', f.title, f.evidence || ''); sound.play('highHit'); }
        }
        xp.onScanComplete(findings, domain);
        dopamine.onScanComplete({
          domain, findings, riskScore: data.scan.riskScore,
          criticalCount: data.scan.critical, highCount: data.scan.high,
          xpGained: 50 + findings.length * 3, newLevel: false,
          streak: xp.state.streak, level: xp.state.level,
        });
        sound.play('xpGain');
        fetchDashboard(); fetchScans();
      }
    } catch { /* silent */ }
    setIsScanning(false);
    setScanDomain(null);
  };

  const handleLiveFinding = useCallback((finding: { severity: string; category: string; title: string }) => {
    setLiveFindingCount(prev => prev + 1);
    try {
      if (finding.severity === 'critical') sound.play('criticalHit');
      else if (finding.severity === 'high') sound.play('highHit');
      else sound.play('finding');
    } catch { /* ignore */ }
    dopamine.onFindingDiscovered(finding.severity, finding.title, finding.category);
  }, [dopamine]);

  // ─── View Handlers ───────────────────────────────────────

  const handleViewChange = (view: string) => {
    setActiveView(view as View);
  };

  // ─── Dashboard View ─────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Scans', value: dashboardStats?.totalScans ?? 0, color: '#00ff88' },
          { label: 'Total Findings', value: dashboardStats?.totalFindings ?? 0, color: '#f97316' },
          { label: 'Critical Issues', value: dashboardStats?.criticalFindings ?? 0, color: '#ef4444' },
          { label: 'Avg Risk Score', value: dashboardStats?.avgRiskScore ?? 0, color: '#eab308' },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="cyber-card rounded-xl p-4 hover:border-[rgba(0,255,136,0.2)] transition-all">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</div>
            <AnimatedCounter target={stat.value} color={stat.color} size="lg" />
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="cyber-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-4">Severity Breakdown</h3>
          <SeverityDonut data={[
            { name: 'Critical', value: dashboardStats?.criticalFindings ?? 0, color: '#ef4444' },
            { name: 'High', value: dashboardStats?.highFindings ?? 0, color: '#f97316' },
            { name: 'Medium', value: dashboardStats?.mediumFindings ?? 0, color: '#eab308' },
            { name: 'Low', value: dashboardStats?.lowFindings ?? 0, color: '#22c55e' },
            { name: 'Info', value: dashboardStats?.infoFindings ?? 0, color: '#6b7280' },
          ]} />
        </div>
        <div className="lg:col-span-2 cyber-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-4">Recent Scans</h3>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {recentScans.slice(0, 5).map((scan, i) => (
              <motion.div key={scan.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(0,255,136,0.15)] cursor-pointer"
                onClick={() => { if (scan.findings.length > 0) { setScanResult({ id: scan.id, domain: scan.target.domain, status: scan.status, riskScore: scan.riskScore, totalVulns: scan.totalVulns, critical: scan.criticalCount, high: scan.highCount, medium: scan.mediumCount, low: scan.lowCount, info: scan.infoCount, findings: scan.findings }); setActiveView('surface'); } }}>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono text-[#e6edf3]">{scan.target.domain}</div>
                </div>
                <div className="text-sm font-mono font-bold" style={{ color: scan.riskScore > 70 ? '#ef4444' : scan.riskScore > 40 ? '#f97316' : '#00ff88' }}>{scan.riskScore}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Scan View ──────────────────────────────────────────
  const renderScan = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4 py-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.15)]">
          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-glow" />
          <span className="text-xs font-mono text-[#00ff88] tracking-wider">RECONPRO ASM ENGINE v3.0.0 — ENTERPRISE</span>
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#e6edf3]">
          Attack Surface <span className="text-glow-green text-[#00ff88]">Intelligence</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
          Enterprise-grade reconnaissance across 13 categories. Real-time threat detection, compliance mapping, and continuous monitoring for your entire digital footprint.
        </p>
        <ScanInput onScan={handleScan} isScanning={isScanning} />
      </div>
      <XPBar state={xp.state} />
      <ScanOverlay isScanning={isScanning} domain={scanDomain} findingCount={liveFindingCount} onNewFinding={handleLiveFinding} />
      <AnimatePresence>
        {isScanning && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <LiveTerminal isScanning={isScanning} domain={scanDomain} />
          </motion.div>
        )}
      </AnimatePresence>
      {scanResult && activeView === 'scan' && <ScanResults result={scanResult} />}
    </div>
  );

  // ─── Radar View ────────────────────────────────────────
  const renderRadar = () => {
    const lastScan = allScans.length > 0 ? allScans[0] : null;
    const radarFindings = scanResult?.findings || (lastScan?.findings ?? []);
    const radarDomain = scanResult?.domain || lastScan?.target?.domain || 'awaiting-target';
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.12)]">
              <span className="text-sm font-mono text-[#00ff88]">RADAR MAPPING</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{radarDomain}</span>
          </div>
          {radarFindings.length === 0 && (
            <button onClick={() => setActiveView('scan')}
              className="px-4 py-2 rounded-xl bg-[#00ff88] text-[#080a10] font-semibold hover:bg-[#00cc6e] transition-all flex items-center gap-2 text-sm">
              Launch Scan First
            </button>
          )}
        </div>
        <RadarMap findings={radarFindings} domain={radarDomain} isScanning={isScanning} height={520} />
      </div>
    );
  };

  // ─── Attack Surface View ────────────────────────────────
  const renderSurface = () => (
    <div className="space-y-6">
      {scanResult ? (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.12)]">
              <span className="text-sm font-mono text-[#00ff88]">{scanResult.domain}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <span className="text-xs text-muted-foreground">Risk: <span className="font-bold" style={{ color: scanResult.riskScore > 70 ? '#ef4444' : scanResult.riskScore > 40 ? '#f97316' : '#00ff88' }}>{scanResult.riskScore}</span>/100</span>
            </div>
          </div>
          <AttackSurface findings={scanResult.findings} domain={scanResult.domain} riskScore={scanResult.riskScore} />
          <ScanResults result={scanResult} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">No Scan Data</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">Run a scan first to visualize the attack surface.</p>
          <button onClick={() => setActiveView('scan')} className="px-6 py-3 rounded-xl bg-[#00ff88] text-[#080a10] font-semibold hover:bg-[#00cc6e] transition-all">Launch Scan</button>
        </div>
      )}
    </div>
  );

  // ─── Threat Intel View ──────────────────────────────────
  const renderThreats = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e6edf3]">Threat Intelligence Feed</h2>
        <span className="text-xs text-muted-foreground font-mono">{threats.length} threats</span>
      </div>
      <div className="space-y-3">
        {threats.map((threat, i) => (
          <motion.div key={threat.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="cyber-card rounded-xl p-5 hover:border-[rgba(239,68,68,0.2)] transition-all group cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-[10px] px-2 py-0 rounded-full border ${severityColors[threat.severity]}`}>{threat.severity.toUpperCase()}</span>
                  <span className="text-[10px] px-2 py-0 rounded-full border border-[rgba(6,182,212,0.3)] text-[#06b6d4]">{threat.source}</span>
                </div>
                <h3 className="text-sm font-semibold text-[#e6edf3] group-hover:text-[#00ff88] transition-colors mb-1">{threat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{threat.description}</p>
                {threat.ioc && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.15)]">
                    <span className="text-[10px] text-[#06b6d4]">IOC:</span>
                    <span className="text-[11px] font-mono text-[#06b6d4]">{threat.ioc}</span>
                  </div>
                )}
              </div>
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
          <h3 className="text-lg font-semibold text-[#e6edf3] mb-2">No Scan History</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">Your past scans will appear here.</p>
          <button onClick={() => setActiveView('scan')} className="px-6 py-3 rounded-xl bg-[#00ff88] text-[#080a10] font-semibold hover:bg-[#00cc6e] transition-all">Launch Your First Scan</button>
        </div>
      ) : (
        <div className="space-y-2">
          {allScans.map((scan, i) => (
            <motion.div key={scan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="cyber-card rounded-xl p-4 hover:border-[rgba(0,255,136,0.2)] transition-all cursor-pointer group"
              onClick={() => { if (scan.findings.length > 0) { setScanResult({ id: scan.id, domain: scan.target.domain, status: scan.status, riskScore: scan.riskScore, totalVulns: scan.totalVulns, critical: scan.criticalCount, high: scan.highCount, medium: scan.mediumCount, low: scan.lowCount, info: scan.infoCount, findings: scan.findings }); setActiveView('surface'); } }}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-sm font-mono text-[#e6edf3] group-hover:text-[#00ff88] transition-colors">{scan.target.domain}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(scan.startedAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-lg font-mono font-bold" style={{ color: scan.riskScore > 70 ? '#ef4444' : scan.riskScore > 40 ? '#f97316' : '#00ff88' }}>{scan.riskScore}</div>
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
      case 'executive': return <CEODashboard stats={dashboardStats} recentScans={recentScans} onNavigate={handleViewChange} />;
      case 'dashboard': return renderDashboard();
      case 'scan': return renderScan();
      case 'radar': return renderRadar();
      case 'globe': return <ThreatGlobe />;
      case 'advisor': {
        const lastScan = allScans.length > 0 ? allScans[0] : null;
        return <AIAdvisor findings={scanResult?.findings || (lastScan?.findings ?? [])} domain={scanResult?.domain || lastScan?.target?.domain || 'awaiting-target'} />;
      }
      case 'surface': return renderSurface();
      case 'threats': return renderThreats();
      case 'history': return renderHistory();
      case 'team': return <TeamManagement members={[]} teams={[]} />;
      case 'compliance': return <CompliancePanel />;
      case 'integrations': return <IntegrationHub />;
      case 'monitoring': return <MonitoringPanel />;
      case 'proof': return <LiveProofPanel onNavigate={handleViewChange} />;
      case 'vulns': return <VulnArsenal />;
      case 'unified-cli': return <UnifiedCLI />;
      case 'pricing': return <PricingPlans onNavigate={handleViewChange} />;
      case 'white-label': return <WhiteLabelPanel />;
      case 'hall-of-fame': return <HallOfFame />;
      case 'nhi-kill-switch': return <NHIKillSwitch />;
      default: return renderScan();
    }
  };

  // ─── Main Layout ────────────────────────────────────────
  return (
    <DemoModeProvider>
      <div className="min-h-screen flex flex-col bg-[#080a10] cyber-grid">
        {/* Enterprise Sidebar */}
        <EnterpriseSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 border-b border-[rgba(0,255,136,0.06)] bg-[#080a10]/80 backdrop-blur-xl">
          <div className="px-6">
            <div className="flex items-center justify-between h-14">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">ReconPro</span>
                <span className="text-xs text-muted-foreground/40">/</span>
                <span className="text-xs text-[#e6edf3] font-medium capitalize">{activeView.replace(/([A-Z])/g, ' $1').trim()}</span>
              </div>
              {/* Right actions */}
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                  <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                  <span className="text-[11px] text-muted-foreground font-mono">SYSTEM ONLINE</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.12)]">
                  <span className="text-[10px] font-mono text-[#00ff88]">ENTERPRISE PLAN</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ff88] to-[#06b6d4] flex items-center justify-center text-[#080a10] font-bold text-xs">
                  AC
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Dopamine Effects Layer */}
        <ConfettiCanvas particles={dopamine.confettiParticles} />
        <FloatingXPCanvas popups={dopamine.floatingXPPopups} />
        <ScreenEffects shaking={dopamine.shaking} flashColor={dopamine.flashColor} />
        <ComboCounter combo={dopamine.combo} />
        <AchievementToasts achievements={dopamine.achievements} />
        <CelebrationScreen data={dopamine.celebration} onClose={dopamine.closeCelebration} />
        <MilestoneCelebration data={dopamine.milestone} onClose={dopamine.closeMilestone} />
        <criticalFeed.AlertFeedUI alerts={criticalFeed.alerts} onDismiss={criticalFeed.dismiss} />
        <BadgePopup badge={lastNewBadge} onClose={() => setLastNewBadge(null)} />

        {/* Footer */}
        <footer className="border-t border-[rgba(255,255,255,0.04)] py-3">
          <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                SOC 2 Type II Certified
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
                HIPAA Compliant
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                ISO 27001
              </span>
            </div>
            <div className="flex items-center gap-3">
              <DemoModeToggle position="header" />
              <div className="text-[11px] text-muted-foreground/50">
                ReconPro Enterprise v3.1.0
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Demo Mode Floating Toggle */}
      <DemoModeToggle position="floating" />
    </div>
    </DemoModeProvider>
  );
}

