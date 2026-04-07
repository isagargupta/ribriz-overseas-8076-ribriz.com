"use client";

import Link from "next/link";

/* ── University Result Card ──────────────────────────────── */

interface UniResult {
  programId?: string;
  university: string;
  country: string;
  city?: string;
  qsRanking?: number | null;
  program: string;
  field?: string;
  tuition?: string;
  duration?: string;
  deadline?: string;
  scholarships?: number;
  stemDesignated?: boolean;
  acceptanceRate?: number | null;
  match?: {
    score: number;
    badge: string;
    bucket?: string;
  } | null;
  links?: {
    auditPage?: string;
  };
}

function matchColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" };
  if (score >= 60) return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" };
  if (score >= 40) return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" };
  return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" };
}

function bucketBadge(bucket?: string) {
  switch (bucket) {
    case "SAFETY": return { bg: "bg-emerald-500/15", text: "text-emerald-400" };
    case "TARGET": return { bg: "bg-blue-500/15", text: "text-blue-400" };
    case "REACH": return { bg: "bg-amber-500/15", text: "text-amber-400" };
    case "LONG SHOT": return { bg: "bg-red-500/15", text: "text-red-400" };
    default: return { bg: "bg-slate-500/15", text: "text-slate-400" };
  }
}

export function UniversityResultCard({ uni }: { uni: UniResult }) {
  const mc = uni.match ? matchColor(uni.match.score) : null;
  const bb = uni.match?.bucket ? bucketBadge(uni.match.bucket) : null;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate">{uni.university}</h4>
          <p className="text-xs text-slate-400 truncate">{uni.program}</p>
          <p className="text-[10px] text-slate-500">{uni.city ? `${uni.city}, ` : ""}{uni.country}</p>
        </div>
        {uni.match && mc && (
          <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg ${mc.bg} border ${mc.border}`}>
            <span className={`text-lg font-bold ${mc.text}`}>{uni.match.score}%</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">match</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {uni.qsRanking && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-semibold">
            QS #{uni.qsRanking}
          </span>
        )}
        {bb && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${bb.bg} ${bb.text} font-bold uppercase tracking-wider`}>
            {uni.match?.bucket}
          </span>
        )}
        {uni.stemDesignated && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-semibold">
            STEM
          </span>
        )}
        {uni.scholarships && uni.scholarships > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold">
            {uni.scholarships} scholarship{uni.scholarships > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 mb-3">
        {uni.tuition && <span>{uni.tuition}</span>}
        {uni.duration && <span>{uni.duration}</span>}
        {uni.deadline && uni.deadline !== "Rolling" && <span>Deadline: {uni.deadline}</span>}
        {uni.acceptanceRate != null && <span>{(uni.acceptanceRate * 100).toFixed(0)}% acceptance</span>}
      </div>

      {/* Action */}
      {uni.links?.auditPage && (
        <Link
          href={uni.links.auditPage}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span className="material-symbols-outlined text-xs">analytics</span>
          View Full Audit
        </Link>
      )}
    </div>
  );
}

export function UniversityGrid({ results }: { results: UniResult[] }) {
  if (!results || results.length === 0) return null;

  return (
    <div className="my-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.slice(0, 8).map((uni, i) => (
          <UniversityResultCard key={`${uni.university}-${i}`} uni={uni} />
        ))}
      </div>
      {results.length > 8 && (
        <p className="text-xs text-slate-500 mt-2 text-center">
          + {results.length - 8} more results
        </p>
      )}
    </div>
  );
}

/* ── Audit Result Card ───────────────────────────────────── */

interface AuditResult {
  university: string;
  program: string;
  country: string;
  overallScore: number;
  admissionProbability: { low: number; high: number; label: string };
  hardFiltersFailed: string[];
  verdict: string;
  parameters: { name: string; status: string; score: number; weight: number; studentValue: string; requiredValue: string; gap: string | null; isHardFilter: boolean }[];
  strengths: string[];
  risks: string[];
  links?: { fullAuditPage: string };
}

function paramStatusStyle(status: string) {
  switch (status) {
    case "exceeds": return { icon: "verified", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    case "meets": return { icon: "check_circle", color: "text-blue-400", bg: "bg-blue-500/10" };
    case "borderline": return { icon: "help", color: "text-amber-400", bg: "bg-amber-500/10" };
    case "below": return { icon: "error", color: "text-red-400", bg: "bg-red-500/10" };
    case "missing": return { icon: "cancel", color: "text-red-400", bg: "bg-red-500/10" };
    case "auto_reject": return { icon: "block", color: "text-red-500", bg: "bg-red-500/15" };
    default: return { icon: "remove_circle_outline", color: "text-slate-400", bg: "bg-slate-500/10" };
  }
}

export function AuditResultCard({ audit }: { audit: AuditResult }) {
  const probColor = audit.admissionProbability.label === "Strong" ? "text-emerald-400" :
    audit.admissionProbability.label === "Competitive" ? "text-blue-400" :
    audit.admissionProbability.label === "Moderate" ? "text-amber-400" : "text-red-400";

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">{audit.university}</h4>
          <p className="text-xs text-slate-400">{audit.program} · {audit.country}</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${probColor}`}>
            {audit.admissionProbability.low}–{audit.admissionProbability.high}%
          </p>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">{audit.admissionProbability.label}</p>
        </div>
      </div>

      {/* Hard filter warning */}
      {audit.hardFiltersFailed.length > 0 && (
        <div className="px-4 py-2 bg-red-500/5 border-b border-red-500/10">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Auto-Reject Risks</p>
          {audit.hardFiltersFailed.map((hf, i) => (
            <p key={i} className="text-xs text-red-400/80 flex items-start gap-1.5">
              <span className="material-symbols-outlined text-xs mt-0.5">block</span>{hf}
            </p>
          ))}
        </div>
      )}

      {/* Parameters */}
      <div className="p-4 space-y-2">
        {audit.parameters.filter(p => p.weight > 0).slice(0, 6).map((p) => {
          const s = paramStatusStyle(p.status);
          return (
            <div key={p.name} className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-sm ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              <span className="text-xs text-slate-300 flex-1 min-w-0 truncate">{p.name}</span>
              <span className="text-[10px] text-slate-500">{p.studentValue}</span>
              <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full ${p.score >= 80 ? "bg-emerald-500" : p.score >= 50 ? "bg-blue-500" : "bg-red-500"}`} style={{ width: `${p.score}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div className="px-4 pb-3">
        <p className="text-xs text-slate-400 leading-relaxed">{audit.verdict}</p>
      </div>

      {/* Action */}
      {audit.links?.fullAuditPage && (
        <div className="px-4 pb-4">
          <Link
            href={audit.links.fullAuditPage}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span className="material-symbols-outlined text-xs">open_in_new</span>
            View Full Admission Audit
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Workspace Created Card ──────────────────────────────── */

interface WorkspaceResult {
  message: string;
  applicationId?: string;
  link?: string;
  nextStep?: string;
}

export function WorkspaceCreatedCard({ result }: { result: WorkspaceResult }) {
  return (
    <div className="my-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-emerald-400">workspaces</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">{result.message}</p>
          {result.nextStep && <p className="text-xs text-slate-400 mb-3">{result.nextStep}</p>}
          {result.link && (
            <Link
              href={result.link}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Open Workspace
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Document Created Card ───────────────────────────────── */

interface DocResult {
  message: string;
  documentId?: string;
  editorLink?: string;
  workspaceLink?: string;
  tip?: string;
}

export function DocumentCreatedCard({ result }: { result: DocResult }) {
  return (
    <div className="my-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-blue-400">description</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">{result.message}</p>
          {result.tip && <p className="text-xs text-slate-400 mb-3">{result.tip}</p>}
          <div className="flex gap-2">
            {result.editorLink && (
              <Link
                href={result.editorLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Open Editor
              </Link>
            )}
            {result.workspaceLink && (
              <Link
                href={result.workspaceLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold hover:bg-white/10 transition-colors"
              >
                View Workspace
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Application List Card ───────────────────────────────── */

interface AppResult {
  applicationId: string;
  university: string;
  country: string;
  program: string;
  status: string;
  matchScore: number | null;
  documents: {
    total: number;
    complete: number;
    inProgress: number;
  };
  links: { workspace: string; audit: string };
}

const statusColors: Record<string, string> = {
  not_started: "text-slate-400",
  docs_pending: "text-amber-400",
  sop_pending: "text-blue-400",
  ready: "text-emerald-400",
  applied: "text-indigo-400",
  decision: "text-purple-400",
};

export function ApplicationListCard({ apps }: { apps: AppResult[] }) {
  if (!apps || apps.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      {apps.map((app) => (
        <div key={app.applicationId} className="rounded-lg border border-white/5 bg-white/[0.02] p-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="text-sm font-bold text-white truncate">{app.university}</h4>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColors[app.status] ?? "text-slate-400"}`}>
                {app.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-slate-500">{app.program} · {app.country}</p>
            <div className="flex items-center gap-3 mt-1.5">
              {app.matchScore != null && (
                <span className="text-[10px] text-slate-400">Match: {Math.round(app.matchScore)}%</span>
              )}
              <span className="text-[10px] text-slate-500">
                Docs: {app.documents.complete}/{app.documents.total}
              </span>
              {/* progress bar */}
              <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${app.documents.complete === app.documents.total ? "bg-emerald-500" : "bg-blue-500"}`}
                  style={{ width: `${app.documents.total > 0 ? (app.documents.complete / app.documents.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          <Link
            href={app.links.workspace}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            Open
          </Link>
        </div>
      ))}
    </div>
  );
}

/* ── SOP Generated Card ──────────────────────────────────── */

interface SopResult {
  sop: string;
  wordCount: number;
  university: string;
  program: string;
  editorLink?: string | null;
  workspaceLink?: string | null;
  note?: string;
}

export function SopGeneratedCard({ result }: { result: SopResult }) {
  return (
    <div className="my-3 rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-500/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-400">edit_note</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">SOP Generated</p>
            <p className="text-xs text-slate-400">{result.university} — {result.program}</p>
          </div>
        </div>
        <span className="text-xs text-slate-500">{result.wordCount} words</span>
      </div>

      {/* Preview */}
      <div className="px-4 py-3 max-h-32 overflow-y-auto">
        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
          {result.sop.substring(0, 300)}...
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-purple-500/10 flex items-center gap-3">
        {result.editorLink && (
          <Link
            href={result.editorLink}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-colors"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit in Workspace
          </Link>
        )}
        {result.workspaceLink && (
          <Link
            href={result.workspaceLink}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">workspaces</span>
            View Workspace
          </Link>
        )}
      </div>

      {result.note && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-slate-500 flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[10px] mt-0.5">info</span>
            {result.note}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Master Parser ────────────────────────────────────────
   Attempts to detect structured tool results in the AI's
   response and render them as rich components.
   Returns null if no structured data found.
──────────────────────────────────────────────────────── */

export function tryParseRichContent(text: string): React.ReactNode | null {
  // Look for JSON blocks in the text that contain structured results
  // The AI sometimes wraps tool results in the response

  // Try to find university search results
  try {
    // Check for patterns that indicate tool results embedded in response
    // This is a fallback — the primary rendering happens via toolResults

    return null; // Only used when explicit structured data is found
  } catch {
    return null;
  }
}

/* ── Tool Result Renderer ─────────────────────────────────
   Given a tool name and its JSON result, render as rich UI
──────────────────────────────────────────────────────── */

export function renderToolResult(toolName: string, resultJson: string): React.ReactNode | null {
  try {
    const data = JSON.parse(resultJson);

    switch (toolName) {
      case "search_universities": {
        if (data.results && data.results.length > 0) {
          return <UniversityGrid results={data.results} />;
        }
        return null;
      }

      case "run_admission_audit": {
        if (data.overallScore !== undefined) {
          return <AuditResultCard audit={data} />;
        }
        return null;
      }

      case "create_workspace": {
        if (data.link || data.applicationId) {
          return <WorkspaceCreatedCard result={data} />;
        }
        return null;
      }

      case "create_document": {
        if (data.editorLink || data.documentId) {
          return <DocumentCreatedCard result={data} />;
        }
        return null;
      }

      case "get_my_applications": {
        if (data.applications && data.applications.length > 0) {
          return <ApplicationListCard apps={data.applications} />;
        }
        return null;
      }

      case "generate_sop": {
        if (data.sop && (data.editorLink || data.workspaceLink)) {
          return <SopGeneratedCard result={data} />;
        }
        return null;
      }

      case "check_eligibility": {
        if (data.results && data.results.length > 0) {
          // Convert eligibility results to audit-like cards
          return (
            <div className="my-3 space-y-3">
              {data.results.slice(0, 5).map((r: Record<string, unknown>, i: number) => (
                <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{String(r.university)}</h4>
                      <p className="text-xs text-slate-400">{String(r.program)}</p>
                    </div>
                    <div className={`text-right px-3 py-1 rounded-lg ${(r.matchScore as number) >= 70 ? "bg-emerald-500/10 text-emerald-400" : (r.matchScore as number) >= 50 ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}>
                      <span className="text-lg font-bold">{String(r.matchScore)}%</span>
                      <p className="text-[9px] uppercase tracking-wider">{String(r.badge)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return null;
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}
