'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Crosshair, Zap, AlertTriangle, Globe, Lock, Terminal, Radio, Database, FileSearch, Bug } from 'lucide-react';

interface ScanPhase {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const SCAN_PHASES: ScanPhase[] = [
  { id: 'dns', label: 'DNS Enumeration', icon: <Database className="w-5 h-5" />, color: '#79c0ff' },
  { id: 'headers', label: 'HTTP Headers', icon: <Terminal className="w-5 h-5" />, color: '#3fb950' },
  { id: 'ssl', label: 'SSL/TLS', icon: <Lock className="w-5 h-5" />, color: '#d2a8ff' },
  { id: 'ports', label: 'Port Scan', icon: <Radio className="w-5 h-5" />, color: '#f0883e' },
  { id: 'subdomains', label: 'Subdomains', icon: <Globe className="w-5 h-5" />, color: '#79c0ff' },
  { id: 'vulns', label: 'Vuln Probe', icon: <Bug className="w-5 h-5" />, color: '#e84057' },
  { id: 'osint', label: 'OSINT', icon: <FileSearch className="w-5 h-5" />, color: '#d2a8ff' },
];

interface LiveFindingEvent {
  severity: string;
  category: string;
  title: string;
}

interface ScanOverlayProps {
  isScanning: boolean;
  domain: string | null;
  findingCount: number;
  onNewFinding: (finding: LiveFindingEvent) => void;
}

export function ScanOverlay({ isScanning, domain, findingCount, onNewFinding }: ScanOverlayProps) {
  const [activePhase, setActivePhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [findings, setFindings] = useState<LiveFindingEvent[]>([]);
  const [phaseProgress, setPhaseProgress] = useState<Record<string, number>>({});

  // Phase progression
  useEffect(() => {
    if (isScanning) {
      setActivePhase(0);
      setProgress(0);
      setFindings([]);
      setPhaseProgress({});

      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 8 + 2;
          if (next >= 100) {
            clearInterval(interval);
            return 100;
          }
          const phaseIdx = Math.floor((next / 100) * SCAN_PHASES.length);
          setActivePhase(Math.min(phaseIdx, SCAN_PHASES.length - 1));
          return next;
        });
      }, 300);

      // Simulate finding events
      const findingInterval = setInterval(() => {
        const templates = [
          { severity: 'info', category: 'dns', title: 'DNS A Record resolved' },
          { severity: 'info', category: 'dns', title: 'MX Records discovered' },
          { severity: 'info', category: 'header', title: 'HSTS header confirmed' },
          { severity: 'medium', category: 'ssl', title: 'Certificate expiring soon' },
          { severity: 'high', category: 'dns', title: 'SPF Record Missing' },
          { severity: 'info', category: 'subdomain', title: 'Subdomain discovered' },
          { severity: 'info', category: 'ssl', title: 'TLS 1.3 negotiated' },
          { severity: 'high', category: 'subdomain', title: 'Sensitive subdomain exposed' },
          { severity: 'info', category: 'technology', title: 'Technology fingerprinted' },
          { severity: 'critical', category: 'vulnerability', title: 'Path traversal NOT blocked' },
        ];
        const finding = templates[Math.floor(Math.random() * templates.length)];
        setFindings(prev => [finding, ...prev].slice(0, 30));
        onNewFinding(finding);
      }, 600 + Math.random() * 800);

      return () => {
        clearInterval(interval);
        clearInterval(findingInterval);
      };
    } else {
      setProgress(0);
    }
  }, [isScanning, onNewFinding]);

  if (!isScanning) return null;

  return (
    <AnimatePresence>
      {isScanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full max-w-4xl mx-auto space-y-4"
        >
          {/* Target Header */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0a0a10] border border-[rgba(52,211,153,0.15)]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-[#3dd68c]"
            >
              <Crosshair className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Target Locked</div>
              <div className="font-mono font-bold text-[#3dd68c]">{domain}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Findings</div>
              <motion.div
                className="font-mono font-bold text-[#e8e6e1] text-xl"
                key={findingCount}
                initial={{ scale: 1.3, color: '#3dd68c' }}
                animate={{ scale: 1, color: '#e8e6e1' }}
                transition={{ duration: 0.3 }}
              >
                {findingCount}
              </motion.div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #3dd68c, #79c0ff, #d2a8ff, #f0883e, #e84057)',
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {/* Scanline effect */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-2 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* Phase Indicators */}
          <div className="grid grid-cols-7 gap-1">
            {SCAN_PHASES.map((phase, idx) => (
              <motion.div
                key={phase.id}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  idx === activePhase
                    ? 'bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.3)]'
                    : idx < activePhase
                    ? 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]'
                    : 'bg-[rgba(255,255,255,0.01)] border border-transparent opacity-40'
                }`}
                animate={idx === activePhase ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div style={{ color: idx <= activePhase ? phase.color : '#3d3b38' }}>
                  {phase.icon}
                </div>
                <span className="text-[9px] text-muted-foreground text-center leading-tight">{phase.label}</span>
                {idx < activePhase && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-[#3fb950] text-[8px]"
                  >
                    <Zap className="w-3 h-3" />
                  </motion.div>
                )}
                {idx === activePhase && (
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: phase.color }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Live Findings Feed */}
          <div className="rounded-xl bg-[#080b14] border border-[rgba(52,211,153,0.08)] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#0a0a10] border-b border-[rgba(0,255,255,0.06)] flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-[#3dd68c]"
              />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Live Findings Feed</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-2 space-y-1" style={{ scrollbarWidth: 'thin' }}>
              <AnimatePresence>
                {findings.map((f, i) => (
                  <motion.div
                    key={`${f.title}-${i}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-mono"
                    style={{
                      backgroundColor: f.severity === 'critical' ? 'rgba(244,63,94,0.1)' :
                        f.severity === 'high' ? 'rgba(251,191,36,0.1)' :
                        f.severity === 'medium' ? 'rgba(250,204,21,0.05)' : 'rgba(255,255,255,0.02)',
                      borderLeft: `2px solid ${
                        f.severity === 'critical' ? '#e84057' :
                        f.severity === 'high' ? '#e8943d' :
                        f.severity === 'medium' ? '#e8b33d' : '#3d3b38'
                      }`,
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      f.severity === 'critical' ? 'bg-[#e84057]' :
                      f.severity === 'high' ? 'bg-[#e8943d]' :
                      f.severity === 'medium' ? 'bg-[#e8b33d]' : 'bg-[#3d3b38]'
                    }`} />
                    <span className="text-[#e8e6e1] truncate">{f.title}</span>
                    <span className="text-muted-foreground ml-auto shrink-0 text-[9px]">{f.category}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
