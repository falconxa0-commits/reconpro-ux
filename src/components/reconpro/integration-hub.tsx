'use client';

import { useState } from 'react';
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
  MessageSquare,
  Ticket,
  BarChart3,
  Bell,
  Users,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

// ── Types ────────────────────────────────────────────────────────────────────

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  letter: string;
  color: string;
  connected: boolean;
  eventCount: string;
  eventType: string;
  lastSync?: string;
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

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockIntegrations: IntegrationCard[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Real-time alerts and notifications to your security channels',
    icon: MessageSquare,
    letter: 'S',
    color: '#E01E5A',
    connected: true,
    eventCount: '234',
    eventType: 'events sent',
    lastSync: '2 min ago',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Automated vulnerability ticket creation and tracking',
    icon: Ticket,
    letter: 'J',
    color: '#0052CC',
    connected: true,
    eventCount: '89',
    eventType: 'issues created',
    lastSync: '15 min ago',
  },
  {
    id: 'splunk',
    name: 'Splunk',
    description: 'Forward security events and logs to Splunk SIEM',
    icon: BarChart3,
    letter: 'S',
    color: '#65A637',
    connected: true,
    eventCount: '1.2M',
    eventType: 'events indexed',
    lastSync: 'Live',
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    description: 'Critical alert escalation and incident management',
    icon: Bell,
    letter: 'P',
    color: '#06AC38',
    connected: true,
    eventCount: '12',
    eventType: 'incidents triggered',
    lastSync: '1h ago',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Collaborate on security findings within Teams channels',
    icon: Users,
    letter: 'T',
    color: '#7B83EB',
    connected: false,
    eventCount: '—',
    eventType: '',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Custom webhook endpoints for event-driven automation',
    icon: Webhook,
    letter: 'W',
    color: '#06b6d4',
    connected: true,
    eventCount: '3',
    eventType: 'active webhooks',
    lastSync: '5 min ago',
  },
];

const mockActivity: ActivityEvent[] = [
  {
    id: 'act-1',
    integration: 'Slack',
    action: 'Alert Sent',
    description: 'Critical TLS certificate expiry warning sent to #security-alerts',
    timestamp: '2 minutes ago',
    status: 'success',
    color: '#E01E5A',
  },
  {
    id: 'act-2',
    integration: 'Jira',
    action: 'Ticket Created',
    description: 'Vulnerability SEC-2847 created for open port 443 on api.stripe.com',
    timestamp: '15 minutes ago',
    status: 'success',
    color: '#0052CC',
  },
  {
    id: 'act-3',
    integration: 'Splunk',
    action: 'Data Forwarded',
    description: '1,247 security events indexed for scan batch #4921',
    timestamp: '28 minutes ago',
    status: 'success',
    color: '#65A637',
  },
  {
    id: 'act-4',
    integration: 'PagerDuty',
    action: 'Incident Escalated',
    description: 'HIGH severity: DNS reconfiguration anomaly on production domain',
    timestamp: '1 hour ago',
    status: 'warning',
    color: '#06AC38',
  },
  {
    id: 'act-5',
    integration: 'Webhooks',
    action: 'Delivery Failed',
    description: 'Webhook endpoint https://hooks.internal/recon returned 503',
    timestamp: '2 hours ago',
    status: 'error',
    color: '#06b6d4',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88]" />;
    case 'error':
      return <XCircle className="w-3.5 h-3.5 text-[#f85149]" />;
    case 'warning':
      return <Zap className="w-3.5 h-3.5 text-[#d29922]" />;
    default:
      return null;
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

export function IntegrationHub() {
  const [integrations, setIntegrations] = useState(mockIntegrations);

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i))
    );
  };

  const handleConfigure = (id: string) => {
    console.log('Configure integration:', id);
  };

  const handleAddIntegration = () => {
    console.log('Add new integration');
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

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
            <Plug className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e6edf3]">Integration Hub</h2>
            <p className="text-sm text-[#8b949e]">
              {connectedCount} of {integrations.length} integrations connected
            </p>
          </div>
        </div>
        <Button onClick={handleAddIntegration} className="bg-[#00ff88] hover:bg-[#00cc6a] text-[#0a0d14] font-semibold gap-2">
          <Plus className="w-4 h-4" />
          Add Integration
        </Button>
      </motion.div>

      {/* ── Integration Cards Grid ──────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((integration, idx) => {
          const IconComp = integration.icon;
          return (
            <motion.div
              key={integration.id}
              variants={itemVariants}
              whileHover={cardHover}
              className="rounded-xl border border-[#21262d] overflow-hidden transition-shadow"
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
                      <h3 className="text-sm font-bold text-[#e6edf3]">{integration.name}</h3>
                      <p className="text-[10px] text-[#8b949e] leading-relaxed max-w-[200px] truncate">
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
                      <Activity className="w-3.5 h-3.5 text-[#8b949e]" />
                      <span className="text-lg font-bold text-[#e6edf3]">{integration.eventCount}</span>
                      <span className="text-xs text-[#8b949e]">{integration.eventType}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#484f58] italic">Not connected</span>
                  )}
                  {integration.lastSync && (
                    <div className="flex items-center gap-1 text-[10px] text-[#484f58]">
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
                      ? 'border-[#21262d] text-[#8b949e] hover:bg-[rgba(0,255,136,0.1)] hover:text-[#00ff88] hover:border-[rgba(0,255,136,0.3)]'
                      : 'border-[#30363d] text-[#484f58] hover:bg-[rgba(0,255,136,0.1)] hover:text-[#00ff88]'
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
        })}
      </motion.div>

      {/* ── Activity Log ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#0d1117] overflow-hidden">
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-[rgba(0,255,136,0.1)]">
              <Activity className="w-4 h-4 text-[#00ff88]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e6edf3]">Integration Activity</h3>
              <p className="text-xs text-[#8b949e]">Last 5 events across all integrations</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-[#21262d] text-[#8b949e]">
            Live
          </Badge>
        </div>

        <div className="divide-y divide-[#161b22]">
          <AnimatePresence>
            {mockActivity.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(0,255,136,0.02)] transition-colors"
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
                    <span className="text-xs font-semibold text-[#e6edf3]">{event.integration}</span>
                    <span className="text-[10px] text-[#484f58]">•</span>
                    <span className="text-[10px] font-medium text-[#8b949e]">{event.action}</span>
                  </div>
                  <p className="text-[10px] text-[#484f58] truncate mt-0.5">{event.description}</p>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-[10px] text-[#484f58] shrink-0">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">{event.timestamp}</span>
                </div>

                {/* Action */}
                <button className="shrink-0 p-1 rounded-md text-[#484f58] hover:text-[#e6edf3] hover:bg-[rgba(0,255,136,0.1)] transition-all">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
