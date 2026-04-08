"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface QuestionResult {
  question: string;
  answer: string | null;
  feedback: string | null;
  score: number | null;
}

type InterviewType = "visa" | "university" | "scholarship";
type Stage = "setup" | "interview" | "results";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionLike;
    webkitSpeechRecognition: new () => SpeechRecognitionLike;
  }
}

const typeConfig: Record<InterviewType, { icon: string; label: string; desc: string; color: string }> = {
  visa: {
    icon: "receipt_long",
    label: "Visa Interview",
    desc: "Practice embassy/consulate visa interview questions",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  university: {
    icon: "school",
    label: "University Interview",
    desc: "Practice admission interview with committee members",
    color: "from-indigo-500/20 to-purple-500/20",
  },
  scholarship: {
    icon: "workspace_premium",
    label: "Scholarship Interview",
    desc: "Practice scholarship panel interview questions",
    color: "from-amber-500/20 to-orange-500/20",
  },
};

const countries = ["Germany", "United States", "United Kingdom", "Canada", "Australia", "Ireland"];

export default function InterviewPrepPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [type, setType] = useState<InterviewType>("visa");
  const [country, setCountry] = useState("Germany");
  const [universityName, setUniversityName] = useState("");

  // Interview state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; feedback: string; tip: string } | null>(null);

  // Results state
  const [finalResult, setFinalResult] = useState<{
    overallScore: number;
    summary: string;
    questions: QuestionResult[];
  } | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswer(transcript);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          type,
          country: type === "visa" ? country : undefined,
          universityName: type === "university" ? universityName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setStage("interview");
      setAnswer("");
      setFeedback(null);

      // Speak the first question
      setTimeout(() => speak(data.firstQuestion), 500);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!sessionId || !answer.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          sessionId,
          answer,
          questionIndex: currentIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFeedback({ score: data.score, feedback: data.feedback, tip: data.tip });

      if (data.isComplete) {
        // Auto-finish after showing last feedback
        setTimeout(() => finishInterview(), 3000);
      }
    } catch {
      // Error handled silently
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswer("");
      setFeedback(null);
      setTimeout(() => speak(questions[currentIndex + 1]), 300);
    }
  };

  const finishInterview = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish", sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFinalResult(data);
      setStage("results");
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";

  const scoreBarColor = (score: number) =>
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/10">
            <span className="material-symbols-outlined text-[22px] text-purple-400">mic</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/90 font-headline">Interview Prep</h1>
            <p className="text-[13px] text-white/40">Practice with AI-powered mock interviews and get real-time feedback</p>
          </div>
        </div>
      </div>

      {/* Setup Stage */}
      {stage === "setup" && (
        <div className="space-y-6">
          {/* Interview Type Selection */}
          <div>
            <p className="text-[13px] text-white/50 mb-3 font-medium">Select interview type</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.entries(typeConfig) as [InterviewType, typeof typeConfig.visa][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  className={`p-4 rounded-xl border transition-all text-left
                    ${type === key
                      ? `bg-gradient-to-br ${cfg.color} border-indigo-500/30`
                      : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                    }`}
                >
                  <span className="material-symbols-outlined text-[24px] text-indigo-400 mb-2 block">{cfg.icon}</span>
                  <p className="text-[14px] font-medium text-white/80">{cfg.label}</p>
                  <p className="text-[12px] text-white/40 mt-1">{cfg.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Country / University selector */}
          {type === "visa" && (
            <div>
              <label className="block text-[13px] text-white/50 mb-2">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[14px] text-white/80
                  focus:outline-none focus:border-indigo-500/40"
              >
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {type === "university" && (
            <div>
              <label className="block text-[13px] text-white/50 mb-2">University name (optional)</label>
              <input
                type="text"
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                placeholder="e.g. TU Munich, MIT, UCL..."
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[14px] text-white/80
                  placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40"
              />
            </div>
          )}

          <button
            onClick={startInterview}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[15px] font-medium
              hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                Preparing questions...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                Start Interview
              </>
            )}
          </button>
        </div>
      )}

      {/* Interview Stage */}
      {stage === "interview" && (
        <div className="space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-[12px] text-white/40 shrink-0">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>

          {/* Question */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                ${isSpeaking ? "bg-indigo-500/20 animate-pulse" : "bg-white/[0.06]"}`}>
                <span className="material-symbols-outlined text-[20px] text-indigo-400">
                  {isSpeaking ? "volume_up" : "psychology"}
                </span>
              </div>
              <div>
                <p className="text-[12px] text-white/30 mb-1">Question {currentIndex + 1}</p>
                <p className="text-[15px] text-white/80 leading-relaxed">{questions[currentIndex]}</p>
              </div>
            </div>
            <button
              onClick={() => speak(questions[currentIndex])}
              className="mt-3 text-[12px] text-indigo-400/60 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">replay</span>
              Repeat question
            </button>
          </div>

          {/* Answer Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] text-white/50">Your answer</label>
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all
                  ${isRecording
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-white/[0.05] text-white/50 border border-white/[0.08] hover:text-white/70"
                  }`}
              >
                <span className={`material-symbols-outlined text-[16px] ${isRecording ? "animate-pulse" : ""}`}>
                  {isRecording ? "stop_circle" : "mic"}
                </span>
                {isRecording ? "Stop Recording" : "Speak"}
              </button>
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Type or speak your answer..."
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[14px] text-white/80
                placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 resize-none"
            />
          </div>

          {/* Submit / Next */}
          <div className="flex gap-3">
            <button
              onClick={submitAnswer}
              disabled={!answer.trim() || submitting}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-[14px] font-medium
                hover:bg-indigo-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Evaluating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Submit Answer
                </>
              )}
            </button>

            {feedback && currentIndex < questions.length - 1 && (
              <button
                onClick={nextQuestion}
                className="px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-[14px]
                  hover:bg-white/[0.08] hover:text-white/80 transition-all flex items-center gap-2"
              >
                Next
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            )}

            {feedback && currentIndex >= questions.length - 1 && (
              <button
                onClick={finishInterview}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-[14px] font-medium
                  hover:bg-emerald-500 disabled:opacity-40 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                Finish
              </button>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-[20px] font-bold ${scoreColor(feedback.score)}`}>{feedback.score}</span>
                <span className="text-[12px] text-white/30">/ 100</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(feedback.score)}`}
                    style={{ width: `${feedback.score}%` }}
                  />
                </div>
              </div>
              <p className="text-[13px] text-white/60 mb-2">{feedback.feedback}</p>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <span className="material-symbols-outlined text-[16px] text-indigo-400 mt-0.5">lightbulb</span>
                <p className="text-[12px] text-indigo-300/70">{feedback.tip}</p>
              </div>
            </div>
          )}

          {/* End early */}
          <div className="flex justify-center">
            <button
              onClick={finishInterview}
              disabled={loading}
              className="text-[12px] text-white/30 hover:text-white/50 transition-colors"
            >
              End interview early
            </button>
          </div>
        </div>
      )}

      {/* Results Stage */}
      {stage === "results" && finalResult && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="text-[12px] text-white/40 uppercase tracking-wider mb-2">Overall Score</p>
            <p className={`text-5xl font-bold ${scoreColor(finalResult.overallScore)}`}>
              {finalResult.overallScore}
            </p>
            <p className="text-[13px] text-white/30 mt-1">out of 100</p>
            <div className="w-48 h-2 rounded-full bg-white/[0.06] overflow-hidden mx-auto mt-4">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${scoreBarColor(finalResult.overallScore)}`}
                style={{ width: `${finalResult.overallScore}%` }}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-[13px] font-medium text-white/70 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-400">summarize</span>
              Assessment
            </h3>
            <p className="text-[14px] text-white/50 leading-relaxed">{finalResult.summary}</p>
          </div>

          {/* Per-question breakdown */}
          <div>
            <h3 className="text-[13px] font-medium text-white/70 mb-3">Question Breakdown</h3>
            <div className="space-y-3">
              {finalResult.questions.map((q, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[13px] text-white/60 flex-1">{q.question}</p>
                    {q.score !== null && (
                      <span className={`text-[14px] font-semibold shrink-0 ml-3 ${scoreColor(q.score)}`}>
                        {q.score}
                      </span>
                    )}
                  </div>
                  {q.answer && (
                    <p className="text-[12px] text-white/30 mb-1">
                      <span className="text-white/40">You said:</span> {q.answer.slice(0, 150)}
                      {q.answer.length > 150 ? "..." : ""}
                    </p>
                  )}
                  {q.feedback && (
                    <p className="text-[12px] text-indigo-300/50 mt-1">{q.feedback}</p>
                  )}
                  {!q.answer && (
                    <p className="text-[12px] text-white/20 italic">Skipped</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Try Again */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setStage("setup");
                setFinalResult(null);
                setSessionId(null);
                setQuestions([]);
                setCurrentIndex(0);
                setAnswer("");
                setFeedback(null);
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-[14px] font-medium
                hover:bg-indigo-500 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">replay</span>
              Practice Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
