// ══════════════════════════════════════════════════════════════════════════════
// CNI THREAT SENTINEL ENGINE — Critical National Infrastructure Threat Analysis
// Specialized for SCADA, Industrial IoT, Energy Grids, Defense Networks
// ══════════════════════════════════════════════════════════════════════════════

// ── SCADA/ICS Protocol Database ──────────────────────────────────────────────

export const SCADA_PROTOCOLS: Record<string, {
  name: string;
  port: number | null;
  risk: 'critical' | 'high' | 'medium' | 'low';
  commonVulns: string[];
  iec62443: string[];
  nercCip: string[];
}> = {
  modbus_tcp: {
    name: 'Modbus TCP',
    port: 502,
    risk: 'high',
    commonVulns: ['unauthenticated access', 'command injection', 'function code manipulation'],
    iec62443: ['SR 1.1', 'SR 1.2', 'SR 2.1', 'SR 3.1', 'SR 4.1'],
    nercCip: ['CIP-005', 'CIP-007'],
  },
  modbus_rtu: {
    name: 'Modbus RTU',
    port: null,
    risk: 'high',
    commonVulns: ['no encryption', 'no authentication', 'replay attacks'],
    iec62443: ['SR 1.1', 'SR 2.1'],
    nercCip: ['CIP-005'],
  },
  dnp3: {
    name: 'DNP3',
    port: 20000,
    risk: 'critical',
    commonVulns: ['unauthenticated links', 'DoS via malformed responses', 'time synchronization attacks'],
    iec62443: ['SR 1.1', 'SR 1.2', 'SR 2.1', 'SR 3.1', 'SR 4.1', 'SR 5.1'],
    nercCip: ['CIP-005', 'CIP-007', 'CIP-010'],
  },
  bacnet: {
    name: 'BACnet',
    port: 47808,
    risk: 'high',
    commonVulns: ['unauthenticated device discovery', 'command spoofing', 'configuration manipulation'],
    iec62443: ['SR 1.1', 'SR 2.1', 'SR 3.3'],
    nercCip: [],
  },
  profinet: {
    name: 'PROFINET',
    port: 34962,
    risk: 'high',
    commonVulns: ['real-time protocol attacks', 'device impersonation', 'configuration download'],
    iec62443: ['SR 1.1', 'SR 1.2', 'SR 2.1', 'SR 3.1'],
    nercCip: [],
  },
  opcua: {
    name: 'OPC UA',
    port: 4840,
    risk: 'medium',
    commonVulns: ['certificate spoofing', 'session hijacking', 'type confusion'],
    iec62443: ['SR 1.1', 'SR 1.2', 'SR 2.1'],
    nercCip: [],
  },
  s7comm: {
    name: 'S7comm (Siemens)',
    port: 102,
    risk: 'critical',
    commonVulns: ['unauthenticated read/write', 'PLC program manipulation', 'stop CPU'],
    iec62443: ['SR 1.1', 'SR 1.2', 'SR 2.1', 'SR 3.1', 'SR 4.1'],
    nercCip: ['CIP-005', 'CIP-007'],
  },
  cip: {
    name: 'CIP/EtherNet-IP',
    port: 44818,
    risk: 'high',
    commonVulns: ['unauthenticated access', 'identity spoofing', 'message spoofing'],
    iec62443: ['SR 1.1', 'SR 1.2', 'SR 2.1'],
    nercCip: ['CIP-005'],
  },
  ipp: {
    name: 'IEC 61850 (GOOSE/MMS)',
    port: 102,
    risk: 'critical',
    commonVulns: ['GOOSE spoofing', 'substation manipulation', 'SV injection'],
    iec62443: ['SR 1.1', 'SR 1.2', 'SR 2.1', 'SR 3.1', 'SR 4.1', 'SR 5.1'],
    nercCip: ['CIP-005', 'CIP-007', 'CIP-010'],
  },
  mqtt: {
    name: 'MQTT',
    port: 1883,
    risk: 'medium',
    commonVulns: ['unauthenticated broker', 'topic injection', 'payload manipulation'],
    iec62443: ['SR 1.1', 'SR 2.1'],
    nercCip: [],
  },
};

// ── APT Detection Heuristics Database ────────────────────────────────────────

export interface APTGroup {
  id: string;
  name: string;
  origin: string;
  targets: string[];
  techniques: string[];
  severity: 'critical' | 'high' | 'medium';
}

export const APT_GROUPS: APTGroup[] = [
  { id: 'APT28', name: 'Fancy Bear', origin: 'Russia', targets: ['energy', 'government', 'defense'], techniques: ['T1003', 'T1059', 'T1071', 'T1090'], severity: 'critical' },
  { id: 'APT29', name: 'Cozy Bear', origin: 'Russia', targets: ['energy', 'government', 'finance'], techniques: ['T1003', 'T1021', 'T1071', 'T1566'], severity: 'critical' },
  { id: 'APT33', name: 'Elfin', origin: 'Iran', targets: ['energy', 'defense'], techniques: ['T1003', 'T1059', 'T1547'], severity: 'critical' },
  { id: 'Lazarus', name: 'Lazarus Group', origin: 'DPRK', targets: ['finance', 'energy', 'defense'], techniques: ['T1003', 'T1059', 'T1071', 'T1486'], severity: 'critical' },
  { id: 'Sandworm', name: 'Sandworm', origin: 'Russia', targets: ['energy', 'government', 'telecom'], techniques: ['T1003', 'T1486', 'T1059', 'T1489'], severity: 'critical' },
  { id: 'Volt Typhoon', name: 'Volt Typhoon', origin: 'China', targets: ['energy', 'telecom', 'defense'], techniques: ['T1003', 'T1059', 'T1071', 'T1090'], severity: 'critical' },
  { id: 'APT41', name: 'Double Dragon', origin: 'China', targets: ['energy', 'healthcare', 'government'], techniques: ['T1003', 'T1053', 'T1071', 'T1566'], severity: 'high' },
  { id: 'TurkishStorm', name: 'TurkishStorm', origin: 'Turkey', targets: ['energy', 'government'], techniques: ['T1003', 'T1059', 'T1071'], severity: 'high' },
];

// ── MITRE ATT&CK Techniques for OT/ICS ──────────────────────────────────────

interface MITRETechnique {
  id: string;
  name: string;
  tactic: string;
  industryRelevance: string[];
  otSpecific: boolean;
}

const MITRE_ICS_TECHNIQUES: MITRETechnique[] = [
  { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access', industryRelevance: ['energy', 'defense', 'manufacturing'], otSpecific: false },
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution', industryRelevance: ['energy', 'defense', 'manufacturing', 'telecom'], otSpecific: false },
  { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control', industryRelevance: ['energy', 'defense', 'telecom', 'manufacturing'], otSpecific: false },
  { id: 'T1090', name: 'Proxy', tactic: 'Command and Control', industryRelevance: ['energy', 'defense', 'telecom'], otSpecific: false },
  { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement', industryRelevance: ['energy', 'defense', 'manufacturing'], otSpecific: false },
  { id: 'T1566', name: 'Phishing', tactic: 'Initial Access', industryRelevance: ['energy', 'defense', 'government', 'telecom', 'finance'], otSpecific: false },
  { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'Persistence', industryRelevance: ['energy', 'defense'], otSpecific: false },
  { id: 'T1053', name: 'Scheduled Task/Job', tactic: 'Execution', industryRelevance: ['energy', 'defense', 'manufacturing'], otSpecific: false },
  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', industryRelevance: ['energy', 'defense', 'manufacturing', 'telecom'], otSpecific: false },
  { id: 'T1489', name: 'Service Stop', tactic: 'Impact', industryRelevance: ['energy', 'manufacturing', 'transportation'], otSpecific: true },
  { id: 'T0831', name: 'Manipulation of Control', tactic: 'Inhibit Response Function', industryRelevance: ['energy', 'manufacturing', 'water', 'transportation'], otSpecific: true },
  { id: 'T0835', name: 'Loss of Protection', tactic: 'Inhibit Response Function', industryRelevance: ['energy', 'manufacturing', 'water'], otSpecific: true },
  { id: 'T0863', name: 'Modify Controller Tasking', tactic: 'Manipulation of Control', industryRelevance: ['energy', 'manufacturing', 'water', 'defense'], otSpecific: true },
  { id: 'T0856', name: 'Modify Controller Tasking (Programmatic)', tactic: 'Manipulation of Control', industryRelevance: ['energy', 'manufacturing', 'defense'], otSpecific: true },
  { id: 'T0866', name: 'Internet Accessible Device', tactic: 'Initial Access', industryRelevance: ['energy', 'manufacturing', 'water', 'telecom'], otSpecific: true },
  { id: 'T0868', name: 'Remote System Discovery', tactic: 'Discovery', industryRelevance: ['energy', 'manufacturing', 'defense', 'telecom'], otSpecific: true },
  { id: 'T0882', name: 'Manipulation of View', tactic: 'Inhibit Response Function', industryRelevance: ['energy', 'water', 'manufacturing'], otSpecific: true },
  { id: 'T0884', name: 'Denial of Service', tactic: 'Impact', industryRelevance: ['energy', 'telecom', 'transportation', 'defense'], otSpecific: true },
  { id: 'T0886', name: 'Triggered Execution', tactic: 'Execution', industryRelevance: ['energy', 'defense', 'manufacturing'], otSpecific: true },
  { id: 'T0809', name: 'Exploitation of Remote Services', tactic: 'Initial Access', industryRelevance: ['energy', 'manufacturing', 'water', 'defense'], otSpecific: true },
];

// ── NERC CIP Requirements ───────────────────────────────────────────────────

const NERC_CIP_REQUIREMENTS = [
  { code: 'CIP-002', name: 'BES Cyber System Categorization', description: 'Categorize BES Cyber Systems based on impact analysis' },
  { code: 'CIP-003', name: 'Security Management Controls', description: 'Documented cybersecurity policies and procedures' },
  { code: 'CIP-004', name: 'Personnel & Training', description: 'Personnel risk assessment and training' },
  { code: 'CIP-005', name: 'Electronic Security Perimeter(s)', description: 'Define and protect electronic security perimeters' },
  { code: 'CIP-006', name: 'Physical Security of BES Cyber Systems', description: 'Physical access controls for cyber assets' },
  { code: 'CIP-007', name: 'System Security Management', description: 'Patch management, malware protection, ports/services' },
  { code: 'CIP-008', name: 'Incident Response and Recovery Planning', description: 'IR plans for BES Cyber Systems' },
  { code: 'CIP-009', name: 'Recovery Planning', description: 'Recovery plans for BES Cyber Systems' },
  { code: 'CIP-010', name: 'Configuration Change Management', description: 'Baseline and manage configurations' },
  { code: 'CIP-011', name: 'Information Protection', description: 'Protect BES Cyber System Information' },
  { code: 'CIP-013', name: 'Supply Chain Risk Management', description: 'Vendor risk and supply chain security' },
  { code: 'CIP-014', name: 'Physical Security', description: 'Transmission station physical security' },
];

// ── IEC 62443 Zones ──────────────────────────────────────────────────────────

const IEC_ZONES = [
  { zone: 'Zone 0', name: 'Enterprise IT', description: 'Corporate business networks' },
  { zone: 'Zone 1', name: 'Enterprise DMZ', description: 'Demilitarized zone between IT and OT' },
  { zone: 'Zone 2', name: 'Industrial DMZ', description: 'Buffer zone for OT systems' },
  { zone: 'Zone 3', name: 'SCADA/DCS', description: 'Supervisory control and data acquisition' },
  { zone: 'Zone 3.5', name: 'Safety Systems', description: 'Safety instrumented systems' },
  { zone: 'Zone 4', name: 'Basic Process Control', description: 'PLCs, RTUs, and field devices' },
];

// ── Firmware CVE Simulation Database ─────────────────────────────────────────

const FIRMWARE_CVE_DB: Record<string, Array<{ cve: string; severity: string; description: string }>> = {
  'Siemens S7-1200': [
    { cve: 'CVE-2019-13945', severity: 'critical', description: 'Unauthenticated access via TPKT protocol' },
    { cve: 'CVE-2020-7584', severity: 'high', description: 'Denial of service via crafted S7comm packet' },
  { cve: 'CVE-2021-35993', severity: 'high', description: 'Memory corruption in web server' },
  ],
  'Siemens S7-1500': [
    { cve: 'CVE-2019-13945', severity: 'critical', description: 'Unauthenticated access via TPKT protocol' },
    { cve: 'CVE-2022-24281', severity: 'critical', description: 'Remote code execution in PLC runtime' },
  ],
  'Schneider Modicon M340': [
    { cve: 'CVE-2020-7549', severity: 'critical', description: 'Denial of service via Modbus TCP' },
    { cve: 'CVE-2020-7550', severity: 'high', description: 'Credential disclosure vulnerability' },
  ],
  'ABB RTU560': [
    { cve: 'CVE-2021-22285', severity: 'critical', description: 'Buffer overflow in DNP3 implementation' },
    { cve: 'CVE-2021-3349', severity: 'high', description: 'Authentication bypass' },
  ],
  'Rockwell ControlLogix': [
    { cve: 'CVE-2022-28208', severity: 'critical', description: 'Remote code execution via CIP protocol' },
    { cve: 'CVE-2021-38435', severity: 'high', description: 'Heap overflow in EtherNet/IP module' },
  ],
  'Generic PLC': [
    { cve: 'CVE-2023-31145', severity: 'high', description: 'Unauthenticated firmware manipulation' },
  ],
  'Generic RTU': [
    { cve: 'CVE-2023-34324', severity: 'medium', description: 'Default credentials in web management' },
  ],
  'Generic HMI': [
    { cve: 'CVE-2023-28123', severity: 'high', description: 'XSS in HMI web interface' },
    { cve: 'CVE-2023-28124', severity: 'medium', description: 'Weak authentication mechanism' },
  ],
};

// ── Types ────────────────────────────────────────────────────────────────────

export type NetworkSegment = 'scada' | 'plc' | 'hmi' | 'dcs' | 'enterprise' | 'dmz';
export type Industry = 'energy' | 'water' | 'transportation' | 'telecom' | 'defense' | 'manufacturing';

export interface DeviceInfo {
  type: string;
  vendor: string;
  firmware: string;
  ip: string;
}

export interface ScanFinding {
  severity: string;
  type: string;
  description: string;
}

export interface CNIAnalysisParams {
  networkSegment: NetworkSegment;
  industry: Industry;
  protocols: string[];
  devices?: DeviceInfo[];
  scanFindings?: ScanFinding[];
}

export interface ProtocolAnalysis {
  protocol: string;
  port: number | null;
  risk: string;
  vulnerabilities: string[];
  complianceGaps: string[];
  recommendations: string[];
}

export interface APTAssessment {
  activeThreats: APTGroup[];
  riskScore: number;
  targeting: string;
  recommendations: string[];
}

export interface NERCComplianceRequirement {
  code: string;
  name: string;
  status: 'pass' | 'partial' | 'fail';
  gaps: string[];
  evidence: string;
}

export interface NERCCompliance {
  score: number;
  requirements: NERCComplianceRequirement[];
}

export interface IECZone {
  zone: string;
  score: number;
  gaps: string[];
  recommendations: string[];
}

export interface IEC62443Compliance {
  score: number;
  zones: IECZone[];
}

export interface FirmwareDevice {
  device: string;
  firmware: string;
  knownCVEs: Array<{ cve: string; severity: string; description: string }>;
  riskLevel: string;
  recommendation: string;
}

export interface FirmwareAnalysis {
  devices: FirmwareDevice[];
}

export interface MITREMapping {
  techniques: Array<{
    id: string;
    name: string;
    tactic: string;
    detected: boolean;
    confidence: number;
  }>;
  coverageScore: number;
}

export interface NetworkTopologyNode {
  id: string;
  label: string;
  zone: string;
  type: 'network' | 'device' | 'gateway' | 'firewall';
  x: number;
  y: number;
  vulnerable: boolean;
  ip?: string;
}

export interface NetworkTopologyEdge {
  from: string;
  to: string;
  label: string;
  encrypted: boolean;
}

export interface CNIAnalysisResult {
  threatLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';
  overallScore: number;
  protocolAnalysis: ProtocolAnalysis[];
  aptAssessment: APTAssessment;
  nercCompliance: NERCCompliance;
  iec62443Compliance: IEC62443Compliance;
  networkSegmentation: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
  firmwareAnalysis: FirmwareAnalysis;
  mitreAttackMapping: MITREMapping;
  stixReport: string;
  iodefReport: string;
}

// ── Helper: MITRE Techniques for Industry ────────────────────────────────────

export function getMITRETechniquesForIndustry(industry: Industry): MITRETechnique[] {
  return MITRE_ICS_TECHNIQUES.filter(t => t.industryRelevance.includes(industry));
}

// ── Helper: APT Risk Assessment ──────────────────────────────────────────────

export function assessAPTRisk(industry: Industry, protocols: string[]): {
  activeThreats: APTGroup[];
  riskScore: number;
  targeting: string;
  recommendations: string[];
} {
  const activeThreats = APT_GROUPS.filter(g => g.targets.includes(industry));

  // Boost groups that target the specific protocols in use
  const protocolRiskBoost = protocols.length;
  const criticalProtocolCount = protocols.filter(p => {
    const proto = SCADA_PROTOCOLS[p];
    return proto && (proto.risk === 'critical' || proto.risk === 'high');
  }).length;

  const riskScore = Math.min(100,
    activeThreats.filter(t => t.severity === 'critical').length * 18 +
    activeThreats.filter(t => t.severity === 'high').length * 10 +
    criticalProtocolCount * 5 +
    protocolRiskBoost * 2
  );

  const targeting = activeThreats.length === 0
    ? 'No known APT groups specifically targeting this industry-protocol combination'
    : `${activeThreats.length} APT groups actively target the ${industry} sector, ${activeThreats.filter(t => t.severity === 'critical').length} with critical severity`;

  const recommendations: string[] = [];
  if (activeThreats.length > 0) {
    recommendations.push('Implement network segmentation with unidirectional gateways between IT and OT zones');
    recommendations.push('Deploy OT-specific intrusion detection systems (IDS) at all zone boundaries');
    recommendations.push('Enable deep packet inspection for all SCADA/ICS protocols in use');
  }
  if (criticalProtocolCount > 0) {
    recommendations.push(`Mitigate ${criticalProtocolCount} critical-risk protocol(s) with protocol-aware firewalls and encryption`);
  }
  if (activeThreats.some(t => t.origin === 'Russia')) {
    recommendations.push('Heighten monitoring for TTPs associated with Russian APT groups (Sandworm, APT28, APT29)');
  }
  if (activeThreats.some(t => t.origin === 'China')) {
    recommendations.push('Monitor for living-off-the-land techniques consistent with Volt Typhoon / APT41');
  }
  if (activeThreats.some(t => t.origin === 'Iran')) {
    recommendations.push('Watch for APT33 wiper malware signatures and credential harvesting activity');
  }
  if (activeThreats.some(t => t.origin === 'DPRK')) {
    recommendations.push('Block indicators of compromise associated with Lazarus Group infrastructure');
  }
  recommendations.push('Establish threat intelligence sharing with sector-specific ISACs');

  return { activeThreats, riskScore, targeting, recommendations };
}

// ── Helper: Generate Network Diagram ─────────────────────────────────────────

export function generateNetworkDiagram(devices?: DeviceInfo[]): {
  nodes: NetworkTopologyNode[];
  edges: NetworkTopologyEdge[];
} {
  const nodes: NetworkTopologyNode[] = [
    { id: 'internet', label: 'INTERNET', zone: 'external', type: 'network', x: 400, y: 30, vulnerable: false },
    { id: 'fw1', label: 'FW-EXT', zone: 'dmz', type: 'firewall', x: 400, y: 90, vulnerable: false },
    { id: 'enterprise', label: 'ENTERPRISE IT', zone: 'enterprise', type: 'network', x: 200, y: 170, vulnerable: false },
    { id: 'dmz', label: 'INDUSTRIAL DMZ', zone: 'dmz', type: 'network', x: 400, y: 170, vulnerable: false },
    { id: 'historian', label: 'Historian Server', zone: 'dmz', type: 'device', x: 400, y: 240, vulnerable: false },
    { id: 'fw2', label: 'FW-OT', zone: 'scada', type: 'firewall', x: 400, y: 310, vulnerable: false },
    { id: 'scada', label: 'SCADA ZONE', zone: 'scada', type: 'network', x: 300, y: 380, vulnerable: false },
    { id: 'hmi1', label: 'HMI-01', zone: 'scada', type: 'device', x: 180, y: 430, vulnerable: false },
    { id: 'eng_ws', label: 'Eng Workstation', zone: 'scada', type: 'device', x: 420, y: 430, vulnerable: false },
    { id: 'fw3', label: 'FW-FIELD', zone: 'plc', type: 'firewall', x: 300, y: 490, vulnerable: false },
    { id: 'plc_zone', label: 'PLC ZONE', zone: 'plc', type: 'network', x: 200, y: 550, vulnerable: false },
    { id: 'plc1', label: 'PLC-01', zone: 'plc', type: 'device', x: 100, y: 610, vulnerable: true },
    { id: 'plc2', label: 'PLC-02', zone: 'plc', type: 'device', x: 250, y: 610, vulnerable: false },
    { id: 'rtu1', label: 'RTU-01', zone: 'plc', type: 'device', x: 370, y: 610, vulnerable: true },
    { id: 'field', label: 'FIELD DEVICES', zone: 'field', type: 'network', x: 480, y: 580, vulnerable: false },
    { id: 'sensor1', label: 'Sensor Array', zone: 'field', type: 'device', x: 530, y: 630, vulnerable: false },
    { id: 'actuator1', label: 'Actuator', zone: 'field', type: 'device', x: 630, y: 630, vulnerable: true },
  ];

  // Mark devices as vulnerable if firmware has known CVEs
  if (devices && devices.length > 0) {
    for (const device of devices) {
      const deviceKey = `${device.vendor} ${device.type}`;
      const cves = FIRMWARE_CVE_DB[deviceKey] || FIRMWARE_CVE_DB[`Generic ${device.type}`];
      if (cves && cves.some(c => c.severity === 'critical' || c.severity === 'high')) {
        // Find matching node or mark closest match
        const matchNode = nodes.find(n =>
          n.type === 'device' && (
            n.label.toLowerCase().includes(device.type.toLowerCase()) ||
            n.label.toLowerCase().includes(device.vendor.toLowerCase())
          )
        );
        if (matchNode) matchNode.vulnerable = true;
      }
    }
  }

  const edges: NetworkTopologyEdge[] = [
    { from: 'internet', to: 'fw1', label: 'HTTPS/WAN', encrypted: true },
    { from: 'fw1', to: 'enterprise', label: 'VLAN 10', encrypted: true },
    { from: 'fw1', to: 'dmz', label: 'VLAN 20', encrypted: false },
    { from: 'enterprise', to: 'dmz', label: 'Jump Host', encrypted: true },
    { from: 'dmz', to: 'historian', label: 'OPC UA', encrypted: false },
    { from: 'dmz', to: 'fw2', label: 'VLAN 30', encrypted: false },
    { from: 'fw2', to: 'scada', label: 'VLAN 30', encrypted: false },
    { from: 'scada', to: 'hmi1', label: 'Modbus TCP', encrypted: false },
    { from: 'scada', to: 'eng_ws', label: 'RDP', encrypted: true },
    { from: 'scada', to: 'fw3', label: 'VLAN 40', encrypted: false },
    { from: 'fw3', to: 'plc_zone', label: 'PROFINET', encrypted: false },
    { from: 'plc_zone', to: 'plc1', label: 'S7comm', encrypted: false },
    { from: 'plc_zone', to: 'plc2', label: 'Modbus RTU', encrypted: false },
    { from: 'plc_zone', to: 'rtu1', label: 'DNP3', encrypted: false },
    { from: 'plc_zone', to: 'field', label: '4-20mA/HART', encrypted: false },
    { from: 'field', to: 'sensor1', label: 'Analog', encrypted: false },
    { from: 'field', to: 'actuator1', label: 'Analog', encrypted: false },
  ];

  return { nodes, edges };
}

// ── Helper: Generate STIX 2.1 Report ─────────────────────────────────────────

export function generateSTIXReport(results: CNIAnalysisResult): string {
  const now = new Date().toISOString();
  const reportId = `report--${crypto.randomUUID?.() || `${Date.now()}-cni-sentinel`}`;

  const indicators = results.protocolAnalysis.flatMap((p, i) =>
    p.vulnerabilities.map((v, j) => ({
      type: 'indicator',
      spec_version: '2.1',
      id: `indicator--${Date.now()}-p${i}-v${j}`,
      created: now,
      modified: now,
      name: `${p.protocol}: ${v}`,
      pattern: `[network-traffic:dst_port = ${p.port}]`,
      pattern_type: 'stix',
      valid_from: now,
      labels: ['vulnerability', 'ot-protocol', p.risk],
    }))
  );

  const relationships = results.aptAssessment.activeThreats.map((apt, i) => ({
    type: 'relationship',
    spec_version: '2.1',
    id: `relationship--apt-${i}-${Date.now()}`,
    created: now,
    modified: now,
    relationship_type: 'targets',
    source_ref: `threat-actor--${apt.id.toLowerCase().replace(/\s/g, '-')}`,
    target_ref: reportId,
    description: `${apt.name} (${apt.origin}) targets this ${results.threatLevel} risk CNI infrastructure`,
  }));

  const report = {
    type: 'bundle',
    id: `bundle--${crypto.randomUUID?.() || `${Date.now()}-bundle`}`,
    objects: [
      {
        type: 'report',
        spec_version: '2.1',
        id: reportId,
        created: now,
        modified: now,
        name: `CNI Threat Sentinel Assessment — ${results.threatLevel}`,
        description: `Comprehensive OT/ICS threat analysis. Overall score: ${results.overallScore}/100. Threat level: ${results.threatLevel}.`,
        published: now,
        object_refs: [
          ...indicators.map(i => i.id),
          ...relationships.map(r => r.id),
        ],
        labels: ['threat-assessment', 'cni', 'ot-security', 'scada'],
      },
      ...indicators,
      ...relationships,
    ],
  };

  return JSON.stringify(report, null, 2);
}

// ── Helper: Generate IODEF XML Report ────────────────────────────────────────

export function generateIODEFReport(results: CNIAnalysisResult): string {
  const now = new Date().toISOString();
  const evalResult = results.threatLevel === 'CRITICAL' ? 'critical'
    : results.threatLevel === 'HIGH' ? 'high'
    : results.threatLevel === 'ELEVATED' ? 'medium'
    : 'low';

  const assessmentNodes = results.aptAssessment.activeThreats.map(apt => `
        <iodef:Assessment>
          <iodef:Impact>
            <iodef:Attribute>APT Activity</iodef:Attribute>
            <iodef:Description>${apt.name} (${apt.origin}) — ${apt.techniques.join(', ')}</iodef:Description>
          </iodef:Impact>
        </iodef:Assessment>`).join('');

  const protocolNodes = results.protocolAnalysis.map(p => `
        <iodef:Node>
          <iodef:NodeRole>Protocol Vulnerability</iodef:NodeRole>
          <iodef:Address category="port">
            <iodef:AddressValue>${p.port || 'N/A'}</iodef:AddressValue>
          </iodef:Address>
          <iodef:Service>
            <iodef:Port>${p.port || 'N/A'}</iodef:Port>
            <iodef:Protocol>${p.protocol}</iodef:Protocol>
          </iodef:Service>
        </iodef:Node>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<iodef:Incident xmlns:iodef="urn:ietf:params:xml:ns:iodef-1.0"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="urn:ietf:params:xml:ns:iodef-1.0 iodef_1.0.xsd">
  <iodef:IncidentID>${Date.now()}</iodef:IncidentID>
  <iodef:Time>
    <iodef:InitialIncidentTime>${now}</iodef:InitialIncidentTime>
  </iodef:Time>
  <iodef:Assessment>
    <iodef:Occurrence>${results.overallScore > 75 ? 'high' : results.overallScore > 50 ? 'medium' : 'low'}</iodef:Occurrence>
    <iodef:Impact severity="${evalResult}">
      <iodef:Description>CNI Threat Level: ${results.threatLevel} (Score: ${results.overallScore}/100)</iodef:Description>
    </iodef:Impact>
  </iodef:Assessment>
  <iodef:Contact>
    <iodef:ContactName>ReconPro CNI Threat Sentinel</iodef:ContactName>
    <iodef:Email>sentinel@reconpro.local</iodef:Email>
  </iodef:Contact>
  <iodef:EventData>
    <iodef:Description>CNI/OT Infrastructure Threat Assessment Report</iodef:Description>
    <iodef:Flow>
      <iodef:System category="source">
        ${assessmentNodes}
        <iodef:Node>
          <iodef:NodeRole>Target Infrastructure</iodef:NodeRole>
        </iodef:Node>
      </iodef:System>
      <iodef:System category="target">
        <iodef:Node>
          <iodef:NodeRole>SCADA/ICS Network</iodef:NodeRole>
        </iodef:Node>
        ${protocolNodes}
      </iodef:System>
    </iodef:Flow>
    <iodef:Expectation action="monitor">
      <iodef:Description>${results.aptAssessment.recommendations.slice(0, 3).join('. ')}</iodef:Description>
    </iodef:Expectation>
  </iodef:EventData>
  <iodef:History>
    <iodef:HistoryItem action="status-change">
      <iodef:DateTime>${now}</iodef:DateTime>
      <iodef:Description>Automated CNI threat assessment completed by ReconPro Sentinel Engine</iodef:Description>
    </iodef:HistoryItem>
  </iodef:History>
  <iodef:AdditionalData>
    <iodef:meaning>NERC CIP Score</iodef:meaning>
    <iodef:Data>${results.nercCompliance.score}</iodef:Data>
  </iodef:AdditionalData>
  <iodef:AdditionalData>
    <iodef:meaning>IEC 62443 Score</iodef:meaning>
    <iodef:Data>${results.iec62443Compliance.score}</iodef:Data>
  </iodef:AdditionalData>
</iodef:Incident>`;
}

// ── Protocol Analysis ────────────────────────────────────────────────────────

function analyzeProtocols(protocols: string[], networkSegment: NetworkSegment, industry: Industry): ProtocolAnalysis[] {
  return protocols.map(key => {
    const proto = SCADA_PROTOCOLS[key];
    if (!proto) return null;

    const vulnerabilities: string[] = [...proto.commonVulns];
    const complianceGaps: string[] = [];
    const recommendations: string[] = [];

    // Segment-specific risk amplification
    if (networkSegment === 'enterprise') {
      complianceGaps.push(`OT protocol ${proto.name} detected in enterprise zone — violates network segmentation policy`);
      vulnerabilities.push('cross-zone protocol exposure');
      recommendations.push('Immediately isolate OT protocols to designated industrial zones');
    }
    if (networkSegment === 'dmz' && proto.risk === 'critical') {
      complianceGaps.push(`Critical-risk protocol ${proto.name} traversing DMZ without encryption`);
      recommendations.push('Deploy protocol-aware gateway with deep packet inspection in DMZ');
    }

    // Industry-specific vulnerabilities
    if (industry === 'energy' && (key === 'dnp3' || key === 'ipp')) {
      vulnerabilities.push('NERC CIP-regulated protocol without end-to-end security');
      complianceGaps.push('CIP-007: Inadequate port and service security');
    }
    if (industry === 'energy') {
      proto.nercCip.forEach(c => {
        complianceGaps.push(`${c}: Verification required for ${proto.name} deployment`);
      });
    }

    // Generic hardening recommendations
    if (proto.risk === 'critical') {
      recommendations.push(`Implement protocol-specific IDS signatures for ${proto.name}`);
      recommendations.push(`Deploy unidirectional gateway for ${proto.name} traffic`);
      if (proto.port) recommendations.push(`Restrict ${proto.name} access to port ${proto.port} via ACLs`);
    }
    if (proto.port && proto.risk !== 'medium') {
      recommendations.push(`Monitor all traffic on port ${proto.port} for anomalous patterns`);
    }
    if (!recommendations.some(r => r.includes('encryption')) && proto.commonVulns.some(v => v.includes('no encryption') || v.includes('unauthenticated'))) {
      recommendations.push(`Implement encryption and mutual authentication for ${proto.name} communications`);
    }

    return {
      protocol: proto.name,
      port: proto.port,
      risk: proto.risk,
      vulnerabilities: Array.from(new Set(vulnerabilities)),
      complianceGaps: Array.from(new Set(complianceGaps)),
      recommendations: Array.from(new Set(recommendations)),
    };
  }).filter(Boolean) as ProtocolAnalysis[];
}

// ── NERC CIP Compliance Assessment ───────────────────────────────────────────

function assessNERCCompliance(
  industry: Industry,
  protocols: string[],
  networkSegment: NetworkSegment,
  devices?: DeviceInfo[],
  scanFindings?: ScanFinding[]
): NERCCompliance {
  if (industry !== 'energy') {
    return { score: 0, requirements: [] };
  }

  let totalScore = 0;
  const criticalProtocols = protocols.filter(p => SCADA_PROTOCOLS[p]?.risk === 'critical').length;
  const highProtocols = protocols.filter(p => SCADA_PROTOCOLS[p]?.risk === 'high').length;

  const requirements = NERC_CIP_REQUIREMENTS.map(req => {
    let status: 'pass' | 'partial' | 'fail' = 'pass';
    const gaps: string[] = [];
    let evidence = 'No issues detected';

    switch (req.code) {
      case 'CIP-005':
        if (networkSegment === 'enterprise') {
          status = 'fail';
          gaps.push('OT protocols detected in enterprise zone — ESP not properly defined');
          evidence = 'OT protocol traffic found outside ESP';
        } else if (protocols.length > 3) {
          status = 'partial';
          gaps.push('Multiple OT protocols increase ESP attack surface');
          evidence = `${protocols.length} protocols require ESP enforcement`;
        }
        if (criticalProtocols > 0) {
          status = status === 'pass' ? 'partial' : 'fail';
          gaps.push(`${criticalProtocols} critical-risk protocol(s) require enhanced ESP controls`);
        }
        break;
      case 'CIP-007':
        if (devices && devices.some(d => {
          const key = `${d.vendor} ${d.type}`;
          return (FIRMWARE_CVE_DB[key] || FIRMWARE_CVE_DB[`Generic ${d.type}`])?.some(c => c.severity === 'critical');
        })) {
          status = 'fail';
          gaps.push('Devices with critical CVEs detected — patch management insufficient');
          evidence = 'Critical vulnerabilities in deployed firmware';
        }
        if (scanFindings && scanFindings.some(f => f.severity === 'critical')) {
          status = status === 'pass' ? 'partial' : 'fail';
          gaps.push('Critical findings from security scans indicate inadequate security management');
        }
        if (highProtocols > 2) {
          status = status === 'pass' ? 'partial' : status;
          gaps.push('Multiple high-risk ports/services require monitoring');
        }
        break;
      case 'CIP-010':
        if (devices && devices.length > 0) {
          status = 'partial';
          gaps.push('Configuration baselines should be established for all ' + devices.length + ' device(s)');
          evidence = `${devices.length} devices require configuration management`;
        }
        break;
      case 'CIP-002':
        status = 'pass';
        evidence = 'BES Cyber System categorization assumed complete';
        if (criticalProtocols > 0) {
          status = 'partial';
          gaps.push('High Impact BCS systems require re-categorization review');
        }
        break;
      case 'CIP-003':
        status = 'partial';
        gaps.push('Automated verification of policy compliance recommended');
        evidence = 'Policy compliance requires manual audit verification';
        break;
      case 'CIP-004':
        status = 'partial';
        gaps.push('OT-specific security training completion status unknown');
        evidence = 'Training records require verification';
        break;
      case 'CIP-008':
        status = 'pass';
        evidence = 'Incident response plan assumed in place';
        if (criticalProtocols > 0) {
          status = 'partial';
          gaps.push('IR plan should include OT-specific playbooks for critical protocols');
        }
        break;
      case 'CIP-009':
        status = 'partial';
        gaps.push('Recovery plan testing for OT systems not verified');
        evidence = 'Recovery plan requires OT-specific validation';
        break;
      case 'CIP-011':
        if (networkSegment === 'enterprise' || networkSegment === 'dmz') {
          status = 'partial';
          gaps.push('BES Cyber System Information may be accessible outside protected zones');
        }
        break;
      case 'CIP-013':
        status = 'partial';
        gaps.push('Supply chain risk assessment for OT vendors recommended');
        if (devices) {
          const vendors = Array.from(new Set(devices.map(d => d.vendor)));
          gaps.push(`Vendor risk assessment needed for: ${vendors.join(', ')}`);
        }
        break;
      case 'CIP-006':
        status = 'partial';
        gaps.push('Physical security verification for cyber assets not confirmed');
        evidence = 'Physical access controls require on-site audit';
        break;
      case 'CIP-014':
        status = 'partial';
        gaps.push('Transmission station physical security needs verification');
        evidence = 'Physical security assessment pending';
        break;
    }

    const score = status === 'pass' ? 100 : status === 'partial' ? 60 : 20;
    totalScore += score;
    return { code: req.code, name: req.name, status, gaps, evidence };
  });

  return {
    score: Math.round(totalScore / NERC_CIP_REQUIREMENTS.length),
    requirements,
  };
}

// ── IEC 62443 Compliance Assessment ──────────────────────────────────────────

function assessIEC62443(
  protocols: string[],
  networkSegment: NetworkSegment,
  devices?: DeviceInfo[],
  scanFindings?: ScanFinding[]
): IEC62443Compliance {
  const zones = IEC_ZONES.map(zone => {
    let score = 100;
    const gaps: string[] = [];
    const recommendations: string[] = [];

    // Collect all IEC 62443 requirements referenced by active protocols
    const requiredSRs = new Set<string>();
    protocols.forEach(key => {
      const proto = SCADA_PROTOCOLS[key];
      if (proto) proto.iec62443.forEach(sr => requiredSRs.add(sr));
    });

    // Zone-specific assessments
    if (zone.zone === 'Zone 0' && networkSegment === 'enterprise') {
      score -= 15;
      gaps.push('Enterprise zone directly adjacent to OT — SR 2.1 (Human User Identification) enforcement needed');
      recommendations.push('Enforce strong authentication at enterprise-OT boundary');
    }
    if (zone.zone === 'Zone 1' || zone.zone === 'Zone 2') {
      score -= 10;
      gaps.push('DMZ zones require enhanced monitoring and logging (SR 6.1, SR 6.2)');
      recommendations.push('Deploy SIEM integration for all DMZ traffic');
    }
    if (zone.zone === 'Zone 3') {
      if (protocols.some(p => SCADA_PROTOCOLS[p]?.risk === 'critical')) {
        score -= 25;
        gaps.push('Critical-risk protocols in SCADA zone without additional hardening');
        recommendations.push('Implement application whitelisting on all SCADA servers');
      }
      if (devices && devices.some(d => d.type.toLowerCase() === 'hmi')) {
        score -= 10;
        gaps.push('HMI devices require hardening — SR 4.1 (Information Integrity)');
        recommendations.push('Apply HMI security baselines and disable unnecessary services');
      }
    }
    if (zone.zone === 'Zone 4') {
      if (protocols.some(p => ['s7comm', 'modbus_tcp', 'modbus_rtu', 'dnp3'].includes(p))) {
        score -= 20;
        gaps.push('Legacy PLC communication protocols lack authentication — SR 1.1, SR 1.2');
        recommendations.push('Deploy PLC-specific IDS/IPS with protocol deep inspection');
      }
      if (devices && devices.some(d => d.type.toLowerCase().includes('plc'))) {
        const plcDevs = devices.filter(d => d.type.toLowerCase().includes('plc'));
        plcDevs.forEach(d => {
          const key = `${d.vendor} ${d.type}`;
          const cves = FIRMWARE_CVE_DB[key] || FIRMWARE_CVE_DB[`Generic ${d.type}`];
          if (cves) {
            score -= cves.filter(c => c.severity === 'critical').length * 10;
            gaps.push(`${d.vendor} ${d.type} at ${d.ip}: ${cves.length} known CVE(s)`);
          }
        });
        recommendations.push('Establish firmware update program for all PLC devices');
      }
    }
    if (zone.zone === 'Zone 3.5') {
      score -= 15;
      gaps.push('Safety system zone requires independent verification — SR 3.3, SR 4.1');
      recommendations.push('Isolate safety systems with hardware-enforced separation');
    }

    // Scan findings impact
    if (scanFindings && scanFindings.length > 0) {
      const criticalFindings = scanFindings.filter(f => f.severity === 'critical').length;
      score -= criticalFindings * 5;
      if (criticalFindings > 0) {
        gaps.push(`${criticalFindings} critical scan findings impact zone security posture`);
      }
    }

    score = Math.max(0, Math.min(100, score));
    return { zone: zone.zone, score, gaps, recommendations };
  });

  const score = Math.round(zones.reduce((s, z) => s + z.score, 0) / zones.length);
  return { score, zones };
}

// ── Network Segmentation Assessment ──────────────────────────────────────────

function assessNetworkSegmentation(
  networkSegment: NetworkSegment,
  protocols: string[],
  devices?: DeviceInfo[]
): { score: number; issues: string[]; recommendations: string[] } {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check for OT protocols in wrong zones
  const otProtocols = protocols.filter(p => SCADA_PROTOCOLS[p]?.risk !== 'medium');
  if (networkSegment === 'enterprise' && otProtocols.length > 0) {
    score -= 35;
    issues.push(`CRITICAL: ${otProtocols.length} OT protocol(s) detected in enterprise zone — flat network architecture detected`);
    recommendations.push('Implement Purdue Model-compliant network architecture with strict zone separation');
    recommendations.push('Deploy industrial DMZ (iDMZ) between enterprise and SCADA zones');
  }
  if (networkSegment === 'dmz') {
    score -= 10;
    issues.push('Protocols traversing DMZ require proxy-based inspection');
    recommendations.push('Deploy protocol-aware proxy/gateway in DMZ for all OT traffic');
  }

  // Check for unencrypted protocols
  const unencryptedProtos = protocols.filter(p => {
    const proto = SCADA_PROTOCOLS[p];
    return proto && (proto.name.includes('Modbus') || proto.name.includes('DNP3') || proto.name.includes('S7comm') || proto.name.includes('PROFINET') || proto.name.includes('CIP'));
  });
  if (unencryptedProtos.length > 0) {
    score -= unencryptedProtos.length * 5;
    issues.push(`${unencryptedProtos.length} protocol(s) lack native encryption: ${unencryptedProtos.map(p => SCADA_PROTOCOLS[p]?.name).join(', ')}`);
    recommendations.push('Wrap legacy protocols in IPsec tunnels between zones');
  }

  // Device placement issues
  if (devices) {
    const directInternetDevices = devices.filter(d => d.ip && !d.ip.startsWith('10.') && !d.ip.startsWith('172.') && !d.ip.startsWith('192.168.'));
    if (directInternetDevices.length > 0) {
      score -= 30;
      issues.push(`CRITICAL: ${directInternetDevices.length} device(s) have public IP addresses: ${directInternetDevices.map(d => d.ip).join(', ')}`);
      recommendations.push('Immediately move all OT devices to private address space behind firewalls');
    }
  }

  // Critical protocol amplification
  if (protocols.includes('s7comm') && protocols.includes('modbus_tcp')) {
    score -= 10;
    issues.push('Multiple PLC vendor protocols coexist — segmentation must enforce vendor isolation');
    recommendations.push('Segment PLC networks by vendor with separate VLANs and firewall policies');
  }

  score = Math.max(0, Math.min(100, score));
  return { score, issues, recommendations };
}

// ── Firmware Analysis ────────────────────────────────────────────────────────

function analyzeFirmware(devices?: DeviceInfo[]): FirmwareAnalysis {
  if (!devices || devices.length === 0) {
    return { devices: [] };
  }

  const analyzedDevices = devices.map(device => {
    const key = `${device.vendor} ${device.type}`;
    const cves = FIRMWARE_CVE_DB[key] || FIRMWARE_CVE_DB[`Generic ${device.type}`] || [];
    const hasCritical = cves.some(c => c.severity === 'critical');
    const hasHigh = cves.some(c => c.severity === 'high');
    const riskLevel = hasCritical ? 'critical' : hasHigh ? 'high' : cves.length > 0 ? 'medium' : 'low';

    let recommendation = 'Device firmware appears current — maintain regular update cadence';
    if (hasCritical) {
      recommendation = `URGENT: Apply critical security patches. ${cves.filter(c => c.severity === 'critical').length} critical CVE(s) detected. Consider network isolation until patched.`;
    } else if (hasHigh) {
      recommendation = `Schedule firmware update within 30 days. ${cves.filter(c => c.severity === 'high').length} high-severity CVE(s) present.`;
    } else if (cves.length > 0) {
      recommendation = 'Plan firmware update during next maintenance window.';
    }

    return {
      device: `${device.vendor} ${device.type} (${device.ip})`,
      firmware: device.firmware,
      knownCVEs: cves,
      riskLevel,
      recommendation,
    };
  });

  return { devices: analyzedDevices };
}

// ── MITRE ATT&CK Mapping ─────────────────────────────────────────────────────

function mapMITREAttack(
  industry: Industry,
  protocols: string[],
  aptAssessment: { activeThreats: APTGroup[] },
  scanFindings?: ScanFinding[]
): MITREMapping {
  const relevantTechniques = getMITRETechniquesForIndustry(industry);

  // Collect all techniques from active APT groups
  const aptTechniqueIds = new Set<string>();
  aptAssessment.activeThreats.forEach(apt => {
    apt.techniques.forEach(t => aptTechniqueIds.add(t));
  });

  const techniques = relevantTechniques.map(technique => {
    const detected = aptTechniqueIds.has(technique.id);
    let confidence = 0;

    if (detected) {
      confidence = 70 + (technique.otSpecific ? 20 : 10);
      // Boost confidence if scan findings correlate
      if (scanFindings && scanFindings.length > 0) {
        const correlatedFindings = scanFindings.filter(f => {
          if (technique.tactic === 'Initial Access' && f.type?.includes('phish')) return true;
          if (technique.tactic === 'Impact' && f.severity === 'critical') return true;
          if (technique.tactic === 'Credential Access' && f.type?.includes('credential')) return true;
          return false;
        });
        confidence = Math.min(99, confidence + correlatedFindings.length * 5);
      }
    } else if (technique.otSpecific && protocols.length > 0) {
      confidence = 30; // OT-specific techniques are relevant even if not directly detected
    }

    return {
      id: technique.id,
      name: technique.name,
      tactic: technique.tactic,
      detected,
      confidence,
    };
  });

  const detectedCount = techniques.filter(t => t.detected).length;
  const coverageScore = Math.round((detectedCount / Math.max(techniques.length, 1)) * 100);

  return { techniques, coverageScore };
}

// ── Main Analysis Function ───────────────────────────────────────────────────

export function analyzeCNIThreats(params: CNIAnalysisParams): CNIAnalysisResult {
  const { networkSegment, industry, protocols, devices, scanFindings } = params;

  // 1. Protocol analysis
  const protocolAnalysis = analyzeProtocols(protocols, networkSegment, industry);

  // 2. APT risk assessment
  const aptAssessment = assessAPTRisk(industry, protocols);

  // 3. NERC CIP compliance
  const nercCompliance = assessNERCCompliance(industry, protocols, networkSegment, devices, scanFindings);

  // 4. IEC 62443 compliance
  const iec62443Compliance = assessIEC62443(protocols, networkSegment, devices, scanFindings);

  // 5. Network segmentation
  const networkSegmentation = assessNetworkSegmentation(networkSegment, protocols, devices);

  // 6. Firmware analysis
  const firmwareAnalysis = analyzeFirmware(devices);

  // 7. MITRE ATT&CK mapping
  const mitreAttackMapping = mapMITREAttack(industry, protocols, aptAssessment, scanFindings);

  // ── Calculate overall threat level and score ──
  let overallScore = 0;

  // Protocol risk contribution (0-30)
  const criticalProtoCount = protocolAnalysis.filter(p => p.risk === 'critical').length;
  const highProtoCount = protocolAnalysis.filter(p => p.risk === 'high').length;
  overallScore += Math.min(30, criticalProtoCount * 10 + highProtoCount * 5);

  // APT risk contribution (0-25)
  overallScore += Math.min(25, Math.round(aptAssessment.riskScore * 0.25));

  // Compliance deficit (0-25)
  const nercDeficit = industry === 'energy' ? (100 - nercCompliance.score) * 0.15 : 0;
  const iecDeficit = (100 - iec62443Compliance.score) * 0.1;
  overallScore += Math.min(25, Math.round(nercDeficit + iecDeficit));

  // Network segmentation deficit (0-10)
  overallScore += Math.min(10, Math.round((100 - networkSegmentation.score) * 0.1));

  // Firmware risk contribution (0-10)
  if (firmwareAnalysis.devices.length > 0) {
    const critFirmware = firmwareAnalysis.devices.filter(d => d.riskLevel === 'critical').length;
    const highFirmware = firmwareAnalysis.devices.filter(d => d.riskLevel === 'high').length;
    overallScore += Math.min(10, critFirmware * 5 + highFirmware * 2);
  }

  // Scan findings boost
  if (scanFindings) {
    const critFindings = scanFindings.filter(f => f.severity === 'critical').length;
    overallScore += Math.min(10, critFindings * 5);
  }

  overallScore = Math.min(100, Math.max(0, overallScore));

  const threatLevel: CNIAnalysisResult['threatLevel'] =
    overallScore >= 80 ? 'CRITICAL' :
    overallScore >= 60 ? 'HIGH' :
    overallScore >= 40 ? 'ELEVATED' :
    overallScore >= 20 ? 'MODERATE' :
    'LOW';

  // Build full result
  const results: CNIAnalysisResult = {
    threatLevel,
    overallScore,
    protocolAnalysis,
    aptAssessment,
    nercCompliance,
    iec62443Compliance,
    networkSegmentation,
    firmwareAnalysis,
    mitreAttackMapping,
    stixReport: '',
    iodefReport: '',
  };

  // Generate reports
  results.stixReport = generateSTIXReport(results);
  results.iodefReport = generateIODEFReport(results);

  return results;
}
