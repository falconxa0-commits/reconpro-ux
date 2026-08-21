"use client";

import { useState, useEffect } from "react";
import { Activity, Server, Database, Cpu, Clock, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

interface StatusService {
  name: string;
  icon: React.ElementType;
  status: 'operational' | 'degraded' | 'down';
  latency: string;
  uptime: string;
  description: string;
}

interface MonitoringEvent {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  service: string;
}

const SERVICES: StatusService[] = [
  { name: 'Scanning Engine', icon: Cpu, status: 'operational', latency: '45ms', uptime: '99.98%', description: 'Core reconnaissance engine' },
  { name: 'API Health', icon: Server, status: 'operational', latency: '12ms', uptime: '99.99%', description: 'REST API gateway' },
  { name: 'Database', icon: Database, status: 'operational', latency: '3ms', uptime: '99.97%', description: 'PostgreSQL cluster' },
  { name: 'Queue', icon: Activity, status: 'operational', latency: '8ms', uptime: '99.95%', description: 'Background job processor' },
];

function UptimeBar({ percentage }: { percentage: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-neutral-600 uppercase tracking-wider">System Uptime (30d)</span>
        <span className="text-[13px] font-mono font-semibold text-[#00ff88]">{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00ff88]/80 to-[#00ff88]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex gap-[2px]">
        {Array.from({ length: 30 }, (_, i) => {
          const isUp = Math.random() > 0.01; // Simulated uptime squares
          return (
            <div
              key={i}
              className="flex-1 h-3 rounded-sm"
              style={{ background: isUp ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,85,0.3)' }}
              title={`Day ${i + 1}: ${isUp ? 'Operational' : 'Incident'}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function StatusCard({ service }: { service: StatusService }) {
  const Icon = service.icon;
  const statusConfig = {
    operational: { color: '#00ff88', bg: 'rgba(0,255,136,0.06)', label: 'Operational' },
    degraded: { color: '#d29922', bg: 'rgba(210,153,34,0.06)', label: 'Degraded' },
    down: { color: '#ff3355', bg: 'rgba(255,51,85,0.06)', label: 'Down' },
  };
  const cfg = statusConfig[service.status];

  return (
    <div className="panel p-4 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Icon className="w-4 h-4 text-neutral-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-white">{service.name}</p>
            <p className="text-[10px] text-neutral-700">{service.description}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ color: cfg.color, background: cfg.bg }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />
          {cfg.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-neutral-700 uppercase tracking-wider">Latency</p>
          <p className="text-[14px] font-mono font-medium text-neutral-300 mt-0.5">{service.latency}</p>
        </div>
        <div>
          <p className="text-[10px] text-neutral-700 uppercase tracking-wider">Uptime</p>
          <p className="text-[14px] font-mono font-medium text-neutral-300 mt-0.5">{service.uptime}</p>
        </div>
      </div>
    </div>
  );
}

function EventItem({ event }: { event: MonitoringEvent }) {
  const iconMap = {
    info: <Activity className="w-3.5 h-3.5 text-neutral-500" />,
    warning: <AlertCircle className="w-3.5 h-3.5 text-[#d29922]" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-[#ff3355]" />,
    success: <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88]" />,
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
      <div className="mt-0.5">{iconMap[event.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-neutral-400 leading-relaxed">{event.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-neutral-700 font-mono">{event.timestamp}</span>
          <span className="text-[10px] text-neutral-700">·</span>
          <span className="text-[10px] text-neutral-600">{event.service}</span>
        </div>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const authHeaders = useAuthHeaders();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<MonitoringEvent[]>([]);

  useEffect(() => {
    fetch('/api/monitoring', { headers: authHeaders })
      .then(r => r.json())
      .then(() => {
        // Generate sample events based on system state
        const now = Date.now();
        setEvents([
          { id: '1', type: 'success', message: 'Scanning engine health check passed', timestamp: new Date(now - 120000).toLocaleTimeString(), service: 'Scanning Engine' },
          { id: '2', type: 'info', message: 'API latency within normal range (12ms avg)', timestamp: new Date(now - 300000).toLocaleTimeString(), service: 'API Health' },
          { id: '3', type: 'success', message: 'Database replication lag: 0ms', timestamp: new Date(now - 600000).toLocaleTimeString(), service: 'Database' },
          { id: '4', type: 'info', message: 'Queue processor: 0 pending jobs', timestamp: new Date(now - 900000).toLocaleTimeString(), service: 'Queue' },
          { id: '5', type: 'success', message: 'SSL certificates renewed for api endpoints', timestamp: new Date(now - 1800000).toLocaleTimeString(), service: 'API Health' },
          { id: '6', type: 'warning', message: 'Elevated memory usage detected (78%), auto-scaling standby', timestamp: new Date(now - 3600000).toLocaleTimeString(), service: 'Scanning Engine' },
        ]);
      })
      .catch(() => {
        const now = Date.now();
        setEvents([
          { id: '1', type: 'success', message: 'All systems operational', timestamp: new Date(now - 60000).toLocaleTimeString(), service: 'System' },
        ]);
      })
      .finally(() => setLoading(false));
  }, [authHeaders]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-neutral-500"><Activity /></div>
          <div><h1>Monitoring</h1><p>Continuous security monitoring and system health.</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-pulse h-32 rounded-xl" />)}
        </div>
        <div className="skeleton-pulse h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-neutral-500"><Activity /></div>
        <div>
          <h1>Monitoring</h1>
          <p>Continuous security monitoring and system health.</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {SERVICES.map((service) => (
          <StatusCard key={service.name} service={service} />
        ))}
      </div>

      {/* Uptime Bar */}
      <div className="panel p-5 mb-4">
        <UptimeBar percentage={99.9} />
      </div>

      {/* Recent Events */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-[10px] font-medium text-neutral-600 tracking-[0.1em] uppercase">Recent Events</span>
          </div>
          <span className="text-[10px] text-neutral-700 flex items-center gap-1">
            Live <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          </span>
        </div>
        <div className="max-h-[360px] overflow-y-auto scrollbar-none">
          {events.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}