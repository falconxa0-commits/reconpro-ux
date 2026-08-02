import nacl from 'tweetnacl';

// ═══════════════════════════════════════════════════════════════════════
// Sovereign Control Core — Cryptographic Master Key System
// Founder-only Ed25519 authority for platform-level operations
// ═══════════════════════════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────────────────────────

export type SovereignActionType =
  | 'emergency_lockdown'
  | 'global_broadcast'
  | 'override_tenant'
  | 'revoke_all_keys'
  | 'system_maintenance'
  | 'access_grant'
  | 'certification_sign'
  | 'dead_man_switch';

export interface SovereignKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyHex: string;
  secretKeyHex: string;
}

export interface SovereignAction {
  actionId: string;
  actionType: SovereignActionType;
  targetScope: string;
  payload: Record<string, unknown>;
  signature: string;
  publicKey: string;
  executedBy: string;
  executedAt: string;
  ipAddress: string;
  verified: boolean;
}

export interface SovereignActionPayload {
  actionId: string;
  actionType: SovereignActionType;
  targetScope: string;
  payload: Record<string, unknown>;
  executedAt: string;
}

export interface SovereignStatus {
  masterKeyRegistered: boolean;
  lastSovereignAction: SovereignAction | null;
  deadMansSwitchStatus: {
    lastPing: string | null;
    nextDeadline: string;
    triggered: boolean;
    daysRemaining: number;
  };
  activeLockdowns: number;
  systemIntegrity: {
    status: 'ALL_CLEAR' | 'TAMPERING_DETECTED' | 'VERIFICATION_FAILED';
    lastVerified: string;
    method: string;
  };
}

// ── Constants ──────────────────────────────────────────────────────────

/** Dead man's switch threshold in milliseconds (30 days) */
export const DEAD_MANS_SWITCH_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/** All valid sovereign action types */
export const SOVEREIGN_ACTION_TYPES: SovereignActionType[] = [
  'emergency_lockdown',
  'global_broadcast',
  'override_tenant',
  'revoke_all_keys',
  'system_maintenance',
  'access_grant',
  'certification_sign',
  'dead_man_switch',
];

/** Action severity levels for UI rendering */
export const ACTION_SEVERITY: Record<SovereignActionType, 'CRITICAL' | 'HIGH' | 'NORMAL'> = {
  emergency_lockdown: 'CRITICAL',
  global_broadcast: 'HIGH',
  override_tenant: 'HIGH',
  revoke_all_keys: 'CRITICAL',
  system_maintenance: 'NORMAL',
  access_grant: 'NORMAL',
  certification_sign: 'NORMAL',
  dead_man_switch: 'NORMAL',
};

/** Human-readable action type labels */
export const ACTION_LABELS: Record<SovereignActionType, string> = {
  emergency_lockdown: 'Emergency Lockdown',
  global_broadcast: 'Global Broadcast',
  override_tenant: 'Tenant Override',
  revoke_all_keys: 'Revoke All API Keys',
  system_maintenance: 'System Maintenance',
  access_grant: 'Emergency Access Grant',
  certification_sign: 'Certification Signature',
  dead_man_switch: "Dead Man's Switch Ping",
};

/** Human-readable action descriptions */
export const ACTION_DESCRIPTIONS: Record<SovereignActionType, string> = {
  emergency_lockdown: 'Lock all tenant access immediately',
  global_broadcast: 'Send verified message to all dashboards',
  override_tenant: 'Override tenant configuration and access controls',
  revoke_all_keys: 'Invalidate every API key across all tenants',
  system_maintenance: 'Enter platform maintenance mode',
  access_grant: 'Grant emergency access to a specified tenant',
  certification_sign: 'Sign a Genesis Stamp with the sovereign master key',
  dead_man_switch: 'Record a heartbeat to prevent automatic lockdown',
};

// ── In-memory state (demo) ────────────────────────────────────────────

let cachedMasterKeyPair: SovereignKeyPair | null = null;
let inMemoryActionLog: SovereignAction[] = [];
let lastPingTime: Date = new Date();

// ── Master Key Generation ─────────────────────────────────────────────

/**
 * Generate a new Ed25519 keypair for sovereign operations.
 * Returns hex-encoded keys alongside raw Uint8Array keys for signing.
 */
export function generateMasterKeyPair(): SovereignKeyPair {
  const keyPair = nacl.sign.keyPair();
  const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex');
  const secretKeyHex = Buffer.from(keyPair.secretKey).toString('hex');

  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    publicKeyHex,
    secretKeyHex,
  };
}

/**
 * Get or create the singleton master keypair.
 * In production this would load from HSM / KMS / environment.
 */
export function getMasterKeyPair(): SovereignKeyPair {
  if (!cachedMasterKeyPair) {
    cachedMasterKeyPair = generateMasterKeyPair();
  }
  return cachedMasterKeyPair;
}

/**
 * Get the master public key hex (or null if not yet generated).
 */
export function getMasterPublicKey(): string | null {
  return cachedMasterKeyPair?.publicKeyHex ?? null;
}

// ── Action ID Generation ──────────────────────────────────────────────

/**
 * Generate a unique sovereign action ID in SOV-XXXX-XXXX format.
 * Each segment is 4 random hex characters (16 bits of entropy each).
 */
export function generateActionId(): string {
  const seg = (): string =>
    Array.from(crypto.getRandomValues(new Uint8Array(2)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  return `SOV-${seg()}-${seg()}`;
}

// ── Signing & Verification ────────────────────────────────────────────

/**
 * Create a canonical JSON string from a sovereign action payload.
 * Keys are sorted lexicographically for deterministic serialization.
 */
function canonicalJson(payload: SovereignActionPayload): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

/**
 * Sign a sovereign action with the master private key.
 * Returns the base64-encoded Ed25519 detached signature.
 */
export function signSovereignAction(
  action: SovereignActionPayload,
  keyPair?: SovereignKeyPair
): string {
  const kp = keyPair ?? getMasterKeyPair();
  const message = new TextEncoder().encode(canonicalJson(action));
  const signature = nacl.sign.detached(message, kp.secretKey);
  return Buffer.from(signature).toString('base64');
}

/**
 * Verify a sovereign action signature against a public key.
 * Returns true if the signature is valid.
 */
export function verifySovereignAction(
  action: SovereignActionPayload,
  signatureBase64: string,
  publicKeyHex: string
): boolean {
  try {
    const message = new TextEncoder().encode(canonicalJson(action));
    const signature = Uint8Array.from(Buffer.from(signatureBase64, 'base64'));
    const publicKey = Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch {
    return false;
  }
}

/**
 * Build a full SovereignAction record with signing and metadata.
 */
export function buildSovereignAction(
  actionType: SovereignActionType,
  targetScope: string,
  payload: Record<string, unknown>,
  executedBy: string,
  ipAddress: string,
  keyPair?: SovereignKeyPair
): SovereignAction {
  const actionId = generateActionId();
  const executedAt = new Date().toISOString();
  const kp = keyPair ?? getMasterKeyPair();

  const actionPayload: SovereignActionPayload = {
    actionId,
    actionType,
    targetScope,
    payload,
    executedAt,
  };

  const signature = signSovereignAction(actionPayload, kp);

  const action: SovereignAction = {
    actionId,
    actionType,
    targetScope,
    payload,
    signature,
    publicKey: kp.publicKeyHex,
    executedBy,
    executedAt,
    ipAddress,
    verified: verifySovereignAction(actionPayload, signature, kp.publicKeyHex),
  };

  // Append to in-memory log
  inMemoryActionLog.unshift(action);
  if (inMemoryActionLog.length > 200) {
    inMemoryActionLog = inMemoryActionLog.slice(0, 200);
  }

  return action;
}

// ── Dead Man's Switch ─────────────────────────────────────────────────

/**
 * Check whether the dead man's switch should trigger.
 * Returns true if `lastPing` is older than 30 days, meaning no heartbeat
 * has been received within the threshold.
 */
export function checkDeadMansSwitch(lastPing: Date | string | null): boolean {
  if (!lastPing) return true;
  const pingTime = typeof lastPing === 'string' ? new Date(lastPing) : lastPing;
  const elapsed = Date.now() - pingTime.getTime();
  return elapsed > DEAD_MANS_SWITCH_THRESHOLD_MS;
}

/**
 * Get the number of days remaining before the dead man's switch triggers.
 * Returns 0 if already triggered.
 */
export function getDeadMansSwitchDaysRemaining(lastPing: Date | string | null): number {
  if (!lastPing) return 0;
  const pingTime = typeof lastPing === 'string' ? new Date(lastPing) : lastPing;
  const remaining = DEAD_MANS_SWITCH_THRESHOLD_MS - (Date.now() - pingTime.getTime());
  return Math.max(0, remaining / (24 * 60 * 60 * 1000));
}

/**
 * Record a dead man's switch ping. Updates the internal timestamp.
 */
export function recordDeadMansPing(): Date {
  lastPingTime = new Date();
  return lastPingTime;
}

/**
 * Get the last dead man's switch ping timestamp.
 */
export function getLastPingTime(): Date {
  return lastPingTime;
}

// ── Action Log Access ─────────────────────────────────────────────────

/**
 * Retrieve the sovereign action audit trail (most recent first).
 * @param limit Max number of actions to return (default 50)
 */
export function getActionLog(limit: number = 50): SovereignAction[] {
  return inMemoryActionLog.slice(0, limit);
}

/**
 * Seed the action log with historical (simulated) entries for demo purposes.
 */
export function seedDemoActions(): void {
  if (inMemoryActionLog.length > 0) return; // already seeded

  const demoActions: Array<{
    actionType: SovereignActionType;
    targetScope: string;
    payload: Record<string, unknown>;
    executedBy: string;
    ipAddress: string;
    daysAgo: number;
  }> = [
    {
      actionType: 'system_maintenance',
      targetScope: 'platform',
      payload: { reason: 'Scheduled infrastructure upgrade', duration: '2h' },
      executedBy: 'founder',
      ipAddress: '10.0.0.1',
      daysAgo: 28,
    },
    {
      actionType: 'certification_sign',
      targetScope: 'tenant:acme-corp',
      payload: { stampId: 'GS-A1B2-C3D4-E5F6', domain: 'acme-corp.com', score: 92 },
      executedBy: 'founder',
      ipAddress: '10.0.0.1',
      daysAgo: 25,
    },
    {
      actionType: 'access_grant',
      targetScope: 'tenant:global-sec',
      payload: { tenantId: 'tnt_789', reason: 'Emergency incident response', ttl: '24h' },
      executedBy: 'founder',
      ipAddress: '10.0.0.1',
      daysAgo: 20,
    },
    {
      actionType: 'global_broadcast',
      targetScope: 'all_tenants',
      payload: { message: 'Scheduled maintenance window: 2025-01-15 02:00–04:00 UTC', priority: 'high' },
      executedBy: 'founder',
      ipAddress: '10.0.0.1',
      daysAgo: 15,
    },
    {
      actionType: 'dead_man_switch',
      targetScope: 'platform',
      payload: { source: 'cron', method: 'automated' },
      executedBy: 'founder',
      ipAddress: '10.0.0.1',
      daysAgo: 10,
    },
    {
      actionType: 'override_tenant',
      targetScope: 'tenant:demo-org',
      payload: { reason: 'Security incident — unauthorized access detected', lockTenant: true },
      executedBy: 'founder',
      ipAddress: '10.0.0.1',
      daysAgo: 7,
    },
    {
      actionType: 'revoke_all_keys',
      targetScope: 'tenant:breached-llc',
      payload: { reason: 'Credential compromise confirmed', keysRevoked: 47 },
      executedBy: 'founder',
      ipAddress: '10.0.0.1',
      daysAgo: 3,
    },
    {
      actionType: 'emergency_lockdown',
      targetScope: 'platform',
      payload: { reason: 'Active intrusion detected — origin: 198.51.100.0/24', duration: 'until_manual_release' },
      executedBy: 'founder',
      ipAddress: '10.0.0.1',
      daysAgo: 1,
    },
  ];

  const kp = getMasterKeyPair();

  for (const demo of demoActions) {
    const actionId = generateActionId();
    const executedAt = new Date(Date.now() - demo.daysAgo * 86400000).toISOString();

    const actionPayload: SovereignActionPayload = {
      actionId,
      actionType: demo.actionType,
      targetScope: demo.targetScope,
      payload: demo.payload,
      executedAt,
    };

    const signature = signSovereignAction(actionPayload, kp);

    inMemoryActionLog.push({
      actionId,
      actionType: demo.actionType,
      targetScope: demo.targetScope,
      payload: demo.payload,
      signature,
      publicKey: kp.publicKeyHex,
      executedBy: demo.executedBy,
      executedAt,
      ipAddress: demo.ipAddress,
      verified: verifySovereignAction(actionPayload, signature, kp.publicKeyHex),
    });
  }

  // Sort most recent first
  inMemoryActionLog.sort(
    (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
  );
}
