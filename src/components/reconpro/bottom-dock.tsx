'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Radar, Shield, Brain, Globe, Terminal,
  Skull, Trophy, Users, Activity, Puzzle, Settings, CreditCard,
  Crown, Radio, AlertTriangle, Eye, Zap, type LucideIcon,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

interface DockItem {
  id: string;
  icon: LucideIcon;
  label: string;
  color?: string;
}

interface BottomDockProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

// ─── Dock Items — Primary Row ──────────────────────────────────────

const PRIMARY_DOCK: DockItem[] = [
  { id: 'executive', icon: LayoutDashboard, label: 'Command', color: '#ffffff' },
  { id: 'scan', icon: Radar, label: 'Scan', color: '#5ba8d4' },
  { id: 'surface', icon: Globe, label: 'Attack Surface', color: '#e8b33d' },
  { id: 'threats', icon: AlertTriangle, label: 'Threats', color: '#e84057' },
  { id: 'advisor', icon: Brain, label: 'AI Advisor', color: '#3dd68c' },
  { id: 'compliance', icon: Shield, label: 'Compliance', color: '#5ba8d4' },
  { id: 'vulns', icon: Skull, label: 'Arsenal', color: '#e84057' },
];

const SECONDARY_DOCK: DockItem[] = [
  { id: 'hall-of-fame', icon: Trophy, label: 'Hall of Fame' },
  { id: 'team', icon: Users, label: 'Team' },
  { id: 'monitoring', icon: Activity, label: 'Monitor' },
  { id: 'integrations', icon: Puzzle, label: 'Integrations' },
  { id: 'pricing', icon: CreditCard, label: 'Pricing' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'war-room', icon: Radio, label: 'War Room' },
  { id: 'wall-of-shame', icon: Eye, label: 'Wall of Shame' },
  { id: 'sovereign-control', icon: Crown, label: 'Sovereign' },
  { id: 'nhi-kill-switch', icon: Zap, label: 'NHI Kill Switch' },
  { id: 'unified-cli', icon: Terminal, label: 'CLI' },
];

// ─── Expanded Menu ────────────────────────────────────────────────

function ExpandedMenu({
  items,
  activeView,
  onSelect,
  onClose,
}: {
  items: DockItem[];
  activeView: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 glass p-2 min-w-[200px]"
    >
      <div className="grid grid-cols-2 gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onSelect(item.id); onClose(); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-300 text-left
                ${isActive
                  ? 'bg-[rgba(201,168,76,0.08)] text-[#ffffff]'
                  : 'text-[#6b6960] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#c8c6c0]'
                }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={item.color ? { color: isActive ? item.color : undefined } : undefined} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main Dock Component ──────────────────────────────────────────

export function BottomDock({ activeView, onViewChange }: BottomDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isPrimaryView = PRIMARY_DOCK.some(d => d.id === activeView);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      {/* Expanded secondary menu */}
      <AnimatePresence>
        {menuOpen && (
          <ExpandedMenu
            items={SECONDARY_DOCK}
            activeView={activeView}
            onSelect={onViewChange}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {hoveredItem && !menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full mb-2 px-3 py-1.5 rounded-lg bg-[rgba(6,6,10,0.97)] border border-[rgba(255,255,255,0.06)] text-[11px] text-[#666666] font-medium whitespace-nowrap backdrop-blur-xl"
            style={{ pointerEvents: 'none' }}
          >
            {PRIMARY_DOCK.find(d => d.id === hoveredItem)?.label || SECONDARY_DOCK.find(d => d.id === hoveredItem)?.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock bar */}
      <div className="dock-container flex items-center gap-1.5">
        {/* Primary items */}
        {PRIMARY_DOCK.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const color = item.color || '#ffffff';
          return (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              whileHover={{ y: -6, scale: 1.18 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={`dock-item ${isActive ? 'active' : ''}`}
              style={isActive ? { background: `${color}14`, color } : undefined}
            >
              <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2 : 1.5} />
            </motion.button>
          );
        })}

        {/* Separator */}
        <div className="dock-separator" />

        {/* More button */}
        <motion.button
          onClick={() => setMenuOpen(!menuOpen)}
          onMouseEnter={() => setHoveredItem('more')}
          onMouseLeave={() => setHoveredItem(null)}
          whileHover={{ y: -6, scale: 1.18 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className={`dock-item ${menuOpen || (!isPrimaryView && !SECONDARY_DOCK.some(d => d.id === activeView)) ? 'active' : ''}`}
        >
          <div className="flex flex-col gap-[3px]">
            <div className="w-[14px] h-[1.5px] rounded-full bg-current" />
            <div className="w-[14px] h-[1.5px] rounded-full bg-current" />
            <div className="w-[14px] h-[1.5px] rounded-full bg-current" />
          </div>
        </motion.button>

        {/* Scan button — gold CTA */}
        <div className="ml-1">
          <motion.button
            onClick={() => onViewChange('scan')}
            whileHover={{ y: -6, scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="w-[48px] h-[48px] rounded-[16px] flex items-center justify-center transition-all duration-400"
            style={{
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 0 24px rgba(255,255,255,0.06)',
            }}
          >
            <Zap className="w-[20px] h-[20px] text-black" strokeWidth={2} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
