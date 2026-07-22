'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Clock,
  Globe,
  MonitorCheck,
  Plus,
  Play,
  Shield,
  Server,
  Timer,
  TrendingUp,
  AlertCircle,
  XCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Calendar,
  FileWarning,
  BadgeCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Types ────────────────────────────────────────────────────────────────────

interface MonitoringPolicy {
  id: string;
  name: string;
  schedule: 'hourly' | 'daily' | 'weekly' | 'monthly';
  targetDomain: string;
  scanType: string;
  lastRun: string;
  nextRun: string;
  enabled: boolean;
  runCount: number;
  status: 'active' | 'warning' | 'error' | 'idle';
  findings: number;
}

interface ScheduledRun {
  id: string;
  policyName: string;
  scheduledTime: string;
  type: string;
  status: 'pending' | 'in_progress';
}

interface AlertHistory {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  policy: string;
  description: string;
  status: 'new' | 'acknowledged' | 'resolved';
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockPolicies: MonitoringPolicy[] = [
  {
    id: 'pol-1',
    name: 'Production Infrastructure',
    schedule: 'hourly',
    targetDomain: 'stripe.com',
    scanType: 'Full Infrastructure',
    lastRun: '12 min ago',
    nextRun: '48 min from now',
    enabled: true,
    runCount: 2847,
    status: 'active',
    findings: 3,
  },
  {
    id: 'pol-2',
    name: 'API Security Scan',
    schedule: 'daily',
    targetDomain: 'api.stripe.com',
    scanType: 'API Surface',
    lastRun: '2h ago',
    nextRun: '22h from now',
    enabled: true,
    runCount: 156,
    status: 'active',
    findings: 7,
  },
  {
    id: 'pol-3',
    name: 'Certificate Monitor',
    schedule: 'weekly',
    targetDomain: '*.stripe.com',
    scanType: 'SSL/TLS',
    lastRun: '3d ago',
    nextRun: '4d from now',
    enabled: true,
    runCount: 52,
    status: 'warning',
    findings: 2,
  },
  {
    id: 'pol-4',
    name: 'DNS Integrity Check',
    schedule: 'daily',
    targetDomain: 'stripe.com',
    scanType: 'DNS Recon',
    lastRun: '18h ago',
    nextRun: '6h from now',
    enabled: false,
    runCount: 89,
    status: 'idle',
    findings: 0,
  },
];

const mockSchedule: ScheduledRun[] = [
  {
    id: 'sched-1',
    policyName: 'Production Infrastructure',
    scheduledTime: 'Today, 11:00 PM UTC',
    type: 'Full Infrastructure',
    status: 'pending',
  },
  {
    id: 'sched-2',
    policyName: 'Production Infrastructure',
    scheduledTime: 'Today, 12:00 AM UTC',
    type: 'Full Infrastructure',
    status: 'pending',
  },
  {
    id: 'sched-3',
    policyName: 'DNS Integrity Check',
    scheduledTime: 'Tomorrow, 6:00 AM UTC',
    type: 'DNS Recon',
    status: 'pending',
  },
  {
    id: 'sched-4',
    policyName: 'API Security Scan',
    scheduledTime: 'Tomorrow, 12:00 AM UTC',
    type: 'API Surface',
    status: 'pending',
  },
  {
    id: 'sched-5',
    policyName: 'Certificate Monitor',
    scheduledTime: 'Mon, Jan 29, 2024',
    type: 'SSL/TLS',
    status: 'pending',
  },
];

const mockAlerts: AlertHistory[] = [
  {
    id: 'alert-1',
    severity: 'critical',
    timestamp: '12 min ago',
    policy: 'Production Infrastructure',
    description: 'New open port 8443 detected on 34.201.52.x — potential unauthorized service',
    status: 'new',
  },
  {
    id: 'alert-2',
    severity: 'high',
    timestamp: '2h ago',
    policy: 'API Security Scan',
    description: 'CORS misconfiguration allows wildcard origin on /v2/payment-intents endpoint',
    status: 'new',
  },
  {
    id: 'alert-3',
    severity: 'medium',
    timestamp: '3d ago',
    policy: 'Certificate Monitor',
    description: 'TLS certificate for checkout.stripe.com expires in 14 days',
    status: 'acknowledged',
  },
  {
    id: 'alert-4',
    severity: 'high',
    timestamp: '2d ago',
    policy: 'API Security Scan',
    description: 'Missing rate limiting on /v1/tokens endpoint — abuse potential',
    status: 'acknowledged',
  },
  {
    id: 'alert-5',
    severity: 'low',
    timestamp: '5d ago',
    policy: 'Production Infrastructure',
    description: 'SPF record softfail detected for stripe.com mail configuration',
    status: 'resolved',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        color: '#f85149',
        bg: 'rgba(248,81,73,0.15)',
        border: 'rgba(248,81,73,0.3)',
        icon: XCircle,
        label: 'CRITICAL',
      };
    case 'high':
      return {
        color: '#f97316',
        bg: 'rgba(249,115,22,0.15)',
        border: 'rgba(249,115,22,0.3)',
        icon: AlertTriangle,
        label: 'HIGH',
      };
    case 'medium':
      return {
        color: '#d29922',
        bg: 'rgba(210,153,34,0.15)',
        border: 'rgba(210,153,34,0.3)',
        icon: AlertCircle,
        label: 'MEDIUM',
      };
    case 'low':
      return {
        color: '#58a6ff',
        bg: 'rgba(88,166,255,0.15)',
        border: 'rgba(88,166,255,0.3)',
        icon: FileWarning,
        label: 'LOW',
      };
    default:
      return {
        color: '#8b949e',
        bg: 'rgba(139,148,158,0.15)',
        border: 'rgba(139,148,158,0.3)',
        icon: AlertCircle,
        label: 'INFO',
      };
  }
}

function getScheduleColor(schedule: string): string {
  switch (schedule) {
    case 'hourly':
      return 'bg-[rgba(0,255,136,0.15)] text-[#00ff88] border-[rgba(0,255,136,0.3)]';
    case 'daily':
      return 'bg-[rgba(88,166,255,0.15)] text-[#58a6ff] border-[rgba(88,166,255,0.3)]';
    case 'weekly':
      return 'bg-[rgba(210,153,34,0.15)] text-[#d29922] border-[rgba(210,153,34,0.3)]';
    case 'monthly':
      return 'bg-[rgba(168,85,247,0.15)] text-[#a855f7] border-[rgba(168,85,247,0.3)]';
    default:
      return 'bg-[rgba(139,148,158,0.15)] text-[#8b949e] border-[rgba(139,148,158,0.3)]';
  }
}

function getPolicyStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { color: '#00ff88', label: 'Active' };
    case 'warning':
      return { color: '#d29922', label: 'Warning' };
    case 'error':
      return { color: '#f85149', label: 'Error' };
    case 'idle':
      return { color: '#484f58', label: 'Paused' };
    default:
      return { color: '#484f58', label: 'Unknown' };
  }
}

function getScanTypeIcon(type: string) {
  switch (type) {
    case 'Full Infrastructure':
      return Server;
    case 'API Surface':
      return Globe;
    case 'SSL/TLS':
      return Shield;
    case 'DNS Recon':
      return MonitorCheck;
    default:
      return Activity;
  }
}

function getAlertStatusConfig(status: string) {
  switch (status) {
    case 'new':
      return { color: '#f85149', bg: 'rgba(248,81,73,0.15)', label: 'NEW' };
    case 'acknowledged':
      return { color: '#d29922', bg: 'rgba(210,153,34,0.15)', label: 'ACK' };
    case 'resolved':
      return { color: '#00ff88', bg: 'rgba(0,255,136,0.15)', label: 'FIXED' };
    default:
      return { color: '#484f58', bg: 'rgba(72,79,88,0.15)', label: 'N/A' };
  }
}

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const cardHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

// ── Component ───────────────────────────────────────────────────────────────

export function MonitoringPanel() {
  const [policies, setPolicies] = useState(mockPolicies);

  const togglePolicy = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              enabled: !p.enabled,
              status: !p.enabled ? 'active' : 'idle',
            }
          : p
      )
    );
  };

  const handleNewPolicy = () => {
    console.log('Create new monitoring policy');
  };

  const handleRunNow = (id: string) => {
    console.log('Run policy now:', id);
  };

  const activePolicies = policies.filter((p) => p.enabled).length;
  const totalFindings = policies.reduce((acc, p) => acc + p.findings, 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)]">
            <Activity className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e6edf3]">Continuous Monitoring</h2>
            <p className="text-sm text-[#8b949e]">Automated attack surface surveillance and policy management</p>
          </div>
        </div>
        <Button onClick={handleNewPolicy} className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0d14] font-semibold gap-2">
          <Plus className="w-4 h-4" />
          New Policy
        </Button>
      </motion.div>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Policies', value: activePolicies, icon: Shield, color: '#00ff88', subtitle: `of ${policies.length} total` },
          { label: 'Monitored Assets', value: 12, icon: Globe, color: '#58a6ff', subtitle: 'domains & endpoints' },
          { label: 'Alerts Today', value: 7, icon: AlertTriangle, color: '#f97316', subtitle: `${totalFindings} findings` },
          { label: 'Uptime', value: '99.97%', icon: TrendingUp, color: '#00ff88', subtitle: 'last 30 days' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={cardHover}
            className="rounded-xl border border-[#21262d] bg-[#0d1117] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">{stat.label}</span>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-[#e6edf3]">{stat.value}</p>
            <p className="text-[10px] text-[#484f58] mt-1">{stat.subtitle}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Policy Cards ────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#e6edf3]">Monitoring Policies</h3>
          <span className="text-[10px] text-[#484f58] uppercase tracking-wider">{policies.length} policies</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((policy, idx) => {
            const ScanIcon = getScanTypeIcon(policy.scanType);
            const statusCfg = getPolicyStatusConfig(policy.status);
            return (
              <motion.div
                key={policy.id}
                variants={itemVariants}
                whileHover={cardHover}
                className="rounded-xl border border-[#21262d] bg-[#0d1117] overflow-hidden relative"
              >
                {/* Status indicator bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60" style={{ backgroundColor: statusCfg.color }} />

                <div className="p-5 pt-6">
                  {/* Top row: name + toggle */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: statusCfg.color + '15' }}
                      >
                        <ScanIcon className="w-5 h-5" style={{ color: statusCfg.color }} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#e6edf3]">{policy.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getScheduleColor(policy.schedule)}`}>
                            <Timer className="w-2.5 h-2.5 mr-1" />
                            {policy.schedule}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: statusCfg.color }}
                          />
                          <span className="text-[10px] text-[#8b949e]">{statusCfg.label}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunNow(policy.id)}
                        className="p-1.5 rounded-md border border-[#21262d] text-[#8b949e] hover:text-[#00ff88] hover:border-[rgba(0,255,136,0.3)] hover:bg-[rgba(0,255,136,0.1)] transition-all"
                        title="Run now"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <Switch
                        checked={policy.enabled}
                        onCheckedChange={() => togglePolicy(policy.id)}
                        className="scale-[0.85] origin-right"
                      />
                    </div>
                  </div>

                  {/* Target & scan info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-[#484f58] uppercase tracking-wider">Target</p>
                      <div className="flex items-center gap-1.5 text-xs text-[#e6edf3]">
                        <Globe className="w-3 h-3 text-[#8b949e]" />
                        <span className="font-mono text-[11px]">{policy.targetDomain}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-[#484f58] uppercase tracking-wider">Scan Type</p>
                      <p className="text-xs text-[#e6edf3]">{policy.scanType}</p>
                    </div>
                  </div>

                  {/* Timing row */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-[#484f58] uppercase tracking-wider">Last Run</p>
                      <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                        <Clock className="w-3 h-3" />
                        <span>{policy.lastRun}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-[#484f58] uppercase tracking-wider">Next Run</p>
                      <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                        <Calendar className="w-3 h-3" />
                        <span>{policy.nextRun}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#161b22]">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#e6edf3]">{policy.runCount.toLocaleString()}</p>
                        <p className="text-[10px] text-[#484f58]">Runs</p>
                      </div>
                      <div className="w-px h-6 bg-[#21262d]" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#e6edf3]">{policy.findings}</p>
                        <p className="text-[10px] text-[#484f58]">Findings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 text-[#484f58]" />
                      <span className="text-[10px] text-[#484f58]">Auto-refresh</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Schedule Timeline ─────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#0d1117] overflow-hidden">
        <div className="p-4 border-b border-[#21262d] flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-[rgba(88,166,255,0.1)]">
            <Calendar className="w-4 h-4 text-[#58a6ff]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e6edf3]">Upcoming Schedule</h3>
            <p className="text-xs text-[#8b949e]">Next 5 scheduled monitoring runs</p>
          </div>
        </div>

        <div className="divide-y divide-[#161b22]">
          <AnimatePresence>
            {mockSchedule.map((run, idx) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(0,255,136,0.02)] transition-colors"
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#58a6ff] animate-pulse" />
                  {idx < mockSchedule.length - 1 && (
                    <div className="w-px h-6 bg-[#21262d] mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#e6edf3]">{run.policyName}</p>
                  <p className="text-[10px] text-[#484f58]">{run.type}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-[rgba(88,166,255,0.3)] text-[#58a6ff]"
                  >
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    {run.scheduledTime}
                  </Badge>
                  <span
                    className={`text-[10px] font-medium ${
                      run.status === 'in_progress' ? 'text-[#d29922]' : 'text-[#484f58]'
                    }`}
                  >
                    {run.status === 'in_progress' ? 'Running' : 'Queued'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Alert History Table ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#0d1117] overflow-hidden">
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-[rgba(249,115,22,0.1)]">
              <AlertTriangle className="w-4 h-4 text-[#f97316]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e6edf3]">Alert History</h3>
              <p className="text-xs text-[#8b949e]">Last 5 alerts from monitoring policies</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-[rgba(249,115,22,0.3)] text-[#f97316]">
            {mockAlerts.filter((a) => a.status === 'new').length} new
          </Badge>
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#21262d] hover:bg-transparent">
                <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider">Severity</TableHead>
                <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Time</TableHead>
                <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider">Policy</TableHead>
                <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider">Description</TableHead>
                <TableHead className="text-[#8b949e] font-medium text-xs uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {mockAlerts.map((alert, idx) => {
                  const sevCfg = getSeverityConfig(alert.severity);
                  const SevIcon = sevCfg.icon;
                  const alertStatusCfg = getAlertStatusConfig(alert.status);

                  return (
                    <motion.tr
                      key={alert.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-[#161b22] hover:bg-[rgba(0,255,136,0.02)] transition-colors"
                    >
                      <TableCell className="py-3">
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                          style={{
                            backgroundColor: sevCfg.bg,
                            borderColor: sevCfg.border,
                            color: sevCfg.color,
                          }}
                        >
                          <SevIcon className="w-3 h-3" />
                          {sevCfg.label}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                          <Clock className="w-3 h-3" />
                          {alert.timestamp}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-xs text-[#e6edf3]">{alert.policy}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-xs text-[#8b949e] max-w-[300px] truncate">{alert.description}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: alertStatusCfg.bg,
                            color: alertStatusCfg.color,
                          }}
                        >
                          {alert.status === 'new' && <Zap className="w-2.5 h-2.5 mr-1" />}
                          {alert.status === 'acknowledged' && <AlertCircle className="w-2.5 h-2.5 mr-1" />}
                          {alert.status === 'resolved' && <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
                          {alertStatusCfg.label}
                        </span>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </motion.div>
  );
}
