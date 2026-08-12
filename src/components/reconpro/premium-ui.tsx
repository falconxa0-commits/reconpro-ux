'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════
// ONYX LUXE PREMIUM UI PRIMITIVES
// OLED glass components — pure white/silver on infinite black
// ═══════════════════════════════════════════════════════════════════════

// ─── Premium Card ────────────────────────────────────────────────

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
  accentColor = '#ffffff',
  hover = true,
  padding = 'md',
}: PremiumCardProps) {
  const padClass = padding === 'sm' ? 'p-3.5' : padding === 'lg' ? 'p-6' : 'p-5';

  return (
    <motion.div
      className={`stat-card ${padClass} ${className}`}
      style={{ '--accent-line': `${accentColor}30` } as React.CSSProperties}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
    >
      {children}
    </motion.div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────

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
    pass: 'bg-[rgba(61,214,140,0.06)] text-[#00ff88] border-[rgba(61,214,140,0.1)]',
    warn: 'bg-[rgba(232,179,61,0.06)] text-[#e8b33d] border-[rgba(232,179,61,0.1)]',
    fail: 'bg-[rgba(232,64,87,0.06)] text-[#ff3355] border-[rgba(232,64,87,0.1)]',
    info: 'bg-[rgba(91,168,212,0.06)] text-[#5ba8d4] border-[rgba(91,168,212,0.1)]',
    neutral: 'bg-[rgba(255,255,255,0.02)] text-[#6b6960] border-[rgba(255,255,255,0.05)]',
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
  const baseClass = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-400 cursor-pointer focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-[#ffffff] to-[#888888] text-black hover:shadow-[0_0_24px_rgba(255,255,255,0.1),0_4px_16px_rgba(255,255,255,0.06)] hover:-translate-y-0.5 active:translate-y-0',
    ghost: 'bg-transparent text-[#6b6960] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.08)] hover:text-[#bbbbbb]',
    danger: 'bg-gradient-to-r from-[#ff3355] to-[#cc2244] text-white hover:shadow-[0_0_24px_rgba(232,64,87,0.2)] hover:-translate-y-0.5',
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
        <h2 className="text-[15px] font-semibold text-[#f0f0f0] tracking-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#444444] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | string;
  color?: string;
  icon?: ReactNode;
  subtitle?: string;
}

export function MetricCard({ label, value, color = '#ffffff', icon, subtitle }: MetricCardProps) {
  return (
    <div
      className="stat-card p-4 flex flex-col justify-between h-full"
      style={{ '--accent-line': `${color}30` } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9.5px] font-medium uppercase tracking-[0.15em] text-[#444444]">{label}</span>
        {icon && <div style={{ color }} className="opacity-40">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono" style={{ color }}>{value}</span>
      </div>
      {subtitle && <span className="text-[10px] text-[#3d3b38] mt-1">{subtitle}</span>}
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
      {icon && <div className="mb-4 text-[#111111]">{icon}</div>}
      <h3 className="text-base font-semibold text-[#bbbbbb] mb-1.5">{title}</h3>
      <p className="text-[13px] text-[#444444] max-w-sm mb-6">{description}</p>
      {action && <GlowButton onClick={action.onClick}>{action.label}</GlowButton>}
    </div>
  );
}

// ─── Separator ──────────────────────────────────────────────────

export function Separator({ className = '' }: { className?: string }) {
  return <div className={`separator-glow ${className}`} />;
}

// ─── Monospace Label ────────────────────────────────────────────

export function MonoLabel({ children, color = '#444444' }: { children: ReactNode; color?: string }) {
  return (
    <span className="text-[10px] font-mono tracking-wider" style={{ color }}>
      {children}
    </span>
  );
}

// ─── Progress Ring (SVG) ────────────────────────────────────────

interface ProgressRingProps {
  value: number;
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
  color = '#ffffff',
  bgColor = 'rgba(255,255,255,0.03)',
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
          className="transition-all duration-1200 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color}30)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-mono" style={{ color }}>{value}</span>
        {label && <span className="text-[8px] text-[#444444] uppercase tracking-wider">{label}</span>}
      </div>
    </div>
  );
}
