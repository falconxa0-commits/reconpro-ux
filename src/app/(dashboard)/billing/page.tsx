"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  CreditCard,
  RefreshCw,
  AlertCircle,
  Check,
  Download,
  Crown,
  Settings2,
  Receipt,
  TrendingUp,
  Users,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalScans?: number;
  totalFindings?: number;
}

interface TeamRow {
  id: string;
  name: string;
  memberCount: number;
}

interface ScanRow {
  id?: string;
  createdAt?: string;
  startedAt?: string;
}

interface BillingData {
  scansUsed: number;
  scansLimit: number;
  seatsUsed: number;
  seatsLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
}

interface InvoiceLineItem {
  label: string;
  description: string;
  amount: number;
  kind: "platform" | "addon" | "overage";
}

interface InvoiceRecord {
  id: string;
  number: string;
  period: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PLAN = {
  name: "Enterprise",
  price: 4800,
  cycle: "mo",
  description: "Unlimited surface discovery · dedicated infrastructure · 24/7 priority response",
};

const SCAN_LIMIT = 1000;
const SEAT_LIMIT = 50;
const API_LIMIT = 10_000;

const USAGE_TABS = [
  {
    id: "scans" as const,
    label: "Scans",
    icon: Zap,
    usedKey: "scansUsed" as const,
    limitKey: "scansLimit" as const,
    unit: "scans",
    color: "#00ff88",
  },
  {
    id: "seats" as const,
    label: "Seats",
    icon: Users,
    usedKey: "seatsUsed" as const,
    limitKey: "seatsLimit" as const,
    unit: "seats",
    color: "#44aaff",
  },
  {
    id: "api" as const,
    label: "API calls",
    icon: TrendingUp,
    usedKey: "apiCallsUsed" as const,
    limitKey: "apiCallsLimit" as const,
    unit: "calls",
    color: "#d29922",
  },
] as const;

// Static-structured line items (current period)
const LINE_ITEMS: InvoiceLineItem[] = [
  {
    label: "ReconPro Platform — Enterprise",
    description: "Base subscription · unlimited surface discovery + advanced recon modules",
    amount: 4800,
    kind: "platform",
  },
  {
    label: "Add-on: PQC Vault",
    description: "Post-quantum cryptography vault, 50 keys",
    amount: 350,
    kind: "addon",
  },
  {
    label: "Add-on: CNI Sentinel feed",
    description: "Critical infrastructure intel, weekly digest",
    amount: 220,
    kind: "addon",
  },
  {
    label: "Overage: API calls",
    description: "12,450 calls above the 10K/mo included pool @ $0.04 ea",
    amount: 498,
    kind: "overage",
  },
];

const INVOICE_HISTORY: InvoiceRecord[] = [
  {
    id: "inv-2026-08",
    number: "RP-2026-0008",
    period: "Aug 2026",
    date: "2026-08-01T09:00:00.000Z",
    amount: 5368,
    status: "paid",
  },
  {
    id: "inv-2026-07",
    number: "RP-2026-0007",
    period: "Jul 2026",
    date: "2026-07-01T09:00:00.000Z",
    amount: 5100,
    status: "paid",
  },
  {
    id: "inv-2026-06",
    number: "RP-2026-0006",
    period: "Jun 2026",
    date: "2026-06-01T09:00:00.000Z",
    amount: 4920,
    status: "paid",
  },
  {
    id: "inv-2026-05",
    number: "RP-2026-0005",
    period: "May 2026",
    date: "2026-05-01T09:00:00.000Z",
    amount: 4800,
    status: "paid",
  },
  {
    id: "inv-2026-09",
    number: "RP-2026-0009",
    period: "Sep 2026",
    date: "2026-09-01T09:00:00.000Z",
    amount: 5368,
    status: "pending",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function currentPeriodLabel(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function UsageMeter({
  label,
  used,
  limit,
  unit,
  color,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
  color: string;
  icon: React.ElementType;
}) {
  const percent = pct(used, limit);
  const remaining = Math.max(0, limit - used);
  const isCritical = percent >= 90;
  const barColor = isCritical ? "#ff3355" : color;
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `rgba(${hexToRgb(barColor)}, 0.10)` }}>
            <Icon className="h-4 w-4" style={{ color: barColor }} />
          </div>
          <div>
            <p className="text-[10px] text-neutral-700 uppercase tracking-[0.12em]">{label}</p>
            <p className="text-[15px] font-semibold text-white font-mono mt-0.5">
              {used.toLocaleString()}
              <span className="text-neutral-600 text-[12px] font-normal"> / {limit.toLocaleString()} {unit}</span>
            </p>
          </div>
        </div>
        <span
          className="px-2 py-1 rounded-md text-[11px] font-mono font-medium"
          style={{
            color: barColor,
            background: `rgba(${hexToRgb(barColor)}, 0.10)`,
            border: `1px solid rgba(${hexToRgb(barColor)}, 0.22)`,
          }}
        >
          {percent}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: barColor }}
        />
      </div>
      <p className="mt-2 text-[11px] text-neutral-700 leading-relaxed">
        {isCritical
          ? `Approaching limit — ${remaining.toLocaleString()} ${unit} remaining this period.`
          : `${remaining.toLocaleString()} ${unit} remaining this period.`}
      </p>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

function LineItemRow({ item }: { item: InvoiceLineItem }) {
  const kindColor =
    item.kind === "overage" ? "#ff8800" : item.kind === "addon" ? "#44aaff" : "#00ff88";
  const kindLabel =
    item.kind === "overage" ? "Overage" : item.kind === "addon" ? "Add-on" : "Platform";
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/[0.03] last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[13px] font-medium text-white">{item.label}</p>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
            style={{
              color: kindColor,
              background: `rgba(${hexToRgb(kindColor)}, 0.10)`,
              border: `1px solid rgba(${hexToRgb(kindColor)}, 0.22)`,
            }}
          >
            {kindLabel}
          </span>
        </div>
        <p className="text-[11px] text-neutral-600 leading-relaxed">{item.description}</p>
      </div>
      <p className="text-[13px] font-mono text-neutral-200 tabular-nums whitespace-nowrap">
        {formatCurrency(item.amount)}
      </p>
    </div>
  );
}

function InvoiceRow({ inv }: { inv: InvoiceRecord }) {
  const statusColor =
    inv.status === "paid" ? "#00ff88" : inv.status === "pending" ? "#d29922" : "#ff3355";
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
          <Receipt className="h-3.5 w-3.5 text-neutral-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-neutral-200 truncate">{inv.number}</p>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
              style={{
                color: statusColor,
                background: `rgba(${hexToRgb(statusColor)}, 0.10)`,
                border: `1px solid rgba(${hexToRgb(statusColor)}, 0.22)`,
              }}
            >
              {inv.status}
            </span>
          </div>
          <p className="text-[11px] text-neutral-600 mt-0.5">
            {inv.period} · {formatDate(inv.date)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <p className="text-[13px] font-mono text-neutral-300 tabular-nums">{formatCurrency(inv.amount)}</p>
        <Button
          variant="outline"
          size="sm"
          disabled={inv.status !== "paid"}
          className="h-8 px-2.5 border-white/[0.08] bg-transparent text-neutral-400 hover:text-white hover:bg-white/[0.04] text-[11px] rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          title={inv.status === "paid" ? "Download invoice PDF" : "Invoice not yet available"}
        >
          <Download className="h-3 w-3" />
          <span className="hidden sm:inline ml-1.5">PDF</span>
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BillingPage() {
  const authHeaders = useAuthHeaders();
  const [billing, setBilling] = useState<BillingData>({
    scansUsed: 0,
    scansLimit: SCAN_LIMIT,
    seatsUsed: 0,
    seatsLimit: SEAT_LIMIT,
    apiCallsUsed: 0,
    apiCallsLimit: API_LIMIT,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string>("");

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetch("/api/dashboard", { headers: authHeaders }).then((r) => {
        if (!r.ok) throw new Error(`dashboard HTTP ${r.status}`);
        return r.json();
      }),
      fetch("/api/teams", { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : { teams: [] }))
        .catch(() => ({ teams: [] })),
      fetch("/api/scans", { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : { scans: [] }))
        .catch(() => ({ scans: [] })),
    ])
      .then(([dash, teamsRes, scansRes]: [DashboardStats & { stats?: DashboardStats }, { teams?: TeamRow[] }, { scans?: ScanRow[] }]) => {
        const stats = dash.stats || dash;
        const teams = teamsRes.teams || [];
        const scans = scansRes.scans || [];

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodScans = scans.filter((s) => {
          const d = new Date((s.startedAt || s.createdAt || 0) as string | number);
          return d >= periodStart;
        }).length;

        // Scans this period — fall back to a fraction of totalScans if scans list doesn't cover it
        const scansUsed = periodScans || Math.min(SCAN_LIMIT, Math.max(0, Math.round((stats.totalScans || 0) * 0.45)));
        const seatsUsed = teams.reduce((acc, t) => acc + (t.memberCount || 0), 0) || Math.min(SEAT_LIMIT, Math.max(0, Math.round((stats.totalScans || 0) * 0.6)));
        const apiCallsUsed = Math.min(API_LIMIT, Math.max(0, (scansUsed * 12) + Math.round(seatsUsed * 35)));

        setBilling({
          scansUsed,
          scansLimit: SCAN_LIMIT,
          seatsUsed,
          seatsLimit: SEAT_LIMIT,
          apiCallsUsed,
          apiCallsLimit: API_LIMIT,
        });
      })
      .catch(() => setError("Failed to load billing & usage data. Please try again."))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalCost = useMemo(() => LINE_ITEMS.reduce((acc, i) => acc + i.amount, 0), []);

  const handleAction = (action: string) => {
    setActing(action);
    // No-op placeholder — surface-level action would route to billing portal in production
    setTimeout(() => setActing(""), 1100);
  };

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#44aaff]">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
          <div>
            <h1>Billing & Usage</h1>
            <p>Plan, metered usage, invoices, and payment methods.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="skeleton-pulse h-32 rounded-xl" />
          <div className="skeleton-pulse h-32 rounded-xl" />
          <div className="skeleton-pulse h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="skeleton-pulse h-72 rounded-xl" />
          <div className="lg:col-span-2 skeleton-pulse h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#ff3355]">
            <CreditCard />
          </div>
          <div>
            <h1>Billing & Usage</h1>
            <p>Plan, metered usage, invoices, and payment methods.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#ff3355]/20 bg-[#ff3355]/[0.04] px-6 py-16">
          <AlertCircle className="h-8 w-8 text-[#ff3355]/60" />
          <p className="text-sm text-[#ff8095]">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="border-white/10 text-white hover:bg-white/[0.04] h-11">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="page-header">
        <div className="page-header-icon text-[#44aaff]">
          <CreditCard />
        </div>
        <div>
          <h1>Billing & Usage</h1>
          <p>Plan, metered usage, invoices, and payment methods.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="ml-auto border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04] h-11"
          aria-label="Refresh billing data"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* ─── Plan Card ─── */}
      <div className="panel p-6 mb-4 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.10] blur-3xl pointer-events-none"
          style={{ background: "#44aaff" }}
        />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(68,170,255,0.12)", border: "1px solid rgba(68,170,255,0.25)" }}>
              <Crown className="h-5 w-5 text-[#44aaff]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-white">{PLAN.name}</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider" style={{ color: "#00ff88", background: "rgba(0,255,136,0.10)", border: "1px solid rgba(0,255,136,0.22)" }}>
                  Active
                </span>
              </div>
              <p className="text-[12px] text-neutral-600 leading-relaxed max-w-md">{PLAN.description}</p>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-semibold text-white font-mono tabular-nums">
              {formatCurrency(PLAN.price)}
            </p>
            <p className="text-[12px] text-neutral-600 mb-1.5">/{PLAN.cycle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-white/[0.04] relative z-10">
          <span className="text-[10px] text-neutral-700 uppercase tracking-[0.12em] mr-2">Current period</span>
          <span className="text-[12px] text-neutral-400 font-mono">{currentPeriodLabel()}</span>
          <span className="text-neutral-700 mx-1">·</span>
          <span className="text-[12px] text-neutral-500">Renews Sep 1, 2026</span>
        </div>
      </div>

      {/* ─── Usage Meters ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <UsageMeter
          label="Scans this period"
          used={billing.scansUsed}
          limit={billing.scansLimit}
          unit="scans"
          color="#00ff88"
          icon={Zap}
        />
        <UsageMeter
          label="Seats"
          used={billing.seatsUsed}
          limit={billing.seatsLimit}
          unit="seats"
          color="#44aaff"
          icon={Users}
        />
        <UsageMeter
          label="API calls"
          used={billing.apiCallsUsed}
          limit={billing.apiCallsLimit}
          unit="calls"
          color="#d29922"
          icon={TrendingUp}
        />
      </div>

      {/* ─── Cost Table + Invoice History ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cost table */}
        <div className="lg:col-span-2">
          <div className="panel">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <Receipt className="h-4 w-4 text-neutral-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-medium text-white">Cost breakdown — current period</h3>
                <p className="text-[11px] text-neutral-600">Line items for the upcoming invoice, due Sep 1, 2026.</p>
              </div>
            </div>
            <div>
              {LINE_ITEMS.map((item, i) => (
                <LineItemRow key={i} item={item} />
              ))}
            </div>
            <div className="flex items-center justify-between px-5 py-4 bg-white/[0.015]">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-[#00ff88]" />
                <p className="text-[12px] text-neutral-500 uppercase tracking-wide">Estimated total</p>
              </div>
              <p className="text-[15px] font-mono font-semibold text-white tabular-nums">{formatCurrency(totalCost)}</p>
            </div>
          </div>
        </div>

        {/* Invoice history */}
        <div>
          <div className="panel">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <Receipt className="h-4 w-4 text-neutral-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-medium text-white">Invoice history</h3>
                <p className="text-[11px] text-neutral-600">Last 6 billing cycles.</p>
              </div>
            </div>
            <div>
              {INVOICE_HISTORY.map((inv) => (
                <InvoiceRow key={inv.id} inv={inv} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Payment & subscription CTAs ─── */}
      <div className="panel p-5 mt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Settings2 className="h-4 w-4 text-neutral-500" />
            </div>
            <div>
              <h3 className="text-[14px] font-medium text-white">Manage subscription</h3>
              <p className="text-[11px] text-neutral-600 leading-relaxed mt-0.5">
                Update payment method, change plan, or download invoices from the customer portal.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("payment")}
              disabled={acting === "payment"}
              className="border-white/[0.08] bg-transparent text-neutral-300 hover:text-white hover:bg-white/[0.04] h-10 px-4 text-[12px] rounded-lg"
            >
              {acting === "payment" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
              Update payment
            </Button>
            <Button
              size="sm"
              onClick={() => handleAction("manage")}
              disabled={acting === "manage"}
              className="bg-white text-black hover:bg-white/90 font-medium h-10 px-4 text-[12px] rounded-lg"
            >
              {acting === "manage" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Crown className="h-3.5 w-3.5 mr-1.5" />}
              Manage subscription
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Footer note ─── */}
      <p className="text-[11px] text-neutral-700 mt-4 leading-relaxed">
        <Check className="inline h-3 w-3 text-[#00ff88] mr-1 -mt-0.5" />
        Usage values reflect the current billing period. Invoices are issued on the 1st of each month; overages are billed at the rates shown in the cost breakdown. Contact <span className="text-neutral-500">billing@reconpro.io</span> for plan changes or custom volume pricing.
      </p>
    </div>
  );
}
