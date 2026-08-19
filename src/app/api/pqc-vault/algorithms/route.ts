import { withProtection } from '@/lib/api-protection';
import { NextRequest, NextResponse } from 'next/server';
import {
  PQC_ALGORITHMS,
  CLASSICAL_ALGORITHMS,
  PROTOCOL_ANALYSIS,
} from '@/lib/pqc-vault-engine';

// ── GET /api/pqc-vault/algorithms ──────────────────────────────────

export async function GET(request: NextRequest) {
  const { error } = await withProtection(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  });
  if (error) return error;

  const pqcList = Object.entries(PQC_ALGORITHMS).map(([key, algo]) => ({
    id: key,
    ...algo,
  }));

  const classicalList = Object.entries(CLASSICAL_ALGORITHMS).map(([key, algo]) => ({
    id: key,
    ...algo,
  }));

  const protocols = Object.entries(PROTOCOL_ANALYSIS).map(([key, proto]) => ({
    id: key,
    ...proto,
  }));

  return NextResponse.json({
    pqcAlgorithms: pqcList,
    classicalAlgorithms: classicalList,
    protocols,
  });
}
