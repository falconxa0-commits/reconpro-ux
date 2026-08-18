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
  ChevronRight,
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
  beta?: boolean;
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
    title: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
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
      { id: 'trends', label: 'Trends', icon: TrendingUp },
    ],
  },
  {
    title: 'Organization',
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
  expanded: { width: 256 },
  collapsed: { width: 64 },
};

function NavItemButton({ item, active, collapsed, onClick }: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const buttonContent = (
    <motion.button
      onClick={onClick}
      className={
        'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/10 ' +
        (active
          ? 'bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
          : 'text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-200')
      }
      whileTap={{ scale: 0.98 }}
    >
      <Icon
        className={
          'h-4 w-4 flex-shrink-0 transition-colors ' +
          (active ? 'text-black' : 'text-neutral-500 group-hover:text-neutral-300')
        }
        strokeWidth={active ? 2.2 : 1.8}
      />

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 truncate text-left"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {!collapsed && item.beta && (
        <span className="rounded-md bg-[#00ff88]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#00ff88]/80">
          Beta
        </span>
      )}

      {!collapsed && item.badge && (
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">
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
          sideOffset={10}
          className="border-neutral-800 bg-neutral-900 text-neutral-200 text-xs font-medium shadow-xl"
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
    <div className="flex items-center gap-2 px-2.5 pt-5 pb-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-600">
        {title}
      </span>
      <div className="h-px flex-1 bg-neutral-800/60" />
    </div>
  );
}

function LogoSection({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={
        'flex items-center gap-2.5 px-3 pt-4 pb-3 ' +
        (collapsed ? 'justify-center px-0' : '')
      }
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-[0_1px_4px_rgba(255,255,255,0.2)]">
        <Shield className="h-4 w-4 text-black" strokeWidth={2.5} />
      </div>

      {!collapsed && (
        <div className="flex items-baseline gap-1 overflow-hidden">
          <span className="text-[14px] font-bold tracking-tight text-white">
            Recon
          </span>
          <span className="text-[14px] font-bold tracking-tight text-neutral-500">
            Pro
          </span>
          <ChevronRight className="ml-1 h-3 w-3 text-neutral-700" />
        </div>
      )}
    </div>
  );
}

function UserSection({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-white/[0.04] ' +
        (collapsed ? 'justify-center px-0' : '')
      }
    >
      <div className="relative flex-shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-semibold text-neutral-300 ring-1 ring-neutral-700">
          RP
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-[#09090b] bg-emerald-400" />
      </div>

      {!collapsed && (
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-[12px] font-medium text-neutral-300">
            Signed In
          </span>
          <span className="truncate text-[10px] text-neutral-600">
            Dashboard Active
          </span>
        </div>
      )}
    </div>
  );
}

function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-neutral-600 transition-colors duration-150 hover:bg-white/[0.06] hover:text-neutral-400 focus-visible:outline-none"
      whileTap={{ scale: 0.92 }}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-3.5 w-3.5" />
      ) : (
        <PanelLeftClose className="h-3.5 w-3.5" />
      )}
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
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-neutral-600 transition-colors duration-150 hover:bg-white/[0.04] hover:text-neutral-400"
    >
      <LogOut className="h-3 w-3" />
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
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col overflow-hidden border-r border-neutral-800/50"
      style={{ background: '#09090b' }}
    >
      <LogoSection collapsed={collapsed} />

      <div className="mx-3">
        <div className="h-px bg-neutral-800/40" />
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-1 pb-4 scrollbar-none">
        {NAV_SECTIONS.map((section) => (
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
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-neutral-800/50 px-2.5 py-3">
        <UserSection collapsed={collapsed} />
        <div className={"flex items-center " + (collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && <SignOutButton />}
          <CollapseToggle collapsed={collapsed} onToggle={onToggle} />
        </div>
      </div>
    </motion.aside>
  );
}
