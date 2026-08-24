'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Activity, RotateCcw, Play,
  Zap, Eye, Radio, Cloud, Github, CheckCircle, XCircle, Clock, ChevronDown,
  Loader2, Trash2, Search, RefreshCw, FileText, BarChart3, ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ───────────────────────────────────────────────────

interface NHIIdentity {
  id: string;
  identityType: string;
  identifier: string;
  displayName: string | null;
  cloudProvider: string;
  permissions: string;
  lastRotated: string | null;
  status: string;
  riskLevel: string;
  blastRadius: number;
  createdAt: string;
  _count?: { revocations: number };
}

interface NHIAuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  timestamp: string;
  revocation?: { id: string; identifier: string; cloudProvider: string } | null;
}

interface NHIStats {
  total: number;
  active: number;
  suspect: number;
  revoked: number;
  critical: number;
  totalBlastRadius: { _sum: { blastRadius: number | null } } | null;
  revoked24h: number;
}

interface ImpactAssessment {
  assessment: { id: string; scope: string; status: string };
  summary: {
    affectedIdentities: number;
    affectedResources: number;
    riskBefore: number;
    riskAfter: number;
    riskReduction: number;
    scope: string;
  };
}

// ─── Constants ───────────────────────────────────────────────

const CLOUD_ICONS: Record<string, typeof Cloud> = {
  aws: Cloud,
  gcp: Radio,
  azure: Activity,
  github: Github,
};

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-[#ff3355]/15', text: 'text-[#ff3355]', border: 'border-[#ff3355]/30' },
  high: { bg: 'bg-[#ff8844]/15', text: 'text-[#ff8844]', border: 'border-[#ff8844]/30' },
  normal: { bg: 'bg-[#00ff88]/15', text: 'text-[#00ff88]', border: 'border-[#00ff88]/30' },
  low: { bg: 'bg-[#6b7280]/15', text: 'text-[#6b7280]', border: 'border-[#6b7280]/30' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-[#00ff88]/15', text: 'text-[#00ff88]', border: 'border-[#00ff88]/30' },
  revoked: { bg: 'bg-[#ff3355]/15', text: 'text-[#ff3355]', border: 'border-[#ff3355]/30' },
  expired: { bg: 'bg-[#ffaa00]/15', text: 'text-[#ffaa00]', border: 'border-[#ffaa00]/30' },
  suspect: { bg: 'bg-[#ff8844]/15', text: 'text-[#ff8844]', border: 'border-[#ff8844]/30' },
};

const ACTION_COLORS: Record<string, string> = {
  identity_scan: 'text-[#44aaff]',
  revocation_started: 'text-[#ffaa00]',
  revocation_completed: 'text-[#ff3355]',
  rollback_started: 'text-[#a78bfa]',
  rollback_completed: 'text-[#00ff88]',
};

// ─── Component ───────────────────────────────────────────────

export function NHIKillSwitch() {
  const [identities, setIdentities] = useState<NHIIdentity[]>([]);
  const [stats, setStats] = useState<NHIStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<NHIAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmText, setConfirmText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeProgress, setRevokeProgress] = useState(0);
  const [revokeMessage, setRevokeMessage] = useState('');
  const [revocationCount, setRevocationCount] = useState(0);
  const [assessment, setAssessment] = useState<ImpactAssessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [filterCloud, setFilterCloud] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailIdentity, setDetailIdentity] = useState<NHIIdentity | null>(null);

  const isKillReady = confirmText === 'CONFIRM';
  const hasSelection = selectedIds.size > 0;

  // Derive system status
  const systemStatus = stats
    ? stats.suspect > 0
      ? 'red' as const
      : stats.critical > 0
        ? 'yellow' as const
        : 'green' as const
    : 'green' as const;

  const statusLabel = { green: 'ALL CLEAR', yellow: 'THREATS DETECTED', red: 'BREACH ACTIVE' };
  const statusColor = { green: '#00ff88', yellow: '#ffaa00', red: '#ff3355' };

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterCloud !== 'all') params.set('cloud', filterCloud);

      const res = await fetch(`/api/nhi?${params.toString()}`);
      const data = await res.json();
      setIdentities(data.identities || []);
      setStats(data.stats || null);
    } catch { /* silent */ }
  }, [filterStatus, filterCloud]);

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/nhi/audit?limit=50');
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchData(), fetchAudit()]);
      setLoading(false);
    };
    load();
  }, [fetchData, fetchAudit]);

  // Auto-select suspect identities
  useEffect(() => {
    if (!identities.length) return;
    const suspectIds = identities
      .filter((i) => i.status === 'suspect' || i.status === 'active')
      .filter((i) => i.riskLevel === 'critical' || i.riskLevel === 'high')
      .map((i) => i.id);
    // Don't auto-select, but track suspect count for kill switch
  }, [identities]);

  // ─── Handlers ───────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredIdentities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIdentities.map((i) => i.id)));
    }
  };

  const handleRevoke = async () => {
    setShowModal(false);
    setRevoking(true);
    setRevokeProgress(0);

    const idsToRevoke = hasSelection
      ? Array.from(selectedIds)
      : identities.filter((i) => i.status === 'suspect').map((i) => i.id);

    setRevocationCount(idsToRevoke.length);
    const cloudSet = new Set(identities.filter((i) => idsToRevoke.includes(i.id)).map((i) => i.cloudProvider));
    setRevokeMessage(`Revoking ${idsToRevoke.length} identities across ${cloudSet.size} cloud${cloudSet.size > 1 ? 's' : ''}...`);

    // Simulate progress animation
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 80));
      setRevokeProgress(i);
    }

    try {
      const res = await fetch('/api/nhi/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityIds: idsToRevoke, reason: 'breach_detected', revokedBy: 'alex.chen' }),
      });
      const data = await res.json();
      setRevokeMessage(`Revoked ${data.revoked} identities. ${data.failed} failed.`);
    } catch {
      setRevokeMessage('Revocation failed. Check logs for details.');
    }

    setRevoking(false);
    setSelectedIds(new Set());
    setConfirmText('');
    await Promise.all([fetchData(), fetchAudit()]);
  };

  const handleAssess = async () => {
    setAssessing(true);
    const ids = hasSelection ? Array.from(selectedIds) : identities.filter((i) => i.riskLevel === 'critical').map((i) => i.id);
    if (!ids.length) { setAssessing(false); return; }

    const clouds = [...new Set(identities.filter((i) => ids.includes(i.id)).map((i) => i.cloudProvider))];
    const scope = clouds.length > 1 ? 'multi_cloud' : 'single';

    try {
      const res = await fetch('/api/nhi/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityIds: ids, scope }),
      });
      const data = await res.json();
      setAssessment(data);
    } catch { /* silent */ }
    setAssessing(false);
  };

  const handleRollback = async (revId: string) => {
    try {
      await fetch('/api/nhi/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revocationIds: [revId] }),
      });
      await Promise.all([fetchData(), fetchAudit()]);
    } catch { /* silent */ }
  };

  const handleSeed = async () => {
    setLoading(true);
    await fetch('/api/nhi/seed', { method: 'POST' });
    await Promise.all([fetchData(), fetchAudit()]);
    setLoading(false);
  };

  // ─── Filtered Identities ────────────────────────────────────

  const filteredIdentities = identities.filter((i) => {
    if (searchQuery && !i.identifier.toLowerCase().includes(searchQuery.toLowerCase()) && !(i.displayName || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // ─── Recent Revocations (last 5) ────────────────────────────

  const recentRevocations = auditLogs
    .filter((l) => l.action === 'revocation_completed')
    .slice(0, 5);

  // ─── Render ─────────────────────────────────────────────────

  const totalBlast = stats?.totalBlastRadius?._sum?.blastRadius || 0;

  return (
    <div className="space-y-4">
      {/* ─── Top Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div
              animate={{
                boxShadow: systemStatus === 'red'
                  ? ['0 0 20px rgba(239,68,68,0.3)', '0 0 40px rgba(239,68,68,0.5)', '0 0 20px rgba(239,68,68,0.3)']
                  : systemStatus === 'yellow'
                    ? ['0 0 15px rgba(250,204,21,0.2)', '0 0 30px rgba(250,204,21,0.4)', '0 0 15px rgba(250,204,21,0.2)']
                    : ['0 0 12px rgba(52,211,153,0.2)', '0 0 24px rgba(52,211,153,0.3)', '0 0 12px rgba(52,211,153,0.2)'],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.06)]"
            >
              <ShieldAlert className="h-5 w-5" style={{ color: statusColor[systemStatus] }} />
            </motion.div>
            <motion.div
              className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full"
              style={{ backgroundColor: statusColor[systemStatus] }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#f0f0f0] tracking-tight">NHI KILL SWITCH</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-semibold" style={{ color: statusColor[systemStatus] }}>
                {statusLabel[systemStatus]}
              </span>
              {stats && (
                <span className="text-[10px] text-muted-foreground">
                  {stats.total} identities tracked
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSeed} className="text-muted-foreground hover:text-[#f0f0f0] h-8 text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Seed Data
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { fetchData(); fetchAudit(); }} className="text-muted-foreground hover:text-[#f0f0f0] h-8 text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── Stats Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Identities', value: stats?.total ?? 0, icon: ShieldCheck, color: '#f0f0f0' },
          { label: 'Active Threats', value: stats?.suspect ?? 0, icon: AlertTriangle, color: '#ff8844' },
          { label: 'Revoked (24h)', value: stats?.revoked24h ?? 0, icon: XCircle, color: '#ff3355' },
          { label: 'Blast Radius', value: totalBlast, icon: Zap, color: '#ffaa00' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color, opacity: 0.5 }} />
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value.toLocaleString()}</div>
          </motion.div>
        ))}
      </div>

      {/* ─── Main Content: Two Columns ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ─── LEFT: Identity Table (2 cols) ─────────────────── */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)] flex flex-col">
          {/* Table Header */}
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#f0f0f0]">Machine Identities</h3>
                <Badge variant="outline" className="h-5 text-[10px] border-[rgba(255,255,255,0.1)] text-muted-foreground">
                  {filteredIdentities.length}
                </Badge>
                {selectedIds.size > 0 && (
                  <Badge variant="outline" className="h-5 text-[10px] border-[#ff3355]/30 text-[#ff3355]">
                    {selectedIds.size} selected
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search identities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.06)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterCloud}
                  onChange={(e) => setFilterCloud(e.target.value)}
                  className="h-8 text-xs px-2 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] text-muted-foreground focus:outline-none focus:border-[rgba(52,211,153,0.2)]"
                >
                  <option value="all">All Clouds</option>
                  <option value="aws">AWS</option>
                  <option value="gcp">GCP</option>
                  <option value="azure">Azure</option>
                  <option value="github">GitHub</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-8 text-xs px-2 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] text-muted-foreground focus:outline-none focus:border-[rgba(52,211,153,0.2)]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspect">Suspect</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
            ) : filteredIdentities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No identities found</p>
                <p className="text-xs text-muted-foreground/60">Click &quot;Seed Data&quot; to load sample identities</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#050710]">
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        checked={selectedIds.size === filteredIdentities.length && filteredIdentities.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="h-3.5 w-3.5"
                      />
                    </th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Type</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Identifier</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5 hidden lg:table-cell">Cloud</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Risk</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5 hidden md:table-cell">Blast</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                    <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIdentities.map((identity, i) => {
                    const rc = RISK_COLORS[identity.riskLevel] || RISK_COLORS.normal;
                    const sc = STATUS_COLORS[identity.status] || STATUS_COLORS.active;
                    const CloudIcon = CLOUD_ICONS[identity.cloudProvider] || Cloud;
                    const isSelected = selectedIds.has(identity.id);

                    return (
                      <motion.tr
                        key={identity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        className={`border-b border-[rgba(255,255,255,0.03)] transition-colors hover:bg-[rgba(255,255,255,0.02)] ${isSelected ? 'bg-[rgba(52,211,153,0.04)]' : ''}`}
                      >
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(identity.id)}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {identity.identityType.replace(/_/g, ' ').replace(/(aws|gcp|azure|github)/i, '').trim() || identity.identityType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="max-w-[200px] lg:max-w-[280px]">
                            <div className="text-[11px] font-mono text-[#f0f0f0] truncate" title={identity.identifier}>
                              {identity.displayName || identity.identifier}
                            </div>
                            <div className="text-[10px] text-muted-foreground/60 font-mono truncate mt-0.5">
                              {identity.identifier.length > 40 ? identity.identifier.slice(0, 40) + '...' : identity.identifier}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <CloudIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground uppercase">{identity.cloudProvider}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rc.bg} ${rc.text} ${rc.border} font-semibold`}>
                            {identity.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className="text-[11px] font-mono text-[#f0f0f0]">
                            {identity.blastRadius.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border} font-semibold`}>
                            {identity.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailIdentity(identity)}
                              className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-muted-foreground hover:text-[#f0f0f0] transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {identity.status === 'active' || identity.status === 'suspect' ? (
                              <button
                                onClick={() => {
                                  setSelectedIds(new Set([identity.id]));
                                  setShowModal(true);
                                }}
                                className="p-1.5 rounded-md hover:bg-[#ff3355]/10 text-muted-foreground hover:text-[#ff3355] transition-colors"
                                title="Revoke"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Control Panel ──────────────────────────── */}
        <div className="space-y-4">

          {/* Emergency Revocation */}
          <div className="rounded-xl border-2 border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-[#ff3355]" />
              <h3 className="text-sm font-bold text-[#ff3355] uppercase tracking-wider">Emergency Revocation</h3>
            </div>

            {/* Kill Switch Button */}
            <motion.button
              onClick={() => {
                if (isKillReady) setShowModal(true);
              }}
              disabled={!isKillReady || revoking}
              animate={isKillReady && !revoking ? {
                boxShadow: [
                  '0 0 20px rgba(239,68,68,0.3)',
                  '0 0 40px rgba(239,68,68,0.6)',
                  '0 0 20px rgba(239,68,68,0.3)',
                ],
              } : {}}
              transition={isKillReady ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const } : {}}
              className={`w-full py-4 rounded-xl font-bold text-sm tracking-wider transition-all ${
                isKillReady
                  ? 'bg-[#ff3355] text-white hover:bg-[#dc2626] cursor-pointer'
                  : revoking
                    ? 'bg-[#ff3355]/80 text-white cursor-wait'
                    : 'bg-[rgba(255,255,255,0.06)] text-muted-foreground cursor-not-allowed'
              }`}
            >
              {revoking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> REVOKING...
                </span>
              ) : (
                'KILL SWITCH'
              )}
            </motion.button>

            {/* Revocation Progress */}
            <AnimatePresence>
              {revoking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  <Progress value={revokeProgress} className="h-2 bg-[rgba(255,255,255,0.06)]" />
                  <p className="text-[11px] text-[#ff3355] font-mono text-center">{revokeMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirmation Gate */}
            <div className="mt-4">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Type <span className="text-[#ff3355] font-bold">CONFIRM</span> to activate kill switch
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRM"
                className={`h-9 text-xs font-mono bg-[rgba(0,0,0,0.4)] border-[rgba(255,255,255,0.06)] ${
                  isKillReady ? 'border-[#ff3355]/50 text-[#ff3355]' : ''
                }`}
              />
              <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                {hasSelection
                  ? `${selectedIds.size} identities selected for revocation`
                  : `${stats?.suspect ?? 0} suspect identities will be revoked`}
              </p>
            </div>
          </div>

          {/* Impact Assessment */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#ffaa00]" />
                <h3 className="text-sm font-semibold text-[#f0f0f0]">Impact Assessment</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAssess}
                disabled={assessing || !identities.length}
                className="h-7 text-[10px] text-[#ffaa00] hover:text-[#ffaa00]/80 hover:bg-[#ffaa00]/10 gap-1"
              >
                {assessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Assess
              </Button>
            </div>
            {assessment ? (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[rgba(255,255,255,0.03)] p-2.5">
                    <div className="text-[10px] text-muted-foreground">Affected Identities</div>
                    <div className="text-lg font-bold font-mono text-[#f0f0f0]">{assessment.summary.affectedIdentities}</div>
                  </div>
                  <div className="rounded-lg bg-[rgba(255,255,255,0.03)] p-2.5">
                    <div className="text-[10px] text-muted-foreground">Affected Resources</div>
                    <div className="text-lg font-bold font-mono text-[#ffaa00]">{assessment.summary.affectedResources.toLocaleString()}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[rgba(239,68,68,0.06)] p-2.5">
                    <div className="text-[10px] text-[#ff3355]">Risk Before</div>
                    <div className="text-lg font-bold font-mono text-[#ff3355]">{assessment.summary.riskBefore}</div>
                  </div>
                  <div className="rounded-lg bg-[rgba(52,211,153,0.06)] p-2.5">
                    <div className="text-[10px] text-[#00ff88]">Risk After</div>
                    <div className="text-lg font-bold font-mono text-[#00ff88]">{assessment.summary.riskAfter}</div>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground">Risk Reduction: </span>
                  <span className="text-xs font-bold text-[#00ff88]">-{assessment.summary.riskReduction}%</span>
                </div>
              </motion.div>
            ) : (
              <p className="text-[11px] text-muted-foreground/60">Click &quot;Assess&quot; to evaluate blast radius and risk impact</p>
            )}
          </div>

          {/* Recent Revocations */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <ScrollText className="h-4 w-4 text-[#ff3355]" />
              <h3 className="text-sm font-semibold text-[#f0f0f0]">Recent Revocations</h3>
            </div>
            {recentRevocations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60">No recent revocations</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {recentRevocations.map((log) => {
                  let detail: Record<string, string> = {};
                  try { detail = JSON.parse(log.details || '{}'); } catch { /* */ }
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 rounded-lg bg-[rgba(255,255,255,0.02)] p-2.5"
                    >
                      <XCircle className="h-3.5 w-3.5 text-[#ff3355] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[#f0f0f0] font-mono truncate">
                          {log.revocation?.identifier || detail?.identifier || 'Unknown'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {log.revocation?.cloudProvider || detail?.cloud || '?'}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40">|</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom: Audit Trail ────────────────────────────── */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)]">
        <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#44aaff]" />
            <h3 className="text-sm font-semibold text-[#f0f0f0]">Audit Trail</h3>
            <Badge variant="outline" className="h-5 text-[10px] border-[rgba(6,182,212,0.2)] text-[#44aaff]">
              {auditLogs.length} events
            </Badge>
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-2">
          {auditLogs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 text-center py-8">No audit events yet</p>
          ) : (
            <div className="space-y-1">
              {auditLogs.map((log, i) => {
                const actionColor = ACTION_COLORS[log.action] || 'text-muted-foreground';
                const actionLabel = log.action.replace(/_/g, ' ').toUpperCase();
                let detail: Record<string, string> = {};
                try { detail = JSON.parse(log.details || '{}'); } catch { /* */ }

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <span className={`text-[10px] font-semibold font-mono w-36 flex-shrink-0 ${actionColor}`}>
                      {actionLabel}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono truncate flex-1">
                      {log.revocation?.identifier || detail?.identifier || log.resourceId || '-'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 flex-shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Confirmation Modal ────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="border-[#ff3355]/20 bg-[#080b14] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#ff3355] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Emergency Revocation
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action will immediately revoke the selected machine identities.
              In production, this would call AWS/GCP/Azure APIs to disable credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-[#ff3355]/5 border border-[#ff3355]/15 p-4 mt-2">
            <p className="text-sm text-[#f0f0f0] font-semibold">
              {hasSelection
                ? `${selectedIds.size} identities will be revoked.`
                : `${stats?.suspect ?? 0} suspect identities will be revoked.`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All associated access keys, tokens, and sessions will be terminated.
            </p>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowModal(false)}
              className="text-muted-foreground hover:text-[#f0f0f0]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevoke}
              className="bg-[#ff3355] hover:bg-[#dc2626] text-white font-semibold"
            >
              Yes, Revoke All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Modal ──────────────────────────────────── */}
      <Dialog open={!!detailIdentity} onOpenChange={() => setDetailIdentity(null)}>
        <DialogContent className="border-[rgba(255,255,255,0.08)] bg-[#080b14] max-w-lg">
          {detailIdentity && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#f0f0f0]">Identity Details</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {detailIdentity.displayName || detailIdentity.identityType}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</span>
                    <p className="text-xs text-[#f0f0f0] font-mono mt-0.5">{detailIdentity.identityType}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cloud</span>
                    <p className="text-xs text-[#f0f0f0] font-mono mt-0.5 uppercase">{detailIdentity.cloudProvider}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</span>
                    <p className="mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[detailIdentity.status]?.bg} ${STATUS_COLORS[detailIdentity.status]?.text} ${STATUS_COLORS[detailIdentity.status]?.border}`}>
                        {detailIdentity.status.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Level</span>
                    <p className="mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${RISK_COLORS[detailIdentity.riskLevel]?.bg} ${RISK_COLORS[detailIdentity.riskLevel]?.text} ${RISK_COLORS[detailIdentity.riskLevel]?.border}`}>
                        {detailIdentity.riskLevel.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Blast Radius</span>
                    <p className="text-xs text-[#ffaa00] font-mono font-bold mt-0.5">{detailIdentity.blastRadius.toLocaleString()} resources</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Rotated</span>
                    <p className="text-xs text-[#f0f0f0] font-mono mt-0.5">
                      {detailIdentity.lastRotated ? new Date(detailIdentity.lastRotated).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Identifier</span>
                  <p className="text-xs text-[#f0f0f0] font-mono mt-0.5 break-all bg-[rgba(0,0,0,0.3)] rounded-lg p-2.5">{detailIdentity.identifier}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Permissions</span>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {(() => {
                      try {
                        return JSON.parse(detailIdentity.permissions).map((p: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] font-mono border-[rgba(255,255,255,0.08)] text-[#f0f0f0]">
                            {p}
                          </Badge>
                        ));
                      } catch {
                        return <span className="text-xs text-muted-foreground">{detailIdentity.permissions}</span>;
                      }
                    })()}
                  </div>
                </div>
                {detailIdentity._count && detailIdentity._count.revocations > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    Previous revocations: <span className="text-[#ff3355] font-bold">{detailIdentity._count.revocations}</span>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setDetailIdentity(null)} className="text-muted-foreground">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
