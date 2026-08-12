"use client";

import { useState } from "react";
import {
  Globe,
  Search,
  Radio,
  Shield,
  Folder,
  Network,
  FileCode,
  Bug,
  MapPin,
  Mail,
  HardDrive,
  Wifi,
  Cpu,
  FileText,
  Database,
  Key,
  type LucideIcon,
} from "lucide-react";
import { scannerModules, type ScannerModule } from "@/data/content";
import { useInView } from "@/hooks/useInView";

// ── Icon Mapping ───────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  globe: Globe,
  search: Search,
  radio: Radio,
  shield: Shield,
  folder: Folder,
  network: Network,
  "file-code": FileCode,
  bug: Bug,
  "map-pin": MapPin,
  mail: Mail,
  "hard-drive": HardDrive,
  wifi: Wifi,
  cpu: Cpu,
  "file-text": FileText,
  database: Database,
  key: Key,
};

// ── Filter type ────────────────────────────────────────────

type FilterType = "all" | "remote" | "local";

const filters: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Remote (10)", value: "remote" },
  { label: "Local (6)", value: "local" },
];

// ── Status badge config ────────────────────────────────────

const statusConfig: Record<
  ScannerModule["status"],
  { label: string; className: string }
> = {
  stable: {
    label: "stable",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  beta: {
    label: "beta",
    className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  },
  experimental: {
    label: "experimental",
    className: "border-white/20 bg-white/10 text-white/40",
  },
};

// ── Component ───────────────────────────────────────────────

export function ModulesSection() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { ref, isInView } = useInView(0.05);

  return (
    <section id="modules" className="relative bg-black px-4 py-32 sm:px-6 lg:px-8">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/3 h-[700px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.012] blur-3xl" />
      </div>

      <div ref={ref} className="relative mx-auto max-w-7xl">
        {/* ── Header ────────────────────────────────────── */}
        <div
          className={`mb-6 text-center transition-all duration-700 ${
            isInView
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0"
          }`}
        >
          <h2 className="text-gradient-void text-4xl font-semibold tracking-tight sm:text-5xl">
            Scanner Modules
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/40">
            16 precision instruments. Complete coverage.
          </p>
        </div>

        {/* ── Summary Stats ─────────────────────────────── */}
        <div
          className={`mb-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/20 transition-all duration-700 delay-100 ${
            isInView
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <span>
            <span className="text-white/50 font-medium">10</span> Remote
          </span>
          <span className="text-white/10">·</span>
          <span>
            <span className="text-white/50 font-medium">6</span> Local
          </span>
          <span className="text-white/10">·</span>
          <span>
            <span className="text-emerald-400/60 font-medium">14</span>{" "}
            Stable
          </span>
          <span className="text-white/10">·</span>
          <span>
            <span className="text-yellow-400/60 font-medium">2</span> Beta
          </span>
        </div>

        {/* ── Filter Tabs ───────────────────────────────── */}
        <div
          className={`mb-12 flex items-center justify-center gap-2 transition-all duration-700 delay-150 ${
            isInView
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
          role="radiogroup"
          aria-label="Filter scanner modules"
        >
          {filters.map((f) => {
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                role="radio"
                aria-checked={isActive}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide transition-all duration-200 ${
                  isActive
                    ? "border-white/20 bg-white/10 text-white/80"
                    : "border-white/[0.06] bg-transparent text-white/30 hover:border-white/10 hover:text-white/50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── Remote Modules Subsection ─────────────────── */}
        {(filter === "all" || filter === "remote") && (
          <div id="modules-remote" className="mb-16">
            {filter === "all" && (
              <h3
                className={`mb-6 text-xs font-medium uppercase tracking-[0.2em] text-white/20 transition-all duration-700 delay-200 ${
                  isInView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                }`}
              >
                Remote Scanners
              </h3>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scannerModules
                .filter((m) => m.type === "remote")
                .map((module, i) => (
                  <ModuleCard
                    key={module.name}
                    module={module}
                    index={i}
                    isInView={isInView}
                  />
                ))}
            </div>
          </div>
        )}

        {/* ── Local Modules Subsection ──────────────────── */}
        {(filter === "all" || filter === "local") && (
          <div id="modules-local">
            {filter === "all" && (
              <h3
                className={`mb-6 text-xs font-medium uppercase tracking-[0.2em] text-white/20 transition-all duration-700 delay-200 ${
                  isInView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                }`}
              >
                Local Scanners
              </h3>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scannerModules
                .filter((m) => m.type === "local")
                .map((module, i) => (
                  <ModuleCard
                    key={module.name}
                    module={module}
                    index={i}
                    isInView={isInView}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Module Card ─────────────────────────────────────────────

function ModuleCard({
  module,
  index,
  isInView,
}: {
  module: ScannerModule;
  index: number;
  isInView: boolean;
}) {
  const Icon = iconMap[module.icon] ?? Globe;
  const status = statusConfig[module.status];
  const delay = 200 + index * 60;

  return (
    <div
      className={`bento-tile glass-hover group relative flex flex-col border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-700 ${
        isInView
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* ── Top row: icon + badges ──────────────────── */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <Icon
            className="h-5 w-5 text-white/40"
            strokeWidth={1.5}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
            {module.type}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* ── Name ──────────────────────────────────────── */}
      <h3 className="text-sm font-medium leading-tight text-white">
        {module.name}
      </h3>

      {/* ── Description ───────────────────────────────── */}
      <p className="mt-1.5 text-sm leading-relaxed text-white/40">
        {module.description}
      </p>

      {/* ── Capabilities ──────────────────────────────── */}
      <ul className="mt-4 flex flex-col gap-1.5 border-t border-white/[0.04] pt-4">
        {module.capabilities.map((cap) => (
          <li
            key={cap}
            className="flex items-start gap-2 text-xs text-white/20"
          >
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/20" />
            <span>{cap}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
