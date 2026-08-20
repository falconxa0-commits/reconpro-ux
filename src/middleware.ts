import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/overview", "/scans", "/findings", "/monitoring", "/compliance", "/teams", "/integrations", "/settings"];

// Routes that should be accessible without auth (public API + auth routes)
const PUBLIC_API_PREFIXES = ["/api/health", "/api/auth/", "/api/v1/auth/"];
const PUBLIC_PAGE_PREFIXES = ["/login", "/register", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api');

  // ── Dashboard Auth Guard ──────────────────────────────────────────
  // Dashboard routes require a valid session cookie.
  const isDashboardRoute = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
  const isPublicPage = PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isDashboardRoute && !isPublicPage) {
    const sessionCookie = request.cookies.get('reconpro_session');

    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Validate the session token format (basic sanity check)
    // Full DB validation happens in API routes via api-protection.ts
    const token = sessionCookie.value;
    if (!token.startsWith('sess_') || token.length < 20) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      // Clear the invalid cookie
      response.cookies.delete('reconpro_session');
      response.cookies.delete('reconpro_auth'); // Clean up legacy cookie
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Clear legacy fake auth cookie if present ──────────────────
  const legacyCookie = request.cookies.get('reconpro_auth');
  if (legacyCookie) {
    response.cookies.delete('reconpro_auth');
  }

  // ── Security Headers (applied to ALL routes including API) ──────────
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  response.headers.delete("X-Powered-By");

  // ── Additional Hardening (applied to ALL routes) ─────────────────
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-XSS-Protection", "0"); // Disabled in favor of CSP
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");

  // ── Content Security Policy (only for non-API, non-static routes) ────
  // Note: 'unsafe-inline' is required because Next.js 16 App Router delivers
  // its RSC payload via inline <script> tags that cannot carry nonce attributes.
  if (!isApiRoute) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "connect-src 'self' wss:",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    response.headers.set("Content-Security-Policy", csp);
  }

  return response;
}

export const config = {
  matcher: [
    { source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)" },
  ],
};
