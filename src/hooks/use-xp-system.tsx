'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Zap, Shield, Target, Star, Crown, Bug, Skull, Crosshair } from 'lucide-react';

interface XPState {
  xp: number;
  level: number;
  totalScans: number;
  totalFindings: number;
  criticalKills: number;
  streak: number;
  badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: string | null;
}

const BADGES: Badge[] = [
  { id: 'first_scan', name: 'First Recon', icon: 'Crosshair', description: 'Complete your first scan', unlockedAt: null },
  { id: 'ten_scans', name: 'Persistent Hunter', icon: 'Flame', description: 'Complete 10 scans', unlockedAt: null },
  { id: 'big_game', name: 'Big Game Hunter', icon: 'Skull', description: 'Scan a Fortune 500 company', unlockedAt: null },
  { id: 'critical_finder', name: 'Critical Hit', icon: 'Zap', description: 'Find a critical vulnerability', unlockedAt: null },
  { id: 'hundred_findings', name: 'Data Miner', icon: 'Star', description: 'Amass 100 total findings', unlockedAt: null },
  { id: 'streak_5', name: 'On Fire', icon: 'Flame', description: 'Complete 5 scans in a row', unlockedAt: null },
  { id: 'all_categories', name: 'Full Spectrum', icon: 'Target', description: 'Findings across all 8 categories', unlockedAt: null },
  { id: 'level_5', name: 'Veteran', icon: 'Shield', description: 'Reach level 5', unlockedAt: null },
  { id: 'bug_hunter', name: 'Bug Hunter', icon: 'Bug', description: 'Find 10+ high severity issues', unlockedAt: null },
  { id: 'apex', name: 'Apex Predator', icon: 'Crown', description: 'Reach level 10', unlockedAt: null },
];

const XP_PER_ACTION = {
  scan_complete: 50,
  finding_info: 2,
  finding_low: 5,
  finding_medium: 10,
  finding_high: 20,
  finding_critical: 50,
  streak_bonus: 25,
  badge_unlock: 100,
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];

const FORTUNE_500_DOMAINS = ['google.com', 'apple.com', 'amazon.com', 'microsoft.com', 'meta.com', 'netflix.com', 'stripe.com', 'vercel.com', 'github.com', 'shopify.com', 'cloudflare.com', 'twitter.com'];

const ICON_MAP: Record<string, React.ReactNode> = {
  Crosshair: <Crosshair className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  Skull: <Skull className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  Target: <Target className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Bug: <Bug className="w-5 h-5" />,
  Crown: <Crown className="w-5 h-5" />,
};

function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getXPProgress(xp: number): { current: number; needed: number; pct: number } {
  const level = getLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 5000;
  const current = xp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  return { current, needed, pct: Math.min(100, (current / needed) * 100) };
}

function getRank(level: number): { name: string; color: string } {
  if (level >= 10) return { name: 'Apex Predator', color: '#ff6b6b' };
  if (level >= 8) return { name: 'Elite Hunter', color: '#ffd93d' };
  if (level >= 6) return { name: 'Veteran Operative', color: '#ff9f43' };
  if (level >= 4) return { name: 'Field Agent', color: '#00ff88' };
  if (level >= 2) return { name: 'Scout', color: '#79c0ff' };
  return { name: 'Recruit', color: '#8b949e' };
}

export function useXPSystem() {
  const [state, setState] = useState<XPState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('reconpro_xp');
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return {
      xp: 0, level: 1, totalScans: 0, totalFindings: 0,
      criticalKills: 0, streak: 0, badges: JSON.parse(JSON.stringify(BADGES)),
    };
  });

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('reconpro_xp', JSON.stringify(state));
      } catch { /* ignore */ }
    }
  }, [state]);

  const checkBadges = useCallback((newState: XPState, domain?: string): XPState => {
    const updated = { ...newState, badges: newState.badges.map(b => ({ ...b })) };
    const now = new Date().toISOString();

    // First scan
    if (updated.totalScans >= 1) {
      const b = updated.badges.find(x => x.id === 'first_scan');
      if (b && !b.unlockedAt) b.unlockedAt = now;
    }
    // 10 scans
    if (updated.totalScans >= 10) {
      const b = updated.badges.find(x => x.id === 'ten_scans');
      if (b && !b.unlockedAt) b.unlockedAt = now;
    }
    // Fortune 500
    if (domain && FORTUNE_500_DOMAINS.some(d => domain.toLowerCase().includes(d.split('.')[0]))) {
      const b = updated.badges.find(x => x.id === 'big_game');
      if (b && !b.unlockedAt) b.unlockedAt = now;
    }
    // Critical finding
    if (updated.criticalKills >= 1) {
      const b = updated.badges.find(x => x.id === 'critical_finder');
      if (b && !b.unlockedAt) b.unlockedAt = now;
    }
    // 100 findings
    if (updated.totalFindings >= 100) {
      const b = updated.badges.find(x => x.id === 'hundred_findings');
      if (b && !b.unlockedAt) b.unlockedAt = now;
    }
    // Streak 5
    if (updated.streak >= 5) {
      const b = updated.badges.find(x => x.id === 'streak_5');
      if (b && !b.unlockedAt) b.unlockedAt = now;
    }
    // Level 5
    if (updated.level >= 5) {
      const b = updated.badges.find(x => x.id === 'level_5');
      if (b && !b.unlockedAt) b.unlockedAt = now;
    }
    // Bug hunter (10+ high)
    // We don't track this precisely yet — skip for now
    // Level 10
    if (updated.level >= 10) {
      const b = updated.badges.find(x => x.id === 'apex');
      if (b && !b.unlockedAt) b.unlockedAt = now;
    }

    return updated;
  }, []);

  const addXP = useCallback((amount: number, reason?: string) => {
    setState(prev => {
      const newXp = prev.xp + amount;
      const newLevel = getLevel(newXp);
      const leveled = newLevel > prev.level;
      const updated = { ...prev, xp: newXp, level: newLevel };
      return updated;
    });
  }, []);

  // Ref to expose level change detection
  const prevLevelRef = useRef(1);
  const [justLeveledUp, setJustLeveledUp] = useState(false);

  const onScanComplete = useCallback((findings: { severity: string; category: string }[], domain: string) => {
    setState(prev => {
      let xpGain = XP_PER_ACTION.scan_complete + XP_PER_ACTION.streak_bonus;
      const critCount = findings.filter(f => f.severity === 'critical').length;
      const highCount = findings.filter(f => f.severity === 'high').length;
      const medCount = findings.filter(f => f.severity === 'medium').length;
      const lowCount = findings.filter(f => f.severity === 'low').length;
      const infoCount = findings.filter(f => f.severity === 'info').length;

      xpGain += infoCount * XP_PER_ACTION.finding_info;
      xpGain += lowCount * XP_PER_ACTION.finding_low;
      xpGain += medCount * XP_PER_ACTION.finding_medium;
      xpGain += highCount * XP_PER_ACTION.finding_high;
      xpGain += critCount * XP_PER_ACTION.finding_critical;

      const newXp = prev.xp + xpGain;
      const newLevel = getLevel(newXp);

      const newState = {
        ...prev,
        xp: newXp,
        level: newLevel,
        totalScans: prev.totalScans + 1,
        totalFindings: prev.totalFindings + findings.length,
        criticalKills: prev.criticalKills + critCount,
        streak: prev.streak + 1,
      };

      return checkBadges(newState, domain);
    });
  }, [checkBadges]);

  return { state, addXP, onScanComplete, getLevel, getXPProgress, getRank, BADGES, ICON_MAP, justLeveledUp };
}

// ── XP Bar Component ──

export function XPBar({ state }: { state: XPState }) {
  const progress = getXPProgress(state.xp);
  const rank = getRank(state.level);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#161b22] border border-[rgba(255,255,255,0.06)]">
      {/* Level badge with glow */}
      <motion.div
        className="flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm shrink-0"
        style={{ backgroundColor: `${rank.color}20`, color: rank.color, border: `1px solid ${rank.color}40` }}
        animate={{ boxShadow: [`0 0 8px ${rank.color}30`, `0 0 16px ${rank.color}50`, `0 0 8px ${rank.color}30`] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {state.level}
      </motion.div>

      {/* XP bar with glow edge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <motion.span
            style={{ color: rank.color }}
            className="font-semibold"
            animate={{ textShadow: [`0 0 8px ${rank.color}40`, `0 0 16px ${rank.color}60`, `0 0 8px ${rank.color}40`] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {rank.name}
          </motion.span>
          <span className="text-muted-foreground font-mono">{state.xp} XP</span>
        </div>
        <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: rank.color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          {/* Glow at leading edge */}
          {progress.pct > 0 && (
            <motion.div
              className="absolute top-0 w-3 h-full rounded-full"
              style={{ backgroundColor: 'white', opacity: 0.3, filter: 'blur(2px)' }}
              animate={{ left: [`${Math.max(0, progress.pct - 3)}%`, `${progress.pct}%`] }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </div>
      </div>

      {/* Streak with fire animation */}
      {state.streak > 0 && (
        <motion.div
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(255,155,0,0.1)] border border-[rgba(255,155,0,0.2)] shrink-0"
          animate={{ scale: state.streak >= 5 ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 0.5, repeat: state.streak >= 5 ? Infinity : 0 }}
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <Flame className="w-3.5 h-3.5 text-[#ff9f43]" />
          </motion.div>
          <span className="text-xs font-mono text-[#ff9f43] font-bold">{state.streak}x</span>
        </motion.div>
      )}
    </div>
  );
}

// ── Badge Popup ──

export function BadgePopup({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-[#161b22] border border-[#ffd93d]/30 shadow-2xl"
        >
          <div className="p-2 rounded-lg bg-[#ffd93d]/10 text-[#ffd93d]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#ffd93d] font-bold uppercase tracking-wider">Badge Unlocked!</div>
            <div className="text-sm font-semibold text-[#e6edf3]">{badge.name}</div>
            <div className="text-xs text-muted-foreground">{badge.description}</div>
          </div>
          <button onClick={onClose} className="ml-2 text-muted-foreground hover:text-white text-lg leading-none">&times;</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
