"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PersonaResult {
  name: string;
  role: string;
  verdict: "admit" | "waitlist" | "reject";
  confidence: number;
  reasoning: string;
  concerns: string[];
  strengths: string[];
}

interface Improvement {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
}

interface SimulationResult {
  personas: PersonaResult[];
  finalVerdict: string;
  finalConfidence: number;
  synthesis: string;
  agreements: string[];
  disagreements: string[];
  improvements: Improvement[];
  university: string;
  program: string;
}

interface Application {
  id: string;
  matchScore: number | null;
  program: {
    name: string;
    university: { name: string; country: string };
  };
}

const verdictColors: Record<string, { bg: string; text: string; border: string }> = {
  admit: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  waitlist: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  reject: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

const impactColors: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-blue-400",
};

const personaIcons: Record<string, string> = {
  "Department Head": "school",
  "International Office": "public",
  "Scholarship Committee": "payments",
  "Student Affairs": "groups",
};

export default function WarRoomPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingApps, setLoadingApps] = useState(true);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => {
        setApplications(data.applications ?? data ?? []);
        setLoadingApps(false);
      })
      .catch(() => setLoadingApps(false));
  }, []);

  const runSimulation = async () => {
    if (!selectedApp) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/war-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: selectedApp }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Simulation failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/10">
            <span className="material-symbols-outlined text-[22px] text-red-400">gavel</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/90 font-headline">Admission War Room</h1>
            <p className="text-[13px] text-white/40">Simulate how an admission committee would evaluate your application</p>
          </div>
        </div>
      </div>

      {/* Application Selector */}
      <div className="mb-8 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <label className="block text-[13px] text-white/50 mb-2 font-medium">Select an application to evaluate</label>
        <div className="flex gap-3">
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[14px] text-white/80
              focus:outline-none focus:border-indigo-500/40 transition-colors"
          >
            <option value="">Choose an application...</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.program.name} — {app.program.university.name} ({app.program.university.country})
                {app.matchScore ? ` • ${Math.round(app.matchScore)}% match` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={runSimulation}
            disabled={!selectedApp || loading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white text-[14px] font-medium
              hover:from-red-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Simulating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                Run Simulation
              </span>
            )}
          </button>
        </div>

        {loadingApps && (
          <p className="text-[13px] text-white/30 mt-2">Loading your applications...</p>
        )}
        {!loadingApps && applications.length === 0 && (
          <p className="text-[13px] text-white/30 mt-2">
            No applications found. <Link href="/universities" className="text-indigo-400 hover:underline">Add universities first</Link>.
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[14px]">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[20px] text-indigo-400 animate-spin">progress_activity</span>
              <p className="text-[14px] text-white/60">4 committee members are reviewing your application in parallel...</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["Department Head", "International Office", "Scholarship Committee", "Student Affairs"].map((role) => (
                <div key={role} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[18px] text-white/20">{personaIcons[role]}</span>
                    <span className="text-[12px] text-white/30">{role}</span>
                  </div>
                  <div className="h-3 rounded bg-white/[0.06] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Final Verdict */}
          <div className={`p-6 rounded-xl border ${verdictColors[result.finalVerdict]?.border ?? "border-white/10"} ${verdictColors[result.finalVerdict]?.bg ?? "bg-white/5"}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[12px] text-white/40 uppercase tracking-wider mb-1">Committee Decision</p>
                <p className={`text-2xl font-bold capitalize ${verdictColors[result.finalVerdict]?.text ?? "text-white"}`}>
                  {result.finalVerdict}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-white/40 mb-1">Confidence</p>
                <p className="text-2xl font-bold text-white/80">{result.finalConfidence}%</p>
              </div>
            </div>
            <p className="text-[14px] text-white/60 leading-relaxed">{result.synthesis}</p>
            <p className="text-[12px] text-white/30 mt-3">
              {result.university} — {result.program}
            </p>
          </div>

          {/* Persona Cards */}
          <div>
            <h2 className="text-[15px] font-semibold text-white/70 mb-3">Committee Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.personas.map((persona, i) => {
                const vc = verdictColors[persona.verdict] ?? verdictColors.waitlist;
                return (
                  <div key={i} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px] text-indigo-400">
                          {personaIcons[persona.role] ?? "person"}
                        </span>
                        <div>
                          <p className="text-[14px] font-medium text-white/80">{persona.name}</p>
                          <p className="text-[11px] text-white/35">{persona.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-semibold capitalize px-2.5 py-0.5 rounded-md ${vc.bg} ${vc.text}`}>
                          {persona.verdict}
                        </span>
                        <span className="text-[12px] text-white/40">{persona.confidence}%</span>
                      </div>
                    </div>

                    <p className="text-[13px] text-white/50 mb-3 leading-relaxed">{persona.reasoning}</p>

                    {persona.strengths.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[11px] text-emerald-400/70 uppercase tracking-wider mb-1">Strengths</p>
                        <div className="flex flex-wrap gap-1.5">
                          {persona.strengths.map((s, j) => (
                            <span key={j} className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {persona.concerns.length > 0 && (
                      <div>
                        <p className="text-[11px] text-red-400/70 uppercase tracking-wider mb-1">Concerns</p>
                        <div className="flex flex-wrap gap-1.5">
                          {persona.concerns.map((c, j) => (
                            <span key={j} className="text-[11px] px-2 py-0.5 rounded bg-red-500/10 text-red-400/70">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agreements & Disagreements */}
          {(result.agreements.length > 0 || result.disagreements.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.agreements.length > 0 && (
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <h3 className="text-[13px] font-medium text-emerald-400 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">handshake</span>
                    Committee Agreed
                  </h3>
                  <ul className="space-y-2">
                    {result.agreements.map((a, i) => (
                      <li key={i} className="text-[13px] text-white/50 flex items-start gap-2">
                        <span className="text-emerald-400/50 mt-0.5">+</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.disagreements.length > 0 && (
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <h3 className="text-[13px] font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">forum</span>
                    Points of Debate
                  </h3>
                  <ul className="space-y-2">
                    {result.disagreements.map((d, i) => (
                      <li key={i} className="text-[13px] text-white/50 flex items-start gap-2">
                        <span className="text-amber-400/50 mt-0.5">~</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Improvements */}
          {result.improvements.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <h3 className="text-[13px] font-medium text-white/70 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-indigo-400">trending_up</span>
                Top Improvements to Make
              </h3>
              <div className="space-y-3">
                {result.improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                    <span className="text-[14px] font-bold text-white/20 mt-0.5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-medium text-white/70">{imp.title}</p>
                        <span className={`text-[10px] uppercase tracking-wider ${impactColors[imp.impact]}`}>
                          {imp.impact} impact
                        </span>
                      </div>
                      <p className="text-[12px] text-white/40">{imp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Re-run button */}
          <div className="flex justify-center">
            <button
              onClick={runSimulation}
              className="px-6 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/60 text-[13px]
                hover:bg-white/[0.08] hover:text-white/80 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Improve & Re-run Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
