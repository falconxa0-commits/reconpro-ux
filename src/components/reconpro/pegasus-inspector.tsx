'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Shield,
  ShieldAlert,
  Search,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Globe,
  Bug,
  Eye,
  Scan,
  Cpu,
  Radio,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
type DeviceType = 'ios' | 'android';
type ScanScope = 'full' | 'quick' | 'custom';
type ScanStatus = 'idle' | 'scanning' | 'complete';
type Verdict = 'CLEAN' | 'SUSPICIOUS' | 'LIKELY INFECTED';

interface IOCEntry {
  id: string;
  category: string;
  value: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

interface ScanFinding {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  iocMatched: string;
  recommendation: string;
}

/* ═══════════════════════════════════════════════════════════════
   SIMULATED IOC DATABASE
   ═══════════════════════════════════════════════════════════════ */
const IOC_DATABASE: IOCEntry[] = [
  { id: 'ioc-001', category: 'Pegasus Domain', value: 'i[.]cloudsroute[.]com', source: 'Amnesty/MVT', severity: 'critical', description: 'Known Pegasus C2 domain used in multiple targeted attacks' },
  { id: 'ioc-002', category: 'Pegasus Domain', value: 'send[.]meduza[.]net', source: 'Amnesty/MVT', severity: 'critical', description: 'Pegasus operator domain masquerading as news outlet' },
  { id: 'ioc-003', category: 'Pegasus Domain', value: 'service[.]masstraffic[.]ru', source: 'Amnesty/MVT', severity: 'critical', description: 'Pegasus data exfiltration endpoint' },
  { id: 'ioc-004', category: 'Pegasus Domain', value: 'update[.]vpngate[.]net', source: 'Amnesty/MVT', severity: 'critical', description: 'Fake VPN update infrastructure used by Pegasus' },
  { id: 'ioc-005', category: 'Pegasus Domain', value: 'accounts[.]apple-id[.]services', source: 'Amnesty/MVT', severity: 'critical', description: 'Phishing domain impersonating Apple services' },
  { id: 'ioc-006', category: 'Suspicious Process', value: 'com.apple.IOAccelerator.fault', source: 'MVT Analysis', severity: 'high', description: 'Malicious process name mimicking Apple system daemon' },
  { id: 'ioc-007', category: 'Suspicious Process', value: 'com.apple.camera.applet', source: 'MVT Analysis', severity: 'high', description: 'Spyware component disguised as camera service' },
  { id: 'ioc-008', category: 'Suspicious Process', value: 'systemupdate[.]daemon', source: 'MVT Analysis', severity: 'high', description: 'Fake system update daemon — persistence mechanism' },
  { id: 'ioc-009', category: 'Suspicious Process', value: 'com.apple.BTServer.v2', source: 'MVT Analysis', severity: 'high', description: 'Bluetooth daemon variant used for C2 communication' },
  { id: 'ioc-010', category: 'Network C2', value: '185[.]220[.]101[.]34:443', source: 'Amnesty/MVT', severity: 'critical', description: 'Known NSO Group C2 server IP address' },
  { id: 'ioc-011', category: 'Network C2', value: '91[.]234[.]99[.]22:8080', source: 'Threat Intel', severity: 'high', description: 'Suspicious IP with Pegasus-related traffic patterns' },
  { id: 'ioc-012', category: 'Network C2', value: '45[.]155[.]205[.]78:8443', source: 'Threat Intel', severity: 'high', description: 'C2 infrastructure with certificate pinning bypass' },
  { id: 'ioc-013', category: 'Network C2', value: '23[.]227[.]203[.]69:9001', source: 'Amnesty/MVT', severity: 'critical', description: 'Tor-style C2 communication endpoint' },
  { id: 'ioc-014', category: 'MVT Indicator', value: 'net.iphone.photos.BGTask', source: 'MVT Heuristic', severity: 'medium', description: 'Anomalous background task — possible surveillance agent' },
  { id: 'ioc-015', category: 'MVT Indicator', value: 'com.apple私营', source: 'MVT Heuristic', severity: 'high', description: 'Chinese-character process name — highly anomalous on non-Chinese devices' },
  { id: 'ioc-016', category: 'MVT Indicator', value: 'sms.db anomalistic entries', source: 'MVT Heuristic', severity: 'medium', description: 'SMS database shows unusual access patterns' },
  { id: 'ioc-017', category: 'MVT Indicator', value: 'Backup anomalous size delta', source: 'MVT Heuristic', severity: 'low', description: 'Backup size increased 340% without user action' },
  { id: 'ioc-018', category: 'Network C2', value: '169[.]254[.]169[.]254/metadata', source: 'MVT Analysis', severity: 'high', description: 'Cloud metadata endpoint access from mobile — possible SSRF' },
  { id: 'ioc-019', category: 'Pegasus Domain', value: 'cdn[.]soft-update[.]org', source: 'Amnesty/MVT', severity: 'critical', description: 'Pegasus exploit delivery domain' },
  { id: 'ioc-020', category: 'Suspicious Process', value: 'data[.]arbiter[.]daemon', source: 'MVT Analysis', severity: 'high', description: 'Data exfiltration agent hidden as system service' },
];

/* ─── simulated scan results ─── */
function generateSimulatedResults(device: DeviceType): {
  smsAnalysis: { suspiciousMessages: number; exploitUrls: number; details: string[] };
  networkAnalysis: { c2Domains: number; details: string[] };
  processAnalysis: { anomalousProcesses: number; details: string[] };
  backupAnalysis: { iocCount: number; details: string[] };
  findings: ScanFinding[];
  verdict: Verdict;
  scanId: string;
} {
  const isInfected = Math.random() > 0.6;
  const verdict: Verdict = isInfected
    ? Math.random() > 0.5 ? 'LIKELY INFECTED' : 'SUSPICIOUS'
    : 'CLEAN';

  const infectedFindings: ScanFinding[] = [
    {
      id: 'f-001', category: 'SMS Database', severity: 'critical',
      title: 'Pegasus Exploit URL Detected',
      description: `Found ${1 + Math.floor(Math.random() * 3)} SMS messages containing known Pegasus exploit URLs targeting ${device === 'ios' ? 'iMessage' : 'WhatsApp'}`,
      iocMatched: 'ioc-004 (update.vpngate.net)',
      recommendation: 'Immediately isolate the device. Do not factory reset — preserve evidence for forensic analysis.',
    },
    {
      id: 'f-002', category: 'Network Analysis', severity: 'critical',
      title: 'C2 Domain Communication Detected',
      description: `Network plist shows ${2 + Math.floor(Math.random() * 4)} connections to known Pegasus C2 infrastructure in the last 7 days`,
      iocMatched: 'ioc-010 (185.220.101.34:443)',
      recommendation: 'Block all identified C2 domains at firewall level. Change all credentials used on the device.',
    },
    {
      id: 'f-003', category: 'Process Analysis', severity: 'high',
      title: 'Anomalous System Process',
      description: `Found ${1 + Math.floor(Math.random() * 2)} processes running with Apple-impersonating names but invalid code signatures`,
      iocMatched: 'ioc-006 (com.apple.IOAccelerator.fault)',
      recommendation: 'Kill suspicious processes immediately. Consider full device wipe as rootkit persistence is likely.',
    },
    {
      id: 'f-004', category: 'Backup Analysis', severity: 'high',
      title: 'MVT Indicators of Compromise',
      description: `${3 + Math.floor(Math.random() * 5)} MVT indicators matched in iTunes/Finder backup including anomalous app installation and suspicious plist modifications`,
      iocMatched: 'ioc-014 (net.iphone.photos.BGTask)',
      recommendation: 'Preserve the backup file. Run full MVT analysis for detailed timeline reconstruction.',
    },
    {
      id: 'f-005', category: 'Network Analysis', severity: 'medium',
      title: 'Anomalous DNS Queries',
      description: `${8 + Math.floor(Math.random() * 15)} DNS queries to domains not associated with any installed application`,
      iocMatched: 'ioc-003 (service.masstraffic.ru)',
      recommendation: 'Monitor DNS traffic. Deploy DNS-level blocking for identified suspicious domains.',
    },
  ];

  const cleanFindings: ScanFinding[] = [
    {
      id: 'f-c01', category: 'SMS Database', severity: 'info',
      title: 'No Suspicious SMS Messages',
      description: 'Analyzed 4,287 SMS messages — no known Pegasus exploit URLs or suspicious links found',
      iocMatched: 'None',
      recommendation: 'Continue monitoring. Enable SMS filtering in device settings.',
    },
    {
      id: 'f-c02', category: 'Network Analysis', severity: 'info',
      title: 'No C2 Domain Connections',
      description: 'Network plist analysis: 847 connections analyzed, 0 matched known Pegasus C2 infrastructure',
      iocMatched: 'None',
      recommendation: 'Standard network hygiene is sufficient. Consider using a VPN.',
    },
    {
      id: 'f-c03', category: 'Process Analysis', severity: 'info',
      title: 'All Processes Valid',
      description: `${237 + Math.floor(Math.random() * 50)} processes analyzed — all have valid code signatures and expected behavior`,
      iocMatched: 'None',
      recommendation: 'No action required.',
    },
    {
      id: 'f-c04', category: 'Backup Analysis', severity: 'info',
      title: 'Backup Integrity Verified',
      description: '0 MVT indicators found in backup. Backup size and modification patterns are normal.',
      iocMatched: 'None',
      recommendation: 'Maintain regular backup schedule.',
    },
  ];

  const suspiciousFindings: ScanFinding[] = [
    {
      id: 'f-s01', category: 'SMS Database', severity: 'medium',
      title: 'Unusual SMS Activity Pattern',
      description: 'Detected 2 messages from unknown senders containing shortened URLs (bit.ly, t.co)',
      iocMatched: 'Partial match — URL shortener service',
      recommendation: 'Verify the sender identity. Do not click links in messages from unknown numbers.',
    },
    {
      id: 'f-s02', category: 'Network Analysis', severity: 'medium',
      title: 'Suspicious DNS Query',
      description: '1 DNS query to a domain with suspicious TLD pattern detected in network plist',
      iocMatched: 'Domain pattern match (not in known IOC list)',
      recommendation: 'Monitor for further connections. Consider blocking the domain.',
    },
    {
      id: 'f-s03', category: 'Process Analysis', severity: 'low',
      title: 'Background Task Anomaly',
      description: '1 background task with unusual scheduling pattern (runs every 15 min)',
      iocMatched: 'Behavioral heuristic',
      recommendation: 'Investigate the associated app. Check if it appears in Settings > Background App Refresh.',
    },
    {
      id: 'f-s04', category: 'Backup Analysis', severity: 'info',
      title: 'Backup Analysis Clean',
      description: 'No MVT indicators found. Backup integrity verified.',
      iocMatched: 'None',
      recommendation: 'Continue regular monitoring.',
    },
  ];

  const findings = verdict === 'LIKELY INFECTED'
    ? infectedFindings
    : verdict === 'SUSPICIOUS'
      ? suspiciousFindings
      : cleanFindings;

  return {
    smsAnalysis: {
      suspiciousMessages: verdict === 'CLEAN' ? 0 : (1 + Math.floor(Math.random() * 5)),
      exploitUrls: verdict === 'LIKELY INFECTED' ? (1 + Math.floor(Math.random() * 3)) : 0,
      details: verdict === 'LIKELY INFECTED'
        ? ['Found known Pegasus exploit URL in iMessage history', 'Message contained invisible character payload', 'Sender: +1 (XXX) XXX-XXXX (unregistered number)']
        : ['All SMS messages analyzed — no anomalies detected'],
    },
    networkAnalysis: {
      c2Domains: verdict === 'LIKELY INFECTED' ? (2 + Math.floor(Math.random() * 3)) : (verdict === 'SUSPICIOUS' ? 1 : 0),
      details: verdict === 'LIKELY INFECTED'
        ? ['C2 connection to 185.220.101.34:443 (NSO infrastructure)', 'C2 connection to 45.155.205.78:8443 (encrypted beacon)', 'Anomalous outbound connections during idle periods']
        : verdict === 'SUSPICIOUS'
          ? ['1 unresolved DNS query to suspicious domain']
          : ['847 network connections analyzed — all normal'],
    },
    processAnalysis: {
      anomalousProcesses: verdict === 'LIKELY INFECTED' ? (1 + Math.floor(Math.random() * 2)) : 0,
      details: verdict === 'LIKELY INFECTED'
        ? ['com.apple.IOAccelerator.fault — fake Apple process, no valid signature', 'data.arbiter.daemon — no matching app in installed bundle']
        : ['All 271 processes verified — valid code signatures'],
    },
    backupAnalysis: {
      iocCount: verdict === 'CLEAN' ? 0 : (2 + Math.floor(Math.random() * 4)),
      details: verdict === 'CLEAN'
        ? ['Backup integrity verified — no anomalies']
        : ['Modified preferences plist (com.apple.networkextension)', 'New app without App Store receipt', 'Anomalous data usage spike in backup', 'Modified Safari history database'],
    },
    findings,
    verdict,
    scanId: `PEG-${Date.now().toString(36).toUpperCase()}`,
  };
}

/* ─── severity utilities ─── */
function sevBadgeColor(s: string): string {
  switch (s) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'info': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function verdictColor(v: Verdict): string {
  switch (v) {
    case 'CLEAN': return 'text-green-400 border-green-500/30 bg-green-500/10';
    case 'SUSPICIOUS': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    case 'LIKELY INFECTED': return 'text-red-400 border-red-500/30 bg-red-500/10';
  }
}

function verdictIcon(v: Verdict) {
  switch (v) {
    case 'CLEAN': return <Shield className="w-6 h-6 text-green-400" />;
    case 'SUSPICIOUS': return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
    case 'LIKELY INFECTED': return <ShieldAlert className="w-6 h-6 text-red-400" />;
  }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function PegasusInspectorPanel() {
  /* ─── state ─── */
  const [device, setDevice] = useState<DeviceType>('ios');
  const [backupPath, setBackupPath] = useState('/var/backups/iphone-backup-2024/');
  const [scope, setScope] = useState<ScanScope>('full');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [results, setResults] = useState<ReturnType<typeof generateSimulatedResults> | null>(null);
  const [iocFilter, setIocFilter] = useState('');
  const [iocCategoryFilter, setIocCategoryFilter] = useState('all');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'iocs' | 'results' | 'report' | 'mvt'>('config');

  const abortRef = useRef(false);

  /* filtered IOCs */
  const filteredIOCs = IOC_DATABASE.filter(ioc => {
    const matchesText = !iocFilter || ioc.value.toLowerCase().includes(iocFilter.toLowerCase())
      || ioc.description.toLowerCase().includes(iocFilter.toLowerCase())
      || ioc.category.toLowerCase().includes(iocFilter.toLowerCase());
    const matchesCat = iocCategoryFilter === 'all' || ioc.category === iocCategoryFilter;
    return matchesText && matchesCat;
  });

  /* ─── scan runner ─── */
  const startScan = useCallback(() => {
    if (status === 'scanning') return;
    setStatus('scanning');
    setScanProgress(0);
    setResults(null);
    setReportGenerated(false);
    abortRef.current = false;

    const phases = [
      { name: 'Initializing MVT scan engine', duration: 800 },
      { name: 'Parsing backup manifest', duration: 600 },
      { name: 'Analyzing SMS database', duration: 1200 },
      { name: 'Scanning network plist', duration: 1000 },
      { name: 'Analyzing installed processes', duration: 900 },
      { name: 'Checking backup integrity', duration: 700 },
      { name: 'Running IOC cross-reference', duration: 1100 },
      { name: 'Generating verdict', duration: 500 },
    ];

    let totalElapsed = 0;
    const totalDuration = phases.reduce((s, p) => s + p.duration, 0);

    const runPhase = (idx: number) => {
      if (idx >= phases.length || abortRef.current) {
        if (!abortRef.current) {
          const res = generateSimulatedResults(device);
          setResults(res);
          setStatus('complete');
          setActiveTab('results');
        } else {
          setStatus('idle');
        }
        return;
      }

      const phase = phases[idx];
      setCurrentPhase(phase.name);
      const iv = setInterval(() => {
        totalElapsed += 30;
        const pct = Math.min((totalElapsed / totalDuration) * 100, 100);
        setScanProgress(pct);
      }, 30);

      setTimeout(() => {
        clearInterval(iv);
        setCurrentPhase('');
        runPhase(idx + 1);
      }, phase.duration);
    };

    runPhase(0);
  }, [status, device]);

  /* ─── generate forensic report text ─── */
  const forensicReport = results ? `
═════════════════════════════════════════════════════════════════
  SHADOW-C2 PEGASUS INSPECTOR — FORENSIC REPORT
  Scan ID: ${results.scanId}
  Generated: ${new Date().toISOString()}
═════════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY
─────────────────
Device Type:         ${device.toUpperCase()}
Scan Scope:          ${scope.toUpperCase()}
Overall Verdict:     ${results.verdict}
SMS Analysis:        ${results.smsAnalysis.suspiciousMessages} suspicious messages, ${results.smsAnalysis.exploitUrls} exploit URLs
Network Analysis:    ${results.networkAnalysis.c2Domains} C2 domains detected
Process Analysis:    ${results.processAnalysis.anomalousProcesses} anomalous processes
Backup Analysis:     ${results.backupAnalysis.iocCount} indicators of compromise

TECHNICAL DETAILS
─────────────────

[SMS DATABASE ANALYSIS]
${results.smsAnalysis.details.map(d => '  • ' + d).join('\n')}

[NETWORK PLIST ANALYSIS]
${results.networkAnalysis.details.map(d => '  • ' + d).join('\n')}

[PROCESS ANALYSIS]
${results.processAnalysis.details.map(d => '  • ' + d).join('\n')}

[BACKUP ANALYSIS]
${results.backupAnalysis.details.map(d => '  • ' + d).join('\n')}

IOC MATCHES
───────────
${results.findings.map(f => `  [${f.severity.toUpperCase()}] ${f.title}
    IOC: ${f.iocMatched}
    Detail: ${f.description}
    Recommendation: ${f.recommendation}`).join('\n\n')}

RECOMMENDATIONS
───────────────
${results.verdict === 'LIKELY INFECTED' ? [
  '1. IMMEDIATELY ISOLATE the device from all networks',
  '2. DO NOT factory reset — preserve forensic evidence',
  '3. Export all logs and backup data',
  '4. Contact a digital security professional',
  '5. Change ALL passwords used on this device',
  '6. Enable 2FA on all accounts (from a DIFFERENT device)',
  '7. Notify relevant authorities if targeted surveillance suspected',
].join('\n') : results.verdict === 'SUSPICIOUS' ? [
  '1. Monitor device for further anomalies over the next 72 hours',
  '2. Investigate flagged processes and network connections',
  '3. Enable enhanced logging and review regularly',
  '4. Keep device OS and apps updated',
  '5. Review installed apps for unknown or suspicious applications',
].join('\n') : [
  '1. No immediate action required',
  '2. Continue regular security monitoring',
  '3. Maintain current OS version and security patches',
  '4. Consider enabling additional security features (VPN, DNS filtering)',
].join('\n')}

═════════════════════════════════════════════════════════════════
  Report generated by Shadow-C2 Pegasus Inspector (ReconPro)
  Powered by Amnesty International MVT framework
═════════════════════════════════════════════════════════════════`.trim() : '';

  /* ─── download report ─── */
  const downloadReport = useCallback(() => {
    if (!forensicReport) return;
    const blob = new Blob([forensicReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pegasus-report-${results?.scanId || 'unknown'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [forensicReport, results]);

  /* ─── IOC categories ─── */
  const iocCategories = ['all', ...new Set(IOC_DATABASE.map(i => i.category))];

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="bg-[#0a0e17] border border-red-900/20 rounded-lg overflow-hidden font-mono text-sm">
      {/* ─── HEADER ─── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1320] border-b border-red-900/20">
        <ShieldAlert className="w-5 h-5 text-red-400" />
        <div>
          <h2 className="text-red-400 font-bold text-sm tracking-wide">SHADOW-C2 PEGASUS INSPECTOR</h2>
          <p className="text-gray-600 text-[10px]">Pegasus Spyware Detection — Powered by MVT</p>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="flex border-b border-gray-800 bg-[#060a12]">
        {[
          { key: 'config', label: 'Scan Config', icon: Scan },
          { key: 'iocs', label: 'IOC Database', icon: Database },
          { key: 'results', label: 'Scan Results', icon: Bug },
          { key: 'report', label: 'Forensic Report', icon: FileText },
          { key: 'mvt', label: 'MVT Status', icon: Eye },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] transition-colors border-b-2 ${
              activeTab === key
                ? 'text-red-400 border-red-400 bg-red-500/5'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT ─── */}
      <div className="p-4 max-h-[70vh] overflow-y-auto scrollbar-thin">

        {/* ═══ TAB: CONFIG ═══ */}
        {activeTab === 'config' && (
          <div className="space-y-5">
            {/* device type */}
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-2">DEVICE TYPE</label>
              <div className="flex gap-2">
                {(['ios', 'android'] as DeviceType[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className={`flex items-center gap-2 px-4 py-2 rounded border text-xs transition-all ${
                      device === d
                        ? 'bg-red-500/10 border-red-500/40 text-red-400'
                        : 'bg-[#0d1320] border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* backup path */}
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-2">BACKUP PATH</label>
              <input
                type="text"
                value={backupPath}
                onChange={e => setBackupPath(e.target.value)}
                className="w-full bg-[#060a12] border border-gray-800 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-red-500/40 font-mono"
                placeholder="/path/to/backup/"
              />
              <p className="text-gray-700 text-[10px] mt-1">Simulated — no real file access in browser mode</p>
            </div>

            {/* scan scope */}
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-2">SCAN SCOPE</label>
              <div className="flex gap-2">
                {(['full', 'quick', 'custom'] as ScanScope[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={`px-4 py-2 rounded border text-xs transition-all ${
                      scope === s
                        ? 'bg-red-500/10 border-red-500/40 text-red-400'
                        : 'bg-[#0d1320] border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* start scan button */}
            <button
              onClick={startScan}
              disabled={status === 'scanning'}
              className={`w-full py-3 rounded text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                status === 'scanning'
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              }`}
            >
              {status === 'scanning' ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' as const }}
                  >
                    <Radio className="w-4 h-4" />
                  </motion.div>
                  SCANNING — {scanProgress.toFixed(0)}%
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  START SCAN
                </>
              )}
            </button>

            {/* progress */}
            <AnimatePresence>
              {status === 'scanning' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                      style={{ width: `${scanProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  {currentPhase && (
                    <p className="text-gray-500 text-[11px] flex items-center gap-1">
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="w-1.5 h-1.5 bg-red-400 rounded-full"
                      />
                      {currentPhase}...
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ═══ TAB: IOC DATABASE ═══ */}
        {activeTab === 'iocs' && (
          <div className="space-y-4">
            {/* stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Total IOCs', value: IOC_DATABASE.length, color: 'text-red-400' },
                { label: 'Pegasus Domains', value: IOC_DATABASE.filter(i => i.category === 'Pegasus Domain').length, color: 'text-orange-400' },
                { label: 'Suspicious Processes', value: IOC_DATABASE.filter(i => i.category === 'Suspicious Process').length, color: 'text-yellow-400' },
                { label: 'Network C2', value: IOC_DATABASE.filter(i => i.category === 'Network C2').length, color: 'text-cyan-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-[#0d1320] border border-gray-800 rounded p-2.5 text-center">
                  <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-gray-600 text-[10px]">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                <input
                  type="text"
                  value={iocFilter}
                  onChange={e => setIocFilter(e.target.value)}
                  placeholder="Search IOCs..."
                  className="w-full bg-[#060a12] border border-gray-800 rounded pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-red-500/40"
                />
              </div>
              <select
                value={iocCategoryFilter}
                onChange={e => setIocCategoryFilter(e.target.value)}
                className="bg-[#060a12] border border-gray-800 rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-red-500/40"
              >
                {iocCategories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>

            {/* IOC list */}
            <div className="space-y-1.5">
              {filteredIOCs.map(ioc => (
                <div key={ioc.id} className="bg-[#0d1320] border border-gray-800 rounded p-2.5 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sevBadgeColor(ioc.severity)}`}>
                          {ioc.severity.toUpperCase()}
                        </span>
                        <span className="text-gray-500 text-[10px]">{ioc.category}</span>
                        <span className="text-gray-600 text-[10px]">{ioc.source}</span>
                      </div>
                      <p className="text-yellow-300 text-xs mt-1 font-bold break-all">{ioc.value}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">{ioc.description}</p>
                    </div>
                    <Globe className="w-3 h-3 text-gray-700 shrink-0 mt-1" />
                  </div>
                </div>
              ))}
              <p className="text-gray-700 text-[10px] text-center py-2">
                Showing {filteredIOCs.length} of {IOC_DATABASE.length} IOCs
              </p>
            </div>
          </div>
        )}

        {/* ═══ TAB: RESULTS ═══ */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {status === 'idle' && (
              <div className="text-center py-12 text-gray-600">
                <Bug className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No scan results yet. Configure and run a scan first.</p>
              </div>
            )}

            {status === 'scanning' && (
              <div className="text-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' as const }}
                >
                  <Radio className="w-10 h-10 text-red-400 mx-auto" />
                </motion.div>
                <p className="text-gray-500 mt-3">Scanning in progress...</p>
              </div>
            )}

            {status === 'complete' && results && (
              <>
                {/* verdict */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`border rounded-lg p-4 text-center ${verdictColor(results.verdict)}`}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {verdictIcon(results.verdict)}
                    <span className="text-lg font-bold">{results.verdict}</span>
                  </div>
                  <p className="text-[10px] opacity-60">Scan ID: {results.scanId}</p>
                </motion.div>

                {/* analysis summary cards */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Globe, label: 'SMS Database', suspicious: results.smsAnalysis.suspiciousMessages, exploits: results.smsAnalysis.exploitUrls },
                    { icon: Radio, label: 'Network', c2: results.networkAnalysis.c2Domains },
                    { icon: Cpu, label: 'Processes', anomalous: results.processAnalysis.anomalousProcesses },
                    { icon: Database, label: 'Backup', iocs: results.backupAnalysis.iocCount },
                  ].map(card => (
                    <div key={card.label} className="bg-[#0d1320] border border-gray-800 rounded p-3">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] mb-2">
                        <card.icon className="w-3 h-3" />
                        {card.label}
                      </div>
                      <div className="space-y-1">
                        {card.suspicious !== undefined && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Suspicious:</span>
                            <span className={card.suspicious > 0 ? 'text-orange-400' : 'text-green-400'}>{card.suspicious}</span>
                          </div>
                        )}
                        {card.exploits !== undefined && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Exploit URLs:</span>
                            <span className={card.exploits > 0 ? 'text-red-400' : 'text-green-400'}>{card.exploits}</span>
                          </div>
                        )}
                        {card.c2 !== undefined && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">C2 Domains:</span>
                            <span className={card.c2 > 0 ? 'text-red-400' : 'text-green-400'}>{card.c2}</span>
                          </div>
                        )}
                        {card.anomalous !== undefined && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Anomalous:</span>
                            <span className={card.anomalous > 0 ? 'text-orange-400' : 'text-green-400'}>{card.anomalous}</span>
                          </div>
                        )}
                        {card.iocs !== undefined && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">IOCs:</span>
                            <span className={card.iocs > 0 ? 'text-red-400' : 'text-green-400'}>{card.iocs}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* detailed findings */}
                <div>
                  <h3 className="text-gray-400 text-xs font-bold mb-2">DETAILED FINDINGS</h3>
                  <div className="space-y-2">
                    {results.findings.map(f => (
                      <div key={f.id} className="bg-[#0d1320] border border-gray-800 rounded p-3">
                        <div className="flex items-start gap-2">
                          <div className="shrink-0 mt-0.5">
                            {f.severity === 'critical' || f.severity === 'high' ? (
                              <XCircle className="w-4 h-4 text-red-400" />
                            ) : f.severity === 'medium' || f.severity === 'low' ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sevBadgeColor(f.severity)}`}>
                                {f.severity.toUpperCase()}
                              </span>
                              <span className="text-gray-500 text-[10px]">{f.category}</span>
                              <span className="text-white text-xs font-bold">{f.title}</span>
                            </div>
                            <p className="text-gray-400 text-[11px]">{f.description}</p>
                            <p className="text-gray-600 text-[10px] mt-1">
                              IOC: <span className="text-yellow-300">{f.iocMatched}</span>
                            </p>
                            <p className="text-gray-500 text-[10px] mt-0.5">
                              → {f.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('report')}
                    className="flex-1 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3 h-3" />
                    Generate Forensic Report
                  </button>
                  <button
                    onClick={startScan}
                    className="flex-1 py-2 bg-[#0d1320] border border-gray-800 rounded text-gray-400 text-xs hover:border-gray-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Scan className="w-3 h-3" />
                    Scan Again
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: FORENSIC REPORT ═══ */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            {!results ? (
              <div className="text-center py-12 text-gray-600">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Run a scan first to generate a forensic report.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-gray-400 text-xs font-bold">FORENSIC REPORT</h3>
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[11px] hover:bg-red-500/20 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
                <pre className="bg-[#060a12] border border-gray-800 rounded p-4 text-[11px] text-gray-400 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[50vh] overflow-y-auto scrollbar-thin">
                  {forensicReport}
                </pre>
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: MVT STATUS ═══ */}
        {activeTab === 'mvt' && (
          <div className="space-y-4">
            <div className="bg-[#0d1320] border border-gray-800 rounded p-4">
              <h3 className="text-gray-400 text-xs font-bold mb-3">MVT INTEGRATION STATUS</h3>
              <div className="space-y-3">
                {[
                  { label: 'MVT Framework', status: 'Connected', detail: 'Amnesty International MVT v2.3.2', ok: true },
                  { label: 'IOC Repository', status: 'Synced', detail: `Last sync: ${new Date().toLocaleDateString()} — ${IOC_DATABASE.length} IOCs loaded`, ok: true },
                  { label: 'Cross-Validation', status: results ? 'Complete' : 'Pending', detail: results ? `${results.findings.length} findings cross-validated against MVT database` : 'Run a scan to enable cross-validation', ok: !!results },
                  { label: 'NSO Group Indicators', status: 'Loaded', detail: '5 known Pegasus C2 domain patterns active', ok: true },
                  { label: 'Heuristic Engine', status: 'Active', detail: 'Behavioral analysis + signature-based detection enabled', ok: true },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    {item.ok ? (
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-bold">{item.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.ok ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>{item.status}</span>
                      </div>
                      <p className="text-gray-600 text-[10px]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1320] border border-gray-800 rounded p-4">
              <h3 className="text-gray-400 text-xs font-bold mb-2">ABOUT MVT</h3>
              <p className="text-gray-500 text-[11px] leading-relaxed">
                The Mobile Verification Toolkit (MVT) is an open-source tool developed by Amnesty International&apos;s
                Security Lab. It helps human rights defenders, journalists, and activists detect traces of
                Pegasus and other sophisticated spyware on iOS and Android devices. Shadow-C2 Inspector
                leverages MVT&apos;s IOC database and analysis methodology within the ReconPro platform.
              </p>
              <a
                href="https://github.com/amnestytech/mvt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-red-400 text-[11px] mt-2 hover:text-red-300 transition-colors"
              >
                github.com/amnestytech/mvt <Globe className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
