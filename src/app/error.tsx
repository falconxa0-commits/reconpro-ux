"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ReconPro] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.08]">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-white/40"
            aria-hidden="true"
          >
            <path d="M12 9v4" strokeLinecap="round" />
            <circle cx="12" cy="13" r="3" />
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">
          Something went wrong
        </h2>
        <p className="text-sm text-white/40 mb-8 leading-relaxed">
          An unexpected error occurred. Our team has been notified.
          {error.digest && (
            <span className="block mt-2 text-white/20 font-mono text-xs">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white/60 hover:bg-white/[0.1] hover:text-white transition-all duration-300"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
