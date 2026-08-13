import { withProtection } from '@/lib/api-protection';
// ═══════════════════════════════════════════════════════════════════════
// Echo-Sign Broadcast API — /api/broadcast
// STATUS: PARTIAL — Real Ed25519 signing, but content comes from
// seedDemoBroadcasts() (fabricated bulletins) and in-memory storage.
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  seedDemoBroadcasts,
  getAllBroadcasts,
  getActiveBroadcasts,
  storeBroadcast,
  signBroadcast,
  type BroadcastPriority,
  type BroadcastChannel,
  type TargetScope,
  type BroadcastMessage,
} from '@/lib/broadcast-engine';

// Ensure demo data exists
seedDemoBroadcasts();

const VALID_PRIORITIES: BroadcastPriority[] = ['INFO', 'WARNING', 'CRITICAL', 'SOVEREIGN'];
const VALID_CHANNELS: BroadcastChannel[] = ['cli', 'web', 'email', 'slack', 'pagerduty', 'webhook'];
const VALID_SCOPES: TargetScope[] = ['all', 'enterprise', 'government'];

// ── GET /api/broadcast (public — read-only listing) ──────────────────

export async function GET(req: NextRequest) {
  const { error, clientIp } = await withProtection(req, {
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const priority = searchParams.get('priority')?.toUpperCase();
  const channel = searchParams.get('channel')?.toLowerCase();
  const activeOnly = searchParams.get('active') === 'true';

  let broadcasts: BroadcastMessage[] = activeOnly ? getActiveBroadcasts() : getAllBroadcasts();

  if (priority && VALID_PRIORITIES.includes(priority as BroadcastPriority)) {
    broadcasts = broadcasts.filter((b) => b.priority === priority);
  }
  if (channel && VALID_CHANNELS.includes(channel as BroadcastChannel)) {
    broadcasts = broadcasts.filter((b) => b.channel === channel);
  }

  return NextResponse.json({ ok: true, count: broadcasts.length, broadcasts });
}

// ── POST /api/broadcast (AUTH REQUIRED — mutation) ───────────────────

export async function POST(req: NextRequest) {
  const { error, auth } = await withProtection(req, {
    requireAuth: true,
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const body = await req.json();
    const { priority, title, body: messageBody, channel, targetScope } = body;

    if (!title || !messageBody || !priority || !channel) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: title, body, priority, channel' },
        { status: 400 }
      );
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { ok: false, error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { ok: false, error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      );
    }

    const scope: TargetScope = VALID_SCOPES.includes(targetScope) ? targetScope : 'all';
    const typedPriority = priority as BroadcastPriority;
    const expiryHours: Record<BroadcastPriority, number> = { INFO: 168, WARNING: 72, CRITICAL: 48, SOVEREIGN: 72 };
    const expiresAt = new Date(Date.now() + expiryHours[typedPriority] * 3600_000).toISOString();

    // Use authenticated key ID as issuer — never trust client-supplied identity
    const msg = storeBroadcast(
      signBroadcast({
        priority,
        title,
        body: messageBody,
        channel,
        issuedBy: auth?.id ?? 'system',
        expiresAt,
        targetScope: scope,
      })
    );

    return NextResponse.json({ ok: true, broadcast: msg }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }
}
