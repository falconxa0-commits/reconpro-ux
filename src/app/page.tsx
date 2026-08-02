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
import { GenesisStampPanel } from '@/components/reconpro/genesis-stamp';
import { ImplosionPanel } from '@/components/reconpro/implosion-panel';
import { WarRoomPanel } from '@/components/reconpro/war-room';
import { ProofGallery } from '@/components/reconpro/proof-gallery';
import { AILeaderboard } from '@/components/reconpro/ai-leaderboard';
import { DoomClockPanel } from '@/components/reconpro/doom-clock';
import { FearIndexPanel } from '@/components/reconpro/fear-index';
import { PQCVaultPanel } from '@/components/reconpro/pqc-vault';
import { ExposedAssetMapPanel } from '@/components/reconpro/exposed-asset-map';
import { ConfusedDeputyPanel } from '@/components/reconpro/confused-deputy';
import { CognitiveDreadPanel } from '@/components/reconpro/cognitive-dread';
import { WallOfShamePanel } from '@/components/reconpro/wall-of-shame';
import { SovereignControlPanel } from '@/components/reconpro/sovereign-control';
import { CNISentinelPanel } from '@/components/reconpro/cni-sentinel';
import { BroadcastCenterPanel } from '@/components/reconpro/broadcast-center';
import { MatrixTerminalPanel } from '@/components/reconpro/matrix-terminal';
import { PegasusInspectorPanel } from '@/components/reconpro/pegasus-inspector';
import { TrainingClusterPanel } from '@/components/reconpro/training-cluster';
import { AirGappedAppliancePanel } from '@/components/reconpro/air-gapped-appliance';
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

type View = 'dashboard' | 'executive' | 'scan' | 'radar' | 'globe' | 'advisor' | 'surface' | 'threats' | 'history' | 'team' | 'compliance' | 'integrations' | 'monitoring' | 'proof' | 'vulns' | 'unified-cli' | 'pricing' | 'white-label' | 'hall-of-fame' | 'nhi-kill-switch' | 'genesis-stamp' | 'implosion' | 'war-room' | 'proof-gallery' | 'ai-leaderboard' | 'doom-clock' | 'fear-index' | 'pqc-vault' | 'exposed-asset-map' | 'confused-deputy' | 'cognitive-dread' | 'wall-of-shame' | 'sovereign-control' | 'cni-sentinel' | 'broadcast-center' | 'matrix-terminal' | 'pegasus-inspector' | 'training-cluster' | 'air-gapped-appliance';

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
  critical: 'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20',
  high: 'bg-[#fb923c]/10 text-[#fb923c] border-[#fb923c]/20',
  medium: 'bg-[#facc15]/10 text-[#facc15] border-[#facc15]/20',
  low: 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20',
  info: 'bg-[#6b7280]/10 text-[#6b7280] border-[#6b7280]/20',
};

const SEVERITY_RADAR_COLORS: Record<string, string> = {
  critical: '#f43f5e', high: '#fb923c', medium: '#facc15',
  low: '#34d399', info: '#6b7280',
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
      <text x="60" y="56" textAnchor="middle" fill="#f1f5f9" fontSize="22" fontWeight="bold" fontFamily="Geist Sans, sans-serif">{total}</text>
      <text x="60" y="72" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="Geist Sans, sans-serif">FINDINGS</text>
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

  const handleViewChange = (view: string) => {
    setActiveView(view as View);
  };

  // ─── Dashboard View ─────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Scans', value: dashboardStats?.totalScans ?? 0, color: '#34d399' },
          { label: 'Total Findings', value: dashboardStats?.totalFindings ?? 0, color: '#fb923c' },
          { label: 'Critical Issues', value: dashboardStats?.criticalFindings ?? 0, color: '#f43f5e' },
          { label: 'Avg Risk Score', value: dashboardStats?.avgRiskScore ?? 0, color: '#facc15' },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="stat-card p-4" style={{ '--accent-line': `${stat.color}40` } as React.CSSProperties}>
            <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#475569] mb-3">{stat.label}</div>
            <AnimatedCounter target={stat.value} color={stat.color} size="lg" />
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="cyber-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-4">Severity Breakdown</h3>
          <SeverityDonut data={[
            { name: 'Critical', value: dashboardStats?.criticalFindings ?? 0, color: '#f43f5e' },
            { name: 'High', value: dashboardStats?.highFindings ?? 0, color: '#fb923c' },
            { name: 'Medium', value: dashboardStats?.mediumFindings ?? 0, color: '#facc15' },
            { name: 'Low', value: dashboardStats?.lowFindings ?? 0, color: '#34d399' },
            { name: 'Info', value: dashboardStats?.infoFindings ?? 0, color: '#6b7280' },
          ]} />
        </div>
        <div className="lg:col-span-2 cyber-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-4">Recent Scans</h3>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-none">
            {recentScans.slice(0, 5).map((scan, i) => (
              <motion.div key={scan.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.03)] hover:border-[rgba(52,211,153,0.1)] cursor-pointer transition-all duration-300"
                onClick={() => { if (scan.findings.length > 0) { setScanResult({ id: scan.id, domain: scan.target.domain, status: scan.status, riskScore: scan.riskScore, totalVulns: scan.totalVulns, critical: scan.criticalCount, high: scan.highCount, medium: scan.mediumCount, low: scan.lowCount, info: scan.infoCount, findings: scan.findings }); setActiveView('surface'); } }}>
                <div className="flex items-center gap-3">
                  <div className="text-[13px] font-mono text-[#e2e8f0]">{scan.target.domain}</div>
                </div>
                <div className="text-[13px] font-mono font-bold" style={{ color: scan.riskScore > 70 ? '#f43f5e' : scan.riskScore > 40 ? '#fb923c' : '#34d399' }}>{scan.riskScore}</div>
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
      <div className="text-center space-y-4 py-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[rgba(52,211,153,0.06)] border border-[rgba(52,211,153,0.1)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse-glow" />
          <span className="text-[10.5px] font-mono text-[#34d399] tracking-[0.2em] uppercase">ASM Engine v3.0 — Enterprise</span>
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#f1f5f9]">
          Attack Surface <span className="text-glow-green text-[#34d399]">Intelligence</span>
        </h1>
        <p className="text-[#64748b] max-w-xl mx-auto text-sm leading-relaxed">
          Enterprise-grade reconnaissance across 13 categories. Real-time threat detection, compliance mapping, and continuous monitoring.
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(52,211,153,0.05)] border border-[rgba(52,211,153,0.1)]">
              <span className="text-[11px] font-mono text-[#34d399] tracking-wider">RADAR MAPPING</span>
            </div>
            <span className="text-[11px] text-[#475569] font-mono">{radarDomain}</span>
          </div>
          {radarFindings.length === 0 && (
            <button onClick={() => setActiveView('scan')}
              className="btn-primary text-[12px] px-4 py-2">
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(52,211,153,0.05)] border border-[rgba(52,211,153,0.1)]">
              <span className="text-[12px] font-mono text-[#34d399]">{scanResult.domain}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
              <span className="text-[11px] text-[#64748b]">Risk: <span className="font-bold" style={{ color: scanResult.riskScore > 70 ? '#f43f5e' : scanResult.riskScore > 40 ? '#fb923c' : '#34d399' }}>{scanResult.riskScore}</span>/100</span>
            </div>
          </div>
          <AttackSurface findings={scanResult.findings} domain={scanResult.domain} riskScore={scanResult.riskScore} />
          <ScanResults result={scanResult} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-2">No Scan Data</h3>
          <p className="text-sm text-[#64748b] max-w-sm mb-6">Run a scan first to visualize the attack surface.</p>
          <button onClick={() => setActiveView('scan')} className="btn-primary">Launch Scan</button>
        </div>
      )}
    </div>
  );

  // ─── Threat Intel View ──────────────────────────────────
  const renderThreats = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#f1f5f9]">Threat Intelligence Feed</h2>
        <span className="text-[10px] text-[#475569] font-mono">{threats.length} threats</span>
      </div>
      <div className="space-y-2.5">
        {threats.map((threat, i) => (
          <motion.div key={threat.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="cyber-card p-4 hover:border-[rgba(244,63,94,0.12)] group cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-md border font-medium ${severityColors[threat.severity]}`}>{threat.severity.toUpperCase()}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-md border border-[rgba(34,211,238,0.2)] text-[#22d3ee] font-medium">{threat.source}</span>
                </div>
                <h3 className="text-[13px] font-semibold text-[#e2e8f0] group-hover:text-[#34d399] transition-colors mb-1">{threat.title}</h3>
                <p className="text-[12px] text-[#64748b] leading-relaxed">{threat.description}</p>
                {threat.ioc && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(34,211,238,0.05)] border border-[rgba(34,211,238,0.1)]">
                    <span className="text-[9px] text-[#22d3ee] font-medium">IOC:</span>
                    <span className="text-[11px] font-mono text-[#22d3ee]">{threat.ioc}</span>
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
        <h2 className="text-base font-semibold text-[#f1f5f9]">Scan History</h2>
        <span className="text-[10px] text-[#475569] font-mono">{allScans.length} scans</span>
      </div>
      {allScans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-2">No Scan History</h3>
          <p className="text-sm text-[#64748b] max-w-sm mb-6">Your past scans will appear here.</p>
          <button onClick={() => setActiveView('scan')} className="btn-primary">Launch Your First Scan</button>
        </div>
      ) : (
        <div className="space-y-2">
          {allScans.map((scan, i) => (
            <motion.div key={scan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="cyber-card p-4 hover:border-[rgba(52,211,153,0.1)] cursor-pointer group transition-all duration-300"
              onClick={() => { if (scan.findings.length > 0) { setScanResult({ id: scan.id, domain: scan.target.domain, status: scan.status, riskScore: scan.riskScore, totalVulns: scan.totalVulns, critical: scan.criticalCount, high: scan.highCount, medium: scan.mediumCount, low: scan.lowCount, info: scan.infoCount, findings: scan.findings }); setActiveView('surface'); } }}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-[13px] font-mono text-[#e2e8f0] group-hover:text-[#34d399] transition-colors">{scan.target.domain}</div>
                  <div className="text-[10.5px] text-[#475569] hidden sm:block">{new Date(scan.startedAt).toLocaleString()}</div>
                </div>
                <div className="text-base font-mono font-bold" style={{ color: scan.riskScore > 70 ? '#f43f5e' : scan.riskScore > 40 ? '#fb923c' : '#34d399' }}>{scan.riskScore}</div>
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
        const advisorFindings = scanResult?.findings || (lastScan ? lastScan.findings : []);
        const advisorDomain = scanResult?.domain || (lastScan ? lastScan.target.domain : 'awaiting-target');
        return <AIAdvisor findings={advisorFindings} domain={advisorDomain} />;
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
      case 'genesis-stamp': return <GenesisStampPanel />;
      case 'implosion': return <ImplosionPanel />;
      case 'war-room': return <WarRoomPanel />;
      case 'proof-gallery': return <ProofGallery />;
      case 'ai-leaderboard': return <AILeaderboard />;
      case 'doom-clock': return <DoomClockPanel />;
      case 'fear-index': return <FearIndexPanel />;
      case 'pqc-vault': return <PQCVaultPanel />;
      case 'exposed-asset-map': return <ExposedAssetMapPanel />;
      case 'confused-deputy': return <ConfusedDeputyPanel />;
      case 'cognitive-dread': return <CognitiveDreadPanel />;
      case 'wall-of-shame': return <WallOfShamePanel />;
      case 'sovereign-control': return <SovereignControlPanel />;
      case 'cni-sentinel': return <CNISentinelPanel />;
      case 'broadcast-center': return <BroadcastCenterPanel />;
      case 'matrix-terminal': return <MatrixTerminalPanel />;
      case 'pegasus-inspector': return <PegasusInspectorPanel />;
      case 'training-cluster': return <TrainingClusterPanel />;
      case 'air-gapped-appliance': return <AirGappedAppliancePanel />;
      default: return renderScan();
    }
  };

  // ─── Main Layout ────────────────────────────────────────
  return (
    <DemoModeProvider>
      <div className="min-h-screen flex bg-[#030407] noise-bg">
        {/* Enterprise Sidebar */}
        <EnterpriseSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Top Bar ── */}
        <header className="sticky top-0 z-50 bg-[#030407]/70 backdrop-blur-2xl">
          <div className="h-px bg-gradient-to-r from-transparent via-[rgba(52,211,153,0.08)] to-transparent" />
          <div className="px-6">
            <div className="flex items-center justify-between h-12">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#334155] font-medium">ReconPro</span>
                <span className="text-[11px] text-[#1e293b]">/</span>
                <span className="text-[11px] text-[#94a3b8] font-medium capitalize">
                  {activeView.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
              {/* Right actions */}
              <div className="flex items-center gap-2.5">
                {/* System status pill */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                  <span className="text-[10px] text-[#475569] font-mono tracking-wider">ONLINE</span>
                </div>
                {/* Plan badge */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(52,211,153,0.04)] border border-[rgba(52,211,153,0.08)]">
                  <span className="text-[9px] font-mono text-[#34d399] tracking-[0.15em] font-semibold">ENTERPRISE</span>
                </div>
                {/* Avatar */}
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#34d399] to-[#22d3ee] flex items-center justify-center text-[#030407] font-bold text-[10px]">
                  AC
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* ── Dopamine Effects Layer ── */}
        <ConfettiCanvas particles={dopamine.confettiParticles} />
        <FloatingXPCanvas popups={dopamine.floatingXPPopups} />
        <ScreenEffects shaking={dopamine.shaking} flashColor={dopamine.flashColor} />
        <ComboCounter combo={dopamine.combo} />
        <AchievementToasts achievements={dopamine.achievements} />
        <CelebrationScreen data={dopamine.celebration} onClose={dopamine.closeCelebration} />
        <MilestoneCelebration data={dopamine.milestone} onClose={dopamine.closeMilestone} />
        <criticalFeed.AlertFeedUI alerts={criticalFeed.alerts} onDismiss={criticalFeed.dismiss} />
        <BadgePopup badge={lastNewBadge} onClose={() => setLastNewBadge(null)} />

        {/* ── Footer ── */}
        <footer className="border-t border-[rgba(255,255,255,0.025)] mt-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-5 text-[10px] text-[#334155]">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#34d399]" />
                SOC 2 Type II
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#22d3ee]" />
                HIPAA
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#a78bfa]" />
                ISO 27001
              </span>
            </div>
            <div className="flex items-center gap-3">
              <DemoModeToggle position="header" />
              <span className="text-[10px] text-[#1e293b] font-mono">
                v3.1.0
              </span>
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
