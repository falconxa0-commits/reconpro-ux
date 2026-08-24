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
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ChevronDown,
  Plus,
  Crown,
  FileText,
  ScrollText,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useCurrentUser, clearUserCache } from '@/hooks/use-current-user';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  beta?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  cta?: {
    id: string;
    label: string;
    icon: LucideIcon;
  };
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
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Reconnaissance',
    cta: { id: 'scan', label: 'New Scan', icon: Plus },
    items: [
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
      { id: 'trends', label: 'Trends', icon: TrendingUp },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'executive', label: 'Executive Center', icon: Crown },
      { id: 'reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    title: 'Organization',
    items: [
      { id: 'team', label: 'Team', icon: Users },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'integrations', label: 'Integrations', icon: Puzzle },
      { id: 'monitoring', label: 'Monitoring', icon: Activity },
      { id: 'audit-log', label: 'Audit Logs', icon: ScrollText },
      { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

// ─── Animation Variants ─────────────────────────────────────────────────────

const sidebarVariants = {
  expanded: { width: 260 },
  collapsed: { width: 60 },
};

const labelVariants = {
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
  },
  hidden: {
    opacity: 0,
    x: -6,
    transition: { duration: 0.1, ease: [0.4, 0, 1, 1] as const },
  },
};

// ─── Logo Section ────────────────────────────────────────────────────────────

function LogoSection({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={
        'flex items-center gap-3 px-4 pt-6 pb-5 ' + (collapsed ? 'justify-center px-0' : '')
      }
    >
      <div className="group relative flex-shrink-0">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={
            'flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_1px_8px_rgba(255,255,255,0.3)] ' +
            'transition-shadow duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,136,0.25),0_1px_8px_rgba(255,255,255,0.3)]'
          }
        >
          <Shield className="h-[18px] w-[18px] text-black" strokeWidth={2.5} />
        </motion.div>
        {/* Green accent dot */}
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#050505] bg-[#00ff88]" />
      </div>

      <AnimatePresence initial={false} mode="wait">
        {!collapsed && (
          <motion.div
            key="logo-text"
            variants={labelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex items-baseline gap-1 overflow-hidden"
          >
            <span
              className="text-[15px] font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Recon
            </span>
            <span
              className="text-[15px] font-bold tracking-tight text-neutral-600"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Pro
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, collapsed }: { title: string; collapsed: boolean }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {!collapsed && (
        <motion.div
          key={title}
          variants={labelVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="flex items-center gap-2.5 px-4 pt-7 pb-2"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-700 select-none">
            {title}
          </span>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── CTA Button (New Scan) ──────────────────────────────────────────────────

function CtaButton({
  cta,
  collapsed,
  onClick,
}: {
  cta: { id: string; label: string; icon: LucideIcon };
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = cta.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          onClick={onClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={
            'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ' +
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#050505] ' +
            'bg-[#00ff88] text-black hover:bg-[#00e67a] active:bg-[#00cc6a] shadow-[0_0_16px_rgba(0,255,136,0.15)] hover:shadow-[0_0_24px_rgba(0,255,136,0.25)] ' +
            (collapsed ? 'justify-center px-0' : '')
          }
          aria-label={cta.label}
        >
          <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={2.2} />
          <AnimatePresence initial={false} mode="wait">
            {!collapsed && (
              <motion.span
                key="cta-label"
                variants={labelVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex-1 text-left"
              >
                {cta.label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-neutral-800 bg-neutral-900 text-neutral-200 text-xs font-medium shadow-xl"
        >
          {cta.label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

// ─── Nav Item Button ─────────────────────────────────────────────────────────

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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          onClick={onClick}
          whileTap={{ scale: 0.97 }}
          className={
            'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium ' +
            'transition-all duration-200 ease-out ' +
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[#050505] ' +
            (active
              ? 'bg-white text-black shadow-[0_1px_6px_rgba(255,255,255,0.2)] border-l-2 border-l-[#00ff88]'
              : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300 border-l-2 border-l-transparent')
          }
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
        >
          <Icon
            className={
              'h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200 ' +
              (active
                ? 'text-[#00ff88]'
                : 'text-neutral-600 group-hover:text-neutral-400')
            }
            strokeWidth={active ? 2.2 : 1.7}
          />
          <AnimatePresence initial={false} mode="wait">
            {!collapsed && (
              <motion.span
                key={item.id + '-label'}
                variants={labelVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex-1 truncate text-left"
              >
                {item.label}
                {item.beta && (
                  <span className="ml-2 rounded-md bg-neutral-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
                    Beta
                  </span>
                )}
                {item.badge && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00ff88]/15 px-1.5 text-[10px] font-semibold text-[#00ff88]">
                    {item.badge}
                  </span>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-neutral-800 bg-neutral-900 text-neutral-200 text-xs font-medium shadow-xl"
        >
          {item.label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

// ─── Organization Switcher ──────────────────────────────────────────────────

function OrganizationSwitcher({ collapsed }: { collapsed: boolean }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {!collapsed && (
        <motion.div
          key="org-switcher"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-neutral-400 transition-all duration-200 hover:bg-white/[0.04] hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            aria-label="Switch organization"
            onClick={() => { /* placeholder */ }}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06]">
              <Shield className="h-3 w-3 text-neutral-500" strokeWidth={1.8} />
            </div>
            <span className="flex-1 truncate text-left">Falcon Security</span>
            <ChevronDown className="h-3 w-3 text-neutral-600" strokeWidth={2} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── User Section ────────────────────────────────────────────────────────────

function UserSection({ collapsed }: { collapsed: boolean }) {
  const user = useCurrentUser();
  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const initials = user.initials || displayName.slice(0, 2).toUpperCase();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={
            'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-white/[0.04] cursor-default ' +
            (collapsed ? 'justify-center px-0' : '')
          }
          role="status"
          aria-label={`Logged in as ${displayName}`}
        >
          <div className="relative flex-shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-[11px] font-semibold text-neutral-300 ring-1 ring-white/[0.08]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {initials}
            </div>
            {/* Green online indicator dot */}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-[#050505] bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]" />
          </div>

          <AnimatePresence initial={false} mode="wait">
            {!collapsed && (
              <motion.div
                key="user-info"
                variants={labelVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex flex-col overflow-hidden"
              >
                <span className="truncate text-[13px] font-medium text-neutral-200 leading-tight">
                  {displayName}
                </span>
                <span className="truncate text-[11px] text-neutral-600 leading-tight mt-0.5">
                  {user.email || 'No email'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-neutral-800 bg-neutral-900 text-neutral-200 text-xs font-medium shadow-xl"
        >
          {displayName}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

// ─── Sign Out Button ─────────────────────────────────────────────────────────

function SignOutButton({ collapsed }: { collapsed: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
            } catch {}
            clearUserCache();
            window.location.href = '/login';
          }}
          whileTap={{ scale: 0.95 }}
          className={
            'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium ' +
            'text-neutral-600 transition-all duration-200 hover:bg-[#ff3355]/[0.08] hover:text-[#ff3355] ' +
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff3355]/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[#050505] ' +
            (collapsed ? 'justify-center px-0' : '')
          }
          aria-label="Sign out"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200 text-neutral-600 group-hover:text-[#ff3355]" strokeWidth={1.7} />
          <AnimatePresence initial={false} mode="wait">
            {!collapsed && (
              <motion.span
                key="signout-label"
                variants={labelVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex-1 text-left"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-neutral-800 bg-neutral-900 text-neutral-200 text-xs font-medium shadow-xl"
        >
          Sign Out
        </TooltipContent>
      )}
    </Tooltip>
  );
}

// ─── Collapse Toggle ─────────────────────────────────────────────────────────

function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      className={
        'mx-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ' +
        'text-neutral-600 transition-all duration-200 hover:bg-white/[0.06] hover:text-neutral-300 ' +
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20'
      }
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.span
            key="expand"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.8} />
          </motion.span>
        ) : (
          <motion.span
            key="collapse"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.8} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────────────────

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
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }}
      className="panel relative flex h-screen flex-col overflow-hidden border-r border-white/[0.06]"
      style={{ background: '#050505' }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <LogoSection collapsed={collapsed} />

      {/* Divider under logo */}
      <div className="mx-4">
        <div className="h-px bg-white/[0.04]" />
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pt-1 pb-3 scrollbar-none"
        aria-label="Sidebar navigation"
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} role="group" aria-label={section.title}>
            <SectionHeader title={section.title} collapsed={collapsed} />

            {/* CTA button for sections that have one (e.g. Reconnaissance) */}
            {section.cta && (
              <div className="px-1 pb-1.5">
                <CtaButton
                  cta={section.cta}
                  collapsed={collapsed}
                  onClick={() => onViewChange(section.cta!.id)}
                />
              </div>
            )}

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
          </div>
        ))}

        {/* Organization Switcher */}
        <div className="mt-4">
          <div className="mx-1 mb-2">
            <div className="h-px bg-white/[0.04]" />
          </div>
          <div className="px-1">
            <OrganizationSwitcher collapsed={collapsed} />
          </div>
        </div>
      </nav>

      {/* Bottom Section: User + Sign Out + Collapse */}
      <div className="flex flex-col border-t border-white/[0.06]">
        {/* Separator accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="flex flex-col gap-0.5 px-2.5 py-3">
          {/* User */}
          <UserSection collapsed={collapsed} />

          {/* Sign Out */}
          <SignOutButton collapsed={collapsed} />

          {/* Collapse Toggle - centered at very bottom */}
          <div className="mt-1 flex items-center justify-center">
            <CollapseToggle collapsed={collapsed} onToggle={onToggle} />
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
