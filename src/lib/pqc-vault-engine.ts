// ═══════════════════════════════════════════════════════════════════════
// PQC Sovereign Vault Engine
// Defense-grade Post-Quantum Cryptography validation engine
// for central banks and tier-1 financial institutions.
// ═══════════════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────────────

export type OrganizationType =
  | 'central_bank'
  | 'clearing_house'
  | 'tier1_bank'
  | 'payment_processor'
  | 'government'
  | 'enterprise';

export type ReadinessLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'GOOD' | 'EXCELLENT';
export type ComplianceStatus = 'PASS' | 'FAIL' | 'PARTIAL';

export interface PQCAlgorithm {
  name: string;
  type: 'KEM' | 'signature' | 'hash_based';
  nistLevel: number;
  status: string;
  fips: string;
  keySize: number;
  ctSize?: number;
  sigSize?: number;
  securityBits: number;
}

export interface ClassicalAlgorithm {
  name: string;
  type: 'encryption' | 'signature' | 'key_exchange' | 'symmetric' | 'hash';
  securityBits: number;
  quantumBreakable: boolean;
  qubitsRequired?: number;
  groverReduction?: number;
  nistLevel: number;
}

export interface ProtocolEntry {
  name: string;
  currentCrypto: string[];
  quantumVulnerable: boolean;
  pqcMigrationTarget: string[];
  regulatoryFramework: string[];
  riskAssessment: string;
}

export interface Vulnerability {
  algorithm: string;
  type: string;
  quantumBreakable: boolean;
  qubitsRequired?: number;
  nistLevel: number;
}

export interface PQCRecommendation {
  from: string;
  to: string;
  nistLevel: number;
  fips: string;
  priority: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  effort: string;
}

export interface ProtocolAnalysis {
  id: string;
  name: string;
  quantumVulnerable: boolean;
  riskAssessment: string;
  currentCrypto: string[];
  vulnerabilities: Vulnerability[];
  pqcRecommendations: PQCRecommendation[];
  complianceGaps: string[];
}

export interface ComplianceFramework {
  status: ComplianceStatus;
  score: number;
  gaps: string[];
  recommendations: string[];
}

export interface ComplianceMapping {
  basel_iii: ComplianceFramework;
  dora: ComplianceFramework;
  fips_140_3: ComplianceFramework;
  nist_sp_800_208: ComplianceFramework;
}

export interface MigrationTask {
  description: string;
  protocol: string;
  currentCrypto: string;
  targetCrypto: string;
  nistLevel: number;
  estimatedCost: string;
}

export interface MigrationPhase {
  phase: string;
  timeline: string;
  tasks: MigrationTask[];
  totalCost: string;
}

export interface TransactionIntegrity {
  currentRisk: string;
  pqcProtected: boolean;
  recommendations: string[];
}

export interface PQCVaultResult {
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

export interface TLSDataEntry {
  domain: string;
  port: number;
  protocol: string;
  cipherSuite: string;
  keyExchange: string;
  keySize: number;
}

export interface PQCVaultParams {
  organizationType: OrganizationType;
  protocols: string[];
  tlsData?: TLSDataEntry[];
  complianceFrameworks?: string[];
}

// ── NIST PQC Algorithm Database ───────────────────────────────────────

export const PQC_ALGORITHMS: Record<string, PQCAlgorithm> = {
  kyber_512: { name: 'CRYSTALS-Kyber-512', type: 'KEM', nistLevel: 1, status: 'standardized', fips: 'FIPS 203', keySize: 800, ctSize: 768, securityBits: 128 },
  kyber_768: { name: 'CRYSTALS-Kyber-768', type: 'KEM', nistLevel: 3, status: 'standardized', fips: 'FIPS 203', keySize: 1184, ctSize: 1088, securityBits: 192 },
  kyber_1024: { name: 'CRYSTALS-Kyber-1024', type: 'KEM', nistLevel: 5, status: 'standardized', fips: 'FIPS 203', keySize: 1568, ctSize: 1568, securityBits: 256 },
  dilithium_2: { name: 'CRYSTALS-Dilithium-2', type: 'signature', nistLevel: 2, status: 'standardized', fips: 'FIPS 204', keySize: 1952, sigSize: 2420, securityBits: 128 },
  dilithium_3: { name: 'CRYSTALS-Dilithium-3', type: 'signature', nistLevel: 3, status: 'standardized', fips: 'FIPS 204', keySize: 2592, sigSize: 3309, securityBits: 192 },
  dilithium_5: { name: 'CRYSTALS-Dilithium-5', type: 'signature', nistLevel: 5, status: 'standardized', fips: 'FIPS 204', keySize: 4096, sigSize: 4627, securityBits: 256 },
  sphincs_sha2_128f: { name: 'SPHINCS+-SHA2-128f', type: 'hash_based', nistLevel: 1, status: 'standardized', fips: 'FIPS 205', keySize: 64, sigSize: 7856, securityBits: 128 },
  sphincs_sha2_256f: { name: 'SPHINCS+-SHA2-256f', type: 'hash_based', nistLevel: 5, status: 'standardized', fips: 'FIPS 205', keySize: 128, sigSize: 16488, securityBits: 256 },
};

// ── Classical Algorithm Vulnerability Database ─────────────────────────

export const CLASSICAL_ALGORITHMS: Record<string, ClassicalAlgorithm> = {
  rsa_1024: { name: 'RSA-1024', type: 'encryption', securityBits: 80, quantumBreakable: true, qubitsRequired: 2048, nistLevel: 0 },
  rsa_2048: { name: 'RSA-2048', type: 'encryption', securityBits: 112, quantumBreakable: true, qubitsRequired: 4096, nistLevel: 0 },
  rsa_4096: { name: 'RSA-4096', type: 'encryption', securityBits: 128, quantumBreakable: true, qubitsRequired: 8192, nistLevel: 0 },
  ecdsa_p256: { name: 'ECDSA P-256', type: 'signature', securityBits: 128, quantumBreakable: true, qubitsRequired: 2330, nistLevel: 0 },
  ecdsa_p384: { name: 'ECDSA P-384', type: 'signature', securityBits: 192, quantumBreakable: true, qubitsRequired: 3484, nistLevel: 0 },
  ecdh_p256: { name: 'ECDH P-256', type: 'key_exchange', securityBits: 128, quantumBreakable: true, qubitsRequired: 2330, nistLevel: 0 },
  aes_128: { name: 'AES-128', type: 'symmetric', securityBits: 128, quantumBreakable: false, groverReduction: 64, nistLevel: 1 },
  aes_256: { name: 'AES-256', type: 'symmetric', securityBits: 256, quantumBreakable: false, groverReduction: 128, nistLevel: 3 },
  sha_256: { name: 'SHA-256', type: 'hash', securityBits: 128, quantumBreakable: false, groverReduction: 128, nistLevel: 1 },
  sha_384: { name: 'SHA-384', type: 'hash', securityBits: 192, quantumBreakable: false, groverReduction: 192, nistLevel: 3 },
};

// ── Protocol Analysis Database ────────────────────────────────────────

export const PROTOCOL_ANALYSIS: Record<string, ProtocolEntry> = {
  swift: {
    name: 'SWIFT MT/MX',
    currentCrypto: ['RSA-2048', '3DES', 'SHA-1'],
    quantumVulnerable: true,
    pqcMigrationTarget: ['CRYSTALS-Kyber-1024', 'CRYSTALS-Dilithium-5', 'AES-256-GCM'],
    regulatoryFramework: ['ISO 20022', 'SWIFT CSP'],
    riskAssessment: 'CRITICAL — SWIFT messages use legacy RSA for key exchange. Quantum adversary can decrypt interbank messages.',
  },
  fedwire: {
    name: 'FedWire',
    currentCrypto: ['RSA-2048', 'ECDSA P-256', 'AES-256'],
    quantumVulnerable: true,
    pqcMigrationTarget: ['CRYSTALS-Kyber-1024', 'CRYSTALS-Dilithium-5'],
    regulatoryFramework: ['Fed Line Security', 'FIPS 140-3'],
    riskAssessment: 'HIGH — Key exchange and signatures vulnerable. AES-256 provides adequate symmetric protection.',
  },
  ach: {
    name: 'ACH (NACHA)',
    currentCrypto: ['RSA-2048', 'TLS 1.2'],
    quantumVulnerable: true,
    pqcMigrationTarget: ['TLS 1.3 + PQC hybrid', 'CRYSTALS-Kyber-768'],
    regulatoryFramework: ['NACHA Operating Rules', 'PCI-DSS'],
    riskAssessment: 'HIGH — Batch payment processing relies on TLS with classical crypto.',
  },
  https: {
    name: 'HTTPS/TLS',
    currentCrypto: ['ECDH P-256', 'ECDSA P-256', 'AES-128-GCM', 'ChaCha20-Poly1305'],
    quantumVulnerable: true,
    pqcMigrationTarget: ['TLS 1.3 + Kyber-768 hybrid', 'X25519+Kyber768'],
    regulatoryFramework: ['PCI-DSS', 'SOC2', 'HIPAA'],
    riskAssessment: 'MODERATE — Key exchange is primary vulnerability. Symmetric ciphers remain adequate.',
  },
};

// ── Helper: Map protocol crypto strings to ClassicalAlgorithm keys ─────

function matchClassicalAlgorithm(cryptoName: string): ClassicalAlgorithm | null {
  const name = cryptoName.toLowerCase();
  if (name.includes('rsa-1024') || name === 'rsa_1024') return CLASSICAL_ALGORITHMS.rsa_1024;
  if (name.includes('rsa-2048') || name === 'rsa_2048') return CLASSICAL_ALGORITHMS.rsa_2048;
  if (name.includes('rsa-4096') || name === 'rsa_4096') return CLASSICAL_ALGORITHMS.rsa_4096;
  if (name.includes('ecdsa') && (name.includes('p-256') || name.includes('p256'))) return CLASSICAL_ALGORITHMS.ecdsa_p256;
  if (name.includes('ecdsa') && (name.includes('p-384') || name.includes('p384'))) return CLASSICAL_ALGORITHMS.ecdsa_p384;
  if (name.includes('ecdh') && (name.includes('p-256') || name.includes('p256'))) return CLASSICAL_ALGORITHMS.ecdh_p256;
  if (name.includes('aes-128') || name.includes('aes128')) return CLASSICAL_ALGORITHMS.aes_128;
  if (name.includes('aes-256') || name.includes('aes256')) return CLASSICAL_ALGORITHMS.aes_256;
  if (name.includes('sha-256') || name.includes('sha256')) return CLASSICAL_ALGORITHMS.sha_256;
  if (name.includes('sha-384') || name.includes('sha384')) return CLASSICAL_ALGORITHMS.sha_384;
  if (name.includes('3des') || name.includes('3-des') || name.includes('tripledes')) {
    // 3DES is quantum-breakable via Grover's — treat as weak symmetric
    return { name: '3DES', type: 'symmetric', securityBits: 80, quantumBreakable: true, qubitsRequired: 4096, nistLevel: 0 };
  }
  if (name.includes('sha-1') || name.includes('sha1')) {
    return { name: 'SHA-1', type: 'hash', securityBits: 40, quantumBreakable: true, qubitsRequired: 1024, nistLevel: 0 };
  }
  if (name.includes('chacha20') || name.includes('chacha')) {
    return { name: 'ChaCha20-Poly1305', type: 'symmetric', securityBits: 256, quantumBreakable: false, groverReduction: 128, nistLevel: 2 };
  }
  if (name.includes('tls 1.2')) {
    return { name: 'TLS 1.2', type: 'key_exchange', securityBits: 112, quantumBreakable: true, qubitsRequired: 4096, nistLevel: 0 };
  }
  // Unknown — assume vulnerable for safety
  return null;
}

// ── Helper: Map protocol crypto to PQC recommendations ────────────────

function generateRecommendations(cryptoName: string, orgType: OrganizationType): PQCRecommendation[] {
  const name = cryptoName.toLowerCase();
  const recs: PQCRecommendation[] = [];
  const isHighAssurance = orgType === 'central_bank' || orgType === 'clearing_house' || orgType === 'government';

  // RSA key exchange → Kyber KEM
  if (name.includes('rsa') || name.includes('tls 1.2') || name.includes('3des')) {
    const target = isHighAssurance ? 'CRYSTALS-Kyber-1024' : 'CRYSTALS-Kyber-768';
    const nistLevel = isHighAssurance ? 5 : 3;
    recs.push({
      from: cryptoName,
      to: target,
      nistLevel,
      fips: 'FIPS 203',
      priority: name.includes('3des') || name.includes('sha-1') ? 'CRITICAL' : 'HIGH',
      effort: '6-12 months',
    });
  }

  // ECDSA / ECDH → Kyber KEM + Dilithium signatures
  if (name.includes('ecdsa') || name.includes('ecdh')) {
    const kemTarget = isHighAssurance ? 'CRYSTALS-Kyber-1024' : 'CRYSTALS-Kyber-768';
    const sigTarget = isHighAssurance ? 'CRYSTALS-Dilithium-5' : 'CRYSTALS-Dilithium-3';
    const nistLevel = isHighAssurance ? 5 : 3;

    if (name.includes('ecdh') || name.includes('key_exchange')) {
      recs.push({
        from: cryptoName,
        to: kemTarget,
        nistLevel,
        fips: 'FIPS 203',
        priority: 'HIGH',
        effort: '4-9 months',
      });
    } else {
      recs.push({
        from: cryptoName,
        to: sigTarget,
        nistLevel,
        fips: 'FIPS 204',
        priority: 'HIGH',
        effort: '6-12 months',
      });
    }
  }

  // AES-128 → AES-256 (Grover mitigation)
  if (name.includes('aes-128') || name.includes('aes128')) {
    recs.push({
      from: cryptoName,
      to: 'AES-256-GCM',
      nistLevel: 3,
      fips: 'FIPS 140-3',
      priority: 'MODERATE',
      effort: '1-3 months',
    });
  }

  // SHA-1 → SHA-384
  if (name.includes('sha-1') || name.includes('sha1')) {
    recs.push({
      from: cryptoName,
      to: 'SHA-384',
      nistLevel: 3,
      fips: 'FIPS 180-4',
      priority: 'CRITICAL',
      effort: '1-3 months',
    });
  }

  return recs;
}

// ── Helper: Build compliance gaps per protocol ─────────────────────────

function buildProtocolComplianceGaps(protocolId: string, entry: ProtocolEntry): string[] {
  const gaps: string[] = [];
  if (entry.quantumVulnerable) {
    gaps.push(`No PQC key exchange mechanism for ${entry.name}`);
    gaps.push(`Digital signatures on ${entry.name} do not meet NIST PQC requirements`);
  }
  if (entry.currentCrypto.some(c => c.toLowerCase().includes('sha-1'))) {
    gaps.push(`Deprecated hash algorithm SHA-1 in use on ${entry.name}`);
  }
  if (entry.currentCrypto.some(c => c.toLowerCase().includes('3des'))) {
    gaps.push(`3DES block cipher deprecated and quantum-vulnerable on ${entry.name}`);
  }
  if (entry.currentCrypto.some(c => c.toLowerCase().includes('tls 1.2'))) {
    gaps.push(`TLS 1.2 lacks mandatory PQC key exchange on ${entry.name}`);
  }
  return gaps;
}

// ── Organization multipliers for cost/effort ───────────────────────────

function getOrgMultiplier(orgType: OrganizationType): number {
  switch (orgType) {
    case 'central_bank': return 3.0;
    case 'clearing_house': return 2.5;
    case 'tier1_bank': return 2.0;
    case 'payment_processor': return 1.5;
    case 'government': return 2.8;
    case 'enterprise': return 1.0;
  }
}

// ── Compliance Mapping Engine ──────────────────────────────────────────

export function getComplianceMapping(
  protocols: ProtocolAnalysis[],
  orgType: OrganizationType,
  frameworks?: string[],
): ComplianceMapping {
  const hasVulnerableProtocols = protocols.some(p => p.quantumVulnerable);
  const criticalCount = protocols.filter(p => p.vulnerabilities.some(v => v.quantumBreakable)).length;
  const totalProtocols = protocols.length || 1;
  const vulnerableRatio = criticalCount / totalProtocols;

  const isHighAssurance = orgType === 'central_bank' || orgType === 'clearing_house' || orgType === 'government';

  // ── Basel III / CRR III ──
  const baselScore = hasVulnerableProtocols
    ? Math.round(Math.max(10, 60 - vulnerableRatio * 50))
    : 100;
  const basel: ComplianceFramework = {
    status: baselScore >= 80 ? 'PASS' : baselScore >= 50 ? 'PARTIAL' : 'FAIL',
    score: baselScore,
    gaps: hasVulnerableProtocols
      ? [
          'ICT risk management framework does not account for quantum computing threats (CRR Art. 78)',
          'Operational resilience testing lacks PQC failure scenarios',
          'Third-party risk (SWIFT, payment processors) inherits quantum vulnerability',
        ]
      : [],
    recommendations: [
      'Extend ICT risk framework to include quantum threat vectors under CRR Art. 78-96',
      'Mandate PQC migration for all payment infrastructure by 2028',
      'Require PQC compliance certificates from all critical third-party providers',
      'Integrate quantum readiness into Pillar 3 disclosure requirements',
    ],
  };

  // ── DORA (Digital Operational Resilience Act) ──
  const doraScore = hasVulnerableProtocols
    ? Math.round(Math.max(15, 55 - vulnerableRatio * 40))
    : 100;
  const dora: ComplianceFramework = {
    status: doraScore >= 80 ? 'PASS' : doraScore >= 50 ? 'PARTIAL' : 'FAIL',
    score: doraScore,
    gaps: hasVulnerableProtocols
      ? [
          'Digital operational resilience testing does not cover quantum attack scenarios',
          'ICT incident reporting classification misses quantum-powered breaches',
          'Third-party ICT risk management lacks PQC requirements',
        ]
      : [],
    recommendations: [
      'Update DORA Article 25 threat-led penetration testing to include quantum scenarios',
      'Add PQC migration milestones to ICT business continuity plans',
      'Mandate PQC cipher suite validation in third-party provider assessments',
      'Establish quantum incident classification and response procedures per Art. 17-23',
    ],
  };

  // ── FIPS 140-3 ──
  const fipsScore = hasVulnerableProtocols
    ? Math.round(Math.max(20, 65 - vulnerableRatio * 45))
    : 100;
  const fips: ComplianceFramework = {
    status: fipsScore >= 80 ? 'PASS' : fipsScore >= 50 ? 'PARTIAL' : 'FAIL',
    score: fipsScore,
    gaps: hasVulnerableProtocols
      ? [
          'Cryptographic modules not validated for FIPS 203/204/205 PQC algorithms',
          'Key management procedures do not include PQC hybrid key generation',
          'No approved mode of operation for post-quantum KEM/signature pairs',
        ]
      : [],
    recommendations: [
      'Submit cryptographic modules for FIPS 140-3 Level 3 validation with PQC extensions',
      'Implement FIPS 203 (ML-KEM) for all key encapsulation operations',
      'Implement FIPS 204 (ML-DSA) for all digital signature operations',
      'Update Key Management Policy per SP 800-57 Part 1 Rev. 5 PQC guidance',
    ],
  };

  // ── NIST SP 800-208 ──
  const nistScore = hasVulnerableProtocols
    ? Math.round(Math.max(10, 50 - vulnerableRatio * 40))
    : 100;
  const nist: ComplianceFramework = {
    status: nistScore >= 80 ? 'PASS' : nistScore >= 50 ? 'PARTIAL' : 'FAIL',
    score: nistScore,
    gaps: hasVulnerableProtocols
      ? [
          'No PQC algorithm inventory or transition plan documented',
          'Cryptographic agility requirements not met for PQC migration',
          'No "Harvest Now, Decrypt Later" risk assessment performed',
          isHighAssurance ? 'NIST Level 5 algorithms required but not deployed for sovereign communications' : 'NIST Level 3 algorithms not yet deployed for financial transactions',
        ]
      : [],
    recommendations: [
      'Develop comprehensive PQC transition plan per NIST IR 8547 roadmap',
      'Implement cryptographic inventory and agility framework per SP 1800-38B',
      'Conduct "Harvest Now, Decrypt Later" risk assessment for all data classifications',
      isHighAssurance
        ? 'Deploy NIST Level 5 algorithms (ML-KEM-1024, ML-DSA-65) for all sovereign-grade communications'
        : 'Deploy NIST Level 3 algorithms (ML-KEM-768, ML-DSA-44) for standard financial operations',
      'Establish hybrid classical/PQC deployment per transition guidance',
    ],
  };

  return { basel_iii: basel, dora, fips_140_3: fips, nist_sp_800_208: nist };
}

// ── Migration Roadmap Generator ────────────────────────────────────────

function buildMigrationRoadmap(
  protocols: ProtocolAnalysis[],
  orgType: OrganizationType,
): MigrationPhase[] {
  const multiplier = getOrgMultiplier(orgType);
  const phases: MigrationPhase[] = [];

  // Collect all CRITICAL and HIGH priority tasks
  const criticalTasks: MigrationTask[] = [];
  const highTasks: MigrationTask[] = [];
  const moderateTasks: MigrationTask[] = [];

  for (const proto of protocols) {
    for (const rec of proto.pqcRecommendations) {
      const baseCost = rec.priority === 'CRITICAL' ? 500000
        : rec.priority === 'HIGH' ? 350000
        : 150000;
      const cost = `$${Math.round(baseCost * multiplier).toLocaleString()}`;
      const task: MigrationTask = {
        description: `Migrate ${rec.from} → ${rec.to}`,
        protocol: proto.name,
        currentCrypto: rec.from,
        targetCrypto: rec.to,
        nistLevel: rec.nistLevel,
        estimatedCost: cost,
      };

      if (rec.priority === 'CRITICAL') criticalTasks.push(task);
      else if (rec.priority === 'HIGH') highTasks.push(task);
      else moderateTasks.push(task);
    }
  }

  // Phase 1: Critical (deprecated algorithms, SHA-1, 3DES)
  if (criticalTasks.length > 0) {
    const total = criticalTasks.reduce((s, t) => {
      const n = parseInt(t.estimatedCost.replace(/[^0-9]/g, ''), 10);
      return s + n;
    }, 0);
    phases.push({
      phase: 'Phase 1: Critical — Eliminate Deprecated Crypto',
      timeline: 'Q1 2025 — Q2 2025',
      tasks: criticalTasks,
      totalCost: `$${total.toLocaleString()}`,
    });
  }

  // Phase 2: High Priority (RSA, ECDSA, ECDH migration)
  if (highTasks.length > 0) {
    const total = highTasks.reduce((s, t) => {
      const n = parseInt(t.estimatedCost.replace(/[^0-9]/g, ''), 10);
      return s + n;
    }, 0);
    phases.push({
      phase: 'Phase 2: High Priority — PQC Key Exchange & Signatures',
      timeline: 'Q3 2025 — Q2 2026',
      tasks: highTasks,
      totalCost: `$${total.toLocaleString()}`,
    });
  }

  // Phase 3: Moderate (AES-128 upgrade, full PQC validation)
  if (moderateTasks.length > 0) {
    const total = moderateTasks.reduce((s, t) => {
      const n = parseInt(t.estimatedCost.replace(/[^0-9]/g, ''), 10);
      return s + n;
    }, 0);
    phases.push({
      phase: 'Phase 3: Moderate — Symmetric Hardening & Validation',
      timeline: 'Q3 2026 — Q2 2027',
      tasks: moderateTasks,
      totalCost: `$${total.toLocaleString()}`,
    });
  }

  // Phase 4: Full quantum-native (always included)
  const baseValidationCost = orgType === 'central_bank' ? 2000000
    : orgType === 'government' ? 1800000
    : orgType === 'clearing_house' ? 1500000
    : orgType === 'tier1_bank' ? 1200000
    : 800000;
  const validationCost = Math.round(baseValidationCost * multiplier);
  phases.push({
    phase: 'Phase 4: Quantum-Native Operations',
    timeline: 'Q3 2027 — Q4 2028',
    tasks: [
      {
        description: 'Achieve FIPS 140-3 Level 3+ validation with PQC modules',
        protocol: 'Enterprise-wide',
        currentCrypto: 'Mixed classical/PQC',
        targetCrypto: 'PQC-native (ML-KEM + ML-DSA)',
        nistLevel: orgType === 'central_bank' ? 5 : 3,
        estimatedCost: `$${Math.round(validationCost * 0.5).toLocaleString()}`,
      },
      {
        description: 'Implement crypto-agility framework for algorithm lifecycle management',
        protocol: 'Enterprise-wide',
        currentCrypto: 'Static algorithm configuration',
        targetCrypto: 'Dynamic PQC algorithm negotiation',
        nistLevel: 3,
        estimatedCost: `$${Math.round(validationCost * 0.3).toLocaleString()}`,
      },
      {
        description: 'Complete third-party and supply chain PQC compliance verification',
        protocol: 'All external interfaces',
        currentCrypto: 'Vendor-dependent classical crypto',
        targetCrypto: 'PQC-verified vendor stack',
        nistLevel: 3,
        estimatedCost: `$${Math.round(validationCost * 0.2).toLocaleString()}`,
      },
    ],
    totalCost: `$${validationCost.toLocaleString()}`,
  });

  return phases;
}

// ── Transaction Integrity Assessment ───────────────────────────────────

function buildTransactionIntegrity(
  protocols: ProtocolAnalysis[],
  orgType: OrganizationType,
): TransactionIntegrity {
  const hasVulnerable = protocols.some(p => p.quantumVulnerable);
  const hasCriticalVulns = protocols.some(p =>
    p.vulnerabilities.some(v => v.quantumBreakable && v.qubitsRequired && v.qubitsRequired < 4096),
  );

  const isHighAssurance = orgType === 'central_bank' || orgType === 'clearing_house';

  let currentRisk: string;
  if (hasCriticalVulns && isHighAssurance) {
    currentRisk = 'SOVEREIGN RISK — Quantum adversary can forge or decrypt payment instructions, compromising monetary sovereignty and systemic financial stability.';
  } else if (hasCriticalVulns) {
    currentRisk = 'CRITICAL — Quantum adversary capable of decrypting transaction payloads and forging signatures on payment instructions.';
  } else if (hasVulnerable) {
    currentRisk = 'HIGH — Key exchange vulnerabilities enable "harvest now, decrypt later" attacks on archived transactions.';
  } else {
    currentRisk = 'LOW — All transaction paths protected with quantum-resistant cryptography.';
  }

  const recommendations: string[] = [];
  if (hasCriticalVulns) {
    recommendations.push('Immediately deploy hybrid classical/PQC key exchange for all payment channels');
    recommendations.push('Implement transaction signing with ML-DSA (FIPS 204) for non-repudiation');
    recommendations.push('Establish quantum-safe key ceremony procedures for HSM migration');
  }
  if (hasVulnerable) {
    recommendations.push('Mandate PQC cipher suites for all inter-institutional communication');
    recommendations.push('Deploy PQC-protected message authentication codes (MAC) for transaction integrity');
  }
  recommendations.push('Implement crypto-agility to enable rapid algorithm rotation as NIST standards evolve');
  if (isHighAssurance) {
    recommendations.push('Establish bilateral PQC key agreement with all correspondent banking partners');
  }

  return {
    currentRisk,
    pqcProtected: !hasVulnerable,
    recommendations,
  };
}

// ── Synthetic TLS Data Generator ───────────────────────────────────────

export function generateSyntheticTLSData(): TLSDataEntry[] {
  const domains = [
    { domain: 'pay.bankofamerica.com', port: 443, protocol: 'TLS 1.2', cipherSuite: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256', keyExchange: 'ECDH P-256', keySize: 256 },
    { domain: 'swift.bnpparibas.com', port: 443, protocol: 'TLS 1.2', cipherSuite: 'TLS_RSA_WITH_AES_256_CBC_SHA', keyExchange: 'RSA-2048', keySize: 2048 },
    { domain: 'fedwire.frbservices.org', port: 443, protocol: 'TLS 1.3', cipherSuite: 'TLS_AES_128_GCM_SHA256', keyExchange: 'ECDH P-256', keySize: 256 },
    { domain: 'api.jpmorgan.com', port: 443, protocol: 'TLS 1.2', cipherSuite: 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384', keyExchange: 'ECDH P-256', keySize: 256 },
    { domain: 'secure.citibank.com', port: 443, protocol: 'TLS 1.3', cipherSuite: 'TLS_AES_256_GCM_SHA384', keyExchange: 'ECDH P-384', keySize: 384 },
    { domain: 'gw.hsbc.com', port: 443, protocol: 'TLS 1.2', cipherSuite: 'TLS_RSA_WITH_3DES_EDE_CBC_SHA', keyExchange: 'RSA-2048', keySize: 2048 },
    { domain: 'payments.goldmansachs.com', port: 443, protocol: 'TLS 1.3', cipherSuite: 'TLS_CHACHA20_POLY1305_SHA256', keyExchange: 'ECDH P-256', keySize: 256 },
    { domain: 'clearing.dtcc.com', port: 443, protocol: 'TLS 1.2', cipherSuite: 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA', keyExchange: 'ECDH P-256', keySize: 256 },
  { domain: 'settlement.clsgroup.com', port: 443, protocol: 'TLS 1.2', cipherSuite: 'TLS_RSA_WITH_AES_256_GCM_SHA384', keyExchange: 'RSA-2048', keySize: 2048 },
    { domain: 'api.euroclear.com', port: 443, protocol: 'TLS 1.3', cipherSuite: 'TLS_AES_128_GCM_SHA256', keyExchange: 'ECDH P-256', keySize: 256 },
  ];
  return domains;
}

// ── Main Analysis Function ─────────────────────────────────────────────

export function analyzePQCVault(params: PQCVaultParams): PQCVaultResult {
  const { organizationType, protocols: protocolIds, tlsData, complianceFrameworks } = params;

  // ── 1. Analyze each protocol ──
  const protocolResults: ProtocolAnalysis[] = [];
  let totalVulns = 0;
  let criticalVulns = 0;

  for (const pid of protocolIds) {
    const entry = PROTOCOL_ANALYSIS[pid];
    if (!entry) continue;

    // Build vulnerabilities from current crypto
    const vulnerabilities: Vulnerability[] = [];
    for (const crypto of entry.currentCrypto) {
      const matched = matchClassicalAlgorithm(crypto);
      if (matched) {
        vulnerabilities.push({
          algorithm: matched.name,
          type: matched.type,
          quantumBreakable: matched.quantumBreakable,
          qubitsRequired: matched.qubitsRequired,
          nistLevel: matched.nistLevel,
        });
        totalVulns++;
        if (matched.quantumBreakable) criticalVulns++;
      } else {
        // Unknown algorithm — assume vulnerable
        vulnerabilities.push({
          algorithm: crypto,
          type: 'unknown',
          quantumBreakable: true,
          nistLevel: 0,
        });
        totalVulns++;
        criticalVulns++;
      }
    }

    // Build PQC recommendations
    const pqcRecommendations: PQCRecommendation[] = [];
    const seenTargets = new Set<string>();
    for (const crypto of entry.currentCrypto) {
      const recs = generateRecommendations(crypto, organizationType);
      for (const rec of recs) {
        const key = `${rec.from}→${rec.to}`;
        if (!seenTargets.has(key)) {
          seenTargets.add(key);
          pqcRecommendations.push(rec);
        }
      }
    }

    // Compliance gaps
    const complianceGaps = buildProtocolComplianceGaps(pid, entry);

    protocolResults.push({
      id: pid,
      name: entry.name,
      quantumVulnerable: entry.quantumVulnerable,
      riskAssessment: entry.riskAssessment,
      currentCrypto: entry.currentCrypto,
      vulnerabilities,
      pqcRecommendations,
      complianceGaps,
    });
  }

  // ── 2. Compute readiness score ──
  const isHighAssurance = organizationType === 'central_bank' || organizationType === 'clearing_house' || organizationType === 'government';
  const vulnerableProtocols = protocolResults.filter(p => p.quantumVulnerable).length;
  const totalProtocols = protocolResults.length || 1;
  const vulnRatio = vulnerableProtocols / totalProtocols;

  // Base score deduction for vulnerable protocols
  let score = 100;
  score -= Math.round(vulnRatio * 60);

  // Extra deduction for critical algorithms (SHA-1, 3DES)
  for (const proto of protocolResults) {
    if (proto.currentCrypto.some(c => c.toLowerCase().includes('sha-1'))) score -= 5;
    if (proto.currentCrypto.some(c => c.toLowerCase().includes('3des'))) score -= 8;
  }

  // High-assurance organizations need higher bar
  if (isHighAssurance && vulnerableProtocols > 0) {
    score = Math.min(score, 35);
  }

  score = Math.max(0, Math.min(100, score));

  let readinessLevel: ReadinessLevel;
  if (score >= 85) readinessLevel = 'EXCELLENT';
  else if (score >= 70) readinessLevel = 'GOOD';
  else if (score >= 45) readinessLevel = 'MODERATE';
  else if (score >= 25) readinessLevel = 'HIGH';
  else readinessLevel = 'CRITICAL';

  // ── 3. Compliance mapping ──
  const compliance = getComplianceMapping(protocolResults, organizationType, complianceFrameworks);

  // ── 4. Migration roadmap ──
  const migrationRoadmap = buildMigrationRoadmap(protocolResults, organizationType);

  // ── 5. Transaction integrity ──
  const transactionIntegrity = buildTransactionIntegrity(protocolResults, organizationType);

  // ── 6. Cost estimation ──
  const multiplier = getOrgMultiplier(organizationType);
  const baseMigrationCost = criticalVulns * 500000 + (totalVulns - criticalVulns) * 250000;
  const totalCost = Math.round(baseMigrationCost * multiplier) + Math.round(2000000 * multiplier);
  const estimatedMigrationCost = `$${totalCost.toLocaleString()}`;

  let recommendedTimeline: string;
  if (criticalVulns > 0) recommendedTimeline = '24-36 months (immediate action required)';
  else if (vulnerableProtocols > 0) recommendedTimeline = '30-42 months';
  else recommendedTimeline = '12-18 months (validation phase)';

  return {
    pqcReadinessScore: score,
    readinessLevel,
    protocols: protocolResults,
    compliance,
    migrationRoadmap,
    transactionIntegrity,
    totalVulnerabilities: totalVulns,
    criticalVulnerabilities: criticalVulns,
    estimatedMigrationCost,
    recommendedTimeline,
  };
}
