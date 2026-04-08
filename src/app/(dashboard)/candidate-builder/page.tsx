"use client";

import { useState, useEffect } from "react";

interface Milestone {
  month: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  completed: boolean;
  completedAt: string | null;
}

interface Roadmap {
  id: string;
  targetDate: string;
  targetPrograms: string[];
  milestones: Milestone[];
  status: string;
  lastReviewedAt: string | null;
  createdAt: string;
}

const categoryConfig: Record<string, { icon: string; color: string }> = {
  academic: { icon: "school", color: "text-blue-400" },
  test_prep: { icon: "quiz", color: "text-purple-400" },
  experience: { icon: "work", color: "text-emerald-400" },
  research: { icon: "science", color: "text-cyan-400" },
  extracurricular: { icon: "groups", color: "text-amber-400" },
  documents: { icon: "description", color: "text-orange-400" },
  networking: { icon: "connect_without_contact", color: "text-pink-400" },
};

const priorityBadge: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function CandidateBuilderPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [targetDate, setTargetDate] = useState("");
  const [targetPrograms, setTargetPrograms] = useState("");

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    try {
      const res = await fetch("/api/ai/candidate-builder");
      const data = await res.json();
      const list = data.roadmaps ?? [];
      setRoadmaps(list);
      if (list.length > 0) setActiveRoadmap(list[0]);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const generateRoadmap = async () => {
    if (!targetDate || !targetPrograms.trim()) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/ai/candidate-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          targetDate,
          targetPrograms: targetPrograms.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newRoadmap: Roadmap = {
        id: data.id,
        targetDate: data.targetDate,
        targetPrograms: data.targetPrograms,
        milestones: data.milestones,
        status: "active",
        lastReviewedAt: null,
        createdAt: new Date().toISOString(),
      };

      setRoadmaps([newRoadmap, ...roadmaps]);
      setActiveRoadmap(newRoadmap);
      setShowForm(false);
    } catch {
      // Error handled silently
    } finally {
      setGenerating(false);
    }
  };

  const toggleMilestone = async (index: number) => {
    if (!activeRoadmap) return;

    try {
      const res = await fetch("/api/ai/candidate-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_milestone",
          roadmapId: activeRoadmap.id,
          milestoneIndex: index,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;

      setActiveRoadmap({ ...activeRoadmap, milestones: data.milestones });
    } catch {
      // Error handled silently
    }
  };

  const completedCount = activeRoadmap?.milestones.filter((m) => m.completed).length ?? 0;
  const totalCount = activeRoadmap?.milestones.length ?? 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group milestones by month
  const milestonesByMonth = activeRoadmap?.milestones.reduce<Record<number, Milestone[]>>((acc, m) => {
    (acc[m.month] ??= []).push(m);
    return acc;
  }, {}) ?? {};

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/10">
            <span className="material-symbols-outlined text-[22px] text-emerald-400">rocket_launch</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/90 font-headline">Build My Profile</h1>
            <p className="text-[13px] text-white/40">AI-generated month-by-month roadmap to strengthen your application</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium
            hover:bg-indigo-500 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Roadmap
        </button>
      </div>

      {/* New Roadmap Form */}
      {showForm && (
        <div className="mb-8 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4">
          <div>
            <label className="block text-[13px] text-white/50 mb-2">Target application date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[14px] text-white/80
                focus:outline-none focus:border-indigo-500/40"
            />
          </div>
          <div>
            <label className="block text-[13px] text-white/50 mb-2">
              Target programs (comma-separated)
            </label>
            <input
              type="text"
              value={targetPrograms}
              onChange={(e) => setTargetPrograms(e.target.value)}
              placeholder="e.g. MS CS at TU Munich, MS Data Science at ETH Zurich"
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[14px] text-white/80
                placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40"
            />
          </div>
          <button
            onClick={generateRoadmap}
            disabled={generating || !targetDate || !targetPrograms.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[14px] font-medium
              hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Generating roadmap...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Generate with AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-[32px] text-white/20 animate-spin">progress_activity</span>
          <p className="text-[14px] text-white/30 mt-3">Loading your roadmaps...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && roadmaps.length === 0 && !showForm && (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-[48px] text-white/10 mb-4 block">rocket_launch</span>
          <p className="text-[16px] text-white/40 mb-2">No roadmaps yet</p>
          <p className="text-[13px] text-white/25 mb-6">
            Create a roadmap to get a month-by-month plan for strengthening your profile
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-[14px] font-medium
              hover:bg-indigo-500 transition-all"
          >
            Create Your First Roadmap
          </button>
        </div>
      )}

      {/* Active Roadmap */}
      {activeRoadmap && (
        <div className="space-y-6">
          {/* Roadmap Tabs (if multiple) */}
          {roadmaps.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {roadmaps.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRoadmap(r)}
                  className={`px-4 py-2 rounded-lg text-[12px] whitespace-nowrap transition-all border
                    ${activeRoadmap.id === r.id
                      ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-300"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"
                    }`}
                >
                  {r.targetPrograms.slice(0, 2).join(", ")}
                  {r.targetPrograms.length > 2 ? ` +${r.targetPrograms.length - 2}` : ""}
                </button>
              ))}
            </div>
          )}

          {/* Progress Overview */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[14px] font-medium text-white/70">Progress</p>
                <p className="text-[12px] text-white/35 mt-0.5">
                  Target: {new Date(activeRoadmap.targetDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  {" · "}
                  {activeRoadmap.targetPrograms.join(", ")}
                </p>
              </div>
              <span className="text-[20px] font-bold text-white/60">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-white/25 mt-2">
              {completedCount} of {totalCount} milestones completed
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {Object.entries(milestonesByMonth)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([month, milestones]) => {
                const monthCompleted = milestones.every((m) => m.completed);
                return (
                  <div key={month}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold
                        ${monthCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.06] text-white/40"}`}>
                        {month}
                      </div>
                      <p className="text-[13px] font-medium text-white/50">
                        Month {month}
                      </p>
                      {monthCompleted && (
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                      )}
                    </div>

                    <div className="ml-4 border-l border-white/[0.06] pl-6 space-y-3">
                      {milestones.map((milestone, idx) => {
                        const globalIndex = activeRoadmap.milestones.indexOf(milestone);
                        const catCfg = categoryConfig[milestone.category] ?? { icon: "task", color: "text-white/40" };

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border transition-all
                              ${milestone.completed
                                ? "bg-emerald-500/5 border-emerald-500/10"
                                : "bg-white/[0.03] border-white/[0.06]"
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleMilestone(globalIndex)}
                                className={`shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-all
                                  ${milestone.completed
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "border-white/20 hover:border-white/40"
                                  }`}
                              >
                                {milestone.completed && (
                                  <span className="material-symbols-outlined text-[14px] text-white">check</span>
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`material-symbols-outlined text-[16px] ${catCfg.color}`}>
                                    {catCfg.icon}
                                  </span>
                                  <p className={`text-[13px] font-medium ${milestone.completed ? "text-white/40 line-through" : "text-white/70"}`}>
                                    {milestone.title}
                                  </p>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityBadge[milestone.priority] ?? priorityBadge.medium}`}>
                                    {milestone.priority}
                                  </span>
                                </div>
                                <p className={`text-[12px] leading-relaxed ${milestone.completed ? "text-white/25" : "text-white/40"}`}>
                                  {milestone.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
