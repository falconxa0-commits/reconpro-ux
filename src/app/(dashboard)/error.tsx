"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-[#ff3355]/60" />
        </div>
        <div>
          <p className="text-lg font-medium text-white">Something went wrong</p>
          <p className="text-[13px] text-neutral-600 mt-1.5">{error.message}</p>
          <p className="text-sm text-[#555555] mt-1 max-w-sm">An unexpected error occurred. Please try again.</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/overview"
            className="px-5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-[13px] font-medium hover:bg-white/[0.06] transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="text-[11px] text-neutral-800 font-mono mt-4">{error.digest}</p>
        )}
      </div>
    </div>
  );
}
