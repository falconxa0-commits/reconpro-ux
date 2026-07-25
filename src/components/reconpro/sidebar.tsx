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
      { id: 'botcage', label: 'Bot Hunter & Cage', icon: Bot, badge: 'C2 DETECT' },
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
];

// ─── Animation Variants ──────────────────────────────────────────────────────

const sidebarVariants = {
  expanded: { width: 272 },
  collapsed: { width: 72 },
};

const labelVariants = {
  expanded: { opacity: 1, x: 0, display: 'block' },
  collapsed: { opacity: 0, x: -8, transitionEnd: { display: 'none' } },
};

const sectionTitleVariants = {
  expanded: { opacity: 1, height: 'auto', marginBottom: 8 },
  collapsed: { opacity: 0, height: 0, marginBottom: 0 },
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

  const buttonContent = (
    <motion.button
      onClick={onClick}
      className={`
        group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5
        text-[13px] font-medium tracking-wide transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/40
        ${collapsed ? 'justify-center' : ''}
        ${
          active
            ? 'bg-[rgba(0,255,136,0.08)] text-[#00ff88]'
            : 'text-[#8b949e] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#e6edf3]'
        }
      `}
      whileHover={{ x: collapsed ? 0 : 2 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Active left-border accent */}
      <motion.div
        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#00ff88]"
        initial={false}
        animate={{ scaleY: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ transformOrigin: 'center' }}
      />

      {/* Icon container */}
      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
        {/* Glow effect on active */}
        <motion.div
          className="absolute inset-0 rounded-lg"
          initial={false}
          animate={{
            boxShadow: active
              ? '0 0 12px rgba(0,255,136,0.15), 0 0 24px rgba(0,255,136,0.05)'
              : '0 0 0px rgba(0,255,136,0)',
          }}
          transition={{ duration: 0.3 }}
        />
        <Icon
          className={`h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200 ${
            active ? 'text-[#00ff88]' : 'text-[#8b949e] group-hover:text-[#e6edf3]'
          }`}
        />
      </div>

      {/* Label text */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="truncate flex-1"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      {item.badge && !collapsed && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00ff8820] text-[#00ff88]">
          {item.badge}
        </span>
      )}

      {/* Hover ripple (only when expanded) */}
      {!collapsed && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(0,255,136,0.04) 0%, transparent 70%)',
          }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );

  // When collapsed, wrap in tooltip
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-[rgba(0,255,136,0.15)] bg-[#0d1117] text-[#e6edf3] font-medium"
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
    <div className="relative mx-3 my-3 flex items-center">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.06)] to-transparent" />
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
          <h3 className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#484f58]">
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
      {/* Shield Icon with glow */}
      <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              '0 0 12px rgba(0,255,136,0.25), 0 0 24px rgba(0,255,136,0.1)',
              '0 0 16px rgba(0,255,136,0.35), 0 0 32px rgba(0,255,136,0.15)',
              '0 0 12px rgba(0,255,136,0.25), 0 0 24px rgba(0,255,136,0.1)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00ff88]/20 to-[#00ff88]/5 ring-1 ring-[#00ff88]/20">
          <Shield className="h-5 w-5 text-[#00ff88]" />
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
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-[#e6edf3]">
                Recon
              </span>
              <span className="text-base font-bold tracking-tight text-[#00ff88]">
                Pro
              </span>
            </div>
            <Badge
              variant="outline"
              className="h-[18px] w-fit border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.06)] px-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#00ff88] hover:bg-[rgba(0,255,136,0.06)]"
            >
              Enterprise
            </Badge>
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
      className={`flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 transition-colors duration-200 hover:bg-[rgba(255,255,255,0.04)] ${
        collapsed ? 'justify-center' : ''
      }`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar with green ring */}
      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00ff88]/40 to-[#00ff88]/10 ring-1 ring-[#00ff88]/30" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161b22] text-[11px] font-bold text-[#00ff88]">
          AC
        </div>
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0d14] bg-[#00ff88]" />
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
            <span className="truncate text-[13px] font-semibold text-[#e6edf3]">
              Alex Chen
            </span>
            <span className="truncate text-[11px] text-[#484f58]">
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
      className="group flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[#484f58] transition-all duration-200 hover:border-[rgba(0,255,136,0.2)] hover:bg-[rgba(0,255,136,0.04)] hover:text-[#00ff88] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/40"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <motion.div
        animate={{ rotate: collapsed ? 0 : 180 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
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
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#0a0d14]"
      style={{
        // Glassmorphism subtle backdrop
        backdropFilter: 'blur(20px)',
        // Ambient glow on right edge
        boxShadow:
          'inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top ambient gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,255,136,0.03) 0%, transparent 70%)',
        }}
      />

      {/* ── Logo ── */}
      <LogoSection collapsed={collapsed} />

      {/* Divider after logo */}
      <div className="relative mx-3 flex items-center">
        <div className="h-px w-full bg-gradient-to-r from-[rgba(0,255,136,0.12)] via-[rgba(255,255,255,0.06)] to-transparent" />
      </div>

      {/* ── Navigation Sections ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-4 scrollbar-none">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* Section header */}
            <SectionHeader title={section.title} collapsed={collapsed} />

            {/* Nav items */}
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

            {/* Separator between sections (not after the last one) */}
            {sectionIndex < NAV_SECTIONS.length - 1 && <SectionSeparator />}
          </div>
        ))}
      </nav>

      {/* ── Bottom Section ── */}
      <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.06)] px-3 py-4">
        {/* User info */}
        <UserSection collapsed={collapsed} />

        {/* Collapse toggle */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <CollapseToggle collapsed={collapsed} onToggle={onToggle} />
        </div>
      </div>

      {/* Right edge accent line */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-[rgba(0,255,136,0.08)] via-transparent to-[rgba(0,255,136,0.04)]" />
    </motion.aside>
  );
}
