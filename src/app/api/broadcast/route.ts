// ═══════════════════════════════════════════════════════════════════════
// Echo-Sign Broadcast API — /api/broadcast
// GET  ?priority= &channel= &active=true  → list broadcasts
// POST { priority, title, body, channel, targetScope } → issue
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import {
  seedDemoBroadcasts,
  getAllBroadcasts,
  getActiveBroadcasts,
  storeBroadcast,
  signBroadcast,
  verifyBroadcast,
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

// ── GET /api/broadcast ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
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

  return NextResponse.json({
    ok: true,
    count: broadcasts.length,
    broadcasts,
  });
}

// ── POST /api/broadcast ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priority, title, body: messageBody, channel, targetScope, issuedBy } = body;

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

    // Set expiry based on priority (type-safe: priority was validated above)
    const typedPriority = priority as BroadcastPriority;
    const expiryHours: Record<BroadcastPriority, number> = {
      INFO: 168,
      WARNING: 72,
      CRITICAL: 48,
      SOVEREIGN: 72,
    };

    const expiresAt = new Date(
      Date.now() + expiryHours[typedPriority] * 3600_000
    ).toISOString();

    const msg = storeBroadcast(
      signBroadcast({
        priority,
        title,
        body: messageBody,
        channel,
        issuedBy: issuedBy || 'broadcast-authority@reconpro.io',
        expiresAt,
        targetScope: scope,
      })
    );

    return NextResponse.json({ ok: true, broadcast: msg }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
