'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  LayoutDashboard,
  Radar,
  History,
  Globe,
  Map,
  Brain,
  AlertTriangle,
  TrendingUp,
  Users,
  ShieldCheck,
  Puzzle,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

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
    ],
  },
  {
    title: 'Reconnaissance',
    items: [
      { id: 'scan', label: 'New Scan', icon: Radar },
      { id: 'history', label: 'Scan History', icon: History },
      { id: 'surface', label: 'Attack Surface', icon: Globe },
      { id: 'radar', label: 'Findings', icon: Map },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'advisor', label: 'AI Advisor', icon: Brain },
      { id: 'threats', label: 'Threat Intel', icon: AlertTriangle },
      { id: 'trends', label: 'Risk Trends', icon: TrendingUp },
    ],
  },
  {
    title: 'Enterprise',
    items: [
      { id: 'team', label: 'Team Management', icon: Users },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'integrations', label: 'Integrations', icon: Puzzle },
      { id: 'monitoring', label: 'Monitoring', icon: Activity },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

// ─── Animation Variants ──────────────────────────────────────────────────────

const sidebarVariants = {
  expanded: { width: 256 },
  collapsed: { width: 72 },
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
        group relative flex w-full items-center gap-3 rounded-lg px-3 py-2
        text-[13px] font-medium transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/30
        ${collapsed ? 'justify-center px-0' : ''}
        ${
          active
            ? 'bg-white/[0.06] text-white'
            : 'text-[#555555] hover:bg-white/[0.03] hover:text-[#999999]'
        }
      `}
      whileHover={{ x: collapsed ? 0 : 1 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Active left accent bar */}
      {active && (
        <motion.div
          className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full"
          style={{ background: badgeColor }}
          layoutId="sidebar-active-indicator"
          transition={{ type: 'spring' as const, stiffness: 500, damping: 35 }}
        />
      )}

      {/* Icon */}
      <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center">
        <Icon
          className={`h-[16px] w-[16px] flex-shrink-0 transition-all duration-200 ${
            active
              ? 'text-[#00ff88]'
              : 'text-[#555555] group-hover:text-[#777777]'
          }`}
          strokeWidth={active ? 2 : 1.5}
        />
      </div>

      {/* Label */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' as const }}
            className="truncate flex-1"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      {item.badge && !collapsed && (
        <span
          className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide"
          style={{
            background: `${badgeColor}12`,
            color: badgeColor,
            border: `1px solid ${badgeColor}25`,
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
          className="border-white/[0.08] bg-[#0a0a0a] text-[#e0e0e0] font-medium text-xs"
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
    <div className="relative mx-3 my-1.5 flex items-center">
      <div className="h-px w-full bg-white/[0.03]" />
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
          transition={{ duration: 0.15, ease: 'easeOut' as const }}
          className="overflow-hidden"
        >
          <h3 className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#444444]">
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
    <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/[0.08]">
          <Shield className="h-4 w-4 text-[#00ff88]" strokeWidth={2} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="logo-text"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' as const }}
            className="flex flex-col gap-0 overflow-hidden"
          >
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-semibold tracking-tight text-white">
                Recon
              </span>
              <span className="text-[14px] font-semibold tracking-tight text-[#00ff88]">
                Pro
              </span>
            </div>
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
      className={`flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.03] ${
        collapsed ? 'justify-center px-0' : ''
      }`}
      whileHover={{ y: -0.5 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-[#888888]">
          RP
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-[#0a0a0a] bg-[#00ff88]" />
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="user-info"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.12, ease: 'easeOut' as const }}
            className="flex flex-col overflow-hidden"
          >
            <span className="truncate text-[12px] font-medium text-[#999999]">
              Signed In
            </span>
            <span className="truncate text-[10px] text-[#444444]">
              Dashboard
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
      className="group flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02] text-[#555555] transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-[#999999] focus-visible:outline-none"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <motion.div
        animate={{ rotate: collapsed ? 0 : 180 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }}
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
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }}
      className="relative flex h-screen flex-col bg-[#060608] overflow-hidden"
      style={{
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* ── Logo ── */}
      <LogoSection collapsed={collapsed} />

      {/* Divider after logo */}
      <div className="mx-4 flex items-center">
        <div className="h-px w-full bg-white/[0.04]" />
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
      <div className="flex flex-col gap-2.5 border-t border-white/[0.04] px-3 py-3">
        <UserSection collapsed={collapsed} />
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <CollapseToggle collapsed={collapsed} onToggle={onToggle} />
        </div>
      </div>
    </motion.aside>
  );
}
