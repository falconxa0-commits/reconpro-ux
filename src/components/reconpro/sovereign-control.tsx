'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldAlert, Crown, Key, Lock, Unlock, Radio, AlertTriangle,
  Clock, Eye, CheckCircle, XCircle, Zap, Heart, Activity, FileText,
  Hammer, Globe, Server, User, Fingerprint, ChevronDown, Loader2,
  Terminal, Ban, Megaphone, RefreshCw, ScrollText, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { SovereignAction, SovereignActionType } from '@/lib/sovereign-crypto';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface SovereignStatus {
  masterKeyRegistered: boolean;
  lastSovereignAction: SovereignAction | null;
  deadMansSwitchStatus: {
    lastPing: string;
    nextDeadline: string;
    triggered: boolean;
    daysRemaining: number;
  };
  activeLockdowns: number;
  systemIntegrity: {
    status: string;
    lastVerified: string;
    method: string;
  };
}

interface AccessLogEntry {
  endpoint: string;
  method: string;
  ip: string;
  success: boolean;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const ACTION_CONFIG: Record<SovereignActionType, {
  label: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'NORMAL';
  icon: typeof Shield;
  color: string;
  confirmMessage: string;
}> = {
  emergency_lockdown: {
    label: 'Emergency Lockdown',
    description: 'Lock all tenant access immediately',
    severity: 'CRITICAL',
    icon: ShieldAlert,
    color: '#EF4444',
    confirmMessage: 'This will lock ALL tenant access. This is an irreversible emergency action. Proceed?',
  },
  global_broadcast: {
    label: 'Global Broadcast',
    description: 'Send verified message to all dashboards',
    severity: 'HIGH',
    icon: Megaphone,
    color: '#F97316',
    confirmMessage: 'This will broadcast a message to every active dashboard. Proceed?',
  },
  revoke_all_keys: {
    label: 'Revoke All API Keys',
    description: 'Invalidate every API key across all tenants',
    severity: 'CRITICAL',
    icon: KeyRound,
    color: '#EF4444',
    confirmMessage: 'This will permanently revoke ALL API keys across ALL tenants. Proceed?',
  },
  system_maintenance: {
    label: 'System Maintenance',
    description: 'Enter platform maintenance mode',
    severity: 'NORMAL',
    icon: Hammer,
    color: '#FFD700',
    confirmMessage: 'Enter maintenance mode? All users will see a maintenance page.',
  },
  access_grant: {
    label: 'Access Grant',
    description: 'Grant emergency access to a tenant',
    severity: 'NORMAL',
    icon: Unlock,
    color: '#FFD700',
    confirmMessage: 'Grant emergency access? This bypasses normal authorization.',
  },
  dead_man_switch: {
    label: "Dead Man's Switch Ping",
    description: 'Record heartbeat to prevent automatic lockdown',
    severity: 'NORMAL',
    icon: Heart,
    color: '#22C55E',
    confirmMessage: 'Record dead man\'s switch heartbeat now?',
  },
  certification_sign: {
    label: 'Certification Sign',
    description: 'Sign a Genesis Stamp with sovereign master key',
    severity: 'NORMAL',
    icon: ScrollText,
    color: '#FFD700',
    confirmMessage: 'Sign this certification with the sovereign master key?',
  },
  override_tenant: {
    label: 'Tenant Override',
    description: 'Override tenant configuration and access controls',
    severity: 'HIGH',
    icon: User,
    color: '#F97316',
    confirmMessage: 'Override tenant access controls? This is a high-privilege operation.',
  },
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  NORMAL: '#FFD700',
};

const ACTION_TYPE_COLORS: Record<SovereignActionType, string> = {
  emergency_lockdown: '#EF4444',
  global_broadcast: '#F97316',
  override_tenant: '#F97316',
  revoke_all_keys: '#EF4444',
  system_maintenance: '#FFD700',
  access_grant: '#FFD700',
  certification_sign: '#FFD700',
  dead_man_switch: '#22C55E',
};

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatCountdown(nextDeadline: string): { days: number; hours: number; minutes: number; seconds: number } {
  const diff = Math.max(0, new Date(nextDeadline).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export function SovereignControlPanel() {
  // ── State ────────────────────────────────────────────────────────
  const [status, setStatus] = useState<SovereignStatus | null>(null);
  const [actions, setActions] = useState<SovereignAction[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<SovereignActionType | null>(null);
  const [confirmAction, setConfirmAction] = useState<SovereignActionType | null>(null);
  const [flashRed, setFlashRed] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ actionId: string; status: string; result: Record<string, unknown> } | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data Fetching ────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sovereign?view=status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch sovereign status:', e);
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/sovereign?view=audit');
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions);
      }
    } catch (e) {
      console.error('Failed to fetch audit trail:', e);
    }
  }, []);

  const fetchAccessLog = useCallback(async () => {
    try {
      const res = await fetch('/api/sovereign?view=access-log');
      if (res.ok) {
        const data = await res.json();
        setAccessLog(data.entries);
      }
    } catch (e) {
      console.error('Failed to fetch access log:', e);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchAudit(), fetchAccessLog()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStatus, fetchAudit, fetchAccessLog]);

  // ── Countdown Timer ──────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (status?.deadMansSwitchStatus?.nextDeadline) {
        setCountdown(formatCountdown(status.deadMansSwitchStatus.nextDeadline));
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [status?.deadMansSwitchStatus?.nextDeadline]);

  // ── Execute Action ───────────────────────────────────────────────
  const executeAction = async (actionType: SovereignActionType) => {
    setExecuting(actionType);
    try {
      const res = await fetch('/api/sovereign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', actionType }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastResult(data);
        // Red flash for critical actions
        if (ACTION_CONFIG[actionType].severity === 'CRITICAL') {
          setFlashRed(true);
          setTimeout(() => setFlashRed(false), 800);
        }
        // Refresh data
        await Promise.all([fetchStatus(), fetchAudit(), fetchAccessLog()]);
      }
    } catch (e) {
      console.error('Execute error:', e);
    } finally {
      setExecuting(null);
      setConfirmAction(null);
    }
  };

  // ── Ping ─────────────────────────────────────────────────────────
  const handlePing = async () => {
    setExecuting('dead_man_switch');
    try {
      await fetch('/api/sovereign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping' }),
      });
      await Promise.all([fetchStatus(), fetchAudit()]);
    } catch (e) {
      console.error('Ping error:', e);
    } finally {
      setExecuting(null);
    }
  };

  // ── Loading State ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#FFD700' }} />
          <p className="text-zinc-500 text-sm">Initializing Sovereign Control…</p>
        </div>
      </div>
    );
  }

  const systemStatus = status?.activeLockdowns && status.activeLockdowns > 0 ? 'LOCKDOWN' : 'ONLINE';
  const integrityOk = status?.systemIntegrity?.status === 'ALL_CLEAR';

  return (
    <div className="relative min-h-screen" style={{ background: '#030303' }}>
      {/* Red flash overlay */}
      <AnimatePresence>
        {flashRed && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.3) 0%, rgba(0,0,0,0) 70%)' }}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ═══════════════════════════════════════════════════════════
            A. SOVEREIGN STATUS — Hero Section
            ═══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl p-8 border"
          style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
            borderColor: 'rgba(255,215,0,0.15)',
          }}
        >
          {/* Gold glow behind shield */}
          <div className="absolute top-6 left-8 w-24 h-24 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
          />

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Shield Icon */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="relative"
            >
              <Shield className="h-16 w-16" style={{ color: '#FFD700', filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' }} />
              {/* Pulsing dot */}
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500"
                style={{ animation: 'pulse 2s infinite', boxShadow: '0 0 12px rgba(34,197,94,0.8)' }}
              />
            </motion.div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="h-5 w-5" style={{ color: '#FFD700' }} />
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#FFD700' }}>
                  SOVEREIGN CONTROL
                </h1>
                <Badge variant="outline" className="text-xs font-mono"
                  style={{ borderColor: 'rgba(255,215,0,0.3)', color: '#FFD700' }}>
                  FOUNDER ONLY
                </Badge>
              </div>
              <p className="text-zinc-500 text-sm mb-4">Cryptographic authority system — platform master key control</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* System Status */}
                <div className="flex items-center gap-3 rounded-lg p-3 border" style={{ background: '#080808', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <Activity className="h-5 w-5" style={{ color: systemStatus === 'LOCKDOWN' ? '#EF4444' : '#22C55E' }} />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">System</p>
                    <p className="text-sm font-bold" style={{ color: systemStatus === 'LOCKDOWN' ? '#EF4444' : '#22C55E' }}>
                      {systemStatus}
                    </p>
                  </div>
                </div>

                {/* Master Key */}
                <div className="flex items-center gap-3 rounded-lg p-3 border" style={{ background: '#080808', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <Key className="h-5 w-5" style={{ color: status?.masterKeyRegistered ? '#FFD700' : '#EF4444' }} />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Master Key</p>
                    <p className="text-sm font-bold" style={{ color: status?.masterKeyRegistered ? '#FFD700' : '#EF4444' }}>
                      {status?.masterKeyRegistered ? 'REGISTERED' : 'NOT REGISTERED'}
                    </p>
                  </div>
                </div>

                {/* Last Action */}
                <div className="flex items-center gap-3 rounded-lg p-3 border" style={{ background: '#080808', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <Clock className="h-5 w-5" style={{ color: '#FFD700' }} />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Last Action</p>
                    <p className="text-sm text-zinc-300">
                      {status?.lastSovereignAction
                        ? formatTimestamp(status.lastSovereignAction.executedAt)
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            B. EXECUTE ACTIONS — Action Grid
            ═══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5" style={{ color: '#FFD700' }} />
            <h2 className="text-lg font-bold text-zinc-200 tracking-tight">EXECUTE ACTIONS</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(['emergency_lockdown', 'global_broadcast', 'revoke_all_keys', 'system_maintenance', 'access_grant', 'dead_man_switch', 'certification_sign', 'override_tenant'] as SovereignActionType[]).map(
              (actionType) => {
                const cfg = ACTION_CONFIG[actionType];
                const Icon = cfg.icon;
                const isExec = executing === actionType;

                return (
                  <motion.button
                    key={actionType}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => actionType === 'dead_man_switch' ? handlePing() : setConfirmAction(actionType)}
                    disabled={isExec}
                    className="relative group text-left rounded-xl p-5 border transition-all"
                    style={{
                      background: 'linear-gradient(145deg, #0a0a0a 0%, #0f0f0f 100%)',
                      borderColor: `${cfg.color}22`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}55`;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${cfg.color}15`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}22`;
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* Severity strip */}
                    <div className="absolute top-0 left-4 right-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}66, transparent)` }} />

                    <div className="flex items-start gap-3">
                      <div className="rounded-lg p-2.5" style={{ background: `${cfg.color}15` }}>
                        <Icon className="h-5 w-5" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-zinc-200 truncate">{cfg.label}</p>
                          <Badge
                            className="text-[10px] px-1.5 py-0 font-bold"
                            style={{
                              background: `${SEVERITY_COLORS[cfg.severity]}20`,
                              color: SEVERITY_COLORS[cfg.severity],
                              border: `1px solid ${SEVERITY_COLORS[cfg.severity]}33`,
                            }}
                          >
                            {cfg.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">{cfg.description}</p>
                      </div>
                    </div>

                    {isExec && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.7)' }}>
                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: cfg.color }} />
                      </div>
                    )}
                  </motion.button>
                );
              }
            )}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            C. AUDIT TRAIL
            ═══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: '#080808', borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2 p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <FileText className="h-5 w-5" style={{ color: '#FFD700' }} />
            <h2 className="text-lg font-bold text-zinc-200 tracking-tight">AUDIT TRAIL</h2>
            <Badge variant="outline" className="ml-auto text-xs font-mono" style={{ borderColor: 'rgba(255,215,0,0.3)', color: '#FFD700' }}>
              {actions.length} actions
            </Badge>
          </div>

          <ScrollArea className="max-h-[500px]">
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
              {actions.length === 0 && (
                <div className="p-8 text-center text-zinc-600 text-sm">No sovereign actions recorded</div>
              )}
              {actions.map((a) => {
                const isExpanded = expandedRow === a.actionId;
                const actionColor = ACTION_TYPE_COLORS[a.actionType] ?? '#FFD700';
                const cfg = ACTION_CONFIG[a.actionType];

                return (
                  <div key={a.actionId} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : a.actionId)}
                      className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full" style={{ background: actionColor }} />
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                          <p className="text-xs text-zinc-500 font-mono">
                            {formatTimestamp(a.executedAt)}
                          </p>
                          <Badge
                            className="text-[10px] px-2 py-0.5 w-fit font-semibold"
                            style={{
                              background: `${actionColor}18`,
                              color: actionColor,
                              border: `1px solid ${actionColor}33`,
                            }}
                          >
                            {cfg?.label ?? a.actionType}
                          </Badge>
                          <p className="text-xs text-zinc-400 truncate font-mono">
                            {a.targetScope}
                          </p>
                          <p className="text-xs text-zinc-500 font-mono">{a.executedBy}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-zinc-600 font-mono">{a.ipAddress}</p>
                            {a.verified ? (
                              <CheckCircle className="h-3.5 w-3.5" style={{ color: '#22C55E' }} />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" style={{ color: '#EF4444' }} />
                            )}
                            <ChevronDown className={`h-3.5 w-3.5 text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 ml-6">
                            <div className="rounded-lg p-4 border font-mono text-xs" style={{ background: '#050505', borderColor: 'rgba(255,255,255,0.05)' }}>
                              <p className="text-zinc-500 mb-1">Action ID: <span className="text-zinc-300">{a.actionId}</span></p>
                              <p className="text-zinc-500 mb-1">Signature: <span className="text-zinc-400 break-all">{a.signature}</span></p>
                              <p className="text-zinc-500 mb-1">Public Key: <span className="text-zinc-400 break-all">{a.publicKey}</span></p>
                              <p className="text-zinc-500">Payload:</p>
                              <pre className="text-zinc-400 mt-1 whitespace-pre-wrap break-all" style={{ fontSize: '11px' }}>
                                {JSON.stringify(a.payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            D. DEAD MAN'S SWITCH PANEL
            ═══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: '#080808', borderColor: status?.deadMansSwitchStatus?.triggered ? 'rgba(239,68,68,0.3)' : 'rgba(255,215,0,0.1)' }}
        >
          <div className="flex items-center gap-2 p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <Heart className="h-5 w-5" style={{ color: status?.deadMansSwitchStatus?.triggered ? '#EF4444' : '#22C55E' }} />
            <h2 className="text-lg font-bold text-zinc-200 tracking-tight">DEAD MAN&apos;S SWITCH</h2>
            {status?.deadMansSwitchStatus?.triggered && (
              <Badge className="text-xs font-bold" style={{ background: '#EF444420', color: '#EF4444', border: '1px solid #EF444433' }}>
                TRIGGERED
              </Badge>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Countdown Display */}
            <div className="flex items-center justify-center gap-4 py-4">
              {(
                [
                  { label: 'DAYS', value: countdown.days },
                  { label: 'HRS', value: countdown.hours },
                  { label: 'MIN', value: countdown.minutes },
                  { label: 'SEC', value: countdown.seconds },
                ] as const
              ).map((unit, i) => (
                <div key={unit.label} className="text-center">
                  <div
                    className="text-3xl font-bold font-mono tabular-nums"
                    style={{
                      color: unit.value <= 1 && unit.label === 'DAYS' ? '#EF4444' : '#FFD700',
                      textShadow: '0 0 20px rgba(255,215,0,0.3)',
                    }}
                  >
                    {String(unit.value).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 tracking-widest">{unit.label}</div>
                  {i < 3 && <span className="text-zinc-700 text-xl font-light -mx-1">:</span>}
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Time remaining</span>
                <span>{status?.deadMansSwitchStatus?.daysRemaining.toFixed(1) ?? '?'} days</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#111' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, #22C55E, ${status?.deadMansSwitchStatus?.daysRemaining && status.deadMansSwitchStatus.daysRemaining < 7 ? '#EF4444' : '#FFD700'})`,
                  }}
                  initial={{ width: '100%' }}
                  animate={{
                    width: `${Math.max(0, ((status?.deadMansSwitchStatus?.daysRemaining ?? 30) / 30) * 100)}%`,
                  }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>

            {/* Info Row */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-600 text-xs mb-1">Last Ping</p>
                <p className="text-zinc-300 font-mono">
                  {status?.deadMansSwitchStatus?.lastPing
                    ? formatTimestamp(status.deadMansSwitchStatus.lastPing)
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs mb-1">Next Deadline</p>
                <p className="text-zinc-300 font-mono">
                  {status?.deadMansSwitchStatus?.nextDeadline
                    ? formatTimestamp(status.deadMansSwitchStatus.nextDeadline)
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 rounded-lg p-3 border" style={{ background: '#0f0a0a', borderColor: 'rgba(239,68,68,0.15)' }}>
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
              <p className="text-xs text-zinc-500 leading-relaxed">
                If no ping is received within <span className="text-zinc-300 font-semibold">30 days</span>, an automatic emergency lockdown will trigger across all tenants.
              </p>
            </div>

            {/* Ping Button */}
            <Button
              onClick={handlePing}
              disabled={executing === 'dead_man_switch'}
              className="w-full h-12 text-sm font-bold tracking-wider rounded-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, #166534 0%, #22C55E 100%)',
                color: '#fff',
                boxShadow: '0 0 30px rgba(34,197,94,0.2)',
              }}
            >
              {executing === 'dead_man_switch' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Heart className="h-4 w-4 mr-2" />
              )}
              PING NOW
            </Button>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            E. INTEGRITY VERIFICATION
            ═══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: '#080808', borderColor: integrityOk ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.3)' }}
        >
          <div className="flex items-center gap-2 p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <Fingerprint className="h-5 w-5" style={{ color: integrityOk ? '#22C55E' : '#EF4444' }} />
            <h2 className="text-lg font-bold text-zinc-200 tracking-tight">INTEGRITY VERIFICATION</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2" style={{ background: integrityOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                {integrityOk ? (
                  <CheckCircle className="h-6 w-6" style={{ color: '#22C55E' }} />
                ) : (
                  <XCircle className="h-6 w-6" style={{ color: '#EF4444' }} />
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Status</p>
                <p className="text-sm font-bold" style={{ color: integrityOk ? '#22C55E' : '#EF4444' }}>
                  {status?.systemIntegrity?.status ?? 'UNKNOWN'}
                </p>
              </div>
            </div>

            {/* Last Verified */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Last Verified</p>
              <p className="text-sm text-zinc-300 font-mono">
                {status?.systemIntegrity?.lastVerified
                  ? formatTimestamp(status.systemIntegrity.lastVerified)
                  : 'Never'}
              </p>
            </div>

            {/* Method */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Verification Method</p>
              <p className="text-sm text-zinc-300 font-mono">
                {status?.systemIntegrity?.method ?? 'N/A'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            F. ACCESS LOG
            ═══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: '#080808', borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2 p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <Eye className="h-5 w-5" style={{ color: '#FFD700' }} />
            <h2 className="text-lg font-bold text-zinc-200 tracking-tight">ACCESS LOG</h2>
            <Badge variant="outline" className="ml-auto text-xs font-mono" style={{ borderColor: 'rgba(255,215,0,0.3)', color: '#FFD700' }}>
              {accessLog.length} entries
            </Badge>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
              {accessLog.length === 0 && (
                <div className="p-8 text-center text-zinc-600 text-sm">No access attempts recorded</div>
              )}
              {accessLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <Badge
                    className="text-[10px] px-1.5 py-0 font-mono font-bold w-12 justify-center"
                    style={{
                      background: entry.method === 'GET' ? 'rgba(34,197,94,0.1)' : 'rgba(255,215,0,0.1)',
                      color: entry.method === 'GET' ? '#22C55E' : '#FFD700',
                      border: `1px solid ${entry.method === 'GET' ? 'rgba(34,197,94,0.2)' : 'rgba(255,215,0,0.2)'}`,
                    }}
                  >
                    {entry.method}
                  </Badge>
                  <p className="text-xs text-zinc-400 font-mono flex-1 truncate">{entry.endpoint}</p>
                  <p className="text-xs text-zinc-600 font-mono">{entry.ip}</p>
                  <p className="text-xs text-zinc-600 font-mono w-40 text-right">{formatTimestamp(entry.timestamp)}</p>
                  {entry.success ? (
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#22C55E' }} />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#EF4444' }} />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Last Result Toast */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 right-6 z-40 rounded-xl border p-4 max-w-md"
              style={{
                background: 'linear-gradient(135deg, #0a0a0a, #111)',
                borderColor: 'rgba(255,215,0,0.3)',
                boxShadow: '0 0 40px rgba(255,215,0,0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 font-mono">{lastResult.actionId}</p>
                <button onClick={() => setLastResult(null)} className="text-zinc-600 hover:text-zinc-400">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#FFD700' }}>
                {lastResult.status.toUpperCase()}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {String((lastResult.result as Record<string, unknown>)?.message ?? 'Action completed')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Confirmation Dialog
          ═══════════════════════════════════════════════════════════ */}
      <Dialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="rounded-xl border" style={{
          background: '#0a0a0a',
          borderColor: confirmAction ? `${ACTION_CONFIG[confirmAction].color}44` : 'rgba(255,255,255,0.1)',
        }}>
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              {confirmAction && (() => {
                const Icon = ACTION_CONFIG[confirmAction].icon;
                return <Icon className="h-5 w-5" style={{ color: ACTION_CONFIG[confirmAction].color }} />;
              })()}
              Confirm: {confirmAction ? ACTION_CONFIG[confirmAction].label : ''}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {confirmAction ? ACTION_CONFIG[confirmAction].confirmMessage : ''}
            </DialogDescription>
          </DialogHeader>
          {confirmAction && ACTION_CONFIG[confirmAction].severity === 'CRITICAL' && (
            <div className="flex items-start gap-2 rounded-lg p-3 border" style={{ background: '#0f0505', borderColor: 'rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
              <p className="text-xs text-red-400 leading-relaxed">
                This is a <span className="font-bold">CRITICAL</span> operation. It will affect all tenants and cannot be easily reversed.
              </p>
            </div>
          )}
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              className="rounded-lg"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#666666' }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmAction && executeAction(confirmAction)}
              className="rounded-lg font-semibold"
              style={{
                background: confirmAction ? ACTION_CONFIG[confirmAction].color : '#FFD700',
                color: confirmAction && ACTION_CONFIG[confirmAction].severity === 'CRITICAL' ? '#fff' : '#000',
              }}
            >
              EXECUTE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
