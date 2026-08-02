/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Search,
  Send,
  ExternalLink,
  Copy,
  Check,
  Crown,
  Medal,
  Award,
  Loader2,
  PartyPopper,
  Shield,
  Code2,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───────────────────────────────────────────────────────

interface HallEntry {
  rank: number;
  id: string;
  domain: string;
  score: number;
  grade: string;
  findings: number;
  category: string;
  submittedBy: string | null;
  verifiedAt: string | null;
  daysAgo: number | null;
}

interface HallStats {
  totalEntries: number;
  avgScore: number;
  aPlusCount: number;
}

interface ScanResult {
  entry: {
    id: string;
    domain: string;
    score: number;
    grade: string;
    findings: number;
    category: string;
    submittedBy: string | null;
    verified: boolean;
    verifiedAt: string | null;
  };
  existing: boolean;
}

// ─── Constants ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'saas', label: 'SaaS' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'ai_tools', label: 'AI Tools' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'other', label: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  saas: 'SaaS',
  ecommerce: 'E-commerce',
  ai_tools: 'AI Tools',
  fintech: 'Fintech',
  other: 'Other',
};

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  'A+': { bg: 'bg-[#34d399]/15', text: 'text-[#34d399]', border: 'border-[#34d399]/30', glow: '0 0 20px rgba(52,211,153,0.3)' },
  'A':  { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]', border: 'border-[#22c55e]/30', glow: '0 0 16px rgba(34,197,94,0.2)' },
  'B':  { bg: 'bg-[#facc15]/15', text: 'text-[#facc15]', border: 'border-[#facc15]/30', glow: '0 0 12px rgba(250,204,21,0.15)' },
  'C':  { bg: 'bg-[#fb923c]/15', text: 'text-[#fb923c]', border: 'border-[#fb923c]/30', glow: '0 0 12px rgba(251,191,36,0.15)' },
  'D':  { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', border: 'border-[#ef4444]/30', glow: '0 0 12px rgba(239,68,68,0.15)' },
  'F':  { bg: 'bg-[#ef4444]/25', text: 'text-[#ef4444]', border: 'border-[#ef4444]/50', glow: '0 0 16px rgba(239,68,68,0.25)' },
};

function scoreColor(score: number): string {
  if (score >= 90) return '#34d399';
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#facc15';
  if (score >= 50) return '#fb923c';
  return '#ef4444';
}

function rankStyle(rank: number) {
  if (rank === 1) return { color: '#FFD700', icon: Crown, label: '🥇' };
  if (rank === 2) return { color: '#C0C0C0', icon: Medal, label: '🥈' };
  if (rank === 3) return { color: '#CD7F32', icon: Award, label: '🥉' };
  return { color: '#475569', icon: Trophy, label: `#${rank}` };
}

// ─── Main Component ──────────────────────────────────────────────

export function HallOfFame() {
  const [entries, setEntries] = useState<HallEntry[]>([]);
  const [stats, setStats] = useState<HallStats>({ totalEntries: 0, avgScore: 0, aPlusCount: 0 });
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Submit state
  const [submitDomain, setSubmitDomain] = useState('');
  const [submitCategory, setSubmitCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  // Badge embed state
  const [copied, setCopied] = useState(false);

  // Data fetching
  const stateRef = useRef({ category, search });
  const prevFiltersRef = useRef({ category, search });

  const loadEntries = useCallback(async () => {
    const { category: cat, search: q } = stateRef.current;
    const params = new URLSearchParams();
    if (cat !== 'all') params.set('category', cat);
    if (q) params.set('search', q);
    try {
      const res = await fetch(`/api/hall-of-fame?${params.toString()}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setStats(data.stats || { totalEntries: 0, avgScore: 0, aPlusCount: 0 });
    } catch {
      /* silent */
    }
  }, []);

  const initializedRef = useRef<boolean | null>(null);
  useEffect(() => {
    stateRef.current = { category, search };
    if (initializedRef.current == null) {
      initializedRef.current = true;
      void loadEntries();
    } else if (
      prevFiltersRef.current.category !== category ||
      prevFiltersRef.current.search !== search
    ) {
      prevFiltersRef.current = { category, search };
      void loadEntries();
    }
  });

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleSubmit = async () => {
    if (!submitDomain.trim()) return;
    setSubmitting(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/hall-of-fame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: submitDomain.trim(), category: submitCategory }),
      });
      const data = await res.json();
      setScanResult(data);
      // Refresh leaderboard if verified
      if (data.entry?.verified) {
        void loadEntries();
      }
    } catch {
      /* silent */
    }
    setSubmitting(false);
  };

  const copyBadge = () => {
    const code = `<script src="//reconpro.io/widget.js" data-domain="example.com"></script>`;
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gc = (grade: string) => GRADE_COLORS[grade] || GRADE_COLORS['F'];

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[rgba(52,211,153,0.12)] bg-[#0B1C2C] p-8"
      >
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#34d399]/[0.04] blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#34d399]/[0.03] blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center text-center">
          {/* Trophy icon with glow */}
          <motion.div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 ring-1 ring-[#FFD700]/30"
            animate={{
              boxShadow: ['0 0 20px rgba(255,215,0,0.15)', '0 0 40px rgba(255,215,0,0.25)', '0 0 20px rgba(255,215,0,0.15)'],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Trophy className="h-8 w-8 text-[#FFD700]" />
          </motion.div>

          <h1 className="text-3xl font-bold text-white md:text-4xl">
            VibeSec <span className="text-[#34d399]">Hall of Fame</span>
          </h1>
          <p className="mt-2 text-sm text-[#475569] md:text-base">
            The most secure AI-built apps on the internet
          </p>

          {/* Stats bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 md:gap-8">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-white">{stats.totalEntries}</span>
              <span className="text-xs text-[#475569]">Verified Apps</span>
            </div>
            <div className="h-8 w-px bg-[rgba(255,255,255,0.08)]" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-[#34d399]">{stats.avgScore}</span>
              <span className="text-xs text-[#475569]">Avg Score</span>
            </div>
            <div className="h-8 w-px bg-[rgba(255,255,255,0.08)]" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-[#FFD700]">{stats.aPlusCount}</span>
              <span className="text-xs text-[#475569]">A+ Earners</span>
            </div>
          </div>

          {/* Submit CTA */}
          <Button
            onClick={() => setShowSubmit(!showSubmit)}
            className="mt-6 gap-2 rounded-xl bg-[#34d399]/10 border border-[#34d399]/20 text-[#34d399] hover:bg-[#34d399]/20 hover:text-[#34d399] transition-all"
            variant="outline"
          >
            <Send className="h-4 w-4" />
            {showSubmit ? 'Hide Scanner' : 'Submit Your App'}
          </Button>
        </div>
      </motion.div>

      {/* ═══ SUBMIT SECTION ═══ */}
      <AnimatePresence>
        {showSubmit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-[rgba(52,211,153,0.1)] bg-[#0B1C2C] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-[#34d399]" />
                <h2 className="text-lg font-semibold text-white">VibeSec Micro-Scanner</h2>
              </div>
              <p className="text-sm text-[#475569] mb-4">
                Probes 5 critical paths (.env, /api/webhooks, /admin, /dashboard, /uploads/) to check for common misconfigurations.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="example.com"
                  value={submitDomain}
                  onChange={(e) => setSubmitDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className="flex-1 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-white placeholder:text-[#334155] focus:border-[#34d399]/40"
                  disabled={submitting}
                />
                <Select value={submitCategory} onValueChange={setSubmitCategory} disabled={submitting}>
                  <SelectTrigger className="w-full sm:w-40 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[rgba(255,255,255,0.08)] bg-[#080b14]">
                    {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-[#f1f5f9] focus:bg-[rgba(52,211,153,0.08)] focus:text-[#34d399]">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !submitDomain.trim()}
                  className="gap-2 bg-[#34d399] text-[#080a10] font-semibold hover:bg-[#34d399]/90"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Scan
                    </>
                  )}
                </Button>
              </div>

              {/* Scan Result Card */}
              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="mt-4"
                  >
                    <div
                      className="rounded-xl border p-4"
                      style={{
                        borderColor: `${scoreColor(scanResult.entry.score)}33`,
                        backgroundColor: `${scoreColor(scanResult.entry.score)}08`,
                        boxShadow: `${scoreColor(scanResult.entry.score)}15 0 0 20px`,
                      }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.04)]">
                            {scanResult.entry.verified ? (
                              <PartyPopper className="h-6 w-6 text-[#34d399]" />
                            ) : (
                              <Shield className="h-6 w-6" style={{ color: scoreColor(scanResult.entry.score) }} />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{scanResult.entry.domain}</p>
                            <p className="text-xs text-[#475569]">
                              {scanResult.existing ? 'Already scanned' : 'Fresh scan'} • {scanResult.entry.findings} findings
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Score */}
                          <div className="text-center">
                            <p className="text-2xl font-bold" style={{ color: scoreColor(scanResult.entry.score) }}>
                              {scanResult.entry.score}
                            </p>
                            <p className="text-[10px] text-[#475569] uppercase tracking-wider">Score</p>
                          </div>
                          {/* Grade Badge */}
                          <Badge
                            className={`${gc(scanResult.entry.grade).bg} ${gc(scanResult.entry.grade).text} border ${gc(scanResult.entry.grade).border} px-3 py-1 text-sm font-bold`}
                            style={{ boxShadow: gc(scanResult.entry.grade).glow }}
                          >
                            {scanResult.entry.grade}
                          </Badge>
                        </div>
                      </div>

                      {scanResult.entry.verified && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 flex items-center gap-2 rounded-lg bg-[#34d399]/10 border border-[#34d399]/20 px-3 py-2"
                        >
                          <Sparkles className="h-4 w-4 text-[#34d399]" />
                          <span className="text-sm font-medium text-[#34d399]">
                            You made it! Welcome to the Hall of Fame! 🎉
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FILTER BAR ═══ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                category === cat.id
                  ? 'bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30'
                  : 'bg-[rgba(255,255,255,0.03)] text-[#475569] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f1f5f9]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#334155]" />
            <Input
              placeholder="Search domain..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-56 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] pl-9 pr-3 text-sm text-white placeholder:text-[#334155] focus:border-[#34d399]/40"
            />
          </div>
          {search && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.06)] text-[#475569] hover:text-white hover:border-[rgba(255,255,255,0.12)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ LEADERBOARD ═══ */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#0B1C2C] p-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-6 w-10 rounded" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        /* ═══ EMPTY STATE ═══ */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] bg-[#0B1C2C]/50 py-16"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,255,255,0.03)]">
            <Trophy className="h-8 w-8 text-[#334155]" />
          </div>
          <h3 className="text-lg font-semibold text-[#f1f5f9]">No verified apps yet</h3>
          <p className="mt-1 max-w-md text-center text-sm text-[#475569]">
            No apps have earned A+ yet. Be the first to submit your AI-built app and prove its security!
          </p>
          <Button
            onClick={() => setShowSubmit(true)}
            className="mt-6 gap-2 bg-[#34d399] text-[#080a10] font-semibold hover:bg-[#34d399]/90"
          >
            <Send className="h-4 w-4" />
            Submit Your App
          </Button>
        </motion.div>
      ) : (
        /* ═══ ENTRIES TABLE ═══ */
        <div className="space-y-2">
          {/* Table header (desktop) */}
          <div className="hidden md:grid md:grid-cols-[60px_1fr_120px_80px_100px_100px_80px] gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#334155]">
            <span>Rank</span>
            <span>Domain</span>
            <span>Score</span>
            <span>Grade</span>
            <span>Category</span>
            <span>Findings</span>
            <span>Verified</span>
          </div>

          {entries.map((entry, idx) => {
            const rs = rankStyle(entry.rank);
            const gradeColor = gc(entry.grade);
            const isTop3 = entry.rank <= 3;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                className={`group relative rounded-xl border p-4 transition-all duration-200 hover:border-[rgba(255,255,255,0.1)] ${
                  isTop3
                    ? 'bg-[#0B1C2C] border-[rgba(255,215,0,0.08)]'
                    : 'bg-[#0B1C2C]/60 border-[rgba(255,255,255,0.04)]'
                }`}
                style={isTop3 ? { boxShadow: `0 0 24px ${rs.color}08` } : undefined}
              >
                <div className="md:grid md:grid-cols-[60px_1fr_120px_80px_100px_100px_80px] md:items-center gap-3 md:gap-4 flex flex-col gap-3">
                  {/* Rank */}
                  <div className="flex items-center gap-2 md:gap-0">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                      style={{
                        backgroundColor: isTop3 ? `${rs.color}15` : 'rgba(255,255,255,0.03)',
                        color: rs.color,
                      }}
                    >
                      {isTop3 ? rs.label : entry.rank}
                    </div>
                  </div>

                  {/* Domain */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-sm font-medium text-[#f1f5f9] truncate"
                      style={isTop3 ? { color: rs.color } : undefined}
                    >
                      {entry.domain}
                    </span>
                    <a
                      href={`https://${entry.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-[#334155] hover:text-[#34d399] transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Score bar */}
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 max-w-[80px] rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${entry.score}%` }}
                        transition={{ delay: idx * 0.04 + 0.2, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: scoreColor(entry.score) }}
                      />
                    </div>
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: scoreColor(entry.score) }}
                    >
                      {entry.score}
                    </span>
                  </div>

                  {/* Grade */}
                  <div>
                    <Badge
                      className={`${gradeColor.bg} ${gradeColor.text} border ${gradeColor.border} text-xs font-bold px-2 py-0.5`}
                      style={{ boxShadow: gradeColor.glow }}
                    >
                      {entry.grade}
                    </Badge>
                  </div>

                  {/* Category */}
                  <div className="hidden md:block">
                    <span className="text-xs text-[#475569]">
                      {CATEGORY_LABELS[entry.category] || entry.category}
                    </span>
                  </div>

                  {/* Findings */}
                  <div className="hidden md:block">
                    <span className={`text-xs tabular-nums ${entry.findings === 0 ? 'text-[#34d399]' : 'text-[#475569]'}`}>
                      {entry.findings === 0 ? 'None' : `${entry.findings} found`}
                    </span>
                  </div>

                  {/* Verified */}
                  <div className="hidden md:block">
                    <span className="text-[11px] text-[#334155]">
                      {entry.daysAgo !== null && entry.daysAgo !== undefined
                        ? entry.daysAgo === 0
                          ? 'Today'
                          : `${entry.daysAgo}d ago`
                        : '—'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ═══ EMBEDDABLE BADGE SECTION ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 rounded-2xl border border-[rgba(255,255,255,0.04)] bg-[#0B1C2C] p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="h-5 w-5 text-[#475569]" />
          <h2 className="text-lg font-semibold text-white">Embed Your Badge</h2>
        </div>
        <p className="text-sm text-[#475569] mb-4">
          Show off your VibeSec score on your site. Add this snippet to your HTML:
        </p>

        {/* Code snippet */}
        <div className="relative rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#030407] p-4">
          <code className="text-xs text-[#f1f5f9] font-mono break-all">
            {'<script src="//reconpro.io/widget.js" data-domain="example.com"></script>'}
          </code>
          <button
            onClick={copyBadge}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md bg-[rgba(255,255,255,0.06)] text-[#475569] hover:bg-[rgba(52,211,153,0.1)] hover:text-[#34d399] transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Badge Preview */}
        <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] p-6">
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(52,211,153,0.15)] bg-[#0B1C2C] px-4 py-2.5 shadow-lg" style={{ boxShadow: '0 0 20px rgba(52,211,153,0.08)' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#34d399]/15">
              <Shield className="h-4 w-4 text-[#34d399]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#f1f5f9]">example.com</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#475569]">VibeSec</span>
                <Badge className="bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30 text-[10px] px-1.5 py-0 font-bold h-4">
                  A+
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}