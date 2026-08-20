'use client';

import { motion } from 'framer-motion';
import { Globe, Server, Shield, AlertTriangle, Lock, Wifi, FileText, Bug, ChevronRight, Search } from 'lucide-react';
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

const severityGlow: Record<string, string> = {
  critical: 'text-glow-red text-[#ff3355]',
  high: 'text-[#ff8844]',
  medium: 'text-[#ffaa00]',
  low: 'text-[#00ff88]',
  info: 'text-[#6b7280]',
};

const categoryIcons: Record<string, React.ReactNode> = {
  subdomain: <Globe className="w-4 h-4" />,
  port: <Wifi className="w-4 h-4" />,
  technology: <Server className="w-4 h-4" />,
  ssl: <Lock className="w-4 h-4" />,
  dns: <Server className="w-4 h-4" />,
  header: <FileText className="w-4 h-4" />,
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

export function ScanResults({ result }: ScanResultsProps) {
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
          {/* Risk Gauge */}
          <RiskGauge value={result.riskScore} size={200} label="Overall Risk" />

          {/* Stats Grid */}
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
      {result.riskScore > 70 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-[#ff3355]/[0.06] border border-[#ff3355]/15"
        >
          <AlertTriangle className="w-5 h-5 text-[#ff3355] flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-[#ff3355]">Critical Risk Level Detected</div>
            <div className="text-xs text-[#ff3355]/70 mt-0.5">
              This target has a high risk score ({result.riskScore}/100) with {result.critical} critical and {result.high} high severity findings. Immediate remediation is recommended.
            </div>
          </div>
        </motion.div>
      )}
      {result.riskScore > 40 && result.riskScore <= 70 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-[#ff8844]/[0.06] border border-[#ff8844]/15"
        >
          <Shield className="w-5 h-5 text-[#ff8844] flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-[#ff8844]">Moderate Risk Level</div>
            <div className="text-xs text-[#ff8844]/70 mt-0.5">
              Several security findings require attention. Review the findings below and prioritize remediation.
            </div>
          </div>
        </motion.div>
      )}

      {/* Findings List */}
      <div className="bento-tile p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
            <Bug className="w-5 h-5 text-[#44aaff]" />
            Security Findings
          </h3>
          <span className="text-xs text-muted-foreground font-mono">{result.findings.length} items</span>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          <motion.div variants={container} initial="hidden" animate="show">
            {result.findings.map((finding) => (
              <motion.div
                key={finding.id}
                variants={item}
                className="group p-3.5 rounded-lg bg-white/[0.015] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-[rgba(255,255,255,0.04)] text-muted-foreground group-hover:text-[#00ff88] transition-colors">
                    {categoryIcons[finding.category] || <Bug className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-[#f0f0f0] group-hover:text-[#00ff88] transition-colors">
                        {finding.title}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityColors[finding.severity]}`}>
                        {finding.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0 border-[rgba(255,255,255,0.08)] text-muted-foreground">
                        {categoryLabels[finding.category] || finding.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{finding.description}</p>
                    {finding.evidence && (
                      <div className="text-[11px] font-mono text-muted-foreground/70 bg-[rgba(0,0,0,0.3)] px-3 py-1.5 rounded-lg inline-block">
                        {finding.evidence}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#00ff88] transition-colors mt-1 flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}