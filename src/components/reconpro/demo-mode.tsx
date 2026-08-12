'use client';

import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronLeft, ChevronRight, SkipForward, Check } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DemoModeState {
  isDemo: boolean;
  isWalkthroughActive: boolean;
  currentStep: number;
  companyName: string;
  presetData: {
    targetDomains: string[];
    scanCount: number;
    findingCount: number;
    criticalCount: number;
    riskScore: number;
    teamSize: number;
    complianceScore: number;
    uptime: string;
    revenueProtected: string;
    threatsBlocked: number;
  };
}

interface DemoModeContextType extends DemoModeState {
  enableDemo: (companyName?: string) => void;
  disableDemo: () => void;
  toggleDemo: () => void;
  startWalkthrough: () => void;
  nextWalkthroughStep: () => void;
  prevWalkthroughStep: () => void;
  endWalkthrough: () => void;
}

// ─── Default Preset Data ─────────────────────────────────────────────────────

const DEFAULT_COMPANY = 'Acme Corp';

const DEFAULT_PRESET_DATA: DemoModeState['presetData'] = {
  targetDomains: [
    'acme-corp.com',
    'api.acme-corp.com',
    'portal.acme-corp.com',
    'admin.acme-corp.com',
  ],
  scanCount: 2847,
  findingCount: 1234,
  criticalCount: 23,
  riskScore: 34,
  teamSize: 48,
  complianceScore: 97,
  uptime: '99.99%',
  revenueProtected: '$2.4B',
  threatsBlocked: 18492,
};

// ─── Walkthrough Steps ───────────────────────────────────────────────────────

const WALKTHROUGH_STEPS = [
  {
    title: 'Welcome to ReconPro',
    tagline: 'Protecting $2.4B in digital assets across 48 team members',
    description:
      'ReconPro is the industry-leading attack surface management platform, providing continuous visibility into your external attack surface, automated threat detection, and compliance orchestration — all from a single pane of glass.',
    icon: '🛡️',
    highlight: 'center',
    stat: null,
  },
  {
    title: 'Real-Time Threat Detection',
    tagline: '18492 threats blocked in the last 30 days',
    description:
      'Our AI-powered threat intelligence engine continuously monitors the dark web, code repositories, and misconfigured infrastructure. Every potential breach vector is identified, triaged, and escalated in real time — before adversaries can exploit it.',
    icon: '⚡',
    highlight: 'threat-feed',
    stat: { value: '18,492', label: 'Threats Blocked', sublabel: 'Last 30 Days' },
  },
  {
    title: 'Compliance at a Glance',
    tagline: '97% compliance across SOC2, HIPAA, PCI-DSS',
    description:
      'Stay audit-ready with automated evidence collection, continuous control monitoring, and one-click compliance reporting. ReconPro maps every finding to specific framework controls, so your team can close gaps fast.',
    icon: '✅',
    highlight: 'compliance',
    stat: { value: '97%', label: 'Compliance Score', sublabel: 'SOC2 · HIPAA · PCI-DSS' },
  },
  {
    title: 'Attack Surface Intelligence',
    tagline: '4 critical assets continuously monitored',
    description:
      'Visualize your entire external attack surface in a unified radar view. From cloud instances to forgotten subdomains, ReconPro discovers and classifies every internet-facing asset your organization owns — including shadow IT.',
    icon: '🎯',
    highlight: 'radar',
    stat: { value: '2,847', label: 'Scans Performed', sublabel: 'Across All Domains' },
  },
  {
    title: 'Team Collaboration',
    tagline: '48 security professionals, 4 specialized teams',
    description:
      'Assign findings, track remediation SLAs, and coordinate across red team, blue team, compliance, and engineering. Role-based access and intelligent routing ensure the right person sees the right alert at the right time.',
    icon: '👥',
    highlight: 'team',
    stat: { value: '48', label: 'Team Members', sublabel: '4 Specialized Units' },
  },
  {
    title: 'Ready to Deploy',
    tagline: 'ReconPro is ready to protect your organization',
    description:
      'From onboarding to full deployment in under 24 hours. Zero-agent architecture means no endpoints to install. Simply point us at your domains, and ReconPro begins discovering and protecting your attack surface immediately.',
    icon: '🚀',
    highlight: 'center',
    stat: { value: '< 24h', label: 'Time to Value', sublabel: 'Zero-Agent Deployment' },
  },
] as const;

const AUTO_ADVANCE_MS = 15_000;

// ─── Context ─────────────────────────────────────────────────────────────────

const DemoModeContext = createContext<DemoModeContextType | null>(null);

export function useDemoMode(): DemoModeContextType {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    throw new Error('useDemoMode must be used within a <DemoModeProvider>');
  }
  return ctx;
}

export { DemoModeContext };

// ─── Provider ────────────────────────────────────────────────────────────────

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoModeState>({
    isDemo: false,
    isWalkthroughActive: false,
    currentStep: 0,
    companyName: DEFAULT_COMPANY,
    presetData: DEFAULT_PRESET_DATA,
  });

  const enableDemo = useCallback((companyName?: string) => {
    setState((prev) => ({
      ...prev,
      isDemo: true,
      companyName: companyName || DEFAULT_COMPANY,
      presetData: DEFAULT_PRESET_DATA,
    }));
  }, []);

  const disableDemo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDemo: false,
      isWalkthroughActive: false,
      currentStep: 0,
    }));
  }, []);

  const toggleDemo = useCallback(() => {
    setState((prev) => {
      if (prev.isDemo) {
        return { ...prev, isDemo: false, isWalkthroughActive: false, currentStep: 0 };
      }
      return {
        ...prev,
        isDemo: true,
        companyName: DEFAULT_COMPANY,
        presetData: DEFAULT_PRESET_DATA,
      };
    });
  }, []);

  const startWalkthrough = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isWalkthroughActive: true,
      currentStep: 0,
      isDemo: true,
      companyName: DEFAULT_COMPANY,
      presetData: DEFAULT_PRESET_DATA,
    }));
  }, []);

  const nextWalkthroughStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= WALKTHROUGH_STEPS.length - 1) {
        return { ...prev, isWalkthroughActive: false, currentStep: 0 };
      }
      return { ...prev, currentStep: prev.currentStep + 1 };
    });
  }, []);

  const prevWalkthroughStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const endWalkthrough = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isWalkthroughActive: false,
      currentStep: 0,
    }));
  }, []);

  const value: DemoModeContextType = {
    ...state,
    enableDemo,
    disableDemo,
    toggleDemo,
    startWalkthrough,
    nextWalkthroughStep,
    prevWalkthroughStep,
    endWalkthrough,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
      {state.isWalkthroughActive && <InvestorWalkthrough />}
    </DemoModeContext.Provider>
  );
}

// ─── Toggle Button ───────────────────────────────────────────────────────────

interface DemoModeToggleProps {
  position?: 'header' | 'floating';
}

export function DemoModeToggle({ position = 'floating' }: DemoModeToggleProps) {
  const { isDemo, companyName, toggleDemo, startWalkthrough } = useDemoMode();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDemo) {
      toggleDemo();
    }
  };

  const handleStartWalkthrough = (e: React.MouseEvent) => {
    e.stopPropagation();
    startWalkthrough();
  };

  // ── Floating variant ──────────────────────────────────────────────────
  if (position === 'floating') {
    return (
      <motion.div
        className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 20 }}
      >
        {/* Walkthrough CTA — only when demo is active */}
        <AnimatePresence>
          {isDemo && (
            <motion.button
              key="walkthrough-cta"
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={handleStartWalkthrough}
              className="mb-2 flex items-center gap-2 rounded-lg border border-[#00ff88]/30 bg-[#080b14] px-4 py-2.5 text-sm font-medium text-[#00ff88] shadow-lg shadow-[#00ff88]/5 transition-colors hover:bg-[#00ff88]/10"
            >
              <PlayIcon className="h-3.5 w-3.5" />
              Start Investor Walkthrough
            </motion.button>
          )}
        </AnimatePresence>

        {/* Main toggle */}
        <motion.button
          onClick={handleClick}
          className={
            'relative flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 ' +
            (isDemo
              ? 'border border-[#00ff88]/50 bg-[#00ff88]/10 text-[#00ff88] shadow-[0_0_20px_rgba(52,211,153,0.25),0_0_60px_rgba(52,211,153,0.08)]'
              : 'border border-white/15 bg-[#080b14]/90 text-[#444444] backdrop-blur-md hover:border-[#00ff88]/30 hover:text-[#f0f0f0]')
          }
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Pulsing ring when active */}
          {isDemo && (
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full border border-[#00ff88]/40"
              animate={{ scale: [1, 1.15], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' as const }}
            />
          )}
          <Sparkles className={isDemo ? 'h-4 w-4 text-[#00ff88]' : 'h-4 w-4'} />
          <span className="relative">
            {isDemo ? `DEMO MODE — ${companyName}` : 'Investor Demo'}
          </span>
        </motion.button>
      </motion.div>
    );
  }

  // ── Header variant ────────────────────────────────────────────────────
  return (
    <motion.button
      onClick={handleClick}
      className={
        'relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-300 ' +
        (isDemo
          ? 'border border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88] shadow-[0_0_12px_rgba(52,211,153,0.15)]'
          : 'border border-white/10 bg-white/5 text-[#444444] hover:border-[#00ff88]/20 hover:text-[#f0f0f0]')
      }
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {isDemo && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-lg border border-[#00ff88]/30"
          animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' as const }}
        />
      )}
      <Sparkles className={isDemo ? 'h-3.5 w-3.5 text-[#00ff88]' : 'h-3.5 w-3.5'} />
      <span className="relative">
        {isDemo ? `DEMO — ${companyName}` : 'Investor Demo'}
      </span>
    </motion.button>
  );
}

// ─── Tiny play icon (inline SVG) ─────────────────────────────────────────────

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

// ─── Walkthrough Overlay ─────────────────────────────────────────────────────

export function InvestorWalkthrough() {
  const { currentStep, nextWalkthroughStep, prevWalkthroughStep, endWalkthrough, presetData } =
    useDemoMode();

  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [autoProgress, setAutoProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLast = currentStep === WALKTHROUGH_STEPS.length - 1;
  const isFirst = currentStep === 0;
  const step = WALKTHROUGH_STEPS[currentStep];

  // Auto-advance timer
  useEffect(() => {
    setAutoProgress(0);
    timerRef.current = setInterval(() => {
      setAutoProgress((p) => {
        const next = p + 100;
        if (next >= AUTO_ADVANCE_MS) {
          nextWalkthroughStep();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep]);

  const handleNext = () => {
    setDirection('forward');
    nextWalkthroughStep();
  };

  const handlePrev = () => {
    setDirection('back');
    prevWalkthroughStep();
  };

  const handleSkip = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    endWalkthrough();
  };

  const handleEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    endWalkthrough();
  };

  const progressPercent = (autoProgress / AUTO_ADVANCE_MS) * 100;

  // Animation variants for slide transitions
  const slideVariants = {
    enter: (dir: 'forward' | 'back') => ({
      x: dir === 'forward' ? 120 : -120,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: 'forward' | 'back') => ({
      x: dir === 'forward' ? -120 : 120,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Dark backdrop with spotlight ──────────────────────────────── */}
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleSkip}
      />

      {/* Spotlight glow behind card */}
      <motion.div
        className="pointer-events-none absolute h-[600px] w-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(52,211,153,0.08) 0%, rgba(52,211,153,0.02) 40%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const }}
      />

      {/* ── Close button ──────────────────────────────────────────────── */}
      <motion.button
        onClick={handleSkip}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#444444] transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Close walkthrough"
      >
        <X className="h-5 w-5" />
      </motion.button>

      {/* ── Main card ─────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-2xl px-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            className={
              'rounded-2xl border p-8 md:p-10 ' +
              'bg-gradient-to-br from-[#0d1117] via-[#0f1419] to-[#0d1117] ' +
              'border-white/[0.08] shadow-2xl shadow-black/50'
            }
          >
            {/* Step indicator */}
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ff88]/10 text-sm font-bold text-[#00ff88]">
                {currentStep + 1}
              </span>
              <span className="text-sm font-medium text-[#333333]">
                Step {currentStep + 1} of {WALKTHROUGH_STEPS.length}
              </span>

              {/* Auto-advance progress bar */}
              <div className="ml-auto h-1 w-24 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-[#00ff88]/40"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.1, ease: 'linear' as const }}
                />
              </div>
            </div>

            {/* Icon */}
            <motion.div
              className="mb-5 text-4xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring' as const, stiffness: 200 }}
            >
              {step.icon}
            </motion.div>

            {/* Title */}
            <motion.h2
              className="mb-2 text-2xl font-bold tracking-tight text-[#f0f0f0] md:text-3xl"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {step.title}
            </motion.h2>

            {/* Tagline */}
            <motion.p
              className="mb-4 text-base font-medium text-[#00ff88]"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {step.tagline}
            </motion.p>

            {/* Description */}
            <motion.p
              className="mb-8 leading-relaxed text-[#444444]"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {step.description}
            </motion.p>

            {/* Stat card */}
            {step.stat && (
              <motion.div
                className="mb-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, type: 'spring' as const, stiffness: 200 }}
              >
                <div className="text-3xl font-extrabold tracking-tight text-[#f0f0f0] md:text-4xl">
                  {step.stat.value}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#00ff88]">
                  {step.stat.label}
                </div>
                <div className="mt-0.5 text-xs text-[#333333]">
                  {step.stat.sublabel}
                </div>

                {/* Mini metrics row for visual richness */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MiniMetric
                    label="Risk Score"
                    value={String(presetData.riskScore)}
                    color="#00ff88"
                  />
                  <MiniMetric
                    label="Uptime"
                    value={presetData.uptime}
                    color="#00ff88"
                  />
                  <MiniMetric
                    label="Compliance"
                    value={`${presetData.complianceScore}%`}
                    color="#00ff88"
                  />
                </div>
              </motion.div>
            )}

            {/* CTA for last step */}
            {isLast && (
              <motion.div
                className="mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-6 text-center">
                  <p className="mb-1 text-lg font-bold text-[#f0f0f0]">
                    Trusted by security teams worldwide
                  </p>
                  <p className="text-sm text-[#444444]">
                    Join hundreds of enterprises that trust ReconPro to protect their attack surface.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Progress dots ──────────────────────────────────────────── */}
            <div className="mb-6 flex justify-center gap-2">
              {WALKTHROUGH_STEPS.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => {
                    if (i > currentStep) {
                      setDirection('forward');
                    } else if (i < currentStep) {
                      setDirection('back');
                    }
                    if (i > currentStep) {
                      for (let s = 0; s < i - currentStep; s++) nextWalkthroughStep();
                    } else if (i < currentStep) {
                      for (let s = 0; s < currentStep - i; s++) prevWalkthroughStep();
                    }
                  }}
                  className={
                    'h-2 rounded-full transition-all duration-300 ' +
                    (i === currentStep
                      ? 'w-8 bg-[#00ff88]'
                      : i < currentStep
                        ? 'w-2 bg-[#00ff88]/40'
                        : 'w-2 bg-white/10 hover:bg-white/20')
                  }
                  whileHover={{ scale: 1.2 }}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* ── Action buttons ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              {/* Left: Previous or empty */}
              <div>
                {!isFirst && (
                  <motion.button
                    onClick={handlePrev}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[#444444] transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </motion.button>
                )}
              </div>

              {/* Right: Skip / Next / End */}
              <div className="flex items-center gap-3">
                {!isLast && (
                  <motion.button
                    onClick={handleSkip}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-[#333333] transition-colors hover:text-[#444444]"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </motion.button>
                )}

                {isLast ? (
                  <motion.button
                    onClick={handleEnd}
                    className="flex items-center gap-2 rounded-lg bg-[#00ff88] px-6 py-2.5 text-sm font-bold text-[#080a10] shadow-lg shadow-[#00ff88]/20 transition-all hover:bg-[#00e67a] hover:shadow-[#00ff88]/30"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Check className="h-4 w-4" />
                    End Walkthrough
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-lg bg-[#00ff88] px-5 py-2.5 text-sm font-bold text-[#080a10] shadow-lg shadow-[#00ff88]/20 transition-all hover:bg-[#00e67a] hover:shadow-[#00ff88]/30"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Mini Metric helper ──────────────────────────────────────────────────────

function MiniMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-center">
      <div className="text-lg font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-[#333333]">
        {label}
      </div>
    </div>
  );
}
