// ─── Email Harvesting & Verification ───────────────────────────
// Discovers email addresses via MX records, pattern generation,
// SMTP VRFY verification, and SPF/DMARC cross-referencing.
// Email is the #1 initial attack vector in social engineering.

import dns from 'dns/promises';
import net from 'net';
import type { ReconFinding } from './types';

// ── Types ──────────────────────────────────────────────────────

export interface EmailEntry {
  address: string;
  source: string;        // mx, pattern, smtp
  verified: boolean | null; // true=exists, false=not found, null=unknown
}

export interface EmailResult {
  domain: string;
  mxRecords: { exchange: string; priority: number }[];
  emails: EmailEntry[];
  spfParsed?: { includes: string[]; redirect?: string };
  dmarcParsed?: { rua?: string; ruf?: string; policy?: string; pct?: number };
  findings: ReconFinding[];
}

// ── SMTP VRFY ──────────────────────────────────────────────────

function smtpVerify(
  mxHost: string,
  email: string,
  timeoutMs = 5000,
): Promise<boolean | null> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let buffer = '';
    let done = false;
    const markDone = (value: boolean | null) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        socket.destroy();
        resolve(value);
      }
    };

    const timer = setTimeout(() => markDone(null), timeoutMs);

    socket.connect(25, mxHost, () => {
      // Wait for SMTP greeting, then send EHLO
      buffer = '';
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\r\n');

      // Process complete lines (keep last potentially incomplete line in buffer)
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const code = parseInt(line.slice(0, 3), 10);

        // Greeting line (220) → send EHLO
        if (code === 220) {
          socket.write('EHLO reconpro.scanner\r\n');
          buffer = '';
        }
        // EHLO response complete (last line has no hyphen after code)
        else if (line.length >= 4 && /^[2-4]\d{2} /.test(line)) {
          if (code === 250) {
            // Send VRFY
            socket.write(`VRFY <${email}>\r\n`);
          } else {
            markDone(null);
          }
          buffer = '';
        }
        // VRFY response
        else if (
          line.length >= 4 &&
          /^[2-5]\d{2} /.test(line) &&
          !buffer.includes('EHLO') &&
          !buffer.includes('reconpro')
        ) {
          if (code === 250 || code === 252) {
            markDone(true);
          } else if (code === 550 || code === 551 || code === 553) {
            markDone(false);
          } else if (
            line.toLowerCase().includes('command not recognized') ||
            line.toLowerCase().includes('unknown command') ||
            line.toLowerCase().includes('not implemented') ||
            code === 502 ||
            code === 500
          ) {
            // VRFY disabled — treat as unknown, not "not found"
            markDone(null);
          } else {
            markDone(null);
          }
          buffer = '';
        }
      }
    });

    socket.on('error', () => markDone(null));
    socket.on('close', () => markDone(null));
  });
}

// ── SPF Parsing ────────────────────────────────────────────────

function parseSPF(txtRecords: string[]): { includes: string[]; redirect?: string } | undefined {
  const spfRecord = txtRecords
    .map(r => r.toLowerCase())
    .find(r => r.startsWith('v=spf1'));

  if (!spfRecord) return undefined;

  const includes: string[] = [];
  let redirect: string | undefined;

  // Match include:_domain.com and redirect=_domain.com
  const includeMatches = spfRecord.matchAll(/include:([\w.-]+)/g);
  for (const m of includeMatches) {
    includes.push(m[1]);
  }

  const redirectMatch = spfRecord.match(/redirect=([\w.-]+)/);
  if (redirectMatch) {
    redirect = redirectMatch[1];
  }

  return { includes, redirect };
}

// ── DMARC Parsing ──────────────────────────────────────────────

function parseDMARC(dmarcTxt: string): { rua?: string; ruf?: string; policy?: string; pct?: number } | undefined {
  if (!dmarcTxt.toLowerCase().includes('v=dmarc1')) return undefined;

  const result: { rua?: string; ruf?: string; policy?: string; pct?: number } = {};

  const policyMatch = dmarcTxt.match(/;?\s*p=([\w]+)/i);
  if (policyMatch) result.policy = policyMatch[1].toLowerCase();

  const ruaMatch = dmarcTxt.match(/;?\s*rua=([^;\s]+)/i);
  if (ruaMatch) result.rua = ruaMatch[1];

  const rufMatch = dmarcTxt.match(/;?\s*ruf=([^;\s]+)/i);
  if (rufMatch) result.ruf = rufMatch[1];

  const pctMatch = dmarcTxt.match(/;?\s*pct=(\d+)/i);
  if (pctMatch) result.pct = parseInt(pctMatch[1], 10);

  return result;
}

// ── Main Function ──────────────────────────────────────────────

export async function harvestEmails(domain: string): Promise<EmailResult> {
  const findings: ReconFinding[] = [];
  let mxRecords: { exchange: string; priority: number }[] = [];

  // ── 1. MX Record Lookup ──
  try {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '9.9.9.9']);

    mxRecords = await Promise.race([
      resolver.resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MX lookup timeout')), 5000),
      ),
    ]);

    if (mxRecords.length > 0) {
      const sortedExchanges = [...mxRecords].sort((a, b) => a.priority - b.priority);
      findings.push({
        title: `${mxRecords.length} MX Record(s) Found`,
        severity: 'info',
        category: 'email',
        description: `The domain ${domain} has ${mxRecords.length} mail exchange server(s) configured. Mail servers are prime targets for phishing campaigns, email spoofing, and credential harvesting. Verify SPF, DKIM, and DMARC policies are properly enforced.`,
        evidence: sortedExchanges.map(e => `${e.exchange} (priority: ${e.priority})`).join(', '),
        asset: domain,
        source: 'email',
      });
    }
  } catch {
    // No MX records — check if A record exists (domain might accept mail directly)
    let hasA = false;
    try {
      const resolver = new dns.Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1']);
      await Promise.race([
        resolver.resolve4(domain),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('A lookup timeout')), 3000),
        ),
      ]);
      hasA = true;
    } catch { /* no A record either */ }

    findings.push({
      title: 'No MX Records Configured',
      severity: hasA ? 'low' : 'info',
      category: 'email',
      description: hasA
        ? `No MX records are configured for ${domain}, but an A record exists. The domain may accept email directly via its A record, which can lead to inconsistent mail delivery and bypasses standard mail routing policies.`
        : `No MX records are configured for ${domain} and no A record was found. This domain cannot receive email.`,
      evidence: null,
      asset: domain,
      source: 'email',
    });
  }

  // ── 2. Common Email Pattern Generation ──
  const commonPrefixes = [
    'admin', 'info', 'support', 'security', 'abuse',
    'postmaster', 'noreply', 'root', 'webmaster', 'hostmaster',
  ];

  const emails: EmailEntry[] = [];

  // Add MX-source emails (common prefixes)
  for (const prefix of commonPrefixes) {
    emails.push({
      address: `${prefix}@${domain}`,
      source: 'pattern',
      verified: null,
    });
  }

  // If MX records exist, mark pattern emails as MX-sourced
  if (mxRecords.length > 0) {
    for (const email of emails) {
      if (email.source === 'pattern') email.source = 'mx';
    }
  }

  // ── 3. SMTP VRFY Verification ──
  if (mxRecords.length > 0) {
    // Sort by priority (lowest = highest priority)
    const sortedMX = [...mxRecords].sort((a, b) => a.priority - b.priority);
    const primaryMX = sortedMX[0].exchange;

    // Verify first few pattern emails via SMTP (limit to avoid rate limiting / blocking)
    const emailsToVerify = emails.slice(0, 5);
    const verifyResults = await Promise.allSettled(
      emailsToVerify.map(e => smtpVerify(primaryMX, e.address, 5000)),
    );

    for (let i = 0; i < verifyResults.length; i++) {
      const r = verifyResults[i];
      if (r.status === 'fulfilled') {
        emails[i].verified = r.value;
        emails[i].source = 'smtp';
      }
    }
  }

  // Count verified/pattern emails
  const discoveredEmails = emails.length;
  if (discoveredEmails > 0) {
    findings.push({
      title: `${discoveredEmails} Email Address(es) Discovered via Patterns`,
      severity: 'info',
      category: 'email',
      description: `${discoveredEmails} likely email addresses were generated based on common naming conventions and role-based patterns. These represent potential targets for social engineering, credential stuffing, and phishing campaigns.`,
      evidence: emails.map(e => e.address).join(', '),
      asset: domain,
      source: 'email',
    });
  }

  // ── 4. SPF/DMARC Analysis ──
  let spfParsed: EmailResult['spfParsed'];
  let dmarcParsed: EmailResult['dmarcParsed'];

  try {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);

    const txtRecords = await Promise.race([
      resolver.resolveTxt(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TXT lookup timeout')), 5000),
      ),
    ]);

    const txtValues = txtRecords.map(r => r.join(''));

    // Parse SPF
    spfParsed = parseSPF(txtValues);
    if (spfParsed && spfParsed.includes.length > 0) {
      findings.push({
        title: `SPF Includes ${spfParsed.includes.length} Third-Party Service(s)`,
        severity: 'medium',
        category: 'email',
        description: `The SPF record for ${domain} includes ${spfParsed.includes.length} third-party service(s): ${spfParsed.includes.join(', ')}. Each included service expands the trust chain — a compromise at any included service could allow spoofing from that service. Audit each inclusion for necessity.`,
        evidence: `include: ${spfParsed.includes.join(', ')}${spfParsed.redirect ? ` | redirect: ${spfParsed.redirect}` : ''}`,
        asset: domain,
        source: 'email',
      });
    }

    // Parse DMARC
    try {
      const dmarcRecords = await Promise.race([
        resolver.resolveTxt(`_dmarc.${domain}`),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('DMARC lookup timeout')), 5000),
        ),
      ]);

      const dmarcTxt = dmarcRecords.map(r => r.join('')).join(' ');
      dmarcParsed = parseDMARC(dmarcTxt);

      if (dmarcParsed) {
        if (dmarcParsed.policy === 'none') {
          findings.push({
            title: 'DMARC Policy is "none" (No Enforcement)',
            severity: 'high',
            category: 'email',
            description: `The DMARC policy for ${domain} is set to "none", which means no action is taken on emails that fail DMARC authentication. Attackers can spoof emails from this domain with impunity. Change to p=quarantine or p=reject.`,
            evidence: `p=none${dmarcParsed.pct !== undefined ? ` | pct=${dmarcParsed.pct}` : ''}`,
            asset: domain,
            source: 'email',
          });
        }
      } else {
        findings.push({
          title: 'No DMARC Record Found',
          severity: 'critical',
          category: 'email',
          description: `No DMARC record was found for ${domain}. Without DMARC, the domain is fully vulnerable to email spoofing and phishing attacks. Attackers can forge emails appearing to come from this domain. Implement DMARC immediately with at least p=quarantine.`,
          evidence: null,
          asset: `_dmarc.${domain}`,
          source: 'email',
        });
      }
    } catch {
      // DMARC lookup failed
      findings.push({
        title: 'No DMARC Record Found',
        severity: 'critical',
        category: 'email',
        description: `No DMARC record was found for ${domain}. Without DMARC, the domain is fully vulnerable to email spoofing and phishing attacks. Implement DMARC immediately with at least p=quarantine.`,
        evidence: null,
        asset: `_dmarc.${domain}`,
        source: 'email',
      });
    }
  } catch {
    // TXT record lookup failed — SPF/DMARC analysis skipped
  }

  return {
    domain,
    mxRecords: mxRecords.map(r => ({ exchange: r.exchange, priority: r.priority })),
    emails,
    spfParsed,
    dmarcParsed,
    findings,
  };
}

export { type ReconFinding };
