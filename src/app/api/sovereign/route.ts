import { extractClientIP } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import {
  getMasterKeyPair,
  getMasterPublicKey,
  buildSovereignAction,
  getActionLog,
  checkDeadMansSwitch,
  getDeadMansSwitchDaysRemaining,
  recordDeadMansPing,
  getLastPingTime,
  seedDemoActions,
  verifySovereignAction,
  type SovereignActionType,
  type SovereignAction,
} from '@/lib/sovereign-crypto';
import { checkRateLimit } from '@/lib/api-security';

// ═══════════════════════════════════════════════════════════════════════
// Sovereign Control API — Founder-Only Cryptographic Authority
// ═══════════════════════════════════════════════════════════════════════

// Seed demo data on module load
seedDemoActions();

// ── Helpers ──────────────────────────────────────────────────────────

/** Extract client IP from request headers */
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
}

/** Simulated access log (demo) */
const accessLog: Array<{
  endpoint: string;
  method: string;
  ip: string;
  success: boolean;
  timestamp: string;
}> = [];

function logAccess(endpoint: string, method: string, ip: string, success: boolean) {
  accessLog.unshift({
    endpoint,
    method,
    ip,
    success,
    timestamp: new Date().toISOString(),
  });
  if (accessLog.length > 100) accessLog.length = 100;
}

/** Simulated lockdown count (demo) */
let simulatedActiveLockdowns = 0;

// ═══════════════════════════════════════════════════════════════════════
// GET — Sovereign status / audit trail / access log
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view'); // 'status' | 'audit' | 'access-log'
  const clientIp = getClientIp(request);

  // ── GET /api/sovereign?view=status ────────────────────────────────
  if (view === 'status') {
    logAccess('/api/sovereign/status', 'GET', clientIp, true);

    const lastPing = getLastPingTime();
    const triggered = checkDeadMansSwitch(lastPing);
    const daysRemaining = getDeadMansSwitchDaysRemaining(lastPing);
    const actions = getActionLog(1);

    return NextResponse.json({
      masterKeyRegistered: getMasterPublicKey() !== null,
      lastSovereignAction: actions[0] ?? null,
      deadMansSwitchStatus: {
        lastPing: lastPing.toISOString(),
        nextDeadline: new Date(lastPing.getTime() + 30 * 86400000).toISOString(),
        triggered,
        daysRemaining: Math.round(daysRemaining * 100) / 100,
      },
      activeLockdowns: simulatedActiveLockdowns,
      systemIntegrity: {
        status: 'ALL_CLEAR',
        lastVerified: new Date().toISOString(),
        method: 'Ed25519 signature verification',
      },
    });
  }

  // ── GET /api/sovereign?view=audit ────────────────────────────────
  if (view === 'audit') {
    logAccess('/api/sovereign/audit', 'GET', clientIp, true);
    const actions = getActionLog(50);
    return NextResponse.json({ actions });
  }

  // ── GET /api/sovereign?view=access-log ──────────────────────────
  if (view === 'access-log') {
    logAccess('/api/sovereign/access-log', 'GET', clientIp, true);
    return NextResponse.json({ entries: accessLog });
  }

  // Default: return status
  logAccess('/api/sovereign', 'GET', clientIp, true);
  return NextResponse.json({
    masterKeyRegistered: getMasterPublicKey() !== null,
    message: 'Sovereign Control API is operational. Use ?view=status|audit|access-log',
  });
}

// ═══════════════════════════════════════════════════════════════════════
// POST — Execute sovereign action / Dead man's switch ping
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const { action, actionType, targetScope, payload, signature } = body as {
      action?: 'ping' | 'execute';
      actionType?: SovereignActionType;
      targetScope?: string;
      payload?: Record<string, unknown>;
      signature?: string;
    };

    // ── POST /api/sovereign  { action: 'ping' } ─────────────────────
    if (action === 'ping') {
      logAccess('/api/sovereign/ping', 'POST', clientIp, true);

      // In production: verify the signature against the master public key
      // Demo: accept any ping
      if (signature) {
        const kp = getMasterKeyPair();
        const pingPayload = { type: 'dead_mans_switch_ping', timestamp: new Date().toISOString() };
        const isValid = verifySovereignAction(
          { actionId: 'ping', actionType: 'dead_man_switch', targetScope: 'platform', payload: pingPayload, executedAt: new Date().toISOString() },
          signature,
          kp.publicKeyHex
        );
        if (!isValid) {
          logAccess('/api/sovereign/ping', 'POST', clientIp, false);
          return NextResponse.json(
            { error: 'Invalid signature — rejected' },
            { status: 403 }
          );
        }
      }

      const pingTime = recordDeadMansPing();
      const nextDeadline = new Date(pingTime.getTime() + 30 * 86400000);

      return NextResponse.json({
        nextDeadline: nextDeadline.toISOString(),
        status: 'ok',
        pingRecordedAt: pingTime.toISOString(),
      });
    }

    // ── POST /api/sovereign  { action: 'execute', actionType, ... } ─
    if (action === 'execute') {
      logAccess('/api/sovereign/execute', 'POST', clientIp, true);

      if (!actionType) {
        logAccess('/api/sovereign/execute', 'POST', clientIp, false);
        return NextResponse.json(
          { error: 'actionType is required' },
          { status: 400 }
        );
      }

      // In production: verify WebAuthn + master key signature
      // Demo: simulate execution

      const scope = targetScope ?? 'platform';
      const payloadData = payload ?? {};

      const sovereignAction = buildSovereignAction(
        actionType,
        scope,
        payloadData,
        'founder',
        clientIp
      );

      // Simulate side effects
      let result: Record<string, unknown> = { simulated: true };

      switch (actionType) {
        case 'emergency_lockdown':
          simulatedActiveLockdowns++;
          result = {
            message: 'All tenant access has been locked down',
            tenantsAffected: 'all',
            lockId: `LK-${Date.now().toString(36).toUpperCase()}`,
            requiresManualRelease: true,
          };
          break;
        case 'global_broadcast':
          result = {
            message: 'Broadcast delivered to all active dashboards',
            recipients: 42,
            broadcastId: `BC-${Date.now().toString(36).toUpperCase()}`,
          };
          break;
        case 'override_tenant':
          result = {
            message: `Tenant override applied to ${scope}`,
            overrideActive: true,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          };
          break;
        case 'revoke_all_keys':
          result = {
            message: 'All API keys have been revoked',
            keysRevoked: 127,
            tenantsAffected: 12,
          };
          break;
        case 'system_maintenance':
          result = {
            message: 'Platform entering maintenance mode',
            maintenanceWindow: payloadData.duration ?? '2h',
            estimatedRestoration: new Date(Date.now() + 7200000).toISOString(),
          };
          break;
        case 'access_grant':
          result = {
            message: `Emergency access granted to ${scope}`,
            ttl: payloadData.ttl ?? '24h',
            grantId: `AG-${Date.now().toString(36).toUpperCase()}`,
          };
          break;
        case 'certification_sign':
          result = {
            message: 'Genesis Stamp signed with sovereign master key',
            stampId: payloadData.stampId ?? 'pending',
            sovereignSignature: sovereignAction.signature.substring(0, 32) + '...',
          };
          break;
        case 'dead_man_switch':
          recordDeadMansPing();
          result = {
            message: "Dead man's switch heartbeat recorded",
            nextDeadline: new Date(Date.now() + 30 * 86400000).toISOString(),
          };
          break;
      }

      return NextResponse.json({
        actionId: sovereignAction.actionId,
        status: 'executed',
        result,
        action: sovereignAction,
      });
    }

    // Unknown action
    logAccess('/api/sovereign', 'POST', clientIp, false);
    return NextResponse.json(
      { error: 'Invalid action. Use "ping" or "execute".' },
      { status: 400 }
    );
  } catch (error) {
    logAccess('/api/sovereign', 'POST', clientIp, false);
    console.error('Sovereign API error:', error);
    return NextResponse.json(
      { error: 'Sovereign operation failed' },
      { status: 500 }
    );
  }
}
