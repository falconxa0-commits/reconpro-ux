"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Puzzle, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  category: string;
  lastSync?: string;
}

const INTEGRATIONS: Integration[] = [
  { id: 'slack', name: 'Slack', description: 'Send alerts and findings to Slack channels in real-time', icon: '💬', connected: false, category: 'Notifications' },
  { id: 'jira', name: 'Jira', description: 'Auto-create tickets for critical findings in your projects', icon: '🎫', connected: false, category: 'Project Management' },
  { id: 'pagerduty', name: 'PagerDuty', description: 'Route critical alerts to on-call engineers instantly', icon: '🔔', connected: false, category: 'Incident Response' },
  { id: 'splunk', name: 'Splunk', description: 'Stream reconnaissance data into your SIEM for correlation', icon: '📊', connected: false, category: 'SIEM' },
  { id: 'github', name: 'GitHub', description: 'Track security findings alongside your code repositories', icon: '🐙', connected: false, category: 'Developer Tools' },
  { id: 'webhooks', name: 'Webhooks', description: 'Push scan results to any HTTP endpoint for custom workflows', icon: '🔗', connected: false, category: 'Automation' },
];

function IntegrationCard({ integration, onToggle }: { integration: Integration; onToggle: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`panel p-5 group transition-all ${integration.connected ? 'border-[#00ff88]/15' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-xl">
            {integration.icon}
          </div>
          <div>
            <h3 className="text-[14px] font-medium text-white" style={{ fontFamily: 'var(--font-heading)' }}>{integration.name}</h3>
            <span className="text-[10px] text-neutral-700 uppercase tracking-wider">{integration.category}</span>
          </div>
        </div>
        {integration.connected && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#00ff88]/10 text-[#00ff88]">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </span>
        )}
      </div>
      <p className="text-[12px] text-neutral-600 leading-relaxed mb-4">{integration.description}</p>
      <div className="flex items-center justify-between">
        {integration.connected && integration.lastSync && (
          <span className="text-[10px] text-neutral-700 font-mono">Last sync: {integration.lastSync}</span>
        )}
        {!integration.connected && <span />}
        <Button
          variant={integration.connected ? "outline" : "default"}
          size="sm"
          onClick={() => onToggle(integration.id)}
          className={`h-8 text-[12px] rounded-lg ${
            integration.connected
              ? 'border-[#ff3355]/30 text-[#ff3355] hover:bg-[#ff3355]/10 hover:text-[#ff3355]'
              : 'bg-white text-black hover:bg-white/90'
          }`}
        >
          {integration.connected ? 'Disconnect' : 'Connect'}
          <ExternalLink className="w-3 h-3 ml-1.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function IntegrationsPage() {
  const authHeaders = useAuthHeaders();
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/integrations', { headers: authHeaders })
      .then(r => r.json())
      .then((data) => {
        if (data.integrations && Array.isArray(data.integrations)) {
          const merged = INTEGRATIONS.map((def) => {
            const found = data.integrations.find((i: { id?: string; name?: string; connected?: boolean; lastSync?: string }) => i.id === def.id || i.name === def.name);
            if (found) {
              return { ...def, connected: !!found.connected, lastSync: found.lastSync };
            }
            return def;
          });
          setIntegrations(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const handleToggle = (id: string) => {
    setIntegrations(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newConnected = !i.connected;
      return {
        ...i,
        connected: newConnected,
        lastSync: newConnected ? new Date().toLocaleString() : undefined,
      };
    }));
  };

  const connectedCount = integrations.filter(i => i.connected).length;

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-neutral-500"><Puzzle /></div>
          <div><h1>Integrations</h1><p>Connect external tools and services.</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-pulse h-44 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-neutral-500"><Puzzle /></div>
        <div><h1>Integrations</h1><p>Connect external tools and services.</p></div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="panel px-4 py-2.5 flex items-center gap-2">
          <span className="text-[11px] text-neutral-600">Connected</span>
          <span className="text-[13px] font-mono font-semibold text-white">{connectedCount}</span>
          <span className="text-[11px] text-neutral-700">/ {integrations.length}</span>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  );
}