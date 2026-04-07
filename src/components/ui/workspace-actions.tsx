"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/* ── Status Update Button ──────────────────────────────── */

const NEXT_STATUS: Record<string, { next: string; label: string; icon: string }> = {
  not_started: { next: "docs_pending", label: "Start Gathering Documents", icon: "folder_open" },
  docs_pending: { next: "sop_pending", label: "Move to SOP & LORs", icon: "edit_note" },
  sop_pending: { next: "ready", label: "Mark as Ready to Apply", icon: "fact_check" },
  ready: { next: "applied", label: "I Have Applied", icon: "send" },
  applied: { next: "decision", label: "Decision Received", icon: "gavel" },
};

export function StatusUpdateButton({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDecision, setShowDecision] = useState(false);

  const nextStep = NEXT_STATUS[currentStatus];
  if (!nextStep && currentStatus !== "applied") return null;

  const updateStatus = async (status: string, decision?: string) => {
    const body: Record<string, string> = { applicationId, status };
    if (decision) body.decision = decision;

    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    startTransition(() => {
      router.refresh();
    });
  };

  if (currentStatus === "applied" && !showDecision) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setShowDecision(true)}
          disabled={isPending}
          className="flex-1 px-4 py-3 bg-primary text-on-primary font-semibold rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">gavel</span>
          Record Decision
        </button>
      </div>
    );
  }

  if (showDecision) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-bold text-on-surface mb-2">What was the decision?</p>
        <div className="flex gap-2">
          <button
            onClick={() => updateStatus("decision", "accepted")}
            disabled={isPending}
            className="flex-1 px-3 py-2.5 bg-tertiary-fixed/10 text-tertiary font-semibold rounded-lg text-sm hover:bg-tertiary-fixed/20 transition-colors disabled:opacity-50"
          >
            Accepted
          </button>
          <button
            onClick={() => updateStatus("decision", "waitlisted")}
            disabled={isPending}
            className="flex-1 px-3 py-2.5 bg-secondary/10 text-secondary font-semibold rounded-lg text-sm hover:bg-secondary/20 transition-colors disabled:opacity-50"
          >
            Waitlisted
          </button>
          <button
            onClick={() => updateStatus("decision", "rejected")}
            disabled={isPending}
            className="flex-1 px-3 py-2.5 bg-error/10 text-error font-semibold rounded-lg text-sm hover:bg-error/20 transition-colors disabled:opacity-50"
          >
            Rejected
          </button>
        </div>
        <button
          onClick={() => setShowDecision(false)}
          className="text-xs text-secondary hover:text-on-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => updateStatus(nextStep.next)}
      disabled={isPending}
      className="w-full px-4 py-3 bg-primary text-on-primary font-semibold rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {isPending ? (
        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
      ) : (
        <span className="material-symbols-outlined text-sm">{nextStep.icon}</span>
      )}
      {isPending ? "Updating..." : nextStep.label}
    </button>
  );
}

/* ── Add Notes ─────────────────────────────────────────── */

export function ApplicationNotes({
  applicationId,
  initialNotes,
}: {
  applicationId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/applications/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, notes }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-on-surface">Notes</p>
        {!saved && (
          <button
            onClick={save}
            disabled={saving}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
        {saved && notes.length > 0 && (
          <span className="text-[10px] text-secondary">Auto-saved</span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        onBlur={() => {
          if (!saved) save();
        }}
        placeholder="Add private notes about this application..."
        className="w-full h-24 px-3 py-2 text-sm bg-surface-container-low rounded-lg border border-surface-container focus:border-primary focus:outline-none resize-none text-on-surface placeholder:text-secondary"
      />
    </div>
  );
}

/* ── Delete Application ────────────────────────────────── */

export function DeleteApplicationButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    await fetch("/api/applications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });

    startTransition(() => {
      router.push("/workspaces");
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex-1 px-3 py-2 bg-error text-white font-semibold rounded-lg text-xs hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Removing..." : "Yes, Remove"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 px-3 py-2 bg-surface-container text-on-surface font-semibold rounded-lg text-xs"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full px-4 py-2.5 text-error text-xs font-semibold rounded-lg hover:bg-error/5 transition-colors flex items-center justify-center gap-1.5"
    >
      <span className="material-symbols-outlined text-xs">delete</span>
      Remove from Workspaces
    </button>
  );
}
