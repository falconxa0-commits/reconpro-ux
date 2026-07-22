'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Link2,
  FileText,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Types ────────────────────────────────────────────────────────────────────

interface FrameworkControl {
  id: string;
  description: string;
  status: 'pass' | 'fail' | 'pending';
  category: string;
  evidenceLink?: string;
}

interface ComplianceFramework {
  id: string;
  name: string;
  icon: string;
  score: number;
  status: 'Compliant' | 'Needs Attention' | 'Non-Compliant';
  controlsPassed: number;
  controlsTotal: number;
  lastAssessed: string;
  controls: FrameworkControl[];
}

interface CompliancePanelProps {
  framework?: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockFrameworks: ComplianceFramework[] = [
  {
    id: 'soc2',
    name: 'SOC 2',
    icon: '🔒',
    score: 92,
    status: 'Compliant',
    controlsPassed: 55,
    controlsTotal: 64,
    lastAssessed: '2024-01-15',
    controls: [
      { id: 'SOC2-CC6.1', description: 'Logical and Physical Access Controls', status: 'pass', category: 'Access' },
      { id: 'SOC2-CC6.2', description: 'User Authentication Mechanisms', status: 'pass', category: 'Access' },
      { id: 'SOC2-CC6.3', description: 'Role-Based Access Management', status: 'pass', category: 'Access' },
      { id: 'SOC2-CC7.1', description: 'Detection and Monitoring of System Events', status: 'pass', category: 'Monitoring' },
      { id: 'SOC2-CC7.2', description: 'Incident Response Procedures', status: 'pass', category: 'Incident' },
      { id: 'SOC2-CC7.3', description: 'Security Event Evaluation', status: 'fail', category: 'Monitoring' },
      { id: 'SOC2-CC8.1', description: 'Change Management Controls', status: 'pass', category: 'Change' },
      { id: 'SOC2-CC8.2', description: 'Development and Testing Environments', status: 'pass', category: 'Change' },
      { id: 'SOC2-CC9.1', description: 'Risk Mitigation Strategies', status: 'pass', category: 'Risk' },
      { id: 'SOC2-CC9.2', description: 'Vulnerability Management', status: 'pass', category: 'Risk' },
      { id: 'SOC2-A1.2', description: 'Management Communication of Objectives', status: 'pass', category: 'Governance' },
      { id: 'SOC2-A1.3', description: 'Organizational Structure and Responsibilities', status: 'pass', category: 'Governance' },
    ],
  },
  {
    id: 'hipaa',
    name: 'HIPAA',
    icon: '🏥',
    score: 85,
    status: 'Compliant',
    controlsPassed: 41,
    controlsTotal: 48,
    lastAssessed: '2024-01-10',
    controls: [
      { id: 'HIPAA-164.308a1', description: 'Security Management Process', status: 'pass', category: 'Administrative' },
      { id: 'HIPAA-164.308a3', description: 'Workforce Security', status: 'pass', category: 'Administrative' },
      { id: 'HIPAA-164.308a4', description: 'Information Access Management', status: 'pass', category: 'Administrative' },
      { id: 'HIPAA-164.308a5', description: 'Security Awareness Training', status: 'fail', category: 'Administrative' },
      { id: 'HIPAA-164.308a6', description: 'Incident Response Plan', status: 'pass', category: 'Administrative' },
      { id: 'HIPAA-164.310a1', description: 'Facility Access Controls', status: 'pass', category: 'Physical' },
      { id: 'HIPAA-164.312a1', description: 'Access Control Mechanisms', status: 'pass', category: 'Technical' },
      { id: 'HIPAA-164.312a2', description: 'Audit Controls', status: 'pass', category: 'Technical' },
      { id: 'HIPAA-164.312c1', description: 'Integrity Controls', status: 'pass', category: 'Technical' },
      { id: 'HIPAA-164.312e1', description: 'Transmission Security', status: 'pass', category: 'Technical' },
      { id: 'HIPAA-164.314a1', description: 'Encryption in Transit and At Rest', status: 'pass', category: 'Technical' },
      { id: 'HIPAA-164.312b', description: 'Person or Entity Authentication', status: 'fail', category: 'Technical' },
    ],
  },
  {
    id: 'pci-dss',
    name: 'PCI-DSS',
    icon: '💳',
    score: 94,
    status: 'Compliant',
    controlsPassed: 234,
    controlsTotal: 250,
    lastAssessed: '2024-01-18',
    controls: [
      { id: 'PCI-1.1', description: 'Network Firewall Configuration', status: 'pass', category: 'Network' },
      { id: 'PCI-1.2', description: 'Network Security Configurations', status: 'pass', category: 'Network' },
      { id: 'PCI-2.1', description: 'Default Vendor-Supplied Passwords Changed', status: 'pass', category: 'Config' },
      { id: 'PCI-2.2', description: 'Unnecessary Services Removed', status: 'pass', category: 'Config' },
      { id: 'PCI-3.4', description: 'Cardholder Data Encryption', status: 'pass', category: 'Data' },
      { id: 'PCI-4.1', description: 'Encryption Key Management', status: 'pass', category: 'Cryptography' },
      { id: 'PCI-5.1', description: 'Malware Protection Mechanisms', status: 'pass', category: 'Security' },
      { id: 'PCI-5.2', description: 'Malware Definitions Updated', status: 'pass', category: 'Security' },
      { id: 'PCI-6.1', description: 'Secure System Development Process', status: 'pass', category: 'Development' },
      { id: 'PCI-6.3', description: 'Secure Application Coding Practices', status: 'fail', category: 'Development' },
      { id: 'PCI-7.1', description: 'Access to Cardholder Data Restricted', status: 'pass', category: 'Access' },
      { id: 'PCI-8.1', description: 'Unique User IDs for Each Person', status: 'pass', category: 'Access' },
    ],
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    icon: '📋',
    score: 78,
    status: 'Needs Attention',
    controlsPassed: 93,
    controlsTotal: 114,
    lastAssessed: '2024-01-05',
    controls: [
      { id: 'ISO-A.5.1', description: 'Information Security Policies', status: 'pass', category: 'Policy' },
      { id: 'ISO-A.5.2', description: 'Information Security Roles and Responsibilities', status: 'pass', category: 'Policy' },
      { id: 'ISO-A.6.1', description: 'Screening and Background Checks', status: 'fail', category: 'HR' },
      { id: 'ISO-A.6.2', description: 'Terms and Conditions of Employment', status: 'pass', category: 'HR' },
      { id: 'ISO-A.7.1', description: 'Physical Security Perimeters', status: 'pass', category: 'Physical' },
      { id: 'ISO-A.7.2', description: 'Physical Entry Controls', status: 'pass', category: 'Physical' },
      { id: 'ISO-A.8.1', description: 'User Endpoint Devices', status: 'pass', category: 'Asset' },
      { id: 'ISO-A.8.2', description: 'Privileged Access Rights', status: 'fail', category: 'Access' },
      { id: 'ISO-A.8.3', description: 'Information Access Restriction', status: 'pass', category: 'Access' },
      { id: 'ISO-A.9.1', description: 'Exhibit A - Information Access Management', status: 'pass', category: 'Access' },
      { id: 'ISO-A.9.2', description: 'Secure Authentication', status: 'fail', category: 'Access' },
      { id: 'ISO-A.9.4', description: 'System and Application Access Control', status: 'pass', category: 'Access' },
    ],
  },
  {
    id: 'nist',
    name: 'NIST CSF',
    icon: '🏛️',
    score: 88,
    status: 'Compliant',
    controlsPassed: 176,
    controlsTotal: 200,
    lastAssessed: '2024-01-20',
    controls: [
      { id: 'NIST-ID.AM-1', description: 'Asset Inventory Management', status: 'pass', category: 'Identify' },
      { id: 'NIST-ID.AM-2', description: 'Software Platform Inventory', status: 'pass', category: 'Identify' },
      { id: 'NIST-ID.RA-1', description: 'Risk Assessment Process', status: 'pass', category: 'Identify' },
      { id: 'NIST-PR.AC-1', description: 'Access Control Policy', status: 'pass', category: 'Protect' },
      { id: 'NIST-PR.AC-3', description: 'Access Authorization Management', status: 'pass', category: 'Protect' },
      { id: 'NIST-PR.DS-1', description: 'Data-at-Rest Protection', status: 'pass', category: 'Protect' },
      { id: 'NIST-PR.DS-2', description: 'Data-in-Transit Protection', status: 'pass', category: 'Protect' },
      { id: 'NIST-DE.CM-1', description: 'Continuous Monitoring', status: 'pass', category: 'Detect' },
      { id: 'NIST-DE.AE-1', description: 'Event Detection Capability', status: 'fail', category: 'Detect' },
      { id: 'NIST-RS.RP-1', description: 'Incident Response Plan Execution', status: 'pass', category: 'Respond' },
      { id: 'NIST-RC.RP-1', description: 'Recovery Plan Execution', status: 'pass', category: 'Recover' },
      { id: 'NIST-RC.CO-1', description: 'Recovery Testing', status: 'fail', category: 'Recover' },
    ],
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    icon: '🇪🇺',
    score: 82,
    status: 'Needs Attention',
    controlsPassed: 68,
    controlsTotal: 83,
    lastAssessed: '2024-01-12',
    controls: [
      { id: 'GDPR-Art.5', description: 'Principles of Processing Personal Data', status: 'pass', category: 'Principles' },
      { id: 'GDPR-Art.6', description: 'Lawfulness of Processing', status: 'pass', category: 'Legal' },
      { id: 'GDPR-Art.13', description: 'Information to be Provided to Data Subjects', status: 'pass', category: 'Rights' },
      { id: 'GDPR-Art.15', description: 'Right of Access by Data Subject', status: 'pass', category: 'Rights' },
      { id: 'GDPR-Art.17', description: 'Right to Erasure', status: 'fail', category: 'Rights' },
      { id: 'GDPR-Art.20', description: 'Right to Data Portability', status: 'pass', category: 'Rights' },
      { id: 'GDPR-Art.25', description: 'Data Protection by Design', status: 'pass', category: 'Design' },
      { id: 'GDPR-Art.30', description: 'Records of Processing Activities', status: 'fail', category: 'Records' },
      { id: 'GDPR-Art.32', description: 'Security of Processing', status: 'pass', category: 'Security' },
      { id: 'GDPR-Art.33', description: 'Notification of Breach to Supervisory Authority', status: 'pass', category: 'Breach' },
      { id: 'GDPR-Art.34', description: 'Communication of Breach to Data Subject', status: 'pass', category: 'Breach' },
      { id: 'GDPR-Art.35', description: 'Data Protection Impact Assessment', status: 'fail', category: 'Assessment' },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 90) return '#00ff88';
  if (score >= 75) return '#d29922';
  return '#f85149';
}

function getScoreGradient(score: number): string {
  if (score >= 90) return 'from-[#00ff88]/20 to-[#00ff88]/5';
  if (score >= 75) return 'from-[#d29922]/20 to-[#d29922]/5';
  return 'from-[#f85149]/20 to-[#f85149]/5';
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'Compliant':
      return { color: '#00ff88', bg: 'rgba(0,255,136,0.15)', border: 'rgba(0,255,136,0.3)', icon: ShieldCheck };
    case 'Needs Attention':
      return { color: '#d29922', bg: 'rgba(210,153,34,0.15)', border: 'rgba(210,153,34,0.3)', icon: ShieldAlert };
    case 'Non-Compliant':
      return { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: 'rgba(248,81,73,0.3)', icon: ShieldX };
    default:
      return { color: '#8b949e', bg: 'rgba(139,148,158,0.15)', border: 'rgba(139,148,158,0.3)', icon: Shield };
  }
}

// ── Circular Gauge SVG ──────────────────────────────────────────────────────

function ComplianceGauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
        {/* Background circle */}
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#161b22" strokeWidth="10" />
        {/* Progress arc */}
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          style={{
            filter: `drop-shadow(0 0 8px ${color}50)`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-black text-[#e6edf3]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {score}%
        </motion.span>
        <span className="text-[10px] uppercase tracking-widest text-[#8b949e] font-medium">Overall</span>
      </div>
    </div>
  );
}

// ── Sparkline SVG ───────────────────────────────────────────────────────────

function TrendSparkline() {
  const points = [62, 65, 68, 72, 70, 75, 78, 82, 85, 84, 87, 89];
  const w = 200;
  const h = 40;
  const step = w / (points.length - 1);

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / 100) * h}`)
    .join(' ');

  const areaData = `${pathData} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaData}
        fill="url(#sparkGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      />
      <motion.path
        d={pathData}
        fill="none"
        stroke="#00ff88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
      />
      <motion.circle
        cx={(points.length - 1) * step}
        cy={h - (points[points.length - 1] / 100) * h}
        r="3"
        fill="#00ff88"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.3 }}
      />
    </svg>
  );
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

export function CompliancePanel({ framework = 'all' }: CompliancePanelProps) {
  const [selectedFramework, setSelectedFramework] = useState(framework === 'all' ? 'soc2' : framework);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [controlStates, setControlStates] = useState<Record<string, boolean>>({});

  const selected = mockFrameworks.find((f) => f.id === selectedFramework) || mockFrameworks[0];
  const overallScore = Math.round(mockFrameworks.reduce((acc, f) => acc + f.score, 0) / mockFrameworks.length);

  const toggleControlStatus = (controlId: string) => {
    setControlStates((prev) => ({ ...prev, [controlId]: !prev[controlId] }));
  };

  const passedCount = selected.controls.filter((c) => c.status === 'pass').length;
  const failedCount = selected.controls.filter((c) => c.status === 'fail').length;
  const controlPassRate = Math.round((passedCount / selected.controls.length) * 100);

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
            <Shield className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e6edf3]">Compliance Framework</h2>
            <p className="text-sm text-[#8b949e]">Monitor and manage regulatory compliance posture</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="bg-[#0d1117] border-[#21262d] text-[#e6edf3] w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#161b22] border-[#21262d] text-[#e6edf3]">
              {mockFrameworks.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-[#e6edf3] focus:bg-[rgba(0,255,136,0.1)] focus:text-[#00ff88]">
                  <span className="mr-2">{f.icon}</span>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="border-[#21262d] text-[#8b949e] hover:bg-[rgba(0,255,136,0.1)] hover:text-[#00ff88] gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Reassess
          </Button>
        </div>
      </motion.div>

      {/* ── Overall Score + Trend ────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#0d1117] p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <ComplianceGauge score={overallScore} />
            <p className="text-sm font-medium text-[#00ff88]">
              {overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Good' : 'Needs Improvement'}
            </p>
          </div>

          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#e6edf3]">Compliance Trend</h3>
              <div className="flex items-center gap-1.5 text-[#00ff88]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">+4.2% from last month</span>
              </div>
            </div>
            <TrendSparkline />
            <div className="flex gap-4 text-xs text-[#8b949e]">
              <span>Last 12 assessments</span>
              <span>•</span>
              <span>Updated: Jan 20, 2024</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.15)] p-3 text-center">
                <p className="text-lg font-bold text-[#00ff88]">
                  {mockFrameworks.filter((f) => f.status === 'Compliant').length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#8b949e]">Compliant</p>
              </div>
              <div className="rounded-lg bg-[rgba(210,153,34,0.08)] border border-[rgba(210,153,34,0.15)] p-3 text-center">
                <p className="text-lg font-bold text-[#d29922]">
                  {mockFrameworks.filter((f) => f.status === 'Needs Attention').length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#8b949e]">Attention</p>
              </div>
              <div className="rounded-lg bg-[rgba(248,81,73,0.08)] border border-[rgba(248,81,73,0.15)] p-3 text-center">
                <p className="text-lg font-bold text-[#f85149]">
                  {mockFrameworks.filter((f) => f.status === 'Non-Compliant').length}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#8b949e]">Non-Compliant</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Framework Grid ────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Frameworks Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockFrameworks.map((fw, idx) => {
            const statusCfg = getStatusConfig(fw.status);
            const StatusIcon = statusCfg.icon;
            const isSelected = fw.id === selectedFramework;
            return (
              <motion.div
                key={fw.id}
                variants={itemVariants}
                whileHover={cardHover}
                onClick={() => setSelectedFramework(fw.id)}
                className={`rounded-xl border cursor-pointer transition-all overflow-hidden ${
                  isSelected
                    ? 'border-[rgba(0,255,136,0.4)] shadow-[0_0_20px_rgba(0,255,136,0.1)]'
                    : 'border-[#21262d] hover:border-[#30363d]'
                }`}
                style={{ backgroundColor: '#0d1117' }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{fw.icon}</span>
                      <div>
                        <h4 className="text-sm font-bold text-[#e6edf3]">{fw.name}</h4>
                        <p className="text-[10px] text-[#484f58]">{fw.controlsPassed}/{fw.controlsTotal} controls</p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                      style={{
                        backgroundColor: statusCfg.bg,
                        borderColor: statusCfg.border,
                        color: statusCfg.color,
                      }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span className="hidden sm:inline">{fw.status === 'Needs Attention' ? 'Attention' : fw.status}</span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[#8b949e]">Score</span>
                      <span className="text-sm font-bold" style={{ color: getScoreColor(fw.score) }}>
                        {fw.score}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#161b22] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: getScoreColor(fw.score) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${fw.score}%` }}
                        transition={{ delay: idx * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-[#484f58]">
                      <Clock className="w-3 h-3" />
                      <span>Assessed {fw.lastAssessed}</span>
                    </div>
                    <button className="text-[10px] font-medium text-[#00ff88] hover:text-[#00cc6a] transition-colors flex items-center gap-1">
                      Review
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Controls Checklist ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="rounded-xl border border-[#21262d] bg-[#0d1117] overflow-hidden">
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-[rgba(0,255,136,0.1)]">
              <FileText className="w-4 h-4 text-[#00ff88]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e6edf3]">
                {selected.icon} {selected.name} Controls
              </h3>
              <p className="text-xs text-[#8b949e]">
                {passedCount} passed, {failedCount} failed of {selected.controls.length} controls
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold text-[#e6edf3]">{controlPassRate}%</p>
              <p className="text-[10px] text-[#8b949e] uppercase tracking-wider">Pass Rate</p>
            </div>
            <div className="w-12 h-12 relative">
              <svg width="48" height="48" viewBox="0 0 48 48" className="transform -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#161b22" strokeWidth="4" />
                <motion.circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={getScoreColor(controlPassRate)}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 20}
                  initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 20 - (controlPassRate / 100) * 2 * Math.PI * 20 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {selected.controls.map((control, idx) => {
            const isExpanded = expandedControl === control.id;
            const isPass = control.status === 'pass';
            const toggleValue = controlStates[control.id] ?? isPass;

            return (
              <motion.div
                key={control.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.04 }}
                className="border-b border-[#161b22] last:border-b-0"
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[rgba(0,255,136,0.02)] transition-colors"
                  onClick={() => setExpandedControl(isExpanded ? null : control.id)}
                >
                  <Checkbox
                    checked={toggleValue}
                    onCheckedChange={() => toggleControlStatus(control.id)}
                    className={`${
                      toggleValue
                        ? 'data-[state=checked]:bg-[#00ff88] data-[state=checked]:border-[#00ff88]'
                        : 'data-[state=unchecked]:border-[#f85149]'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#484f58]">{control.id}</span>
                      <span className="text-xs text-[#e6edf3] truncate">{control.description}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      toggleValue
                        ? 'bg-[rgba(0,255,136,0.1)] text-[#00ff88]'
                        : 'bg-[rgba(248,81,73,0.1)] text-[#f85149]'
                    }`}
                  >
                    {toggleValue ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="text-[10px] text-[#484f58] border border-[#21262d] rounded px-1.5 py-0.5">
                    {control.category}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[#484f58]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#484f58]" />
                  )}
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 ml-9 space-y-2">
                        <p className="text-xs text-[#8b949e] leading-relaxed">
                          Control {control.id} requires proper implementation of {control.description.toLowerCase()} 
                          across all relevant systems and processes.
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="flex items-center gap-1.5 text-[10px] font-medium text-[#58a6ff] hover:text-[#79c0ff] transition-colors">
                            <Link2 className="w-3 h-3" />
                            View Evidence
                          </button>
                          <span className="text-[10px] text-[#484f58]">•</span>
                          <span className="text-[10px] text-[#484f58]">Last verified: Jan {15 + idx}, 2024</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
