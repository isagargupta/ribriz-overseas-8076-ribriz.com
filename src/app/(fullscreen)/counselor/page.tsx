"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ConfirmationCard,
  type ConfirmationAction,
  type ConfirmationChange,
} from "@/components/ui/confirmation-card";
import { renderToolResult } from "@/components/ui/riz-result-cards";
import { AssistedApplyConsent } from "@/components/ui/assisted-apply-consent";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ────────────────────────────────────────────────────────────────────

type CounselorStage = "intake" | "analysis" | "shortlist" | "applying" | "done";

interface ToolActivity { name: string; label: string; status: "running" | "done"; }
interface ConfirmationMeta { toolCalls: number; loopIterations: number; confirmationsPending: number; toolLog: any[]; }
interface ToolResultData { name: string; result: string; }

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolActivities?: ToolActivity[];
  confirmations?: ConfirmationAction[];
  toolResults?: ToolResultData[];
  agentMeta?: ConfirmationMeta;
  copilotStep?: StepEvent;
}

interface StepEvent {
  stepNumber: number;
  instruction: string;
  fieldName?: string;
  suggestedValue?: string;
  isSensitive?: boolean;
}

interface NeedsStudentData {
  reason: string;
  message: string;
  instruction?: string;
  screenshot?: string;
  portalUrl?: string;
  copilotMode?: boolean;
  steps?: StepEvent[];
}

interface FieldFallback {
  selector: string;
  fieldLabel: string;
  reason: string;
  instruction: string;
}

interface BrowserEvent {
  action: string;
  field?: string;
  value?: string;
  url?: string;
  screenshot?: string;
  status?: string;
}

// ─── Co-pilot Step Card ────────────────────────────────────────────────────────

function CopilotStepCard({ step }: { step: StepEvent }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!step.suggestedValue) return;
    try { await navigator.clipboard.writeText(step.suggestedValue); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03]">
      <div className="shrink-0 w-5 h-5 rounded-full bg-indigo-600/60 flex items-center justify-center mt-0.5">
        <span className="text-[10px] text-white font-bold">{step.stepNumber}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/80 leading-relaxed">{step.instruction}</p>
        {step.fieldName && (
          <p className="text-[10px] text-white/35 mt-0.5">Field: {step.fieldName}</p>
        )}
        {step.suggestedValue && !step.isSensitive && (
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 text-[11px] text-emerald-300 bg-emerald-900/20 px-2 py-0.5 rounded truncate">
              {step.suggestedValue}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
            >
              <span className="material-symbols-outlined text-[12px]">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
        {step.isSensitive && (
          <p className="mt-1 text-[10px] text-amber-400/70">Enter this yourself — not shown for security</p>
        )}
      </div>
    </div>
  );
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: { id: CounselorStage; label: string; icon: string }[] = [
  { id: "intake", label: "Intake", icon: "person" },
  { id: "analysis", label: "Analysis", icon: "analytics" },
  { id: "shortlist", label: "Shortlist", icon: "checklist" },
  { id: "applying", label: "Applying", icon: "smart_toy" },
  { id: "done", label: "Done", icon: "check_circle" },
];

const OPENING_MESSAGE = "Hello, I'd like your help applying to universities.";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CounselorPage() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [stage, setStage] = useState<CounselorStage>("intake");

  // Consent
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  // Computer mode state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [browserStatus, setBrowserStatus] = useState<string>("");
  const [currentPortalUrl, setCurrentPortalUrl] = useState<string | null>(null);
  const [fillProgress, setFillProgress] = useState<{ filled: number; total: number } | null>(null);
  const [needsStudent, setNeedsStudent] = useState<NeedsStudentData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);
  const [isComputerLoading, setIsComputerLoading] = useState(false);
  const [copilotActive, setCopilotActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const computerAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Restore persisted state on mount
  useEffect(() => {
    const consented = localStorage.getItem("ribriz_assist_consent");
    if (consented === "1") setHasConsented(true);

    // Restore active session/application from sessionStorage (survives same-tab navigation)
    const savedSession = sessionStorage.getItem("counselor_sessionId");
    const savedApp = sessionStorage.getItem("counselor_appId");
    const savedUrl = sessionStorage.getItem("counselor_portalUrl");
    const savedLiveView = sessionStorage.getItem("counselor_liveViewUrl");
    if (savedSession) { setSessionId(savedSession); setStage("applying"); }
    if (savedApp) setActiveApplicationId(savedApp);
    if (savedUrl) setCurrentPortalUrl(savedUrl);
    if (savedLiveView) setLiveViewUrl(savedLiveView);
  }, []);

  // Persist session to sessionStorage whenever it changes
  useEffect(() => {
    if (sessionId) sessionStorage.setItem("counselor_sessionId", sessionId);
    else sessionStorage.removeItem("counselor_sessionId");
  }, [sessionId]);

  useEffect(() => {
    if (activeApplicationId) sessionStorage.setItem("counselor_appId", activeApplicationId);
    else sessionStorage.removeItem("counselor_appId");
  }, [activeApplicationId]);

  useEffect(() => {
    if (currentPortalUrl) sessionStorage.setItem("counselor_portalUrl", currentPortalUrl);
  }, [currentPortalUrl]);

  useEffect(() => {
    if (liveViewUrl) sessionStorage.setItem("counselor_liveViewUrl", liveViewUrl);
    else sessionStorage.removeItem("counselor_liveViewUrl");
  }, [liveViewUrl]);

  // Warn before leaving if session is active
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (sessionId) {
        e.preventDefault();
        e.returnValue = "You have an active application session. Leaving will not close the browser session.";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sessionId]);

  // Auto-send opening message on first load
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage(OPENING_MESSAGE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Detect stage from AI messages ─────────────────────────────────────────

  const detectStageFromContent = (content: string) => {
    const lower = content.toLowerCase();
    if (lower.includes("analysis") || lower.includes("eligibility") || lower.includes("match score")) setStage("analysis");
    else if (lower.includes("shortlist") || lower.includes("safety") || lower.includes("target school") || lower.includes("reach school")) setStage("shortlist");
    else if (lower.includes("assisted application") || lower.includes("open each portal") || lower.includes("start apply")) setStage("applying");
  };

  // ─── Send chat message ──────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: content.trim(), timestamp: new Date() };
    const updatedMessages = content === OPENING_MESSAGE
      ? [userMessage]
      : [...messages, userMessage];

    if (content !== OPENING_MESSAGE) {
      setMessages(updatedMessages);
    }
    setInput("");
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...(content === OPENING_MESSAGE ? [] : prev),
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/counselor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          threadId,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const data = line.replace(/^data: /, "");
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.threadId && !threadId) setThreadId(parsed.threadId);
            else if (parsed.agentMeta) setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, agentMeta: parsed.agentMeta } : m));
            else if (parsed.confirmation) setMessages((prev) => prev.map((m) => m.id !== assistantId ? m : { ...m, confirmations: [...(m.confirmations ?? []), parsed.confirmation] }));
            else if (parsed.toolResult) setMessages((prev) => prev.map((m) => m.id !== assistantId ? m : { ...m, toolResults: [...(m.toolResults ?? []), parsed.toolResult] }));
            else if (parsed.tool) {
              setMessages((prev) => prev.map((m) => {
                if (m.id !== assistantId) return m;
                const existing = m.toolActivities ?? [];
                if (parsed.tool.status === "done") return { ...m, toolActivities: existing.map((t) => t.name === parsed.tool.name ? { ...t, status: "done" as const } : t) };
                return { ...m, toolActivities: [...existing, { name: parsed.tool.name, label: parsed.tool.label, status: "running" as const }] };
              }));
            } else if (parsed.text) {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + parsed.text } : m));
              detectStageFromContent(parsed.text);
            }
          } catch { /* skip */ }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const errMsg = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${errMsg}` } : m));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, threadId]);

  // ─── Confirm counselor actions ──────────────────────────────────────────────

  const handleConfirm = useCallback(async (action: ConfirmationAction) => {
    try {
      const res = await fetch("/api/ai/counselor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          threadId,
          confirmAction: { toolName: action.toolName, toolInput: action.toolInput, toolUseId: action.toolUseId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Capture applicationId from any tool that returns one
        const appId = data.result?.applicationId;
        if (appId) setActiveApplicationId(appId);

        const isShortlistOrWorkspace =
          action.toolName === "shortlist_program" || action.toolName === "create_workspace";

        if (isShortlistOrWorkspace && appId) {
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(), role: "assistant",
            content: `✅ **${data.result?.message || `${action.title} completed.`}**\n\nClick **Start Application Guide** below — I'll open the portal and walk you through the application step by step.`,
            timestamp: new Date(),
          }]);
        } else {
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(), role: "assistant",
            content: `**Done:** ${data.result?.message || `${action.title} completed.`}`,
            timestamp: new Date(),
          }]);
        }
      }
    } catch { /* silent */ }
  }, [messages, threadId]);

  const handleReject = useCallback(async (action: ConfirmationAction) => {
    try {
      await fetch("/api/ai/counselor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          threadId,
          rejectAction: { toolName: action.toolName, toolUseId: action.toolUseId },
        }),
      });
    } catch { /* silent */ }
  }, [messages, threadId]);

  const handleEdit = useCallback(async (action: ConfirmationAction, editedChanges: ConfirmationChange[]) => {
    try {
      const res = await fetch("/api/ai/counselor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          threadId,
          confirmAction: { toolName: action.toolName, toolInput: action.toolInput, toolUseId: action.toolUseId, editedChanges: editedChanges.map((c) => ({ field: c.field, newValue: c.newValue })) },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), role: "assistant",
          content: `**Updated:** ${data.result?.message || "Done."}`,
          timestamp: new Date(),
        }]);
      }
    } catch { /* silent */ }
  }, [messages, threadId]);

  // ─── Computer mode ──────────────────────────────────────────────────────────

  const startAssistedApplication = useCallback(async (applicationId: string) => {
    if (!hasConsented) {
      setShowConsent(true);
      return;
    }
    setStage("applying");
    setIsComputerLoading(true);
    setNeedsStudent(null);
    setFillProgress(null);
    setCopilotActive(false);

    computerAbortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/computer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", applicationId, sessionId: sessionId ?? undefined }),
        signal: computerAbortRef.current.signal,
      });

      if (!res.ok) throw new Error("Computer mode request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const data = line.replace(/^data: /, "");
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            parseComputerEvent(parsed);
          } catch { /* skip */ }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      setBrowserStatus(`Error: ${errMsg}`);
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: `**Browser session failed:** ${errMsg}. Please try again.`,
        timestamp: new Date(),
      }]);
      setStage("shortlist");
    } finally {
      setIsComputerLoading(false);
      computerAbortRef.current = null;
    }
  }, [hasConsented, sessionId]);

  const resumeAssistedApplication = useCallback(async () => {
    if (!activeApplicationId || !sessionId) return;
    setNeedsStudent(null);
    setIsPaused(false);
    setIsComputerLoading(true);

    try {
      const res = await fetch("/api/ai/computer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resume",
          applicationId: activeApplicationId,
          sessionId,
        }),
      });

      if (!res.ok) throw new Error("Resume failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const data = line.replace(/^data: /, "");
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            parseComputerEvent(parsed);
          } catch { /* skip */ }
        }
      }
    } catch {
      setBrowserStatus("Error resuming. Please try again.");
    } finally {
      setIsComputerLoading(false);
    }
  }, [activeApplicationId, sessionId]);

  const pauseSession = useCallback(async () => {
    if (!sessionId || !activeApplicationId) return;
    setIsPaused(true);
    try {
      await fetch("/api/ai/computer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause", applicationId: activeApplicationId, sessionId }),
      });
    } catch { /* silent */ }
  }, [sessionId, activeApplicationId]);

  const closeSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await fetch("/api/ai/computer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch { /* silent */ }
    setSessionId(null);
    setLiveViewUrl(null);
    setBrowserStatus("");
    setFillProgress(null);
    setNeedsStudent(null);
    setCurrentPortalUrl(null);
    setCopilotActive(false);
    sessionStorage.removeItem("counselor_sessionId");
    sessionStorage.removeItem("counselor_portalUrl");
    sessionStorage.removeItem("counselor_liveViewUrl");
  }, [sessionId]);

  const parseComputerEvent = (parsed: any) => {
    if (parsed.sessionId) setSessionId(parsed.sessionId);
    if (parsed.liveViewUrl) setLiveViewUrl(parsed.liveViewUrl);
    if (parsed.popup_dismissed) {
      const type = parsed.popup_dismissed.popupType;
      const label = type === "modal_close" ? "modal popup" : "cookie banner";
      setBrowserStatus(`Dismissed ${label} automatically`);
    } else if (parsed.text) {
      setBrowserStatus(parsed.text);
    } else if (parsed.browser) {
      const ev = parsed.browser as BrowserEvent;
      if (ev.url) setCurrentPortalUrl(ev.url);
      setBrowserStatus(
        ev.action === "navigate" ? `Navigating to ${ev.url ?? "page"}…` :
        ev.action === "fill" ? `Filling: ${ev.field ?? "field"}` :
        ev.action === "click" ? `Clicking: ${ev.field ?? "button"}` :
        ev.status ?? ""
      );
    } else if (parsed.needsStudent) {
      const nd = parsed.needsStudent as NeedsStudentData;
      setNeedsStudent(nd);
      if (nd.portalUrl) setCurrentPortalUrl(nd.portalUrl);
      if (nd.reason === "ready_to_submit") setStage("done");

      // Co-pilot mode: inject step-by-step instructions as chat messages
      if (nd.copilotMode && nd.steps?.length) {
        setCopilotActive(true);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(), role: "assistant" as const,
            content: `**Application Guide** — I've opened the portal. Open it in your browser using the button on the right and follow these steps:`,
            timestamp: new Date(),
          },
          ...nd.steps!.map((step) => ({
            id: crypto.randomUUID(), role: "assistant" as const,
            content: "",
            timestamp: new Date(),
            copilotStep: step,
          })),
        ]);
      }
    } else if (parsed.progress) {
      setFillProgress({ filled: parsed.progress.filled, total: parsed.progress.total });
    } else if (parsed.fieldFallback) {
      const fb = parsed.fieldFallback as FieldFallback;
      setBrowserStatus(`Manual input needed: ${fb.fieldLabel}`);
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: `**Manual input needed:** ${fb.instruction}`,
        timestamp: new Date(),
      }]);
    } else if (parsed.error) {
      setBrowserStatus(`Error: ${parsed.error}`);
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: `**Browser error:** ${parsed.error}`,
        timestamp: new Date(),
      }]);
    }
  };

  // ─── Keyboard ───────────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleTextareaInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  // ─── Stage progress bar ─────────────────────────────────────────────────────

  const stageIndex = STAGES.findIndex((s) => s.id === stage);
  const hasBrowserPanel = stage === "applying" || stage === "done" || !!sessionId;

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Consent modal */}
      {showConsent && (
        <AssistedApplyConsent
          onAccept={() => {
            localStorage.setItem("ribriz_assist_consent", "1");
            setHasConsented(true);
            setShowConsent(false);
            if (activeApplicationId) startAssistedApplication(activeApplicationId);
          }}
          onDecline={() => setShowConsent(false)}
        />
      )}

      <div className="flex flex-col h-screen bg-[#010409] overflow-hidden">

        {/* ── Top bar ── */}
        <header className="h-11 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            {/* Back to dashboard */}
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/[0.06]
                text-white/35 hover:text-white/70 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </Link>

            <div className="w-px h-4 bg-white/[0.08]" />

            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600">
              <span className="material-symbols-outlined text-white text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                support_agent
              </span>
            </div>
            <span className="text-[13px] font-semibold text-white/80">Counselor</span>

            {/* Stage progress */}
            <div className="hidden md:flex items-center gap-1 ml-3">
              {STAGES.map((s, i) => {
                const isActive = i === stageIndex;
                const isDone = i < stageIndex;
                return (
                  <div key={s.id} className="flex items-center gap-1">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                      isActive ? "bg-indigo-500/20 text-indigo-300" :
                      isDone ? "text-emerald-400/70" :
                      "text-white/20"
                    }`}>
                      <span className="material-symbols-outlined text-[11px]"
                        style={{ fontVariationSettings: isDone ? "'FILL' 1" : "'FILL' 0" }}>
                        {isDone ? "check_circle" : s.icon}
                      </span>
                      {s.label}
                    </div>
                    {i < STAGES.length - 1 && (
                      <span className={`text-[10px] ${isDone ? "text-emerald-400/40" : "text-white/10"}`}>›</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                Thinking…
              </div>
            )}
          </div>
        </header>

        {/* ── Main content ── */}
        <div className={`flex flex-1 overflow-hidden ${hasBrowserPanel ? "divide-x divide-white/[0.06]" : ""}`}>

          {/* ════ LEFT: Chat Panel ════ */}
          <div className={`flex flex-col ${hasBrowserPanel ? "w-[380px] shrink-0" : "w-full max-w-2xl mx-auto"} overflow-hidden`}>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth" style={{ scrollbarWidth: "thin" }}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-[13px] leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="max-w-[90%] w-full space-y-2">
                      {/* Agent indicator */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded-md bg-indigo-600/60 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[11px] text-indigo-300"
                            style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
                        </div>
                        <span className="text-[10px] text-white/30 font-medium">Counselor</span>
                        {msg.toolActivities?.some((t) => t.status === "running") && (
                          <span className="material-symbols-outlined text-[12px] text-amber-400 animate-spin">progress_activity</span>
                        )}
                      </div>

                      {/* Tool activities */}
                      {msg.toolActivities && msg.toolActivities.length > 0 && (
                        <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] space-y-1">
                          {msg.toolActivities.map((t, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-white/50">
                              <span className={`material-symbols-outlined text-[12px] ${t.status === "running" ? "animate-spin text-amber-400" : "text-emerald-400"}`}>
                                {t.status === "running" ? "progress_activity" : "check"}
                              </span>
                              {t.label}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Co-pilot step card */}
                      {msg.copilotStep && (
                        <CopilotStepCard step={msg.copilotStep} />
                      )}

                      {/* Message content */}
                      {msg.content && !msg.copilotStep && (
                        <div className="prose prose-sm prose-invert max-w-none text-[13px] text-white/80 leading-relaxed
                          [&_table]:text-[11px] [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1
                          [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-white/[0.04]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      )}

                      {/* Tool results */}
                      {msg.toolResults?.map((tr, i) => (
                        <div key={i}>{renderToolResult(tr.name, tr.result)}</div>
                      ))}

                      {/* Confirmations */}
                      {msg.confirmations?.map((conf, i) => (
                        <ConfirmationCard
                          key={i}
                          action={conf}
                          onConfirm={handleConfirm}
                          onReject={handleReject}
                          onEdit={handleEdit}
                        />
                      ))}

                      {/* Agent meta */}
                      {msg.agentMeta && msg.agentMeta.toolCalls > 0 && (
                        <div className="flex items-center gap-3 text-[10px] text-white/20 mt-1">
                          <span>{msg.agentMeta.toolCalls} tool{msg.agentMeta.toolCalls > 1 ? "s" : ""} used</span>
                          <span>·</span>
                          <span>{msg.agentMeta.loopIterations} iteration{msg.agentMeta.loopIterations > 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="material-symbols-outlined text-[14px] text-white/30 animate-spin">progress_activity</span>
                    <span className="text-[12px] text-white/30">Counselor is thinking…</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Start apply CTA ── */}
            {activeApplicationId && !hasBrowserPanel && (
              <div className="shrink-0 px-4 pb-3 pt-0">
                <button
                  onClick={() => startAssistedApplication(activeApplicationId)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500
                    text-white text-[13px] font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                  Start Application Guide
                </button>
              </div>
            )}

            {/* ── Input ── */}
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/[0.06]">
              <div className="flex items-end gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-indigo-500/40 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={handleTextareaInput}
                  placeholder={isLoading ? "Counselor is responding…" : "Reply to your counselor…"}
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[13px] text-white/85 placeholder:text-white/25
                    outline-none leading-relaxed"
                  style={{ maxHeight: "120px" }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500
                    disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    send
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ════ RIGHT: Browser Panel ════ */}
          {hasBrowserPanel && (
            <div className="flex flex-col flex-1 overflow-hidden bg-[#0d1117]">

              {/* Browser toolbar */}
              <div className="h-10 flex items-center justify-between px-3 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white/40 truncate max-w-[300px]">
                    {browserStatus || (liveViewUrl ? "Browser ready" : "Waiting…")}
                  </span>
                  {isComputerLoading && (
                    <span className="material-symbols-outlined text-[12px] text-amber-400 animate-spin shrink-0">progress_activity</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {copilotActive && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-[10px] text-indigo-300 font-medium">Guide active</span>
                    </div>
                  )}
                  {currentPortalUrl && (
                    <a href={currentPortalUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.09] text-white/45 hover:text-white/80 text-[10px] transition-colors">
                      <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      Open tab
                    </a>
                  )}
                </div>
              </div>

              {/* Browser view — Browserbase live iframe */}
              <div className="flex-1 overflow-hidden relative">
                {liveViewUrl ? (
                  <iframe
                    src={liveViewUrl}
                    className="w-full h-full border-0"
                    allow="clipboard-read; clipboard-write; microphone; camera"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="material-symbols-outlined text-[40px] text-white/15">language</span>
                    {activeApplicationId ? (
                      <>
                        <p className="text-[12px] text-white/30">Ready to start the browser session</p>
                        <button
                          onClick={() => startAssistedApplication(activeApplicationId)}
                          className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500
                            text-white text-[13px] font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                          Start Application Guide
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-[12px] text-white/25">Browser view will appear here</p>
                        <p className="text-[11px] text-white/15 text-center max-w-[200px]">
                          Confirm a university shortlist in the chat first
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Needs student overlay */}
                {needsStudent && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-xl border border-amber-500/30 bg-[#161b22] p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px] text-amber-400">
                            {needsStudent.reason === "ready_to_submit" ? "check_circle" :
                             needsStudent.reason === "guidance" ? "auto_awesome" :
                             needsStudent.reason === "captcha" ? "shield" :
                             needsStudent.reason === "login" ? "lock" :
                             needsStudent.reason === "payment" ? "credit_card" :
                             "person"}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-white/90">
                            {needsStudent.reason === "ready_to_submit" ? "Ready to Submit" :
                           needsStudent.reason === "guidance" ? "Application Guide Ready" :
                           "Your action needed"}
                          </p>
                          <p className="text-[12px] text-white/55 mt-1 leading-relaxed">{needsStudent.message}</p>
                        </div>
                      </div>

                      {/* Co-pilot mode: big "Open Portal Tab" CTA */}
                      {needsStudent.copilotMode && needsStudent.reason !== "ready_to_submit" && (
                        <div className="space-y-2">
                          <a
                            href={needsStudent.portalUrl ?? currentPortalUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                              bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            Open Portal Tab — Follow steps in chat
                          </a>
                          <p className="text-[10px] text-white/30 text-center leading-relaxed">
                            Follow the numbered steps in the left panel.<br />Come back here when done.
                          </p>
                          <button
                            onClick={() => {
                              setNeedsStudent(null);
                              setCopilotActive(false);
                            }}
                            className="w-full py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/60 text-[12px] transition-colors"
                          >
                            I'm done
                          </button>
                        </div>
                      )}

                      {!needsStudent.copilotMode && currentPortalUrl && needsStudent.reason !== "ready_to_submit" && (
                        <a
                          href={currentPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-white/10
                            text-white/60 hover:text-white/90 text-[12px] transition-colors hover:bg-white/[0.04]"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          Open portal in new tab to complete this step
                        </a>
                      )}

                      {needsStudent.reason === "ready_to_submit" ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-emerald-400 font-medium">
                            All fields filled! Please review in the portal and click Submit yourself.
                          </p>
                          {currentPortalUrl && (
                            <a
                              href={currentPortalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg bg-emerald-600/80
                                hover:bg-emerald-600 text-white text-[12px] font-medium transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                              Open portal to review & submit
                            </a>
                          )}
                          <button
                            onClick={() => { setNeedsStudent(null); setStage("done"); closeSession(); }}
                            className="w-full py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/50 text-[12px] transition-colors"
                          >
                            Mark as Done
                          </button>
                        </div>
                      ) : !needsStudent.copilotMode ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setNeedsStudent(null); if (activeApplicationId) resumeAssistedApplication(); }}
                            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-medium transition-colors"
                          >
                            Resume
                          </button>
                          <button
                            onClick={closeSession}
                            className="px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/60 text-[12px] transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

              </div>

              {/* Browser controls */}
              <div className="h-10 flex items-center justify-between px-4 border-t border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                  {!isPaused && sessionId && !isComputerLoading && (
                    <button
                      onClick={pauseSession}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.08]
                        text-white/50 hover:text-white/80 text-[11px] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">pause</span>
                      Pause
                    </button>
                  )}
                  {isPaused && (
                    <button
                      onClick={() => { setIsPaused(false); if (activeApplicationId) resumeAssistedApplication(); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600/60 hover:bg-indigo-600
                        text-white text-[11px] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">play_arrow</span>
                      Resume
                    </button>
                  )}
                  {sessionId && (
                    <button
                      onClick={closeSession}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/[0.05]
                        text-white/30 hover:text-white/60 text-[11px] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                      Close session
                    </button>
                  )}
                </div>

                {activeApplicationId && !sessionId && (
                  <button
                    onClick={() => startAssistedApplication(activeApplicationId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500
                      text-white text-[11px] font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px]">play_arrow</span>
                    Start Application Guide
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
