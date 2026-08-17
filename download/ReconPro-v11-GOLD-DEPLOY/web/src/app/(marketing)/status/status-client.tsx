"use client";

import { useEffect, useState, useCallback } from "react";

interface HealthData {
  status: string;
  version: string;
  timestamp: string;
  uptime: number;
  responseTime: number;
  checks: {
    database: string;
  };
}

const componentDefs = [
  { name: "API", description: "REST API endpoints and authentication" },
  { name: "Scanning Engine", description: "Core scanner modules and job processing" },
  { name: "Database", description: "Persistent storage and query engine" },
  { name: "Authentication", description: "API key validation and user auth" },
  { name: "Dashboard", description: "Web dashboard and real-time updates" },
] as const;

const statusColor = {
  operational: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
  unknown: "bg-zinc-500",
};

const statusLabel = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  unknown: "Checking...",
};

const statusTextColor = {
  operational: "text-emerald-400/80",
  degraded: "text-amber-400/80",
  down: "text-red-400/80",
  unknown: "text-zinc-400/80",
};

export default function StatusClient() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState(false);
  const [lastCheck, setLastCheck] = useState("");

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthData = await res.json();
      setHealth(data);
      setError(false);
      setLastCheck(
        new Date().toISOString().replace("T", " ").split(".")[0] + " UTC"
      );
    } catch {
      setError(true);
      setLastCheck(
        new Date().toISOString().replace("T", " ").split(".")[0] + " UTC"
      );
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const overallStatus = error
    ? "down"
    : health?.status === "healthy" && health.checks.database === "ok"
      ? "operational"
      : health?.status === "healthy"
        ? "degraded"
        : "down";

  const componentStatuses = componentDefs.map((c) => {
    if (error) return { ...c, status: "down" as const, latency: "—" };
    if (!health) return { ...c, status: "unknown" as const, latency: "—" };
    if (c.name === "Database") {
      return {
        ...c,
        status: health.checks.database === "ok" ? "operational" as const : "degraded" as const,
        latency: `${health.responseTime}ms`,
      };
    }
    return {
      ...c,
      status: overallStatus as "operational" | "degraded" | "down" | "unknown",
      latency: `${health.responseTime}ms`,
    };
  });

  const allOperational = componentStatuses.every(
    (c) => c.status === "operational"
  );

  return (
    <div className="pt-16">
      <section className="relative py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            {allOperational && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span
                  className={`${statusColor.operational} w-2.5 h-2.5 rounded-full animate-pulse`}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-emerald-400/90">
                  All Systems Operational
                </span>
              </div>
            )}
            {!allOperational && !error && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span
                  className={`${statusColor.degraded} w-2.5 h-2.5 rounded-full animate-pulse`}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-amber-400/90">
                  Partial Degradation
                </span>
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span
                  className={`${statusColor.down} w-2.5 h-2.5 rounded-full`}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-red-400/90">
                  Service Unreachable
                </span>
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-3">
              System Status
            </h1>
            <p className="text-white/40 text-xs">
              {lastCheck
                ? `Last checked: ${lastCheck}`
                : "Checking..."}
            </p>
          </div>

          {/* Summary Banner */}
          <div
            className={`rounded-xl border p-4 mb-12 flex items-center gap-3 ${
              allOperational
                ? "border-emerald-400/10 bg-emerald-400/[0.03]"
                : error
                  ? "border-red-400/10 bg-red-400/[0.03]"
                  : "border-amber-400/10 bg-amber-400/[0.03]"
            }`}
          >
            <span
              className={`${statusColor[overallStatus]} w-2 h-2 rounded-full flex-shrink-0`}
              aria-hidden="true"
            />
            <p className="text-sm text-white/70">
              {allOperational
                ? "All systems are functioning normally. No incidents to report."
                : error
                  ? "Unable to reach the health endpoint. The service may be down."
                  : "Some systems are experiencing issues. See below for details."}
            </p>
          </div>

          {/* Component List */}
          <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-12">
            {componentStatuses.map((component, i) => (
              <div
                key={component.name}
                className={`flex items-center justify-between px-5 py-4 ${
                  i < componentStatuses.length - 1
                    ? "border-b border-white/[0.04]"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`${statusColor[component.status]} w-2 h-2 rounded-full flex-shrink-0`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {component.name}
                    </p>
                    <p className="text-xs text-white/30">
                      {component.description}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p
                    className={`text-xs font-medium ${statusTextColor[component.status]}`}
                  >
                    {statusLabel[component.status]}
                  </p>
                  {component.latency !== "—" && (
                    <p className="text-[11px] font-mono text-white/25">
                      {component.latency} avg
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Version & Uptime */}
          {health && (
            <div className="grid grid-cols-3 gap-4 mb-12">
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-center">
                <p className="text-xs text-white/30 mb-1">Version</p>
                <p className="text-lg font-mono font-semibold text-white/80">
                  {health.version}
                </p>
                <p className="text-[10px] text-white/20">Current release</p>
              </div>
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-center">
                <p className="text-xs text-white/30 mb-1">Uptime</p>
                <p className="text-lg font-mono font-semibold text-white/80">
                  {Math.floor(health.uptime / 3600)}h{" "}
                  {Math.floor((health.uptime % 3600) / 60)}m
                </p>
                <p className="text-[10px] text-white/20">Since last deploy</p>
              </div>
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-center">
                <p className="text-xs text-white/30 mb-1">Response</p>
                <p className="text-lg font-mono font-semibold text-white/80">
                  {health.responseTime}ms
                </p>
                <p className="text-[10px] text-white/20">Health check</p>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="text-center">
            <p className="text-xs text-white/20 leading-relaxed max-w-md mx-auto">
              Status is determined by polling the{" "}
              <code className="text-white/30">/api/health</code> endpoint every
              30 seconds. Database connectivity is verified per check.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
