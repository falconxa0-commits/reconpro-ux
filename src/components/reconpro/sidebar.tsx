'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  LayoutDashboard,
  FileBarChart,
  Radar,
  History,
  Globe,
  Map,
  Orbit,
  Brain,
  Eye,
  AlertTriangle,
  TrendingUp,
  Users,
  ShieldCheck,
  Puzzle,
  Activity,
  ScrollText,
  Settings,
  CreditCard,
  Palette,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Skull,
  Bot,
  Terminal,
  Trophy,
  ShieldAlert,
  Radio,
  Film,
  Ghost,
  Timer,
  Crown,
  Cpu,
  Cloud,
  Server,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  accentColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

// ─── Navigation Data ─────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'executive', label: 'Executive Briefing', icon: FileBarChart },
      { id: 'hall-of-fame', label: 'Hall of Fame', icon: Trophy, badge: 'VIBESEC' },
    ],
  },
  {
    title: 'Reconnaissance',
    items: [
      { id: 'scan', label: 'New Scan', icon: Radar },
      { id: 'history', label: 'Scan History', icon: History },
      { id: 'surface', label: 'Attack Surface', icon: Globe },
      { id: 'radar', label: 'Radar Map', icon: Map },
      { id: 'globe', label: 'Threat Map', icon: Orbit },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'advisor', label: 'AI Advisor', icon: Brain },
      { id: 'threats', label: 'Threat Intel', icon: AlertTriangle },
      { id: 'dashboard', label: 'Risk Trends', icon: TrendingUp },
    ],
  },
  {
    title: 'Proof of Concept',
    items: [
      { id: 'proof', label: 'Live Scan Proof', icon: BadgeCheck, badge: 'VERIFIED' },
    ],
  },
  {
    title: 'Offensive',
    items: [
      { id: 'vulns', label: 'Vulnerability Arsenal', icon: Skull, badge: 'CVE SCAN' },
      { id: 'unified-cli', label: 'ReconPro UNIFIED CLI', icon: Terminal, badge: '6 BLADES' },
      { id: 'war-room', label: 'War Room', icon: Radio, badge: 'LIVE', accentColor: '#ff3355' },
      { id: 'ai-leaderboard', label: 'Hall of Broken Models', icon: Ghost, badge: 'VIRAL', accentColor: '#ff3355' },
      { id: 'proof-gallery', label: 'Proof Gallery', icon: Film, badge: 'SHARE' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'nhi-kill-switch', label: 'NHI Kill Switch', icon: ShieldAlert, badge: 'ENTERPRISE', accentColor: '#ff3355' },
      { id: 'genesis-stamp', label: 'Genesis Stamp', icon: BadgeCheck, badge: 'ENTERPRISE', accentColor: '#00ff88' },
      { id: 'implosion', label: 'Risk Simulator', icon: Skull, badge: 'SALES', accentColor: '#ff3355' },
      { id: 'doom-clock', label: 'Doom Clock', icon: Timer, badge: 'PQC', accentColor: '#ff3355' },
      { id: 'pqc-vault', label: 'PQC Sovereign Vault', icon: Crown, badge: 'SOVEREIGN', accentColor: '#FFD700' },
      { id: 'fear-index', label: 'CISO Fear Index', icon: AlertTriangle, badge: 'LIVE', accentColor: '#ff8844' },
      { id: 'exposed-asset-map', label: 'Exposed Asset Map', icon: Globe, badge: 'GLOBAL', accentColor: '#44aaff' },
      { id: 'confused-deputy', label: 'Confused Deputy', icon: Cpu, badge: 'PLAY' },
      { id: 'cognitive-dread', label: 'Cognitive Dread', icon: Brain, badge: 'OMNI', accentColor: '#d946ef' },
    ],
  },
  {
    title: 'Enterprise',
    items: [
      { id: 'team', label: 'Team Management', icon: Users },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'integrations', label: 'Integrations', icon: Puzzle },
      { id: 'monitoring', label: 'Monitoring', icon: Activity },
      { id: 'pricing', label: 'Pricing', icon: CreditCard },
      { id: 'white-label', label: 'White-Label', icon: Palette },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    title: 'Government',
    items: [
      { id: 'cni-sentinel', label: 'CNI Sentinel', icon: ShieldAlert, badge: 'OT', accentColor: '#00ff41' },
      { id: 'air-gapped-appliance', label: 'Air-Gapped Appliance', icon: Server, badge: 'MILSPEC', accentColor: '#22c55e' },
      { id: 'pegasus-inspector', label: 'Pegasus Inspector', icon: Smartphone, badge: 'FORENSICS' },
    ],
  },
  {
    title: 'Authority',
    items: [
      { id: 'sovereign-control', label: 'Sovereign Control', icon: Crown, badge: 'BOSS', accentColor: '#FFD700' },
      { id: 'broadcast-center', label: 'Broadcast Center', icon: Radio, badge: 'ECHO-SIGN', accentColor: '#f59e0b' },
      { id: 'wall-of-shame', label: 'Wall of Shame', icon: Eye, badge: 'LIVE', accentColor: '#ff3355' },
    ],
  },
  {
    title: 'Labs',
    items: [
      { id: 'matrix-terminal', label: 'Matrix Terminal', icon: Terminal, badge: 'PLAY' },
      { id: 'training-cluster', label: 'GPU Training', icon: Cpu, badge: 'CLUSTER' },
    ],
  },
];

// ─── Animation Variants ──────────────────────────────────────────────────────

const sidebarVariants = {
  expanded: { width: 260 },
  collapsed: { width: 68 },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function NavItemButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const badgeColor = item.accentColor || '#00ff88';

  const buttonContent = (
    <motion.button
      onClick={onClick}
      className={`
        group relative flex w-full items-center gap-3 rounded-xl px-3 py-2
        text-[12.5px] font-medium tracking-wide transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/30
        ${collapsed ? 'justify-center' : ''}
        ${
          active
            ? 'bg-[rgba(52,211,153,0.07)] text-[#00ff88]'
            : 'text-[#64748b] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#cbd5e1]'
        }
      `}
      whileHover={{ x: collapsed ? 0 : 2 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Active left accent line */}
      <motion.div
        className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full"
        style={{ background: badgeColor }}
        initial={false}
        animate={{ scaleY: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />

      {/* Icon */}
      <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center">
        <Icon
          className={`h-[16px] w-[16px] flex-shrink-0 transition-all duration-300 ${
            active
              ? 'text-[#00ff88] drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'
              : 'text-[#444444] group-hover:text-[#555555]'
          }`}
          strokeWidth={active ? 2 : 1.5}
        />
      </div>

      {/* Label */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="truncate flex-1"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      {item.badge && !collapsed && (
        <span
          className="px-1.5 py-0.5 rounded-md text-[8.5px] font-bold tracking-wider"
          style={{
            background: `${badgeColor}10`,
            color: badgeColor,
            border: `1px solid ${badgeColor}20`,
          }}
        >
          {item.badge}
        </span>
      )}
    </motion.button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-[rgba(52,211,153,0.12)] bg-[#080b14] text-[#f0f0f0] font-medium"
        >
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}

function SectionSeparator() {
  return (
    <div className="relative mx-3 my-2 flex items-center">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.03)] to-transparent" />
    </div>
  );
}

function SectionHeader({ title, collapsed }: { title: string; collapsed: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.div
          key={title}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <h3 className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#333333]">
            {title}
          </h3>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Logo Section ────────────────────────────────────────────────────────────

function LogoSection({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}>
      <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
        {/* Pulsing glow ring */}
        <motion.div
          className="absolute inset-[-3px] rounded-xl"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(52,211,153,0.15) 25%, transparent 50%, rgba(34,211,238,0.1) 75%, transparent 100%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#000000] to-[#080b14] ring-1 ring-[rgba(52,211,153,0.2)]">
          <Shield className="h-[18px] w-[18px] text-[#00ff88]" strokeWidth={1.8} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="logo-text"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-0.5 overflow-hidden"
          >
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-bold tracking-tight text-[#f0f0f0]">
                Recon
              </span>
              <span className="text-[15px] font-bold tracking-tight text-[#00ff88]">
                Pro
              </span>
            </div>
            <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#333333]">
              Enterprise
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── User Section ──────────────────────────────────────────────────────────

function UserSection({ collapsed }: { collapsed: boolean }) {
  return (
    <motion.div
      className={`flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 transition-all duration-300 hover:border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.03)] ${
        collapsed ? 'justify-center' : ''
      }`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00ff88]/30 to-[#00ff88]/5 ring-1 ring-[#00ff88]/20" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#000000] text-[10px] font-bold text-[#00ff88]">
          AC
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#050710] bg-[#00ff88]" />
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="user-info"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex flex-col overflow-hidden"
          >
            <span className="truncate text-[12.5px] font-semibold text-[#bbbbbb]">
              Alex Chen
            </span>
            <span className="truncate text-[10.5px] text-[#444444]">
              Security Lead
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Collapse Toggle ────────────────────────────────────────────────────────

function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      className="group flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] text-[#444444] transition-all duration-300 hover:border-[rgba(52,211,153,0.15)] hover:bg-[rgba(52,211,153,0.04)] hover:text-[#00ff88] focus-visible:outline-none"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <motion.div
        animate={{ rotate: collapsed ? 0 : 180 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </motion.div>
    </motion.button>
  );
}

// ─── Main Sidebar Component ──────────────────────────────────────────────────

export function EnterpriseSidebar({
  activeView,
  onViewChange,
  collapsed,
  onToggle,
}: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col bg-[#050710] overflow-hidden"
      style={{
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Ambient top glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-60"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(52,211,153,0.025) 0%, transparent 70%)',
        }}
      />

      {/* ── Logo ── */}
      <LogoSection collapsed={collapsed} />

      {/* Divider after logo */}
      <div className="mx-4 flex items-center">
        <div className="h-px w-full bg-gradient-to-r from-[rgba(52,211,153,0.08)] via-[rgba(255,255,255,0.03)] to-transparent" />
      </div>

      {/* ── Navigation Sections ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-1 pb-4 scrollbar-none">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.title}>
            <SectionHeader title={section.title} collapsed={collapsed} />
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavItemButton
                  key={item.id}
                  item={item}
                  active={activeView === item.id}
                  collapsed={collapsed}
                  onClick={() => onViewChange(item.id)}
                />
              ))}
            </div>
            {sectionIndex < NAV_SECTIONS.length - 1 && <SectionSeparator />}
          </div>
        ))}
      </nav>

      {/* ── Bottom Section ── */}
      <div className="flex flex-col gap-2.5 border-t border-[rgba(255,255,255,0.03)] px-3 py-3.5">
        <UserSection collapsed={collapsed} />
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <CollapseToggle collapsed={collapsed} onToggle={onToggle} />
        </div>
      </div>

      {/* Right edge — ultra subtle gradient */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-[rgba(52,211,153,0.05)] via-transparent to-[rgba(52,211,153,0.02)]" />
    </motion.aside>
  );
}
