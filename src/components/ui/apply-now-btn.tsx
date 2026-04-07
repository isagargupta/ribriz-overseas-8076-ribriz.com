"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApplyNowButton({
  programId,
  matchScore,
  universityName,
}: {
  programId: string;
  matchScore: number;
  universityName: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading">("idle");

  const handleClick = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/applications/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, matchScore }),
      });
      const data = await res.json();

      if (res.ok || res.status === 409) {
        // Redirect to application workspace
        const appId = data.application?.id ?? data.applicationId;
        router.push(`/applications/${appId}`);
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="w-full px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-3 text-lg"
    >
      {state === "loading" ? (
        <>
          <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
          Setting up workspace...
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-xl">rocket_launch</span>
          Apply to {universityName}
        </>
      )}
    </button>
  );
}
