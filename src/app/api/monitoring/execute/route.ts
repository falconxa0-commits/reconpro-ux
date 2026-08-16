import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Calculate the next run time based on a schedule string.
 *
 * @param schedule - One of: hourly, daily, weekly, monthly
 * @param from - Base time to calculate from (defaults to now)
 * @returns Date representing the next scheduled run
 */
function calculateNextRun(schedule: string, from?: Date): Date {
  const now = from ?? new Date();
  const next = new Date(now);

  switch (schedule) {
    case 'hourly':
      next.setHours(next.getHours() + 1);
      break;
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      // Fallback to daily
      next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * POST /api/monitoring/execute
 *
 * Checks for due monitoring policies and executes them by creating
 * scan records with triggeredBy set to 'scheduled'.
 *
 * Process:
 * 1. Find all enabled MonitorPolicy records where nextRunAt <= now
 * 2. For each due policy:
 *    a. Update lastRunAt to now, increment totalRuns
 *    b. Calculate nextRunAt based on schedule
 *    c. Create a scan record with triggeredBy: 'scheduled'
 * 3. Return summary of executed policies
 *
 * Auth required. Rate limit: 5 requests per 60s.
 */
export async function POST(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  });
  if (error) return error;

  try {
    const now = new Date();

    // Find all enabled policies that are due for execution
    const duePolicies = await db.monitorPolicy.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
      include: { target: true },
    });

    if (duePolicies.length === 0) {
      return NextResponse.json({
        executed: 0,
        message: 'No policies are currently due for execution',
        policies: [],
      });
    }

    const results: {
      policyId: string;
      policyName: string;
      targetDomain: string;
      scanId: string;
      nextRunAt: string;
    }[] = [];

    // Execute each due policy
    for (const policy of duePolicies) {
      const nextRunAt = calculateNextRun(policy.schedule, now);

      // Update the policy with new run times
      await db.monitorPolicy.update({
        where: { id: policy.id },
        data: {
          lastRunAt: now,
          nextRunAt,
          totalRuns: { increment: 1 },
        },
      });

      // Create a scan record triggered by the schedule
      const scan = await db.scan.create({
        data: {
          targetId: policy.targetId,
          scanType: policy.scanType,
          triggeredBy: 'scheduled',
          status: 'pending',
        },
      });

      results.push({
        policyId: policy.id,
        policyName: policy.name,
        targetDomain: policy.target.domain,
        scanId: scan.id,
        nextRunAt: nextRunAt.toISOString(),
      });
    }

    return NextResponse.json({
      executed: results.length,
      message: `${results.length} monitoring policy(s) executed successfully`,
      policies: results,
    });
  } catch (err) {
    console.error('Monitoring execution error:', err);
    return NextResponse.json(
      { error: 'Failed to execute monitoring policies' },
      { status: 500 }
    );
  }
}
