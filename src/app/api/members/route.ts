import { withProtection } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';


// ── Constants ───────────────────────────────────────────────────────────────

const VALID_ROLES = ['owner', 'admin', 'security_lead', 'analyst', 'viewer'] as const;

const ROLE_DISPLAY: Record<string, string> = {
  owner: 'Admin',
  admin: 'Admin',
  security_lead: 'Security Lead',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function deriveStatus(lastActive: Date | null): 'online' | 'away' | 'offline' {
  if (!lastActive) return 'offline';
  const now = new Date();
  const diffMin = (now.getTime() - lastActive.getTime()) / 60000;
  if (diffMin <= 10) return 'online';
  if (diffMin <= 60) return 'away';
  return 'offline';
}

function relativeTime(date: Date | null): string {
  if (!date) return 'Never';
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

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, { requireAuth: true, rateLimit: { maxRequests: 30, windowMs: 60_000 } });
  if (error) return error;

  try {
    const org = await db.organization.findFirst();
    const orgId = org?.id;

    const members = await db.member.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        teamMemberships: {
          include: { team: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedMembers = members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: ROLE_DISPLAY[m.role] || m.role,
      avatar: m.avatar || undefined,
      lastActive: relativeTime(m.lastActive),
      teamMemberships: m.teamMemberships.map((tm) => tm.team.name),
      status: deriveStatus(m.lastActive),
    }));

    return NextResponse.json({ members: mappedMembers });
  } catch (error) {
    console.error('Members API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { error } = await withProtection(request, { requireAuth: true, rateLimit: { maxRequests: 30, windowMs: 60_000 } });
  if (error) return error;

  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'name and email are required' },
        { status: 400 }
      );
    }

    const normalizedRole = role?.toLowerCase() || 'viewer';
    if (!VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
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

    const member = await db.member.create({
      data: {
        organizationId: org.id,
        name,
        email,
        role: normalizedRole,
        lastActive: new Date(),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId: org.id,
        action: 'member_invited',
        resource: 'member',
        resourceId: member.id,
        details: JSON.stringify({ name, email, role: normalizedRole, description: `Invited ${name} as ${normalizedRole}` }),
      },
    });

    return NextResponse.json({
      id: member.id,
      name: member.name,
      email: member.email,
      role: ROLE_DISPLAY[member.role] || member.role,
      avatar: member.avatar || undefined,
      lastActive: relativeTime(member.lastActive),
      teamMemberships: [],
      status: 'online' as const,
    });
  } catch (error) {
    console.error('Create member error:', error);
    return NextResponse.json(
      { error: 'Failed to create member' },
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
    const { id, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json(
        { error: 'role is required' },
        { status: 400 }
      );
    }

    const normalizedRole = role.toLowerCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await db.member.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const updated = await db.member.update({
      where: { id },
      data: { role: normalizedRole },
      include: {
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId: existing.organizationId,
        action: 'member_role_updated',
        resource: 'member',
        resourceId: id,
        details: JSON.stringify({ name: updated.name, oldRole: existing.role, newRole: normalizedRole, description: `Changed ${updated.name} role from ${existing.role} to ${normalizedRole}` }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: ROLE_DISPLAY[updated.role] || updated.role,
      avatar: updated.avatar || undefined,
      lastActive: relativeTime(updated.lastActive),
      teamMemberships: updated.teamMemberships.map((tm) => tm.team.name),
      status: deriveStatus(updated.lastActive),
    });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
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

    const existing = await db.member.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Remove team memberships first
    await db.teamMember.deleteMany({ where: { memberId: id } });

    await db.member.delete({ where: { id } });

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId: existing.organizationId,
        action: 'member_removed',
        resource: 'member',
        resourceId: id,
        details: JSON.stringify({ name: existing.name, description: `Removed ${existing.name} from organization` }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}
