import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ── Constants ───────────────────────────────────────────────────────────────

const VALID_TYPES = [
  'slack',
  'jira',
  'splunk',
  'pagerduty',
  'microsoft_teams',
  'webhooks',
  'email',
] as const;

const TYPE_META: Record<string, { icon: string; color: string; description: string }> = {
  slack: { icon: 'MessageSquare', color: '#E01E5A', description: 'Real-time alerts and notifications to your security channels' },
  jira: { icon: 'Ticket', color: '#0052CC', description: 'Automated vulnerability ticket creation and tracking' },
  splunk: { icon: 'BarChart3', color: '#65A637', description: 'Forward security events and logs to Splunk SIEM' },
  pagerduty: { icon: 'Bell', color: '#06AC38', description: 'Critical alert escalation and incident management' },
  microsoft_teams: { icon: 'Users', color: '#7B83EB', description: 'Collaborate on security findings within Teams channels' },
  webhooks: { icon: 'Webhook', color: '#06b6d4', description: 'Custom webhook endpoints for event-driven automation' },
  email: { icon: 'Mail', color: '#f97316', description: 'Email notifications for critical security events' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const absDiff = Math.abs(diffMs);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    const orgId = org?.id;

    const integrations = await db.integration.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const mappedIntegrations = integrations.map((i) => {
      let parsedConfig: Record<string, string> = {};
      try {
        parsedConfig = JSON.parse(i.config || '{}');
      } catch {
        // ignore
      }

      const meta = TYPE_META[i.type] || { icon: 'Plug', color: '#8b949e', description: '' };
      const eventType =
        i.type === 'jira'
          ? 'issues created'
          : i.type === 'splunk'
            ? 'events indexed'
            : i.type === 'pagerduty'
              ? 'incidents triggered'
              : i.type === 'webhooks'
                ? 'active webhooks'
                : 'events sent';

      const eventCount =
        i.type === 'splunk' && i.eventsTotal > 10000
          ? `${(i.eventsTotal / 1000000).toFixed(1)}M`
          : i.eventsTotal > 1000
            ? `${(i.eventsTotal / 1000).toFixed(0)}K`
            : String(i.eventsTotal);

      return {
        id: i.id,
        name: i.name,
        description: meta.description,
        icon: meta.icon,
        letter: i.name[0]?.toUpperCase() || '?',
        color: meta.color,
        connected: i.enabled,
        eventCount,
        eventType,
        lastSync: i.lastSync ? relativeTime(i.lastSync) : undefined,
        type: i.type,
        config: parsedConfig,
      };
    });

    // Activity: query AuditLog entries for integration events
    const activity = await db.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: 'integration' } },
          { resource: 'integration' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const mappedActivity = activity.map((a) => {
      let details: Record<string, string> = {};
      try {
        details = a.details ? JSON.parse(a.details) : {};
      } catch {
        // ignore
      }

      const status =
        a.action.includes('delete') || a.action.includes('error') || a.action.includes('fail')
          ? 'error'
          : a.action.includes('update') || a.action.includes('toggle')
            ? 'warning'
            : 'success';

      const integrationName = details.name || a.resourceId || 'Unknown';
      const color = TYPE_META[details.type as string]?.color || '#8b949e';

      return {
        id: a.id,
        integration: integrationName,
        action: a.action.replace(/_/g, ' ').replace(/integration/i, '').trim() || a.action,
        description: details.description || a.action,
        timestamp: relativeTime(a.createdAt),
        status: status as 'success' | 'error' | 'warning',
        color,
      };
    });

    return NextResponse.json({
      integrations: mappedIntegrations,
      activity: mappedActivity,
    });
  } catch (error) {
    console.error('Integrations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, config } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: 'type and name are required' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get or create org
    let org = await db.organization.findFirst();
    if (!org) {
      org = await db.organization.create({
        data: { name: 'Default Org', slug: 'default' },
      });
    }

    const integration = await db.integration.create({
      data: {
        organizationId: org.id,
        type,
        name,
        config: JSON.stringify(config || {}),
        enabled: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId: org.id,
        action: 'integration_created',
        resource: 'integration',
        resourceId: integration.id,
        details: JSON.stringify({ name, type, description: `Created ${name} integration` }),
      },
    });

    const meta = TYPE_META[type] || { color: '#8b949e', description: '' };

    return NextResponse.json({
      id: integration.id,
      name: integration.name,
      description: meta.description,
      icon: TYPE_META[type]?.icon || 'Plug',
      letter: integration.name[0]?.toUpperCase() || '?',
      color: meta.color,
      connected: true,
      eventCount: '0',
      eventType: 'events sent',
      type: integration.type,
    });
  } catch (error) {
    console.error('Create integration error:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

// ── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled, config } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.integration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }
    if (config) {
      updateData.config = JSON.stringify(config);
    }

    const updated = await db.integration.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId: existing.organizationId,
        action: enabled !== undefined ? 'integration_toggled' : 'integration_updated',
        resource: 'integration',
        resourceId: updated.id,
        details: JSON.stringify({ name: updated.name, type: updated.type, enabled: updated.enabled, description: `${enabled !== undefined ? 'Toggled' : 'Updated'} ${updated.name}` }),
      },
    });

    const meta = TYPE_META[updated.type] || { color: '#8b949e', description: '' };

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: meta.description,
      icon: TYPE_META[updated.type]?.icon || 'Plug',
      letter: updated.name[0]?.toUpperCase() || '?',
      color: meta.color,
      connected: updated.enabled,
      eventCount: String(updated.eventsTotal),
      eventType: 'events sent',
      lastSync: updated.lastSync ? relativeTime(updated.lastSync) : undefined,
      type: updated.type,
    });
  } catch (error) {
    console.error('Update integration error:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.integration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    await db.integration.delete({ where: { id } });

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId: existing.organizationId,
        action: 'integration_deleted',
        resource: 'integration',
        resourceId: id,
        details: JSON.stringify({ name: existing.name, type: existing.type, description: `Deleted ${existing.name} integration` }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete integration error:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
