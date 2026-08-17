'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Megaphone,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Mail,
  Bell,
  Webhook,
  Terminal,
  Globe,
  Crown,
  Eye,
  Copy,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Zap,
  FileText,
  Hash,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────

type Priority = 'INFO' | 'WARNING' | 'CRITICAL' | 'SOVEREIGN';
type Channel = 'cli' | 'web' | 'email' | 'slack' | 'pagerduty' | 'webhook';
type Scope = 'all' | 'enterprise' | 'government';

interface Broadcast {
  id: string;
  priority: Priority;
  title: string;
  body: string;
  channel: Channel;
  signature: string;
  publicKey: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string;
  verified: boolean;
  targetScope: Scope;
}

interface VerifyResult {
  ok: boolean;
  verified: boolean;
  expired: boolean;
  broadcast: Broadcast | null;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { color: string; bg: string; border: string; label: string; icon: typeof Radio }> = {
  INFO: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'INFO', icon: Radio },
  WARNING: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'WARNING', icon: AlertTriangle },
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'CRITICAL', icon: AlertTriangle },
  SOVEREIGN: { color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'SOVEREIGN', icon: Crown },
};

const CHANNEL_ICONS: Record<Channel, typeof Radio> = {
  cli: Terminal,
  web: Globe,
  email: Mail,
  slack: Hash,
  pagerduty: Bell,
  webhook: Webhook,
};

const CHANNEL_LABELS: Record<Channel, string> = {
  cli: 'CLI',
  web: 'Web',
  email: 'Email',
  slack: 'Slack',
  pagerduty: 'PagerDuty',
  webhook: 'Webhook',
};

const SCOPE_LABELS: Record<Scope, string> = {
  all: 'All Tenants',
  enterprise: 'Enterprise',
  government: 'Government',
};

// ─── Component ────────────────────────────────────────────────────

export function BroadcastCenterPanel() {
  // State
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [activeBroadcasts, setActiveBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterChannel, setFilterChannel] = useState<Channel | ''>('');
  const [verifyId, setVerifyId] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'issue' | 'history' | 'channels' | 'verify' | 'stats'>('issue');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('INFO');
  const [formChannel, setFormChannel] = useState<Channel>('web');
  const [formScope, setFormScope] = useState<Scope>('all');

  const bannerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // ── Data fetching ────────────────────────────────────────────────

  const fetchBroadcasts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterPriority) params.set('priority', filterPriority);
      if (filterChannel) params.set('channel', filterChannel);
      const res = await fetch(`/api/broadcast?${params}`);
      const data = await res.json();
      if (data.ok) setBroadcasts(data.broadcasts);
    } catch { /* silent */ }
  }, [filterPriority, filterChannel]);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch('/api/broadcast/active');
      const data = await res.json();
      if (data.ok) setActiveBroadcasts(data.broadcasts);
    } catch { /* silent */ }
  }, []);

  // Fetch data on mount
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let cancelled = false;
     
    Promise.all([fetchBroadcasts(), fetchActive()]).then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchBroadcasts, fetchActive]);

  // ── Banner auto-scroll ───────────────────────────────────────────

  useEffect(() => {
    const criticalActive = activeBroadcasts.filter(
      (b) => b.priority === 'CRITICAL' || b.priority === 'SOVEREIGN'
    );
    if (criticalActive.length === 0) return;
    bannerRef.current = setInterval(() => {
      setBannerIndex((i) => (i + 1) % criticalActive.length);
    }, 4000);
    return () => clearInterval(bannerRef.current);
  }, [activeBroadcasts]);

  // ── Issue broadcast ──────────────────────────────────────────────

  const handleIssue = async () => {
    if (!confirmIssue) {
      setConfirmIssue(true);
      setTimeout(() => setConfirmIssue(false), 5000);
      return;
    }
    setIssuing(true);
    setConfirmIssue(false);
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: formPriority,
          title: formTitle,
          body: formBody,
          channel: formChannel,
          targetScope: formScope,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFormTitle('');
        setFormBody('');
        setFormPriority('INFO');
        setFormChannel('web');
        setFormScope('all');
        fetchBroadcasts();
        fetchActive();
      }
    } catch { /* silent */ }
    setIssuing(false);
  };

  // ── Verify broadcast ─────────────────────────────────────────────

  const handleVerify = async () => {
    if (!verifyId.trim()) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/broadcast/verify/${verifyId.trim()}`);
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({ ok: false, verified: false, expired: false, broadcast: null, error: 'Network error' });
    }
    setVerifying(false);
  };

  // ── Copy to clipboard ────────────────────────────────────────────

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Quick fill from template ─────────────────────────────────────

  const fillTemplate = (tmpl: { title: string; body: string; priority: Priority; channel: Channel; targetScope: Scope }) => {
    setFormTitle(tmpl.title);
    setFormBody(tmpl.body);
    setFormPriority(tmpl.priority);
    setFormChannel(tmpl.channel);
    setFormScope(tmpl.targetScope);
    setTab('issue');
  };

  // ── Stats computation ────────────────────────────────────────────

  const stats = {
    total: broadcasts.length,
    byPriority: {
      INFO: broadcasts.filter((b) => b.priority === 'INFO').length,
      WARNING: broadcasts.filter((b) => b.priority === 'WARNING').length,
      CRITICAL: broadcasts.filter((b) => b.priority === 'CRITICAL').length,
      SOVEREIGN: broadcasts.filter((b) => b.priority === 'SOVEREIGN').length,
    },
    byChannel: {
      cli: broadcasts.filter((b) => b.channel === 'cli').length,
      web: broadcasts.filter((b) => b.channel === 'web').length,
      email: broadcasts.filter((b) => b.channel === 'email').length,
      slack: broadcasts.filter((b) => b.channel === 'slack').length,
      pagerduty: broadcasts.filter((b) => b.channel === 'pagerduty').length,
      webhook: broadcasts.filter((b) => b.channel === 'webhook').length,
    },
    active: activeBroadcasts.length,
  };

  const criticalActive = activeBroadcasts.filter(
    (b) => b.priority === 'CRITICAL' || b.priority === 'SOVEREIGN'
  );
  const bannerBroadcast = criticalActive[bannerIndex] || activeBroadcasts[0];

  // ── Channel status (simulated) ───────────────────────────────────

  const channelStatus = (ch: Channel) => {
    const count = broadcasts.filter((b) => b.channel === ch).length;
    const lastBc = broadcasts.find((b) => b.channel === ch);
    return { count, lastAt: lastBc?.issuedAt || null, active: count > 0 };
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' as const }}>
          <Radio className="w-8 h-8 text-amber-400" />
        </motion.div>
        <span className="ml-3 text-zinc-400 text-sm">Initializing Echo-Sign Protocol...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ═══ A. ACTIVE BROADCASTS BANNER ═══ */}
      <AnimatePresence>
        {bannerBroadcast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'relative overflow-hidden rounded-lg border p-4',
              bannerBroadcast.priority === 'SOVEREIGN'
                ? 'bg-gradient-to-r from-yellow-900/40 via-amber-900/30 to-yellow-900/40 border-yellow-500/50'
                : 'bg-gradient-to-r from-red-900/40 via-red-800/30 to-red-900/40 border-red-500/50'
            )}
          >
            {criticalActive.length > 1 && (
              <div className="absolute top-2 right-3 text-xs text-zinc-500">
                {bannerIndex + 1}/{criticalActive.length}
              </div>
            )}
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="w-5 h-5 text-amber-400" />
              </motion.div>
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded',
                bannerBroadcast.priority === 'SOVEREIGN' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-400'
              )}>
                {bannerBroadcast.priority}
              </span>
              <span className="text-white font-semibold text-sm truncate flex-1">
                {bannerBroadcast.title}
              </span>
              <span className="text-zinc-400 text-xs hidden sm:block">
                {bannerBroadcast.issuedBy.split('@')[0]}
              </span>
              <span className="text-zinc-500 text-xs">
                {new Date(bannerBroadcast.issuedAt).toLocaleTimeString()}
              </span>
              {bannerBroadcast.verified ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Radio className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Echo-Sign Broadcast Protocol</h2>
          <p className="text-xs text-zinc-500">Global Sovereign Broadcast · Ed25519 Signed Security Bulletins</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">PROTOCOL ACTIVE</span>
          </div>
          {activeBroadcasts.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Megaphone className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-400 font-medium">{activeBroadcasts.length} LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ TAB NAV ═══ */}
      <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
        {([
          ['issue', Megaphone, 'Issue Broadcast'],
          ['history', FileText, 'History'],
          ['channels', Radio, 'Channels'],
          ['verify', Shield, 'Verify'],
          ['stats', Zap, 'Stats'],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all',
              tab === key
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* ─── B. ISSUE BROADCAST ─── */}
          {tab === 'issue' && (
            <div className="space-y-4">
              {/* Template quick-fill */}
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-zinc-300">Quick Templates</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    { label: 'Zero-Day Disclosure', t: { title: '[ZERO-DAY] Critical Vulnerability Disclosure', body: 'A critical zero-day vulnerability has been identified. All tenants should review attack surface and apply emergency mitigations.', priority: 'SOVEREIGN' as Priority, channel: 'web' as Channel, targetScope: 'all' as Scope } },
                    { label: 'Platform Maintenance', t: { title: 'Scheduled Platform Maintenance', body: 'ReconPro will undergo scheduled maintenance. Scans may be queued during the window.', priority: 'INFO' as Priority, channel: 'web' as Channel, targetScope: 'all' as Scope } },
                    { label: 'Emergency Patch', t: { title: '[EMERGENCY PATCH] Immediate Action Required', body: 'Emergency security patch released. All enterprise tenants must update within 24 hours.', priority: 'CRITICAL' as Priority, channel: 'email' as Channel, targetScope: 'enterprise' as Scope } },
                    { label: 'Threat Advisory', t: { title: 'Threat Advisory: Active Campaign', body: 'Active adversarial campaign detected targeting ReconPro tenants. Rotate API keys and enable MFA.', priority: 'WARNING' as Priority, channel: 'slack' as Channel, targetScope: 'all' as Scope } },
                  ].map((tmpl) => (
                    <button
                      key={tmpl.label}
                      onClick={() => fillTemplate(tmpl.t)}
                      className="text-left p-2.5 rounded-md bg-zinc-800/40 border border-zinc-700/30 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
                    >
                      <div className="text-[11px] font-semibold text-zinc-300 group-hover:text-amber-300">{tmpl.label}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-bold', PRIORITY_CONFIG[tmpl.t.priority].bg, PRIORITY_CONFIG[tmpl.t.priority].color)}>{tmpl.t.priority}</span>
                        <span className="text-[9px] text-zinc-600">{CHANNEL_LABELS[tmpl.t.channel]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Title</label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Broadcast title..."
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>
                {/* Body */}
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Body</label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    rows={4}
                    placeholder="Broadcast message body..."
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 resize-none font-mono"
                  />
                </div>
                {/* Priority + Channel + Scope row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Priority */}
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Priority</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                        const cfg = PRIORITY_CONFIG[p];
                        const PIcon = cfg.icon;
                        return (
                          <button
                            key={p}
                            onClick={() => setFormPriority(p)}
                            className={cn(
                              'flex items-center gap-1.5 p-2 rounded-md text-[11px] font-semibold transition-all border',
                              formPriority === p
                                ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                                : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-500 hover:text-zinc-300'
                            )}
                          >
                            <PIcon className="w-3 h-3" />
                            {p === 'SOVEREIGN' && <Crown className="w-3 h-3" />}
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Channel */}
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Channel</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(CHANNEL_LABELS) as Channel[]).map((ch) => {
                        const ChIcon = CHANNEL_ICONS[ch];
                        return (
                          <button
                            key={ch}
                            onClick={() => setFormChannel(ch)}
                            className={cn(
                              'flex items-center gap-1.5 p-2 rounded-md text-[11px] font-semibold transition-all border',
                              formChannel === ch
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-500 hover:text-zinc-300'
                            )}
                          >
                            <ChIcon className="w-3 h-3" />
                            {CHANNEL_LABELS[ch]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Scope */}
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Target Scope</label>
                    <div className="flex flex-col gap-1.5">
                      {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setFormScope(s)}
                          className={cn(
                            'flex items-center gap-1.5 p-2 rounded-md text-[11px] font-semibold transition-all border text-left',
                            formScope === s
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-500 hover:text-zinc-300'
                          )}
                        >
                          {s === 'all' ? <Globe className="w-3 h-3" /> : s === 'enterprise' ? <Shield className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                          {SCOPE_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Issue button */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleIssue}
                    disabled={!formTitle || !formBody || issuing}
                    className={cn(
                      'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all',
                      confirmIssue
                        ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                        : formPriority === 'SOVEREIGN'
                          ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20'
                          : formPriority === 'CRITICAL'
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/10'
                    )}
                  >
                    {issuing ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}>
                        <Send className="w-4 h-4" />
                      </motion.div>
                    ) : confirmIssue ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {issuing ? 'TRANSMITTING...' : confirmIssue ? 'CONFIRM: CLICK AGAIN TO ISSUE' : 'ISSUE BROADCAST'}
                  </button>
                  {formPriority === 'SOVEREIGN' && (
                    <div className="flex items-center gap-1 text-yellow-500/60">
                      <Crown className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Sovereign authority required</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── C. BROADCAST HISTORY ─── */}
          {tab === 'history' && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as Priority | '')}
                  className="bg-zinc-800/50 border border-zinc-700/50 rounded-md px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-amber-500/30"
                >
                  <option value="">All Priorities</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="SOVEREIGN">SOVEREIGN</option>
                </select>
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value as Channel | '')}
                  className="bg-zinc-800/50 border border-zinc-700/50 rounded-md px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-amber-500/30"
                >
                  <option value="">All Channels</option>
                  {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-600 ml-auto">{broadcasts.length} broadcasts</span>
              </div>

              {/* Table */}
              <div className="rounded-lg border border-zinc-800/50 overflow-hidden">
                <div className="divide-y divide-zinc-800/50">
                  {broadcasts.length === 0 && (
                    <div className="p-8 text-center text-zinc-600 text-sm">No broadcasts found</div>
                  )}
                  {broadcasts.map((bc) => {
                    const pCfg = PRIORITY_CONFIG[bc.priority];
                    const PIcon = pCfg.icon;
                    const ChIcon = CHANNEL_ICONS[bc.channel];
                    const isExpired = new Date(bc.expiresAt) < new Date();
                    const expanded = expandedId === bc.id;
                    return (
                      <motion.div
                        key={bc.id}
                        layout
                        className={cn(
                          'transition-colors hover:bg-zinc-800/20',
                          isExpired && 'opacity-50'
                        )}
                      >
                        <button
                          onClick={() => setExpandedId(expanded ? null : bc.id)}
                          className="w-full flex items-center gap-3 p-3 text-left"
                        >
                          <div className="flex-shrink-0">{expanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}</div>
                          <span className="text-[10px] text-zinc-600 w-28 flex-shrink-0 font-mono hidden lg:block">{new Date(bc.issuedAt).toLocaleString()}</span>
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0', pCfg.bg, pCfg.color)}>{bc.priority}</span>
                          {bc.priority === 'SOVEREIGN' && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                          <span className="text-sm text-zinc-200 truncate flex-1 font-medium">{bc.title}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <ChIcon className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] text-zinc-600 hidden sm:inline">{CHANNEL_LABELS[bc.channel]}</span>
                          </div>
                          <span className={cn('text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 hidden md:inline', bc.targetScope === 'government' ? 'bg-purple-500/10 text-purple-400' : bc.targetScope === 'enterprise' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-500')}>{SCOPE_LABELS[bc.targetScope]}</span>
                          <span className="text-[10px] text-zinc-600 flex-shrink-0 hidden xl:inline">{bc.issuedBy.split('@')[0]}</span>
                          {bc.verified ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                        </button>
                        <AnimatePresence>
                          {expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-3 pb-3 pl-10 space-y-2">
                                <div className="bg-zinc-900/50 rounded-md p-3 border border-zinc-800/50">
                                  <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{bc.body}</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                  <div className="flex items-center gap-1.5 text-zinc-500">
                                    <Key className="w-3 h-3" />
                                    <span className="font-mono truncate">PK: {bc.publicKey.substring(0, 16)}...{bc.publicKey.slice(-8)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-zinc-500">
                                    <FileText className="w-3 h-3" />
                                    <span className="font-mono truncate">SIG: {bc.signature.substring(0, 16)}...{bc.signature.slice(-8)}</span>
                                    <button onClick={(e) => { e.stopPropagation(); copyId(bc.signature); }} className="hover:text-amber-400">
                                      {copiedId === bc.signature ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-zinc-500">
                                    <Clock className="w-3 h-3" />
                                    Expires: {new Date(bc.expiresAt).toLocaleString()}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-zinc-500">
                                    <Shield className="w-3 h-3" />
                                    ID: <span className="font-mono text-amber-400/70">{bc.id}</span>
                                    <button onClick={(e) => { e.stopPropagation(); copyId(bc.id); }} className="hover:text-amber-400">
                                      {copiedId === bc.id ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── D. CHANNEL STATUS ─── */}
          {tab === 'channels' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(CHANNEL_LABELS) as Channel[]).map((ch) => {
                const status = channelStatus(ch);
                const ChIcon = CHANNEL_ICONS[ch];
                return (
                  <motion.div
                    key={ch}
                    whileHover={{ scale: 1.01 }}
                    className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded-md', status.active ? 'bg-amber-500/10' : 'bg-zinc-800/50')}>
                          <ChIcon className={cn('w-4 h-4', status.active ? 'text-amber-400' : 'text-zinc-600')} />
                        </div>
                        <span className="text-sm font-semibold text-zinc-200">{CHANNEL_LABELS[ch]}</span>
                      </div>
                      <div className={cn('flex items-center gap-1 text-[10px] font-bold', status.active ? 'text-emerald-400' : 'text-zinc-600')}>
                        <div className={cn('w-1.5 h-1.5 rounded-full', status.active ? 'bg-emerald-400' : 'bg-zinc-700')} />
                        {status.active ? 'ACTIVE' : 'IDLE'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-zinc-600 mb-0.5">Deliveries</div>
                        <div className="text-lg font-bold text-white">{status.count}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-600 mb-0.5">Last Broadcast</div>
                        <div className="text-xs text-zinc-400">
                          {status.lastAt ? new Date(status.lastAt).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ─── E. VERIFICATION TOOL ─── */}
          {tab === 'verify' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-zinc-200">Signature Verification</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      value={verifyId}
                      onChange={(e) => setVerifyId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                      placeholder="Enter broadcast ID (e.g. BC-XXXX-XXXX)..."
                      className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-md pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 font-mono"
                    />
                  </div>
                  <button
                    onClick={handleVerify}
                    disabled={!verifyId.trim() || verifying}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-40 transition-all"
                  >
                    {verifying ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}><Eye className="w-4 h-4" /></motion.div>
                    ) : <Eye className="w-4 h-4" />}
                    VERIFY
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {verifyResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      'rounded-lg border p-4',
                      verifyResult.ok && verifyResult.verified
                        ? 'bg-emerald-900/20 border-emerald-500/30'
                        : 'bg-red-900/20 border-red-500/30'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {verifyResult.ok && verifyResult.verified ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-400">SIGNATURE VERIFIED</span>
                        </>
                      ) : verifyResult.broadcast ? (
                        <>
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-sm font-bold text-red-400">SIGNATURE INVALID — MESSAGE TAMPERED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-sm font-bold text-red-400">BROADCAST NOT FOUND</span>
                        </>
                      )}
                    </div>
                    {verifyResult.broadcast && (
                      <div className="space-y-2 ml-8 text-xs">
                        <div className="flex gap-4">
                          <span className="text-zinc-500">ID:</span>
                          <span className="font-mono text-zinc-300">{verifyResult.broadcast.id}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="text-zinc-500">Title:</span>
                          <span className="text-zinc-300">{verifyResult.broadcast.title}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="text-zinc-500">Issuer:</span>
                          <span className="text-zinc-300">{verifyResult.broadcast.issuedBy}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="text-zinc-500">Issued:</span>
                          <span className="text-zinc-300">{new Date(verifyResult.broadcast.issuedAt).toLocaleString()}</span>
                        </div>
                        {verifyResult.expired && (
                          <div className="flex gap-4 text-amber-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5" />
                            <span>This broadcast has expired</span>
                          </div>
                        )}
                      </div>
                    )}
                    {verifyResult.error && (
                      <p className="text-xs text-red-400 ml-8">{verifyResult.error}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ─── F. BROADCAST STATS ─── */}
          {tab === 'stats' && (
            <div className="space-y-4">
              {/* Top stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
                  <div className="text-[10px] text-zinc-600 mb-1">Total Issued</div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
                  <div className="text-[10px] text-zinc-600 mb-1">Active Now</div>
                  <div className="text-2xl font-bold text-amber-400">{stats.active}</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
                  <div className="text-[10px] text-zinc-600 mb-1">Critical/Sovereign</div>
                  <div className="text-2xl font-bold text-red-400">{stats.byPriority.CRITICAL + stats.byPriority.SOVEREIGN}</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
                  <div className="text-[10px] text-zinc-600 mb-1">Channels Used</div>
                  <div className="text-2xl font-bold text-emerald-400">{Object.values(stats.byChannel).filter((c) => c > 0).length}/6</div>
                </motion.div>
              </div>

              {/* Breakdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* By Priority */}
                <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> By Priority</h3>
                  <div className="space-y-2">
                    {(Object.entries(stats.byPriority) as [Priority, number][]).map(([p, count]) => {
                      const pCfg = PRIORITY_CONFIG[p];
                      const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <span className={cn('text-[10px] font-bold w-16', pCfg.color)}>{p}</span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6 }}
                              className={cn('h-full rounded-full',
                                p === 'INFO' ? 'bg-blue-500' : p === 'WARNING' ? 'bg-amber-500' : p === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500'
                              )}
                            />
                          </div>
                          <span className="text-xs text-zinc-400 w-8 text-right font-mono">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* By Channel */}
                <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
                  <h3 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> By Channel</h3>
                  <div className="space-y-2">
                    {(Object.entries(stats.byChannel) as [Channel, number][]).map(([ch, count]) => {
                      const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                      return (
                        <div key={ch} className="flex items-center gap-3">
                          <span className="text-[10px] font-medium text-zinc-400 w-20 flex items-center gap-1.5">
                            {(() => { const ChI = CHANNEL_ICONS[ch]; return <ChI className="w-3 h-3" />; })()}
                            {CHANNEL_LABELS[ch]}
                          </span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6 }}
                              className="h-full rounded-full bg-amber-500/70"
                            />
                          </div>
                          <span className="text-xs text-zinc-400 w-8 text-right font-mono">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
