'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VulnScanResult {
  target: string;
  ip: string | null;
  cveFindings: CVEFinding[];
  httpVulns: VulnFinding[];
  sslVulns: SSLVuln[];
  dnsVulns: DNSVuln[];
  banners: BannerInfo[];
  exploitSummary: ExploitSummary;
  attackSurface: AttackSurface;
}

interface CVEFinding { cve: string; title: string; cvss: number; severity: string; affected: string; evidence: string; remediation: string; exploitAvailable: string; epss: number; }
interface VulnFinding { title: string; severity: string; category: string; description: string; evidence: string; asset: string; proof: string; }
interface SSLVuln { title: string; severity: string; category: string; description: string; evidence: string; asset: string; risk: string; }
interface DNSVuln { title: string; severity: string; category: string; description: string; evidence: string; asset: string; }
interface BannerInfo { port: number; banner: string; service: string; }
interface ExploitSummary { totalCVEs: number; criticalCVEs: number; weaponized: number; theoretical: number; avgCVSS: number; }
interface AttackSurface { score: number; vectors: string[]; }

const severityColors: Record<string, string> = {
  critical: '#ff0040', high: '#ff6b35', medium: '#ffc107', low: '#00ff88', info: '#00b4d8',
};
const severityBg: Record<string, string> = {
  critical: 'rgba(255,0,64,0.12)', high: 'rgba(255,107,53,0.12)', medium: 'rgba(255,193,7,0.12)',
  low: 'rgba(0,255,136,0.12)', info: 'rgba(0,180,216,0.12)',
};
const exploitColors: Record<string, string> = { weaponized: '#ff0040', poc: '#ff6b35', theoretical: '#ffc107' };

export function VulnArsenal({ onScan }: { onScan?: (target: string) => void }) {
  const [target, setTarget] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<VulnScanResult | null>(null);
  const [activeTab, setActiveTab] = useState<'cve' | 'http' | 'ssl' | 'dns' | 'surface'>('cve');
  const [expandedCVE, setExpandedCVE] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState('');

  const phases = [
    'Resolving target IP...',
    'Banner grabbing 23 ports...',
    'Matching against 50+ CVE signatures...',
    'Testing CORS misconfiguration...',
    'Probing open redirects...',
    'Testing path traversal vectors...',
    'Checking SSRF endpoints...',
    'Analyzing XSS injection points...',
    'Auditing SSL/TLS cipher suites...',
    'Checking Heartbleed/POODLE/BEAST...',
    'Attempting DNS zone transfer...',
    'Scanning for subdomain takeovers...',
    'Calculating attack surface score...',
  ];

  const handleScan = async () => {
    if (!target.trim()) return;
    setScanning(true);
    setProgress(0);
    setResult(null);

    let phaseIdx = 0;
    const interval = setInterval(() => {
      phaseIdx = Math.min(phaseIdx + 1, phases.length - 1);
      setProgress(Math.min(100, phaseIdx * 8 + Math.random() * 5));
      setCurrentPhase(phases[phaseIdx]);
    }, 1200);

    try {
      const res = await fetch('/api/vuln-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim() }),
      });
      const data = await res.json();
      if (data.success) setResult(data.scan);
      if (onScan) onScan(target.trim());
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      clearInterval(interval);
      setScanning(false);
      setProgress(100);
    }
  };

  const tabs = [
    { id: 'cve' as const, label: 'CVE Database', count: result?.cveFindings.length || 0, icon: '💀' },
    { id: 'http' as const, label: 'HTTP Vulns', count: result?.httpVulns.length || 0, icon: '🕸️' },
    { id: 'ssl' as const, label: 'SSL/TLS Attacks', count: result?.sslVulns.length || 0, icon: '🔓' },
    { id: 'dns' as const, label: 'DNS Vulns', count: result?.dnsVulns.length || 0, icon: '🎯' },
    { id: 'surface' as const, label: 'Attack Surface', count: result?.attackSurface.vectors.length || 0, icon: '⚡' },
  ];

  const totalCritical = result
    ? result.cveFindings.filter(c => c.severity === 'critical').length +
      result.httpVulns.filter(v => v.severity === 'critical').length +
      result.sslVulns.filter(v => v.severity === 'critical').length +
      result.dnsVulns.filter(v => v.severity === 'critical').length
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Scanner Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[#ff004033] bg-gradient-to-br from-[#0d1117] to-[#1a0a0e] p-8 mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#ff004008] to-[#ff6b3508]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#ff004020] text-[#ff4060] text-xs font-mono font-bold animate-pulse">
              ⚡ DANGER ZONE
            </span>
            <span className="px-3 py-1 rounded-full bg-[#ff004010] text-[#ff8090] text-xs font-mono">
              REAL VULNERABILITY SCANNER
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0040] to-[#ff6b35]">
              Vulnerability Arsenal
            </span>
          </h1>
          <p className="text-gray-400 mb-6 text-lg">
            CVE matching + HTTP exploitation vectors + SSL/TLS cryptanalysis + DNS attack surface.
            <br />
            <span className="text-[#ff6b35]">50+ real CVEs in database. Banner grabbing. Version matching. Exploit availability.</span>
          </p>

          <div className="flex gap-3">
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="Enter domain to exploit-scan... (e.g. stripe.com)"
              className="flex-1 px-5 py-3 rounded-xl bg-[#0a0e1a] border border-[#ff004033] text-white placeholder-gray-500 focus:border-[#ff0040] focus:outline-none font-mono text-lg"
              disabled={scanning}
            />
            <button
              onClick={handleScan}
              disabled={scanning || !target.trim()}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#ff0040] to-[#ff6b35] text-white font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? `Scanning... ${Math.round(progress)}%` : '💀 EXPLOIT SCAN'}
            </button>
          </div>

          {/* Progress */}
          <AnimatePresence>
            {scanning && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="mt-4 h-2 rounded-full bg-[#1a0a0e] overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#ff0040] to-[#ff6b35] rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 text-sm font-mono text-[#ff6b35] animate-pulse">
                  {currentPhase}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Summary Hero */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'CVEs Found', value: result.exploitSummary.totalCVEs, color: '#ff0040' },
                { label: 'Weaponized', value: result.exploitSummary.weaponized, color: '#ff0040' },
                { label: 'HTTP Vulns', value: result.httpVulns.length, color: '#ff6b35' },
                { label: 'SSL Vulns', value: result.sslVulns.length, color: '#ffc107' },
                { label: 'Attack Surface', value: result.attackSurface.score, color: '#ff0040' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="cyber-card p-4 text-center"
                >
                  <div className="text-3xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-gray-400 text-xs mt-1">{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Banners */}
            {result.banners.length > 0 && (
              <div className="mb-6 cyber-card p-4">
                <h3 className="text-sm font-bold text-[#ff6b35] mb-3 font-mono">BANNER GRABS (Service Version Detection)</h3>
                <div className="space-y-2">
                  {result.banners.map((b, i) => (
                    <div key={i} className="text-xs font-mono bg-[#0a0e1a] p-2 rounded-lg">
                      <span className="text-[#ff6b35]">:{b.port}</span> <span className="text-gray-500">{b.service}</span>
                      <div className="text-[#00ff88] mt-1">{b.banner.substring(0, 150)}{b.banner.length > 150 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#ff004020] text-[#ff4060] border border-[#ff004044]'
                      : 'bg-[#0d1117] text-gray-400 border border-[#ffffff10] hover:border-[#ffffff30]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{
                      color: severityColors[tab.count > 5 ? 'critical' : tab.count > 2 ? 'high' : 'medium'],
                      background: severityBg[tab.count > 5 ? 'critical' : tab.count > 2 ? 'high' : 'medium'],
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

                {/* CVE Tab */}
                {activeTab === 'cve' && (
                  <div className="space-y-3">
                    {result.cveFindings.length === 0 ? (
                      <div className="cyber-card p-8 text-center text-gray-400">
                        No CVE matches found for detected service versions.
                      </div>
                    ) : result.cveFindings.map((cve) => (
                      <motion.div
                        key={cve.cve}
                        layout
                        className="cyber-card p-4 cursor-pointer"
                        onClick={() => setExpandedCVE(expandedCVE === cve.cve ? null : cve.cve)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{
                              color: severityColors[cve.severity], background: severityBg[cve.severity],
                            }}>{cve.severity.toUpperCase()}</span>
                            <span className="font-mono text-sm font-bold text-white">{cve.cve}</span>
                            <span className="text-xs text-gray-400">CVSS: {cve.cvss}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{
                              color: exploitColors[cve.exploitAvailable] || '#999',
                              background: `${exploitColors[cve.exploitAvailable]}20` || '#99999920',
                            }}>{cve.exploitAvailable.toUpperCase()}</span>
                          </div>
                          <span className="text-xs text-gray-500 font-mono">EPSS: {(cve.epss * 100).toFixed(0)}%</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-300">{cve.title}</div>

                        <AnimatePresence>
                          {expandedCVE === cve.cve && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 pt-3 border-t border-[#ffffff10] overflow-hidden"
                            >
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div><span className="text-gray-500">Affected:</span> <span className="text-white">{cve.affected}</span></div>
                                <div><span className="text-gray-500">CVSS v3:</span> <span className="text-white">{cve.cvss}</span></div>
                                <div className="col-span-2"><span className="text-gray-500">Exploit:</span> <span style={{ color: exploitColors[cve.exploitAvailable] }}>{cve.exploitAvailable}</span></div>
                                <div className="col-span-2"><span className="text-gray-500">EPSS:</span> <span className="text-white">{(cve.epss * 100).toFixed(1)}% probability of exploitation in 30 days</span></div>
                                <div className="col-span-2 bg-[#0a0e1a] p-2 rounded-lg mt-2">
                                  <span className="text-[#00ff88] font-mono">Remediation:</span>
                                  <div className="text-gray-300 mt-1">{cve.remediation}</div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* HTTP Vulns Tab */}
                {activeTab === 'http' && (
                  <div className="space-y-3">
                    {result.httpVulns.map((v, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="cyber-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{
                            color: severityColors[v.severity], background: severityBg[v.severity],
                          }}>{v.severity.toUpperCase()}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1a2332] text-gray-400">{v.category}</span>
                        </div>
                        <div className="font-bold text-sm mb-1">{v.title}</div>
                        <div className="text-xs text-gray-400 mb-2">{v.description}</div>
                        <div className="text-xs font-mono text-[#00ff88] bg-[#0a0e1a] p-2 rounded-lg">
                          <span className="text-gray-500">$ </span>{v.proof || v.evidence}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Asset: {v.asset}</div>
                      </motion.div>
                    ))}
                    {result.httpVulns.length === 0 && <div className="cyber-card p-8 text-center text-gray-400">No HTTP vulnerabilities detected.</div>}
                  </div>
                )}

                {/* SSL Tab */}
                {activeTab === 'ssl' && (
                  <div className="space-y-3">
                    {result.sslVulns.map((v, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="cyber-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{
                            color: severityColors[v.severity], background: severityBg[v.severity],
                          }}>{v.severity.toUpperCase()}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1a2332] text-gray-400">{v.category}</span>
                        </div>
                        <div className="font-bold text-sm mb-1">{v.title}</div>
                        <div className="text-xs text-gray-400 mb-2">{v.description}</div>
                        <div className="text-xs font-mono text-[#ffc107] bg-[#0a0e1a] p-2 rounded-lg">{v.evidence}</div>
                      </motion.div>
                    ))}
                    {result.sslVulns.length === 0 && <div className="cyber-card p-8 text-center text-gray-400">SSL/TLS — No critical vulnerabilities found.</div>}
                  </div>
                )}

                {/* DNS Tab */}
                {activeTab === 'dns' && (
                  <div className="space-y-3">
                    {result.dnsVulns.map((v, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="cyber-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{
                            color: severityColors[v.severity], background: severityBg[v.severity],
                          }}>{v.severity.toUpperCase()}</span>
                        </div>
                        <div className="font-bold text-sm mb-1">{v.title}</div>
                        <div className="text-xs text-gray-400 mb-2">{v.description}</div>
                        <div className="text-xs font-mono text-[#00b4d8] bg-[#0a0e1a] p-2 rounded-lg">{v.evidence}</div>
                      </motion.div>
                    ))}
                    {result.dnsVulns.length === 0 && <div className="cyber-card p-8 text-center text-gray-400">No DNS vulnerabilities found.</div>}
                  </div>
                )}

                {/* Attack Surface Tab */}
                {activeTab === 'surface' && (
                  <div className="cyber-card p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative w-32 h-32">
                        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#1a2332" strokeWidth="8" />
                          <circle cx="60" cy="60" r="50" fill="none"
                            stroke={result.attackSurface.score >= 75 ? '#ff0040' : '#ff6b35'}
                            strokeWidth="8"
                            strokeDasharray={`${(result.attackSurface.score / 100) * 314} 314`}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold font-mono" style={{ color: '#ff0040' }}>
                            {result.attackSurface.score}
                          </span>
                          <span className="text-gray-400 text-[10px]">SCORE</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">Attack Surface Analysis</h3>
                        <p className="text-gray-400 text-sm mt-1">
                          {result.attackSurface.vectors.length} attack vectors identified
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Target: {result.target} | IP: {result.ip || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {result.attackSurface.vectors.map((v, i) => (
                        <div key={i} className="flex items-center gap-3 bg-[#0a0e1a] p-3 rounded-lg">
                          <span className="w-8 h-8 rounded-lg bg-[#ff004020] flex items-center justify-center text-[#ff0040] font-bold text-sm">#{i + 1}</span>
                          <span className="text-sm font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
