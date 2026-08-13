'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Trophy, Flame, Zap, Crown, Star, Sparkles, Rocket,
  Shield, Target, Crosshair, Skull, Bug, ChevronUp,
  Volume2, VolumeX, Gift, Lock, TrendingUp, Award, AlertTriangle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// CONFETTI PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════════

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: 'rect' | 'circle' | 'star';
  opacity: number;
  gravity: number;
  life: number;
  maxLife: number;
}

const CONFETTI_COLORS = ['#00ff88', '#06b6d4', '#ffd93d', '#ff6b6b', '#a78bfa', '#ff8844', '#3fb950', '#79c0ff'];

function useConfetti() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animRef = useRef<number>(0);
  const idRef = useRef(0);

  const spawnBurst = useCallback((count = 80, intensity = 1) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      idRef.current++;
      const angle = (Math.random() * Math.PI * 2);
      const speed = (3 + Math.random() * 8) * intensity;
      newParticles.push({
        id: idRef.current,
        x: 50, // center viewport %
        y: 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5 * intensity,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 4 + Math.random() * 8,
        shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
        opacity: 1,
        gravity: 0.15 + Math.random() * 0.1,
        life: 0,
        maxLife: 120 + Math.random() * 60,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const spawnDirected = useCallback((fromX: number, fromY: number, count = 30) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      idRef.current++;
      const angle = (Math.random() * Math.PI * 2);
      const speed = 2 + Math.random() * 5;
      newParticles.push({
        id: idRef.current,
        x: fromX,
        y: fromY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 3 + Math.random() * 6,
        shape: (['rect', 'circle'] as const)[Math.floor(Math.random() * 2)],
        opacity: 1,
        gravity: 0.12,
        life: 0,
        maxLife: 80 + Math.random() * 40,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles(prev => {
        const alive = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + p.gravity,
            vx: p.vx * 0.99,
            rotation: p.rotation + p.rotationSpeed,
            life: p.life + 1,
            opacity: Math.max(0, 1 - (p.life / p.maxLife)),
          }))
          .filter(p => p.life < p.maxLife && p.opacity > 0.01);

        return alive;
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animRef.current);
  }, [particles.length > 0]);

  return { particles, spawnBurst, spawnDirected };
}

function ConfettiCanvas({ particles }: { particles: Particle[] }) {
  if (particles.length === 0) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute"
          initial={false}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            rotate: p.rotation,
          }}
        >
          {p.shape === 'star' ? (
            <Star
              className="text-current"
              style={{ color: p.color, width: p.size, height: p.size, fill: p.color }}
            />
          ) : p.shape === 'circle' ? (
            <div
              style={{
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                backgroundColor: p.color,
              }}
            />
          ) : (
            <div
              style={{
                width: p.size * 1.5,
                height: p.size * 0.8,
                borderRadius: 2,
                backgroundColor: p.color,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLOATING XP POPUPS
// ═══════════════════════════════════════════════════════════════

interface FloatingXP {
  id: number;
  amount: number;
  reason: string;
  severity: string;
  x: number;
  y: number;
}

function useFloatingXP() {
  const [popups, setPopups] = useState<FloatingXP[]>([]);
  const idRef = useRef(0);

  const addXP = useCallback((amount: number, reason: string, severity: string, x = 50, y = 50) => {
    idRef.current++;
    setPopups(prev => [...prev.slice(-15), {
      id: idRef.current,
      amount,
      reason,
      severity,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 10,
    }]);
  }, []);

  // Auto-remove after animation
  useEffect(() => {
    if (popups.length === 0) return;
    const timer = setTimeout(() => {
      setPopups(prev => prev.slice(1));
    }, 2000);
    return () => clearTimeout(timer);
  }, [popups]);

  return { popups, addXP };
}

function FloatingXPCanvas({ popups }: { popups: FloatingXP[] }) {
  const sevColor = (sev: string) => {
    switch (sev) {
      case 'critical': return '#ff3355';
      case 'high': return '#ff8844';
      case 'medium': return '#ffaa00';
      case 'low': return '#22c55e';
      default: return '#00ff88';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[90]">
      <AnimatePresence>
        {popups.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -80, scale: [0.5, 1.3, 1] }}
            exit={{ opacity: 0, y: -120 }}
            transition={{ duration: 1.8, ease: 'easeOut' as const }}
            className="absolute font-bold font-mono"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div
              className="text-xl sm:text-2xl"
              style={{
                color: sevColor(p.severity),
                textShadow: `0 0 20px ${sevColor(p.severity)}60, 0 0 40px ${sevColor(p.severity)}30`,
              }}
            >
              +{p.amount}
            </div>
            <div className="text-[10px] text-center text-muted-foreground">{p.reason}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN SHAKE + RED FLASH
// ═══════════════════════════════════════════════════════════════

function useScreenShake() {
  const [shaking, setShaking] = useState(false);
  const [flash, setFlash] = useState<'none' | 'red' | 'white'>('none');

  const triggerShake = useCallback((flashColor: 'red' | 'white' = 'red') => {
    setShaking(true);
    setFlash(flashColor);
    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setFlash('none'), 300);
  }, []);

  return { shaking, flash, triggerShake };
}

function ScreenEffects({ shaking, flash }: { shaking: boolean; flash: 'none' | 'red' | 'white' }) {
  return (
    <>
      {/* Flash overlay */}
      <AnimatePresence>
        {flash !== 'none' && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-[80]"
            style={{
              backgroundColor: flash === 'red' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.15)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Shake wrapper */}
      <AnimatePresence>
        {shaking && (
          <motion.div
            initial={{ x: 0 }}
            animate={{
              x: [0, -4, 4, -3, 3, -2, 2, -1, 1, 0],
              y: [0, 2, -2, 3, -3, 1, -1, 2, 0, 0],
            }}
            transition={{ duration: 0.4, ease: 'easeOut' as const }}
            className="fixed inset-0 pointer-events-none z-[79]"
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCAN COMPLETION CELEBRATION
// ═══════════════════════════════════════════════════════════════

interface CelebrationData {
  show: boolean;
  domain: string;
  findings: number;
  critical: number;
  high: number;
  riskScore: number;
  xpGained: number;
  newLevel: boolean;
  levelUp: boolean;
  streak: number;
  personalBestFindings: boolean;
  personalBestRisk: boolean;
}

function CelebrationScreen({ data, onClose }: { data: CelebrationData; onClose: () => void }) {
  const [phase, setPhase] = useState<'impact' | 'stats' | 'rewards'>('impact');

  useEffect(() => {
    if (!data.show) return;
     
    setPhase('impact');
    const t1 = setTimeout(() => setPhase('stats'), 800);
    const t2 = setTimeout(() => setPhase('rewards'), 2200);
    const t3 = setTimeout(() => onClose(), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [data.show, onClose]);

  if (!data.show) return null;

  const stats = [
    { label: 'Findings', value: data.findings, color: '#06b6d4', icon: <Target className="w-5 h-5" /> },
    { label: 'Critical', value: data.critical, color: '#ff3355', icon: <Skull className="w-5 h-5" /> },
    { label: 'High Risk', value: data.high, color: '#ff8844', icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Risk Score', value: data.riskScore, color: '#ffd93d', icon: <Shield className="w-5 h-5" /> },
  ];

  const riskLabel = data.riskScore > 70 ? 'CRITICAL' : data.riskScore > 40 ? 'ELEVATED' : 'LOW';
  const riskColor = data.riskScore > 70 ? '#ff3355' : data.riskScore > 40 ? '#ff8844' : '#00ff88';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(8,10,16,0.92)] backdrop-blur-xl"
      onClick={onClose}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 cyber-grid opacity-50" />
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.08) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="relative z-10 text-center max-w-lg mx-auto px-6">
        {/* Phase 1: Impact */}
        <AnimatePresence>
          {phase === 'impact' && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 1.2, opacity: 0, y: -40 }}
              transition={{ type: 'spring' as const, damping: 12, stiffness: 200 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
                style={{
                  background: `linear-gradient(135deg, ${riskColor}20, ${riskColor}05)`,
                  border: `2px solid ${riskColor}40`,
                  boxShadow: `0 0 40px ${riskColor}30, 0 0 80px ${riskColor}15`,
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Shield className="w-12 h-12" style={{ color: riskColor }} />
              </motion.div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#f0f0f0] mb-2">
                SCAN{' '}
                <span style={{ color: riskColor, textShadow: `0 0 30px ${riskColor}40` }}>
                  COMPLETE
                </span>
              </h2>
              <p className="text-muted-foreground font-mono text-sm">{data.domain}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{
                backgroundColor: `${riskColor}15`,
                border: `1px solid ${riskColor}30`,
              }}>
                <span className="text-lg font-black font-mono" style={{ color: riskColor }}>{data.riskScore}</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: riskColor }}>{riskLabel} RISK</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2: Stats cascade */}
        <AnimatePresence>
          {phase === 'stats' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center mb-6"
              >
                <h3 className="text-2xl font-bold text-[#f0f0f0]">Mission Report</h3>
                <p className="text-sm text-muted-foreground font-mono">{data.domain}</p>
              </motion.div>

              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 30, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.15, type: 'spring' as const, damping: 15 }}
                    className="p-4 rounded-xl border"
                    style={{
                      backgroundColor: `${stat.color}08`,
                      borderColor: `${stat.color}25`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: stat.color }}>{stat.icon}</span>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <motion.span
                      className="text-3xl font-black font-mono"
                      style={{ color: stat.color }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.15 + 0.3, type: 'spring' as const, damping: 10 }}
                    >
                      {stat.value}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3: Rewards */}
        <AnimatePresence>
          {phase === 'rewards' && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* XP Gained */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' as const, damping: 12 }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.2)]"
              >
                <Zap className="w-6 h-6 text-[#00ff88]" />
                <div className="text-left">
                  <div className="text-2xl font-black font-mono text-[#00ff88]">+{data.xpGained} XP</div>
                  <div className="text-xs text-muted-foreground">Mission Reward</div>
                </div>
              </motion.div>

              {/* Personal bests */}
              {(data.personalBestFindings || data.personalBestRisk) && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,217,61,0.1)] border border-[rgba(255,217,61,0.2)]"
                >
                  <Trophy className="w-4 h-4 text-[#ffd93d]" />
                  <span className="text-sm font-bold text-[#ffd93d]">PERSONAL BEST!</span>
                </motion.div>
              )}

              {/* Level Up */}
              {data.levelUp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' as const, damping: 10 }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[rgba(255,107,107,0.1)] border border-[rgba(255,107,107,0.2)]"
                >
                  <Crown className="w-4 h-4 text-[#ff6b6b]" />
                  <span className="text-sm font-bold text-[#ff6b6b]">LEVEL UP!</span>
                </motion.div>
              )}

              {/* Streak */}
              {data.streak > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Flame className="w-5 h-5 text-[#ff9f43]" />
                  <span className="text-lg font-black font-mono text-[#ff9f43]">{data.streak}x STREAK</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACHIEVEMENT TOAST STACK (with rarity tiers)
// ═══════════════════════════════════════════════════════════════

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  timestamp: number;
}

const RARITY_CONFIG = {
  common: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', label: 'COMMON', glow: '' },
  rare: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', label: 'RARE', glow: '0 0 20px rgba(6,182,212,0.2)' },
  epic: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', label: 'EPIC', glow: '0 0 30px rgba(167,139,250,0.3)' },
  legendary: { color: '#ffd93d', bg: 'rgba(255,217,61,0.1)', border: 'rgba(255,217,61,0.4)', label: 'LEGENDARY', glow: '0 0 40px rgba(255,217,61,0.4), 0 0 80px rgba(255,217,61,0.15)' },
};

function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const unlock = useCallback((id: string, name: string, description: string, icon: React.ReactNode, rarity: Achievement['rarity'] = 'common') => {
    const timestamp = Date.now();
    setAchievements(prev => [{
      id, name, description, icon, rarity, timestamp,
    }, ...prev].slice(0, 5));

    // Auto-dismiss after 5s
    setTimeout(() => {
      setAchievements(prev => prev.filter(a => a.timestamp !== timestamp));
    }, 5000);
  }, []);

  return { achievements, unlock };
}

function AchievementToasts({ achievements }: { achievements: Achievement[] }) {
  return (
    <div className="fixed top-20 right-4 z-[85] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      <AnimatePresence>
        {achievements.map((ach, i) => {
          const config = RARITY_CONFIG[ach.rarity];
          return (
            <motion.div
              key={ach.id + ach.timestamp}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: 'spring' as const, damping: 20, stiffness: 300, delay: i * 0.05 }}
              className="pointer-events-auto rounded-xl p-3 border"
              style={{
                backgroundColor: config.bg,
                borderColor: config.border,
                boxShadow: config.glow,
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg flex-shrink-0" style={{
                  backgroundColor: `${config.color}15`,
                  color: config.color,
                }}>
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: config.color }}>
                      {config.label}
                    </span>
                    {ach.rarity === 'legendary' && (
                      <Sparkles className="w-3 h-3 text-[#ffd93d] animate-pulse" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-[#f0f0f0] truncate">{ach.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{ach.description}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMBO COUNTER
// ═══════════════════════════════════════════════════════════════

function useCombo() {
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const increment = useCallback(() => {
    setCombo(prev => {
      const next = prev + 1;
      setMaxCombo(m => Math.max(m, next));
      return next;
    });
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCombo(0), 3000);
  }, []);

  const reset = useCallback(() => {
    setCombo(0);
    clearTimeout(timeoutRef.current);
  }, []);

  return { combo, maxCombo, increment, reset };
}

function ComboCounter({ combo }: { combo: number }) {
  if (combo < 3) return null;

  const size = Math.min(48, 24 + combo * 2);
  const color = combo >= 10 ? '#ffd93d' : combo >= 7 ? '#a78bfa' : combo >= 5 ? '#06b6d4' : '#00ff88';

  return (
    <motion.div
      className="fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-[88] pointer-events-none"
      key={combo}
      initial={{ scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
    >
      <div className="flex flex-col items-center">
        <motion.span
          className="font-black font-mono"
          style={{
            fontSize: size,
            color,
            textShadow: `0 0 30px ${color}60, 0 0 60px ${color}30`,
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.3 }}
        >
          {combo}x
        </motion.span>
        <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color }}>
          COMBO
        </span>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED RISK GAUGE UPGRADE (heartbeat)
// ═══════════════════════════════════════════════════════════════

function AnimatedRiskDisplay({ score }: { score: number }) {
  const pulse = useMotionValue(1);
  const scale = useTransform(pulse, [1, 1.15], [1, 1.15]);

  useEffect(() => {
    const interval = setInterval(() => {
      pulse.set(1);
      setTimeout(() => pulse.set(1.15), 100);
      setTimeout(() => pulse.set(1), 400);
    }, 1200);
    return () => clearInterval(interval);
  }, [pulse]);

  const color = score > 70 ? '#ff3355' : score > 40 ? '#ff8844' : '#00ff88';
  const label = score > 70 ? 'CRITICAL' : score > 40 ? 'ELEVATED' : 'LOW';

  return (
    <motion.div
      style={{ scale }}
      className="flex flex-col items-center"
    >
      <span
        className="text-6xl sm:text-7xl font-black font-mono"
        style={{
          color,
          textShadow: `0 0 40px ${color}40, 0 0 80px ${color}20`,
        }}
      >
        {score}
      </span>
      <span
        className="text-xs font-black uppercase tracking-[0.3em] mt-1"
        style={{ color }}
      >
        {label}
      </span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MILESTONE CELEBRATION (level up modal)
// ═══════════════════════════════════════════════════════════════

interface MilestoneData {
  show: boolean;
  type: 'levelup' | 'streak' | 'legendary_badge';
  level?: number;
  streak?: number;
  rank?: string;
  rankColor?: string;
  badgeName?: string;
}

function MilestoneCelebration({ data, onClose }: { data: MilestoneData; onClose: () => void }) {
  useEffect(() => {
    if (!data.show) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [data.show, onClose]);

  if (!data.show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[92] flex items-center justify-center pointer-events-none"
    >
      {/* Dramatic vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(8,10,16,0.7) 100%)',
      }} />

      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ type: 'spring' as const, damping: 10, stiffness: 150 }}
        className="relative z-10 text-center"
      >
        {data.type === 'levelup' && (
          <>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Crown className="w-16 h-16 text-[#ffd93d] mx-auto mb-4" style={{
                filter: 'drop-shadow(0 0 20px rgba(255,217,61,0.5))',
              }} />
            </motion.div>
            <div className="text-sm font-bold text-[#ffd93d] uppercase tracking-[0.3em] mb-2">Level Up</div>
            <div className="text-6xl font-black font-mono" style={{
              color: data.rankColor || '#ffd93d',
              textShadow: `0 0 40px ${data.rankColor || '#ffd93d'}50`,
            }}>
              {data.level}
            </div>
            <div className="text-lg font-bold mt-1" style={{ color: data.rankColor }}>
              {data.rank}
            </div>
          </>
        )}

        {data.type === 'streak' && (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Flame className="w-16 h-16 text-[#ff9f43] mx-auto mb-4" style={{
                filter: 'drop-shadow(0 0 20px rgba(255,159,67,0.5))',
              }} />
            </motion.div>
            <div className="text-sm font-bold text-[#ff9f43] uppercase tracking-[0.3em] mb-2">Streak Milestone</div>
            <div className="text-6xl font-black font-mono text-[#ff9f43]" style={{
              textShadow: '0 0 40px rgba(255,159,67,0.5)',
            }}>
              {data.streak}x
            </div>
            <div className="text-sm text-muted-foreground mt-1">Consecutive Scans</div>
          </>
        )}

        {data.type === 'legendary_badge' && (
          <>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' as const }}
            >
              <Award className="w-16 h-16 text-[#ffd93d] mx-auto mb-4" style={{
                filter: 'drop-shadow(0 0 25px rgba(255,217,61,0.6))',
              }} />
            </motion.div>
            <div className="text-sm font-bold text-[#ffd93d] uppercase tracking-[0.3em] mb-2">Legendary Achievement</div>
            <div className="text-xl font-bold text-[#f0f0f0]">{data.badgeName}</div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PERSONAL BEST TRACKER
// ═══════════════════════════════════════════════════════════════

interface PersonalBests {
  maxFindings: number;
  maxRiskScore: number;
  maxCriticalCount: number;
  totalScansCompleted: number;
}

function usePersonalBests() {
  const [bests, setBests] = useState<PersonalBests>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('reconpro_bests');
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return { maxFindings: 0, maxRiskScore: 0, maxCriticalCount: 0, totalScansCompleted: 0 };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reconpro_bests', JSON.stringify(bests));
    }
  }, [bests]);

  const checkAndUpdate = useCallback((findings: number, riskScore: number, criticalCount: number) => {
    const isBestFindings = findings > bests.maxFindings;
    const isBestRisk = riskScore > bests.maxRiskScore;
    const isBestCritical = criticalCount > bests.maxCriticalCount;

    setBests(prev => ({
      maxFindings: Math.max(prev.maxFindings, findings),
      maxRiskScore: Math.max(prev.maxRiskScore, riskScore),
      maxCriticalCount: Math.max(prev.maxCriticalCount, criticalCount),
      totalScansCompleted: prev.totalScansCompleted + 1,
    }));

    return { isBestFindings, isBestRisk, isBestCritical };
  }, [bests]);

  return { bests, checkAndUpdate };
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS BAR WITH ANTICIPATION (slow-down near finish)
// ═══════════════════════════════════════════════════════════════

function AnticipationProgressBar({ progress }: { progress: number }) {
  // Slow down visual near the end to build anticipation
  const visualProgress = useMemo(() => {
    if (progress < 70) return progress;
    if (progress < 90) return 70 + (progress - 70) * 0.6;
    if (progress < 98) return 82 + (progress - 90) * 0.5;
    return 91 + (progress - 98) * 0.9; // final rush
  }, [progress]);

  return (
    <div className="relative h-3 bg-[#21262d] rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full relative"
        style={{
          background: 'linear-gradient(90deg, #00ff88, #06b6d4, #a78bfa)',
        }}
        animate={{ width: `${visualProgress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' as const }}
      >
        {/* Glow at leading edge */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/30 blur-sm" />
      </motion.div>

      {/* Scanline sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' as const }}
      />

      {/* Pulsing glow near finish */}
      {progress > 85 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 20px rgba(52,211,153,0.3), 0 0 40px rgba(52,211,153,0.1)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOOK: useDopamineEngine (combines everything)
// ═══════════════════════════════════════════════════════════════

export function useDopamineEngine() {
  const confetti = useConfetti();
  const floatingXP = useFloatingXP();
  const screenShake = useScreenShake();
  const achievements = useAchievements();
  const combo = useCombo();
  const personalBests = usePersonalBests();

  const [celebration, setCelebration] = useState<CelebrationData>({
    show: false, domain: '', findings: 0, critical: 0, high: 0,
    riskScore: 0, xpGained: 0, newLevel: false, levelUp: false,
    streak: 0, personalBestFindings: false, personalBestRisk: false,
  });

  const [milestone, setMilestone] = useState<MilestoneData>({
    show: false, type: 'levelup',
  });

  // Called when a finding is discovered during scanning
  const onFindingDiscovered = useCallback((severity: string, title: string, category: string) => {
    const xpMap: Record<string, number> = { critical: 50, high: 20, medium: 10, low: 5, info: 2 };
    const amount = xpMap[severity] || 2;
    floatingXP.addXP(amount, severity.toUpperCase(), severity);
    combo.increment();

    // Combo achievements
    if (combo.combo === 5) {
      achievements.unlock('combo5', 'Combo Starter', '5x finding combo', <Flame className="w-5 h-5" />, 'rare');
    }
    if (combo.combo === 10) {
      achievements.unlock('combo10', 'Combo Master', '10x finding combo', <Zap className="w-5 h-5" />, 'epic');
    }
    if (combo.combo === 20) {
      achievements.unlock('combo20', 'Unstoppable', '20x finding combo', <Skull className="w-5 h-5" />, 'legendary');
      confetti.spawnBurst(40, 0.5);
    }

    // Critical finding = screen shake + mini confetti burst
    if (severity === 'critical') {
      screenShake.triggerShake('red');
      confetti.spawnDirected(30, 30);
    }
    if (severity === 'high') {
      confetti.spawnDirected(10, 50);
    }
  }, [floatingXP, combo, achievements, screenShake, confetti]);

  // Called when scan completes
  const onScanComplete = useCallback((data: {
    domain: string;
    findings: { severity: string; category: string; title: string }[];
    riskScore: number;
    criticalCount: number;
    highCount: number;
    xpGained: number;
    newLevel: boolean;
    streak: number;
    level: number;
  }) => {
    // Check personal bests
    const { isBestFindings, isBestRisk } = personalBests.checkAndUpdate(
      data.findings.length,
      data.riskScore,
      data.criticalCount,
    );

    // Level up milestone
    if (data.newLevel) {
      const rankName = data.level >= 10 ? 'Apex Predator' : data.level >= 8 ? 'Elite Hunter' : data.level >= 6 ? 'Veteran Operative' : data.level >= 4 ? 'Field Agent' : 'Scout';
      const rankColor = data.level >= 10 ? '#ff6b6b' : data.level >= 8 ? '#ffd93d' : data.level >= 6 ? '#ff9f43' : '#00ff88';
      setMilestone({ show: true, type: 'levelup', level: data.level, rank: rankName, rankColor });
    }

    // Streak milestones
    if (data.streak === 5 || data.streak === 10 || data.streak === 25 || data.streak === 50) {
      setTimeout(() => {
        setMilestone({ show: true, type: 'streak', streak: data.streak });
      }, 2000);
    }

    // Achievement unlocks
    if (data.findings.length >= 100) {
      achievements.unlock('100findings', 'Data Miner', 'Discovered 100+ findings in a single scan', <Star className="w-5 h-5" />, 'epic');
    }
    if (data.findings.length >= 200) {
      achievements.unlock('200findings', 'Deep Digger', '200+ findings in one scan', <Rocket className="w-5 h-5" />, 'legendary');
    }
    if (data.riskScore >= 80) {
      achievements.unlock('highrisk', 'Danger Zone', 'Target with risk score 80+', <Skull className="w-5 h-5" />, 'epic');
    }
    if (isBestFindings && personalBests.bests.totalScansCompleted > 1) {
      achievements.unlock('newrecord', 'New Record', 'Personal best: most findings', <Trophy className="w-5 h-5" />, 'rare');
    }
    if (data.streak >= 5) {
      achievements.unlock('streak5', 'On Fire', '5 scan streak', <Flame className="w-5 h-5" />, 'rare');
    }
    if (data.streak >= 10) {
      achievements.unlock('streak10', 'Relentless', '10 scan streak', <Crosshair className="w-5 h-5" />, 'epic');
    }

    // Big confetti burst
    confetti.spawnBurst(120, 1.5);

    // Show celebration screen
    setTimeout(() => {
      setCelebration({
        show: true,
        domain: data.domain,
        findings: data.findings.length,
        critical: data.criticalCount,
        high: data.highCount,
        riskScore: data.riskScore,
        xpGained: data.xpGained,
        newLevel: data.newLevel,
        levelUp: data.newLevel,
        streak: data.streak,
        personalBestFindings: isBestFindings,
        personalBestRisk: isBestRisk,
      });
    }, 300);

    combo.reset();
  }, [personalBests, achievements, confetti, combo]);

  const closeCelebration = useCallback(() => {
    setCelebration(prev => ({ ...prev, show: false }));
  }, []);

  const closeMilestone = useCallback(() => {
    setMilestone(prev => ({ ...prev, show: false }));
  }, []);

  return {
    // State
    confettiParticles: confetti.particles,
    floatingXPPopups: floatingXP.popups,
    shaking: screenShake.shaking,
    flashColor: screenShake.flash,
    achievements: achievements.achievements,
    combo: combo.combo,
    maxCombo: combo.maxCombo,
    celebration,
    milestone,
    personalBests: personalBests.bests,

    // Actions
    onFindingDiscovered,
    onScanComplete,
    closeCelebration,
    closeMilestone,
  };
}

// ═══════════════════════════════════════════════════════════════
// RENDER COMPONENTS (exported for use in page.tsx)
// ═══════════════════════════════════════════════════════════════

export {
  ConfettiCanvas,
  FloatingXPCanvas,
  ScreenEffects,
  CelebrationScreen,
  AchievementToasts,
  ComboCounter,
  AnimatedRiskDisplay,
  MilestoneCelebration,
  AnticipationProgressBar,
  usePersonalBests,
  RARITY_CONFIG,
  type Achievement,
  type MilestoneData,
};
