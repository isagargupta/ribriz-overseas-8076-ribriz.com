"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DOC_TYPES = [
  { type: "sop", label: "Statement of Purpose", icon: "edit_note" },
  { type: "motivation", label: "Motivation Letter", icon: "psychology" },
  { type: "lor", label: "Letter of Recommendation", icon: "mail" },
  { type: "cv", label: "Resume / CV", icon: "person" },
  { type: "essay", label: "Supplemental Essay", icon: "article" },
  { type: "research", label: "Research Proposal", icon: "science" },
  { type: "cover_letter", label: "Cover Letter", icon: "drafts" },
] as const;

/**
 * Button that creates a document tied to an application and opens the editor.
 */
export function GenerateDocButton({
  applicationId,
  type,
  label,
  icon,
  variant = "primary",
}: {
  applicationId: string;
  type: string;
  label: string;
  icon: string;
  variant?: "primary" | "outline";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/app-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, type }),
      });
      const data = await res.json();
      const doc = data.document;
      if (doc?.id) {
        router.push(`/editor/${doc.id}`);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50 ${
        variant === "primary"
          ? "bg-primary text-on-primary hover:opacity-90"
          : "bg-surface-container-low text-on-surface hover:bg-surface-container-highest border border-surface-container"
      }`}
    >
      {loading ? (
        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
      ) : (
        <span className="material-symbols-outlined text-sm">{icon}</span>
      )}
      {loading ? "Opening..." : label}
    </button>
  );
}

/**
 * Full document generation panel for a workspace.
 * Shows all document types available + existing docs.
 */
export function DocumentGeneratorPanel({
  applicationId,
  existingDocs,
}: {
  applicationId: string;
  existingDocs: { id: string; type: string; title: string; wordCount: number; isComplete: boolean; lastEditedAt: string }[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  const createAndOpen = async (type: string) => {
    setCreating(type);
    try {
      const res = await fetch("/api/app-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, type }),
      });
      const data = await res.json();
      const doc = data.document;
      if (doc?.id) {
        router.push(`/editor/${doc.id}`);
      }
    } catch {
      setCreating(null);
    }
  };

  // Group existing docs by type
  const existingByType = new Map<string, typeof existingDocs[0]>();
  for (const doc of existingDocs) {
    existingByType.set(doc.type, doc);
  }

  return (
    <div className="space-y-3">
      {DOC_TYPES.map((dt) => {
        const existing = existingByType.get(dt.type);
        return (
          <div
            key={dt.type}
            className="flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className={`material-symbols-outlined text-lg ${
                  existing
                    ? existing.isComplete
                      ? "text-tertiary"
                      : "text-primary"
                    : "text-outline-variant"
                }`}
              >
                {dt.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-on-surface">{dt.label}</p>
                {existing ? (
                  <p className="text-[10px] text-secondary">
                    {existing.wordCount} words &middot;{" "}
                    {existing.isComplete ? "Complete" : "Draft"} &middot; Last
                    edited{" "}
                    {new Date(existing.lastEditedAt).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-[10px] text-secondary">Not started</p>
                )}
              </div>
            </div>
            {existing ? (
              <button
                onClick={() => router.push(`/editor/${existing.id}`)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Continue
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={() => createAndOpen(dt.type)}
                disabled={creating === dt.type}
                className="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {creating === dt.type ? (
                  <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-xs">add</span>
                )}
                Start
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
