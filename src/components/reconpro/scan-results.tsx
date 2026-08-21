'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Server, Shield, AlertTriangle, Lock, Wifi, FileText, Bug, ChevronRight, Search, X, ShieldCheck, Globe2, FileCode, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RiskGauge } from './risk-gauge';

interface Finding {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string | null;
  asset: string;
}

interface ScanResult {
  id: string;
  domain: string;
  status: string;
  riskScore: number;
  totalVulns: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  findings: Finding[];
  dns?: Record<string, string>[];
  ssl?: Record<string, string>;
  headers?: Record<string, string>;
}

interface ScanResultsProps {
  result: ScanResult;
}

const severityColors: Record<string, string> = {
  critical: 'bg-[#ff3355]/15 text-[#ff3355] border-[#ff3355]/30',
  high: 'bg-[#ff8844]/15 text-[#ff8844] border-[#ff8844]/30',
  medium: 'bg-[#ffaa00]/15 text-[#ffaa00] border-[#ffaa00]/30',
  low: 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30',
  info: 'bg-[#6b7280]/15 text-[#6b7280] border-[#6b7280]/30',
};

const categoryIcons: Record<string, React.ReactNode> = {
  subdomain: <Globe className="w-4 h-4" />,
  port: <Wifi className="w-4 h-4" />,
  technology: <Server className="w-4 h-4" />,
  ssl: <Lock className="w-4 h-4" />,
  dns: <Network className="w-4 h-4" />,
  header: <FileCode className="w-4 h-4" />,
  vulnerability: <Bug className="w-4 h-4" />,
  osint: <Search className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
};

const categoryLabels: Record<string, string> = {
  subdomain: 'Subdomain',
  port: 'Port',
  technology: 'Technology',
  ssl: 'SSL/TLS',
  dns: 'DNS',
  header: 'HTTP Header',
  vulnerability: 'Vulnerability',
  osint: 'OSINT',
  security: 'Security',
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type ResultTab = 'summary' | 'findings' | 'dns' | 'ssl' | 'headers';

const TABS: { id: ResultTab; label: string; icon: React.ElementType }[] = [
  { id: 'summary', label: 'Summary', icon: Shield },
  { id: 'findings', label: 'Findings', icon: Bug },
  { id: 'dns', label: 'DNS', icon: Network },
  { id: 'ssl', label: 'SSL', icon: Lock },
  { id: 'headers', label: 'Headers', icon: FileCode },
];

export function ScanResults({ result }: ScanResultsProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>('summary');

  // Group findings by category for DNS/SSL/Header tabs
  const dnsFindings = result.findings.filter(f => f.category === 'dns' || f.category === 'subdomain');
  const sslFindings = result.findings.filter(f => f.category === 'ssl');
  const headerFindings = result.findings.filter(f => f.category === 'header');
  const vulnFindings = result.findings.filter(f => f.category === 'vulnerability' || f.category === 'security');
  const otherFindings = result.findings.filter(f => !['dns', 'subdomain', 'ssl', 'header', 'vulnerability', 'security'].includes(f.category));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
      className="space-y-4"
    >
      {/* Risk Overview Header */}
      <div className="bento-tile p-5">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <RiskGauge value={result.riskScore} size={200} label="Overall Risk" />
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-[#00ff88]" />
              <h2 className="text-lg font-medium text-white font-mono">{result.domain}</h2>
              <Badge variant="outline" className="border-[#00ff88]/30 text-[#00ff88] text-xs">
                {result.status.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Critical', value: result.critical, color: '#ff3355' },
                { label: 'High', value: result.high, color: '#ff8844' },
                { label: 'Medium', value: result.medium, color: '#ffaa00' },
                { label: 'Low', value: result.low, color: '#00ff88' },
                { label: 'Info', value: result.info, color: '#6b7280' },
                { label: 'Total Findings', value: result.totalVulns, color: '#44aaff' },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-lg bg-white/[0.015]">
                  <div className="text-[11px] text-[#444444] mb-1">{stat.label}</div>
                  <div className="text-xl font-semibold font-mono" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment Banner */}
      {!bannerDismissed && result.riskScore > 70 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-[#ff3355]/[0.06] border border-[#ff3355]/15"
        >
          <AlertTriangle className="w-5 h-5 text-[#ff3355] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#ff3355]">Critical Risk Level Detected</div>
            <div className="text-xs text-[#ff3355]/70 mt-0.5">
              This target has a high risk score ({result.riskScore}/100) with {result.critical} critical and {result.high} high severity findings. Immediate remediation is recommended.
            </div>
          </div>
          <button onClick={() => setBannerDismissed(true)} className="p-1 rounded-md hover:bg-[#ff3355]/10 transition-colors flex-shrink-0" aria-label="Dismiss">
            <X className="w-4 h-4 text-[#ff3355]/60" />
          </button>
        </motion.div>
      )}
      {!bannerDismissed && result.riskScore > 40 && result.riskScore <= 70 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-[#ff8844]/[0.06] border border-[#ff8844]/15"
        >
          <Shield className="w-5 h-5 text-[#ff8844] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#ff8844]">Moderate Risk Level</div>
            <div className="text-xs text-[#ff8844]/70 mt-0.5">
              Several security findings require attention. Review the findings below and prioritize remediation.
            </div>
          </div>
          <button onClick={() => setBannerDismissed(true)} className="p-1 rounded-md hover:bg-[#ff8844]/10 transition-colors flex-shrink-0" aria-label="Dismiss">
            <X className="w-4 h-4 text-[#ff8844]/60" />
          </button>
        </motion.div>
      )}
      {!bannerDismissed && result.riskScore <= 40 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-[#00ff88]/[0.04] border border-[#00ff88]/20"
        >
          <ShieldCheck className="w-5 h-5 text-[#00ff88]/80 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#00ff88]/80">Low Risk</div>
            <div className="text-xs text-[#00ff88]/60 mt-0.5">
              Low Risk — No critical threats detected.
            </div>
          </div>
          <button onClick={() => setBannerDismissed(true)} className="p-1 rounded-md hover:bg-[#00ff88]/10 transition-colors flex-shrink-0" aria-label="Dismiss">
            <X className="w-4 h-4 text-[#00ff88]/60" />
          </button>
        </motion.div>
      )}

      {/* Tabbed View */}
      <div className="bento-tile overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-white/[0.05] overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'findings' ? result.findings.length
              : tab.id === 'dns' ? dnsFindings.length
              : tab.id === 'ssl' ? sslFindings.length
              : tab.id === 'headers' ? headerFindings.length
              : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                  isActive
                    ? 'text-white border-white bg-white/[0.03]'
                    : 'text-neutral-600 border-transparent hover:text-neutral-400'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
                {count !== null && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isActive ? 'bg-white/[0.1] text-white' : 'bg-white/[0.03] text-neutral-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {dnsFindings.length > 0 && (
                  <button onClick={() => setActiveTab('dns')} className="panel p-4 text-left hover:border-white/[0.1] transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <Network className="w-4 h-4 text-neutral-600" />
                      <span className="text-[11px] text-neutral-600 uppercase tracking-wider">DNS Records</span>
                    </div>
                    <p className="text-lg font-semibold font-mono text-white group-hover:text-neutral-200">{dnsFindings.length}</p>
                    <p className="text-[10px] text-neutral-700 mt-1">View details →</p>
                  </button>
                )}
                {sslFindings.length > 0 && (
                  <button onClick={() => setActiveTab('ssl')} className="panel p-4 text-left hover:border-white/[0.1] transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-neutral-600" />
                      <span className="text-[11px] text-neutral-600 uppercase tracking-wider">SSL/TLS</span>
                    </div>
                    <p className="text-lg font-semibold font-mono text-white group-hover:text-neutral-200">{sslFindings.length}</p>
                    <p className="text-[10px] text-neutral-700 mt-1">View details →</p>
                  </button>
                )}
                {headerFindings.length > 0 && (
                  <button onClick={() => setActiveTab('headers')} className="panel p-4 text-left hover:border-white/[0.1] transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <FileCode className="w-4 h-4 text-neutral-600" />
                      <span className="text-[11px] text-neutral-600 uppercase tracking-wider">HTTP Headers</span>
                    </div>
                    <p className="text-lg font-semibold font-mono text-white group-hover:text-neutral-200">{headerFindings.length}</p>
                    <p className="text-[10px] text-neutral-700 mt-1">View details →</p>
                  </button>
                )}
                {vulnFindings.length > 0 && (
                  <button onClick={() => setActiveTab('findings')} className="panel p-4 text-left hover:border-white/[0.1] transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <Bug className="w-4 h-4 text-neutral-600" />
                      <span className="text-[11px] text-neutral-600 uppercase tracking-wider">Vulnerabilities</span>
                    </div>
                    <p className="text-lg font-semibold font-mono text-[#ff3355] group-hover:text-[#ff6677]">{vulnFindings.length}</p>
                    <p className="text-[10px] text-neutral-700 mt-1">View details →</p>
                  </button>
                )}
              </div>
              {/* Top critical findings in summary */}
              {result.findings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 5).map(f => (
                <div key={f.id} className="p-3.5 rounded-lg bg-white/[0.015] border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityColors[f.severity]}`}>
                      {f.severity.toUpperCase()}
                    </Badge>
                    <span className="text-[13px] font-medium text-neutral-300">{f.title}</span>
                  </div>
                  {f.description && <p className="text-[11px] text-neutral-600 leading-relaxed">{f.description}</p>}
                </div>
              ))}
            </div>
          )}

          {/* FINDINGS TAB */}
          {activeTab === 'findings' && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
              <motion.div variants={container} initial="hidden" animate="show">
                {result.findings.map((finding) => (
                  <motion.div
                    key={finding.id}
                    variants={item}
                    className="p-3.5 rounded-lg bg-white/[0.015] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-[rgba(255,255,255,0.04)] text-neutral-600">
                        {categoryIcons[finding.category] || <Bug className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-[#f0f0f0]">{finding.title}</span>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityColors[finding.severity]}`}>
                            {finding.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0 border-[rgba(255,255,255,0.08)] text-neutral-600">
                            {categoryLabels[finding.category] || finding.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed mb-2">{finding.description}</p>
                        {finding.evidence && (
                          <div className="text-[11px] font-mono text-neutral-700 bg-[rgba(0,0,0,0.3)] px-3 py-1.5 rounded-lg inline-block truncate max-w-full">
                            {finding.evidence}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-700 mt-1 flex-shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* DNS TAB */}
          {activeTab === 'dns' && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
              {dnsFindings.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
                  <p className="text-[13px] text-neutral-600">No DNS findings</p>
                </div>
              ) : dnsFindings.map((finding) => (
                <div key={finding.id} className="p-3.5 rounded-lg bg-white/[0.015] border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityColors[finding.severity]}`}>
                      {finding.severity.toUpperCase()}
                    </Badge>
                    <span className="text-[13px] font-medium text-neutral-300">{finding.title}</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">{finding.description}</p>
                  {finding.evidence && (
                    <div className="text-[11px] font-mono text-neutral-700 bg-[rgba(0,0,0,0.3)] px-3 py-1.5 rounded-lg inline-block mt-2">{finding.evidence}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SSL TAB */}
          {activeTab === 'ssl' && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
              {sslFindings.length === 0 ? (
                <div className="text-center py-12">
                  <Lock className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
                  <p className="text-[13px] text-neutral-600">No SSL/TLS findings</p>
                </div>
              ) : sslFindings.map((finding) => (
                <div key={finding.id} className="p-3.5 rounded-lg bg-white/[0.015] border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityColors[finding.severity]}`}>
                      {finding.severity.toUpperCase()}
                    </Badge>
                    <span className="text-[13px] font-medium text-neutral-300">{finding.title}</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">{finding.description}</p>
                  {finding.evidence && (
                    <div className="text-[11px] font-mono text-neutral-700 bg-[rgba(0,0,0,0.3)] px-3 py-1.5 rounded-lg inline-block mt-2">{finding.evidence}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* HEADERS TAB */}
          {activeTab === 'headers' && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-none">
              {headerFindings.length === 0 ? (
                <div className="text-center py-12">
                  <FileCode className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
                  <p className="text-[13px] text-neutral-600">No HTTP Header findings</p>
                </div>
              ) : headerFindings.map((finding) => (
                <div key={finding.id} className="p-3.5 rounded-lg bg-white/[0.015] border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityColors[finding.severity]}`}>
                      {finding.severity.toUpperCase()}
                    </Badge>
                    <span className="text-[13px] font-medium text-neutral-300">{finding.title}</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">{finding.description}</p>
                  {finding.evidence && (
                    <div className="text-[11px] font-mono text-neutral-700 bg-[rgba(0,0,0,0.3)] px-3 py-1.5 rounded-lg inline-block mt-2">{finding.evidence}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
