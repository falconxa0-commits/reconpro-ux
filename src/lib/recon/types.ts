// ─── Reconnaissance Result Types ────────────────────────────────────
// These types represent REAL findings from actual network operations.

export interface DNSResult {
  type: 'dns';
  success: boolean;
  domain: string;
  records: DNSRecord[];
  duration: number;
}

export interface DNSRecord {
  type: string;       // A, AAAA, MX, NS, TXT, CNAME, SOA
  name: string;
  value: string;
  ttl?: number;
}

export interface HTTPResult {
  type: 'http';
  success: boolean;
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  securityHeaders: SecurityHeaderAnalysis[];
  technologies: TechnologyMatch[];
  title?: string;
  redirectUrl?: string;
  duration: number;
}

export interface SecurityHeaderAnalysis {
  name: string;
  present: boolean;
  value?: string;
  status: 'good' | 'warning' | 'missing' | 'misconfigured';
  finding: string;
  severity: string;
}

export interface TechnologyMatch {
  name: string;
  category: string;
  evidence: string;
  confidence: number; // 0-1
}

export interface SSLResult {
  type: 'ssl';
  success: boolean;
  domain: string;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  protocol: string;
  cipher: string;
  serialNumber: string;
  sans: string[];
  chainLength: number;
  issues: SSLIssue[];
  duration: number;
}

export interface SSLIssue {
  finding: string;
  severity: string;
  detail: string;
}

export interface CTLogResult {
  type: 'ct';
  success: boolean;
  domain: string;
  subdomains: string[];
  totalCertificates: number;
  duration: number;
}

export interface PortResult {
  type: 'port';
  success: boolean;
  domain: string;
  ports: PortScanResult[];
  duration: number;
}

export interface PortScanResult {
  port: number;
  state: 'open' | 'closed' | 'filtered' | 'timeout';
  service?: string;
  banner?: string;
  responseTime: number;
}

// Unified finding output (what gets saved to DB and shown in UI)
export interface ReconFinding {
  title: string;
  severity: string;     // critical, high, medium, low, info
  category: string;     // dns, subdomain, port, technology, ssl, header, vulnerability
  description: string;
  evidence: string | null;
  asset: string;
  source: string;       // 'dns', 'http', 'ssl', 'ct', 'port', 'simulated'
}