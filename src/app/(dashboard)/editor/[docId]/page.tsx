"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

/* ── Types ─────────────────────────────────────────────── */

interface DocData {
  id: string;
  type: string;
  title: string;
  content: string;
  wordCount: number;
  guidedAnswers: Record<string, string> | null;
  universityName: string;
  programName: string;
  country: string;
  isDraft: boolean;
  isComplete: boolean;
  currentVersion: number;
  applicationId: string;
  application: {
    id: string;
    program: {
      id: string;
      name: string;
      university: { name: string; country: string; city: string };
    };
  };
}

interface VersionEntry {
  id: string;
  version: number;
  wordCount: number;
  changeNote: string | null;
  createdAt: string;
}

/* ── Guided Questions by Doc Type ──────────────────────── */

const GUIDED_QUESTIONS: Record<string, string[]> = {
  sop: [
    "What specific challenge in your field keeps you awake at night?",
    "Why did you choose this field of study?",
    "Describe a project or experience that shaped your interest.",
    "What are your career goals after graduation?",
    "Why this specific university and program?",
    "What unique perspective do you bring?",
    "How does your background prepare you for this program?",
    "What research areas interest you most?",
    "Who are the faculty members you want to work with?",
    "What impact do you want to make in your field?",
  ],
  motivation: [
    "Why are you passionate about this field?",
    "How has your academic background prepared you?",
    "Why this specific university in this country?",
    "What will you contribute to the program?",
    "Where do you see yourself in 5 years after this degree?",
  ],
  essay: [
    "What unique perspective or experience do you bring?",
    "Describe a challenge you overcame and what you learned.",
    "Why is this program the right fit for your goals?",
  ],
  research: [
    "What problem are you trying to solve?",
    "Why is this research important now?",
    "What methodology will you use?",
    "What are the expected outcomes?",
  ],
};

/* ── Quality Checks ────────────────────────────────────── */

function getQualityChecks(content: string, type: string, uniName: string) {
  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const checks = [];

  const targetWords = type === "cv" ? 300 : type === "lor" ? 400 : 800;
  checks.push({
    label: "Word Count",
    detail: `${wordCount} / ${targetWords}+ words`,
    pass: wordCount >= targetWords,
  });

  if (type === "sop" || type === "motivation" || type === "essay") {
    checks.push({
      label: "University Mentioned",
      detail: `Reference to ${uniName}`,
      pass: content.toLowerCase().includes(uniName.toLowerCase().split(" ")[0]),
    });
    checks.push({
      label: "Research/Faculty Reference",
      detail: "Mention specific professors, labs, or courses",
      pass: /professor|lab|research group|faculty|dr\.|prof\./i.test(content),
    });
    checks.push({
      label: "Career Goals",
      detail: "Clear career direction mentioned",
      pass: /career|goal|aspir|future|contribut|impact/i.test(content),
    });
    checks.push({
      label: "Personal Experience",
      detail: "Specific project or experience referenced",
      pass: /project|internship|experience|worked|developed|built|created/i.test(content),
    });
  }

  if (type === "lor") {
    checks.push({
      label: "Recommender Placeholders",
      detail: "Sections for recommender to personalize",
      pass: /\[RECOMMENDER/i.test(content) || /recommend/i.test(content),
    });
  }

  return checks;
}

/* ── Document Type Labels ──────────────────────────────── */

const DOC_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  sop: { label: "Statement of Purpose", icon: "edit_note" },
  lor: { label: "Letter of Recommendation", icon: "mail" },
  motivation: { label: "Motivation Letter", icon: "psychology" },
  cv: { label: "Resume / CV", icon: "person" },
  essay: { label: "Supplemental Essay", icon: "article" },
  research: { label: "Research Proposal", icon: "science" },
  portfolio: { label: "Portfolio", icon: "photo_library" },
  cover_letter: { label: "Cover Letter", icon: "drafts" },
  other: { label: "Document", icon: "description" },
};

/* ── Page ──────────────────────────────────────────────── */

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;

  const [doc, setDoc] = useState<DocData | null>(null);
  const [content, setContent] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [showPanel, setShowPanel] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [error, setError] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef("");

  // ── Load document ──
  useEffect(() => {
    fetch(`/api/app-documents/${docId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.document) {
          setDoc(data.document);
          setContent(data.document.content || "");
          setAnswers(data.document.guidedAnswers || {});
          lastSavedContent.current = data.document.content || "";
        }
      })
      .finally(() => setLoading(false));
  }, [docId]);

  // ── Auto-save (debounced 2s after last keystroke) ──
  const autoSave = useCallback(
    async (text: string) => {
      if (text === lastSavedContent.current) return;
      setSaving(true);
      try {
        await fetch(`/api/app-documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, guidedAnswers: answers }),
        });
        lastSavedContent.current = text;
        setLastSaved(new Date());
      } finally {
        setSaving(false);
      }
    },
    [docId, answers]
  );

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // Debounced auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => autoSave(newContent), 2000);
  };

  // ── Save version (manual) ──
  const saveVersion = async () => {
    setSaving(true);
    try {
      await fetch(`/api/app-documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          guidedAnswers: answers,
          createVersion: true,
          changeNote: "Manual save",
        }),
      });
      lastSavedContent.current = content;
      setLastSaved(new Date());
      if (doc) setDoc({ ...doc, currentVersion: doc.currentVersion + 1 });
    } finally {
      setSaving(false);
    }
  };

  // ── Load versions ──
  const loadVersions = async () => {
    const res = await fetch(`/api/app-documents/${docId}/versions`);
    const data = await res.json();
    setVersions(data.versions ?? []);
    setShowVersions(true);
  };

  // ── AI Actions ──
  const aiAction = async (
    action: "complete" | "improve" | "expand" | "generate_draft",
    selectedText?: string
  ) => {
    setGenerating(true);
    setError("");
    setAiSuggestion(null);
    try {
      const cursorPos = textareaRef.current?.selectionStart ?? content.length;
      const res = await fetch("/api/app-documents/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          action,
          content,
          cursorPosition: cursorPos,
          selectedText: selectedText ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI suggestion failed");

      if (action === "generate_draft") {
        setContent(data.suggestion);
        // Auto-save the generated draft
        await autoSave(data.suggestion);
        // Create version
        await fetch(`/api/app-documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: data.suggestion,
            createVersion: true,
            changeNote: "AI generated draft",
          }),
        });
      } else {
        setAiSuggestion(data.suggestion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI suggestion failed");
    } finally {
      setGenerating(false);
    }
  };

  const acceptSuggestion = () => {
    if (!aiSuggestion) return;
    const cursorPos = textareaRef.current?.selectionStart ?? content.length;
    const selStart = textareaRef.current?.selectionStart ?? cursorPos;
    const selEnd = textareaRef.current?.selectionEnd ?? cursorPos;

    let newContent: string;
    if (selStart !== selEnd) {
      // Replace selection
      newContent = content.substring(0, selStart) + aiSuggestion + content.substring(selEnd);
    } else {
      // Insert at cursor
      newContent = content.substring(0, cursorPos) + aiSuggestion + content.substring(cursorPos);
    }
    handleContentChange(newContent);
    setAiSuggestion(null);
  };

  // ── Computed ──
  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const charCount = content.length;
  const typeInfo = doc ? DOC_TYPE_LABELS[doc.type] ?? DOC_TYPE_LABELS.other : DOC_TYPE_LABELS.other;
  const questions = doc ? GUIDED_QUESTIONS[doc.type] ?? [] : [];
  const checks = doc ? getQualityChecks(content, doc.type, doc.universityName) : [];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">
          progress_activity
        </span>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <span className="material-symbols-outlined text-6xl text-outline-variant">
          error
        </span>
        <p className="text-secondary">Document not found</p>
        <Link href="/workspaces" className="text-primary font-semibold text-sm hover:underline">
          Back to Workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Editor Section ──────────────────────────────── */}
      <section className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/applications/${doc.applicationId}`}
              className="text-secondary hover:text-primary transition-colors flex items-center gap-1 text-xs"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              {doc.universityName}
            </Link>
            <span className="text-outline text-xs">/</span>
            <span className="text-xs text-on-surface font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-primary">
                {typeInfo.icon}
              </span>
              {typeInfo.label}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
            {doc.title}
          </h1>
          <p className="text-xs text-secondary mt-0.5">
            {doc.programName} &middot; {doc.universityName}, {doc.country}
          </p>
        </header>

        {/* Toolbar */}
        <div className="h-12 flex items-center px-4 sm:px-6 gap-3 border-b border-outline-variant/10 bg-surface-container-low/30">
          {/* AI Actions */}
          <div className="flex items-center gap-1 border-r border-outline-variant/20 pr-3">
            <button
              onClick={() => aiAction("complete")}
              disabled={generating}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
              title="AI continues writing from your cursor position"
            >
              <span className="material-symbols-outlined text-sm">auto_fix_high</span>
              <span className="hidden sm:inline">Complete</span>
            </button>
            <button
              onClick={() => {
                const sel = textareaRef.current;
                if (sel && sel.selectionStart !== sel.selectionEnd) {
                  aiAction("improve", content.substring(sel.selectionStart, sel.selectionEnd));
                }
              }}
              disabled={generating}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50 flex items-center gap-1"
              title="Select text first, then click to improve it"
            >
              <span className="material-symbols-outlined text-sm">edit_square</span>
              <span className="hidden sm:inline">Improve</span>
            </button>
            <button
              onClick={() => {
                const sel = textareaRef.current;
                if (sel && sel.selectionStart !== sel.selectionEnd) {
                  aiAction("expand", content.substring(sel.selectionStart, sel.selectionEnd));
                }
              }}
              disabled={generating}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50 flex items-center gap-1"
              title="Select text first, then click to expand it"
            >
              <span className="material-symbols-outlined text-sm">unfold_more</span>
              <span className="hidden sm:inline">Expand</span>
            </button>
          </div>

          {/* Save */}
          <div className="flex items-center gap-2">
            <button
              onClick={saveVersion}
              disabled={saving}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save v{doc.currentVersion + 1}
            </button>
            <span className="text-[10px] text-secondary flex items-center gap-1">
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                  Saving...
                </>
              ) : lastSaved ? (
                <>
                  <span className="material-symbols-outlined text-xs text-tertiary">check_circle</span>
                  Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xs text-tertiary">check_circle</span>
                  Auto-save on
                </>
              )}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={loadVersions}
              className="text-xs font-semibold text-secondary hover:text-on-surface transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">history</span>
              <span className="hidden sm:inline">v{doc.currentVersion}</span>
            </button>
            <button
              onClick={() => aiAction("generate_draft")}
              disabled={generating}
              className="text-xs font-bold bg-primary text-on-primary px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Draft"}
            </button>
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="lg:hidden text-secondary hover:text-on-surface p-1 rounded transition-colors"
            >
              <span className="material-symbols-outlined">
                {showPanel ? "close" : "psychology"}
              </span>
            </button>
          </div>
        </div>

        {/* AI Suggestion Bar */}
        {aiSuggestion && (
          <div className="mx-4 sm:mx-6 mt-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-xs font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                AI Suggestion
              </p>
              <div className="flex gap-2">
                <button
                  onClick={acceptSuggestion}
                  className="text-xs font-bold px-3 py-1 bg-primary text-on-primary rounded-lg hover:opacity-90"
                >
                  Accept
                </button>
                <button
                  onClick={() => setAiSuggestion(null)}
                  className="text-xs font-bold px-3 py-1 bg-surface-container text-secondary rounded-lg hover:bg-surface-container-highest"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
              {aiSuggestion}
            </p>
          </div>
        )}

        {error && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Text Editor */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full bg-transparent border-none text-on-surface leading-relaxed text-lg resize-none focus:outline-none focus:ring-0 min-h-[60vh]"
              placeholder={`Start writing your ${typeInfo.label} for ${doc.universityName}...`}
              onKeyDown={(e) => {
                // Tab for AI autocomplete
                if (e.key === "Tab" && !e.shiftKey && content.length > 50) {
                  e.preventDefault();
                  aiAction("complete");
                }
              }}
            />
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-10 px-4 sm:px-6 flex items-center justify-between bg-surface-container-low/50 border-t border-outline-variant/10 text-[10px] font-bold tracking-wider text-secondary uppercase">
          <div className="flex gap-4">
            <span>Words: {wordCount}</span>
            <span className="hidden sm:inline">Characters: {charCount.toLocaleString()}</span>
            <span className="hidden sm:inline">Version: {doc.currentVersion}</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1 normal-case tracking-normal">
              <span className="material-symbols-outlined text-xs text-primary">school</span>
              {doc.universityName}
            </span>
            <span className="hidden sm:inline normal-case tracking-normal text-[10px]">
              Press Tab for AI autocomplete
            </span>
          </div>
        </div>
      </section>

      {/* ── Right Panel ────────────────────────────────── */}
      <aside
        className={`${
          showPanel ? "flex" : "hidden"
        } lg:flex w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-outline-variant/10 bg-surface-container-low/30 p-6 flex-col gap-6 overflow-y-auto`}
      >
        {/* Context Card */}
        <div className="bg-surface-container-lowest rounded-xl p-4">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">
            Writing For
          </p>
          <p className="text-sm font-bold text-on-surface">{doc.universityName}</p>
          <p className="text-xs text-secondary">{doc.programName}</p>
          <p className="text-xs text-secondary">{doc.country}</p>
        </div>

        {/* Quality Checklist */}
        <div>
          <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">task_alt</span>
            Quality Checklist
          </h3>
          <div className="space-y-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-container-lowest"
              >
                <span
                  className={`material-symbols-outlined text-sm mt-0.5 ${
                    check.pass ? "text-tertiary" : "text-outline-variant"
                  }`}
                  style={check.pass ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {check.pass ? "check_circle" : "radio_button_unchecked"}
                </span>
                <div>
                  <p className={`text-xs font-bold ${check.pass ? "text-on-surface" : "text-secondary"}`}>
                    {check.label}
                  </p>
                  <p className="text-[10px] text-secondary">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guided Questions */}
        {questions.length > 0 && (
          <div className="flex-1">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">psychology</span>
              Guided Questions
            </h3>
            <div className="bg-surface-container-lowest rounded-xl p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary uppercase">
                  Question {currentQuestion + 1} of {questions.length}
                </label>
                <p className="text-sm font-medium text-on-surface italic">
                  &ldquo;{questions[currentQuestion]}&rdquo;
                </p>
                <textarea
                  className="w-full p-3 rounded-lg text-sm bg-surface-container-low border border-outline-variant/20 focus:border-primary focus:outline-none resize-none text-on-surface"
                  placeholder="Draft your answer..."
                  rows={3}
                  value={answers[String(currentQuestion)] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [String(currentQuestion)]: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
                  className="text-secondary hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentQuestion(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentQuestion
                          ? "bg-primary"
                          : answers[String(i)]
                          ? "bg-tertiary"
                          : "bg-surface-container-highest"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentQuestion((q) => Math.min(questions.length - 1, q + 1))
                  }
                  className="text-primary hover:brightness-110 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version History */}
        {showVersions && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">history</span>
                Version History
              </h3>
              <button
                onClick={() => setShowVersions(false)}
                className="text-xs text-secondary hover:text-on-surface"
              >
                Hide
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {versions.length === 0 ? (
                <p className="text-xs text-secondary italic">
                  No saved versions yet. Click &quot;Save&quot; to create one.
                </p>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="bg-surface-container-lowest rounded-lg p-3 text-xs"
                  >
                    <div className="flex justify-between">
                      <span className="font-bold text-on-surface">v{v.version}</span>
                      <span className="text-secondary">{v.wordCount}w</span>
                    </div>
                    <p className="text-secondary">
                      {v.changeNote ?? "Auto-save"} &middot;{" "}
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-auto p-3 bg-secondary/5 rounded-lg border border-secondary/10">
          <p className="text-[10px] text-secondary leading-relaxed flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[10px] mt-0.5">info</span>
            AI assists your writing — it does not write for you. Use &quot;Generate Draft&quot; for structure,
            then rewrite in your own voice. Press <kbd className="px-1 py-0.5 bg-surface-container rounded text-[9px]">Tab</kbd> for
            inline autocomplete.
          </p>
        </div>
      </aside>
    </div>
  );
}
