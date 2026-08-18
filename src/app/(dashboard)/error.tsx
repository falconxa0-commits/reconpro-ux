"use client";

import { AlertCircle } from "lucide-react";

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
          <p className="text-sm text-[#555555] mt-1.5 max-w-sm">An unexpected error occurred. Please try again.</p>
        </div>
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
