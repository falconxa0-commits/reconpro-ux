import { NextResponse } from 'next/server';

const THREAT_TEMPLATES = [
  { title: 'New RCE Vulnerability in Popular Web Framework', severity: 'critical', source: 'CVE Feed', description: 'A critical remote code execution vulnerability (CVE-2026-3847) has been discovered affecting a widely-used web framework. CVSS Score: 9.8. Immediate patching is recommended.', ioc: 'CVE-2026-3847' },
  { title: 'Credential Stuffing Campaign Targeting Social Platforms', severity: 'high', source: 'Dark Web Monitor', description: 'A large-scale credential stuffing campaign has been detected targeting major social media platforms. Over 2.3 million compromised credentials are being actively traded.', ioc: 'T1110.001' },
  { title: 'Zero-Day Exploit Chain in Enterprise VPN', severity: 'critical', source: 'Threat Intelligence', description: 'An active zero-day exploit chain targeting enterprise VPN solutions has been observed in targeted attacks against financial institutions. Patch unavailable at time of disclosure.', ioc: 'APT-C-3847' },
  { title: 'Supply Chain Attack via Compromised NPM Package', severity: 'high', source: 'OSS Monitor', description: 'A popular NPM package with 2M+ weekly downloads was compromised to inject cryptocurrency miners. The malicious version (5.2.1) was published 48 hours ago.', ioc: 'malicious-npm-pkg-5.2.1' },
  { title: 'Phishing Campaign Impersonating Cloud Providers', severity: 'medium', source: 'PhishTank', description: 'A sophisticated phishing campaign impersonating major cloud providers (AWS, Azure, GCP) has been detected. Emails contain convincing login portal replicas.', ioc: 'phish-cloud-2026-q3' },
  { title: 'New DDoS Botnet Utilizing IoT Devices', severity: 'high', source: 'Botnet Tracker', description: 'A new DDoS botnet comprising over 150,000 compromised IoT devices has been observed launching volumetric attacks exceeding 2Tbps.', ioc: 'Botnet-Mirai-X' },
  { title: 'Ransomware Group Targeting Healthcare Sector', severity: 'critical', source: 'Ransomware Watch', description: 'The LockBit 4.0 ransomware group has launched a targeted campaign against healthcare organizations across Europe and North America. Double-extortion tactics observed.', ioc: 'LockBit-4.0' },
  { title: 'SQL Injection Attack Wave on E-Commerce', severity: 'high', source: 'WAF Analytics', description: 'A coordinated SQL injection campaign targeting e-commerce platforms has been detected. Attackers are exploiting vulnerable search and login forms.', ioc: 'SQLi-wave-2026-07' },
  { title: 'New Cryptomining Malware Spreading via RDP', severity: 'medium', source: 'Malware Intel', description: 'A new cryptomining malware strain is spreading via brute-forced RDP connections. Once installed, it uses sophisticated evasion techniques to avoid detection.', ioc: 'CryptoMiner-RDP-v3' },
  { title: 'API Key Leakage in Public Repositories', severity: 'medium', source: 'Code Scanner', description: 'Automated scanning has detected a surge in API keys and secrets being committed to public GitHub repositories. Over 12,000 exposures detected in the past 7 days.', ioc: 'GIT-LEAK-2026-0719' },
  { title: 'Active Exploitation of Apache Struts Vulnerability', severity: 'critical', source: 'Honeypot Network', description: 'Active exploitation attempts targeting CVE-2026-2111 (Apache Struts RCE) have been detected across our global honeypot network. Exploitation attempts increased 340% in 24 hours.', ioc: 'CVE-2026-2111' },
  { title: 'DNS Tunneling Activity Detected', severity: 'medium', source: 'DNS Monitor', description: 'Unusual DNS query patterns consistent with DNS tunneling have been detected. Data exfiltration via DNS may be active in the monitored network.', ioc: 'DNS-TUN-2026-0719' },
  { title: 'New Phishing Kit Bypassing MFA', severity: 'high', source: 'Threat Intel', description: 'A new phishing-as-a-service (PhaaS) kit has been observed bypassing multi-factor authentication through real-time session hijacking (Adversary-in-the-Middle).', ioc: 'AiTM-PhishKit-v2' },
  { title: 'Container Escape Vulnerability in Kubernetes', severity: 'critical', source: 'K8s Security', description: 'A container escape vulnerability affecting Kubernetes environments has been disclosed. Exploitation allows attackers to gain host-level access from within a pod.', ioc: 'CVE-2026-4789' },
  { title: 'Data Breach at Major Technology Provider', severity: 'high', source: 'Breach Intelligence', description: 'A significant data breach has been reported at a major technology provider. Initial reports indicate 50M+ records may be affected. Monitor for leaked credentials.', ioc: 'BREACH-2026-TECHPROV' },
];

export async function GET() {
  const threats = THREAT_TEMPLATES.map((t, i) => ({
    id: `threat-${i}`,
    ...t,
    createdAt: new Date(Date.now() - i * 3600000 * Math.random() * 24).toISOString(),
  }));

  return NextResponse.json({ threats });
}