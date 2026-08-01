/**
 * Unit tests for the VibeSec Diff Scanner.
 *
 * Run: npx ts-node src/__tests__/diff-scanner.test.ts
 * Or compile and run with: npx tsc --noEmit
 */

import { scanDiff, DiffScanResult } from '../diff-scanner';

// ══════════════════════════════════════════════════════════════════════════
// TEST DIFFS
// ══════════════════════════════════════════════════════════════════════════

/** Diff with an exposed Supabase service role key */
const DIFF_EXPOSED_SUPABASE = `
diff --git a/.env.local b/.env.local
new file mode 100644
index 0000000..e8b4e3a
--- /dev/null
+++ b/.env.local
@@ -0,0 +1,15 @@
+NEXT_PUBLIC_SUPABASE_URL=https://abcxyz.supabase.co
+NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test
+SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.super_secret_admin_key
+DATABASE_URL=postgresql://admin:password123@db.abcxyz.supabase.co:5432/postgres
+NEXTAUTH_SECRET=some-random-secret-here
`;

/** Diff with eval() usage */
const DIFF_EVAL_USAGE = `
diff --git a/src/app/api/webhook.ts b/src/app/api/webhook.ts
new file mode 100644
index 0000000..c4f2e1b
--- /dev/null
+++ b/src/app/api/webhook.ts
@@ -0,0 +1,20 @@
+import { NextRequest, NextResponse } from 'next/server';
+
+export async function POST(req: NextRequest) {
+  const body = await req.json();
+
+  // Process the webhook payload
+  const result = eval(body.expression);
+
+  return NextResponse.json({ result });
+}
`;

/** Diff with wildcard CORS */
const DIFF_WILDCARD_CORS = `
diff --git a/lib/cors.ts b/lib/cors.ts
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/lib/cors.ts
@@ -0,0 +1,12 @@
+import cors from 'cors';
+
+const corsOptions = {
+  origin: '*',
+  methods: ['GET', 'POST', 'PUT', 'DELETE'],
+  allowedHeaders: ['Content-Type', 'Authorization'],
+  credentials: true,
+};
+
+export default cors(corsOptions);
`;

/** Diff with clean code — should find nothing critical */
const DIFF_CLEAN = `
diff --git a/src/lib/utils.ts b/src/lib/utils.ts
new file mode 100644
index 0000000..f7a8b9c
--- /dev/null
+++ b/src/lib/utils.ts
@@ -0,0 +1,15 @@
+/**
+ * Formats a date string to a human-readable format.
+ */
+export function formatDate(date: Date): string {
+  return new Intl.DateTimeFormat('en-US', {
+    year: 'numeric',
+    month: 'long',
+    day: 'numeric',
+  }).format(date);
+}
+
+export function classNames(...classes: string[]): string {
+  return classes.filter(Boolean).join(' ');
+}
`;

/** Diff with debug console.log in production */
const DIFF_DEBUG_CODE = `
diff --git a/src/app/api/users/route.ts b/src/app/api/users/route.ts
new file mode 100644
index 0000000..d4e5f6a
--- /dev/null
+++ b/src/app/api/users/route.ts
@@ -0,0 +1,18 @@
+import { NextRequest, NextResponse } from 'next/server';
+
+export async function GET(req: NextRequest) {
+  console.log('GET /api/users called');
+  const users = [{ id: 1, name: 'Test' }];
+  console.debug('Users fetched:', users);
+  debugger;
+  return NextResponse.json({ users });
+}
`;

// ══════════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ══════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string): void {
  if (condition) {
    console.log(`  \x1b[32m✓ ${testName}\x1b[0m`);
    passed++;
  } else {
    console.log(`  \x1b[31m✗ ${testName}\x1b[0m`);
    failed++;
  }
}

function assertExists<T>(val: T | undefined, testName: string): T {
  const exists = val !== undefined && val !== null;
  assert(exists, testName);
  return val as T;
}

// ── Test: Exposed Supabase key ──────────────────────────────────────────
console.log('\n\x1b[1mTest: Exposed Supabase service role key\x1b[0m');
{
  const result = scanDiff(DIFF_EXPOSED_SUPABASE);
  assert(result.findings.length >= 2, 'Should find at least 2 findings');

  const supabaseKey = result.findings.find(
    (f) => f.finding.includes('SUPABASE_SERVICE_ROLE_KEY')
  );
  assert(!!supabaseKey, 'Should find exposed SUPABASE_SERVICE_ROLE_KEY');
  if (supabaseKey) {
    assert(supabaseKey.severity === 'critical', 'Supabase service role key should be critical');
    assert(supabaseKey.file === '.env.local', 'Should be in .env.local');
  }

  const dbUrl = result.findings.find(
    (f) => f.finding.includes('DATABASE_URL')
  );
  assert(!!dbUrl, 'Should find exposed DATABASE_URL');
  if (dbUrl) {
    assert(dbUrl.severity === 'critical', 'DATABASE_URL should be critical');
  }

  const anonKey = result.findings.find(
    (f) => f.finding.includes('SUPABASE_ANON_KEY')
  );
  assert(!!anonKey, 'Should find exposed SUPABASE_ANON_KEY');
  if (anonKey) {
    assert(anonKey.severity === 'high', 'Supabase anon key should be high');
  }

  assert(result.score < 70, `Score should be below 70 (got ${result.score})`);
  assert(result.grade === 'C' || result.grade === 'D' || result.grade === 'F', `Grade should be C/D/F (got ${result.grade})`);
}

// ── Test: eval() usage ─────────────────────────────────────────────────
console.log('\n\x1b[1mTest: eval() usage detection\x1b[0m');
{
  const result = scanDiff(DIFF_EVAL_USAGE);
  assert(result.findings.length >= 1, 'Should find at least 1 finding');

  const evalFinding = result.findings.find(
    (f) => f.finding.includes('eval()')
  );
  assert(!!evalFinding, 'Should find eval() usage');
  if (evalFinding) {
    assert(evalFinding.severity === 'high', 'eval() should be high severity');
    assert(evalFinding.file.includes('webhook.ts'), 'Should be in webhook.ts');
    assert(evalFinding.line > 0, 'Should have a line number');
  }

  assert(result.score < 100, `Score should be below 100 (got ${result.score})`);
}

// ── Test: Wildcard CORS ────────────────────────────────────────────────
console.log('\n\x1b[1mTest: Wildcard CORS detection\x1b[0m');
{
  const result = scanDiff(DIFF_WILDCARD_CORS);
  assert(result.findings.length >= 1, 'Should find at least 1 finding');

  const corsFinding = result.findings.find(
    (f) => f.finding.includes('CORS')
  );
  assert(!!corsFinding, 'Should find wildcard CORS');
  if (corsFinding) {
    assert(corsFinding.severity === 'medium', 'CORS wildcard should be medium severity');
    assert(corsFinding.file.includes('cors.ts'), 'Should be in cors.ts');
  }

  assert(result.score < 100, `Score should be below 100 (got ${result.score})`);
}

// ── Test: Clean code ───────────────────────────────────────────────────
console.log('\n\x1b[1mTest: Clean code (no findings)\x1b[0m');
{
  const result = scanDiff(DIFF_CLEAN);
  assert(result.findings.length === 0, 'Should find no findings in clean code');
  assert(result.score === 100, `Score should be 100 (got ${result.score})`);
  assert(result.grade === 'A+', `Grade should be A+ (got ${result.grade})`);
}

// ── Test: Debug code in production ─────────────────────────────────────
console.log('\n\x1b[1mTest: Debug code detection\x1b[0m');
{
  const result = scanDiff(DIFF_DEBUG_CODE);
  const debugFindings = result.findings.filter(
    (f) => f.category === 'debug_code'
  );
  assert(debugFindings.length >= 2, `Should find at least 2 debug findings (found ${debugFindings.length})`);

  const debuggerStmt = result.findings.find(
    (f) => f.finding.includes('debugger')
  );
  assert(!!debuggerStmt, 'Should find debugger statement');

  const consoleLog = result.findings.find(
    (f) => f.finding.includes('console.log')
  );
  assert(!!consoleLog, 'Should find console.log statement');
}

// ── Test: Ignore patterns ──────────────────────────────────────────────
console.log('\n\x1b[1mTest: .vibesec-ignore patterns\x1b[0m');
{
  const result = scanDiff(DIFF_EXPOSED_SUPABASE, ['.env.local', '*.env*']);
  assert(result.findings.length === 0, 'Should find no findings when .env files are ignored');
  assert(result.score === 100, `Score should be 100 when ignoring env files (got ${result.score})`);
}

// ── Test: Multiple issues in one diff ──────────────────────────────────
console.log('\n\x1b[1mTest: Multiple issues in combined diff\x1b[0m');
{
  const combined = DIFF_EXPOSED_SUPABASE + DIFF_EVAL_USAGE + DIFF_WILDCARD_CORS;
  const result = scanDiff(combined);
  assert(result.findings.length >= 5, `Should find at least 5 findings (found ${result.findings.length})`);
  assert(result.score < 50, `Score should be below 50 (got ${result.score})`);
  assert(result.grade === 'D' || result.grade === 'F', `Grade should be D/F (got ${result.grade})`);
}

// ── Summary ────────────────────────────────────────────────────────────
console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
if (failed > 0) {
  process.exit(1);
}
