'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Key, Building2, Landmark,
  Server, FileCheck, AlertTriangle, ChevronDown, ChevronRight,
  CheckCircle, XCircle, Crown, Globe, Zap,
} from 'lucide-react';

// ── Types (mirrored from engine) ──────────────────────────────────────

type OrganizationType = 'central_bank' | 'clearing_house' | 'tier1_bank' | 'payment_processor' | 'government' | 'enterprise';
type ReadinessLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'GOOD' | 'EXCELLENT';

interface Vulnerability { algorithm: string; type: string; quantumBreakable: boolean; qubitsRequired?: number; nistLevel: number; }
interface PQCRecommendation { from: string; to: string; nistLevel: number; fips: string; priority: string; effort: string; }
interface ProtocolAnalysis { id: string; name: string; quantumVulnerable: boolean; riskAssessment: string; currentCrypto: string[]; vulnerabilities: Vulnerability[]; pqcRecommendations: PQCRecommendation[]; complianceGaps: string[]; }
interface ComplianceFramework { status: string; score: number; gaps: string[]; recommendations: string[]; }
interface ComplianceMapping { basel_iii: ComplianceFramework; dora: ComplianceFramework; fips_140_3: ComplianceFramework; nist_sp_800_208: ComplianceFramework; }
interface MigrationTask { description: string; protocol: string; currentCrypto: string; targetCrypto: string; nistLevel: number; estimatedCost: string; }
interface MigrationPhase { phase: string; timeline: string; tasks: MigrationTask[]; totalCost: string; }
interface TransactionIntegrity { currentRisk: string; pqcProtected: boolean; recommendations: string[]; }

interface PQCVaultResult {
  pqcReadinessScore: number;
  readinessLevel: ReadinessLevel;
  protocols: ProtocolAnalysis[];
  compliance: ComplianceMapping;
  migrationRoadmap: MigrationPhase[];
  transactionIntegrity: TransactionIntegrity;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  estimatedMigrationCost: string;
  recommendedTimeline: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const ORG_TYPES: { value: OrganizationType; label: string; icon: typeof Building2 }[] = [
  { value: 'central_bank', label: 'Central Bank', icon: Landmark },
  { value: 'clearing_house', label: 'Clearing House', icon: Building2 },
  { value: 'tier1_bank', label: 'Tier-1 Bank', icon: Building2 },
  { value: 'payment_processor', label: 'Payment Processor', icon: Globe },
  { value: 'government', label: 'Government', icon: Crown },
  { value: 'enterprise', label: 'Enterprise', icon: Server },
];

const PROTOCOL_OPTIONS = [
  { id: 'swift', label: 'SWIFT MT/MX' },
  { id: 'fedwire', label: 'FedWire' },
  { id: 'ach', label: 'ACH (NACHA)' },
  { id: 'https', label: 'HTTPS/TLS' },
];

const READINESS_COLORS: Record<ReadinessLevel, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MODERATE: '#EAB308',
  GOOD: '#22C55E',
  EXCELLENT: '#FFD700',
};

const COMPLIANCE_FRAMEWORKS = [
  { key: 'basel_iii' as const, label: 'Basel III / CRR III', icon: FileCheck },
  { key: 'dora' as const, label: 'DORA', icon: Shield },
  { key: 'fips_140_3' as const, label: 'FIPS 140-3', icon: Lock },
  { key: 'nist_sp_800_208' as const, label: 'NIST SP 800-208', icon: Key },
];

const PQC_REF_DATA = [
  { name: 'ML-KEM-512 (Kyber-512)', type: 'KEM', nistLevel: 1, size: '800 B / 768 B ct', fips: 'FIPS 203' },
  { name: 'ML-KEM-768 (Kyber-768)', type: 'KEM', nistLevel: 3, size: '1184 B / 1088 B ct', fips: 'FIPS 203' },
  { name: 'ML-KEM-1024 (Kyber-1024)', type: 'KEM', nistLevel: 5, size: '1568 B / 1568 B ct', fips: 'FIPS 203' },
  { name: 'ML-DSA-44 (Dilithium-2)', type: 'Signature', nistLevel: 2, size: '1952 B pk / 2420 B sig', fips: 'FIPS 204' },
  { name: 'ML-DSA-65 (Dilithium-3)', type: 'Signature', nistLevel: 3, size: '2592 B pk / 3309 B sig', fips: 'FIPS 204' },
  { name: 'ML-DSA-87 (Dilithium-5)', type: 'Signature', nistLevel: 5, size: '4096 B pk / 4627 B sig', fips: 'FIPS 204' },
  { name: 'SLH-DSA-128f (SPHINCS+-SHA2-128f)', type: 'Hash-Based', nistLevel: 1, size: '64 B pk / 7856 B sig', fips: 'FIPS 205' },
  { name: 'SLH-DSA-256f (SPHINCS+-SHA2-256f)', type: 'Hash-Based', nistLevel: 5, size: '128 B pk / 16488 B sig', fips: 'FIPS 205' },
];

const CLASSICAL_REF_DATA = [
  { name: 'RSA-2048', type: 'Encryption', security: '112 bits', quantumBreakable: true, qubits: '4,096' },
  { name: 'RSA-4096', type: 'Encryption', security: '128 bits', quantumBreakable: true, qubits: '8,192' },
  { name: 'ECDSA P-256', type: 'Signature', security: '128 bits', quantumBreakable: true, qubits: '2,330' },
  { name: 'ECDSA P-384', type: 'Signature', security: '192 bits', quantumBreakable: true, qubits: '3,484' },
  { name: 'ECDH P-256', type: 'Key Exchange', security: '128 bits', quantumBreakable: true, qubits: '2,330' },
  { name: 'AES-128', type: 'Symmetric', security: '128 bits → 64 (Grover)', quantumBreakable: false, qubits: 'N/A' },
  { name: 'AES-256', type: 'Symmetric', security: '256 bits → 128 (Grover)', quantumBreakable: false, qubits: 'N/A' },
  { name: 'SHA-256', type: 'Hash', security: '128 bits', quantumBreakable: false, qubits: 'N/A' },
];

// ── Component ──────────────────────────────────────────────────────────

export function PQCVaultPanel() {
  const [orgType, setOrgType] = useState<OrganizationType>('central_bank');
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>(['swift', 'fedwire', 'https']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PQCVaultResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Expandable sections
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [expandedCompliance, setExpandedCompliance] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [showAlgoRef, setShowAlgoRef] = useState(false);

  const toggleProtocol = useCallback((id: string) => {
    setSelectedProtocols(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    );
  }, []);

  const runAnalysis = useCallback(async () => {
    if (selectedProtocols.length === 0) {
      setError('Select at least one protocol.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/pqc-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationType: orgType,
          protocols: selectedProtocols,
          complianceFrameworks: ['basel_iii', 'dora', 'fips_140_3', 'nist_sp_800_208'],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data.analysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgType, selectedProtocols]);

  // ── Circular gauge calculation ──
  const gaugeScore = result?.pqcReadinessScore ?? 0;
  const gaugeLevel = result?.readinessLevel ?? 'CRITICAL' as ReadinessLevel;
  const gaugeColor = READINESS_COLORS[gaugeLevel];
  const gaugeRadius = 80;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (gaugeScore / 100) * gaugeCircumference;

  // ── Render: Gauge Section ──
  const renderGauge = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col items-center py-8"
    >
      {/* Classification banner */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-2 py-2 border-b border-yellow-900/40 bg-yellow-900/10">
        <ShieldAlert className="w-4 h-4 text-yellow-500" />
        <span className="text-xs tracking-[0.3em] text-yellow-500/90 font-semibold uppercase">
          Sovereign Vault — Post-Quantum Cryptography Assessment
        </span>
        <ShieldAlert className="w-4 h-4 text-yellow-500" />
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-10 mt-8 w-full max-w-5xl px-6">
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="220" height="220" className="-rotate-90">
            {/* Background track */}
            <circle
              cx="110" cy="110" r={gaugeRadius}
              fill="none" stroke="#1a2e42" strokeWidth="12"
            />
            {/* Score arc */}
            <motion.circle
              cx="110" cy="110" r={gaugeRadius}
              fill="none"
              stroke={gaugeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={gaugeCircumference}
              initial={{ strokeDashoffset: gaugeCircumference }}
              animate={{ strokeDashoffset: gaugeOffset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-5xl font-black tabular-nums"
              style={{ color: gaugeColor }}
              key={gaugeScore}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {gaugeScore}
            </motion.span>
            <span className="text-xs text-slate-500 mt-1 tracking-widest uppercase">PQC Score</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 w-full space-y-5">
          {/* Org type selector */}
          <div>
            <label className="block text-xs tracking-widest text-yellow-500/80 font-semibold mb-2 uppercase">
              Organization Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ORG_TYPES.map(opt => {
                const Icon = opt.icon;
                const active = orgType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setOrgType(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-all ${
                      active
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                        : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Protocol selector */}
          <div>
            <label className="block text-xs tracking-widest text-yellow-500/80 font-semibold mb-2 uppercase">
              Protocols to Analyze
            </label>
            <div className="flex flex-wrap gap-2">
              {PROTOCOL_OPTIONS.map(opt => {
                const active = selectedProtocols.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleProtocol(opt.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium transition-all ${
                      active
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                        : 'border-slate-700 bg-slate-900/50 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {active ? <CheckCircle className="w-4 h-4 text-yellow-400" /> : <div className="w-4 h-4 rounded border border-slate-600" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={runAnalysis}
            disabled={loading || selectedProtocols.length === 0}
            className="w-full sm:w-auto px-8 py-3 rounded font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-yellow-600 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-400 shadow-lg shadow-yellow-900/30"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 animate-pulse" />
                ANALYZING...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                ANALYZE
              </span>
            )}
          </button>

          {error && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );

  // ── Render: Protocol Analysis Cards ──
  const renderProtocols = () => {
    if (!result) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-bold tracking-widest text-yellow-500/90 uppercase">Protocol Analysis</h2>
        </div>
        {result.protocols.map((proto, idx) => {
          const expanded = expandedProtocol === proto.id;
          return (
            <motion.div
              key={proto.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-lg border overflow-hidden ${
                proto.quantumVulnerable ? 'border-red-900/60 bg-red-950/10' : 'border-green-900/60 bg-green-950/10'
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedProtocol(expanded ? null : proto.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {proto.quantumVulnerable ? (
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  )}
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-200">{proto.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {proto.currentCrypto.join(', ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded ${
                    proto.quantumVulnerable
                      ? 'bg-red-900/40 text-red-400'
                      : 'bg-green-900/40 text-green-400'
                  }`}>
                    {proto.quantumVulnerable ? 'VULNERABLE' : 'QUANTUM-SAFE'}
                  </span>
                  {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </div>
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-4">
                      {/* Risk Assessment */}
                      <div className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 rounded p-3">
                        <span className="text-yellow-500 font-semibold">RISK: </span>
                        {proto.riskAssessment}
                      </div>

                      {/* Vulnerabilities table */}
                      {proto.vulnerabilities.length > 0 && (
                        <div>
                          <div className="text-[10px] tracking-widest text-slate-500 font-semibold mb-2 uppercase">Vulnerabilities</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-500 border-b border-white/5">
                                  <th className="text-left py-1.5 pr-3 font-medium">Algorithm</th>
                                  <th className="text-left py-1.5 pr-3 font-medium">Type</th>
                                  <th className="text-center py-1.5 pr-3 font-medium">Quantum Breakable</th>
                                  <th className="text-right py-1.5 pr-3 font-medium">Qubits</th>
                                  <th className="text-right py-1.5 font-medium">NIST Lvl</th>
                                </tr>
                              </thead>
                              <tbody>
                                {proto.vulnerabilities.map((v, vi) => (
                                  <tr key={vi} className="border-b border-white/[0.03]">
                                    <td className="py-1.5 pr-3 text-slate-300 font-medium">{v.algorithm}</td>
                                    <td className="py-1.5 pr-3 text-slate-500 capitalize">{v.type.replace('_', ' ')}</td>
                                    <td className="py-1.5 pr-3 text-center">
                                      {v.quantumBreakable ? (
                                        <XCircle className="w-3.5 h-3.5 text-red-400 inline" />
                                      ) : (
                                        <CheckCircle className="w-3.5 h-3.5 text-green-400 inline" />
                                      )}
                                    </td>
                                    <td className="py-1.5 pr-3 text-right text-slate-400 tabular-nums">
                                      {v.qubitsRequired ? v.qubitsRequired.toLocaleString() : 'N/A'}
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        v.nistLevel === 0 ? 'bg-red-900/30 text-red-400' : v.nistLevel >= 3 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
                                      }`}>
                                        {v.nistLevel === 0 ? 'FAIL' : `L${v.nistLevel}`}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* PQC Recommendations */}
                      {proto.pqcRecommendations.length > 0 && (
                        <div>
                          <div className="text-[10px] tracking-widest text-slate-500 font-semibold mb-2 uppercase">PQC Migration Recommendations</div>
                          <div className="space-y-2">
                            {proto.pqcRecommendations.map((rec, ri) => (
                              <div key={ri} className="flex items-start gap-2 bg-slate-900/40 rounded p-2.5">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                                  rec.priority === 'CRITICAL' ? 'bg-red-400' : rec.priority === 'HIGH' ? 'bg-orange-400' : 'bg-yellow-400'
                                }`} />
                                <div className="text-xs text-slate-300 leading-relaxed">
                                  <span className="text-slate-500">{rec.from}</span>
                                  <span className="text-yellow-500 mx-1">→</span>
                                  <span className="text-green-400 font-semibold">{rec.to}</span>
                                  <span className="ml-2 text-slate-500">| {rec.fips} | NIST L{rec.nistLevel} | {rec.effort}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compliance gaps */}
                      {proto.complianceGaps.length > 0 && (
                        <div>
                          <div className="text-[10px] tracking-widest text-slate-500 font-semibold mb-2 uppercase">Compliance Gaps</div>
                          <ul className="space-y-1">
                            {proto.complianceGaps.map((gap, gi) => (
                              <li key={gi} className="flex items-start gap-1.5 text-xs text-red-400/80">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // ── Render: Compliance Dashboard ──
  const renderCompliance = () => {
    if (!result) return null;
    const frameworks: { key: keyof ComplianceMapping; label: string; icon: typeof FileCheck }[] = [
      { key: 'basel_iii', label: 'Basel III / CRR III', icon: FileCheck },
      { key: 'dora', label: 'DORA', icon: Shield },
      { key: 'fips_140_3', label: 'FIPS 140-3', icon: Lock },
      { key: 'nist_sp_800_208', label: 'NIST SP 800-208', icon: Key },
    ];

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-bold tracking-widest text-yellow-500/90 uppercase">Compliance Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {frameworks.map((fw, idx) => {
            const data = result.compliance[fw.key];
            const Icon = fw.icon;
            const expanded = expandedCompliance === fw.key;
            const statusColor = data.status === 'PASS' ? 'text-green-400 bg-green-900/30 border-green-800/50'
              : data.status === 'FAIL' ? 'text-red-400 bg-red-900/30 border-red-800/50'
              : 'text-yellow-400 bg-yellow-900/30 border-yellow-800/50';

            return (
              <motion.div
                key={fw.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-lg border p-4 ${statusColor}`}
              >
                <button
                  onClick={() => setExpandedCompliance(expanded ? null : fw.key)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-bold">{fw.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tabular-nums">{data.score}</span>
                    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded ${
                      data.status === 'PASS' ? 'bg-green-900/50 text-green-400'
                        : data.status === 'FAIL' ? 'bg-red-900/50 text-red-400'
                        : 'bg-yellow-900/50 text-yellow-400'
                    }`}>
                      {data.status}
                    </span>
                    {expanded ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                  </div>
                </button>

                {/* Score bar */}
                <div className="mt-2 h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: data.status === 'PASS' ? '#22C55E' : data.status === 'FAIL' ? '#EF4444' : '#EAB308' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.score}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3">
                        {data.gaps.length > 0 && (
                          <div>
                            <div className="text-[10px] tracking-widest text-red-400/80 font-semibold mb-1.5 uppercase">Gaps</div>
                            <ul className="space-y-1">
                              {data.gaps.map((g, gi) => (
                                <li key={gi} className="text-[11px] text-red-400/70 flex items-start gap-1.5">
                                  <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {g}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div>
                          <div className="text-[10px] tracking-widest text-slate-400 font-semibold mb-1.5 uppercase">Recommendations</div>
                          <ul className="space-y-1">
                            {data.recommendations.map((r, ri) => (
                              <li key={ri} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                                <CheckCircle className="w-3 h-3 mt-0.5 text-green-500/70 flex-shrink-0" /> {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Render: Migration Roadmap ──
  const renderRoadmap = () => {
    if (!result) return null;
    const phaseColors = ['#EF4444', '#F97316', '#EAB308', '#22C55E'];

    // Compute total for the bottom summary
    const grandTotal = result.migrationRoadmap.reduce((s, p) => {
      const n = parseInt(p.totalCost.replace(/[^0-9]/g, ''), 10) || 0;
      return s + n;
    }, 0);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-bold tracking-widest text-yellow-500/90 uppercase">Migration Roadmap</h2>
          </div>
          <div className="text-xs text-slate-500">
            Total: <span className="text-yellow-400 font-bold">${grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Gantt-style bars */}
        <div className="space-y-2 mb-6">
          {result.migrationRoadmap.map((phase, pi) => {
            const color = phaseColors[pi % phaseColors.length];
            const expanded = expandedPhase === pi;
            const barWidth = 100 / result.migrationRoadmap.length;
            return (
              <motion.div
                key={pi}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: pi * 0.15 }}
                className="rounded-lg border border-white/5 bg-slate-900/30 overflow-hidden"
              >
                {/* Gantt bar */}
                <button
                  onClick={() => setExpandedPhase(expanded ? null : pi)}
                  className="w-full p-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-slate-300">{phase.phase}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 tabular-nums">{phase.timeline}</span>
                      <span className="text-xs font-bold text-yellow-400">{phase.totalCost}</span>
                      {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                  </div>
                  {/* Visual bar */}
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color, width: `${barWidth}%`, marginLeft: `${pi * barWidth}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + pi * 0.1 }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1">{phase.tasks.length} tasks</div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-white/5 pt-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-white/5">
                              <th className="text-left py-1.5 pr-2 font-medium">Task</th>
                              <th className="text-left py-1.5 pr-2 font-medium">Protocol</th>
                              <th className="text-left py-1.5 pr-2 font-medium">Migration</th>
                              <th className="text-center py-1.5 pr-2 font-medium">NIST</th>
                              <th className="text-right py-1.5 font-medium">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {phase.tasks.map((t, ti) => (
                              <tr key={ti} className="border-b border-white/[0.03]">
                                <td className="py-1.5 pr-2 text-slate-300">{t.description}</td>
                                <td className="py-1.5 pr-2 text-slate-500">{t.protocol}</td>
                                <td className="py-1.5 pr-2">
                                  <span className="text-slate-500">{t.currentCrypto}</span>
                                  <span className="text-yellow-500 mx-1">→</span>
                                  <span className="text-green-400">{t.targetCrypto}</span>
                                </td>
                                <td className="py-1.5 pr-2 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-yellow-400`}>L{t.nistLevel}</span>
                                </td>
                                <td className="py-1.5 text-right text-yellow-400 tabular-nums font-medium">{t.estimatedCost}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Render: Transaction Integrity ──
  const renderTransactionIntegrity = () => {
    if (!result) return null;
    const ti = result.transactionIntegrity;
    return (
      <div className="rounded-lg border border-white/5 bg-slate-900/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-bold tracking-widest text-yellow-500/90 uppercase">Transaction Integrity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Risk */}
          <div className="space-y-2">
            <div className="text-[10px] tracking-widest text-slate-500 font-semibold uppercase">Current Risk Assessment</div>
            <div className={`text-xs leading-relaxed p-3 rounded ${
              ti.pqcProtected ? 'bg-green-950/30 border border-green-900/30 text-green-400/90' : 'bg-red-950/30 border border-red-900/30 text-red-400/90'
            }`}>
              {ti.currentRisk}
            </div>
          </div>

          {/* Protection Status + Recommendations */}
          <div className="space-y-2">
            <div className="text-[10px] tracking-widest text-slate-500 font-semibold uppercase">PQC Protection Status</div>
            <div className={`flex items-center gap-2 p-3 rounded ${
              ti.pqcProtected ? 'bg-green-950/20 border border-green-900/30' : 'bg-red-950/20 border border-red-900/30'
            }`}>
              {ti.pqcProtected ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-bold text-green-400">PROTECTED</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-bold text-red-400">NOT PROTECTED</span>
                </>
              )}
            </div>

            {ti.recommendations.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] tracking-widest text-slate-500 font-semibold uppercase">Recommendations</div>
                {ti.recommendations.map((r, ri) => (
                  <div key={ri} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-yellow-500/60 flex-shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Algorithm Reference ──
  const renderAlgoRef = () => (
    <div className="rounded-lg border border-white/5 bg-slate-900/20 overflow-hidden">
      <button
        onClick={() => setShowAlgoRef(!showAlgoRef)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-bold tracking-widest text-yellow-500/90 uppercase">Algorithm Reference</h2>
        </div>
        {showAlgoRef ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>

      <AnimatePresence>
        {showAlgoRef && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-6 border-t border-white/5 pt-4">
              {/* PQC Algorithms */}
              <div>
                <div className="text-[10px] tracking-widest text-green-400/80 font-semibold mb-2 uppercase">NIST Standardized PQC Algorithms</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/5">
                        <th className="text-left py-1.5 pr-3 font-medium">Algorithm</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Type</th>
                        <th className="text-center py-1.5 pr-3 font-medium">NIST Level</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Key / Ciphertext Size</th>
                        <th className="text-right py-1.5 font-medium">Standard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PQC_REF_DATA.map((a, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          <td className="py-1.5 pr-3 text-green-300 font-medium">{a.name}</td>
                          <td className="py-1.5 pr-3 text-slate-500">{a.type}</td>
                          <td className="py-1.5 pr-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              a.nistLevel >= 5 ? 'bg-yellow-900/30 text-yellow-400' : a.nistLevel >= 3 ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'
                            }`}>
                              L{a.nistLevel}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-slate-400 tabular-nums font-mono">{a.size}</td>
                          <td className="py-1.5 text-right text-yellow-500/80 font-medium">{a.fips}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Classical Algorithms */}
              <div>
                <div className="text-[10px] tracking-widest text-red-400/80 font-semibold mb-2 uppercase">Classical Algorithms — Quantum Vulnerability Assessment</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/5">
                        <th className="text-left py-1.5 pr-3 font-medium">Algorithm</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Type</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Classical Security</th>
                        <th className="text-center py-1.5 pr-3 font-medium">Quantum Breakable</th>
                        <th className="text-right py-1.5 font-medium">Qubits to Break</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CLASSICAL_REF_DATA.map((a, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          <td className="py-1.5 pr-3 text-slate-300 font-medium">{a.name}</td>
                          <td className="py-1.5 pr-3 text-slate-500">{a.type}</td>
                          <td className="py-1.5 pr-3 text-slate-400 tabular-nums">{a.security}</td>
                          <td className="py-1.5 pr-3 text-center">
                            {a.quantumBreakable ? (
                              <XCircle className="w-3.5 h-3.5 text-red-400 inline" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 inline" />
                            )}
                          </td>
                          <td className={`py-1.5 text-right tabular-nums ${a.quantumBreakable ? 'text-red-400' : 'text-slate-500'}`}>
                            {a.qubits}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ── Render: Summary Stats Bar ──
  const renderSummaryBar = () => {
    if (!result) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        <div className="rounded-lg border border-white/5 bg-slate-900/30 p-3 text-center">
          <div className="text-[10px] tracking-widest text-slate-500 font-semibold uppercase">Vulnerabilities</div>
          <div className="text-2xl font-black text-red-400 tabular-nums mt-1">{result.totalVulnerabilities}</div>
          <div className="text-[10px] text-red-500/70">{result.criticalVulnerabilities} critical</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-slate-900/30 p-3 text-center">
          <div className="text-[10px] tracking-widest text-slate-500 font-semibold uppercase">Migration Cost</div>
          <div className="text-2xl font-black text-yellow-400 tabular-nums mt-1">{result.estimatedMigrationCost}</div>
          <div className="text-[10px] text-slate-500">estimated</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-slate-900/30 p-3 text-center">
          <div className="text-[10px] tracking-widest text-slate-500 font-semibold uppercase">Timeline</div>
          <div className={`text-sm font-bold tabular-nums mt-1 ${
            result.recommendedTimeline.includes('immediate') ? 'text-red-400' : 'text-slate-300'
          }`}>
            {result.recommendedTimeline}
          </div>
        </div>
        <div className="rounded-lg border border-white/5 bg-slate-900/30 p-3 text-center">
          <div className="text-[10px] tracking-widest text-slate-500 font-semibold uppercase">PQC Status</div>
          <div className={`text-lg font-black mt-1 ${
            result.transactionIntegrity.pqcProtected ? 'text-green-400' : 'text-red-400'
          }`}>
            {result.transactionIntegrity.pqcProtected ? 'PROTECTED' : 'EXPOSED'}
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Main Render ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B1C2C' }}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {renderGauge()}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {renderSummaryBar()}
              {renderProtocols()}
              {renderCompliance()}
              {renderTransactionIntegrity()}
              {renderRoadmap()}
            </motion.div>
          )}
        </AnimatePresence>

        {renderAlgoRef()}

        {/* Footer classification */}
        <div className="flex items-center justify-center gap-2 py-4 border-t border-yellow-900/20">
          <Crown className="w-3 h-3 text-yellow-600/40" />
          <span className="text-[10px] tracking-[0.3em] text-yellow-700/40 uppercase font-semibold">
            Sovereign Vault — Classified: Enterprise Confidential
          </span>
          <Crown className="w-3 h-3 text-yellow-600/40" />
        </div>
      </div>
    </div>
  );
}
