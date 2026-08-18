'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Radar, Shield, Brain, Globe, Map, History,
  Users, Activity, Puzzle, Settings, AlertTriangle, TrendingUp, Zap, type LucideIcon,
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

// ─── Dock Items ─────────────────────────────────────────────────────

const PRIMARY_DOCK: DockItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Overview', color: '#ffffff' },
  { id: 'scan', icon: Radar, label: 'Scan', color: '#5ba8d4' },
  { id: 'surface', icon: Globe, label: 'Attack Surface', color: '#e8b33d' },
  { id: 'threats', icon: AlertTriangle, label: 'Threats', color: '#e84057' },
  { id: 'advisor', icon: Brain, label: 'AI Advisor', color: '#3dd68c' },
  { id: 'compliance', icon: Shield, label: 'Compliance', color: '#5ba8d4' },
];

const SECONDARY_DOCK: DockItem[] = [
  { id: 'history', icon: History, label: 'Scan History' },
  { id: 'radar', icon: Map, label: 'Findings' },
  { id: 'trends', icon: TrendingUp, label: 'Risk Trends' },
  { id: 'team', icon: Users, label: 'Team' },
  { id: 'monitoring', icon: Activity, label: 'Monitor' },
  { id: 'integrations', icon: Puzzle, label: 'Integrations' },
  { id: 'settings', icon: Settings, label: 'Settings' },
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
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 glass p-1.5 min-w-[220px]"
    >
      <div className="grid grid-cols-1 gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onSelect(item.id); onClose(); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 text-left
                ${isActive
                  ? 'bg-white/[0.06] text-white'
                  : 'text-[#666666] hover:bg-white/[0.03] hover:text-[#aaaaaa]'
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
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
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
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 px-2.5 py-1 rounded-md bg-[#111] border border-white/[0.08] text-[11px] text-[#888888] font-medium whitespace-nowrap"
            style={{ pointerEvents: 'none' }}
          >
            {PRIMARY_DOCK.find(d => d.id === hoveredItem)?.label || SECONDARY_DOCK.find(d => d.id === hoveredItem)?.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock bar */}
      <div className="dock-container flex items-center gap-1">
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
              whileHover={{ y: -4, scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring' as const, stiffness: 450, damping: 25 }}
              className={`dock-item ${isActive ? 'active' : ''}`}
              style={isActive ? { background: `${color}12`, color } : undefined}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
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
          whileHover={{ y: -4, scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring' as const, stiffness: 450, damping: 25 }}
          className={`dock-item ${menuOpen || (!isPrimaryView && !SECONDARY_DOCK.some(d => d.id === activeView)) ? 'active' : ''}`}
        >
          <div className="flex flex-col gap-[2.5px]">
            <div className="w-[12px] h-[1.5px] rounded-full bg-current" />
            <div className="w-[12px] h-[1.5px] rounded-full bg-current" />
            <div className="w-[12px] h-[1.5px] rounded-full bg-current" />
          </div>
        </motion.button>

        {/* Scan CTA button */}
        <div className="ml-0.5">
          <motion.button
            onClick={() => onViewChange('scan')}
            whileHover={{ y: -4, scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring' as const, stiffness: 450, damping: 25 }}
            className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.85)',
              boxShadow: '0 0 20px rgba(255,255,255,0.04)',
            }}
          >
            <Zap className="w-[18px] h-[18px] text-black" strokeWidth={2} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
