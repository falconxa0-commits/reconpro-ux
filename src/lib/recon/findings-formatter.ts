/**
 * Findings Formatter — Shared Finding type and factory for all recon modules.
 *
 * Both scan/route.ts and vuln-scan/route.ts define an identical local `Finding`
 * type and manually construct objects with the same defaults.  This module
 * provides a single source of truth.
 *
 * The type intentionally matches the shape used by the DB schema (Finding
 * model) so objects can be persisted without mapping.
 */

// ── Type ──────────────────────────────────────────────────────────

/** A single reconnaissance finding produced by any scan module. */
export type Finding = {
  title: string;
  severity: string;    // critical | high | medium | low | info
  category: string;    // dns | subdomain | port | technology | ssl | header | vulnerability | osint
  description: string;
  evidence: string;
  asset: string;
};

// ── Factory ────────────────────────────────────────────────────────

/**
 * Create a Finding with sensible defaults.
 *
 * Only `title` and `asset` are required.  Everything else defaults to
 * the lowest-impact values so callers only specify what matters.
 *
 * @example
 * createFinding({
 *   title: 'Open Port 22',
 *   severity: 'medium',
 *   category: 'port',
 *   description: 'SSH is exposed to the internet.',
 *   evidence: 'tcp-connect succeeded on port 22',
 *   asset: 'example.com',
 * });
 */
export function createFinding(
  overrides: Partial<Finding> & Pick<Finding, 'title' | 'asset'>,
): Finding {
  return {
    severity: 'info',
    category: 'general',
    description: '',
    evidence: '',
    ...overrides,
  };
}
