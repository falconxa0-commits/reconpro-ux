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
import { BottomDock } from '@/components/reconpro/bottom-dock';
import { BentoDashboard } from '@/components/reconpro/bento-dashboard';
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
import { DemoModeProvider, DemoModeToggle } from '@/components/reconpro/demo-mode';
import { WhiteLabelPanel } from '@/components/reconpro/white-label';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { useXPSystem, XPBar, BadgePopup } from '@/hooks/use-xp-system';
import {
  useDopamineEngine, ConfettiCanvas, FloatingXPCanvas, ScreenEffects,
  CelebrationScreen, AchievementToasts, ComboCounter,
  MilestoneCelebration,
} from '@/components/reconpro/dopamine-engine';
import { X } from 'lucide-react';

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
  critical: 'bg-[#ff3355]/10 text-[#ff3355] border-[#ff3355]/20',
  high: 'bg-[#ff8844]/10 text-[#ff8844] border-[#ff8844]/20',
  medium: 'bg-[#ffaa00]/10 text-[#ffaa00] border-[#ffaa00]/20',
  low: 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20',
  info: 'bg-[#444444]/10 text-[#444444] border-[#444444]/20',
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard');
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

  // ─── Back to bento ────────────────────────────────────────
  const goHome = () => setActiveView('dashboard');

  // ─── Panel views render inside a full-bleed overlay ────────
  const renderPanelView = (content: React.ReactNode, title: string) => (
    <div className="min-h-screen pb-28">
      {/* Minimal top bar for panel views */}
      <div className="sticky top-0 z-40 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goHome}
            className="flex items-center gap-2 text-[12px] text-[#444444] hover:text-[#666666] transition-colors font-mono"
          >
            <span className="text-[#ffffff]">←</span> back
          </button>
          <h2 className="text-[13px] font-semibold text-[#f0f0f0] tracking-tight">{title}</h2>
          <div className="w-12" />
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        {content}
      </div>
    </div>
  );

  // ─── Scan View ────────────────────────────────────────────
  const renderScan = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg text-center space-y-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffffff] animate-pulse" />
          <span className="text-[10px] font-mono text-[#555555] tracking-[0.2em]">ASM ENGINE v4.0</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#f0f0f0]">
          Attack Surface <span className="text-gradient-void">Intelligence</span>
        </h1>
        <p className="text-[13px] text-[#444444] leading-relaxed max-w-md mx-auto">
          Enterprise-grade reconnaissance across 13 categories. Real-time threat detection and compliance mapping.
        </p>
        <ScanInput onScan={handleScan} isScanning={isScanning} />
      </motion.div>
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

  // ─── Radar View ───────────────────────────────────────────
  const renderRadar = () => {
    const lastScan = allScans.length > 0 ? allScans[0] : null;
    const radarFindings = scanResult?.findings || (lastScan?.findings ?? []);
    const radarDomain = scanResult?.domain || lastScan?.target?.domain || 'awaiting-target';
    return renderPanelView(
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#ffffff] tracking-wider">RADAR</span>
          <span className="text-[11px] text-[#444444] font-mono">{radarDomain}</span>
        </div>
        <RadarMap findings={radarFindings} domain={radarDomain} isScanning={isScanning} height={520} />
      </div>,
      'Radar Map'
    );
  };

  // ─── Threat Intel ──────────────────────────────────────────
  const renderThreats = () => (
    renderPanelView(
      <div className="space-y-3">
        <span className="text-[10px] font-mono text-[#444444] tracking-[0.15em] uppercase">{threats.length} threats</span>
        <div className="space-y-2">
          {threats.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bento-tile p-4 hover:border-[rgba(232,64,87,0.1)] group cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] px-2 py-0.5 rounded-md border font-medium ${severityColors[t.severity]}`}>{t.severity.toUpperCase()}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-md border border-[rgba(91,168,212,0.15)] text-[#44aaff] font-medium">{t.source}</span>
              </div>
              <h3 className="text-[13px] font-semibold text-[#f0f0f0] group-hover:text-[#ffffff] transition-colors mb-1">{t.title}</h3>
              <p className="text-[12px] text-[#444444] leading-relaxed">{t.description}</p>
            </motion.div>
          ))}
        </div>
      </div>,
      'Threat Intelligence'
    )
  );

  // ─── Scan History ──────────────────────────────────────────
  const renderHistory = () => (
    renderPanelView(
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-[#444444] tracking-[0.15em] uppercase">{allScans.length} scans</span>
        {allScans.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#333333] text-sm">No scan history yet</p>
          </div>
        ) : (
          allScans.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bento-tile p-4 cursor-pointer group"
              onClick={() => { if (s.findings.length > 0) { setScanResult({ id: s.id, domain: s.target.domain, status: s.status, riskScore: s.riskScore, totalVulns: s.totalVulns, critical: s.criticalCount, high: s.highCount, medium: s.mediumCount, low: s.lowCount, info: s.infoCount, findings: s.findings }); setActiveView('surface'); } }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-mono text-[#666666] group-hover:text-[#ffffff] transition-colors">{s.target.domain}</span>
                <span className="text-[14px] font-mono font-bold" style={{ color: s.riskScore > 70 ? '#ff3355' : s.riskScore > 40 ? '#ffaa00' : '#00ff88' }}>{s.riskScore}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>,
      'Scan History'
    )
  );

  // ─── Attack Surface ────────────────────────────────────────
  const renderSurface = () => {
    if (!scanResult) {
      return renderPanelView(
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-[#333333] text-sm mb-4">Run a scan first</p>
          <button onClick={() => setActiveView('scan')} className="btn-void-primary">Launch Scan</button>
        </div>,
        'Attack Surface'
      );
    }
    return renderPanelView(
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-mono text-[#ffffff]">{scanResult.domain}</span>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#666666]">
            Risk: <span className="font-bold" style={{ color: scanResult.riskScore > 70 ? '#ff3355' : scanResult.riskScore > 40 ? '#ffaa00' : '#00ff88' }}>{scanResult.riskScore}</span>/100
          </span>
        </div>
        <AttackSurface findings={scanResult.findings} domain={scanResult.domain} riskScore={scanResult.riskScore} />
        <ScanResults result={scanResult} />
      </div>,
      'Attack Surface'
    );
  };

  // ─── Render Active View ─────────────────────────────────────
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <BentoDashboard stats={dashboardStats} recentScans={recentScans} onNavigate={handleViewChange} />;
      case 'executive':
        return renderPanelView(<CEODashboard stats={dashboardStats} recentScans={recentScans} onNavigate={handleViewChange} />, 'Executive Briefing');
      case 'scan': return renderScan();
      case 'radar': return renderRadar();
      case 'globe':
        return renderPanelView(<ThreatGlobe />, 'Threat Map');
      case 'advisor': {
        const lastScan = allScans.length > 0 ? allScans[0] : null;
        const advisorFindings = scanResult?.findings || (lastScan ? lastScan.findings : []);
        const advisorDomain = scanResult?.domain || (lastScan ? lastScan.target.domain : 'awaiting-target');
        return renderPanelView(<AIAdvisor findings={advisorFindings} domain={advisorDomain} />, 'AI Advisor');
      }
      case 'surface': return renderSurface();
      case 'threats': return renderThreats();
      case 'history': return renderHistory();
      case 'team': return renderPanelView(<TeamManagement members={[]} teams={[]} />, 'Team');
      case 'compliance': return renderPanelView(<CompliancePanel />, 'Compliance');
      case 'integrations': return renderPanelView(<IntegrationHub />, 'Integrations');
      case 'monitoring': return renderPanelView(<MonitoringPanel />, 'Monitoring');
      case 'proof': return renderPanelView(<LiveProofPanel onNavigate={handleViewChange} />, 'Live Proof');
      case 'vulns': return renderPanelView(<VulnArsenal />, 'Vulnerability Arsenal');
      case 'unified-cli': return renderPanelView(<UnifiedCLI />, 'ReconPro CLI');
      case 'pricing': return renderPanelView(<PricingPlans onNavigate={handleViewChange} />, 'Pricing');
      case 'white-label': return renderPanelView(<WhiteLabelPanel />, 'White-Label');
      case 'hall-of-fame': return renderPanelView(<HallOfFame />, 'Hall of Fame');
      case 'nhi-kill-switch': return renderPanelView(<NHIKillSwitch />, 'NHI Kill Switch');
      case 'genesis-stamp': return renderPanelView(<GenesisStampPanel />, 'Genesis Stamp');
      case 'implosion': return renderPanelView(<ImplosionPanel />, 'Risk Simulator');
      case 'war-room': return renderPanelView(<WarRoomPanel />, 'War Room');
      case 'proof-gallery': return renderPanelView(<ProofGallery />, 'Proof Gallery');
      case 'ai-leaderboard': return renderPanelView(<AILeaderboard />, 'Hall of Broken Models');
      case 'doom-clock': return renderPanelView(<DoomClockPanel />, 'Doom Clock');
      case 'fear-index': return renderPanelView(<FearIndexPanel />, 'CISO Fear Index');
      case 'pqc-vault': return renderPanelView(<PQCVaultPanel />, 'PQC Vault');
      case 'exposed-asset-map': return renderPanelView(<ExposedAssetMapPanel />, 'Exposed Assets');
      case 'confused-deputy': return renderPanelView(<ConfusedDeputyPanel />, 'Confused Deputy');
      case 'cognitive-dread': return renderPanelView(<CognitiveDreadPanel />, 'Cognitive Dread');
      case 'wall-of-shame': return renderPanelView(<WallOfShamePanel />, 'Wall of Shame');
      case 'sovereign-control': return renderPanelView(<SovereignControlPanel />, 'Sovereign Control');
      case 'cni-sentinel': return renderPanelView(<CNISentinelPanel />, 'CNI Sentinel');
      case 'broadcast-center': return renderPanelView(<BroadcastCenterPanel />, 'Broadcast Center');
      case 'matrix-terminal': return renderPanelView(<MatrixTerminalPanel />, 'Matrix Terminal');
      case 'pegasus-inspector': return renderPanelView(<PegasusInspectorPanel />, 'Pegasus Inspector');
      case 'training-cluster': return renderPanelView(<TrainingClusterPanel />, 'GPU Training');
      case 'air-gapped-appliance': return renderPanelView(<AirGappedAppliancePanel />, 'Air-Gapped');
      default: return <BentoDashboard stats={dashboardStats} recentScans={recentScans} onNavigate={handleViewChange} />;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // VOID LAYOUT — No sidebar, bottom dock, full-bleed content
  // ═══════════════════════════════════════════════════════════
  return (
    <DemoModeProvider>
      <div className="min-h-screen bg-black">
        {/* Ambient background orbs */}
        <div className="void-bg" />
        {/* Noise texture */}
        <div className="noise-bg" />

        {/* Main content — full bleed */}
        <div className="relative z-10 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Dock Navigation */}
        <BottomDock activeView={activeView} onViewChange={handleViewChange} />

        {/* Dopamine Effects */}
        <ConfettiCanvas particles={dopamine.confettiParticles} />
        <FloatingXPCanvas popups={dopamine.floatingXPPopups} />
        <ScreenEffects shaking={dopamine.shaking} flashColor={dopamine.flashColor} />
        <ComboCounter combo={dopamine.combo} />
        <AchievementToasts achievements={dopamine.achievements} />
        <CelebrationScreen data={dopamine.celebration} onClose={dopamine.closeCelebration} />
        <MilestoneCelebration data={dopamine.milestone} onClose={dopamine.closeMilestone} />
        <criticalFeed.AlertFeedUI alerts={criticalFeed.alerts} onDismiss={criticalFeed.dismiss} />
        <BadgePopup badge={lastNewBadge} onClose={() => setLastNewBadge(null)} />

        {/* Floating demo toggle */}
        <DemoModeToggle position="floating" />
      </div>
    </DemoModeProvider>
  );
}
