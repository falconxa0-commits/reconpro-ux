// ═══════════════════════════════════════════════════════════════════════
// Echo-Sign Global Sovereign Broadcast Protocol
// Multi-channel communications engine for cryptographically signed
// security bulletins — Ed25519 via tweetnacl
// ═══════════════════════════════════════════════════════════════════════

import nacl from 'tweetnacl';

// ── Types ──────────────────────────────────────────────────────────────

export type BroadcastPriority = 'INFO' | 'WARNING' | 'CRITICAL' | 'SOVEREIGN';
export type BroadcastChannel = 'cli' | 'web' | 'email' | 'slack' | 'pagerduty' | 'webhook';
export type TargetScope = 'all' | 'enterprise' | 'government';

export interface BroadcastMessage {
  id: string;
  priority: BroadcastPriority;
  title: string;
  body: string;
  channel: BroadcastChannel;
  signature: string;
  publicKey: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string;
  verified: boolean;
  targetScope: TargetScope;
}

export interface BroadcastKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyHex: string;
  secretKeyHex: string;
}

export interface ChannelConfig {
  channel: BroadcastChannel;
  label: string;
  maxLength: number;
  format: 'plain' | 'markdown' | 'json';
  rateLimitPerMinute: number;
  icon: string;
}

export interface BroadcastTemplate {
  id: string;
  label: string;
  priority: BroadcastPriority;
  channel: BroadcastChannel;
  targetScope: TargetScope;
  title: string;
  body: string;
  expiresInHours: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// ── Broadcast ID Generator ─────────────────────────────────────────────

export function generateBroadcastId(): string {
  const block1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const block2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BC-${block1}-${block2}`;
}

// ── Key Management ─────────────────────────────────────────────────────

let masterKeyPair: BroadcastKeyPair | null = null;

export function getMasterKeyPair(): BroadcastKeyPair {
  if (masterKeyPair) return masterKeyPair;
  const keyPair = nacl.sign.keyPair();
  masterKeyPair = {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    publicKeyHex: toHex(keyPair.publicKey),
    secretKeyHex: toHex(keyPair.secretKey),
  };
  return masterKeyPair;
}

// ── Sign & Verify ──────────────────────────────────────────────────────

export function signBroadcast(
  message: Omit<BroadcastMessage, 'id' | 'signature' | 'publicKey' | 'issuedAt' | 'verified'>,
  keyPair?: BroadcastKeyPair
): BroadcastMessage {
  const kp = keyPair ?? getMasterKeyPair();
  const id = generateBroadcastId();
  const issuedAt = new Date().toISOString();

  const payload = JSON.stringify({
    id,
    priority: message.priority,
    title: message.title,
    body: message.body,
    channel: message.channel,
    issuedBy: message.issuedBy,
    issuedAt,
    expiresAt: message.expiresAt,
    targetScope: message.targetScope,
  });

  const msgBytes = new TextEncoder().encode(payload);
  const signatureBytes = nacl.sign.detached(msgBytes, kp.secretKey);

  return {
    id,
    priority: message.priority,
    title: message.title,
    body: message.body,
    channel: message.channel,
    signature: toHex(signatureBytes),
    publicKey: kp.publicKeyHex,
    issuedBy: message.issuedBy,
    issuedAt,
    expiresAt: message.expiresAt,
    verified: true,
    targetScope: message.targetScope,
  };
}

export function verifyBroadcast(message: BroadcastMessage): boolean {
  try {
    const payload = JSON.stringify({
      id: message.id,
      priority: message.priority,
      title: message.title,
      body: message.body,
      channel: message.channel,
      issuedBy: message.issuedBy,
      issuedAt: message.issuedAt,
      expiresAt: message.expiresAt,
      targetScope: message.targetScope,
    });
    const msgBytes = new TextEncoder().encode(payload);
    const sigBytes = fromHex(message.signature);
    const pubBytes = fromHex(message.publicKey);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes);
  } catch {
    return false;
  }
}

// ── Channel Configuration ──────────────────────────────────────────────

export const CHANNEL_CONFIG: Record<BroadcastChannel, ChannelConfig> = {
  cli: {
    channel: 'cli',
    label: 'CLI Terminal',
    maxLength: 500,
    format: 'plain',
    rateLimitPerMinute: 30,
    icon: 'terminal',
  },
  web: {
    channel: 'web',
    label: 'Web Banner',
    maxLength: 2000,
    format: 'markdown',
    rateLimitPerMinute: 10,
    icon: 'globe',
  },
  email: {
    channel: 'email',
    label: 'Email Alert',
    maxLength: 5000,
    format: 'markdown',
    rateLimitPerMinute: 5,
    icon: 'mail',
  },
  slack: {
    channel: 'slack',
    label: 'Slack Notification',
    maxLength: 3000,
    format: 'markdown',
    rateLimitPerMinute: 20,
    icon: 'hash',
  },
  pagerduty: {
    channel: 'pagerduty',
    label: 'PagerDuty',
    maxLength: 1000,
    format: 'plain',
    rateLimitPerMinute: 2,
    icon: 'bell',
  },
  webhook: {
    channel: 'webhook',
    label: 'Webhook',
    maxLength: 10000,
    format: 'json',
    rateLimitPerMinute: 15,
    icon: 'webhook',
  },
};

// ── Broadcast Templates ────────────────────────────────────────────────

export const BROADCAST_TEMPLATES: BroadcastTemplate[] = [
  {
    id: 'tmpl-zero-day',
    label: 'Zero-Day Disclosure',
    priority: 'SOVEREIGN',
    channel: 'web',
    targetScope: 'all',
    title: '[ZERO-DAY] Critical Vulnerability Disclosure',
    body: `A critical zero-day vulnerability has been identified and verified by the ReconPro Security Research Division.

**CVE Reference**: Pending assignment
**Affected Systems**: Under investigation
**Severity**: CVSS 9.8+ (Critical)

All tenants should immediately review their attack surface and apply emergency mitigations as they become available. Signed bulletins with patch coordinates will follow within 24 hours.

Do NOT disclose externally until the coordinated disclosure window closes.`,
    expiresInHours: 72,
  },
  {
    id: 'tmpl-maintenance',
    label: 'Platform Maintenance',
    priority: 'INFO',
    channel: 'web',
    targetScope: 'all',
    title: 'Scheduled Platform Maintenance Window',
    body: `ReconPro will undergo scheduled maintenance to upgrade scanning infrastructure and apply security patches.

**Window**: See scheduled time
**Expected Duration**: 2-4 hours
**Impact**: Scans may be queued during the window

All in-flight scans will be preserved and resumed automatically. No data loss is expected.`,
    expiresInHours: 48,
  },
  {
    id: 'tmpl-emergency-patch',
    label: 'Emergency Patch Required',
    priority: 'CRITICAL',
    channel: 'email',
    targetScope: 'enterprise',
    title: '[EMERGENCY PATCH] Immediate Action Required',
    body: `An emergency security patch has been released addressing a high-severity vulnerability in the scanning pipeline.

**Patch ID**: EP-XXXX
**Severity**: High
**Action Required**: All enterprise tenants must update within 24 hours

Failure to patch may result in incomplete scan coverage. Contact support for assisted patching.`,
    expiresInHours: 48,
  },
  {
    id: 'tmpl-threat-advisory',
    label: 'Threat Advisory',
    priority: 'WARNING',
    channel: 'slack',
    targetScope: 'all',
    title: 'Threat Advisory: Active Campaign Detected',
    body: `The ReconPro Threat Intelligence team has detected an active adversarial campaign targeting organizations in your sector.

**Threat Actor**: Tracked cluster
**TTPs**: Credential stuffing, API abuse, recon scanning
**Indicators**: Available in the Threat Intelligence feed

Review your exposure dashboard immediately and ensure all high-finding assets are addressed.`,
    expiresInHours: 168,
  },
];

// ── In-Memory Broadcast Store ──────────────────────────────────────────

const broadcastStore: Map<string, BroadcastMessage> = new Map();
let seeded = false;

function addBroadcast(msg: BroadcastMessage): void {
  broadcastStore.set(msg.id, msg);
}

export function getAllBroadcasts(): BroadcastMessage[] {
  return Array.from(broadcastStore.values()).sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );
}

export function getBroadcastById(id: string): BroadcastMessage | undefined {
  return broadcastStore.get(id);
}

export function getActiveBroadcasts(): BroadcastMessage[] {
  const now = new Date();
  return getAllBroadcasts().filter((b) => new Date(b.expiresAt) > now);
}

export function storeBroadcast(msg: BroadcastMessage): BroadcastMessage {
  addBroadcast(msg);
  return msg;
}

// ── Seed Demo Broadcasts ───────────────────────────────────────────────

export function seedDemoBroadcasts(): BroadcastMessage[] {
  if (seeded) return getAllBroadcasts();
  seeded = true;

  const now = Date.now();
  const hour = 3600_000;
  const kp = getMasterKeyPair();

  const demos: Omit<BroadcastMessage, 'id' | 'signature' | 'publicKey' | 'issuedAt' | 'verified'>[] = [
    {
      priority: 'SOVEREIGN',
      title: '[ZERO-DAY] CVE-2025-0001: RCE in Core Scanning Pipeline',
      body: 'Critical remote code execution vulnerability discovered in the core scanning pipeline. All tenants must cease automated scans immediately until patch EP-0091 is applied. Coordinated disclosure with vendor in progress.',
      channel: 'web',
      issuedBy: 'sovereign-root@reconpro.io',
      expiresAt: new Date(now + 72 * hour).toISOString(),
      targetScope: 'all',
    },
    {
      priority: 'CRITICAL',
      title: 'Emergency Patch EP-0091 Released',
      body: 'Emergency patch addressing CVE-2025-0001 is now available. All enterprise tenants must apply within 24 hours. Government tenants have 12 hours. Patch includes memory safety fixes and input validation hardening.',
      channel: 'email',
      issuedBy: 'security-ops@reconpro.io',
      expiresAt: new Date(now + 48 * hour).toISOString(),
      targetScope: 'enterprise',
    },
    {
      priority: 'WARNING',
      title: 'Threat Advisory: APT-RECON Active Campaign',
      body: 'Active adversarial campaign detected targeting ReconPro tenants in the financial sector. TTPs include credential stuffing and API token harvesting. Rotate all API keys immediately and enable MFA.',
      channel: 'slack',
      issuedBy: 'threat-intel@reconpro.io',
      expiresAt: new Date(now + 168 * hour).toISOString(),
      targetScope: 'all',
    },
    {
      priority: 'INFO',
      title: 'Scheduled Maintenance: Scan Infrastructure Upgrade',
      body: 'Scan infrastructure upgrade scheduled. Expected downtime: 2 hours. All queued scans will be preserved and auto-resumed.',
      channel: 'web',
      issuedBy: 'platform-ops@reconpro.io',
      expiresAt: new Date(now + 24 * hour).toISOString(),
      targetScope: 'all',
    },
    {
      priority: 'CRITICAL',
      title: 'Certificate Authority Rotation Imminent',
      body: 'Platform TLS certificates will be rotated in 6 hours. All webhook integrations must update their CA pinning. Failure to update will result in webhook delivery failures.',
      channel: 'webhook',
      issuedBy: 'infra-security@reconpro.io',
      expiresAt: new Date(now + 12 * hour).toISOString(),
      targetScope: 'enterprise',
    },
    {
      priority: 'WARNING',
      title: 'Rate Limit Policy Update Effective Immediately',
      body: 'API rate limits have been adjusted for the threat-advisory tier. Enterprise tenants: 500 req/min. Government tenants: unlimited. Review your integration dashboards.',
      channel: 'cli',
      issuedBy: 'api-gateway@reconpro.io',
      expiresAt: new Date(now + 72 * hour).toISOString(),
      targetScope: 'all',
    },
    {
      priority: 'INFO',
      title: 'New Compliance Framework Templates Available',
      body: 'SOC 2 Type II, HIPAA, and FedRAMP High baseline templates are now available in the compliance module. Apply via the compliance panel to auto-map controls.',
      channel: 'slack',
      issuedBy: 'compliance-team@reconpro.io',
      expiresAt: new Date(now + 168 * hour).toISOString(),
      targetScope: 'enterprise',
    },
    {
      priority: 'SOVEREIGN',
      title: '[SOVEREIGN] Global Platform Lockdown Authority Invoked',
      body: 'Sovereign root authority has invoked global lockdown. All tenant operations are paused pending security clearance review. This is a drill — no actual threat is active. Expected duration: 15 minutes.',
      channel: 'pagerduty',
      issuedBy: 'sovereign-root@reconpro.io',
      expiresAt: new Date(now + 1 * hour).toISOString(),
      targetScope: 'government',
    },
    {
      priority: 'WARNING',
      title: 'Anomalous API Traffic Pattern Detected',
      body: 'Machine learning models have detected anomalous API consumption patterns from 3 tenant accounts. Accounts have been flagged for review. If this is expected activity, contact security.',
      channel: 'email',
      issuedBy: 'ml-detection@reconpro.io',
      expiresAt: new Date(now + 48 * hour).toISOString(),
      targetScope: 'all',
    },
    {
      priority: 'INFO',
      title: 'ReconPro v4.2 Feature Release Notes',
      body: 'v4.2 includes: Echo-Sign Broadcast Protocol, enhanced PQC vault, improved CNI sentinel rules, and new attack surface mapping. Review changelog for full details.',
      channel: 'web',
      issuedBy: 'product@reconpro.io',
      expiresAt: new Date(now + 336 * hour).toISOString(),
      targetScope: 'all',
    },
  ];

  const created: BroadcastMessage[] = [];
  for (let i = 0; i < demos.length; i++) {
    const d = demos[i];
    const msg = signBroadcast(d, kp);
    // Override issuedAt to stagger them
    const stamped = { ...msg, issuedAt: new Date(now - (demos.length - i) * hour * 2).toISOString() };
    addBroadcast(stamped);
    created.push(stamped);
  }

  return created;
}
