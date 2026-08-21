"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle2, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { useAuthHeaders } from "@/hooks/use-auth-headers";

interface Framework {
  id: string;
  name: string;
  shortName: string;
  score: number;
  status: 'compliant' | 'partial' | 'non-compliant';
  lastAssessed: string;
  description: string;
  totalControls: number;
  passedControls: number;
  color: string;
}

const DEFAULT_FRAMEWORKS: Framework[] = [
  { id: 'soc2', name: 'SOC 2 Type II', shortName: 'SOC2', score: 92, status: 'compliant', lastAssessed: '2025-01-15', description: 'Trust Services Criteria for security, availability, and confidentiality', totalControls: 64, passedControls: 59, color: '#00ff88' },
  { id: 'iso27001', name: 'ISO 27001:2022', shortName: 'ISO', score: 85, status: 'partial', lastAssessed: '2025-01-10', description: 'Information Security Management System requirements', totalControls: 93, passedControls: 79, color: '#44aaff' },
  { id: 'pcidss', name: 'PCI-DSS v4.0', shortName: 'PCI', score: 78, status: 'partial', lastAssessed: '2025-01-08', description: 'Payment Card Industry Data Security Standard', totalControls: 78, passedControls: 61, color: '#f97316' },
  { id: 'hipaa', name: 'HIPAA', shortName: 'HIPAA', score: 88, status: 'compliant', lastAssessed: '2025-01-12', description: 'Health Insurance Portability and Accountability Act', totalControls: 56, passedControls: 49, color: '#a78bfa' },
  { id: 'gdpr', name: 'GDPR', shortName: 'GDPR', score: 71, status: 'partial', lastAssessed: '2025-01-05', description: 'General Data Protection Regulation compliance', totalControls: 45, passedControls: 32, color: '#d29922' },
  { id: 'nist', name: 'NIST CSF 2.0', shortName: 'NIST', score: 95, status: 'compliant', lastAssessed: '2025-01-14', description: 'National Institute of Standards and Technology Cybersecurity Framework', totalControls: 108, passedControls: 103, color: '#00ff88' },
];

function CircularProgress({ value, size = 80, color, strokeWidth = 5 }: { value: number; size?: number; color: string; strokeWidth?: number }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] as const, delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-sm font-bold font-mono"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >{value}%</motion.span>
      </div>
    </div>
  );
}

function FrameworkCard({ framework }: { framework: Framework }) {
  const statusConfig = {
    'compliant': { label: 'Compliant', color: '#00ff88', bg: 'rgba(0,255,136,0.06)' },
    'partial': { label: 'Partial', color: '#d29922', bg: 'rgba(210,153,34,0.06)' },
    'non-compliant': { label: 'Non-Compliant', color: '#ff3355', bg: 'rgba(255,51,85,0.06)' },
  };
  const cfg = statusConfig[framework.status];
  const lastDate = new Date(framework.lastAssessed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel p-5 flex flex-col items-center text-center group"
    >
      <CircularProgress value={framework.score} color={framework.color} />
      <h3 className="text-[14px] font-medium text-white mt-4 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{framework.name}</h3>
      <p className="text-[11px] text-neutral-600 leading-relaxed mb-3 max-w-[200px]">{framework.description}</p>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ color: cfg.color, background: cfg.bg }}>
          {framework.status === 'compliant' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {cfg.label}
        </span>
      </div>
      <div className="w-full flex items-center justify-between text-[10px] text-neutral-700 pt-2 border-t border-white/[0.04]">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lastDate}</span>
        <span>{framework.passedControls}/{framework.totalControls} controls</span>
      </div>
    </motion.div>
  );
}

export default function CompliancePage() {
  const authHeaders = useAuthHeaders();
  const [frameworks, setFrameworks] = useState<Framework[]>(DEFAULT_FRAMEWORKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/compliance', { headers: authHeaders })
      .then(r => r.json())
      .then((data) => {
        if (data.frameworks && data.frameworks.length > 0) {
          const mapped = data.frameworks.map((f: { id?: string; name?: string; score?: number; status?: string; lastAssessed?: string }) => {
            const def = DEFAULT_FRAMEWORKS.find(d => d.id === f.id || d.shortName === f.name?.toUpperCase());
            const score = f.score ?? def?.score ?? 0;
            const status = score >= 85 ? 'compliant' as const : score >= 60 ? 'partial' as const : 'non-compliant' as const;
            const color = score >= 85 ? '#00ff88' : score >= 60 ? '#d29922' : '#ff3355';
            return {
              id: f.id || def?.id || 'unknown',
              name: f.name || def?.name || 'Unknown',
              shortName: def?.shortName || f.name?.toUpperCase() || 'UNK',
              score,
              status,
              lastAssessed: f.lastAssessed || def?.lastAssessed || new Date().toISOString(),
              description: def?.description || '',
              totalControls: def?.totalControls || 10,
              passedControls: def ? Math.round(def.totalControls * score / 100) : Math.round(10 * score / 100),
              color,
            };
          });
          setFrameworks(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const overallScore = Math.round(frameworks.reduce((s, f) => s + f.score, 0) / frameworks.length);
  const overallColor = overallScore >= 85 ? '#00ff88' : overallScore >= 60 ? '#d29922' : '#ff3355';

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-icon text-[#a3a3a3]"><ShieldCheck /></div>
          <div><h1>Compliance</h1><p>Track compliance across security frameworks.</p></div>
        </div>
        <div className="skeleton-pulse h-32 rounded-xl mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-pulse h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon text-[#a3a3a3]"><ShieldCheck /></div>
        <div><h1>Compliance</h1><p>Track compliance across security frameworks.</p></div>
      </div>

      {/* Overall Compliance Score */}
      <div className="panel p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
        <CircularProgress value={overallScore} size={100} color={overallColor} strokeWidth={6} />
        <div>
          <h2 className="text-[16px] font-medium text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Overall Compliance Score</h2>
          <p className="text-[13px] text-neutral-600 mb-2">Aggregated across {frameworks.length} security frameworks</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono" style={{ color: overallColor }}>
              <TrendingUp className="w-3.5 h-3.5" /> {overallScore >= 85 ? 'Excellent posture' : overallScore >= 60 ? 'Needs improvement' : 'Action required'}
            </span>
          </div>
        </div>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {frameworks.map((fw) => (
          <FrameworkCard key={fw.id} framework={fw} />
        ))}
      </div>
    </div>
  );
}