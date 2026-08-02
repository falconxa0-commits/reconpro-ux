'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════
// DARKSWEAT PREMIUM UI PRIMITIVES
// Reusable components for the premium dark-sweat design system
// ═══════════════════════════════════════════════════════════════════════

// ─── Premium Card ────────────────────────────────────────────────
// Elevated card with subtle glass effect and hover glow

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  accentColor?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export function PremiumCard({
  children,
  className = '',
  accentColor = '#34d399',
  hover = true,
  padding = 'md',
}: PremiumCardProps) {
  const padClass = padding === 'sm' ? 'p-3.5' : padding === 'lg' ? 'p-6' : 'p-5';

  return (
    <motion.div
      className={`stat-card ${padClass} ${className}`}
      style={{ '--accent-line': `${accentColor}35` } as React.CSSProperties}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────
// Severity/status indicator badge

interface StatusBadgeProps {
  label: string;
  variant?: 'pass' | 'warn' | 'fail' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function StatusBadge({
  label,
  variant = 'neutral',
  size = 'sm',
  pulse = false,
}: StatusBadgeProps) {
  const variantStyles: Record<string, string> = {
    pass: 'bg-[rgba(52,211,153,0.08)] text-[#34d399] border-[rgba(52,211,153,0.15)]',
    warn: 'bg-[rgba(251,191,36,0.08)] text-[#facc15] border-[rgba(251,191,36,0.15)]',
    fail: 'bg-[rgba(244,63,94,0.08)] text-[#f43f5e] border-[rgba(244,63,94,0.15)]',
    info: 'bg-[rgba(34,211,238,0.08)] text-[#22d3ee] border-[rgba(34,211,238,0.15)]',
    neutral: 'bg-[rgba(255,255,255,0.03)] text-[#94a3b8] border-[rgba(255,255,255,0.06)]',
  };

  const sizeClass = size === 'sm' ? 'text-[9px] px-2 py-0.5 rounded-md' : 'text-[10px] px-2.5 py-1 rounded-lg';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium border
        ${variantStyles[variant]} ${sizeClass}
      `}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {label}
    </span>
  );
}

// ─── Glow Button ────────────────────────────────────────────────
// Primary action button with glow effect

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function GlowButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}: GlowButtonProps) {
  const baseClass = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 cursor-pointer focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-[#34d399] to-[#10b981] text-[#030407] hover:shadow-[0_0_24px_rgba(52,211,153,0.25),0_4px_16px_rgba(52,211,153,0.15)] hover:-translate-y-0.5 active:translate-y-0',
    ghost: 'bg-transparent text-[#94a3b8] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] hover:text-[#f1f5f9]',
    danger: 'bg-gradient-to-r from-[#f43f5e] to-[#e11d48] text-white hover:shadow-[0_0_24px_rgba(244,63,94,0.25)] hover:-translate-y-0.5',
  };

  const sizes: Record<string, string> = {
    sm: 'text-[11px] px-3 py-1.5',
    md: 'text-[12px] px-4 py-2.5',
    lg: 'text-[13px] px-6 py-3',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

// ─── Section Header ─────────────────────────────────────────────
// View section title with optional action

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <h2 className="text-[15px] font-semibold text-[#f1f5f9] tracking-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#475569] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────
// Single metric display with accent color

interface MetricCardProps {
  label: string;
  value: number | string;
  color?: string;
  icon?: ReactNode;
  subtitle?: string;
}

export function MetricCard({ label, value, color = '#34d399', icon, subtitle }: MetricCardProps) {
  return (
    <div
      className="stat-card p-4 flex flex-col justify-between h-full"
      style={{ '--accent-line': `${color}35` } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9.5px] font-medium uppercase tracking-[0.15em] text-[#475569]">{label}</span>
        {icon && <div style={{ color }} className="opacity-60">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono" style={{ color }}>{value}</span>
      </div>
      {subtitle && <span className="text-[10px] text-[#334155] mt-1">{subtitle}</span>}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {icon && <div className="mb-4 text-[#1e293b]">{icon}</div>}
      <h3 className="text-base font-semibold text-[#e2e8f0] mb-1.5">{title}</h3>
      <p className="text-[13px] text-[#475569] max-w-sm mb-6">{description}</p>
      {action && <GlowButton onClick={action.onClick}>{action.label}</GlowButton>}
    </div>
  );
}

// ─── Separator ──────────────────────────────────────────────────

export function Separator({ className = '' }: { className?: string }) {
  return <div className={`separator-glow ${className}`} />;
}

// ─── Monospace Label ────────────────────────────────────────────

export function MonoLabel({ children, color = '#475569' }: { children: ReactNode; color?: string }) {
  return (
    <span className="text-[10px] font-mono tracking-wider" style={{ color }}>
      {children}
    </span>
  );
}

// ─── Progress Ring (SVG) ────────────────────────────────────────

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 5,
  color = '#34d399',
  bgColor = 'rgba(255,255,255,0.04)',
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-mono" style={{ color }}>{value}</span>
        {label && <span className="text-[8px] text-[#475569] uppercase tracking-wider">{label}</span>}
      </div>
    </div>
  );
}
