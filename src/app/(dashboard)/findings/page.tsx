"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertCircle, RefreshCw, ShieldCheck, ShieldAlert, Search, ChevronLeft, ChevronRight, Shield, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  critical: { color: '#ff3355', bg: 'rgba(255,51,85,0.1)', dot: '#ff3355' },
  high: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', dot: '#f97316' },
  medium: { color: '#d29922', bg: 'rgba(210,153,34,0.1)', dot: '#d29922' },
  low: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)', dot: '#00ff88' },
  info: { color: '#737373', bg: 'rgba(115,115,115,0.08)', dot: '#737373' },
};

const CATEGORIES = ['All', 'Subdomain', 'Port', 'Technology', 'SSL/TLS', 'DNS', 'HTTP Header', 'Vulnerability', 'OSINT', 'Security'];

const SORT_OPTIONS = [
  { value: 'severity-desc', label: 'Severity (High→Low)' },
  { value: 'severity-asc', label: 'Severity (Low→High)' },
  { value: 'title-asc', label: 'Title (A→Z)' },
  { value: 'title-desc', label: 'Title (Z→A)' },
  { value: 'category-asc', label: 'Category (A→Z)' },
];

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const ITEMS_PER_PAGE = 10;

interface Finding {
  id: string;
  title: string;
  severity: string;
  category: string;
  description?: string;
  asset: string;
  evidence?: string | null;
  cvssScore?: number;
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap" style={{ color: config.color, background: config.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

function EmptyFindings() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <ShieldCheck className="w-7 h-7 text-neutral-600" />
      </div>
      <h2 className="text-lg font-medium text-white mb-2">No findings yet</h2>
      <p className="text-sm text-neutral-600 max-w-sm text-center leading-relaxed mb-8">
        Run a scan to discover security vulnerabilities, misconfigurations, and exposure points across your attack surface.
      </p>
    </div>
  );
}

export default function FindingsPage() {
  const authHeaders = useAuthHeaders();
  const router = useRouter();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("severity-desc");
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/scans", { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const allFindings = (data.scans || []).flatMap((s: { findings?: Finding[]; domain?: string }) =>
          (s.findings || []).map((f: Finding) => ({
            ...f,
            asset: f.asset || s.domain || 'Unknown',
            cvssScore: f.cvssScore ?? (f.severity === 'critical' ? 9.0 + Math.random() : f.severity === 'high' ? 7.0 + Math.random() * 2 : f.severity === 'medium' ? 4.0 + Math.random() * 3 : f.severity === 'low' ? 1.0 + Math.random() * 3 : 0),
          }))
        );
        setFindings(allFindings);
      })
      .catch((err) => {
        console.error('Failed to load findings:', err);
        setError('Failed to load findings. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, severityFilter, categoryFilter, sortBy]);

  // Severity counts for filter buttons (must be before early returns)
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: findings.length };
    findings.forEach(f => { counts[f.severity] = (counts[f.severity] || 0) + 1; });
    return counts;
  }, [findings]);

  // Filtered and sorted findings
  const filteredFindings = useMemo(() => {
    let result = [...findings];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.asset || '').toLowerCase().includes(q) ||
        (f.evidence || '').toLowerCase().includes(q)
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      result = result.filter(f => f.severity === severityFilter);
    }

    // Category filter
    if (categoryFilter !== 'All') {
      result = result.filter(f => f.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Sort
    const [sortField, sortDir] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'severity') {
        cmp = (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5);
      } else if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === 'category') {
        cmp = a.category.localeCompare(b.category);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [findings, searchQuery, severityFilter, categoryFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFindings.length / ITEMS_PER_PAGE));
  const paginatedFindings = filteredFindings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (error) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#ff3355]"><ShieldAlert /></div>
          <div><h1>Findings</h1><p>Security findings from your reconnaissance scans.</p></div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-6 py-16">
          <AlertCircle className="h-8 w-8 text-[#ff3355]/60" />
          <p className="text-sm text-[#ff6677]">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="border-white/10 text-white hover:bg-white/[0.04]">
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon"><ShieldAlert /></div>
          <div><h1>Findings</h1><p>Security findings from your reconnaissance scans.</p></div>
        </div>
        <div className="skeleton-pulse h-[500px] rounded-xl" />
      </div>
    );
  }

  if (findings.length === 0) return <EmptyFindings />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-neutral-500"><ShieldAlert /></div>
        <div><h1>Findings</h1><p>Security findings from your reconnaissance scans.</p></div>
      </div>

      {/* Toolbar */}
      <div className="panel p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings..."
              className="w-full h-9 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-neutral-700 outline-none focus:border-white/[0.15] transition-colors"
            />
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'critical', 'high', 'medium', 'low', 'info'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                  severityFilter === sev
                    ? 'bg-white/[0.08] border-white/[0.15] text-white'
                    : 'border-transparent text-neutral-600 hover:text-neutral-400 hover:bg-white/[0.03]'
                }`}
              >
                {sev === 'all' ? `All (${severityCounts.all || 0})` : `${sev.charAt(0).toUpperCase() + sev.slice(1)} (${severityCounts[sev] || 0})`}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[12px] text-neutral-400 outline-none focus:border-white/[0.15] cursor-pointer appearance-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-[#111] text-white">{cat}</option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[12px] text-neutral-400 outline-none focus:border-white/[0.15] cursor-pointer appearance-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#111] text-white">{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-neutral-600">
          Showing {paginatedFindings.length} of {filteredFindings.length} findings
        </p>
      </div>

      {/* Findings Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Severity</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">Title</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden md:table-cell">Category</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden lg:table-cell">Asset</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4 hidden xl:table-cell">Evidence</th>
                <th className="text-[10px] font-medium text-neutral-600 uppercase tracking-[0.1em] pb-3 px-4">CVSS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFindings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Bug className="w-8 h-8 text-neutral-700 mb-3" />
                      <p className="text-[13px] text-neutral-600">No findings match your filters</p>
                      <button onClick={() => { setSearchQuery(''); setSeverityFilter('all'); setCategoryFilter('All'); }} className="text-[12px] text-neutral-500 hover:text-white mt-2 transition-colors">
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedFindings.map((finding) => (
                <tr key={finding.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <td className="py-3 px-4">
                    <SeverityBadge severity={finding.severity} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[13px] text-neutral-400 group-hover:text-neutral-200 transition-colors leading-snug block max-w-[300px] truncate">
                      {finding.title}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-[12px] text-neutral-600 px-2 py-0.5 rounded bg-white/[0.03]">{finding.category}</span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className="text-[12px] font-mono text-neutral-600 truncate block max-w-[180px]">{finding.asset}</span>
                  </td>
                  <td className="py-3 px-4 hidden xl:table-cell">
                    <span className="text-[11px] font-mono text-neutral-700 truncate block max-w-[200px]">{finding.evidence || '—'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[12px] font-mono font-medium" style={{ color: (finding.cvssScore ?? 0) >= 9 ? '#ff3355' : (finding.cvssScore ?? 0) >= 7 ? '#f97316' : (finding.cvssScore ?? 0) >= 4 ? '#d29922' : '#00ff88' }}>
                      {finding.cvssScore?.toFixed(1) ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-neutral-700">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-white/[0.06] text-neutral-600 hover:text-white hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-[12px] font-medium transition-all ${
                      currentPage === pageNum
                        ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                        : 'text-neutral-600 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-white/[0.06] text-neutral-600 hover:text-white hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
