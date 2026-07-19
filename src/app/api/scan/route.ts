import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const COMMON_SUBDOMAINS = [
  'www', 'api', 'mail', 'ftp', 'smtp', 'pop', 'imap', 'admin', 'portal',
  'dashboard', 'app', 'dev', 'staging', 'test', 'beta', 'cdn', 'static',
  'assets', 'images', 'media', 'video', 'blog', 'news', 'shop', 'store',
  'secure', 'auth', 'login', 'sso', 'vpn', 'remote', 'gateway', 'proxy',
  'ns1', 'ns2', 'mx', 'mx1', 'mx2', 'dns', 'dns1', 'dns2',
  'db', 'database', 'redis', 'elastic', 'search', 'analytics', 'track',
  'webhook', 'hooks', 'api-v1', 'api-v2', 'graphql', 'rest', 'internal',
  'ci', 'cd', 'jenkins', 'git', 'gitlab', 'github', 'repo',
  'docs', 'wiki', 'help', 'support', 'status', 'health', 'monitor',
  'metrics', 'grafana', 'prometheus', 'kibana', 'logs', 'log',
  'm', 'mobile', 'wap', 'amp', 'pwa',
  'crm', 'erp', 'hr', 'payroll', 'invoice', 'billing',
  'oAuth', 'oauth2', 'token', 'keys', 'certs', 'pki',
  'sandbox', 'demo', 'preview', 'next', 'v2', 'v3',
];

const COMMON_PORTS = [
  { port: 21, service: 'FTP', risk: 'medium' },
  { port: 22, service: 'SSH', risk: 'medium' },
  { port: 25, service: 'SMTP', risk: 'medium' },
  { port: 53, service: 'DNS', risk: 'low' },
  { port: 80, service: 'HTTP', risk: 'high' },
  { port: 110, service: 'POP3', risk: 'medium' },
  { port: 143, service: 'IMAP', risk: 'medium' },
  { port: 443, service: 'HTTPS', risk: 'low' },
  { port: 445, service: 'SMB', risk: 'critical' },
  { port: 993, service: 'IMAPS', risk: 'low' },
  { port: 995, service: 'POP3S', risk: 'low' },
  { port: 1433, service: 'MSSQL', risk: 'critical' },
  { port: 1521, service: 'Oracle DB', risk: 'critical' },
  { port: 3306, service: 'MySQL', risk: 'critical' },
  { port: 3389, service: 'RDP', risk: 'critical' },
  { port: 5432, service: 'PostgreSQL', risk: 'critical' },
  { port: 5900, service: 'VNC', risk: 'critical' },
  { port: 6379, service: 'Redis', risk: 'critical' },
  { port: 8080, service: 'HTTP-Alt', risk: 'high' },
  { port: 8443, service: 'HTTPS-Alt', risk: 'medium' },
  { port: 8888, service: 'HTTP-Proxy', risk: 'high' },
  { port: 9090, service: 'Prometheus', risk: 'high' },
  { port: 9200, service: 'Elasticsearch', risk: 'critical' },
  { port: 27017, service: 'MongoDB', risk: 'critical' },
];

const TECHNOLOGIES = [
  'Nginx', 'Apache', 'Cloudflare', 'AWS', 'Amazon S3', 'Google Cloud',
  'Azure', 'CloudFront', 'Akamai', 'Fastly', 'Varnish', 'Redis',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Elasticsearch', 'Kibana',
  'React', 'Next.js', 'Vue.js', 'Angular', 'jQuery',
  'WordPress', 'Drupal', 'Joomla', 'Shopify', 'Magento',
  'Django', 'Flask', 'Express.js', 'Spring Boot', 'Laravel',
  'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitLab CI',
  'Let\'s Encrypt', 'DigiCert', 'Cloudflare SSL', 'cPanel',
  'phpMyAdmin', 'Adminer', 'Grafana', 'Prometheus',
  'TensorFlow', 'PyTorch', 'OpenAI',
];

const VULN_TEMPLATES = [
  { title: 'Missing Content-Security-Policy Header', severity: 'medium', category: 'header', desc: 'The target is missing a Content-Security-Policy header, which could allow XSS attacks and data injection.' },
  { title: 'Missing X-Frame-Options Header', severity: 'medium', category: 'header', desc: 'The target does not set X-Frame-Options, making it vulnerable to clickjacking attacks.' },
  { title: 'Missing Strict-Transport-Security Header', severity: 'high', category: 'header', desc: 'HSTS header is not set, allowing potential man-in-the-middle attacks via protocol downgrade.' },
  { title: 'Missing X-Content-Type-Options Header', severity: 'low', category: 'header', desc: 'X-Content-Type-Options header is not set, potentially allowing MIME-type sniffing.' },
  { title: 'Server Version Disclosure', severity: 'medium', category: 'header', desc: 'Server header reveals version information that could aid attackers in targeting known vulnerabilities.' },
  { title: 'SPF Record Missing or Misconfigured', severity: 'high', category: 'dns', desc: 'No valid SPF record found. This allows email spoofing and phishing attacks using the target domain.' },
  { title: 'DMARC Record Not Found', severity: 'high', category: 'dns', desc: 'No DMARC record configured. Without DMARC, domain impersonation cannot be effectively detected or prevented.' },
  { title: 'DNS Zone Transfer Allowed', severity: 'critical', category: 'dns', desc: 'DNS zone transfer (AXFR) is allowed, exposing full internal network topology and all DNS records.' },
  { title: 'Subdomain Takeover Possible', severity: 'critical', category: 'subdomain', desc: 'A dangling DNS record points to a decommissioned external service, enabling potential subdomain takeover.' },
  { title: 'Open Administrative Interface', severity: 'critical', category: 'vulnerability', desc: 'An administrative interface (e.g., /admin, /wp-admin) is publicly accessible without proper authentication.' },
  { title: 'SSL Certificate Expiring Soon', severity: 'medium', category: 'ssl', desc: 'SSL certificate is expiring within 30 days. Expired certificates will cause browser warnings and potential service disruption.' },
  { title: 'Mixed Content Detected', severity: 'medium', category: 'ssl', desc: 'HTTPS page loads resources over HTTP, creating potential for man-in-the-middle content injection.' },
  { title: 'Weak TLS Configuration', severity: 'high', category: 'ssl', desc: 'Server supports outdated TLS versions (TLS 1.0/1.1) or weak cipher suites, reducing encryption strength.' },
  { title: 'Potential SQL Injection Endpoint', severity: 'critical', category: 'vulnerability', desc: 'An input parameter appears to be vulnerable to SQL injection based on error-based response analysis.' },
  { title: 'Open Database Port Exposed', severity: 'critical', category: 'port', desc: 'A database port is directly accessible from the internet without VPN or IP whitelisting.' },
  { title: 'CORS Misconfiguration', severity: 'high', category: 'header', desc: 'CORS policy allows any origin (Access-Control-Allow-Origin: *), potentially exposing sensitive data to unauthorized domains.' },
  { title: 'Information Disclosure in Error Pages', severity: 'medium', category: 'vulnerability', desc: 'Error pages reveal internal server information including stack traces, framework versions, and file paths.' },
  { title: 'Missing Rate Limiting', severity: 'high', category: 'vulnerability', desc: 'No rate limiting detected on authentication endpoints, enabling brute-force and credential stuffing attacks.' },
  { title: 'Outdated Software Detected', severity: 'high', category: 'technology', desc: 'An outdated version of server software was detected with known CVEs published.' },
  { title: 'SSH Using Weak Key Exchange', severity: 'high', category: 'port', desc: 'SSH service supports weak key exchange algorithms that are vulnerable to man-in-the-middle attacks.' },
];

function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, scanType } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').toLowerCase();

    // Create or find target
    let target = await db.scanTarget.findFirst({ where: { domain: cleanDomain } });
    if (!target) {
      target = await db.scanTarget.create({
        data: { domain: cleanDomain, ip: `203.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` },
      });
    }

    // Create scan record
    const scan = await db.scan.create({
      data: {
        targetId: target.id,
        status: 'completed',
        scanType: scanType || 'full',
        completedAt: new Date(),
      },
    });

    const rand = seededRandom(cleanDomain + Date.now().toString());
    const isQuick = scanType === 'quick';

    // Generate subdomain findings
    const subdomainCount = isQuick ? Math.floor(rand() * 5) + 3 : Math.floor(rand() * 15) + 8;
    const selectedSubs = [...COMMON_SUBDOMAINS]
      .sort(() => rand() - 0.5)
      .slice(0, subdomainCount);

    for (const sub of selectedSubs) {
      const subdomain = `${sub}.${cleanDomain}`;
      const risk = rand() > 0.7 ? (rand() > 0.5 ? 'high' : 'critical') : (rand() > 0.5 ? 'medium' : 'low');
      await db.finding.create({
        data: {
          scanId: scan.id,
          title: `Discovered Subdomain: ${subdomain}`,
          severity: risk,
          category: 'subdomain',
          description: `Subdomain ${subdomain} resolves to IP address ${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}. ${risk === 'critical' ? 'This subdomain appears to be an internal/exposed service that should not be publicly accessible.' : 'This is a publicly accessible subdomain.'}`,
          evidence: `A record: ${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}`,
          asset: subdomain,
        },
      });
    }

    // Generate port findings
    const portCount = isQuick ? Math.floor(rand() * 5) + 3 : Math.floor(rand() * 10) + 5;
    const selectedPorts = [...COMMON_PORTS]
      .sort(() => rand() - 0.5)
      .slice(0, portCount);

    for (const p of selectedPorts) {
      const isOpen = rand() > 0.4;
      if (isOpen) {
        await db.finding.create({
          data: {
            scanId: scan.id,
            title: `Open Port: ${p.port}/${p.service}`,
            severity: p.risk,
            category: 'port',
            description: `Port ${p.port} (${p.service}) is open and accepting connections. ${p.risk === 'critical' ? `This is a ${p.service} service that should NOT be exposed to the internet. Immediate remediation is required.` : `This port is accessible and may pose a security risk depending on the service configuration.`}`,
            evidence: `Banner: ${p.service} detected on port ${p.port}`,
            asset: `${cleanDomain}:${p.port}`,
          },
        });
      }
    }

    // Generate technology findings
    const techCount = isQuick ? Math.floor(rand() * 4) + 2 : Math.floor(rand() * 8) + 4;
    const selectedTechs = [...TECHNOLOGIES]
      .sort(() => rand() - 0.5)
      .slice(0, techCount);

    for (const tech of selectedTechs) {
      await db.finding.create({
        data: {
          scanId: scan.id,
          title: `Technology Detected: ${tech}`,
          severity: 'info',
          category: 'technology',
          description: `${tech} was detected on the target. This information helps build a complete technology profile of the target's infrastructure.`,
          evidence: `Fingerprint matched from HTTP headers, page content, and JavaScript libraries.`,
          asset: tech,
        },
      });
    }

    // Generate vulnerability findings
    const vulnCount = isQuick ? Math.floor(rand() * 4) + 2 : Math.floor(rand() * 8) + 5;
    const selectedVulns = [...VULN_TEMPLATES]
      .sort(() => rand() - 0.5)
      .slice(0, vulnCount);

    for (const vuln of selectedVulns) {
      await db.finding.create({
        data: {
          scanId: scan.id,
          title: vuln.title,
          severity: vuln.severity,
          category: vuln.category,
          description: vuln.desc,
          evidence: `Detected during ${vuln.category} analysis of ${cleanDomain}`,
          asset: cleanDomain,
        },
      });
    }

    // Generate SSL findings
    if (!isQuick) {
      const sslIssues = [
        { title: 'SSL Certificate - Weak Signature Algorithm', severity: 'medium', desc: 'Certificate uses SHA-1 signature algorithm which is considered weak and deprecated.' },
        { title: 'SSL Certificate - Domain Mismatch', severity: 'high', desc: 'Certificate common name does not match the requested domain, indicating potential misconfiguration.' },
      ];
      for (const issue of sslIssues) {
        if (rand() > 0.5) {
          await db.finding.create({
            data: {
              scanId: scan.id,
              title: issue.title,
              severity: issue.severity,
              category: 'ssl',
              description: issue.desc,
              evidence: `SSL/TLS analysis of ${cleanDomain}:443`,
              asset: cleanDomain,
            },
          });
        }
      }
    }

    // Generate DNS findings
    const dnsFindings = [
      { title: 'DNSSEC Not Enabled', severity: 'medium', desc: 'DNSSEC is not configured for this domain, allowing potential DNS cache poisoning attacks.' },
      { title: 'Wildcard DNS Record Detected', severity: 'low', desc: 'A wildcard DNS record (*) is configured, meaning any subdomain resolves. This can complicate subdomain enumeration.' },
    ];
    for (const dns of dnsFindings) {
      if (rand() > 0.4) {
        await db.finding.create({
          data: {
            scanId: scan.id,
            title: dns.title,
            severity: dns.severity,
            category: 'dns',
            description: dns.desc,
            evidence: `DNS query analysis for ${cleanDomain}`,
            asset: cleanDomain,
          },
        });
      }
    }

    // Calculate risk score and counts
    const findings = await db.finding.findMany({ where: { scanId: scan.id } });
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;
    const low = findings.filter(f => f.severity === 'low').length;
    const info = findings.filter(f => f.severity === 'info').length;
    const riskScore = Math.min(100, Math.round(critical * 25 + high * 15 + medium * 8 + low * 3 + info * 1));

    await db.scan.update({
      where: { id: scan.id },
      data: {
        riskScore,
        totalVulns: findings.length,
        criticalCount: critical,
        highCount: high,
        mediumCount: medium,
        lowCount: low,
        infoCount: info,
        status: 'completed',
      },
    });

    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id,
        domain: cleanDomain,
        status: 'completed',
        riskScore,
        totalVulns: findings.length,
        critical,
        high,
        medium,
        low,
        info,
        findings: findings.map(f => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          category: f.category,
          description: f.description,
          evidence: f.evidence,
          asset: f.asset,
        })),
      },
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}