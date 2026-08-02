'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  suffix?: string;
  label?: string;
  glow?: boolean;
}

export function AnimatedCounter({ target, duration = 2000, color = '#34d399', size = 'lg', suffix = '', label, glow = false }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    setIsAnimating(true);
    const startTime = Date.now();
    const durationMs = duration;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  const fontSizes = { sm: 'text-xl', md: 'text-3xl', lg: 'text-5xl' };

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
      )}
      <div className="relative">
        <motion.span
          className={`font-bold font-mono ${fontSizes[size]}`}
          style={{ color }}
          animate={glow && isAnimating ? {
            textShadow: [`0 0 10px ${color}40`, `0 0 30px ${color}60`, `0 0 10px ${color}40`],
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {display.toLocaleString()}{suffix}
        </motion.span>
        {isAnimating && (
          <motion.div
            className="absolute inset-0 blur-xl opacity-30"
            style={{ backgroundColor: color }}
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}

// ── Risk Score Gauge with animation ──

export function RiskScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let color = '#34d399';
  let label = 'LOW';
  if (score >= 80) { color = '#f43f5e'; label = 'CRITICAL'; }
  else if (score >= 60) { color = '#fb923c'; label = 'HIGH'; }
  else if (score >= 40) { color = '#facc15'; label = 'MEDIUM'; }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        {/* Background circle */}
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke="#21262d"
          strokeWidth="8"
        />
        {/* Score arc */}
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-bold font-mono text-2xl"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
}
