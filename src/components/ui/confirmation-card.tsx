"use client";

import { useState } from "react";

export interface ConfirmationChange {
  field: string;
  oldValue?: string;
  newValue: string;
  section?: string;
}

export interface ConfirmationAction {
  id: string;
  type:
    | "profile_update"
    | "bulk_update"
    | "shortlist"
    | "application_status"
    | "sop_generated"
    | "application_remove"
    | "workspace_created"
    | "document_created";
  title: string;
  description?: string;
  changes: ConfirmationChange[];
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
}

interface ConfirmationCardProps {
  action: ConfirmationAction;
  onConfirm: (action: ConfirmationAction) => void;
  onReject: (action: ConfirmationAction) => void;
  onEdit?: (action: ConfirmationAction, editedChanges: ConfirmationChange[]) => void;
  disabled?: boolean;
}

const typeConfig: Record<
  ConfirmationAction["type"],
  { icon: string; color: string; label: string }
> = {
  profile_update: {
    icon: "person",
    color: "indigo",
    label: "Profile Update",
  },
  bulk_update: {
    icon: "upload_file",
    color: "amber",
    label: "Bulk Profile Update",
  },
  shortlist: {
    icon: "bookmark_add",
    color: "emerald",
    label: "Add to Shortlist",
  },
  application_status: {
    icon: "update",
    color: "blue",
    label: "Status Change",
  },
  sop_generated: {
    icon: "description",
    color: "purple",
    label: "SOP Generated",
  },
  application_remove: {
    icon: "bookmark_remove",
    color: "red",
    label: "Remove Application",
  },
  workspace_created: {
    icon: "workspaces",
    color: "emerald",
    label: "Create Workspace",
  },
  document_created: {
    icon: "description",
    color: "blue",
    label: "Create Document",
  },
};

const colorClasses: Record<string, { bg: string; border: string; text: string; btnBg: string }> = {
  indigo: {
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    text: "text-indigo-400",
    btnBg: "bg-indigo-600 hover:bg-indigo-500",
  },
  amber: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    btnBg: "bg-amber-600 hover:bg-amber-500",
  },
  emerald: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    btnBg: "bg-emerald-600 hover:bg-emerald-500",
  },
  blue: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    btnBg: "bg-blue-600 hover:bg-blue-500",
  },
  purple: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-400",
    btnBg: "bg-purple-600 hover:bg-purple-500",
  },
  red: {
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    text: "text-red-400",
    btnBg: "bg-red-600 hover:bg-red-500",
  },
};

export function ConfirmationCard({
  action,
  onConfirm,
  onReject,
  onEdit,
  disabled,
}: ConfirmationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedChanges, setEditedChanges] = useState<ConfirmationChange[]>(action.changes);
  const [resolved, setResolved] = useState<"confirmed" | "rejected" | null>(null);

  const config = typeConfig[action.type];
  const colors = colorClasses[config.color];

  if (resolved) {
    return (
      <div
        className={`rounded-2xl border p-4 ${
          resolved === "confirmed"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-red-500/20 bg-red-500/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {resolved === "confirmed" ? "check_circle" : "cancel"}
          </span>
          <span
            className={`text-sm font-semibold ${
              resolved === "confirmed" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {resolved === "confirmed" ? "Confirmed" : "Cancelled"}: {action.title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
        <div
          className={`w-8 h-8 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}
        >
          <span
            className={`material-symbols-outlined text-lg ${colors.text}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {config.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${colors.text}`}>
              {config.label}
            </span>
            <span className="text-[10px] text-slate-600">Requires Confirmation</span>
          </div>
          <p className="text-sm font-semibold text-white truncate">{action.title}</p>
        </div>
      </div>

      {/* Changes */}
      <div className="px-5 py-3 space-y-2">
        {action.description && (
          <p className="text-xs text-slate-400 mb-3">{action.description}</p>
        )}

        {action.type === "sop_generated" ? (
          <div className="text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto">
            {action.changes[0]?.newValue?.slice(0, 400)}
            {(action.changes[0]?.newValue?.length ?? 0) > 400 && "..."}
          </div>
        ) : (
          <div className="space-y-1.5">
            {(isEditing ? editedChanges : action.changes).map((change, i) => (
              <div
                key={`${change.field}-${i}`}
                className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/[0.03]"
              >
                <span className="text-[11px] font-semibold text-slate-500 min-w-[120px] capitalize">
                  {change.field.replace(/_/g, " ")}
                </span>
                {change.oldValue && (
                  <>
                    <span className="text-xs text-red-400/70 line-through">
                      {change.oldValue}
                    </span>
                    <span className="material-symbols-outlined text-xs text-slate-600">
                      arrow_forward
                    </span>
                  </>
                )}
                {isEditing ? (
                  <input
                    type="text"
                    value={editedChanges[i]?.newValue ?? ""}
                    onChange={(e) => {
                      const updated = [...editedChanges];
                      updated[i] = { ...updated[i], newValue: e.target.value };
                      setEditedChanges(updated);
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                ) : (
                  <span className="text-xs text-emerald-400 font-medium">
                    {change.newValue}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-white/5">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                onEdit?.(action, editedChanges);
                setResolved("confirmed");
              }}
              disabled={disabled}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save Changes
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedChanges(action.changes);
              }}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-all"
            >
              Cancel Edit
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                onConfirm(action);
                setResolved("confirmed");
              }}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${colors.btnBg} text-white text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50`}
            >
              <span className="material-symbols-outlined text-sm">check</span>
              Confirm
            </button>
            {onEdit && action.type !== "sop_generated" && action.type !== "application_remove" && (
              <button
                onClick={() => setIsEditing(true)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 text-[11px] font-bold uppercase tracking-wider hover:text-white hover:border-white/10 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
            )}
            <button
              onClick={() => {
                onReject(action);
                setResolved("rejected");
              }}
              disabled={disabled}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-red-400 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/10 hover:border-red-500/20 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Cancel
            </button>
          </>
        )}
      </div>

      <p className="px-5 pb-3 text-[10px] text-slate-600">
        Riz AI needs your permission to perform this action.
      </p>
    </div>
  );
}
