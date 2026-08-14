'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug,
  Plus,
  Settings,
  CheckCircle2,
  XCircle,
  Activity,
  ExternalLink,
  Zap,
  ArrowRight,
  Webhook,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Ticket,
  BarChart3,
  Bell,
  Users,
  Clock,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
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

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  letter: string;
  color: string;
  connected: boolean;
  eventCount: string;
  eventType: string;
  lastSync?: string;
  type?: string;
}

interface ActivityEvent {
  id: string;
  integration: string;
  action: string;
  description: string;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
  color: string;
}

// ── Icon mapping ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare,
  Ticket,
  BarChart3,
  Bell,
  Users,
  Webhook,
  Mail,
};

const INTEGRATION_TYPES = [
  { type: 'slack', label: 'Slack', defaultUrl: 'https://hooks.slack.com/services/...' },
  { type: 'jira', label: 'Jira', defaultUrl: 'https://your-domain.atlassian.net' },
  { type: 'splunk', label: 'Splunk', defaultUrl: 'https://your-instance.splunkcloud.com' },
  { type: 'pagerduty', label: 'PagerDuty', defaultUrl: 'https://events.pagerduty.com' },
  { type: 'microsoft_teams', label: 'Microsoft Teams', defaultUrl: 'https://outlook.office.com/webhook/...' },
  { type: 'webhooks', label: 'Webhooks', defaultUrl: 'https://your-server.com/webhook' },
  { type: 'email', label: 'Email', defaultUrl: '' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88]" />;
    case 'error':
      return <XCircle className="w-3.5 h-3.5 text-[#ff3355]" />;
    case 'warning':
      return <Zap className="w-3.5 h-3.5 text-[#d29922]" />;
    default:
      return null;
  }
}

function getIconComponent(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || Plug;
}

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const cardHover = {
  scale: 1.02,
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
};

// ── Component ───────────────────────────────────────────────────────────────

export function IntegrationHub() {
  const [integrations, setIntegrations] = useState<IntegrationCard[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState('slack');
  const [addName, setAddName] = useState('');
  const [addWebhookUrl, setAddWebhookUrl] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/integrations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setIntegrations(json.integrations || []);
      setActivity(json.activity || []);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
      setError('Failed to load integrations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleIntegration = async (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    if (!integration) return;
    try {
      await fetch('/api/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !integration.connected }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle integration:', err);
    }
  };

  const handleAddIntegration = async () => {
    if (!addName) return;
    try {
      const config: Record<string, string> = {};
      if (addWebhookUrl) config.webhookUrl = addWebhookUrl;
      if (addType === 'slack') config.channel = 'security-alerts';

      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: addType, name: addName, config }),
      });
      setAddOpen(false);
      setAddName('');
      setAddWebhookUrl('');
      await fetchData();
    } catch (err) {
      console.error('Failed to create integration:', err);
    }
  };

  const handleConfigure = (id: string) => {
    console.log('Configure integration:', id);
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <p className="text-[#444444]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 py-20">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-zinc-700 text-white hover:bg-zinc-800">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Retry
        </Button>
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
          <div className="p-2 rounded-lg bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.2)]">
            <Plug className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#f0f0f0]">Integration Hub</h2>
            <p className="text-sm text-[#444444]">
              {connectedCount} of {integrations.length} integrations connected
            </p>
          </div>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0d14] font-semibold gap-2">
              <Plus className="w-4 h-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#080b14] border-[#21262d] text-[#f0f0f0]">
            <DialogHeader>
              <DialogTitle className="text-[#f0f0f0]">Add Integration</DialogTitle>
              <DialogDescription className="text-[#444444]">
                Connect a new service to your security pipeline.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#f0f0f0]">Integration Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTEGRATION_TYPES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => setAddType(t.type)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                        addType === t.type
                          ? 'bg-[rgba(52,211,153,0.15)] border-[rgba(52,211,153,0.4)] text-[#00ff88]'
                          : 'bg-[#050710] border-[#21262d] text-[#444444] hover:border-[#30363d]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#f0f0f0]">Name</label>
                <Input
                  placeholder={INTEGRATION_TYPES.find((t) => t.type === addType)?.label || 'Integration name'}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="bg-[#050710] border-[#21262d] text-[#f0f0f0] placeholder:text-[#333333] focus:border-[#00ff88]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#f0f0f0]">Webhook URL</label>
                <Input
                  placeholder={INTEGRATION_TYPES.find((t) => t.type === addType)?.defaultUrl || 'https://...'}
                  value={addWebhookUrl}
                  onChange={(e) => setAddWebhookUrl(e.target.value)}
                  className="bg-[#050710] border-[#21262d] text-[#f0f0f0] placeholder:text-[#333333] focus:border-[#00ff88]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)} className="border-[#21262d] text-[#444444] hover:bg-[#050710]">
                Cancel
              </Button>
              <Button onClick={handleAddIntegration} className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0d14] font-semibold">
                Connect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* ── Integration Cards Grid ──────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.length === 0 ? (
          <div className="col-span-full rounded-xl border border-[#21262d] bg-[#080b14] p-8 text-center">
            <Plug className="w-8 h-8 text-[#333333] mx-auto mb-3" />
            <p className="text-sm text-[#444444]">No integrations configured yet. Click &quot;Add Integration&quot; to get started.</p>
          </div>
        ) : (
          integrations.map((integration, idx) => {
            const IconComp = getIconComponent(integration.icon);
            return (
              <motion.div
                key={integration.id}
                variants={itemVariants}
                whileHover={cardHover}
                className="rounded-xl border border-[#21262d] overflow-hidden transition-shadow relative"
                style={{
                  backgroundColor: 'rgba(13,17,23,0.8)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Glassmorphism top accent */}
                <div
                  className="h-0.5"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${integration.color}, transparent)`,
                    opacity: integration.connected ? 1 : 0.2,
                  }}
                />

                <div className="p-5">
                  {/* Top row: logo + name + status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg relative"
                        style={{
                          backgroundColor: integration.color + '20',
                          boxShadow: integration.connected
                            ? `0 0 20px ${integration.color}20, 0 4px 12px ${integration.color}15`
                            : 'none',
                        }}
                      >
                        <span className="text-lg font-bold" style={{ color: integration.color }}>
                          {integration.letter}
                        </span>
                        {integration.connected && (
                          <div
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#00ff88' }}
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#0a0d14]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#f0f0f0]">{integration.name}</h3>
                        <p className="text-[10px] text-[#444444] leading-relaxed max-w-[200px] truncate">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={integration.connected}
                      onCheckedChange={() => toggleIntegration(integration.id)}
                      className="scale-[0.85] origin-right"
                    />
                  </div>

                  {/* Event stats */}
                  <div className="flex items-center justify-between mb-4">
                    {integration.connected ? (
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-[#444444]" />
                        <span className="text-lg font-bold text-[#f0f0f0]">{integration.eventCount}</span>
                        <span className="text-xs text-[#444444]">{integration.eventType}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#333333] italic">Not connected</span>
                    )}
                    {integration.lastSync && (
                      <div className="flex items-center gap-1 text-[10px] text-[#333333]">
                        <Clock className="w-3 h-3" />
                        {integration.lastSync}
                      </div>
                    )}
                  </div>

                  {/* Configure button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigure(integration.id)}
                    className={`w-full gap-1.5 text-xs font-medium transition-all ${
                      integration.connected
                        ? 'border-[#21262d] text-[#444444] hover:bg-[rgba(52,211,153,0.1)] hover:text-[#00ff88] hover:border-[rgba(52,211,153,0.3)]'
                        : 'border-[#30363d] text-[#333333] hover:bg-[rgba(52,211,153,0.1)] hover:text-[#00ff88]'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {integration.connected ? 'Configure' : 'Connect'}
                    <ArrowRight className="w-3 h-3 ml-auto" />
                  </Button>
                </div>

                {/* Subtle glow effect for connected integrations */}
                {integration.connected && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none opacity-[0.03]"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${integration.color}, transparent 70%)`,
                    }}
                  />
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* ── Activity Log ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#080b14] overflow-hidden">
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-[rgba(52,211,153,0.1)]">
              <Activity className="w-4 h-4 text-[#00ff88]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">Integration Activity</h3>
              <p className="text-xs text-[#444444]">Recent events across all integrations</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-[#21262d] text-[#444444]">
            Live
          </Badge>
        </div>

        <div className="divide-y divide-[#161b22]">
          {activity.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-[#333333]">No activity yet. Events will appear here when integrations are used.</p>
            </div>
          ) : (
            <AnimatePresence>
              {activity.map((event, idx) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.3 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(52,211,153,0.02)] transition-colors"
                >
                  {/* Status icon */}
                  <div className="shrink-0">{getStatusIcon(event.status)}</div>

                  {/* Integration icon */}
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: event.color + '15', color: event.color }}
                  >
                    {event.integration[0]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#f0f0f0]">{event.integration}</span>
                      <span className="text-[10px] text-[#333333]">•</span>
                      <span className="text-[10px] font-medium text-[#444444]">{event.action}</span>
                    </div>
                    <p className="text-[10px] text-[#333333] truncate mt-0.5">{event.description}</p>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-[#333333] shrink-0">
                    <Clock className="w-3 h-3" />
                    <span className="hidden sm:inline">{event.timestamp}</span>
                  </div>

                  {/* Action */}
                  <button className="shrink-0 p-1 rounded-md text-[#333333] hover:text-[#f0f0f0] hover:bg-[rgba(52,211,153,0.1)] transition-all">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
