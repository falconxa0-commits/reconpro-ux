import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // ── Authenticate via Bearer token ──────────────────────────────────
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Expected: Bearer <api-key>' },
        { status: 401 }
      )
    }

    const rawKey = authHeader.slice(7).trim()
    if (!rawKey) {
      return NextResponse.json(
        { error: 'Empty API key provided' },
        { status: 401 }
      )
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

    const apiKey = await db.apiKey.findUnique({
      where: { keyHash },
      include: { organization: true },
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // ── Check key status and expiration ────────────────────────────────
    if (!apiKey.isActive) {
      return NextResponse.json(
        { error: 'API key has been deactivated' },
        { status: 403 }
      )
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'API key has expired' },
        { status: 403 }
      )
    }

    // ── Validate scope ─────────────────────────────────────────────────
    const scopes: string[] = JSON.parse(apiKey.scopes)
    if (!scopes.includes('telemetry:write')) {
      return NextResponse.json(
        { error: 'Insufficient scope. Required: telemetry:write' },
        { status: 403 }
      )
    }

    // ── Parse and validate request body ────────────────────────────────
    const body = await request.json()
    const { target, modules_selected, timestamp, findings, scan_type, risk_score } = body

    if (!target || typeof target !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "target" field (expected string)' },
        { status: 400 }
      )
    }

    if (!modules_selected || !Array.isArray(modules_selected)) {
      return NextResponse.json(
        { error: 'Missing or invalid "modules_selected" field (expected array)' },
        { status: 400 }
      )
    }

    if (!timestamp) {
      return NextResponse.json(
        { error: 'Missing "timestamp" field' },
        { status: 400 }
      )
    }

    // ── Find or create ScanTarget ──────────────────────────────────────
    let scanTarget = await db.scanTarget.findFirst({
      where: {
        organizationId: apiKey.organizationId,
        domain: target,
      },
    })

    if (!scanTarget) {
      scanTarget = await db.scanTarget.create({
        data: {
          organizationId: apiKey.organizationId,
          domain: target,
          lastScanned: new Date(timestamp),
        },
      })
    } else {
      scanTarget = await db.scanTarget.update({
        where: { id: scanTarget.id },
        data: { lastScanned: new Date(timestamp) },
      })
    }

    // ── Compute finding severity counts ────────────────────────────────
    const parsedFindings: Array<{
      title: string
      severity: string
      category: string
      description: string
      evidence?: string
      asset: string
      remediation?: string
      cve?: string
      cvss?: number
    }> = Array.isArray(findings) ? findings : []

    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    for (const f of parsedFindings) {
      if (f.severity in counts) {
        counts[f.severity as keyof typeof counts]++
      }
    }

    // ── Create Scan record ─────────────────────────────────────────────
    const scan = await db.scan.create({
      data: {
        targetId: scanTarget.id,
        status: 'completed',
        scanType: typeof scan_type === 'string' ? scan_type : 'full',
        triggeredBy: 'api',
        riskScore: typeof risk_score === 'number' ? risk_score : 0,
        totalVulns: parsedFindings.length,
        criticalCount: counts.critical,
        highCount: counts.high,
        mediumCount: counts.medium,
        lowCount: counts.low,
        infoCount: counts.info,
        startedAt: new Date(timestamp),
        completedAt: new Date(),
      },
    })

    // ── Create Finding records ─────────────────────────────────────────
    if (parsedFindings.length > 0) {
      await db.finding.createMany({
        data: parsedFindings.map((f) => ({
          scanId: scan.id,
          title: f.title || 'Untitled Finding',
          severity: f.severity || 'info',
          category: f.category || 'general',
          description: f.description || '',
          evidence: f.evidence || null,
          asset: f.asset || target,
          remediation: f.remediation || null,
          cve: f.cve || null,
          cvss: f.cvss ?? null,
        })),
      })
    }

    // ── Update ApiKey usage stats ──────────────────────────────────────
    await db.apiKey.update({
      where: { id: apiKey.id },
      data: {
        requestCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })

    // ── Decrement Organization quota ───────────────────────────────────
    if (apiKey.organization.apiQuota > 0) {
      await db.organization.update({
        where: { id: apiKey.organizationId },
        data: { apiQuota: { decrement: 1 } },
      })
    }

    // ── Create AuditLog entry ──────────────────────────────────────────
    await db.auditLog.create({
      data: {
        organizationId: apiKey.organizationId,
        apiKeyId: apiKey.id,
        action: 'telemetry_uploaded',
        resource: 'scan',
        resourceId: scan.id,
        details: JSON.stringify({
          target,
          modules_selected,
          findingCount: parsedFindings.length,
          scanId: scan.id,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    })

    // ── Return success response ────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        scan_id: scan.id,
        target_id: scanTarget.id,
        status: 'completed',
        findings_count: parsedFindings.length,
        severity_breakdown: counts,
        processed_at: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[TELEMETRY UPLOAD ERROR]', error)
    return NextResponse.json(
      {
        error: 'Internal server error processing telemetry upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
