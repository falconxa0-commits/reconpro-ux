import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';


// ── Helpers ─────────────────────────────────────────────────────────────────

function calculateNextRun(schedule: string, from?: Date): Date {
  const now = from ?? new Date();
  const next = new Date(now);
  switch (schedule) {
    case 'hourly':
      next.setHours(next.getHours() + 1);
      break;
    case 'daily':
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }
  return next;
}

function relativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const absDiff = Math.abs(diffMs);
  const past = diffMs >= 0;

  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  let str = '';
  if (minutes < 1) str = 'just now';
  else if (minutes < 60) str = `${minutes} min ago`;
  else if (hours < 24) str = `${hours}h ago`;
  else str = `${days}d ago`;

  if (!past) {
    if (minutes < 1) str = 'in less than 1 min';
    else if (minutes < 60) str = `${minutes} min from now`;
    else if (hours < 24) str = `${hours}h from now`;
    else str = `${days}d from now`;
  }
  return str;
}

function formatScheduleTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, { requireAuth: true, rateLimit: { maxRequests: 30, windowMs: 60_000 } });
  if (error) return error;

  try {
    // Get the first org (or any org) for scoping
    const org = await db.organization.findFirst();
    const orgId = org?.id;

    // Query all policies with their targets
    const policies = await db.monitorPolicy.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: { target: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    // For each policy, derive status and findings count
    const mappedPolicies = await Promise.all(
      policies.map(async (p) => {
        // Determine status
        let status: 'active' | 'warning' | 'idle' = 'active';
        if (!p.enabled) {
          status = 'idle';
        } else if (p.nextRunAt && p.nextRunAt < now) {
          status = 'warning';
        }

        // Get findings count from most recent scan for this target
        const latestScan = await db.scan.findFirst({
          where: { targetId: p.targetId, status: 'completed' },
          orderBy: { startedAt: 'desc' },
          select: { totalVulns: true },
        });

        return {
          id: p.id,
          name: p.name,
          schedule: p.schedule as 'hourly' | 'daily' | 'weekly' | 'monthly',
          targetDomain: p.target.domain,
          scanType: p.scanType,
          lastRun: relativeTime(p.lastRunAt),
          nextRun: p.nextRunAt ? formatScheduleTime(p.nextRunAt) : 'Not scheduled',
          enabled: p.enabled,
          runCount: p.totalRuns,
          status,
          findings: latestScan?.totalVulns ?? 0,
        };
      })
    );

    // Scheduled runs: enabled policies with future nextRunAt, sorted, take 10
    const scheduledRuns = await db.monitorPolicy.findMany({
      where: {
        enabled: true,
        nextRunAt: { gt: now },
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: { target: true },
      orderBy: { nextRunAt: 'asc' },
      take: 10,
    });

    const mappedSchedule = scheduledRuns.map((r) => ({
      id: r.id,
      policyName: r.name,
      scheduledTime: formatScheduleTime(r.nextRunAt!),
      type: r.scanType,
      status: 'pending' as const,
    }));

    // Alert history: recent critical/high findings from last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const recentFindings = await db.finding.findMany({
      where: {
        severity: { in: ['critical', 'high'] },
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        scan: {
          include: { target: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Match findings to policies by target
    const mappedAlerts = recentFindings.map((f) => {
      const policy = policies.find((p) => p.targetId === f.scan.targetId);
      return {
        id: f.id,
        severity: f.severity as 'critical' | 'high' | 'medium' | 'low',
        timestamp: relativeTime(f.createdAt),
        policy: policy?.name ?? f.scan.target.domain,
        description: f.description || f.title,
        status: f.status === 'mitigated' || f.status === 'false_positive'
          ? ('resolved' as const)
          : f.status === 'acknowledged'
            ? ('acknowledged' as const)
            : ('new' as const),
      };
    });

    return NextResponse.json({
      policies: mappedPolicies,
      scheduledRuns: mappedSchedule,
      alerts: mappedAlerts,
    });
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { error } = await withProtection(request, { requireAuth: true, rateLimit: { maxRequests: 5, windowMs: 60_000 } });
  if (error) return error;

  try {
    const body = await request.json();
    const { name, targetDomain, schedule, scanType } = body;

    if (!name || !targetDomain) {
      return NextResponse.json(
        { error: 'name and targetDomain are required' },
        { status: 400 }
      );
    }

    // Get or create org
    let org = await db.organization.findFirst();
    if (!org) {
      org = await db.organization.create({
        data: {
          name: 'Default Org',
          slug: 'default',
        },
      });
    }

    // Find or create ScanTarget
    const target = await db.scanTarget.upsert({
      where: { id: `${org.id}-${targetDomain}` },
      create: {
        id: `${org.id}-${targetDomain}`,
        organizationId: org.id,
        domain: targetDomain,
      },
      update: {},
    });

    // Actually, upsert by unique field - we don't have unique on domain+org
    // Let's find or create differently
    let scanTarget = await db.scanTarget.findFirst({
      where: { domain: targetDomain, organizationId: org.id },
    });
    if (!scanTarget) {
      scanTarget = await db.scanTarget.create({
        data: {
          domain: targetDomain,
          organizationId: org.id,
        },
      });
    }

    const nextRunAt = calculateNextRun(schedule || 'daily');

    const policy = await db.monitorPolicy.create({
      data: {
        organizationId: org.id,
        targetId: scanTarget.id,
        name,
        schedule: schedule || 'daily',
        scanType: scanType || 'full',
        enabled: true,
        nextRunAt,
      },
      include: { target: true },
    });

    return NextResponse.json({
      id: policy.id,
      name: policy.name,
      schedule: policy.schedule,
      targetDomain: policy.target.domain,
      scanType: policy.scanType,
      lastRun: 'Never',
      nextRun: formatScheduleTime(policy.nextRunAt!),
      enabled: policy.enabled,
      runCount: policy.totalRuns,
      status: 'active' as const,
      findings: 0,
    });
  } catch (error) {
    console.error('Create monitoring policy error:', error);
    return NextResponse.json(
      { error: 'Failed to create monitoring policy' },
      { status: 500 }
    );
  }
}

// ── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const { error } = await withProtection(request, { requireAuth: true, rateLimit: { maxRequests: 5, windowMs: 60_000 } });
  if (error) return error;

  try {
    const body = await request.json();
    const { id, enabled, schedule } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.monitorPolicy.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (enabled !== undefined) {
      updateData.enabled = enabled;
      if (enabled) {
        updateData.nextRunAt = calculateNextRun(existing.schedule);
      }
    }
    if (schedule) {
      updateData.schedule = schedule;
      if (existing.enabled) {
        updateData.nextRunAt = calculateNextRun(schedule);
      }
    }

    const updated = await db.monitorPolicy.update({
      where: { id },
      data: updateData,
      include: { target: true },
    });

    const now = new Date();
    let status: 'active' | 'warning' | 'idle' = 'active';
    if (!updated.enabled) status = 'idle';
    else if (updated.nextRunAt && updated.nextRunAt < now) status = 'warning';

    const latestScan = await db.scan.findFirst({
      where: { targetId: updated.targetId, status: 'completed' },
      orderBy: { startedAt: 'desc' },
      select: { totalVulns: true },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      schedule: updated.schedule,
      targetDomain: updated.target.domain,
      scanType: updated.scanType,
      lastRun: relativeTime(updated.lastRunAt),
      nextRun: updated.nextRunAt ? formatScheduleTime(updated.nextRunAt) : 'Not scheduled',
      enabled: updated.enabled,
      runCount: updated.totalRuns,
      status,
      findings: latestScan?.totalVulns ?? 0,
    });
  } catch (error) {
    console.error('Update monitoring policy error:', error);
    return NextResponse.json(
      { error: 'Failed to update monitoring policy' },
      { status: 500 }
    );
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { error } = await withProtection(request, { requireAuth: true, rateLimit: { maxRequests: 5, windowMs: 60_000 } });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.monitorPolicy.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete monitoring policy error:', error);
    return NextResponse.json(
      { error: 'Failed to delete monitoring policy' },
      { status: 500 }
    );
  }
}
