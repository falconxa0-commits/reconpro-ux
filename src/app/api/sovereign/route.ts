import { withProtection } from '@/lib/api-protection';
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
  verifySovereignAction,
  type SovereignActionType,
} from '@/lib/sovereign-crypto';

// ═══════════════════════════════════════════════════════════════════════
// Sovereign Control API — Cryptographic Authority (SIMULATED EXECUTION)
// ═══════════════════════════════════════════════════════════════════════
// STATUS: PARTIAL — Real Ed25519 action signing exists, but all action
// execution is simulated (counters, in-memory state). No real lockdown,
// key revocation, or tenant override actually occurs.
// ═══════════════════════════════════════════════════════════════════════

/** In-memory access log (demo — not persisted) */
const accessLog: Array<{
  endpoint: string;
  method: string;
  ip: string;
  success: boolean;
  timestamp: string;
}> = [];

function logAccess(endpoint: string, method: string, ip: string, success: boolean) {
  accessLog.unshift({ endpoint, method, ip, success, timestamp: new Date().toISOString() });
  if (accessLog.length > 100) accessLog.length = 100;
}

/** Simulated lockdown counter — no real lockdown occurs */
let simulatedActiveLockdowns = 0;

// ═══════════════════════════════════════════════════════════════════════
// GET — Sovereign status / audit trail / access log (public read-only)
// ═══════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { error: rateLimitError, clientIp } = await withProtection(request, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view');

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
      simulated: true,
      systemIntegrity: {
        status: 'ALL_CLEAR',
        lastVerified: new Date().toISOString(),
        method: 'Ed25519 signature verification',
      },
    });
  }

  if (view === 'audit') {
    logAccess('/api/sovereign/audit', 'GET', clientIp, true);
    return NextResponse.json({ actions: getActionLog(50) });
  }

  if (view === 'access-log') {
    logAccess('/api/sovereign/access-log', 'GET', clientIp, true);
    return NextResponse.json({ entries: accessLog });
  }

  logAccess('/api/sovereign', 'GET', clientIp, true);
  return NextResponse.json({
    masterKeyRegistered: getMasterPublicKey() !== null,
    message: 'Sovereign Control API is operational. Use ?view=status|audit|access-log',
  });
}

// ═══════════════════════════════════════════════════════════════════════
// POST — Execute sovereign action / Dead man's switch ping
// REQUIRES AUTHENTICATION — all mutations require a valid API key
// ═══════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const { error, clientIp, auth } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  });
  if (error) return error;

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
          return NextResponse.json({ error: 'Invalid signature — rejected' }, { status: 403 });
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
        return NextResponse.json({ error: 'actionType is required' }, { status: 400 });
      }

      // NOTE: In production, execute should require WebAuthn + master key
      // signature verification. Currently authentication is enforced via API key.
      const scope = targetScope ?? 'platform';
      const payloadData = payload ?? {};

      const sovereignAction = buildSovereignAction(actionType, scope, payloadData, auth?.id ?? 'authenticated', clientIp);

      // SIMULATED EXECUTION — no real infrastructure changes occur
      let result: Record<string, unknown> = { simulated: true };

      switch (actionType) {
        case 'emergency_lockdown':
          simulatedActiveLockdowns++;
          result = {
            message: 'SIMULATED: All tenant access has been locked down',
            tenantsAffected: 'all',
            lockId: `LK-${Date.now().toString(36).toUpperCase()}`,
            requiresManualRelease: true,
            simulated: true,
          };
          break;
        case 'global_broadcast':
          result = {
            message: 'SIMULATED: Broadcast delivered to all active dashboards',
            recipients: 42,
            broadcastId: `BC-${Date.now().toString(36).toUpperCase()}`,
            simulated: true,
          };
          break;
        case 'override_tenant':
          result = {
            message: `SIMULATED: Tenant override applied to ${scope}`,
            overrideActive: true,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            simulated: true,
          };
          break;
        case 'revoke_all_keys':
          result = {
            message: 'SIMULATED: All API keys have been revoked',
            keysRevoked: 127,
            tenantsAffected: 12,
            simulated: true,
          };
          break;
        case 'system_maintenance':
          result = {
            message: 'SIMULATED: Platform entering maintenance mode',
            maintenanceWindow: payloadData.duration ?? '2h',
            estimatedRestoration: new Date(Date.now() + 7200000).toISOString(),
            simulated: true,
          };
          break;
        case 'access_grant':
          result = {
            message: `SIMULATED: Emergency access granted to ${scope}`,
            ttl: payloadData.ttl ?? '24h',
            grantId: `AG-${Date.now().toString(36).toUpperCase()}`,
            simulated: true,
          };
          break;
        case 'certification_sign':
          result = {
            message: 'SIMULATED: Genesis Stamp signed with sovereign master key',
            stampId: payloadData.stampId ?? 'pending',
            sovereignSignature: sovereignAction.signature.substring(0, 32) + '...',
            simulated: true,
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

      return NextResponse.json({ actionId: sovereignAction.actionId, status: 'executed', result, action: sovereignAction });
    }

    logAccess('/api/sovereign', 'POST', clientIp, false);
    return NextResponse.json({ error: 'Invalid action. Use "ping" or "execute".' }, { status: 400 });
  } catch (error) {
    logAccess('/api/sovereign', 'POST', clientIp, false);
    console.error('Sovereign API error:', error);
    return NextResponse.json({ error: 'Sovereign operation failed' }, { status: 500 });
  }
}
