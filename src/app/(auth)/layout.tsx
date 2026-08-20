import type { Metadata } from "next";
import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Auth | ReconPro",
  description: "Sign in to your ReconPro account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-black px-4 py-12 overflow-hidden">
      {/* Subtle radial gradient glow behind the logo area */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-white/[0.015] blur-[100px]" />

      {/* Logo */}
      <Link href="/" className="relative z-10 mb-8 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-[0_1px_6px_rgba(255,255,255,0.25)]">
          <Shield className="h-4 w-4 text-black" strokeWidth={2.5} />
        </div>
        <span className="text-[14px] font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          ReconPro
        </span>
      </Link>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}