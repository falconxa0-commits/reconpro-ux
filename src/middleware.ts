import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ── Security Headers ────────────────────────────────────────────────
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

  // ── Content Security Policy (tightened) ──────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`, // Removed unsafe-inline and unsafe-eval
    `style-src 'self' 'unsafe-inline'`,    // Tailwind requires unsafe-inline for styles
    "font-src 'self' data:",              // Allow data: for inline fonts
    "img-src 'self' data: blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Security-Policy-Nonce", nonce);

  // ── Additional Hardening ───────────────────────────────────────────
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-XSS-Protection", "0"); // Disabled in favor of CSP
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes EXCEPT:
    // - API routes (handled separately)
    // - Next.js internals (_next/static, _next/image)
    // - Static files (favicon, robots, sitemap)
    { source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)", },
  ],
};
