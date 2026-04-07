"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ConfirmationCard,
  type ConfirmationAction,
  type ConfirmationChange,
} from "@/components/ui/confirmation-card";
import { renderToolResult } from "@/components/ui/riz-result-cards";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionLike;
    webkitSpeechRecognition: new () => SpeechRecognitionLike;
  }
}

interface ToolActivity { name: string; label: string; status: "running" | "done"; }
interface ThinkingStep { step: number; message: string; }
interface AgentMeta { toolCalls: number; loopIterations: number; confirmationsPending: number; toolLog: Array<{ tool: string; durationMs: number; success: boolean }>; }
interface Alert { id: string; type: string; title: string; body: string; priority: string; actionUrl?: string; isRead: boolean; createdAt: string; }
interface ThreadSummary { id: string; title: string; summary: string | null; messageCount: number; updatedAt: string; }
interface ToolResultData { name: string; result: string; }

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolActivities?: ToolActivity[];
  confirmations?: ConfirmationAction[];
  toolResults?: ToolResultData[];
  thinking?: ThinkingStep;
  agentMeta?: AgentMeta;
}

/* ─── Agent Workflows ─── */

const WORKFLOWS = [
  {
    icon: "account_balance",
    title: "Strategic Analysis",
    tag: "MULTI-STEP",
    desc: "Profile evaluation → University matching → Eligibility check → Cost comparison → Tiered recommendations",
    tools: ["search_universities", "check_eligibility", "compare_costs"],
    prompt: "Run a complete strategic analysis for me. Search universities matching my profile, check my eligibility for the top matches, compare their costs, and give me a tiered recommendation: dream, target, and safety schools. Do all of this in one go.",
  },
  {
    icon: "verified",
    title: "Visa Intelligence",
    tag: "COMPLIANCE",
    desc: "Requirements analysis → Document checklist → Timeline planning → Interview preparation",
    tools: ["visa_requirements", "document_check", "interview_prep"],
    prompt: "Give me a complete visa guide for my target countries. Include document requirements, processing timelines, interview tips, financial proof needed, and common rejection reasons to avoid.",
  },
  {
    icon: "payments",
    title: "Funding Matrix",
    tag: "FINANCIAL",
    desc: "Scholarship search → Cost analysis → ROI calculation → Funding strategy",
    tools: ["find_scholarships", "calculate_roi", "compare_costs"],
    prompt: "Help me plan my finances for studying abroad. Find scholarships I'm eligible for, compare costs across my target universities, calculate ROI for each, and estimate total cost including tuition + living.",
  },
];

const QUICK_ACTIONS = [
  { icon: "school", label: "Profile Evaluation", prompt: "Evaluate my academic profile. Check my eligibility for my target universities, show match scores, and tell me what I need to improve." },
  { icon: "description", label: "Generate SOP", prompt: "Help me write my Statement of Purpose. Ask me a few questions about my motivation and goals, then generate a complete SOP for my top-choice university." },
  { icon: "trophy", label: "Scholarship Search", prompt: "Search for all scholarships and assistantships I'm eligible for. Show amounts, eligibility, and deadlines." },
  { icon: "calendar_month", label: "Deadline Tracker", prompt: "Show me all upcoming deadlines for my target programs. Build a month-by-month timeline." },
  { icon: "calculate", label: "ROI Analysis", prompt: "Calculate ROI for my target universities. Compare total costs in INR vs expected salaries and break-even years." },
  { icon: "flight_takeoff", label: "Mock Interview", prompt: "Generate a mock visa interview with personalized questions and answers based on my profile." },
];

export default function RizAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showThreads, setShowThreads] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Compute live agent stats from current messages
  const activeTools = messages.flatMap((m) => m.toolActivities ?? []);
  const runningTools = activeTools.filter((t) => t.status === "running").length;
  const completedTools = activeTools.filter((t) => t.status === "done").length;

  /* ─── Init ─── */
  useEffect(() => {
    fetch("/api/ai/threads").then((r) => r.json()).then((d) => setThreads(d.threads ?? [])).catch((e) => console.error("Threads fetch failed:", e));
    fetch("/api/ai/alerts").then((r) => r.json()).then((d) => setAlerts(d.alerts ?? [])).catch((e) => console.error("Alerts fetch failed:", e));
  }, []);

  useEffect(() => {
    const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setSpeechSupported(supported);
    if (supported) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results as any[]).map((r: any) => r[0].transcript).join("");
        setInput(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) recognitionRef.current.stop();
    else { recognitionRef.current.start(); setIsListening(true); }
  }, [isListening]);

  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ai/threads?threadId=${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: { role: string; content: string }, i: number) => ({
          id: `loaded-${i}`, role: m.role as "user" | "assistant", content: m.content, timestamp: new Date(),
        })));
        setThreadId(id);
        setShowThreads(false);
      }
    } catch { /* silent */ }
  }, []);

  /* ─── Confirmations ─── */
  const handleConfirm = useCallback(async (action: ConfirmationAction) => {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.map((m) => ({ role: m.role, content: m.content })), threadId,
          confirmAction: { toolName: action.toolName, toolInput: action.toolInput, toolUseId: action.toolUseId } }),
      });
      const data = await res.json();
      if (data.success) {
        const toolResultData: ToolResultData | null = data.result ? { name: action.toolName, result: JSON.stringify(data.result) } : null;
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant",
          content: `**Action completed:** ${data.result?.message || `${action.title} completed.`}`,
          timestamp: new Date(), toolResults: toolResultData ? [toolResultData] : undefined }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Failed to execute action.", timestamp: new Date() }]);
    }
  }, [messages, threadId]);

  const handleReject = useCallback(async (action: ConfirmationAction) => {
    try {
      await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.map((m) => ({ role: m.role, content: m.content })), threadId,
          rejectAction: { toolName: action.toolName, toolUseId: action.toolUseId } }) });
    } catch { /* silent */ }
  }, [messages, threadId]);

  const handleEdit = useCallback(async (action: ConfirmationAction, editedChanges: ConfirmationChange[]) => {
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.map((m) => ({ role: m.role, content: m.content })), threadId,
          confirmAction: { toolName: action.toolName, toolInput: action.toolInput, toolUseId: action.toolUseId,
            editedChanges: editedChanges.map((c) => ({ field: c.field, newValue: c.newValue })) } }) });
      const data = await res.json();
      if (data.success) {
        const toolResultData: ToolResultData | null = data.result ? { name: action.toolName, result: JSON.stringify(data.result) } : null;
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant",
          content: `**Action completed with edits:** ${data.result?.message || "Done."}`,
          timestamp: new Date(), toolResults: toolResultData ? [toolResultData] : undefined }]);
      }
    } catch { /* silent */ }
  }, [messages, threadId]);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      await fetch("/api/ai/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action: "dismiss" }) });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch { /* silent */ }
  }, []);

  /* ─── Send message ─── */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: content.trim(), timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })), topic: selectedTopic, threadId }),
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
            else if (parsed.thinking) setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, thinking: parsed.thinking } : m));
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
            } else if (parsed.text) setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + parsed.text } : m));
          } catch { /* skip */ }
        }
      }
      fetch("/api/ai/threads").then((r) => r.json()).then((d) => setThreads(d.threads ?? [])).catch((e) => console.error("Threads refresh failed:", e));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Sorry, I encountered an error. Please try again." } : m));
    } finally { setIsLoading(false); abortRef.current = null; }
  }, [messages, isLoading, selectedTopic, threadId]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };
  const handleTextareaInput = () => { if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px"; } };
  const clearChat = () => { if (abortRef.current) abortRef.current.abort(); setMessages([]); setSelectedTopic(null); setThreadId(null); setIsLoading(false); };

  const hasMessages = messages.length > 0;
  const priorityIcon: Record<string, string> = { urgent: "error", high: "warning", medium: "info", low: "info" };

  /* ═══ RENDER ═══ */

  return (
    <div className="riz-root flex flex-col h-[calc(100vh-64px)] md:h-screen overflow-hidden">

      {/* ══════════ TOP BAR ══════════ */}
      <header className="h-11 flex items-center justify-between px-4 md:px-6 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-4">
          {/* Agent badge */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              </div>
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-[1.5px] ring-[#010409] ${isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[11px] font-semibold text-white/70 leading-none">Riz Agent</span>
              <span className="text-[9px] text-white/25 leading-none mt-0.5">
                {isLoading ? "Executing..." : "Ready"}
              </span>
            </div>
          </div>

          {/* Live stats when working */}
          {hasMessages && (
            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-white/[0.06]">
              {runningTools > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400/80 font-mono">
                  <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                  {runningTools} running
                </span>
              )}
              {completedTools > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400/60 font-mono">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  {completedTools} done
                </span>
              )}
              {threadId && (
                <span className="text-[9px] text-white/15 font-mono">{threadId.slice(0, 8)}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowThreads(!showThreads)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">history</span>
            <span className="hidden md:inline">Sessions</span>
            {threads.length > 0 && (
              <span className="min-w-[16px] h-4 rounded px-1 bg-white/[0.06] text-[9px] font-bold flex items-center justify-center">{threads.length}</span>
            )}
          </button>
          {hasMessages && (
            <button onClick={clearChat}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-all">
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span className="hidden md:inline">New</span>
            </button>
          )}
        </div>
      </header>

      {/* Thread history */}
      {showThreads && (
        <div className="border-b border-white/[0.06] bg-[#0d1117] max-h-56 overflow-y-auto">
          <div className="p-3 space-y-1 max-w-3xl mx-auto">
            {threads.length === 0 ? (
              <p className="text-xs text-white/30 py-2 text-center">No previous sessions</p>
            ) : threads.map((t) => (
              <button key={t.id} onClick={() => loadThread(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all ${threadId === t.id ? "bg-white/[0.06]" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-medium text-white/70 truncate">{t.title}</span>
                  <span className="text-[10px] text-white/20 shrink-0">{new Date(t.updatedAt).toLocaleDateString()}</span>
                </div>
                {t.summary && <p className="text-[10px] text-white/25 mt-0.5 line-clamp-1">{t.summary}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ MAIN AREA ══════════ */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 riz-scrollbar-hide">
        <div className="max-w-3xl mx-auto">
          {!hasMessages ? (
            /* ═══ Empty state ═══ */
            <div className="pt-10 md:pt-16 pb-40">
              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-2 mb-10">
                  {alerts.slice(0, 2).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.1]">
                      <span className="material-symbols-outlined text-[16px] text-amber-400 mt-0.5 shrink-0">{priorityIcon[alert.priority] ?? "info"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-white/80">{alert.title}</p>
                        <p className="text-[11px] text-white/35 mt-0.5">{alert.body}</p>
                      </div>
                      <button onClick={() => dismissAlert(alert.id)} className="text-white/20 hover:text-white/50 transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Hero */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-[0_8px_32px_rgba(99,102,241,0.25)] mb-5">
                  <span className="material-symbols-outlined text-white text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white font-headline tracking-tight mb-2">
                  What would you like me to do?
                </h1>
                <p className="text-[13px] text-white/30 max-w-lg mx-auto leading-relaxed">
                  I&apos;m an autonomous agent that can plan, execute multi-step workflows, search real-time data, and take actions across your applications.
                </p>
              </div>

              {/* Agent Workflows */}
              <div className="mb-10">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em] mb-3 px-1">Workflows</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {WORKFLOWS.map((wf) => (
                    <button
                      key={wf.title}
                      onClick={() => { setSelectedTopic(wf.title); sendMessage(wf.prompt); }}
                      className="riz-wf-card group text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-indigo-500/20 transition-all overflow-hidden relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative px-5 pt-5 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/[0.1] flex items-center justify-center group-hover:bg-indigo-500/[0.15] transition-colors">
                            <span className="material-symbols-outlined text-[20px] text-indigo-400">{wf.icon}</span>
                          </div>
                          <span className="text-[8px] font-bold tracking-[0.12em] text-indigo-400/60 bg-indigo-500/[0.08] px-2 py-0.5 rounded-full">{wf.tag}</span>
                        </div>
                        <h3 className="text-[14px] font-semibold text-white/90 mb-2 font-headline">{wf.title}</h3>
                        <p className="text-[11px] text-white/30 leading-[1.6]">{wf.desc}</p>
                      </div>
                      <div className="relative px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                        <span className="text-[10px] text-white/20 font-medium group-hover:text-indigo-400/80 transition-colors">
                          Run workflow
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-white/10 group-hover:text-indigo-400/60 group-hover:translate-x-0.5 transition-all">
                          arrow_forward
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em] mb-3 px-1">Quick Actions</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {QUICK_ACTIONS.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => sendMessage(q.prompt)}
                      className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-white/[0.05] bg-white/[0.015]
                        hover:bg-white/[0.04] hover:border-white/[0.1] transition-all text-left"
                    >
                      <span className="material-symbols-outlined text-[18px] text-white/20 group-hover:text-indigo-400/60 transition-colors">{q.icon}</span>
                      <span className="text-[12px] text-white/40 group-hover:text-white/70 transition-colors font-medium">{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ═══ Chat messages ═══ */
            <div className="space-y-1 pb-36 pt-2">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end py-2">
                      <div className="max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap shadow-lg shadow-indigo-600/10">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="py-3">
                      {/* Agent identity on first content */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                        </div>
                        <span className="text-[11px] font-semibold text-white/50">Riz Agent</span>
                        <span className="text-[10px] text-white/15">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Agent thinking */}
                      {msg.thinking && (
                        <div className="flex items-center gap-2.5 mb-3 ml-8 px-3 py-2 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/[0.08]">
                          <span className="material-symbols-outlined text-[14px] text-indigo-400 animate-spin shrink-0">progress_activity</span>
                          <div>
                            <span className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-wider">Step {msg.thinking.step}</span>
                            <span className="text-[11px] text-white/35 ml-2">{msg.thinking.message}</span>
                          </div>
                        </div>
                      )}

                      {/* Tool execution log */}
                      {msg.toolActivities && msg.toolActivities.length > 0 && (
                        <div className="mb-3 ml-8 rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
                          <div className="px-3.5 py-2 border-b border-white/[0.05] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[13px] text-indigo-400/50">terminal</span>
                            <span className="text-[10px] font-semibold text-white/35">Tool Execution</span>
                            <span className="text-[9px] text-white/15 ml-auto font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">{msg.toolActivities.length} calls</span>
                          </div>
                          <div className="px-3.5 py-2.5 space-y-2">
                            {msg.toolActivities.map((tool, i) => (
                              <div key={`${tool.name}-${i}`} className="flex items-center gap-2.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tool.status === "running" ? "bg-amber-400 animate-pulse shadow-[0_0_4px_rgba(251,191,36,0.4)]" : "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.3)]"}`} />
                                <span className="text-[11px] text-white/45 font-medium">{tool.label}</span>
                                <span className={`text-[9px] font-mono ml-auto px-1.5 py-0.5 rounded ${tool.status === "running" ? "text-amber-400/70 bg-amber-400/[0.06]" : "text-emerald-400/70 bg-emerald-400/[0.06]"}`}>
                                  {tool.status === "running" ? "running" : "✓ done"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message content */}
                      <div className="text-[13.5px] leading-[1.75] text-white/65 ml-8">
                        {msg.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                            h2: ({ children }) => <h2 className="text-[14px] font-bold text-white/90 mt-4 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-[13px] font-bold text-white/85 mt-3 mb-1.5">{children}</h3>,
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-white/85">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-3 rounded-lg border border-white/[0.06]">
                                <table className="w-full text-[12px]">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-white/[0.03]">{children}</thead>,
                            th: ({ children }) => <th className="px-3 py-2 text-left text-[10px] font-semibold text-white/50 uppercase tracking-wider">{children}</th>,
                            td: ({ children }) => <td className="px-3 py-2 border-t border-white/[0.04]">{children}</td>,
                            code: ({ children, className }) => {
                              const isBlock = className?.includes("language-");
                              return isBlock
                                ? <pre className="bg-white/[0.03] rounded-lg p-3 my-2 overflow-x-auto text-[11px] font-mono"><code>{children}</code></pre>
                                : <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-indigo-300 text-[12px] font-mono">{children}</code>;
                            },
                            hr: () => <hr className="border-white/[0.06] my-3" />,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-500/30 pl-3 my-2 text-white/40 italic">{children}</blockquote>,
                            a: ({ href, children }) => (
                              <a href={href} target={href?.startsWith("/") ? undefined : "_blank"} rel={href?.startsWith("/") ? undefined : "noopener noreferrer"}
                                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">{children}</a>
                            ),
                          }}>{msg.content}</ReactMarkdown>
                        ) : isLoading ? (
                          <div className="flex items-center gap-2.5 py-1">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Tool results */}
                      {msg.toolResults && msg.toolResults.length > 0 && (
                        <div className="mt-3 ml-8">
                          {msg.toolResults.map((tr, i) => {
                            const rendered = renderToolResult(tr.name, tr.result);
                            return rendered ? <div key={`tr-${i}`}>{rendered}</div> : null;
                          })}
                        </div>
                      )}

                      {/* Agent meta */}
                      {msg.agentMeta && msg.agentMeta.toolCalls > 0 && (
                        <div className="flex items-center gap-2 mt-3 ml-8">
                          <div className="inline-flex items-center gap-4 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[9px] font-mono text-white/25">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-indigo-400/50" />
                              {msg.agentMeta.toolCalls} tools
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-indigo-400/50" />
                              {msg.agentMeta.loopIterations} steps
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-indigo-400/50" />
                              {Math.round(msg.agentMeta.toolLog.reduce((s, t) => s + t.durationMs, 0) / 1000)}s
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Confirmations */}
                      {msg.confirmations && msg.confirmations.length > 0 && (
                        <div className="mt-3 space-y-2 ml-8">
                          {msg.confirmations.map((action) => (
                            <ConfirmationCard key={action.id} action={action} onConfirm={handleConfirm} onReject={handleReject} onEdit={handleEdit} disabled={isLoading} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ══════════ INPUT ══════════ */}
      <div className="shrink-0 px-4 md:px-6 pb-5 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="relative group">
            {/* Focus glow */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-indigo-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-end gap-2.5 bg-[#0d1117] border border-white/[0.08] rounded-2xl px-4 py-3
              focus-within:border-indigo-500/20 transition-all shadow-xl shadow-black/20">
              <textarea
                ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown} onInput={handleTextareaInput}
                placeholder="Describe a task or ask a question..."
                rows={1} disabled={isLoading}
                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-white/90 placeholder:text-white/20
                  text-[14px] resize-none max-h-32 py-0.5 riz-scrollbar-hide"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                {speechSupported && (
                  <button onClick={toggleListening} disabled={isLoading}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                      ${isListening ? "bg-red-500/20 text-red-400" : "text-white/20 hover:text-white/50 hover:bg-white/[0.06]"}`}>
                    <span className="material-symbols-outlined text-[18px]">{isListening ? "stop" : "mic"}</span>
                  </button>
                )}
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center
                    hover:bg-indigo-500 transition-all disabled:opacity-20 disabled:cursor-not-allowed
                    shadow-lg shadow-indigo-600/20">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center mt-2">
            <span className="text-[10px] text-white/15">
              {isLoading ? "Agent is executing..." : "Riz Agent can make mistakes. Verify important information."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
