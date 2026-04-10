"use client";

import { useState } from "react";

export interface PreviewField {
  selector: string;
  fieldLabel: string;
  profileKey: string;
  displayValue: string;
  confidence: number;
  confidenceReason: string;
  isSensitive: boolean;
  isValid: boolean;
  validationError?: string;
  autoFill: boolean;
}

export interface UnmappedField {
  selector: string;
  fieldLabel: string;
  reason: string;
}

interface FillPreviewCardProps {
  universityName: string;
  mapped: PreviewField[];
  unmapped: UnmappedField[];
  autoFillRate: number;
  onConfirm: (fieldInputs: { selector: string; value: string }[]) => void;
  onCancel: () => void;
}

export function FillPreviewCard({
  universityName,
  mapped,
  unmapped,
  autoFillRate,
  onConfirm,
  onCancel,
}: FillPreviewCardProps) {
  // State for user-editable values
  const [editedValues, setEditedValues] = useState<Record<string, string>>(
    Object.fromEntries(mapped.map((f) => [f.selector, f.displayValue]))
  );
  const [manualValues, setManualValues] = useState<Record<string, string>>(
    Object.fromEntries(unmapped.map((f) => [f.selector, ""]))
  );
  const [sensitiveConfirmed, setSensitiveConfirmed] = useState<Set<string>>(new Set());

  const handleConfirm = () => {
    const fieldInputs: { selector: string; value: string }[] = [];

    // Include all mapped fields (with edited values)
    for (const field of mapped) {
      const value = editedValues[field.selector] ?? field.displayValue;
      if (value) {
        fieldInputs.push({ selector: field.selector, value });
      }
    }

    // Include manually filled unmapped fields
    for (const field of unmapped) {
      const value = manualValues[field.selector];
      if (value?.trim()) {
        fieldInputs.push({ selector: field.selector, value });
      }
    }

    onConfirm(fieldInputs);
  };

  const getConfidenceBadge = (field: PreviewField) => {
    if (field.confidence >= 0.9) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
          <span className="material-symbols-outlined text-[12px]">check_circle</span>
          High
        </span>
      );
    }
    if (field.confidence >= 0.75) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400">
          <span className="material-symbols-outlined text-[12px]">info</span>
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400">
        <span className="material-symbols-outlined text-[12px]">warning</span>
        Low — confirm
      </span>
    );
  };

  const allSensitiveConfirmed = mapped
    .filter((f) => f.isSensitive)
    .every((f) => sensitiveConfirmed.has(f.selector));

  return (
    <div className="rounded-xl border border-white/10 bg-[#161b22] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20">
          <span className="material-symbols-outlined text-[18px] text-indigo-400">preview</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white/90 truncate">
            Review before filling — {universityName}
          </p>
          <p className="text-[11px] text-white/40 mt-[2px]">
            {autoFillRate}% of fields can be filled automatically
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 z-10 bg-[#1c2330]">
            <tr className="text-white/30 text-[10px] uppercase tracking-wider">
              <th className="text-left px-4 py-2 font-medium w-1/3">Field</th>
              <th className="text-left px-4 py-2 font-medium w-1/3">Value</th>
              <th className="text-left px-4 py-2 font-medium w-1/4">Confidence</th>
              <th className="px-4 py-2 w-[60px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {/* Mapped fields */}
            {mapped.map((field) => (
              <tr key={field.selector} className={field.isSensitive ? "bg-amber-500/[0.04]" : ""}>
                <td className="px-4 py-2.5">
                  <span className="text-white/70 font-medium">{field.fieldLabel}</span>
                  {field.isSensitive && (
                    <span className="ml-1.5 text-[9px] text-amber-400 font-semibold uppercase">
                      sensitive
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {field.isSensitive && !sensitiveConfirmed.has(field.selector) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-[11px]">••••••</span>
                      <button
                        onClick={() => setSensitiveConfirmed((s) => new Set([...s, field.selector]))}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-medium"
                      >
                        Reveal & confirm
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={editedValues[field.selector] ?? ""}
                      onChange={(e) =>
                        setEditedValues((v) => ({ ...v, [field.selector]: e.target.value }))
                      }
                      className="bg-transparent border-b border-white/10 focus:border-indigo-500/60 outline-none
                        text-white/80 text-[12px] w-full py-0.5 transition-colors placeholder:text-white/20"
                      placeholder="Enter value…"
                    />
                  )}
                  {field.validationError && (
                    <p className="text-[10px] text-red-400 mt-0.5">{field.validationError}</p>
                  )}
                </td>
                <td className="px-4 py-2.5">{getConfidenceBadge(field)}</td>
                <td className="px-4 py-2.5 text-center">
                  {field.autoFill ? (
                    <span className="material-symbols-outlined text-[14px] text-emerald-400">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-[14px] text-white/20">more_horiz</span>
                  )}
                </td>
              </tr>
            ))}

            {/* Unmapped required fields */}
            {unmapped.map((field) => (
              <tr key={field.selector} className="bg-amber-500/[0.03]">
                <td className="px-4 py-2.5">
                  <span className="text-white/70 font-medium">{field.fieldLabel}</span>
                  <span className="ml-1.5 text-[9px] text-amber-400 font-semibold uppercase">
                    needs input
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={manualValues[field.selector] ?? ""}
                    onChange={(e) =>
                      setManualValues((v) => ({ ...v, [field.selector]: e.target.value }))
                    }
                    className="bg-transparent border-b border-amber-500/30 focus:border-amber-400 outline-none
                      text-white/80 text-[12px] w-full py-0.5 transition-colors placeholder:text-amber-500/40"
                    placeholder="Type your answer…"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] text-amber-400">Missing</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="material-symbols-outlined text-[14px] text-amber-400">edit</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
        <p className="text-[11px] text-white/30">
          You can edit any value before filling. Sensitive fields are masked.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allSensitiveConfirmed && mapped.some((f) => f.isSensitive)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500
              text-white text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[14px]">play_arrow</span>
            Start Filling
          </button>
        </div>
      </div>

      {!allSensitiveConfirmed && mapped.some((f) => f.isSensitive) && (
        <p className="px-4 pb-3 text-[11px] text-amber-400">
          Please reveal and confirm all sensitive fields before proceeding.
        </p>
      )}
    </div>
  );
}
