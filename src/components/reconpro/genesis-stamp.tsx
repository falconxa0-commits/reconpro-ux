'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  Award,
  Copy,
  ExternalLink,
  RefreshCw,
  Ban,
  Eye,
  Code,
  Check,
  Loader2,
  AlertTriangle,
  Clock,
  Fingerprint,
  X,
  Stamp as StampIcon,
  BarChart3,
  FileWarning,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────

interface Stamp {
  id?: string;
  stampId: string;
  domain: string;
  tier: string;
  score: number;
  grade: string;
  status: string;
  issuedAt: string;
  expiresAt: string;
  frameworks?: string[];
  complianceScores?: Record<string, number>;
  findingsSummary?: Record<string, number>;
  verifiedCount?: number;
  embedViews?: number;
  revokedAt?: string | null;
  revokeReason?: string | null;
}

interface VerificationResult {
  valid: boolean;
  stamp: Stamp;
  verification: {
    signatureValid: boolean;
    notExpired: boolean;
    notRevoked: boolean;
    verifiedAt: string;
  };
  error?: string;
}

interface StampStats {
  totalIssued: number;
  activeStamps: number;
  expiredThisMonth: number;
  totalVerifications: number;
  totalEmbedViews: number;
}

// ─── Constants ───────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  'A+': '#34d399',
  'A': '#22c55e',
  'B+': '#3b82f6',
  'B': '#6366f1',
  'C+': '#facc15',
  'C': '#fb923c',
  'D+': '#ef4444',
  'D': '#dc2626',
  'F': '#991b1b',
};

const GRADE_BG: Record<string, string> = {
  'A+': 'rgba(52,211,153,0.12)',
  'A': 'rgba(34,197,94,0.12)',
  'B+': 'rgba(59,130,246,0.12)',
  'B': 'rgba(99,102,241,0.12)',
  'C+': 'rgba(250,204,21,0.12)',
  'C': 'rgba(251,191,36,0.12)',
  'D+': 'rgba(239,68,68,0.12)',
  'D': 'rgba(220,38,38,0.12)',
  'F': 'rgba(153,27,27,0.15)',
};

const TIERS = [
  { id: 'basic', label: 'Basic', days: 90, desc: '90-day validity' },
  { id: 'professional', label: 'Professional', days: 60, desc: '60-day validity' },
  { id: 'enterprise', label: 'Enterprise', days: 30, desc: '30-day validity' },
];

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  basic: { bg: 'bg-gray-800/50', border: 'border-gray-600/40', text: 'text-gray-300' },
  professional: { bg: 'bg-blue-950/40', border: 'border-blue-500/30', text: 'text-blue-400' },
  enterprise: { bg: 'bg-purple-950/40', border: 'border-purple-500/30', text: 'text-purple-400' },
};

// ─── Helpers ─────────────────────────────────────────────────────

function gradeColor(grade: string): string {
  return GRADE_COLORS[grade] ?? '#6b7280';
}

function gradeBg(grade: string): string {
  return GRADE_BG[grade] ?? 'rgba(107,114,128,0.12)';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function expiresIn(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hrs}h`;
  return `${hrs}h`;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function parseSafeJson<T>(val: unknown, fallback: T): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  if (typeof val === 'object' && val !== null) return val as T;
  return fallback;
}

// ─── Copy Button ─────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-300 hover:text-white transition-colors"
      title={label ?? 'Copy'}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function GenesisStampPanel() {
  // ── State ───────────────────────────────────────────────────────
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [stats, setStats] = useState<StampStats>({
    totalIssued: 0, activeStamps: 0, expiredThisMonth: 0,
    totalVerifications: 0, totalEmbedViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issue' | 'stamps' | 'verify' | 'embed'>('stamps');

  // Issue form
  const [issueDomain, setIssueDomain] = useState('');
  const [issueTier, setIssueTier] = useState('basic');
  const [issueScanId, setIssueScanId] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issuedStamp, setIssuedStamp] = useState<{ stamp: Stamp; embedCode: string } | null>(null);
  const [issueError, setIssueError] = useState('');

  // Verify
  const [verifyId, setVerifyId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState('');

  // Embed preview
  const [embedId, setEmbedId] = useState('');
  const [embedHtml, setEmbedHtml] = useState('');
  const [embedLoading, setEmbedLoading] = useState(false);

  // Revoke dialog
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; stampId: string; domain: string }>({
    open: false, stampId: '', domain: '',
  });
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Domain filter for listing
  const [filterDomain, setFilterDomain] = useState('');

  // ── Fetch stamps ────────────────────────────────────────────────
  const loadStamps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDomain) params.set('domain', filterDomain);
      else params.set('domain', '*');
      const res = await fetch(`/api/genesis?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const raw: Stamp[] = data.stamps ?? [];
      // Parse JSON string fields
      const parsed = raw.map((s) => ({
        ...s,
        frameworks: parseSafeJson<string[]>(s.frameworks, []),
        complianceScores: parseSafeJson<Record<string, number>>(s.complianceScores, {}),
        findingsSummary: parseSafeJson<Record<string, number>>(s.findingsSummary, {}),
      }));
      setStamps(parsed);
      // Compute stats from the list
      const now = Date.now();
      const monthAgo = now - 30 * 86400000;
      setStats({
        totalIssued: parsed.length,
        activeStamps: parsed.filter((s) => s.status === 'active' && !isExpired(s.expiresAt)).length,
        expiredThisMonth: parsed.filter(
          (s) => s.status === 'expired' || (s.expiresAt && new Date(s.expiresAt).getTime() < now && new Date(s.expiresAt).getTime() > monthAgo)
        ).length,
        totalVerifications: parsed.reduce((acc, s) => acc + (s.verifiedCount ?? 0), 0),
        totalEmbedViews: parsed.reduce((acc, s) => acc + (s.embedViews ?? 0), 0),
      });
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [filterDomain]);

  useEffect(() => {
    void loadStamps();
  }, [loadStamps]);

  // ── Issue Stamp ─────────────────────────────────────────────────
  const handleIssue = async () => {
    if (!issueDomain.trim()) return;
    setIssuing(true);
    setIssueError('');
    setIssuedStamp(null);
    try {
      const res = await fetch('/api/genesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: issueDomain.trim(),
          tier: issueTier,
          scanId: issueScanId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to issue stamp');
      setIssuedStamp({
        stamp: {
          ...data.stamp,
          frameworks: parseSafeJson<string[]>(data.stamp.frameworks, []),
          complianceScores: parseSafeJson<Record<string, number>>(data.stamp.complianceScores, {}),
          findingsSummary: parseSafeJson<Record<string, number>>(data.stamp.findingsSummary, {}),
        },
        embedCode: data.embedCode,
      });
      setIssueDomain('');
      setIssueScanId('');
      void loadStamps();
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIssuing(false);
    }
  };

  // ── Verify Stamp ────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!verifyId.trim()) return;
    setVerifying(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/genesis/verify/${encodeURIComponent(verifyId.trim())}`);
      const data = await res.json();
      if (!res.ok && !data.valid) throw new Error(data.error ?? 'Verification failed');
      setVerifyResult(data);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setVerifying(false);
    }
  };

  // ── Revoke Stamp ────────────────────────────────────────────────
  const handleRevoke = async () => {
    if (!revokeDialog.stampId) return;
    setRevoking(true);
    try {
      const res = await fetch('/api/genesis/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stampId: revokeDialog.stampId, reason: revokeReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to revoke');
      setRevokeDialog({ open: false, stampId: '', domain: '' });
      setRevokeReason('');
      void loadStamps();
    } catch {
      /* silent */
    } finally {
      setRevoking(false);
    }
  };

  // ── Load Embed Preview ──────────────────────────────────────────
  const handleLoadEmbed = async () => {
    if (!embedId.trim()) return;
    setEmbedLoading(true);
    setEmbedHtml('');
    try {
      const res = await fetch(`/api/genesis/embed/${encodeURIComponent(embedId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load embed');
      setEmbedHtml(data.html);
    } catch {
      setEmbedHtml('');
    } finally {
      setEmbedLoading(false);
    }
  };

  // ─── Tab definitions ───────────────────────────────────────────
  const tabs = [
    { id: 'stamps' as const, label: 'Active Stamps', icon: ShieldCheck },
    { id: 'issue' as const, label: 'Issue Stamp', icon: StampIcon },
    { id: 'verify' as const, label: 'Verify', icon: Fingerprint },
    { id: 'embed' as const, label: 'Embed Preview', icon: Code },
  ];

  // ─── Stats Bar ─────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Issued', value: stats.totalIssued, icon: StampIcon, color: '#34d399' },
    { label: 'Active Stamps', value: stats.activeStamps, icon: ShieldCheck, color: '#3b82f6' },
    { label: 'Expired This Month', value: stats.expiredThisMonth, icon: Clock, color: '#fb923c' },
    { label: 'Total Verifications', value: stats.totalVerifications, icon: Eye, color: '#a855f7' },
    { label: 'Total Embed Views', value: stats.totalEmbedViews, icon: BarChart3, color: '#facc15' },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[#34d399]/10 border border-[#34d399]/20">
          <Shield className="w-6 h-6 text-[#34d399]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Genesis Stamp</h2>
          <p className="text-sm text-gray-400">Cryptographic trust attestations for verified security posture</p>
        </div>
      </div>

      {/* ─── Stats Bar ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-gray-900/80 border border-gray-800 p-3.5"
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{s.value.toLocaleString()}</div>
          </motion.div>
        ))}
      </div>

      {/* ─── Tab Bar ─────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-900/60 rounded-xl p-1 border border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === t.id
                ? 'bg-gray-800 text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ────────── STAMPS TAB ──────────────────────────────────── */}
        {activeTab === 'stamps' && (
          <motion.div key="stamps" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Filter by domain..."
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadStamps()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#34d399]/50 focus:ring-1 focus:ring-[#34d399]/20 transition-colors"
              />
              <button onClick={loadStamps} className="px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-[#34d399] animate-spin" />
              </div>
            ) : stamps.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No stamps found. Issue your first stamp to get started.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                <AnimatePresence>
                  {stamps.map((stamp, i) => {
                    const gc = gradeColor(stamp.grade);
                    const gb = gradeBg(stamp.grade);
                    const expired = isExpired(stamp.expiresAt);
                    const ts = TIER_STYLES[stamp.tier] ?? TIER_STYLES.basic;
                    const findings = parseSafeJson<Record<string, number>>(stamp.findingsSummary, {});
                    return (
                      <motion.div
                        key={stamp.stampId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-xl bg-gray-900/80 border border-gray-800 p-4 hover:border-gray-700 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {/* Grade badge */}
                          <div
                            className="flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center border"
                            style={{ backgroundColor: gb, borderColor: gc + '40' }}
                          >
                            <span className="text-2xl font-black" style={{ color: gc }}>{stamp.grade}</span>
                            <span className="text-[10px] font-medium" style={{ color: gc + 'aa' }}>{stamp.score}/100</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm truncate">{stamp.domain}</span>
                              <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border', ts.bg, ts.border, ts.text)}>
                                {stamp.tier}
                              </span>
                              {stamp.status === 'revoked' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-red-950/50 border border-red-500/30 text-red-400">Revoked</span>
                              )}
                              {expired && stamp.status !== 'revoked' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-yellow-950/50 border border-yellow-500/30 text-yellow-400">Expired</span>
                              )}
                            </div>

                            {/* Score bar */}
                            <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: gc }}
                                initial={{ width: 0 }}
                                animate={{ width: `${stamp.score}%` }}
                                transition={{ duration: 0.8, delay: i * 0.04 + 0.2 }}
                              />
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {expired ? 'Expired' : `Expires in ${expiresIn(stamp.expiresAt)}`}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {(stamp.verifiedCount ?? 0).toLocaleString()} verifications
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="w-3 h-3" />
                                {(stamp.embedViews ?? 0).toLocaleString()} embed views
                              </span>
                              <span className="flex items-center gap-1">
                                <Fingerprint className="w-3 h-3" />
                                <span className="font-mono text-gray-600">{stamp.stampId}</span>
                              </span>
                            </div>

                            {/* Findings summary */}
                            {findings && (findings.critical || findings.high || findings.medium || findings.low) ? (
                              <div className="flex gap-2 flex-wrap">
                                {findings.critical ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950/60 text-red-400 border border-red-800/40">
                                    {findings.critical} Critical
                                  </span>
                                ) : null}
                                {findings.high ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-950/60 text-orange-400 border border-orange-800/40">
                                    {findings.high} High
                                  </span>
                                ) : null}
                                {findings.medium ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-950/60 text-yellow-400 border border-yellow-800/40">
                                    {findings.medium} Medium
                                  </span>
                                ) : null}
                                {findings.low ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/60 text-blue-400 border border-blue-800/40">
                                    {findings.low} Low
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            {/* Compliance frameworks */}
                            {stamp.frameworks && stamp.frameworks.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap">
                                {stamp.frameworks.map((fw) => (
                                  <span key={fw} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700">
                                    {fw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex sm:flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEmbedId(stamp.stampId);
                                setActiveTab('embed');
                                setTimeout(() => handleLoadEmbed(), 100);
                              }}
                              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white transition-colors"
                              title="View embed badge"
                            >
                              <Code className="w-4 h-4" />
                            </button>
                            <CopyButton
                              text={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/genesis/embed/${stamp.stampId}.js"></script>`}
                              label="Embed"
                            />
                            <a
                              href={`/api/genesis/verify/${stamp.stampId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white transition-colors"
                              title="View verification page"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            {stamp.status === 'active' && !expired && (
                              <button
                                onClick={() => setRevokeDialog({ open: true, stampId: stamp.stampId, domain: stamp.domain })}
                                className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-800/30 text-red-400 hover:text-red-300 transition-colors"
                                title="Revoke stamp"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* ────────── ISSUE TAB ───────────────────────────────────── */}
        {activeTab === 'issue' && (
          <motion.div key="issue" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
            <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-6 space-y-5 max-w-2xl">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Award className="w-5 h-5 text-[#34d399]" />
                Issue New Genesis Stamp
              </div>

              {/* Domain */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Domain *</label>
                <input
                  type="text"
                  placeholder="example.com"
                  value={issueDomain}
                  onChange={(e) => setIssueDomain(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#34d399]/50 focus:ring-1 focus:ring-[#34d399]/20 transition-colors"
                />
              </div>

              {/* Tier selector */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setIssueTier(t.id)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all',
                        issueTier === t.id
                          ? 'bg-[#34d399]/10 border-[#34d399]/40 ring-1 ring-[#34d399]/20'
                          : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                      )}
                    >
                      <div className={cn('text-sm font-semibold', issueTier === t.id ? 'text-[#34d399]' : 'text-gray-300')}>
                        {t.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional scan ID */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Scan ID (optional)</label>
                <input
                  type="text"
                  placeholder="Auto-detect latest scan if empty"
                  value={issueScanId}
                  onChange={(e) => setIssueScanId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#34d399]/50 focus:ring-1 focus:ring-[#34d399]/20 transition-colors font-mono"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleIssue}
                disabled={issuing || !issueDomain.trim()}
                className="w-full py-3 rounded-xl bg-[#34d399] hover:bg-[#34d399]/90 text-gray-950 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {issuing ? 'Issuing Stamp...' : 'Issue Genesis Stamp'}
              </button>

              {issueError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/30 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {issueError}
                </div>
              )}
            </div>

            {/* Issued stamp result */}
            <AnimatePresence>
              {issuedStamp && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-xl border p-6 max-w-2xl space-y-4"
                  style={{
                    backgroundColor: gradeBg(issuedStamp.stamp.grade),
                    borderColor: gradeColor(issuedStamp.stamp.grade) + '30',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" style={{ color: gradeColor(issuedStamp.stamp.grade) }} />
                    <span className="text-white font-semibold">Stamp Issued Successfully</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-400 text-xs mb-0.5">Stamp ID</div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-white text-xs bg-black/30 px-2 py-1 rounded">{issuedStamp.stamp.stampId}</code>
                        <CopyButton text={issuedStamp.stamp.stampId} />
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs mb-0.5">Domain</div>
                      <div className="text-white font-medium">{issuedStamp.stamp.domain}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs mb-0.5">Grade</div>
                      <span
                        className="text-xl font-black"
                        style={{ color: gradeColor(issuedStamp.stamp.grade) }}
                      >
                        {issuedStamp.stamp.grade}
                      </span>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs mb-0.5">Score</div>
                      <span className="text-white font-bold">{issuedStamp.stamp.score}/100</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-400 text-xs mb-1.5 uppercase tracking-wider">Embed Code</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] text-gray-300 bg-black/40 px-3 py-2 rounded-lg border border-gray-700/50 overflow-x-auto whitespace-nowrap">
                        {issuedStamp.embedCode}
                      </code>
                      <CopyButton text={issuedStamp.embedCode} label="Copy" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ────────── VERIFY TAB ──────────────────────────────────── */}
        {activeTab === 'verify' && (
          <motion.div key="verify" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5 max-w-2xl">
            <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Fingerprint className="w-5 h-5 text-[#a855f7]" />
                Verify a Genesis Stamp
              </div>
              <p className="text-sm text-gray-400">Enter a stamp ID to cryptographically verify its authenticity, expiry, and revocation status.</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="GS-XXXX-XXXX-XXXX"
                  value={verifyId}
                  onChange={(e) => setVerifyId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/20 transition-colors font-mono"
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying || !verifyId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#a855f7]/90 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verify
                </button>
              </div>
            </div>

            {verifyError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 rounded-xl bg-red-950/40 border border-red-800/30 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {verifyError}
              </motion.div>
            )}

            <AnimatePresence>
              {verifyResult && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl bg-gray-900/80 border p-6 space-y-4"
                  style={{ borderColor: verifyResult.valid ? '#34d39940' : '#ef444440' }}
                >
                  {/* Valid / Invalid header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: verifyResult.valid ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)' }}
                    >
                      {verifyResult.valid ? (
                        <ShieldCheck className="w-6 h-6 text-[#34d399]" />
                      ) : (
                        <Shield className="w-6 h-6 text-[#ef4444]" />
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: verifyResult.valid ? '#34d399' : '#ef4444' }}>
                        {verifyResult.valid ? 'Stamp is Valid' : 'Stamp is Invalid'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {verifyResult.stamp?.domain} &middot; {verifyResult.stamp?.stampId}
                      </div>
                    </div>
                  </div>

                  {/* Verification checks */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Signature Valid', pass: verifyResult.verification.signatureValid },
                      { label: 'Not Expired', pass: verifyResult.verification.notExpired },
                      { label: 'Not Revoked', pass: verifyResult.verification.notRevoked },
                    ].map((check) => (
                      <div
                        key={check.label}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl border text-sm',
                          check.pass
                            ? 'bg-green-950/30 border-green-800/30 text-green-400'
                            : 'bg-red-950/30 border-red-800/30 text-red-400'
                        )}
                      >
                        {check.pass ? (
                          <Check className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="font-medium">{check.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stamp details */}
                  {verifyResult.stamp && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-800">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Grade</div>
                        <div className="text-lg font-black mt-0.5" style={{ color: gradeColor(verifyResult.stamp.grade) }}>
                          {verifyResult.stamp.grade}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Score</div>
                        <div className="text-lg font-bold text-white mt-0.5">{verifyResult.stamp.score}/100</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Tier</div>
                        <div className="text-sm text-gray-300 mt-1 capitalize">{verifyResult.stamp.tier}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Verified At</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(verifyResult.verification.verifiedAt).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ────────── EMBED TAB ───────────────────────────────────── */}
        {activeTab === 'embed' && (
          <motion.div key="embed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5 max-w-2xl">
            <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Code className="w-5 h-5 text-[#facc15]" />
                Embed Badge Preview
              </div>
              <p className="text-sm text-gray-400">Enter a stamp ID to preview the embeddable badge as it would appear on a third-party website.</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="GS-XXXX-XXXX-XXXX"
                  value={embedId}
                  onChange={(e) => setEmbedId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadEmbed()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#facc15]/50 focus:ring-1 focus:ring-[#facc15]/20 transition-colors font-mono"
                />
                <button
                  onClick={handleLoadEmbed}
                  disabled={embedLoading || !embedId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#facc15] hover:bg-[#facc15]/90 text-gray-950 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {embedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Preview
                </button>
              </div>
            </div>

            {embedLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#facc15] animate-spin" />
              </div>
            )}

            {embedHtml && !embedLoading && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Badge Preview</div>
                {/* Simulated page background */}
                <div className="rounded-xl bg-gray-950 border border-gray-800 p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    <span className="ml-2 text-xs text-gray-600">Example website</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-800/50 rounded w-48" />
                    <div className="h-3 bg-gray-800/30 rounded w-full" />
                    <div className="h-3 bg-gray-800/30 rounded w-3/4" />
                    <div className="mt-6 flex items-center gap-2">
                      <div className="text-xs text-gray-500">Security Badge:</div>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Revoke Dialog ────────────────────────────────────────── */}
      <AnimatePresence>
        {revokeDialog.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!revoking) setRevokeDialog({ open: false, stampId: '', domain: '' }); setRevokeReason(''); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl bg-gray-900 border border-gray-700 p-6 w-full max-w-md shadow-2xl space-y-4 mx-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-950/50 border border-red-800/30">
                  <Ban className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Revoke Stamp</h3>
                  <p className="text-sm text-gray-400">This action cannot be undone.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 text-sm">
                <div className="text-gray-400 text-xs mb-0.5">Domain</div>
                <div className="text-white font-medium">{revokeDialog.domain}</div>
                <div className="text-gray-400 text-xs mt-2 mb-0.5">Stamp ID</div>
                <code className="text-gray-300 font-mono text-xs">{revokeDialog.stampId}</code>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Reason (optional)</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Security posture has degraded..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setRevokeDialog({ open: false, stampId: '', domain: '' }); setRevokeReason(''); }}
                  disabled={revoking}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-medium text-sm transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Revoke
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}