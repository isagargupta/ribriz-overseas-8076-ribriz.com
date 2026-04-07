"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

/* ── Guided questions for the right panel ── */
const guidedQuestions = [
  "What specific challenge in your field keeps you awake at night?",
  "Why did you choose this field of study?",
  "Describe a project or experience that shaped your interest.",
  "What are your career goals after graduation?",
  "Why this specific university?",
  "What unique perspective do you bring?",
  "How does your background prepare you for graduate study?",
  "What research areas interest you most?",
  "Who are the faculty members you want to work with?",
  "What impact do you want to make in your field?",
  "How will this degree change your career trajectory?",
  "Anything else you want to include?",
];

/* ��─ Quality checks ── */
function getChecks(sopContent: string, degree: string, _uniName: string, wordCount: number) {
  return [
    {
      label: "Academic Background Detected",
      sublabel: "Mention of Undergraduate degree found.",
      status: sopContent.includes(degree) || sopContent.includes("GPA") || sopContent.includes("degree") || sopContent.includes("undergraduate") ? "pass" : "fail",
    },
    {
      label: "Word Count Warning",
      sublabel: "Minimum requirement is 800 words.",
      status: wordCount >= 800 ? "pass" : "warn",
    },
    {
      label: "Research Focus Missing",
      sublabel: "Include specific professors or labs.",
      status: sopContent.includes("professor") || sopContent.includes("lab") || sopContent.includes("research group") ? "pass" : "unchecked",
    },
  ];
}

/* ── Interfaces ── */
interface UserProfile {
  name: string;
  degree: string;
  college: string;
  gpa: string;
  workExperience: string;
  testScores: string;
  extracurriculars: string;
}

interface UniOption {
  programId: string;
  name: string;
  courseName: string;
  country: string;
}

export default function SOPWriterPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [universities, setUniversities] = useState<UniOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sopContent, setSopContent] = useState(
    `Ever since my first encounter with computational complexity during my undergraduate studies, I have been fascinated by the elegant intersection of mathematics and practical problem-solving. My journey in technology began not just as a consumer, but as an architect seeking to understand the foundational structures that power our modern world...`
  );
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showFloatingAssistant, setShowFloatingAssistant] = useState(true);
  const [sopTitle, setSopTitle] = useState("Computer Science");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/universities").then((r) => r.json()),
    ])
      .then(([profileData, uniData]) => {
        const u = profileData.user;
        const ap = u?.academicProfile;
        if (u && ap) {
          const scores: string[] = [];
          if (ap.ieltsScore) scores.push(`IELTS ${ap.ieltsScore}`);
          if (ap.toeflScore) scores.push(`TOEFL ${ap.toeflScore}`);
          if (ap.greScore) scores.push(`GRE ${ap.greScore}`);
          if (ap.gmatScore) scores.push(`GMAT ${ap.gmatScore}`);
          setProfile({
            name: u.name,
            degree: ap.degreeName,
            college: ap.collegeName,
            gpa: `${ap.gpa}/${ap.gpaScale === "scale_4" ? "4" : ap.gpaScale === "scale_100" ? "100" : "10"}`,
            workExperience: ap.workExperienceMonths > 0 ? `${ap.workExperienceMonths} months` : "None",
            testScores: scores.join(", ") || "Not provided",
            extracurriculars: u.preferences?.extracurriculars?.join(", ") || "Not provided",
          });
        }
        const unis = (uniData.universities ?? []).map((item: Record<string, unknown>) => ({
          programId: item.programId as string,
          name: item.name as string,
          courseName: item.courseName as string,
          country: item.country as string,
        }));
        setUniversities(unis);
        if (unis.length > 0) setSelectedProgramId(unis[0].programId);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedUni = universities.find((u) => u.programId === selectedProgramId);

  const wordCount = sopContent.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const charCount = sopContent.length.toLocaleString();

  const checks = getChecks(sopContent, profile?.degree ?? "", selectedUni?.name ?? "", wordCount);

  const handleGenerate = async () => {
    if (!profile || !selectedUni) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: profile.name,
          degree: profile.degree,
          college: profile.college,
          gpa: profile.gpa,
          workExperience: profile.workExperience,
          testScores: profile.testScores,
          extracurriculars: profile.extracurriculars,
          universityName: selectedUni.name,
          programName: selectedUni.courseName,
          country: selectedUni.country,
          whyField: answers["0"] || "",
          keyExperience: answers["2"] || "",
          careerGoals: answers["3"] || "",
          whyUniversity: answers["4"] || "",
          additionalInfo: answers["11"] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setSopContent(data.sop);
      toast("SOP draft generated successfully!", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast(msg, "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!sopContent || !selectedProgramId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sop-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgramId,
          universityName: selectedUni?.name,
          content: sopContent,
          guidedAnswers: answers,
        }),
      });
      if (res.ok) {
        toast("Draft saved successfully", "success");
      } else {
        toast("Failed to save draft", "error");
      }
    } catch {
      toast("Failed to save draft", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden transition-colors duration-300">
      {/* ── Editor Section ── */}
      <section className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-hidden">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-2 text-primary mb-2">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Drafting Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface flex items-center gap-3 flex-wrap">
            Statement of Purpose:{" "}
            {isEditingTitle ? (
              <input
                className="bg-transparent border-b border-primary text-on-surface outline-none text-2xl sm:text-3xl font-bold"
                value={sopTitle}
                onChange={(e) => setSopTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                autoFocus
              />
            ) : (
              sopTitle
            )}
            <button onClick={() => setIsEditingTitle(true)}>
              <span className="material-symbols-outlined text-outline text-lg">edit</span>
            </button>
          </h1>

          {/* University selector */}
          {universities.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-outline font-medium">Target:</span>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="text-xs font-medium bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                {universities.map((u) => (
                  <option key={u.programId} value={u.programId}>
                    {u.name} — {u.courseName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        {/* Editor Card */}
        <div className="flex-1 flex flex-col sop-editor-area rounded-2xl shadow-xl overflow-hidden">
          {/* Toolbar */}
          <div className="h-12 sop-toolbar flex items-center px-4 sm:px-6 gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 border-r border-outline-variant/20 pr-4 sm:pr-6">
              <button className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-xl">format_bold</span>
              </button>
              <button className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-xl">format_italic</span>
              </button>
              <button className="text-outline hover:text-on-surface transition-colors hidden sm:block">
                <span className="material-symbols-outlined text-xl">format_list_bulleted</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleSave} className="text-outline hover:text-on-surface flex items-center gap-1 transition-colors">
                <span className="text-xs font-medium">
                  {saving ? "Saving..." : "Auto-save: ON"}
                </span>
                <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button className="text-xs font-bold text-outline px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest transition-colors hidden sm:block">
                Export PDF
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="text-xs font-bold bg-[#4f55f1] text-white px-4 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate Draft"}
              </button>
              <button
                onClick={() => setShowPanel(!showPanel)}
                className="lg:hidden text-outline hover:text-on-surface p-1 rounded transition-colors"
              >
                <span className="material-symbols-outlined">
                  {showPanel ? "close" : "psychology"}
                </span>
              </button>
            </div>
          </div>

          {/* Rich Text Area */}
          <div className="flex-1 p-6 sm:p-8 lg:p-12 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                  {error}
                </div>
              )}

              <h2 className="text-2xl font-bold text-on-surface mb-6">Introduction</h2>

              <textarea
                value={sopContent}
                onChange={(e) => setSopContent(e.target.value)}
                className="w-full bg-transparent border-none text-on-surface-variant leading-relaxed text-lg resize-none focus:outline-none focus:ring-0 min-h-[200px]"
                rows={10}
                placeholder="Start writing your Statement of Purpose..."
              />

              {/* AI Tip */}
              <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg mb-8 italic text-primary/80 text-sm">
                [Tip: Focus more on your specific contribution to the &apos;Autonomous Robotics&apos; project mentioned in your resume.]
              </div>

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="h-10 px-4 sm:px-6 flex items-center justify-between sop-statusbar text-[10px] font-bold tracking-wider text-outline uppercase">
            <div className="flex gap-4">
              <span>Words: {wordCount} / 1000</span>
              <span className="hidden sm:inline">Characters: {charCount}</span>
            </div>
            <div className="flex gap-4 items-center">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Writing Flow: High
              </span>
              <span className="hidden sm:inline">Reading Level: Post-Graduate</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Right Panel ── */}
      <aside className={`${showPanel ? "flex" : "hidden"} lg:flex w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-outline-variant/10 bg-surface-container-low/30 p-6 flex-col gap-6 overflow-y-auto transition-colors`}>
        {/* Expert Review CTA */}
        <div className="relative group overflow-hidden rounded-2xl p-6 sop-expert-cta">
          <div className="relative z-10">
            <h3 className="text-primary text-sm font-bold uppercase tracking-widest mb-1">Elite Upgrade</h3>
            <p className="text-on-surface text-lg font-bold mb-4">Get Expert Review</p>
            <p className="text-on-surface-variant text-xs leading-relaxed mb-6">
              Have an Ivy League alumnus review your SOP for logic, tone, and impact. 24h turnaround guaranteed.
            </p>
            <button className="w-full py-2.5 bg-[#4f55f1] text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg">
              Book Expert Review
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[120px]">verified</span>
          </div>
        </div>

        {/* Quality Checklist */}
        <div>
          <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">task_alt</span>
            Quality Checklist
          </h3>
          <div className="space-y-3">
            {checks.map((check) => (
              <div key={check.label} className="flex items-start gap-3 p-3 rounded-xl sop-checklist-item">
                {check.status === "pass" ? (
                  <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                ) : check.status === "warn" ? (
                  <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                ) : (
                  <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                )}
                <div>
                  <p className={`text-xs font-bold ${check.status === "unchecked" ? "text-outline" : "text-on-surface"}`}>
                    {check.label}
                  </p>
                  <p className={`text-[10px] ${check.status === "unchecked" ? "text-outline" : "text-on-surface-variant"}`}>
                    {check.sublabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guided Questions */}
        <div className="flex-1">
          <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">psychology</span>
            Guided Questions
          </h3>
          <div className="sop-guided-panel rounded-2xl p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary">CURRENT PROMPT</label>
              <p className="text-sm font-medium text-on-surface italic">
                &ldquo;{guidedQuestions[currentQuestion]}&rdquo;
              </p>
              <textarea
                className="sop-guided-textarea w-full p-3 rounded-xl text-sm"
                placeholder="Draft your answer here..."
                rows={3}
                value={answers[String(currentQuestion)] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [String(currentQuestion)]: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <span className="text-[10px] font-bold text-outline">
                {currentQuestion + 1} OF {guidedQuestions.length}
              </span>
              <button
                onClick={() => setCurrentQuestion((q) => Math.min(guidedQuestions.length - 1, q + 1))}
                className="text-primary hover:brightness-110 transition-colors"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bento Mini Map */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <div className="sop-bento-card rounded-xl p-3">
            <p className="text-[9px] font-black text-outline uppercase mb-1">Tone</p>
            <p className="text-xs font-bold text-on-surface">Academic</p>
          </div>
          <div className="sop-bento-card rounded-xl p-3">
            <p className="text-[9px] font-black text-outline uppercase mb-1">Region</p>
            <p className="text-xs font-bold text-on-surface">Europe/NA</p>
          </div>
        </div>
      </aside>

      {/* ═══ Floating AI Assistant ═══ */}
      {showFloatingAssistant && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className="sop-float-card sop-bounce rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#4f55f1] flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">AI Insight Ready</p>
              <p className="text-[10px] text-on-surface-variant">I can bridge your internship to your research goal.</p>
            </div>
            <button
              onClick={() => setShowFloatingAssistant(false)}
              className="bg-surface-container-high hover:bg-surface-container-highest p-2 rounded-lg transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-outline">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
