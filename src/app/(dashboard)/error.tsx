"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="p-8 max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={28} className="text-error" />
      </div>
      <h2 className="text-2xl font-extrabold text-on-surface mb-2">
        Something went wrong
      </h2>
      <p className="text-on-surface-variant max-w-md mb-2">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {error.digest && (
        <p className="text-xs text-outline mb-6 font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-[#4f55f1] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:brightness-110 transition-all"
        >
          Try Again
        </button>
        <a
          href="/dashboard"
          className="bg-surface-container-high text-on-surface px-6 py-3 rounded-xl font-semibold text-sm hover:bg-surface-container-highest transition-all"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
