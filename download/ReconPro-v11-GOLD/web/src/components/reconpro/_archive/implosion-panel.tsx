'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull, AlertTriangle, TrendingDown, DollarSign, Clock, Users, Shield,
  ShieldAlert, Zap, Target, ChevronRight, Play, Trash2, Save, Building,
  Factory, GraduationCap, Landmark, ShoppingBag, Monitor, FileText,
  ArrowDown, ArrowUp, Minus, Plus, CheckCircle, XCircle, Loader2,
  Flame, BarChart3, Activity, Radiation, Siren, AlertOctagon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type IndustryKey = 'healthcare' | 'finance' | 'technology' | 'retail' | 'government' | 'education';
type SeverityKey = 'minimal' | 'moderate' | 'severe' | 'catastrophic';

interface SimulationResult {
  dataBreachCost: number; detectionCost: number; containmentCost: number;
  lostBusinessCost: number; postBreachCost: number;
  regulatoryFines: number;
  fineBreakdown: { gdpr?: number; hipaa?: number; pci_dss?: number; sox?: number };
  reputationalDamage: number; customerChurnRate: number;
  estimatedCustomersLost: number; stockImpactPct: number;
  estimatedMarketCapLoss: number; operationalDowntime: number;
  revenuePerHour: number; downtimeRevenueLoss: number;
  insurancePremiumIncrease: number; currentAnnualPremium: number;
  newAnnualPremium: number;
  scanBasedAdjustments?: { vulnerabilityMultiplier: number; findingsUsed: number; criticalCount: number; highCount: number };
  narrative: string[];
  totalEstimatedImpact: number; recoveryTimeline: string;
}

interface IndustryComparison {
  industry: string; companyTotal: number; industryAvg: number;
  delta: number; deltaPct: number;
  percentiles: { cost: number; downtime: number; churn: number };
}

interface SavedScenario {
  id: string; createdAt: string; scenarioName: string;
  severityPreset: string; industry: string; companyName: string | null;
  annualRevenue: number | null; employeeCount: number | null;
  customerCount: number | null; dataBreachCost: number;
  regulatoryFines: number; reputationalDamage: number;
  operationalDowntime: number; customerChurnRate: number;
  stockImpactPct: number; insurancePremiumIncrease: number;
  scanId?: string | null; domain?: string | null;
}

interface ScanOption { id: string; target: { domain: string } | null; status: string; createdAt: string; }

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const INDUSTRIES: { key: IndustryKey; label: string; icon: React.ReactNode; avgCost: string; color: string }[] = [
  { key: 'healthcare', label: 'Healthcare', icon: <Building className="w-4 h-4" />, avgCost: '$10.93M avg breach', color: '#ff3355' },
  { key: 'finance', label: 'Finance', icon: <Landmark className="w-4 h-4" />, avgCost: '$5.90M avg breach', color: '#f59e0b' },
  { key: 'technology', label: 'Technology', icon: <Monitor className="w-4 h-4" />, avgCost: '$4.88M avg breach', color: '#3b82f6' },
  { key: 'retail', label: 'Retail', icon: <ShoppingBag className="w-4 h-4" />, avgCost: '$3.28M avg breach', color: '#8b5cf6' },
  { key: 'government', label: 'Government', icon: <Shield className="w-4 h-4" />, avgCost: '$4.72M avg breach', color: '#14b8a6' },
  { key: 'education', label: 'Education', icon: <GraduationCap className="w-4 h-4" />, avgCost: '$3.65M avg breach', color: '#06b6d4' },
];

const SEVERITY_PRESETS: { key: SeverityKey; label: string; description: string; color: string; borderColor: string; icon: React.ReactNode }[] = [
  { key: 'minimal', label: 'MINIMAL', description: 'Limited exposure, quick containment. Low financial impact.', color: '#22c55e', borderColor: 'border-green-900/60', icon: <Shield className="w-5 h-5" /> },
  { key: 'moderate', label: 'MODERATE', description: 'Standard breach scenario. Significant but recoverable.', color: '#f59e0b', borderColor: 'border-amber-900/60', icon: <AlertTriangle className="w-5 h-5" /> },
  { key: 'severe', label: 'SEVERE', description: 'Major breach with widespread exfiltration. Board-level crisis.', color: '#ff8844', borderColor: 'border-orange-900/60', icon: <AlertOctagon className="w-5 h-5" /> },
  { key: 'catastrophic', label: 'CATASTROPHIC', description: 'Existential threat. Complete system compromise.', color: '#ff3355', borderColor: 'border-red-900/60', icon: <Skull className="w-5 h-5" /> },
];

const TABS = [
  { id: 'configure', label: 'CONFIGURE', icon: <Target className="w-4 h-4" /> },
  { id: 'destruction', label: 'DESTRUCTION SEQUENCE', icon: <Flame className="w-4 h-4" /> },
  { id: 'whatif', label: 'WHAT-IF', icon: <Zap className="w-4 h-4" /> },
  { id: 'saved', label: 'SAVED SCENARIOS', icon: <Save className="w-4 h-4" /> },
];

const REG_LABELS: Record<string, string> = { gdpr: 'GDPR', hipaa: 'HIPAA', pci_dss: 'PCI DSS', sox: 'SOX' };

// ═══════════════════════════════════════════════════════════════════════
// Animated Number Hook
// ═══════════════════════════════════════════════════════════════════════

function useAnimatedNumber(target: number, duration = 2500) {
  const [display, setDisplay] = useState(0);
  // Track previous target to detect zero-transition
  const prevTargetRef = useRef(target);
  if (target === 0 && prevTargetRef.current !== 0) {
    prevTargetRef.current = target;
    setDisplay(0);
  } else {
    prevTargetRef.current = target;
  }

  useEffect(() => {
    if (target === 0) return;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target * 100) / 100);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return display;
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export function ImplosionPanel() {
  // ── State ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('configure');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState<IndustryKey>('technology');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [customerCount, setCustomerCount] = useState('');
  const [severity, setSeverity] = useState<SeverityKey>('moderate');
  const [linkedScanId, setLinkedScanId] = useState('');

  // Results
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [comparison, setComparison] = useState<IndustryComparison | null>(null);

  // Saved scenarios
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // What-If toggles
  const [fixCritical, setFixCritical] = useState(false);
  const [implementControls, setImplementControls] = useState(false);
  const [addInsurance, setAddInsurance] = useState(false);

  // Scans
  const [scans, setScans] = useState<ScanOption[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);

  // ── Fetch scans for linking ────────────────────────────────────
  const fetchScans = useCallback(async () => {
    setLoadingScans(true);
    try {
      const res = await fetch('/api/scans');
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans?.slice(0, 10) ?? []);
      }
    } catch { /* ignore */ } finally { setLoadingScans(false); }
  }, []);

  // ── Fetch saved scenarios ───────────────────────────────────────
  const fetchSaved = useCallback(async () => {
    setLoadingSaved(true);
    try {
      // The API requires organizationId or domain; try with a broad fetch
      const res = await fetch('/api/implosion');
      if (res.ok) {
        const data = await res.json();
        setSavedScenarios(data.scenarios ?? []);
      }
    } catch { /* ignore */ } finally { setLoadingSaved(false); }
  }, []);

  useEffect(() => { fetchScans(); fetchSaved(); }, [fetchScans, fetchSaved]);

  // ── Run Simulation ──────────────────────────────────────────────
  const runSimulation = async () => {
    setIsSimulating(true);
    setError(null);
    setSimulationComplete(false);
    setFixCritical(false);
    setImplementControls(false);
    setAddInsurance(false);

    try {
      const body: Record<string, unknown> = { industry };
      if (companyName) body.companyName = companyName;
      if (annualRevenue) body.annualRevenue = parseFloat(annualRevenue);
      if (employeeCount) body.employeeCount = parseInt(employeeCount);
      if (customerCount) body.customerCount = parseInt(customerCount);
      if (linkedScanId) body.scanId = linkedScanId;
      body.severityPreset = severity;

      const res = await fetch('/api/implosion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Simulation failed');
      }

      const data = await res.json();
      setResult(data.result);
      setComparison(data.comparison);

      // Delay for cinematic reveal
      setTimeout(() => {
        setSimulationComplete(true);
        setActiveTab('destruction');
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  // ── Delete scenario ────────────────────────────────────────────
  const deleteScenario = async (id: string) => {
    try {
      await fetch(`/api/implosion?id=${id}`, { method: 'DELETE' });
      setSavedScenarios(prev => prev.filter(s => s.id !== id));
    } catch { /* ignore */ }
  };

  // ── Load saved scenario into destruction view ────────────────────
  const loadScenario = (scenario: SavedScenario) => {
    const totalImpact = scenario.dataBreachCost + scenario.regulatoryFines +
      scenario.reputationalDamage + (scenario.stockImpactPct > 0 ? scenario.annualRevenue! * 20 * scenario.stockImpactPct / 100 : 0);
    const reconCost = (scenario.annualRevenue ?? 100) / 2000 * scenario.operationalDowntime;

    const loaded: SimulationResult = {
      dataBreachCost: scenario.dataBreachCost,
      detectionCost: scenario.dataBreachCost * 0.33,
      containmentCost: scenario.dataBreachCost * 0.28,
      lostBusinessCost: scenario.dataBreachCost * 0.35,
      postBreachCost: scenario.dataBreachCost * 0.04,
      regulatoryFines: scenario.regulatoryFines,
      fineBreakdown: {},
      reputationalDamage: scenario.reputationalDamage,
      customerChurnRate: scenario.customerChurnRate,
      estimatedCustomersLost: Math.round((scenario.customerCount ?? 10000) * scenario.customerChurnRate / 100),
      stockImpactPct: scenario.stockImpactPct,
      estimatedMarketCapLoss: scenario.stockImpactPct > 0 ? Math.round(scenario.annualRevenue! * 20 * scenario.stockImpactPct / 100) : 0,
      operationalDowntime: scenario.operationalDowntime,
      revenuePerHour: (scenario.annualRevenue ?? 100) / 2000,
      downtimeRevenueLoss: reconCost,
      insurancePremiumIncrease: scenario.insurancePremiumIncrease,
      currentAnnualPremium: 0, newAnnualPremium: 0,
      narrative: ['Scenario loaded from saved data. Run a new simulation for full narrative.'],
      totalEstimatedImpact: totalImpact + reconCost,
      recoveryTimeline: '—',
    };
    setResult(loaded);
    setComparison(null);
    setSimulationComplete(true);
    setActiveTab('destruction');
  };

  // ── What-If calculations ────────────────────────────────────────
  const getWhatIfReductions = () => {
    if (!result) return { fixCritical: 0, implementControls: 0, addInsurance: 0, total: 0, newTotal: 0, roi: 0 };
    const base = result.totalEstimatedImpact;
    const fixReduction = base * 0.25; // fixing critical vulns reduces 25%
    const controlReduction = base * 0.18; // implementing controls reduces 18%
    const insReduction = base * 0.12; // insurance covers 12%
    let reduction = 0;
    if (fixCritical) reduction += fixReduction;
    if (implementControls) reduction += controlReduction;
    if (addInsurance) reduction += insReduction;
    const reconProCost = 0.12; // $120K annual ReconPro cost
    const roi = reduction > reconProCost ? ((reduction - reconProCost) / reconProCost) : 0;
    return { fixCritical: fixReduction, implementControls: controlReduction, addInsurance: insReduction, total: reduction, newTotal: base - reduction, roi };
  };

  // ── Animated values for destruction view ─────────────────────────
  const animatedTotal = useAnimatedNumber(simulationComplete && result ? result.totalEstimatedImpact : 0);

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800/60 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-gradient-to-r from-gray-950 via-gray-900/50 to-gray-950">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-950/40 border border-red-900/40">
            <Radiation className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">PROOF-OF-IMPLOSION</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Executive Risk Simulator</p>
          </div>
          {result && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-900/40"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-mono font-bold">THREAT ASSESSED</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-800/60 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'destruction' && !result) return;
              setActiveTab(tab.id);
              if (tab.id === 'saved') fetchSaved();
            }}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2',
              activeTab === tab.id
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : tab.id === 'destruction' && !result
                  ? 'border-transparent text-gray-700 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/30'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'destruction' && result && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div className="min-h-[600px]">

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: CONFIGURE
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'configure' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6 space-y-8"
          >
            {/* Company info row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-900/60 focus:ring-1 focus:ring-red-900/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Industry
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.key}
                      onClick={() => setIndustry(ind.key)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all',
                        industry === ind.key
                          ? 'border-red-900/60 bg-red-950/30'
                          : 'border-gray-800/60 bg-gray-900/30 hover:border-gray-700'
                      )}
                    >
                      <span style={{ color: industry === ind.key ? ind.color : '#6b7280' }}>{ind.icon}</span>
                      <span className={cn('text-[10px] font-bold', industry === ind.key ? 'text-white' : 'text-gray-500')}>{ind.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-gray-600 font-mono">
                  {INDUSTRIES.find(i => i.key === industry)?.avgCost}
                </p>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <DollarSign className="w-3 h-3 inline mr-1" /> Annual Revenue (M USD)
                </label>
                <input
                  type="number"
                  value={annualRevenue}
                  onChange={e => setAnnualRevenue(e.target.value)}
                  placeholder="500"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-900/60 focus:ring-1 focus:ring-red-900/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Users className="w-3 h-3 inline mr-1" /> Employee Count
                </label>
                <input
                  type="number"
                  value={employeeCount}
                  onChange={e => setEmployeeCount(e.target.value)}
                  placeholder="2000"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-900/60 focus:ring-1 focus:ring-red-900/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Users className="w-3 h-3 inline mr-1" /> Customer Count
                </label>
                <input
                  type="number"
                  value={customerCount}
                  onChange={e => setCustomerCount(e.target.value)}
                  placeholder="50000"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-900/60 focus:ring-1 focus:ring-red-900/30 transition-all"
                />
              </div>
            </div>

            {/* Severity Presets */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                <AlertTriangle className="w-3 h-3 inline mr-1" /> Severity Preset
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SEVERITY_PRESETS.map(preset => (
                  <motion.button
                    key={preset.key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSeverity(preset.key)}
                    className={cn(
                      'relative p-4 rounded-xl border text-left transition-all overflow-hidden',
                      severity === preset.key
                        ? `${preset.borderColor} bg-gray-900/80`
                        : 'border-gray-800/60 bg-gray-900/30 hover:border-gray-700'
                    )}
                  >
                    {severity === preset.key && (
                      <motion.div
                        layoutId="severity-glow"
                        className="absolute inset-0 opacity-10"
                        style={{ background: `radial-gradient(ellipse at center, ${preset.color}, transparent 70%)` }}
                      />
                    )}
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ color: severity === preset.key ? preset.color : '#4b5563' }}>{preset.icon}</span>
                        <span className={cn('text-xs font-bold', severity === preset.key ? 'text-white' : 'text-gray-500')}>
                          {preset.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed">{preset.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Link a scan */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <FileText className="w-3 h-3 inline mr-1" /> Link Recent Scan (Optional)
              </label>
              <select
                value={linkedScanId}
                onChange={e => setLinkedScanId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-red-900/60 focus:ring-1 focus:ring-red-900/30 transition-all"
              >
                <option value="">No scan linked — use defaults</option>
                {scans.map(scan => (
                  <option key={scan.id} value={scan.id}>
                    {scan.target?.domain ?? 'Unknown'} — {scan.status} — {new Date(scan.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {loadingScans && <p className="mt-1 text-[10px] text-gray-600">Loading scans...</p>}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-red-950/30 border border-red-900/40"
              >
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            {/* RUN button */}
            <div className="flex justify-center pt-2">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(239,68,68,0.3)' }}
                whileTap={{ scale: 0.97 }}
                onClick={runSimulation}
                disabled={isSimulating}
                className={cn(
                  'relative flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all',
                  isSimulating
                    ? 'bg-gray-800 text-gray-500 cursor-wait'
                    : 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white hover:from-red-600 hover:via-red-500 hover:to-red-600 animate-pulse'
                )}
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Simulation
                    <Skull className="w-4 h-4 opacity-60" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: DESTRUCTION SEQUENCE
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'destruction' && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 space-y-8"
          >
            {/* ── TOTAL IMPACT HERO ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, type: 'spring' as const }}
              className="relative text-center py-10 rounded-xl bg-gradient-to-b from-red-950/30 via-gray-950 to-gray-950 border border-red-900/40 overflow-hidden"
            >
              {/* Scanline background effect */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
              }} />
              <p className="relative text-xs font-bold text-gray-500 uppercase tracking-[0.3em] mb-2">
                Total Estimated Financial Impact
              </p>
              <div className="relative">
                <motion.span
                  className="text-7xl font-black font-mono tracking-tight"
                  style={{ color: '#ff3355' }}
                  animate={simulationComplete ? {
                    textShadow: [
                      '0 0 20px rgba(239,68,68,0.4)',
                      '0 0 60px rgba(239,68,68,0.6)',
                      '0 0 20px rgba(239,68,68,0.4)',
                    ],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
                >
                  ${animatedTotal.toFixed(2)}M
                </motion.span>
              </div>
              <p className="relative mt-3 text-sm text-gray-500">
                Recovery Timeline: <span className="text-red-400 font-bold">{result.recoveryTimeline}</span>
              </p>
              {comparison && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="relative mt-1 text-xs text-gray-600 font-mono"
                >
                  Industry avg: ${comparison.industryAvg.toFixed(2)}M — {comparison.deltaPct > 0 ? '+' : ''}{comparison.deltaPct}%
                  {comparison.deltaPct > 0 ? ' worse' : ' better'} than peers
                </motion.p>
              )}
            </motion.div>

            {/* ── PHASE-BY-PHASE TIMELINE ───────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
                <Activity className="w-3 h-3 inline mr-1" /> Destruction Timeline
              </h3>

              {/* Phase 1: Initial Compromise */}
              <PhaseCard
                phaseNum={1}
                title="Initial Compromise"
                icon={<ShieldAlert className="w-5 h-5" />}
                color="#f59e0b"
                delay={0.3}
                metrics={[
                  { label: 'Downtime', value: `${result.operationalDowntime.toLocaleString()} hours`, icon: <Clock className="w-3.5 h-3.5" /> },
                  { label: 'Detection Cost', value: `$${result.detectionCost.toFixed(2)}M`, icon: <DollarSign className="w-3.5 h-3.5" /> },
                  { label: 'Revenue/Hour', value: `$${result.revenuePerHour.toFixed(4)}M`, icon: <TrendingDown className="w-3.5 h-3.5" /> },
                ]}
              />

              {/* Phase 2: Data Exfiltration */}
              <PhaseCard
                phaseNum={2}
                title="Data Exfiltration"
                icon={<FileText className="w-5 h-5" />}
                color="#ff8844"
                delay={0.8}
                metrics={[
                  { label: 'Lost Business', value: `$${result.lostBusinessCost.toFixed(2)}M`, icon: <TrendingDown className="w-3.5 h-3.5" /> },
                  { label: 'Containment Cost', value: `$${result.containmentCost.toFixed(2)}M`, icon: <DollarSign className="w-3.5 h-3.5" /> },
                  { label: 'Downtime Loss', value: `$${result.downtimeRevenueLoss.toFixed(2)}M`, icon: <ArrowDown className="w-3.5 h-3.5" /> },
                ]}
              />

              {/* Phase 3: Regulatory Storm */}
              <PhaseCard
                phaseNum={3}
                title="Regulatory Storm"
                icon={<AlertOctagon className="w-5 h-5" />}
                color="#ff3355"
                delay={1.3}
                showFines={true}
                fineBreakdown={result.fineBreakdown}
                regulatoryFines={result.regulatoryFines}
              />

              {/* Phase 4: Reputational Collapse */}
              <PhaseCard
                phaseNum={4}
                title="Reputational Collapse"
                icon={<Skull className="w-5 h-5" />}
                color="#dc2626"
                delay={1.8}
                metrics={[
                  { label: 'Customer Churn', value: `${result.customerChurnRate}%`, icon: <Users className="w-3.5 h-3.5" /> },
                  { label: 'Customers Lost', value: `~${result.estimatedCustomersLost.toLocaleString()}`, icon: <TrendingDown className="w-3.5 h-3.5" /> },
                  { label: 'Stock Impact', value: `${result.stockImpactPct > 0 ? `-${result.stockImpactPct}%` : 'N/A'}`, icon: <ArrowDown className="w-3.5 h-3.5" /> },
                  { label: 'Market Cap Loss', value: `$${result.estimatedMarketCapLoss.toFixed(2)}M`, icon: <DollarSign className="w-3.5 h-3.5" /> },
                ]}
              />

              {/* Phase 5: Long-term Impact */}
              <PhaseCard
                phaseNum={5}
                title="Long-term Impact"
                icon={<Siren className="w-5 h-5" />}
                color="#991b1b"
                delay={2.3}
                metrics={[
                  { label: 'Insurance Increase', value: `+${result.insurancePremiumIncrease}%`, icon: <ArrowUp className="w-3.5 h-3.5" /> },
                  { label: 'New Premium', value: `$${(result.newAnnualPremium * 1000).toFixed(0)}K/yr`, icon: <DollarSign className="w-3.5 h-3.5" /> },
                  { label: 'Recovery', value: result.recoveryTimeline, icon: <Clock className="w-3.5 h-3.5" /> },
                ]}
              />
            </div>

            {/* ── COST BREAKDOWN STACKED BAR ────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.8 }}
              className="p-5 rounded-xl bg-gray-900/40 border border-gray-800/60"
            >
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
                <BarChart3 className="w-3 h-3 inline mr-1" /> Direct Breach Cost Breakdown
              </h3>
              <StackedBar
                segments={[
                  { label: 'Detection', value: result.detectionCost, color: '#f59e0b' },
                  { label: 'Containment', value: result.containmentCost, color: '#ff8844' },
                  { label: 'Lost Business', value: result.lostBusinessCost, color: '#ff3355' },
                  { label: 'Post-Breach', value: result.postBreachCost, color: '#dc2626' },
                ]}
              />
              <div className="mt-3 flex justify-between text-xs text-gray-600 font-mono">
                <span>Total Direct: ${result.dataBreachCost.toFixed(2)}M</span>
                <span>+ Regulatory: ${result.regulatoryFines.toFixed(2)}M</span>
              </div>
            </motion.div>

            {/* ── NARRATIVE THREAT BRIEFING ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.2 }}
              className="p-5 rounded-xl bg-gray-900/40 border border-red-900/30"
            >
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-[0.2em] mb-4">
                <Siren className="w-3 h-3 inline mr-1" /> Executive Threat Briefing
              </h3>
              <div className="space-y-3">
                {result.narrative.map((bullet, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 3.4 + i * 0.4, duration: 0.5 }}
                    className="flex gap-3 items-start"
                  >
                    <div className="mt-1 w-5 h-5 rounded border border-red-900/60 bg-red-950/30 flex items-center justify-center shrink-0">
                      <ChevronRight className="w-3 h-3 text-red-500" />
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{bullet}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* ── INDUSTRY COMPARISON ────────────────────────────── */}
            {comparison && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.8 }}
                className="p-5 rounded-xl bg-gray-900/40 border border-gray-800/60"
              >
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
                  <Target className="w-3 h-3 inline mr-1" /> Your Company vs. Industry Average
                </h3>
                <ComparisonBar label="Total Cost" company={comparison.companyTotal} industry={comparison.industryAvg} />
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <PercentileCard label="Cost Percentile" value={comparison.percentiles.cost} />
                  <PercentileCard label="Downtime Percentile" value={comparison.percentiles.downtime} />
                  <PercentileCard label="Churn Percentile" value={comparison.percentiles.churn} />
                </div>
              </motion.div>
            )}

            {/* ── SCAN ADJUSTMENT NOTICE ────────────────────────── */}
            {result.scanBasedAdjustments && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-900/30"
              >
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-400">Scan-Based Vulnerability Adjustment</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {result.scanBasedAdjustments.findingsUsed} findings analyzed
                    ({result.scanBasedAdjustments.criticalCount} critical, {result.scanBasedAdjustments.highCount} high) —
                    <span className="text-amber-400 font-bold"> {result.scanBasedAdjustments.vulnerabilityMultiplier.toFixed(1)}x multiplier</span>
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: WHAT-IF
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'whatif' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 space-y-6"
          >
            {!result ? (
              <div className="text-center py-20 text-gray-600">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Run a simulation first to explore remediation scenarios.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
                  Remediation Scenario Builder
                </h3>

                {/* Toggle cards */}
                <div className="space-y-3">
                  <ToggleCard
                    label="Fix All Critical Vulnerabilities"
                    description="Remediate all critical and high-severity findings discovered in scans."
                    checked={fixCritical}
                    onChange={setFixCritical}
                    reduction={getWhatIfReductions().fixCritical}
                    icon={<CheckCircle className="w-5 h-5" />}
                  />
                  <ToggleCard
                    label="Implement Recommended Controls"
                    description="Deploy ReconPro's recommended security controls and best practices."
                    checked={implementControls}
                    onChange={setImplementControls}
                    reduction={getWhatIfReductions().implementControls}
                    icon={<Shield className="w-5 h-5" />}
                  />
                  <ToggleCard
                    label="Add Cyber Insurance Coverage"
                    description="Transfer financial risk through comprehensive cyber insurance policy."
                    checked={addInsurance}
                    onChange={setAddInsurance}
                    reduction={getWhatIfReductions().addInsurance}
                    icon={<Shield className="w-5 h-5" />}
                  />
                </div>

                {/* Side-by-side comparison */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {/* Without ReconPro */}
                  <motion.div
                    animate={{ borderColor: fixCritical || implementControls || addInsurance ? '#991b1b' : '#1f2937' }}
                    className="p-5 rounded-xl border bg-gray-900/40"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Without ReconPro</span>
                    </div>
                    <div className="text-3xl font-black font-mono text-red-500">
                      ${result.totalEstimatedImpact.toFixed(2)}M
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">Total estimated impact — no remediation</p>
                  </motion.div>

                  {/* With ReconPro */}
                  <motion.div
                    animate={{ borderColor: (fixCritical || implementControls || addInsurance) ? '#00ff88' : '#1f2937' }}
                    className="p-5 rounded-xl border bg-gray-900/40"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4" style={{ color: '#00ff88' }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00ff88' }}>With ReconPro</span>
                    </div>
                    <motion.div
                      key={`whatif-${fixCritical}-${implementControls}-${addInsurance}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl font-black font-mono"
                      style={{ color: '#00ff88' }}
                    >
                      ${getWhatIfReductions().newTotal.toFixed(2)}M
                    </motion.div>
                    <p className="text-[10px] mt-1" style={{ color: '#00ff88' }}>
                      Savings: ${getWhatIfReductions().total.toFixed(2)}M ({((getWhatIfReductions().total / result.totalEstimatedImpact) * 100).toFixed(0)}% reduction)
                    </p>
                  </motion.div>
                </div>

                {/* ROI Summary */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 rounded-xl bg-gradient-to-r from-gray-900/60 to-gray-900/40 border border-gray-800/60"
                >
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Return on Investment</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-black font-mono text-white">$120K</p>
                      <p className="text-[10px] text-gray-600 uppercase">ReconPro Annual Cost</p>
                    </div>
                    <div>
                      <p className="text-lg font-black font-mono" style={{ color: '#00ff88' }}>
                        ${getWhatIfReductions().total.toFixed(1)}M
                      </p>
                      <p className="text-[10px] text-gray-600 uppercase">Estimated Savings</p>
                    </div>
                    <div>
                      <p className="text-lg font-black font-mono" style={{ color: '#00ff88' }}>
                        {getWhatIfReductions().roi > 0 ? `${getWhatIfReductions().roi.toFixed(0)}x` : '—'}
                      </p>
                      <p className="text-[10px] text-gray-600 uppercase">ROI</p>
                    </div>
                  </div>
                  {(fixCritical || implementControls || addInsurance) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 p-3 rounded-lg text-center"
                      style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}
                    >
                      <p className="text-xs font-bold" style={{ color: '#00ff88' }}>
                        ReconPro pays for itself {getWhatIfReductions().roi > 10 ? 'thousands' : getWhatIfReductions().roi > 1 ? 'hundreds' : 'multiple'} of times over
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 4: SAVED SCENARIOS
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'saved' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
                <Save className="w-3 h-3 inline mr-1" /> Saved Scenarios
              </h3>
              <button
                onClick={fetchSaved}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Refresh
              </button>
            </div>

            {loadingSaved && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                <span className="ml-2 text-sm text-gray-600">Loading scenarios...</span>
              </div>
            )}

            {!loadingSaved && savedScenarios.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No saved scenarios yet.</p>
                <p className="text-xs text-gray-700 mt-1">Run a simulation to create your first scenario.</p>
              </div>
            )}

            {!loadingSaved && savedScenarios.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedScenarios.map((scenario, i) => {
                  const total = scenario.dataBreachCost + scenario.regulatoryFines + scenario.reputationalDamage;
                  const sevPreset = SEVERITY_PRESETS.find(s => s.key === scenario.severityPreset as SeverityKey);
                  return (
                    <motion.div
                      key={scenario.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/60 hover:border-gray-700 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {scenario.companyName || scenario.scenarioName}
                          </h4>
                          <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                            {scenario.industry.toUpperCase()} · {sevPreset?.label ?? scenario.severityPreset}
                          </p>
                        </div>
                        <div
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            color: sevPreset?.color ?? '#6b7280',
                            background: `${sevPreset?.color ?? '#6b7280'}15`,
                            border: `1px solid ${sevPreset?.color ?? '#6b7280'}30`,
                          }}
                        >
                          {sevPreset?.label ?? scenario.severityPreset}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="text-gray-500">Total Impact</div>
                        <div className="font-mono font-bold text-red-400">${total.toFixed(2)}M</div>
                        <div className="text-gray-500">Churn Rate</div>
                        <div className="font-mono text-gray-300">{scenario.customerChurnRate}%</div>
                        <div className="text-gray-500">Downtime</div>
                        <div className="font-mono text-gray-300">{scenario.operationalDowntime}h</div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-700 font-mono">
                          {new Date(scenario.createdAt).toLocaleDateString()} {new Date(scenario.createdAt).toLocaleTimeString()}
                        </p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => loadScenario(scenario)}
                            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-blue-400 transition-all"
                            title="View scenario"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteScenario(scenario.id)}
                            className="p-1.5 rounded-lg hover:bg-red-950/40 text-gray-500 hover:text-red-400 transition-all"
                            title="Delete scenario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════

interface PhaseMetric { label: string; value: string; icon: React.ReactNode }

function PhaseCard({ phaseNum, title, icon, color, delay, metrics, showFines, fineBreakdown, regulatoryFines }:
  {
    phaseNum: number; title: string; icon: React.ReactNode; color: string; delay: number;
    metrics?: PhaseMetric[];
    showFines?: boolean; fineBreakdown?: Record<string, number>; regulatoryFines?: number;
  }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.6 }}
      className="relative p-5 rounded-xl bg-gray-900/40 border border-gray-800/60"
    >
      {/* Phase indicator */}
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: color }} />

      <div className="flex items-center gap-3 mb-4 pl-2">
        <div className="p-2 rounded-lg" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>Phase {phaseNum}</span>
          <h4 className="text-sm font-bold text-white">{title}</h4>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pl-2">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.2 + i * 0.1 }}
              className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/40"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-gray-600">{m.icon}</span>
                <span className="text-[10px] text-gray-600 uppercase font-bold">{m.label}</span>
              </div>
              <p className="text-sm font-mono font-bold text-white">{m.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {showFines && fineBreakdown && (
        <div className="pl-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Total Regulatory Fines</span>
            <span className="text-sm font-mono font-bold text-red-400">${(regulatoryFines ?? 0).toFixed(2)}M</span>
          </div>
          {/* Pure CSS/Div bar chart for fine breakdown */}
          <div className="space-y-2">
            {Object.entries(fineBreakdown).filter(([, v]) => v > 0).map(([key, value], i) => {
              const maxVal = Math.max(...Object.values(fineBreakdown).filter(v => v > 0));
              const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: delay + 0.3 + i * 0.15, duration: 0.6 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-[10px] text-gray-500 font-bold w-16 text-right">{REG_LABELS[key] ?? key}</span>
                  <div className="flex-1 h-5 bg-gray-950/60 rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: delay + 0.4 + i * 0.15, duration: 0.8, ease: 'easeOut' as const }}
                      className="h-full rounded flex items-center justify-end pr-2"
                      style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
                    >
                      <span className="text-[9px] font-mono font-bold text-white/90">${value.toFixed(2)}M</span>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StackedBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;
  return (
    <div>
      <div className="flex h-10 rounded-lg overflow-hidden gap-0.5">
        {segments.map((seg, i) => (
          <motion.div
            key={seg.label}
            initial={{ width: 0 }}
            animate={{ width: `${(seg.value / total) * 100}%` }}
            transition={{ delay: 0.3 + i * 0.2, duration: 0.8, ease: 'easeOut' as const }}
            className="relative h-full flex items-center justify-center group cursor-default"
            style={{ background: seg.color }}
            title={`${seg.label}: $${seg.value.toFixed(2)}M`}
          >
            {(seg.value / total) > 0.12 && (
              <span className="text-[9px] font-bold text-white/90 drop-shadow">{seg.label}</span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex gap-3 mt-2 flex-wrap">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: seg.color }} />
            <span className="text-[10px] text-gray-500">{seg.label}</span>
            <span className="text-[10px] font-mono text-gray-400">${seg.value.toFixed(2)}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonBar({ label, company, industry }: { label: string; company: number; industry: number }) {
  const max = Math.max(company, industry) * 1.2;
  const companyPct = max > 0 ? (company / max) * 100 : 0;
  const industryPct = max > 0 ? (industry / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <div className="flex gap-4">
          <span className="font-mono text-white">${company.toFixed(2)}M</span>
          <span className="font-mono text-gray-500">${industry.toFixed(2)}M</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-red-400 font-bold w-14">YOUR CO</span>
          <div className="flex-1 h-3 bg-gray-950/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${companyPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' as const }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #ff3355, #ff8844)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-600 font-bold w-14">INDUSTRY</span>
          <div className="flex-1 h-3 bg-gray-950/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${industryPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' as const }}
              className="h-full rounded-full"
              style={{ background: '#3b82f6' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PercentileCard({ label, value }: { label: string; value: number }) {
  const isHigh = value >= 70;
  return (
    <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/40 text-center">
      <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">{label}</p>
      <p className="text-xl font-black font-mono" style={{ color: isHigh ? '#ff3355' : '#00ff88' }}>{value}th</p>
      <div className="mt-1.5 mx-auto w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' as const }}
          className="h-full rounded-full"
          style={{ background: isHigh ? '#ff3355' : '#00ff88' }}
        />
      </div>
    </div>
  );
}

function ToggleCard({ label, description, checked, onChange, reduction, icon }:
  { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; reduction: number; icon: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.995 }}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all',
        checked
          ? 'border-green-900/50 bg-green-950/10'
          : 'border-gray-800/60 bg-gray-900/30 hover:border-gray-700'
      )}
    >
      <div className={cn(
        'p-2 rounded-lg transition-colors shrink-0',
        checked ? 'bg-green-950/30' : 'bg-gray-800/50'
      )}>
        <span className={checked ? 'text-green-400' : 'text-gray-600'}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-bold', checked ? 'text-green-400' : 'text-gray-300')}>{label}</span>
          {checked && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] font-bold text-green-400 bg-green-950/40 px-2 py-0.5 rounded-full"
            >
              -${reduction.toFixed(2)}M
            </motion.span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
      <div className={cn(
        'w-10 h-6 rounded-full transition-colors shrink-0 flex items-center px-0.5',
        checked ? 'bg-green-900/50' : 'bg-gray-800'
      )}>
        <motion.div
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
          className="w-5 h-5 rounded-full"
          style={{ background: checked ? '#00ff88' : '#4b5563' }}
        />
      </div>
    </motion.button>
  );
}
