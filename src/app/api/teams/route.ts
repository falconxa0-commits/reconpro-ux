import { extractClientIP } from '@/lib/api-protection';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api-security';


// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 30, 60000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const org = await db.organization.findFirst();
    const orgId = org?.id;

    const teams = await db.team.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedTeams = teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      color: t.color,
      memberCount: t._count.members,
    }));

    return NextResponse.json({ teams: mappedTeams });
  } catch (error) {
    console.error('Teams API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
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

    const team = await db.team.create({
      data: {
        organizationId: org.id,
        name,
        description: description || null,
        color: color || '#00ff88',
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId: org.id,
        action: 'team_created',
        resource: 'team',
        resourceId: team.id,
        details: JSON.stringify({ name, description: description || '', color: color || '#00ff88', action: `Created team ${name}` }),
      },
    });

    return NextResponse.json({
      id: team.id,
      name: team.name,
      description: team.description || '',
      color: team.color,
      memberCount: team._count.members,
    });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

// ── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json();
    const { id, name, description, color } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

    const updated = await db.team.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      color: updated.color,
      memberCount: updated._count.members,
    });
  } catch (error) {
    console.error('Update team error:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { allowed } = checkRateLimit(extractClientIP(request), 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Remove TeamMember junction records first
    await db.teamMember.deleteMany({ where: { teamId: id } });

    await db.team.delete({ where: { id } });

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId: existing.organizationId,
        action: 'team_deleted',
        resource: 'team',
        resourceId: id,
        details: JSON.stringify({ name: existing.name, description: `Deleted team ${existing.name}` }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
