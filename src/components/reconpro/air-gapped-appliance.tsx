'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, HardDrive, Shield, ShieldCheck, Lock, Usb, Download, Upload,
  RotateCcw, CheckCircle, XCircle, FileText, Settings, Eye, Clock, Cpu,
  MemoryStick, Key, AlertTriangle, ChevronDown, ChevronRight, Copy,
  Terminal, Database,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface TenantEntry {
  id: string;
  name: string;
  resourceAllocation: { cpu: string; memory: string; storage: string };
  isolationStatus: 'enforced' | 'pending' | 'degraded';
  status: 'active' | 'suspended';
}

interface SysLog {
  id: string;
  timestamp: string;
  category: 'boot' | 'security' | 'update' | 'system';
  severity: 'info' | 'warn' | 'error';
  message: string;
}

interface DeployStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════
// Simulated Data
// ═══════════════════════════════════════════════════════════════════════

const TENANTS: TenantEntry[] = [
  { id: 't-001', name: 'Acme Defense Corp', resourceAllocation: { cpu: '16 vCPU', memory: '32 GB', storage: '500 GB' }, isolationStatus: 'enforced', status: 'active' },
  { id: 't-002', name: 'GovLab Alpha', resourceAllocation: { cpu: '24 vCPU', memory: '48 GB', storage: '800 GB' }, isolationStatus: 'enforced', status: 'active' },
  { id: 't-003', name: 'SecureNet Inc', resourceAllocation: { cpu: '8 vCPU', memory: '16 GB', storage: '200 GB' }, isolationStatus: 'enforced', status: 'active' },
  { id: 't-004', name: 'MilSpec Systems', resourceAllocation: { cpu: '32 vCPU', memory: '64 GB', storage: '1 TB' }, isolationStatus: 'pending', status: 'suspended' },
];

const SYS_LOGS: SysLog[] = [
  { id: 'log-001', timestamp: '2024-12-10 08:02:14', category: 'boot', severity: 'info', message: 'System boot completed successfully. Kernel 5.15.0-reconpro.' },
  { id: 'log-002', timestamp: '2024-12-10 08:02:18', category: 'security', severity: 'info', message: 'SELinux enforcing mode activated. Policy loaded.' },
  { id: 'log-003', timestamp: '2024-12-10 08:02:20', category: 'security', severity: 'info', message: 'TPM attestation passed. PCR registers verified.' },
  { id: 'log-004', timestamp: '2024-12-10 08:02:22', category: 'boot', severity: 'info', message: 'HSM module detected. PKCS#11 initialized.' },
  { id: 'log-005', timestamp: '2024-12-10 08:15:33', category: 'system', severity: 'warn', message: 'Disk I/O latency spike detected on /dev/nvme0n1. Monitor closely.' },
  { id: 'log-006', timestamp: '2024-12-10 09:00:01', category: 'security', severity: 'info', message: 'Air-gap integrity check PASSED. No external network interfaces active.' },
  { id: 'log-007', timestamp: '2024-12-10 10:22:45', category: 'update', severity: 'info', message: 'USB update package detected. Signature verification in progress…' },
  { id: 'log-008', timestamp: '2024-12-10 10:22:52', category: 'update', severity: 'info', message: 'Update v3.4.1 signature VERIFIED (SHA-256 match). Ready for installation.' },
  { id: 'log-009', timestamp: '2024-12-10 12:00:00', category: 'security', severity: 'info', message: 'Scheduled security scan completed. 0 vulnerabilities found.' },
  { id: 'log-010', timestamp: '2024-12-10 14:33:11', category: 'system', severity: 'error', message: 'Fan module 2 RPM below threshold (1200 RPM). Check hardware.' },
  { id: 'log-011', timestamp: '2024-12-10 16:00:00', category: 'security', severity: 'info', message: 'Certificate rotation completed. FIPS module re-validated.' },
  { id: 'log-012', timestamp: '2024-12-10 18:00:02', category: 'system', severity: 'info', message: 'Automated backup snapshot created. Size: 24.6 GB.' },
];

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const SEVERITY_COLORS = {
  info: { text: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  warn: { text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
  error: { text: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
};

const ISOLATION_COLORS = {
  enforced: 'text-green-400',
  pending: 'text-yellow-400',
  degraded: 'text-red-400',
};

// ═══════════════════════════════════════════════════════════════════════
// Hardware Illustration Component (CSS 3D-ish)
// ═══════════════════════════════════════════════════════════════════════

function HardwareRack({ status }: { status: 'online' | 'offline' }) {
  const isOnline = status === 'online';
  const ledColor = isOnline ? '#22c55e' : '#ef4444';
  const ledGlow = isOnline ? 'shadow-green-500/60' : 'shadow-red-500/60';

  return (
    <div className="flex items-center justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
        style={{ perspective: '800px' }}
      >
        {/* Main chassis */}
        <div className="w-80 bg-gradient-to-b from-[#2a2f26] to-[#1a1f16] rounded-xl border-2 border-[#3a4030] shadow-2xl relative overflow-hidden"
          style={{ transform: 'rotateX(2deg)', transformStyle: 'preserve-3d' }}>
          {/* Top ventilation */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-[#3a4030] to-[#2a2f26] flex items-center justify-center gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-0.5 h-1.5 bg-[#4a5040] rounded-full" />
            ))}
          </div>

          {/* Front panel */}
          <div className="pt-6 pb-4 px-4">
            {/* Model label */}
            <div className="text-center mb-4">
              <p className="text-[10px] tracking-[0.3em] text-[#6a7560] uppercase">ReconPro</p>
              <p className="text-xs font-bold tracking-wider text-[#8a9570]">APPLIANCE-R1</p>
            </div>

            {/* Status LEDs */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {['PWR', 'NET', 'HDD', 'HSM', 'TMP'].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'animate-pulse' : ''}`}
                    style={{
                      backgroundColor: i === 0 ? ledColor : i === 4 ? (isOnline ? '#22c55e' : '#f59e0b') : '#22c55e',
                      boxShadow: `0 0 6px ${i === 0 ? ledColor : '#22c55e'}80`,
                    }} />
                  <span className="text-[7px] text-[#5a6540] font-mono">{label}</span>
                </div>
              ))}
            </div>

            {/* Drive bays */}
            <div className="flex gap-1.5 justify-center mb-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-14 h-8 rounded border border-[#3a4030] bg-[#22271e] flex items-center justify-center">
                  <div className="w-10 h-5 rounded-sm border border-[#4a5040] bg-[#1a1f16]">
                    <div className="flex items-center justify-center h-full">
                      <HardDrive size={8} className="text-[#4a5040]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ports */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-3 h-2 rounded-sm border border-[#4a5040] bg-[#111410]" />
              ))}
            </div>

            {/* USB port */}
            <div className="flex items-center justify-center">
              <div className="w-10 h-4 rounded border border-[#4a5040] bg-[#111410] flex items-center justify-center">
                <Usb size={6} className="text-[#6a7560]" />
              </div>
            </div>
          </div>

          {/* Bottom ventilation */}
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-[#3a4030] to-[#2a2f26] flex items-center justify-center gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-0.5 h-1.5 bg-[#4a5040] rounded-full" />
            ))}
          </div>

          {/* Glow effect */}
          {isOnline && (
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ boxShadow: `0 0 40px rgba(34, 197, 94, 0.08), inset 0 0 40px rgba(34, 197, 94, 0.03)` }} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════

export function AirGappedAppliancePanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'deploy' | 'security' | 'updates' | 'tenants' | 'logs' | 'compliance'>('overview');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [logFilter, setLogFilter] = useState<string>('all');
  const [elapsed, setElapsed] = useState(0);
  const [copiedSn, setCopiedSn] = useState(false);

  // Uptime counter
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleStep = (id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredLogs = logFilter === 'all'
    ? SYS_LOGS
    : SYS_LOGS.filter(l => l.category === logFilter);

  const serialNumber = 'RPRO-R1-2024-0847';

  // ── Deploy Steps ──
  const deploySteps: DeployStep[] = [
    {
      id: 'step-1',
      title: 'Hardware Requirements',
      icon: <Server size={16} />,
      content: (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#6a7560]">
                <th className="text-left py-2 font-medium">Component</th>
                <th className="text-left py-2 font-medium">Minimum</th>
                <th className="text-left py-2 font-medium">Recommended</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                { comp: 'Server', min: 'Dell R640 / HP DL380', rec: 'Dell R640 Gen10' },
                { comp: 'CPU', min: '16 cores, 2.4 GHz', rec: '32 cores, 2.6 GHz' },
                { comp: 'RAM', min: '32 GB DDR4 ECC', rec: '64 GB DDR4 ECC' },
                { comp: 'Storage', min: '1 TB NVMe', rec: '2 TB NVMe (RAID-1)' },
                { comp: 'HSM', min: 'Optional', rec: 'Thales nCipher (FIPS 140-2 L3)' },
                { comp: 'Network', min: '1x GbE (isolated)', rec: '2x 10GbE (bonded)' },
              ].map(row => (
                <tr key={row.comp} className="border-b border-white/5">
                  <td className="py-2 text-slate-400">{row.comp}</td>
                  <td className="py-2">{row.min}</td>
                  <td className="py-2 text-green-400">{row.rec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'step-2',
      title: 'ISO Installation',
      icon: <Download size={16} />,
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <ol className="list-decimal list-inside space-y-2">
            <li>Download the ReconPro appliance ISO from the secure portal</li>
            <li>Flash ISO to a USB 3.0 drive using <code className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-xs">dd if=reconpro.iso of=/dev/sdX bs=4M status=progress</code></li>
            <li>Insert USB into the target server and boot from USB</li>
            <li>Select <strong className="text-green-400">&quot;Install ReconPro Appliance&quot;</strong> from the boot menu</li>
            <li>Follow the guided partitioning (auto-encrypted LUKS)</li>
            <li>Set the master encryption passphrase (minimum 16 characters)</li>
            <li>Remove USB after installation completes and reboot</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'step-3',
      title: 'Initial Configuration',
      icon: <Settings size={16} />,
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <div className="space-y-2">
            <p className="font-medium text-green-400">Network Configuration:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Assign a static IP on the isolated management network</li>
              <li>Configure DNS (internal resolver only — no external DNS)</li>
              <li>Verify no default gateway routes to external networks</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-green-400">Admin Account:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Create admin account with MFA (TOTP or hardware key)</li>
              <li>Set up emergency recovery key (offline backup)</li>
              <li>Enable audit logging for all admin actions</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'step-4',
      title: 'Security Hardening',
      icon: <Shield size={16} />,
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <div className="space-y-2">
            <p className="font-medium text-green-400">SELinux:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Mode: Enforcing (targeted policy)</li>
              <li>Custom ReconPro policy module loaded</li>
              <li>Verify with: <code className="px-1 py-0.5 rounded bg-white/5 font-mono text-[11px]">sestatus</code></li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-green-400">Firewall Rules:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Allow: TCP 8443 (HTTPS management UI)</li>
              <li>Allow: TCP 22 (SSH, key-only, rate-limited)</li>
              <li>Deny: All other inbound traffic</li>
              <li>Deny: All outbound traffic (air-gap enforced)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-green-400">Additional Hardening:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Disable USB auto-mount (update transfer only via authorized tool)</li>
              <li>Enable kernel lockdown mode</li>
              <li>Disable Bluetooth, WiFi, and unnecessary modules</li>
              <li>Configure TPM-based measured boot</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'step-5',
      title: 'Tenant Setup',
      icon: <Database size={16} />,
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <ol className="list-decimal list-inside space-y-2">
            <li>Create tenant organization via the admin CLI: <code className="px-1 py-0.5 rounded bg-white/5 font-mono text-[11px]">reconpro tenant create --name &quot;Org Name&quot;</code></li>
            <li>Assign resource quotas (CPU cores, memory, storage)</li>
            <li>Configure tenant isolation policies (namespaces, cgroups, SELinux contexts)</li>
            <li>Create tenant admin account with scoped permissions</li>
            <li>Import tenant-specific configuration and data via encrypted USB</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'step-6',
      title: 'Update Mechanism (USB Sneakernet)',
      icon: <Upload size={16} />,
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <ol className="list-decimal list-inside space-y-2">
            <li>Download signed update package from the secure portal on an air-gapped workstation</li>
            <li>Transfer to USB drive (encrypted with transfer key)</li>
            <li>Insert USB into appliance and run: <code className="px-1 py-0.5 rounded bg-white/5 font-mono text-[11px]">reconpro update verify /media/usb/update-3.4.2.sig</code></li>
            <li>System verifies Ed25519 signature and SHA-256 checksum</li>
            <li>Apply update: <code className="px-1 py-0.5 rounded bg-white/5 font-mono text-[11px]">reconpro update apply /media/usb/update-3.4.2.pkg</code></li>
            <li>System creates automatic rollback snapshot before applying</li>
            <li>Reboot into new version. Verify integrity post-update.</li>
          </ol>
          <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20 mt-2">
            <p className="text-xs text-yellow-400 flex items-center gap-1"><AlertTriangle size={12} /> Updates are the ONLY permitted USB operation. No data export.</p>
          </div>
        </div>
      ),
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  const tabs = [
    { id: 'overview' as const, label: 'Appliance', icon: <Server size={14} /> },
    { id: 'deploy' as const, label: 'Deployment', icon: <FileText size={14} /> },
    { id: 'security' as const, label: 'Security', icon: <Shield size={14} /> },
    { id: 'updates' as const, label: 'Updates', icon: <Download size={14} /> },
    { id: 'tenants' as const, label: 'Tenants', icon: <Database size={14} /> },
    { id: 'logs' as const, label: 'Logs', icon: <Terminal size={14} /> },
    { id: 'compliance' as const, label: 'Compliance', icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#111610] text-white">
      {/* ── Header ── */}
      <div className="border-b border-[#2a3520] bg-[#161c12]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Air-Gapped Appliance</h1>
              <p className="text-xs text-[#6a7560]">Sovereign Enterprise Deployment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[#6a7560]">
              <Clock size={12} />
              <span>Uptime: {formatUptime(elapsed)}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
              STATUS: ONLINE
            </span>
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <Settings size={16} className="text-[#6a7560]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-[#2a3520] bg-[#161c12]/80">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-[#6a7560] hover:text-slate-300'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            {/* ══════════ OVERVIEW TAB ══════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Hardware Illustration */}
                <HardwareRack status="online" />

                {/* Hardware Specs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Model', value: 'RECONPRO-APPLIANCE-R1', icon: <Server size={16} className="text-green-400" /> },
                    { label: 'Firmware', value: 'v3.4.1', icon: <Cpu size={16} className="text-green-400" /> },
                    { label: 'Hardware', value: 'Dell R640 Gen10', icon: <HardDrive size={16} className="text-green-400" /> },
                    { label: 'Serial Number', value: serialNumber, icon: <Key size={16} className="text-green-400" /> },
                    { label: 'CPU', value: '32 cores @ 2.6 GHz', icon: <Cpu size={16} className="text-blue-400" /> },
                    { label: 'Memory', value: '64 GB DDR4 ECC', icon: <MemoryStick size={16} className="text-blue-400" /> },
                    { label: 'Storage', value: '2 TB NVMe RAID-1', icon: <HardDrive size={16} className="text-blue-400" /> },
                    { label: 'HSM', value: 'Thales nCipher (opt)', icon: <Lock size={16} className="text-yellow-400" /> },
                  ].map((spec, i) => (
                    <motion.div key={spec.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="bg-[#1a2016] rounded-xl border border-[#2a3520] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-[#6a7560]">{spec.label}</span>
                        {spec.icon}
                      </div>
                      <p className="text-sm font-bold font-mono">{spec.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Serial Number Copy */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs text-[#6a7560]">Serial: <span className="font-mono text-green-400">{serialNumber}</span></span>
                  <button onClick={() => { setCopiedSn(true); setTimeout(() => setCopiedSn(false), 2000); }}
                    className="p-1.5 rounded-md hover:bg-white/5 text-[#6a7560] hover:text-green-400 transition-colors">
                    {copiedSn ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* ══════════ DEPLOYMENT TAB ══════════ */}
            {activeTab === 'deploy' && (
              <div className="max-w-3xl mx-auto space-y-3">
                <h3 className="text-sm font-semibold text-[#6a7560] mb-4">Deployment Guide</h3>
                {deploySteps.map((step, i) => {
                  const isExpanded = expandedSteps.has(step.id);
                  return (
                    <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-[#1a2016] rounded-xl border border-[#2a3520] overflow-hidden">
                      <button onClick={() => toggleStep(step.id)}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/2 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                          {step.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#6a7560] font-mono">Step {i + 1}</span>
                            <span className="text-sm font-medium">{step.title}</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronDown size={16} className="text-[#6a7560]" /> : <ChevronRight size={16} className="text-[#6a7560]" />}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden">
                            <div className="px-5 pb-4 pt-1 border-t border-[#2a3520]">
                              {step.content}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ══════════ SECURITY TAB ══════════ */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'FIPS 140-2 Level 3', status: 'IN COMPLIANCE', ok: true, icon: <ShieldCheck size={20} className="text-green-400" />, desc: 'Cryptographic module validated' },
                    { label: 'Common Criteria', status: 'EAL4+ ROADMAP', ok: false, icon: <Shield size={20} className="text-yellow-400" />, desc: 'Targeting EAL4+ certification Q2 2025' },
                    { label: 'Zero External Calls', status: 'VERIFIED', ok: true, icon: <Eye size={20} className="text-green-400" />, desc: 'No outbound network activity detected' },
                    { label: 'Air-Gap Integrity', status: 'SECURE', ok: true, icon: <Lock size={20} className="text-green-400" />, desc: 'All external interfaces disabled' },
                    { label: 'TPM Tamper Detection', status: 'ACTIVE', ok: true, icon: <Key size={20} className="text-green-400" />, desc: 'TPM 2.0 attestation running' },
                    { label: 'SELinux', status: 'ENFORCING', ok: true, icon: <Shield size={20} className="text-green-400" />, desc: 'Targeted policy with custom modules' },
                  ].map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      className={`bg-[#1a2016] rounded-xl border p-5 ${item.ok ? 'border-green-500/20' : 'border-yellow-500/20'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.ok ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className={`text-xs font-bold uppercase mt-0.5 ${item.ok ? 'text-green-400' : 'text-yellow-400'}`}>{item.status}</p>
                          <p className="text-xs text-[#6a7560] mt-1">{item.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════ UPDATES TAB ══════════ */}
            {activeTab === 'updates' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1a2016] rounded-xl border border-green-500/20 p-5">
                    <p className="text-[10px] uppercase tracking-wider text-[#6a7560] mb-1">Current Version</p>
                    <p className="text-3xl font-bold text-green-400 font-mono">v3.4.1</p>
                    <p className="text-xs text-[#6a7560] mt-2">Installed: 2024-12-01 14:22 UTC</p>
                  </div>
                  <div className="bg-[#1a2016] rounded-xl border border-yellow-500/20 p-5">
                    <p className="text-[10px] uppercase tracking-wider text-[#6a7560] mb-1">Available Update</p>
                    <p className="text-3xl font-bold text-yellow-400 font-mono">v3.4.2</p>
                    <p className="text-xs text-[#6a7560] mt-2">Release: 2024-12-08 — Security patches + bug fixes</p>
                  </div>
                </div>

                {/* Update Steps */}
                <div className="bg-[#1a2016] rounded-xl border border-[#2a3520] p-5">
                  <h3 className="text-sm font-semibold text-[#6a7560] mb-4 flex items-center gap-2">
                    <Usb size={14} className="text-green-400" /> USB Update Procedure
                  </h3>
                  <div className="space-y-3">
                    {[
                      { step: 1, text: 'Download update package v3.4.2 from secure portal', done: true },
                      { step: 2, text: 'Transfer to encrypted USB drive', done: true },
                      { step: 3, text: 'Insert USB into appliance', done: false },
                      { step: 4, text: 'Verify Ed25519 signature', done: false },
                      { step: 5, text: 'Apply update (auto-rollback snapshot created)', done: false },
                      { step: 6, text: 'Reboot and verify integrity', done: false },
                    ].map(item => (
                      <div key={item.step} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.done ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-[#6a7560]'}`}>
                          {item.done ? <CheckCircle size={14} /> : item.step}
                        </div>
                        <span className={`text-sm ${item.done ? 'text-green-400 line-through opacity-60' : 'text-slate-300'}`}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button className="px-4 py-2 rounded-lg bg-green-500/15 text-green-400 text-sm font-medium border border-green-500/20 hover:bg-green-500/25 transition-colors flex items-center gap-2">
                      <Upload size={14} /> Install Update
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-white/5 text-[#6a7560] text-sm border border-[#2a3520] hover:bg-white/10 transition-colors flex items-center gap-2">
                      <RotateCcw size={14} /> Rollback
                    </button>
                  </div>
                </div>

                {/* Update History */}
                <div className="bg-[#1a2016] rounded-xl border border-[#2a3520] p-5">
                  <h3 className="text-sm font-semibold text-[#6a7560] mb-3">Update History</h3>
                  <div className="space-y-2">
                    {[
                      { version: 'v3.4.1', date: '2024-12-01', type: 'Security patch' },
                      { version: 'v3.4.0', date: '2024-11-15', type: 'Feature release' },
                      { version: 'v3.3.2', date: '2024-10-28', type: 'Bug fix' },
                      { version: 'v3.3.1', date: '2024-10-10', type: 'Security patch' },
                    ].map(entry => (
                      <div key={entry.version} className="flex items-center justify-between py-2 border-b border-white/3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold text-green-400">{entry.version}</span>
                          <span className="text-xs text-[#6a7560]">{entry.type}</span>
                        </div>
                        <span className="text-xs text-[#6a7560]">{entry.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ TENANTS TAB ══════════ */}
            {activeTab === 'tenants' && (
              <div>
                <h3 className="text-sm font-semibold text-[#6a7560] mb-4 flex items-center gap-2">
                  <Database size={14} className="text-green-400" /> Tenant Management ({TENANTS.length})
                </h3>
                <div className="bg-[#1a2016] rounded-xl border border-[#2a3520] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2a3520] text-[11px] uppercase tracking-wider text-[#6a7560]">
                          <th className="text-left px-5 py-3 font-medium">Tenant</th>
                          <th className="text-left px-5 py-3 font-medium">CPU</th>
                          <th className="text-left px-5 py-3 font-medium">Memory</th>
                          <th className="text-left px-5 py-3 font-medium">Storage</th>
                          <th className="text-left px-5 py-3 font-medium">Isolation</th>
                          <th className="text-left px-5 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TENANTS.map(tenant => (
                          <tr key={tenant.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                            <td className="px-5 py-3 font-medium">{tenant.name}</td>
                            <td className="px-5 py-3 text-xs text-slate-400 flex items-center gap-1"><Cpu size={12} /> {tenant.resourceAllocation.cpu}</td>
                            <td className="px-5 py-3 text-xs text-slate-400 flex items-center gap-1"><MemoryStick size={12} /> {tenant.resourceAllocation.memory}</td>
                            <td className="px-5 py-3 text-xs text-slate-400 flex items-center gap-1"><HardDrive size={12} /> {tenant.resourceAllocation.storage}</td>
                            <td className="px-5 py-3">
                              <span className={`text-xs font-bold uppercase ${ISOLATION_COLORS[tenant.isolationStatus]}`}>
                                {tenant.isolationStatus === 'enforced' && <ShieldCheck size={12} className="inline mr-1" />}
                                {tenant.isolationStatus === 'pending' && <AlertTriangle size={12} className="inline mr-1" />}
                                {tenant.isolationStatus}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                tenant.status === 'active' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                              }`}>{tenant.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ LOGS TAB ══════════ */}
            {activeTab === 'logs' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#6a7560]">System Logs</h3>
                  <div className="flex gap-1">
                    {['all', 'boot', 'security', 'update', 'system'].map(filter => (
                      <button key={filter} onClick={() => setLogFilter(filter)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          logFilter === filter
                            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                            : 'bg-white/3 text-[#6a7560] border border-[#2a3520] hover:bg-white/5'
                        }`}>
                        {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-[#1a2016] rounded-xl border border-[#2a3520] overflow-hidden">
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm font-mono">
                      <thead className="sticky top-0 bg-[#1a2016]">
                        <tr className="border-b border-[#2a3520] text-[11px] uppercase tracking-wider text-[#6a7560]">
                          <th className="text-left px-4 py-2 font-medium">Timestamp</th>
                          <th className="text-left px-4 py-2 font-medium">Category</th>
                          <th className="text-left px-4 py-2 font-medium">Severity</th>
                          <th className="text-left px-4 py-2 font-medium">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map(log => (
                          <tr key={log.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                            <td className="px-4 py-2 text-xs text-[#6a7560] whitespace-nowrap">{log.timestamp}</td>
                            <td className="px-4 py-2 text-xs text-slate-400 whitespace-nowrap">{log.category}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${SEVERITY_COLORS[log.severity].bg} ${SEVERITY_COLORS[log.severity].text} ${SEVERITY_COLORS[log.severity].border}`}>
                                {log.severity}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-300">{log.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ COMPLIANCE TAB ══════════ */}
            {activeTab === 'compliance' && (
              <div className="space-y-6">
                {/* Certificates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1a2016] rounded-xl border border-green-500/20 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <ShieldCheck size={20} className="text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">FIPS 140-2 Level 3</p>
                        <p className="text-xs text-green-400 font-bold uppercase">Certificate Active</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs text-[#6a7560]">
                      <div className="flex justify-between"><span>Certificate ID</span><span className="text-green-400 font-mono">FIPS-CERT-2024-0847</span></div>
                      <div className="flex justify-between"><span>Module Name</span><span className="text-slate-300">ReconPro Crypto Module</span></div>
                      <div className="flex justify-between"><span>Validation Date</span><span className="text-slate-300">2024-06-15</span></div>
                      <div className="flex justify-between"><span>Expiry</span><span className="text-slate-300">2027-06-15</span></div>
                    </div>
                  </div>

                  <div className="bg-[#1a2016] rounded-xl border border-yellow-500/20 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <Shield size={20} className="text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Common Criteria EAL4+</p>
                        <p className="text-xs text-yellow-400 font-bold uppercase">Roadmap — Target Q2 2025</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs text-[#6a7560]">
                      <div className="flex justify-between"><span>Target Level</span><span className="text-yellow-400">EAL4 Augmented</span></div>
                      <div className="flex justify-between"><span>Assessor</span><span className="text-slate-300">TBD</span></div>
                      <div className="flex justify-between"><span>Sponsor</span><span className="text-slate-300">ReconPro Inc.</span></div>
                      <div className="flex justify-between"><span>Status</span><span className="text-yellow-400">Evaluation Lab Selection</span></div>
                    </div>
                  </div>
                </div>

                {/* Self-Assessment Checklist */}
                <div className="bg-[#1a2016] rounded-xl border border-[#2a3520] p-5">
                  <h3 className="text-sm font-semibold text-[#6a7560] mb-4">Self-Assessment Checklist</h3>
                  <div className="space-y-2">
                    {[
                      { item: 'All external network interfaces physically disabled', passed: true },
                      { item: 'SELinux enforcing mode with custom policy', passed: true },
                      { item: 'Full disk encryption (LUKS) verified', passed: true },
                      { item: 'TPM 2.0 measured boot enabled', passed: true },
                      { item: 'HSM initialized and FIPS module loaded', passed: true },
                      { item: 'USB mass storage restricted to authorized update tool', passed: true },
                      { item: 'No Bluetooth/WiFi kernel modules loaded', passed: true },
                      { item: 'Kernel lockdown mode active', passed: true },
                      { item: 'Audit logging enabled for all admin actions', passed: true },
                      { item: 'Emergency recovery key securely stored offline', passed: true },
                      { item: 'Multi-factor authentication enforced for admin', passed: true },
                      { item: 'Tenant isolation namespaces configured', passed: true },
                    ].map((check, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/3">
                        {check.passed ? (
                          <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-red-400 flex-shrink-0" />
                        )}
                        <span className="text-sm text-slate-300">{check.item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-green-400 flex items-center gap-2">
                      <CheckCircle size={14} />
                      All 12/12 checks passed — Appliance is fully compliant
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
