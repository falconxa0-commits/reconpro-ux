"use client";

import { useEffect, useState } from "react";

interface SystemComponent {
  name: string;
  status: "operational" | "degraded" | "down";
  latency: string;
  uptime: string;
  description: string;
}

const components: SystemComponent[] = [
  {
    name: "API",
    status: "operational",
    latency: "23ms",
    uptime: "99.98%",
    description: "REST API endpoints and authentication",
  },
  {
    name: "Scanning Engine",
    status: "operational",
    latency: "12ms",
    uptime: "99.97%",
    description: "Core scanner modules and job processing",
  },
  {
    name: "Database",
    status: "operational",
    latency: "4ms",
    uptime: "99.99%",
    description: "Persistent storage and query engine",
  },
  {
    name: "Authentication",
    status: "operational",
    latency: "8ms",
    uptime: "99.99%",
    description: "API key validation and user auth",
  },
  {
    name: "Webhook Delivery",
    status: "operational",
    latency: "45ms",
    uptime: "99.95%",
    description: "Outbound webhook notifications",
  },
  {
    name: "Dashboard",
    status: "operational",
    latency: "18ms",
    uptime: "99.96%",
    description: "Web dashboard and real-time updates",
  },
];

const statusColor = {
  operational: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

const statusLabel = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
};

const statusTextColor = {
  operational: "text-emerald-400/80",
  degraded: "text-amber-400/80",
  down: "text-red-400/80",
};

export default function StatusClient() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(new Date().toISOString().replace("T", " ").split(".")[0] + " UTC");
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = components.every(
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
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-3">
              System Status
            </h1>
            <p className="text-white/40 text-xs">
              Last checked: {time}
            </p>
          </div>

          {/* Summary Banner */}
          <div
            className={`rounded-xl border p-4 mb-12 flex items-center gap-3 ${
              allOperational
                ? "border-emerald-400/10 bg-emerald-400/[0.03]"
                : "border-amber-400/10 bg-amber-400/[0.03]"
            }`}
          >
            <span
              className={`${statusColor[allOperational ? "operational" : "degraded"]} w-2 h-2 rounded-full flex-shrink-0`}
              aria-hidden="true"
            />
            <p className="text-sm text-white/70">
              {allOperational
                ? "All systems are functioning normally. No incidents to report."
                : "Some systems are experiencing issues. See below for details."}
            </p>
          </div>

          {/* Component List */}
          <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-12">
            {components.map((component, i) => (
              <div
                key={component.name}
                className={`flex items-center justify-between px-5 py-4 ${
                  i < components.length - 1
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
                  <p className="text-[11px] font-mono text-white/25">
                    {component.latency} avg
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Uptime Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
            {components.map((c) => (
              <div
                key={c.name}
                className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-center"
              >
                <p className="text-xs text-white/30 mb-1">{c.name}</p>
                <p className="text-lg font-mono font-semibold text-white/80">
                  {c.uptime}
                </p>
                <p className="text-[10px] text-white/20">30-day uptime</p>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="text-center">
            <p className="text-xs text-white/20 leading-relaxed max-w-md mx-auto">
              This is a static status page. In production, status data would be
              polled from a monitoring endpoint at regular intervals. The values
              shown are representative defaults.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
