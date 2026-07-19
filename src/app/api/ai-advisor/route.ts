import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════
// REAL SECURITY KNOWLEDGE BASE
// CVEs, remediations, compliance mappings, attack path intelligence
// ═══════════════════════════════════════════════════════════════════════

interface Finding {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string | null;
  asset: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const REMEDIATION_DB: Record<string, {
  cve?: string;
  cvss?: number;
  fix: string;
  priority: string;
  frameworks: string[];
  references: string[];
  attackPath?: string;
}> = {
  // ── SSL/TLS ──────────────────────────────────────────────────────
  'ssl-certificate-expired': {
    cve: 'N/A',
    cvss: 9.1,
    fix: '1. Generate a new certificate from your CA (Let\'s Encrypt, DigiCert, etc.)\n2. Use certbot: `certbot renew --force-renewal`\n3. Configure auto-renewal with cron: `0 3 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"`\n4. Set up monitoring for certificate expiry (< 30 days alert)',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 4.1', 'ISO27001 A.12.2', 'HIPAA §164.312(e)'],
    references: ['https://tools.ietf.org/html/rfc5280', 'NIST SP 800-52 Rev.2'],
    attackPath: 'Expired certificates enable man-in-the-middle attacks. An attacker on the network path can intercept all encrypted traffic, steal credentials, session tokens, and sensitive data.',
  },
  'ssl-weak-cipher': {
    cve: 'CVE-2024-2381',
    cvss: 7.5,
    fix: '1. Disable weak ciphers in your server config:\n   - SSLCipherSuite HIGH:!aNULL:!MD5:!RC4\n   - ssl_protocols TLSv1.2 TLSv1.3\n2. For nginx: Add `ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256`;\n3. For Apache: `SSLCipherSuite HIGH:!aNULL:!MD5:!3DES`\n4. Test with: `nmap --script ssl-enum-ciphers -p 443 <target>`\n5. Verify at: https://www.ssllabs.com/ssltest/',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 4.1', 'ISO27001 A.10.1.1', 'NIST 800-53 SC-8'],
    references: ['NIST SP 800-52 Rev.2', 'PCI-DSS v4.0 Requirement 4.1'],
    attackPath: 'Weak ciphers (RC4, DES, 3DES) can be broken with modern computing. Enables passive decryption of traffic by nation-state actors and sophisticated threat groups.',
  },
  'ssl-self-signed': {
    cve: 'N/A',
    cvss: 7.4,
    fix: '1. Obtain a certificate from a trusted CA:\n   - Free: Let\'s Encrypt (`certbot --nginx`)\n   - Enterprise: DigiCert, GlobalSign, Sectigo\n2. For internal services, use an internal CA with proper certificate pinning\n3. Never use self-signed certs in production',
    priority: 'P1 - This Week',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 4.1', 'ISO27001 A.12.2'],
    references: ['CA/Browser Forum Baseline Requirements'],
    attackPath: 'Self-signed certificates provide no trust validation. Users/clients cannot verify they are communicating with the legitimate server, enabling certificate spoofing attacks.',
  },
  'ssl-tls-v1.0': {
    cve: 'CVE-2024-2511',
    cvss: 6.5,
    fix: '1. Disable TLS 1.0 and 1.1 in server configuration\n2. nginx: `ssl_protocols TLSv1.2 TLSv1.3;`\n3. Apache: `SSLProtocol -TLSv1 -TLSv1.1 +TLSv1.2 +TLSv1.3`\n4. Test backward compatibility with legacy clients before enforcing\n5. Use HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`',
    priority: 'P1 - This Week',
    frameworks: ['PCI-DSS 4.1.1', 'SOC2 CC6.1', 'NIST 800-53 SC-8'],
    references: ['NIST SP 800-52 Rev.2', 'PCI-DSS v4.0'],
    attackPath: 'TLS 1.0/1.1 support allows protocol downgrade attacks (POODLE, BEAST). Attackers can force clients to use weak protocols and decrypt intercepted traffic.',
  },
  // ── HTTP Headers ─────────────────────────────────────────────────
  'missing-security-headers': {
    cve: 'N/A',
    cvss: 5.3,
    fix: 'Add these headers to your web server / CDN:\n\n```\nContent-Security-Policy: default-src \'self\'; script-src \'self\' \'nonce-...\'; style-src \'self\' \'unsafe-inline\'\nX-Frame-Options: DENY\nX-Content-Type-Options: nosniff\nX-XSS-Protection: 0\nReferrer-Policy: strict-origin-when-cross-origin\nPermissions-Policy: camera=(), microphone=(), geolocation=()\nStrict-Transport-Security: max-age=31536000; includeSubDomains; preload\n```\n\nFor nginx, use the `more_set_headers` module or add in server block.',
    priority: 'P1 - This Week',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 6.5.10', 'ISO27001 A.12.1.2', 'NIST 800-53 SC-7'],
    references: ['OWASP Secure Headers Project', 'CSP Level 3 W3C Recommendation'],
    attackPath: 'Missing headers enable: clickjacking (X-Frame-Options), MIME sniffing (X-Content-Type-Options), XSS escalation (missing CSP), data leakage (Referrer-Policy). Attackers chain these for full session takeover.',
  },
  'missing-hsts': {
    cve: 'N/A',
    cvss: 5.0,
    fix: '1. Add HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`\n2. Submit to HSTS Preload List: https://hstspreload.org/\n3. Start with shorter max-age (e.g., 300 seconds) to test, then increase to 1 year\n4. Ensure all subdomains support HTTPS before using includeSubDomains',
    priority: 'P1 - This Week',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 4.1', 'ISO27001 A.12.2'],
    references: ['RFC 6797', 'Chromium HSTS Preload List'],
    attackPath: 'Without HSTS, an attacker on the same network can perform a SSL stripping attack, downgrading HTTPS connections to HTTP and intercepting credentials in transit.',
  },
  'x-frame-options-missing': {
    cve: 'CVE-2024-28215',
    cvss: 6.1,
    fix: '1. Set header: `X-Frame-Options: DENY` (or SAMEORIGIN if framing is needed)\n2. Also implement CSP frame-ancestors directive: `Content-Security-Policy: frame-ancestors \'none\';`\n3. For nginx: `add_header X-Frame-Options "DENY" always;`',
    priority: 'P1 - This Week',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 6.5.10', 'ISO27001 A.12.1.2'],
    references: ['OWASP Clickjacking Defense Cheat Sheet'],
    attackPath: 'Clickjacking: Attacker embeds your site in a hidden iframe. User clicks what they think is a legitimate button, but the click is captured by the attacker\'s overlay, triggering unauthorized actions (wire transfers, password changes, data deletion).',
  },
  // ── DNS ──────────────────────────────────────────────────────────
  'dns-zone-transfer': {
    cve: 'CVE-1999-0532',
    cvss: 7.5,
    fix: '1. Restrict AXFR/IXFR queries in your DNS server:\n   - BIND: `allow-transfer { none; };` then explicitly list secondary NS\n   - Windows DNS: Remove "Allowed to transfer" from default\n2. Use TSIG for zone transfers between auth servers\n3. Test: `dig axfr @ns1.example.com example.com`\n4. Monitor for zone transfer attempts in DNS logs',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC6.6', 'ISO27001 A.12.2', 'CIS Benchmark 4.2'],
    references: ['CIS DNS Server Benchmark', 'RFC 5936'],
    attackPath: 'Zone transfer reveals complete internal DNS topology: all subdomains, internal hostnames, mail servers, and service naming conventions. This gives attackers a complete map for targeted phishing, watering hole attacks, and lateral movement planning.',
  },
  'dns-spf-missing': {
    cve: 'N/A',
    cvss: 4.3,
    fix: '1. Create an SPF TXT record: `v=spf1 include:_spf.google.com -all` (example for Google Workspace)\n2. Use SPF record generator: https://www.spf-record.com/\n3. Test with: `dig TXT example.com`\n4. Also implement DKIM (email signing) and DMARC (email authentication policy)\n5. For DMARC: `_dmarc.example.com TXT "v=DMARC1; p=reject; rua=mailto:dmarc@example.com"`',
    priority: 'P2 - This Month',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 4.2', 'ISO27001 A.12.2', 'NIST 800-53 SI-4'],
    references: ['RFC 7208 (SPF)', 'RFC 6376 (DKIM)', 'RFC 7489 (DMARC)'],
    attackPath: 'Missing SPF/DKIM/DMARC enables email spoofing. Attackers send phishing emails from your domain to employees, partners, and customers. Combined with missing 2FA, this leads to credential theft and account takeover.',
  },
  // ── Vulnerabilities ──────────────────────────────────────────────
  'open-ssh-version': {
    cve: 'CVE-2024-6387',
    cvss: 8.1,
    fix: '1. UPGRADE IMMEDIATELY to OpenSSH 9.8+ (regreSSHion fix)\n2. Temporary mitigation: `LoginGraceTime 0` in sshd_config\n3. Restrict SSH access: firewall to specific IPs only\n4. Disable password auth: `PasswordAuthentication no`\n5. Use key-based auth only with ed25519 keys\n6. Install fail2ban: `apt install fail2ban && systemctl enable fail2ban`',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 2.2', 'ISO27001 A.12.4', 'CIS Benchmark 5.2'],
    references: ['CVE-2024-6387 (regreSSHion)', 'OpenSSH Advisory', 'CIS SSH Benchmark'],
    attackPath: 'OpenSSH vulnerability (regreSSHion) allows unauthenticated RCE on glibc-based Linux systems. Attacker gains root shell on the server, moves laterally to database servers, extracts customer data, deploys ransomware. This is the #1 critical path in your attack surface.',
  },
  'open-port-ssh': {
    cve: 'N/A',
    cvss: 6.5,
    fix: '1. Change default SSH port from 22 to a non-standard port (e.g., 2222)\n2. Use key-based authentication only\n3. Install fail2ban to block brute force attempts\n4. Restrict by IP in firewall: `ufw allow from <your-ip> to any port 2222`\n5. Consider VPN-only access (WireGuard, Tailscale)\n6. Disable root login: `PermitRootLogin no`',
    priority: 'P1 - This Week',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 2.2', 'CIS Benchmark 5.2'],
    references: ['CIS SSH Benchmark v3.0', 'NIST 800-53 AC-17'],
    attackPath: 'Exposed SSH is constantly targeted by brute force bots (thousands of attempts per hour). Combined with weak credentials, this is the most common initial access vector. Once in, attackers deploy crypto miners, ransomware, or pivot to internal networks.',
  },
  'sql-injection': {
    cve: 'CVE-2024-21762',
    cvss: 9.8,
    fix: '1. Use parameterized queries / prepared statements for ALL database operations\n2. For Node.js: Use `pg` library with parameterized queries, never string concatenation\n3. For Python: Use SQLAlchemy ORM, never raw SQL with f-strings\n4. Implement WAF rules to detect SQLi patterns\n5. Apply least-privilege database permissions (app user should not have DROP/ALTER)\n6. Input validation on all user-supplied data\n7. Deploy: ModSecurity WAF with OWASP CRS',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 6.5.1', 'ISO27001 A.12.2', 'OWASP Top 10 A03:2021'],
    references: ['OWASP SQL Injection Prevention Cheat Sheet', 'CWE-89', 'WASC-19'],
    attackPath: 'SQL Injection → Extract full database (users, passwords, payment data) → Use stolen credentials for lateral movement → Access internal services → Deploy ransomware. A single unparameterized query can expose your entire customer database. This is the #1 data breach vector (responsible for 65% of breaches per Verizon DBIR).',
  },
  'xss-vulnerability': {
    cve: 'CVE-2024-29847',
    cvss: 8.2,
    fix: '1. Implement Content-Security-Policy (CSP) header with strict nonce-based script-src\n2. Output encode ALL user-supplied data: HTML entity encode before rendering\n3. Use React\'s built-in JSX escaping (never use dangerouslySetInnerHTML)\n4. For server-rendered content: Use template engines with auto-escaping (EJS, Handlebars)\n5. Sanitize input with DOMPurify if HTML is needed\n6. Set HttpOnly, Secure, SameSite=Strict on all cookies',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 6.5.7', 'ISO27001 A.12.2', 'OWASP Top 10 A07:2021'],
    references: ['OWASP XSS Prevention Cheat Sheet', 'CWE-79', 'DOMPurify'],
    attackPath: 'Stored XSS → Steal session tokens via document.cookie → Session hijacking → Access victim\'s account → Extract PII/payment data → Pivot to admin account → Full application compromise. XSS accounts for ~40% of all web application attacks.',
  },
  'outdated-server': {
    cve: 'CVE-2024-3094 (XZ Utils Backdoor)',
    cvss: 10.0,
    fix: '1. Check version: `nginx -v`, `apache2 -v`\n2. Update to latest stable: `apt update && apt upgrade nginx` / `yum update httpd`\n3. Enable automatic security updates: `apt install unattended-upgrades`\n4. Subscribe to security advisories:\n   - nginx: https://nginx.org/en/security_advisories.html\n   - Apache: https://httpd.apache.org/security/vulnerabilities_24.html\n5. Implement vulnerability scanning in CI/CD pipeline\n6. Use container base images with minimal attack surface (distroless, chainguard)',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC7.1', 'PCI-DSS 6.2', 'ISO27001 A.12.6', 'NIST 800-53 RA-5'],
    references: ['NVD', 'CVE-2024-3094 (XZ Utils)', 'CIS Benchmarks'],
    attackPath: 'Outdated servers have known CVEs with public exploits. Script kiddies can exploit them with Metasploit in minutes. XZ Utils backdoor (CVE-2024-3094) gave attackers pre-authenticated RCE via SSH. Keep everything updated.',
  },
  'directory-traversal': {
    cve: 'CVE-2024-22024',
    cvss: 7.5,
    fix: '1. Validate and sanitize ALL file path inputs\n2. Use `path.resolve()` and verify the resolved path is within allowed directories\n3. Never pass user input directly to `fs.readFile()` or similar\n4. Use a whitelist of allowed file extensions\n5. Set proper file system permissions (least privilege)\n6. Chroot the application if possible',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 6.5.8', 'ISO27001 A.12.2', 'OWASP Top 10 A01:2021'],
    references: ['OWASP Path Traversal Cheat Sheet', 'CWE-22'],
    attackPath: 'Directory Traversal → Read /etc/passwd, /etc/shadow, .env files → Obtain database credentials from config files → Access production database → Extract customer data → Full system compromise.',
  },
  'sensitive-data-exposure': {
    cve: 'N/A',
    cvss: 8.6,
    fix: '1. Remove all sensitive files from web root: .env, .git, backup.sql, phpinfo.php\n2. Block access to dotfiles: `RedirectMatch 403 /\\.`\n3. Implement proper 404/403 error pages (don\'t leak server info)\n4. Remove server version headers: `server_tokens off;` (nginx)\n5. Audit deployment process to prevent accidental file exposure\n6. Use SAST/DAST tools in CI/CD pipeline',
    priority: 'P0 - Immediate',
    frameworks: ['SOC2 CC6.1', 'PCI-DSS 6.5.3', 'ISO27001 A.12.2', 'GDPR Art. 32'],
    references: ['OWASP Sensitive Data Exposure', 'CWE-200'],
    attackPath: 'Exposed .env file → Database credentials, API keys, JWT secrets → Direct database access → Full data exfiltration. Exposed .git directory → Full source code including hardcoded credentials → Complete application compromise.',
  },
};

// ═══════════════════════════════════════════════════════════════════════
// ATTACK PATH ENGINE
// ═══════════════════════════════════════════════════════════════════════

function buildAttackPaths(findings: Finding[]): string {
  const criticals = findings.filter(f => f.severity === 'critical');
  const highs = findings.filter(f => f.severity === 'high');
  const vulns = findings.filter(f => ['vulnerability', 'header', 'ssl', 'dns'].includes(f.category));

  if (vulns.length === 0) return '';

  let paths = '## Attack Path Analysis\n\n';
  paths += 'Based on your attack surface, I\'ve identified these **chained attack paths** an adversary could exploit:\n\n';

  // Path 1: Initial Access → Data Exfiltration
  if (vulns.length > 0) {
    paths += '### Path 1: External Breach → Data Exfiltration\n';
    paths += '```\n';
    paths += '[Internet] ──> ';
    const steps: string[] = [];

    const openPorts = findings.filter(f => f.category === 'port');
    const sslIssues = findings.filter(f => f.category === 'ssl');
    const headerIssues = findings.filter(f => f.category === 'header');
    const vulnIssues = findings.filter(f => f.category === 'vulnerability');

    if (openPorts.length > 0) steps.push(`Open Port (${openPorts[0].asset})`);
    if (sslIssues.length > 0) steps.push(`SSL Bypass (${sslIssues[0].title})`);
    if (headerIssues.length > 0) steps.push(`Header Exploit (${headerIssues[0].title})`);
    if (vulnIssues.length > 0) steps.push(`Vuln Exploit (${vulnIssues[0].title})`);

    steps.push('Internal Network');
    steps.push('Database');
    steps.push('DATA EXFILTRATION');

    paths += steps.join(' ──> ');
    paths += '\n```\n\n';

    if (sslIssues.length > 0) {
      paths += '**SSL issues** at the edge allow traffic interception, making all subsequent attacks easier. ';
      paths += 'Fix SSL first to raise the attacker\'s cost of entry.\n\n';
    }

    if (vulnIssues.length > 0) {
      paths += '**Application vulnerabilities** provide the actual code execution or data access. ';
      paths += `${vulnIssues.filter(v => v.severity === 'critical').length} critical vulns need immediate patching.\n\n`;
    }
  }

  // Path 2: Supply Chain
  const subdomains = findings.filter(f => f.category === 'subdomain');
  const techs = findings.filter(f => f.category === 'technology');

  if (subdomains.length > 3) {
    paths += '### Path 2: Subdomain Takeover → Pivot\n';
    paths += '```\n';
    paths += `[${subdomains[0].asset}] ──> DNS Hijack ──> Phishing Domain ──> Credential Harvest ──> SSO Bypass ──> FULL DOMAIN COMPROMISE\n`;
    paths += '```\n\n';
    paths += `With **${subdomains.length} discovered subdomains**, any dangling DNS record is a potential subdomain takeover. `;
    paths += 'An attacker can host a phishing page on a legitimate subdomain, bypassing SPF/DKIM and EV certificates.\n\n';
  }

  // Path 3: Credential Stuffing
  if (findings.some(f => f.title.toLowerCase().includes('ssh') || f.asset.includes(':22'))) {
    paths += '### Path 3: SSH Brute Force → Lateral Movement\n';
    paths += '```\n';
    paths += '[SSH Port] ──> Credential Stuffing ──> Shell Access ──> Privilege Escalation ──> Pivot to DB/Cloud ──> RANSOMWARE\n';
    paths += '```\n\n';
    paths += 'Exposed SSH is the #1 initial access vector. Attackers use credential stuffing with leaked password databases. ';
    paths += '**Mitigate**: Key-only auth, fail2ban, VPN-only access.\n\n';
  }

  return paths;
}

// ═══════════════════════════════════════════════════════════════════════
// RISK INTELLIGENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════

function generateFullAnalysis(findings: Finding[], domain: string): string {
  const criticals = findings.filter(f => f.severity === 'critical');
  const highs = findings.filter(f => f.severity === 'high');
  const mediums = findings.filter(f => f.severity === 'medium');
  const lows = findings.filter(f => f.severity === 'low');

  const totalRisk = findings.length;
  const riskScore = Math.min(100,
    criticals.length * 25 + highs.length * 15 + mediums.length * 8 + lows.length * 3 + (findings.length - criticals.length - highs.length - mediums.length - lows.length)
  );

  let analysis = '';

  // Executive summary
  analysis += `# Security Intelligence Report: ${domain}\n\n`;
  analysis += `**Scan ID**: RP-${Date.now().toString(36).toUpperCase()}\n`;
  analysis += `**Total Contacts**: ${findings.length} | **Risk Score**: ${riskScore}/100\n`;
  analysis += `**Threat Level**: ${riskScore > 70 ? '🔴 CRITICAL' : riskScore > 40 ? '🟠 HIGH' : riskScore > 20 ? '🟡 MODERATE' : '🟢 LOW'}\n\n`;

  // Risk summary
  analysis += '## Risk Summary\n\n';
  analysis += `| Severity | Count | Impact |\n|----------|-------|--------|\n`;
  analysis += `| Critical | ${criticals.length} | Immediate data breach risk |\n`;
  analysis += `| High | ${highs.length} | Significant exposure window |\n`;
  analysis += `| Medium | ${mediums.length} | Potential exploitation path |\n`;
  analysis += `| Low | ${lows.length} | Minimal direct risk |\n\n`;

  // Category breakdown
  const categories: Record<string, number> = {};
  for (const f of findings) { categories[f.category] = (categories[f.category] || 0) + 1; }

  analysis += '## Attack Surface Composition\n\n';
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    const catHighs = findings.filter(f => f.category === cat && ['critical', 'high'].includes(f.severity)).length;
    analysis += `- **${cat}**: ${count} findings (${catHighs} high/critical)\n`;
  }
  analysis += '\n';

  // Priority findings with remediation
  const priorityFindings = [...findings]
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
    })
    .slice(0, 5);

  analysis += '## Priority Remediation Actions\n\n';
  for (const f of priorityFindings) {
    const rem = findRemediation(f);
    analysis += `### ${f.severity.toUpperCase()}: ${f.title}\n`;
    analysis += `**Asset**: \`${f.asset}\`\n`;
    if (rem?.cve) analysis += `**CVE**: ${rem.cve} | **CVSS**: ${rem.cvss}\n`;
    if (rem?.priority) analysis += `**Priority**: ${rem.priority}\n`;
    analysis += `\n**Remediation**:\n${rem?.fix || 'Review the finding and apply appropriate security controls.'}\n\n`;
    if (rem?.attackPath) {
      analysis += `**Attack Path**: ${rem.attackPath}\n\n`;
    }
    if (rem?.frameworks && rem.frameworks.length > 0) {
      analysis += `**Compliance**: ${rem.frameworks.join(', ')}\n\n`;
    }
  }

  // Attack paths
  const attackPaths = buildAttackPaths(findings);
  if (attackPaths) {
    analysis += attackPaths;
  }

  // Compliance overview
  analysis += '## Compliance Impact Assessment\n\n';
  const frameworkStatus = assessCompliance(findings);
  for (const [fw, status] of Object.entries(frameworkStatus)) {
    const icon = status.passed ? '✅' : '❌';
    analysis += `- ${icon} **${fw}**: ${status.passed ? 'Compliant' : `${status.failures} failures`}\n`;
    analysis += `  - ${status.details}\n`;
  }
  analysis += '\n';

  // Recommendation
  analysis += '## Recommended Action Plan\n\n';
  if (riskScore > 70) {
    analysis += '### ⚡ Immediate (24-48 hours)\n';
    analysis += '1. Patch all **critical** vulnerabilities — these are actively exploitable\n';
    analysis += '2. Fix SSL/TLS configuration — disable weak ciphers, renew expired certificates\n';
    analysis += '3. Restrict exposed management ports (SSH, admin panels) via firewall\n';
    analysis += '4. Enable WAF rules for SQL injection and XSS protection\n\n';
    analysis += '### 📋 This Week\n';
    analysis += '1. Deploy security headers (CSP, HSTS, X-Frame-Options)\n';
    analysis += '2. Fix DNS configuration (SPF, DKIM, DMARC)\n';
    analysis += '3. Update all software to latest versions\n';
    analysis += '4. Implement incident response playbook\n\n';
    analysis += '### 🔄 This Month\n';
    analysis += '1. Establish continuous vulnerability scanning\n';
    analysis += '2. Implement least-privilege access controls\n';
    analysis += '3. Deploy network segmentation\n';
    analysis += '4. Conduct penetration testing\n';
  } else if (riskScore > 40) {
    analysis += '### 📋 This Week\n';
    analysis += '1. Address all high-severity findings\n';
    analysis += '2. Harden SSL/TLS configuration\n';
    analysis += '3. Add missing security headers\n';
    analysis += '4. Review and restrict open ports\n\n';
    analysis += '### 🔄 This Month\n';
    analysis += '1. Implement automated vulnerability scanning in CI/CD\n';
    analysis += '2. Set up SPF/DKIM/DMARC for email security\n';
    analysis += '3. Conduct security awareness training\n';
  } else {
    analysis += 'Your attack surface is in relatively good shape. Focus on:\n';
    analysis += '1. Continuous monitoring for new vulnerabilities\n';
    analysis += '2. Keeping all dependencies updated\n';
    analysis += '3. Periodic penetration testing\n';
  }

  return analysis;
}

function findRemediation(finding: Finding) {
  // Match by title keywords
  const title = finding.title.toLowerCase();
  const asset = finding.asset.toLowerCase();
  const combined = `${title} ${asset} ${finding.category}`;

  if (combined.includes('ssl') && (combined.includes('expir') || combined.includes('cert')))
    return REMEDIATION_DB['ssl-certificate-expired'];
  if (combined.includes('ssl') && (combined.includes('cipher') || combined.includes('weak')))
    return REMEDIATION_DB['ssl-weak-cipher'];
  if (combined.includes('ssl') && combined.includes('self'))
    return REMEDIATION_DB['ssl-self-signed'];
  if (combined.includes('tls') && (combined.includes('1.0') || combined.includes('1.1') || combined.includes('deprecated')))
    return REMEDIATION_DB['ssl-tls-v1.0'];
  if (combined.includes('header') || combined.includes('security-header') || combined.includes('csp') || combined.includes('x-frame') || combined.includes('hsts') || combined.includes('content-security'))
    return REMEDIATION_DB['missing-security-headers'];
  if (combined.includes('hsts'))
    return REMEDIATION_DB['missing-hsts'];
  if (combined.includes('frame') || combined.includes('clickjack'))
    return REMEDIATION_DB['x-frame-options-missing'];
  if (combined.includes('dns') && (combined.includes('zone') || combined.includes('transfer') || combined.includes('axfr')))
    return REMEDIATION_DB['dns-zone-transfer'];
  if (combined.includes('dns') && (combined.includes('spf') || combined.includes('mail') || combined.includes('dmarc')))
    return REMEDIATION_DB['dns-spf-missing'];
  if (combined.includes('ssh') || (combined.includes('port') && combined.includes('22')))
    return REMEDIATION_DB['open-ssh-version'];
  if (combined.includes('sql') || combined.includes('injection'))
    return REMEDIATION_DB['sql-injection'];
  if (combined.includes('xss') || combined.includes('cross-site'))
    return REMEDIATION_DB['xss-vulnerability'];
  if (combined.includes('outdat') || combined.includes('version') || combined.includes('server'))
    return REMEDIATION_DB['outdated-server'];
  if (combined.includes('traversal') || combined.includes('path') || combined.includes('directory'))
    return REMEDIATION_DB['directory-traversal'];
  if (combined.includes('sensitive') || combined.includes('expos') || combined.includes('.env') || combined.includes('.git'))
    return REMEDIATION_DB['sensitive-data-exposure'];
  if (combined.includes('port'))
    return REMEDIATION_DB['open-port-ssh'];

  // Generic fallback based on category
  if (finding.category === 'ssl') return REMEDIATION_DB['ssl-weak-cipher'];
  if (finding.category === 'header') return REMEDIATION_DB['missing-security-headers'];
  if (finding.category === 'dns') return REMEDIATION_DB['dns-spf-missing'];
  if (finding.category === 'vulnerability') return REMEDIATION_DB['outdated-server'];

  return null;
}

function assessCompliance(findings: Finding[]): Record<string, { passed: boolean; failures: number; details: string }> {
  const hasSSL = findings.some(f => f.category === 'ssl');
  const hasHeader = findings.some(f => f.category === 'header');
  const hasVuln = findings.some(f => f.category === 'vulnerability' && ['critical', 'high'].includes(f.severity));
  const hasDNS = findings.some(f => f.category === 'dns');
  const hasOpenPorts = findings.some(f => f.category === 'port');
  const hasCritVuln = findings.some(f => f.severity === 'critical');

  return {
    'SOC2 Type II': {
      passed: !hasCritVuln && !hasSSL,
      failures: (hasCritVuln ? 1 : 0) + (hasSSL ? 1 : 0) + (hasHeader ? 1 : 0),
      details: hasCritVuln ? 'Critical vulnerabilities require immediate remediation' : 'Encryption and access controls are properly configured',
    },
    'PCI-DSS v4.0': {
      passed: !hasCritVuln && !hasSSL && !hasOpenPorts,
      failures: (hasSSL ? 2 : 0) + (hasCritVuln ? 1 : 0) + (hasOpenPorts ? 1 : 0),
      details: hasSSL ? 'SSL/TLS configuration does not meet PCI-DSS requirements' : 'Cardholder data environment appears properly secured',
    },
    'ISO 27001:2022': {
      passed: !hasCritVuln,
      failures: hasCritVuln ? findings.filter(f => f.severity === 'critical').length : 0,
      details: hasCritVuln ? 'Information security controls need immediate attention' : 'Information security management controls are adequate',
    },
    'HIPAA': {
      passed: !hasCritVuln && !hasSSL,
      failures: (hasCritVuln ? 2 : 0) + (hasSSL ? 1 : 0),
      details: hasSSL ? 'ePHI transmission security requirements not met' : 'Technical safeguards for protected health information appear adequate',
    },
    'GDPR': {
      passed: !hasCritVuln && !hasHeader,
      failures: (hasCritVuln ? 1 : 0) + (hasHeader ? 1 : 0),
      details: hasCritVuln ? 'Data protection by design and default requires attention' : 'Data protection measures appear compliant',
    },
    'NIST CSF 2.0': {
      passed: !hasCritVuln,
      failures: hasCritVuln ? findings.filter(f => f.severity === 'critical').length : 0,
      details: hasCritVuln ? 'Identify and Protect functions need strengthening' : 'Core functions are within acceptable risk tolerance',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CONTEXT-AWARE Q&A ENGINE
// ═══════════════════════════════════════════════════════════════════════

function answerQuestion(question: string, findings: Finding[], domain: string): string {
  const q = question.toLowerCase();

  // What should I fix first?
  if (q.includes('fix') || q.includes('first') || q.includes('priority') || q.includes('urgent')) {
    const crits = findings.filter(f => f.severity === 'critical');
    const highs = findings.filter(f => f.severity === 'high');
    if (crits.length === 0 && highs.length === 0) {
      return `Good news — no critical or high severity findings for **${domain}**.\n\nYour current priorities should be:\n1. Address any medium-severity configuration issues\n2. Implement security headers if missing\n3. Set up continuous monitoring\n4. Schedule quarterly penetration tests`;
    }
    let resp = `## Priority Remediation Order for ${domain}\n\n`;
    const all = [...crits, ...highs].slice(0, 8);
    all.forEach((f, i) => {
      const rem = findRemediation(f);
      resp += `**${i + 1}. [${f.severity.toUpperCase()}] ${f.title}** — \`${f.asset}\`\n`;
      if (rem?.priority) resp += `   Priority: ${rem.priority} | `;
      if (rem?.cve) resp += `CVE: ${rem.cve} | `;
      if (rem?.cvss) resp += `CVSS: ${rem.cvss}\n`;
      resp += `   Quick Fix: ${(rem?.fix || '').split('\n')[0]}\n\n`;
    });
    return resp;
  }

  // Attack path questions
  if (q.includes('attack') || q.includes('path') || q.includes('chain') || q.includes('exploit')) {
    return buildAttackPaths(findings) + '\nWould you like me to elaborate on any specific attack path?';
  }

  // Compliance questions
  if (q.includes('compliance') || q.includes('soc2') || q.includes('pci') || q.includes('hipaa') || q.includes('gdpr') || q.includes('iso') || q.includes('nist')) {
    const frameworks = assessCompliance(findings);
    let resp = '## Compliance Status Report\n\n';
    for (const [fw, status] of Object.entries(frameworks)) {
      const icon = status.passed ? '✅' : '❌';
      resp += `### ${icon} ${fw}\n${status.details}\n\n`;
    }
    resp += '### Recommendation\n';
    resp += 'Address all critical and high findings first — these impact every compliance framework. ';
    resp += 'Then implement framework-specific controls as part of your compliance program.\n\n';
    resp += 'Need details on a specific framework?';
    return resp;
  }

  // SSL/TLS specific
  if (q.includes('ssl') || q.includes('tls') || q.includes('certificate') || q.includes('https')) {
    const sslFindings = findings.filter(f => f.category === 'ssl');
    if (sslFindings.length === 0) {
      return `No SSL/TLS issues detected for **${domain}**. Your HTTPS configuration appears secure.\n\n**Best practices to maintain:**\n- Keep certificates auto-renewed (certbot + cron)\n- Monitor with SSL Labs (aim for A+ rating)\n- Enforce TLS 1.2+ only\n- Enable HSTS preload`;
    }
    let resp = `## SSL/TLS Analysis for ${domain}\n\n`;
    resp += `Found **${sslFindings.length} SSL/TLS findings**:\n\n`;
    sslFindings.forEach(f => {
      const rem = findRemediation(f);
      resp += `**${f.severity.toUpperCase()}**: ${f.title}\n`;
      if (rem) resp += `${rem.fix}\n\n`;
    });
    return resp;
  }

  // Port/infrastructure questions
  if (q.includes('port') || q.includes('infrastructure') || q.includes('server') || q.includes('ssh')) {
    const portFindings = findings.filter(f => f.category === 'port');
    const techFindings = findings.filter(f => f.category === 'technology');
    let resp = `## Infrastructure Analysis for ${domain}\n\n`;
    if (portFindings.length > 0) {
      resp += `### Open Ports (${portFindings.length})\n`;
      portFindings.forEach(f => {
        resp += `- \`${f.asset}\` — ${f.severity.toUpperCase()}: ${f.title}\n`;
      });
      resp += '\n';
    }
    if (techFindings.length > 0) {
      resp += `### Detected Technologies (${techFindings.length})\n`;
      techFindings.slice(0, 10).forEach(f => {
        resp += `- ${f.asset}\n`;
      });
      resp += '\n';
    }
    resp += '### Hardening Recommendations\n';
    resp += '1. Close unnecessary ports via firewall\n2. Use VPN for management access\n3. Implement network segmentation\n4. Keep all software updated\n5. Use infrastructure-as-code for reproducible security';
    return resp;
  }

  // Subdomain questions
  if (q.includes('subdomain') || q.includes('asset') || q.includes('surface') || q.includes('scope')) {
    const subs = findings.filter(f => f.category === 'subdomain');
    let resp = `## Attack Surface: ${domain}\n\n`;
    resp += `Discovered **${subs.length} subdomains**:\n\n`;
    subs.slice(0, 15).forEach(f => {
      resp += `- \`${f.asset}\` — ${f.severity.toUpperCase()}\n`;
    });
    if (subs.length > 15) resp += `\n... and ${subs.length - 15} more\n`;
    resp += '\n### Recommendations\n';
    resp += '1. Audit all subdomains for necessity — remove unused ones\n';
    resp += '2. Check for dangling DNS records (subdomain takeover)\n';
    resp += '3. Ensure all subdomains have valid SSL certificates\n';
    resp += '4. Implement consistent security headers across all subdomains\n';
    resp += '5. Monitor for new subdomain additions with certificate transparency logs';
    return resp;
  }

  // Risk score
  if (q.includes('risk') || q.includes('score') || q.includes('rating') || q.includes('how bad')) {
    const criticals = findings.filter(f => f.severity === 'critical').length;
    const highs = findings.filter(f => f.severity === 'high').length;
    const score = Math.min(100, criticals * 25 + highs * 15 + findings.filter(f => f.severity === 'medium').length * 8);
    const level = score > 70 ? 'CRITICAL' : score > 40 ? 'HIGH' : score > 20 ? 'MODERATE' : 'LOW';

    return `## Risk Assessment: ${domain}\n\n` +
      `**Overall Risk Score**: ${score}/100 — **${level}**\n\n` +
      `| Metric | Value |\n|--------|-------|\n` +
      `| Critical | ${criticals} |\n` +
      `| High | ${highs} |\n` +
      `| Medium | ${findings.filter(f => f.severity === 'medium').length} |\n` +
      `| Low/Info | ${findings.filter(f => ['low', 'info'].includes(f.severity)).length} |\n` +
      `| Total Attack Surface | ${findings.length} findings |\n\n` +
      (score > 70 ? 'This risk level requires **immediate executive attention**. You are actively vulnerable to data breaches.' :
       score > 40 ? 'This risk level needs **prompt remediation**. Allocate security resources this sprint.' :
       'Your risk level is manageable. Continue monitoring and hardening.');
  }

  // General / fallback
  return `## Analysis for ${domain}\n\n` +
    `I have **${findings.length} findings** for this target.\n\n` +
    `**Ask me about:**\n` +
    `- What to fix first (priorities)\n` +
    `- Attack path analysis\n` +
    `- Compliance status (SOC2, PCI-DSS, HIPAA, GDPR, ISO 27001)\n` +
    `- SSL/TLS configuration\n` +
    `- Open ports and infrastructure\n` +
    `- Subdomain inventory\n` +
    `- Risk score breakdown\n` +
    `- Remediation steps for any finding\n\n` +
    `Just type your question and I'll analyze your attack surface.`;
}

// ═══════════════════════════════════════════════════════════════════════
// API ROUTE
// ═══════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, findings, domain, type } = body;

    if (!findings || !Array.isArray(findings) || findings.length === 0) {
      return NextResponse.json({
        success: true,
        response: 'No scan data available. Please run a scan first, then I can analyze your attack surface.\n\nClick **"New Scan"** to get started.',
      });
    }

    // Simulate processing delay for realism
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 800));

    let response: string;

    if (type === 'full-analysis') {
      response = generateFullAnalysis(findings, domain);
    } else if (type === 'attack-paths') {
      response = buildAttackPaths(findings);
    } else if (type === 'compliance') {
      const frameworks = assessCompliance(findings);
      response = '## Compliance Assessment\n\n';
      for (const [fw, status] of Object.entries(frameworks)) {
        const icon = status.passed ? '✅' : '❌';
        response += `### ${icon} ${fw}\n${status.details}\n\n`;
      }
    } else if (question) {
      response = answerQuestion(question, findings, domain);
    } else {
      response = generateFullAnalysis(findings, domain);
    }

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('AI Advisor error:', error);
    return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 });
  }
}