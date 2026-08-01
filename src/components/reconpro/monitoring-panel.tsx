'use client';

import { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Calendar,
  FileWarning,
  Zap,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

interface MonitoringData {
  policies: MonitoringPolicy[];
  scheduledRuns: ScheduledRun[];
  alerts: AlertHistory[];
}

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
    case 'full':
      return Server;
    case 'API Surface':
    case 'api':
      return Globe;
    case 'SSL/TLS':
    case 'ssl':
      return Shield;
    case 'DNS Recon':
    case 'dns':
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
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newSchedule, setNewSchedule] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [newScanType, setNewScanType] = useState('full');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring');
      const json = await res.json();
      setData({
        policies: json.policies || [],
        scheduledRuns: json.scheduledRuns || [],
        alerts: json.alerts || [],
      });
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const policies = data?.policies || [];
  const scheduledRuns = data?.scheduledRuns || [];
  const alerts = data?.alerts || [];

  const togglePolicy = async (id: string) => {
    const policy = policies.find((p) => p.id === id);
    if (!policy) return;
    try {
      await fetch('/api/monitoring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !policy.enabled }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle policy:', err);
    }
  };

  const deletePolicy = async (id: string) => {
    try {
      await fetch(`/api/monitoring?id=${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete policy:', err);
    }
  };

  const handleNewPolicy = async () => {
    if (!newName || !newDomain) return;
    try {
      await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          targetDomain: newDomain,
          schedule: newSchedule,
          scanType: newScanType,
        }),
      });
      setAddOpen(false);
      setNewName('');
      setNewDomain('');
      setNewSchedule('daily');
      setNewScanType('full');
      await fetchData();
    } catch (err) {
      console.error('Failed to create policy:', err);
    }
  };

  const handleRunNow = (id: string) => {
    console.log('Run policy now:', id);
  };

  const activePolicies = policies.filter((p) => p.enabled).length;
  const totalFindings = policies.reduce((acc, p) => acc + p.findings, 0);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <p className="text-[#8b949e]">Loading...</p>
      </div>
    );
  }

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
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0d14] font-semibold gap-2">
              <Plus className="w-4 h-4" />
              New Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0d1117] border-[#21262d] text-[#e6edf3]">
            <DialogHeader>
              <DialogTitle className="text-[#e6edf3]">Create Monitoring Policy</DialogTitle>
              <DialogDescription className="text-[#8b949e]">
                Set up automated monitoring for a target domain.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e6edf3]">Policy Name</label>
                <Input
                  placeholder="e.g. Production Infrastructure"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-[#0a0d14] border-[#21262d] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#00ff88]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e6edf3]">Target Domain</label>
                <Input
                  placeholder="e.g. example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="bg-[#0a0d14] border-[#21262d] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#00ff88]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e6edf3]">Schedule</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['hourly', 'daily', 'weekly', 'monthly'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewSchedule(s)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
                        newSchedule === s
                          ? 'bg-[rgba(0,255,136,0.15)] border-[rgba(0,255,136,0.4)] text-[#00ff88]'
                          : 'bg-[#0a0d14] border-[#21262d] text-[#8b949e] hover:border-[#30363d]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e6edf3]">Scan Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['full', 'quick', 'stealth'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewScanType(t)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
                        newScanType === t
                          ? 'bg-[rgba(0,255,136,0.15)] border-[rgba(0,255,136,0.4)] text-[#00ff88]'
                          : 'bg-[#0a0d14] border-[#21262d] text-[#8b949e] hover:border-[#30363d]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)} className="border-[#21262d] text-[#8b949e] hover:bg-[#0a0d14]">
                Cancel
              </Button>
              <Button onClick={handleNewPolicy} className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0d14] font-semibold">
                Create Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Policies', value: activePolicies, icon: Shield, color: '#00ff88', subtitle: `of ${policies.length} total` },
          { label: 'Monitored Assets', value: policies.length, icon: Globe, color: '#58a6ff', subtitle: 'domains & endpoints' },
          { label: 'Alerts Today', value: alerts.filter((a) => a.status === 'new').length, icon: AlertTriangle, color: '#f97316', subtitle: `${totalFindings} findings` },
          { label: 'Uptime', value: policies.length > 0 ? '99.97%' : '—', icon: TrendingUp, color: '#00ff88', subtitle: 'last 30 days' },
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
        {policies.length === 0 ? (
          <div className="rounded-xl border border-[#21262d] bg-[#0d1117] p-8 text-center">
            <Shield className="w-8 h-8 text-[#484f58] mx-auto mb-3" />
            <p className="text-sm text-[#8b949e]">No policies yet. Create one to start monitoring.</p>
          </div>
        ) : (
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
                        <button
                          onClick={() => deletePolicy(policy.id)}
                          className="p-1.5 rounded-md border border-[#21262d] text-[#8b949e] hover:text-[#f85149] hover:border-[rgba(248,81,73,0.3)] hover:bg-[rgba(248,81,73,0.1)] transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                        <p className="text-xs text-[#e6edf3] capitalize">{policy.scanType}</p>
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
        )}
      </motion.div>

      {/* ── Schedule Timeline ─────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#0d1117] overflow-hidden">
        <div className="p-4 border-b border-[#21262d] flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-[rgba(88,166,255,0.1)]">
            <Calendar className="w-4 h-4 text-[#58a6ff]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e6edf3]">Upcoming Schedule</h3>
            <p className="text-xs text-[#8b949e]">Next scheduled monitoring runs</p>
          </div>
        </div>

        <div className="divide-y divide-[#161b22]">
          {scheduledRuns.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-[#484f58]">No upcoming scheduled runs</p>
            </div>
          ) : (
            <AnimatePresence>
              {scheduledRuns.map((run, idx) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.3 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(0,255,136,0.02)] transition-colors"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#58a6ff] animate-pulse" />
                    {idx < scheduledRuns.length - 1 && (
                      <div className="w-px h-6 bg-[#21262d] mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#e6edf3]">{run.policyName}</p>
                    <p className="text-[10px] text-[#484f58] capitalize">{run.type}</p>
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
          )}
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
              <p className="text-xs text-[#8b949e]">Alerts from monitoring policies (last 7 days)</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-[rgba(249,115,22,0.3)] text-[#f97316]">
            {alerts.filter((a) => a.status === 'new').length} new
          </Badge>
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-[#484f58]">No alerts yet. Policies will generate alerts when findings are detected.</p>
            </div>
          ) : (
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
                  {alerts.map((alert, idx) => {
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
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
