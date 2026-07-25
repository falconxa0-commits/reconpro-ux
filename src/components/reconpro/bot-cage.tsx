'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BotHuntResult {
  target: string;
  resolvedIP: string;
  mode: string;
  botIntel: {
    ipReputation: IPReputation;
    botnetIndicators: {
      c2Ports: C2Port[];
      malwareSignatures: MalwareSig[];
      detectedC2: DetectedC2[];
    };
    threatClassification: ThreatClassification;
    dnsIntelligence: DNSIndicator[];
    c2Infrastructure: DetectedC2[];
    attackVectors: AttackVector[];
    cageStatus: CageStatus;
  };
}

interface IPReputation { ip: string; asn: string; isp: string; org: string; geo: Record<string, any>; reverseDns: string; reputation: { blacklistHits: number; totalBlacklists: number; score: number; threatLevel: string }; flags: { tor: boolean; proxy: boolean; vpn: boolean; datacenter: boolean; mobile: boolean; suspiciousASN: boolean }; whoisSnippet: string; }
interface C2Port { port: number; service: string; severity: string; }
interface MalwareSig { family: string; severity: string; desc: string; }
interface DetectedC2 { port: number; service: string; banner: string; severity: string; malwareFamily: string | null; malwareDesc: string | null; isC2: boolean; }
interface ThreatClassification { score: number; level: string; vectors: string[]; recommendation: string; }
interface DNSIndicator { type: string; severity: string; description: string; evidence: string; asset: string; }
interface AttackVector { id: string; type: string; severity: string; description: string; proof: string; }
interface CageStatus { quarantined: boolean; monitored: boolean; threats: string[]; quarantineReason: string | null; responsePlaybook: string[]; }

const severityColors: Record<string, string> = { critical: '#ff0040', high: '#ff6b35', medium: '#ffc107', low: '#00ff88', info: '#00b4d8' };
const severityBg: Record<string, string> = { critical: 'rgba(255,0,64,0.12)', high: 'rgba(255,107,53,0.12)', medium: 'rgba(255,193,7,0.12)', low: 'rgba(0,255,136,0.12)', info: 'rgba(0,180,216,0.12)' };

export function BotCage({ onHunt }: { onHunt?: (target: string) => void }) {
  const [target, setTarget] = useState('');
  const [hunting, setHunting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BotHuntResult | null>(null);
  const [activeSection, setActiveSection] = useState<'reputation' | 'c2' | 'dns' | 'cage'>('reputation');
  const [phase, setPhase] = useState('');

  const huntPhases = [
    'Resolving target...',
    'Querying IP reputation databases...',
    'Checking Tor exit node lists...',
    'Scanning blacklist databases...',
    'Scanning 30+ C2 ports...',
    'Matching malware banners...',
    'Analyzing DNS for botnet indicators...',
    'Detecting DGA patterns...',
    'Checking fast-flux DNS...',
    'Scanning for DNS tunneling...',
    'Running typosquatting detection...',
    'Classifying threat level...',
    'Calculating cage response...',
  ];

  const handleHunt = async () => {
    if (!target.trim()) return;
    setHunting(true);
    setProgress(0);
    setResult(null);

    let idx = 0;
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, huntPhases.length - 1);
      setProgress(Math.min(100, idx * 8));
      setPhase(huntPhases[idx]);
    }, 1100);

    try {
      const res = await fetch('/api/bot-hunter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), mode: 'hunt' }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
      if (onHunt) onHunt(target.trim());
    } catch (err) {
      console.error('Bot hunt failed:', err);
    } finally {
      clearInterval(interval);
      setHunting(false);
      setProgress(100);
    }
  };

  const sections = [
    { id: 'reputation' as const, label: 'IP Reputation', icon: '🔍' },
    { id: 'c2' as const, label: 'C2 Detection', icon: '☠️' },
    { id: 'dns' as const, label: 'DNS Intel', icon: '🧬' },
    { id: 'cage' as const, label: 'Bot Cage', icon: '⛓️' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Scanner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[#ff004033] bg-gradient-to-br from-[#0d1117] to-[#1a0a0e] p-8 mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#ff004008] to-[#8b5cf608]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#8b5cf620] text-[#a78bfa] text-xs font-mono font-bold animate-pulse">
              🤖 BOT HUNTER ACTIVE
            </span>
            <span className="px-3 py-1 rounded-full bg-[#ff004010] text-[#ff8090] text-xs font-mono">
              C2 DETECTION + IP INTELLIGENCE + THREAT CLASSIFICATION
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#ff0040]">
              Bot Hunter & Cage System
            </span>
          </h1>
          <p className="text-gray-400 mb-6 text-lg">
            Detect botnet C2 infrastructure, classify threat levels, and quarantine hostile IPs.
            <br />
            <span className="text-[#a78bfa]">30+ C2 ports, 22 malware families, IP reputation, DNS tunneling detection, typosquatting analysis.</span>
          </p>

          <div className="flex gap-3">
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleHunt()}
              placeholder="Enter domain or IP to hunt bots... (e.g. example.com or 1.2.3.4)"
              className="flex-1 px-5 py-3 rounded-xl bg-[#0a0e1a] border border-[#a78bfa33] text-white placeholder-gray-500 focus:border-[#a78bfa] focus:outline-none font-mono text-lg"
              disabled={hunting}
            />
            <button
              onClick={handleHunt}
              disabled={hunting || !target.trim()}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#ff0040] text-white font-bold hover:scale-105 transition-transform disabled:opacity-50"
            >
              {hunting ? `Hunting... ${Math.round(progress)}%` : '🤖 HUNT BOTS'}
            </button>
          </div>

          <AnimatePresence>
            {hunting && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="mt-4 h-2 rounded-full bg-[#1a0a1a] overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-[#a78bfa] to-[#ff0040] rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 text-sm font-mono text-[#a78bfa] animate-pulse">{phase}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Threat Level Hero */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative overflow-hidden rounded-2xl border p-6 mb-8"
              style={{
                borderColor: severityColors[result.botIntel.threatClassification.level.toLowerCase()] + '44',
                background: `linear-gradient(135deg, ${severityBg[result.botIntel.threatClassification.level.toLowerCase()]}, #0d1117)`,
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Threat Classification</div>
                  <div className="text-4xl font-bold font-mono" style={{
                    color: severityColors[result.botIntel.threatClassification.level.toLowerCase()],
                  }}>
                    {result.botIntel.threatClassification.level}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Score: {result.botIntel.threatClassification.score}/100</div>
                </div>
                <div className="text-right max-w-md">
                  <div className="text-sm text-gray-400 mb-1">Recommendation</div>
                  <div className="text-sm" style={{ color: severityColors[result.botIntel.threatClassification.level.toLowerCase()] }}>
                    {result.botIntel.threatClassification.recommendation}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {result.botIntel.threatClassification.vectors.length} threat vectors identified
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Blacklist Hits', value: result.botIntel.ipReputation.reputation.blacklistHits, sub: `of ${result.botIntel.ipReputation.reputation.totalBlacklists}`, color: '#ff0040' },
                { label: 'C2 Ports Open', value: result.botIntel.c2Infrastructure.length, sub: 'botnet command ports', color: '#a78bfa' },
                { label: 'DNS Threats', value: result.botIntel.dnsIntelligence.length, sub: 'botnet indicators', color: '#ff6b35' },
                { label: 'Cage Status', value: result.botIntel.cageStatus.quarantined ? 'QUARANTINED' : 'MONITORED', color: result.botIntel.cageStatus.quarantined ? '#ff0040' : '#ffc107' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.1 }} className="cyber-card p-4 text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                  <div className="text-[10px] text-gray-600">{s.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mb-6">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                    activeSection === s.id
                      ? 'bg-[#a78bfa20] text-[#a78bfa] border border-[#a78bfa44]'
                      : 'bg-[#0d1117] text-gray-400 border border-[#ffffff10] hover:border-[#ffffff30]'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* IP Reputation Section */}
            {activeSection === 'reputation' && (
              <div className="space-y-4">
                <div className="cyber-card p-6">
                  <h3 className="text-lg font-bold mb-4 text-[#a78bfa]">IP Intelligence — {result.botIntel.ipReputation.ip}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-500">ASN:</span> <span className="font-mono">{result.botIntel.ipReputation.asn || 'N/A'}</span></div>
                    <div><span className="text-gray-500">ISP:</span> <span>{result.botIntel.ipReputation.isp}</span></div>
                    <div><span className="text-gray-500">Org:</span> <span>{result.botIntel.ipReputation.org}</span></div>
                    <div><span className="text-gray-500">Country:</span> <span>{result.botIntel.ipReputation.geo.country}</span></div>
                    <div><span className="text-gray-500">City:</span> <span>{result.botIntel.ipReputation.geo.city}</span></div>
                    <div><span className="text-gray-500">Reverse DNS:</span> <span className="font-mono text-xs">{result.botIntel.ipReputation.reverseDns}</span></div>
                  </div>
                </div>

                {/* Flags */}
                <div className="cyber-card p-4">
                  <h3 className="text-sm font-bold mb-3 text-gray-400">FLAGS</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.botIntel.ipReputation.flags).map(([key, val]) => (
                      <span key={key} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        val ? 'bg-[#ff004020] text-[#ff4060]' : 'bg-[#00ff8810] text-[#00ff8880]'
                      }`}>
                        {key.toUpperCase()}: {val ? 'YES' : 'NO'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Blacklist Results */}
                <div className="cyber-card p-4">
                  <h3 className="text-sm font-bold mb-3 text-gray-400">BLACKLIST DATABASES</h3>
                  <div className="text-sm">
                    <span className="text-2xl font-bold" style={{ color: result.botIntel.ipReputation.reputation.blacklistHits > 0 ? '#ff0040' : '#00ff88' }}>
                      {result.botIntel.ipReputation.reputation.blacklistHits}/{result.botIntel.ipReputation.reputation.totalBlacklists}
                    </span>
                    <span className="text-gray-400 ml-2">lists flag this IP</span>
                  </div>
                </div>
              </div>
            )}

            {/* C2 Detection Section */}
            {activeSection === 'c2' && (
              <div className="space-y-4">
                <div className="cyber-card p-4">
                  <h3 className="text-sm font-bold mb-3 text-[#ff0040]">C2 PORTS SCANNED</h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {result.botIntel.botnetIndicators.c2Ports.slice(0, 20).map((p, i) => (
                      <div key={i} className={`text-xs font-mono p-2 rounded-lg text-center ${
                        result.botIntel.c2Infrastructure.some(c => c.port === p.port)
                          ? 'bg-[#ff004020] text-[#ff4060] border border-[#ff004044]'
                          : 'bg-[#0a0e1a] text-gray-600'
                      }`}>
                        :{p.port}
                        <div className="text-[8px] text-gray-500 mt-0.5">{p.service.split(' ')[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.botIntel.c2Infrastructure.length > 0 && (
                  <div className="cyber-card p-4">
                    <h3 className="text-sm font-bold mb-3 text-[#ff0040] animate-pulse">DETECTED C2 INFRASTRUCTURE</h3>
                    {result.botIntel.c2Infrastructure.map((c2, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#1a0a0e] border border-[#ff004033] p-4 rounded-lg mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ color: severityColors[c2.severity], background: severityBg[c2.severity] }}>{c2.severity.toUpperCase()}</span>
                          <span className="font-mono font-bold">Port :{c2.port}</span>
                          <span className="text-gray-400 text-xs">{c2.service}</span>
                          {c2.malwareFamily && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#ff004020] text-[#ff4060]">{c2.malwareFamily}</span>
                          )}
                        </div>
                        {c2.banner && c2.banner !== 'No banner' && (
                          <div className="text-xs font-mono text-[#ffc107] bg-[#0a0e1a] p-2 rounded mt-2">{c2.banner}</div>
                        )}
                        {c2.malwareDesc && <div className="text-xs text-gray-400 mt-2">{c2.malwareDesc}</div>}
                      </motion.div>
                    ))}
                  </div>
                )}

                {result.botIntel.c2Infrastructure.length === 0 && (
                  <div className="cyber-card p-8 text-center text-gray-400">
                    No C2 infrastructure detected. Target IP appears clean of known botnet ports.
                  </div>
                )}

                {/* Malware Signatures Database */}
                <div className="cyber-card p-4">
                  <h3 className="text-sm font-bold mb-3 text-gray-400">MALWARE SIGNATURE DATABASE (22 families)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.botIntel.botnetIndicators.malwareSignatures.slice(0, 12).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: severityColors[s.severity] }} />
                        <span className="font-bold text-gray-300">{s.family}</span>
                        <span className="text-gray-500">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DNS Intel Section */}
            {activeSection === 'dns' && (
              <div className="space-y-4">
                {result.botIntel.dnsIntelligence.map((ind, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="cyber-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ color: severityColors[ind.severity], background: severityBg[ind.severity] }}>{ind.severity.toUpperCase()}</span>
                      <span className="font-bold text-sm">{ind.type}</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{ind.description}</div>
                    <div className="text-xs font-mono text-[#00b4d8] bg-[#0a0e1a] p-2 rounded-lg">{ind.evidence}</div>
                  </motion.div>
                ))}
                {result.botIntel.dnsIntelligence.length === 0 && (
                  <div className="cyber-card p-8 text-center text-gray-400">No DNS-based botnet indicators detected.</div>
                )}
              </div>
            )}

            {/* Bot Cage Section */}
            {activeSection === 'cage' && (
              <div className="space-y-4">
                <div className={`relative overflow-hidden rounded-2xl border p-6 ${
                  result.botIntel.cageStatus.quarantined ? 'border-[#ff004044] bg-[#ff004008]' : 'border-[#ffc10733] bg-[#ffc10708]'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{result.botIntel.cageStatus.quarantined ? '⛓️' : '👁️'}</span>
                    <div>
                      <div className="text-xl font-bold" style={{ color: result.botIntel.cageStatus.quarantined ? '#ff0040' : '#ffc107' }}>
                        {result.botIntel.cageStatus.quarantined ? 'QUARANTINED' : 'MONITORED'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {result.botIntel.cageStatus.quarantined
                          ? 'Target isolated from network — all connections blocked'
                          : 'Target under active observation — enhanced logging enabled'}
                      </div>
                    </div>
                  </div>

                  {result.botIntel.cageStatus.quarantineReason && (
                    <div className="text-xs font-mono bg-[#1a0a0e] p-3 rounded-lg mb-4">
                      <span className="text-gray-500">Quarantine Reason:</span>
                      <span className="text-[#ff4060] ml-2">{result.botIntel.cageStatus.quarantineReason}</span>
                    </div>
                  )}

                  {/* Response Playbook */}
                  <h3 className="text-sm font-bold mb-3 text-gray-400">AUTOMATED RESPONSE PLAYBOOK</h3>
                  <div className="space-y-2">
                    {result.botIntel.cageStatus.responsePlaybook.map((action, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 bg-[#0a0e1a] p-3 rounded-lg"
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-[#ff004020] text-[#ff4060]' : 'bg-[#1a2332] text-gray-400'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="text-sm">{action}</span>
                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${
                          i === 0 ? 'bg-[#ff004020] text-[#ff4060]' : 'bg-[#00ff8810] text-[#00ff8880]'
                        }`}>
                          {i === 0 ? 'AUTO-EXECUTED' : 'READY'}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Attack Vectors Summary */}
                <div className="cyber-card p-4">
                  <h3 className="text-sm font-bold mb-3 text-gray-400">IDENTIFIED ATTACK VECTORS</h3>
                  <div className="space-y-2">
                    {result.botIntel.attackVectors.map((av, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="font-mono text-gray-500">{av.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                          color: severityColors[av.severity], background: severityBg[av.severity],
                        }}>{av.severity}</span>
                        <span className="text-white">{av.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
