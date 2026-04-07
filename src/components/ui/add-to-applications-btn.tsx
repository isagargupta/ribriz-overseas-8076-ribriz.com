"use client";

import { useState } from "react";
import { Plus, Check, Loader2 } from "lucide-react";

export function AddToApplicationsButton({
  programId,
  matchScore,
}: {
  programId: string;
  matchScore: number;
}) {
  const [state, setState] = useState<"idle" | "loading" | "added" | "exists">("idle");

  const handleClick = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, matchScore }),
      });
      if (res.status === 409) {
        setState("exists");
      } else if (res.ok) {
        setState("added");
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  };

  if (state === "added" || state === "exists") {
    return (
      <span className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2">
        <Check size={16} /> {state === "added" ? "Added!" : "Already added"}
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="bg-secondary text-on-secondary px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
    >
      {state === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
      Add to Applications
    </button>
  );
}
