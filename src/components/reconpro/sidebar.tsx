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
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

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

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Recon',
    items: [
      { id: 'scan', label: 'New Scan', icon: Radar },
      { id: 'history', label: 'History', icon: History },
      { id: 'surface', label: 'Surface', icon: Globe },
      { id: 'radar', label: 'Findings', icon: Map },
    ],
  },
  {
    title: 'Intel',
    items: [
      { id: 'advisor', label: 'AI Advisor', icon: Brain },
      { id: 'threats', label: 'Threats', icon: AlertTriangle },
      { id: 'trends', label: 'Trends', icon: TrendingUp },
    ],
  },
  {
    title: 'Org',
    items: [
      { id: 'team', label: 'Team', icon: Users },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'integrations', label: 'Integrations', icon: Puzzle },
      { id: 'monitoring', label: 'Monitoring', icon: Activity },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const sidebarVariants = {
  expanded: { width: 260 },
  collapsed: { width: 68 },
};

function getNavButtonClass(active: boolean, collapsed: boolean): string {
  const base = 'group relative flex w-full items-center gap-3 rounded-[10px] px-3 py-[9px] text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10';
  const state = active
    ? 'bg-white/[0.08] text-white'
    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70';
  const collapsedClass = collapsed ? 'justify-center px-0' : '';
  return `${base} ${state} ${collapsedClass}`;
}

function NavItemButton({ item, active, collapsed, onClick }: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const iconClass = `h-[17px] w-[17px] flex-shrink-0 transition-colors duration-150 ${
    active ? 'text-white' : 'text-white/30 group-hover:text-white/50'
  }`;

  const buttonContent = (
    <motion.button
      onClick={onClick}
      className={getNavButtonClass(active, collapsed)}
      whileTap={{ scale: 0.97 }}
    >
      {active && (
        <motion.div
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-white"
          layoutId="sidebar-active-indicator"
          transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
        />
      )}

      <Icon className={iconClass} strokeWidth={active ? 2 : 1.5} />

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' as const }}
            className="truncate flex-1"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {item.badge && !collapsed && (
        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-white/70">
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
          className="border-white/[0.08] bg-[#111] text-white/80 font-medium text-xs"
        >
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}

function SectionHeader({ title, collapsed }: { title: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <h3 className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/20">
      {title}
    </h3>
  );
}

function LogoSection({ collapsed }: { collapsed: boolean }) {
  const logoText = collapsed ? null : (
    <div className="flex items-baseline gap-0.5 overflow-hidden">
      <span className="text-[14px] font-semibold tracking-tight text-white">Recon</span>
      <span className="text-[14px] font-semibold tracking-tight text-white/50">Pro</span>
    </div>
  );

  return (
    <div className={`flex items-center gap-3 px-4 pt-5 pb-4 ${collapsed ? 'justify-center px-0' : ''}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/[0.08] ring-1 ring-white/[0.06]">
        <Shield className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
      {logoText}
    </div>
  );
}

function UserSection({ collapsed }: { collapsed: boolean }) {
  const userInfo = collapsed ? null : (
    <div className="flex flex-col overflow-hidden">
      <span className="truncate text-[12px] font-medium text-white/70">Signed In</span>
      <span className="truncate text-[10px] text-white/25">Dashboard</span>
    </div>
  );

  return (
    <div className={`flex items-center gap-3 rounded-[10px] bg-white/[0.03] px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.05] ${collapsed ? 'justify-center px-0' : ''}`}>
      <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-white/60">
          RP
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-[#0a0a0a] bg-emerald-400" />
      </div>
      {userInfo}
    </div>
  );
}

function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      className="group flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] text-white/25 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white/60 focus-visible:outline-none"
      whileTap={{ scale: 0.9 }}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </motion.button>
  );
}

function SignOutButton() {
  return (
    <button
      onClick={() => {
        localStorage.removeItem('reconpro_api_key');
        localStorage.removeItem('reconpro_auth');
        document.cookie = 'reconpro_session=; path=/; max-age=0';
        window.location.href = '/login';
      }}
      className="flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-[12px] text-white/25 transition-colors duration-150 hover:bg-white/[0.04] hover:text-white/50"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Sign out</span>
    </button>
  );
}

export function EnterpriseSidebar({ activeView, onViewChange, collapsed, onToggle }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }}
      className="relative flex h-screen flex-col overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.05)',
      }}
    >
      <LogoSection collapsed={collapsed} />

      <div className="mx-3 flex items-center">
        <div className="h-px w-full bg-white/[0.05]" />
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-4 scrollbar-none">
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
            {sectionIndex < NAV_SECTIONS.length - 1 && (
              <div className="mx-3 my-2 flex items-center">
                <div className="h-px w-full bg-white/[0.03]" />
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t border-white/[0.05] px-3 py-3">
        <UserSection collapsed={collapsed} />
        <div className={`flex items-center justify-between ${collapsed ? 'justify-center' : ''}`}>
          {collapsed ? null : <SignOutButton />}
          <CollapseToggle collapsed={collapsed} onToggle={onToggle} />
        </div>
      </div>
    </motion.aside>
  );
}
