"use client";

import { useState } from "react";
import Link from "next/link";

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-md">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="material-symbols-outlined text-lg shrink-0"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          info
        </span>
        <p className="text-sm font-medium truncate">
          Complete your profile to unlock university matching and AI recommendations.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/onboarding"
          className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors"
        >
          Complete Now
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/60 hover:text-white transition-colors p-1"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
}
