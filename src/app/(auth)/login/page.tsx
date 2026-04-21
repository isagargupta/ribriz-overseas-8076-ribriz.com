"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

type Step = "email" | "otp";

const DESTS = [
  { f: "🇬🇧", n: "UK" }, { f: "🇨🇦", n: "Canada" }, { f: "🇦🇺", n: "Australia" },
  { f: "🇩🇪", n: "Germany" }, { f: "🇺🇸", n: "USA" }, { f: "🇳🇱", n: "Netherlands" },
];

const STATS = [
  { v: "847+", l: "Students" },
  { v: "94%", l: "Visa success" },
  { v: "30+", l: "Universities" },
];

const inputCls =
  "w-full rounded-full border border-[#E2E4E9] bg-white px-5 py-[13px] text-[15px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/[0.07] transition-all duration-200";

const btnCls =
  "w-full rounded-full bg-[#111827] text-white font-semibold text-[14px] py-[14px] hover:bg-[#1f2937] active:bg-[#374151] transition-colors flex items-center justify-center gap-2 disabled:opacity-50";

// ── OTP Box ───────────────────────────────────────────────

function OTPBox({
  digit, i, refs, onChange, onKeyDown, onPaste, hasError,
}: {
  digit: string; i: number;
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (i: number, v: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  hasError: boolean;
}) {
  const controls = useAnimation();
  const prev = useRef(digit);

  useEffect(() => {
    if (digit && !prev.current) {
      controls.start({ scale: [1, 1.12, 0.96, 1], transition: { duration: 0.2, ease: "easeOut" } });
    }
    prev.current = digit;
  }, [digit, controls]);

  return (
    <motion.div animate={controls} className="flex-1 min-w-0">
      <input
        ref={(el) => { refs.current[i] = el; }}
        type="text"
        inputMode="numeric"
        value={digit}
        onChange={(e) => onChange(i, e.target.value)}
        onKeyDown={(e) => onKeyDown(i, e)}
        onPaste={onPaste}
        maxLength={1}
        autoFocus={i === 0}
        className={`w-full h-[58px] text-center text-[22px] font-semibold caret-transparent rounded-[12px] border transition-all duration-150 focus:outline-none ${
          hasError
            ? "border-red-400 bg-red-50/60 text-red-500"
            : digit
            ? "border-primary bg-primary/[0.05] text-primary"
            : "border-[#E5E7EB] bg-[#F9FAFB] focus:border-primary focus:ring-[3px] focus:ring-primary/[0.08] focus:bg-white"
        }`}
      />
    </motion.div>
  );
}

// ── Step animation ────────────────────────────────────────

const stepVars = {
  enter: (d: number) => ({ x: d * 24, opacity: 0, filter: "blur(3px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (d: number) => ({ x: d * -24, opacity: 0, filter: "blur(3px)" }),
};

// ── Back button ───────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280] hover:text-[#111827] transition-colors mb-7 group"
    >
      <div className="w-7 h-7 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center group-hover:border-[#D1D5DB] transition-colors">
        <ArrowLeft size={11} />
      </div>
      <span>Back</span>
    </button>
  );
}

// ── Error message ─────────────────────────────────────────

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 text-[13px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 rounded-full font-medium"
    >
      <span className="shrink-0 mt-px">⚠</span>
      <span>{msg}</span>
    </motion.div>
  );
}

// ── Login Page ────────────────────────────────────────────

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [dir, setDir] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const otpStr = otp.join("");

  const otpChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setOtp(o => { const n = [...o]; n[i] = d; return n; });
    setError("");
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const otpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      setOtp(o => { const n = [...o]; n[i - 1] = ""; return n; });
      refs.current[i - 1]?.focus();
    }
  };

  const otpPaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!p.length) return;
    e.preventDefault();
    const next = [...p.split(""), ...Array(6).fill("")].slice(0, 6);
    setOtp(next);
    const f = next.findIndex(d => !d);
    refs.current[f === -1 ? 5 : f]?.focus();
  };

  const post = async (url: string, body: object) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        console.error(url, res.status, await res.text());
        return { ok: false, data: { error: "Server error. Please try again." } };
      }
      const data = await res.json();
      return { ok: res.ok, data };
    } catch (err) {
      const to = err instanceof DOMException && err.name === "AbortError";
      return { ok: false, data: { error: to ? "Request timed out. Please try again." : "Something went wrong. Please try again." } };
    } finally { clearTimeout(t); }
  };

  const sendOTP = async (e?: { preventDefault(): void }) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await post("/api/auth/otp/send", { email, type: "login" });
      if (!ok) setError(data.error || "Failed to send code");
      else { setDir(1); setStep("otp"); }
    } finally { setLoading(false); }
  };

  const verifyOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await post("/api/auth/otp/verify", { otp: otpStr });
      if (!ok) {
        setError(data.error || "Verification failed");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      router.push(data.redirect ?? "/dashboard");
      router.refresh();
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">

      {/* ══ Left: Brand Panel ══ */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden" style={{ background: "#060912" }}>

        <motion.div
          className="absolute -top-28 -left-28 w-[560px] h-[560px] pointer-events-none rounded-full"
          style={{ background: "radial-gradient(circle, rgba(53,37,205,0.36) 0%, transparent 65%)", filter: "blur(55px)" }}
          animate={{ x: [-45, 60, -45], y: [-20, 45, -20], scale: [1, 1.13, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
        />
        <motion.div
          className="absolute -bottom-36 -right-20 w-[480px] h-[480px] pointer-events-none rounded-full"
          style={{ background: "radial-gradient(circle, rgba(79,70,229,0.26) 0%, transparent 65%)", filter: "blur(70px)" }}
          animate={{ x: [28, -48, 28], y: [28, -40, 28], scale: [1, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            opacity: 0.13,
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">

          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div
              className="w-9 h-9 flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #3525cd, #5040e8)", borderRadius: "10px", boxShadow: "0 4px 16px rgba(53,37,205,0.5)" }}
            >
              R
            </div>
            <span className="text-[18px] font-semibold tracking-tight text-white">RIBRIZ</span>
          </motion.div>

          {/* Copy */}
          <div>
            <motion.div
              className="inline-flex items-center gap-2 mb-6 px-3 py-1.5"
              style={{ background: "rgba(255,255,255,0.06)", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.1)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>Study Abroad Platform</span>
            </motion.div>

            <motion.h2
              className="text-[50px] font-bold tracking-[-1.5px] leading-[1.02] mb-5 text-white"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            >
              Apply Abroad,
              <br />
              <span style={{ background: "linear-gradient(130deg, #c4bcff 0%, #8b7ff5 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Agent-Free.
              </span>
            </motion.h2>

            <motion.p
              className="text-[15px] leading-relaxed mb-10 max-w-[290px]"
              style={{ color: "rgba(255,255,255,0.36)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            >
              Match with universities, predict your admission chances, and navigate visa processes — entirely on your own.
            </motion.p>

            {/* Stats */}
            <motion.div
              className="flex gap-8 mb-10"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            >
              {STATS.map(s => (
                <div key={s.l}>
                  <p className="text-[28px] font-bold text-white leading-none tracking-tight">{s.v}</p>
                  <p className="text-[12px] font-medium mt-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>{s.l}</p>
                </div>
              ))}
            </motion.div>

            {/* Destination tags */}
            <motion.div className="flex gap-2 flex-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.62 }}>
              {DESTS.map((d, i) => (
                <motion.span
                  key={d.n}
                  className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5"
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "100px",
                  }}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 + i * 0.06 }}
                >
                  {d.f} {d.n}
                </motion.span>
              ))}
            </motion.div>
          </div>

          <motion.p
            className="text-[11px] font-medium"
            style={{ color: "rgba(255,255,255,0.16)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.88 }}
          >
            Trusted by students across 6 countries
          </motion.p>
        </div>
      </div>

      {/* ══ Right: Form Panel ══ */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative bg-white">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 15%, rgba(53,37,205,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 85%, rgba(79,70,229,0.02) 0%, transparent 50%)" }}
        />

        <div className="relative w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div
              className="w-8 h-8 flex items-center justify-center text-white font-bold text-xs"
              style={{ background: "linear-gradient(135deg, #3525cd, #5040e8)", borderRadius: "8px" }}
            >R</div>
            <span className="text-[17px] font-semibold tracking-tight text-[#111827]">RIBRIZ</span>
          </div>

          <AnimatePresence mode="wait" custom={dir}>

            {/* ── Step 1: Email ── */}
            {step === "email" && (
              <motion.div
                key="email" custom={dir} variants={stepVars}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="mb-8">
                  <h1 className="text-[36px] font-bold tracking-[-0.5px] text-[#111827] mb-2 leading-tight">
                    Welcome back!
                  </h1>
                  <p className="text-[14px] text-[#6B7280] max-w-[300px]">
                    Sign in to continue your study abroad journey with RIBRIZ.
                  </p>
                </div>

                <form onSubmit={sendOTP} className="space-y-3">
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    className={inputCls}
                    autoFocus
                  />

                  {error && <ErrorMsg msg={error} />}

                  <button type="submit" disabled={loading} className={btnCls + " mt-2"}>
                    {loading
                      ? <Loader2 size={16} className="animate-spin" />
                      : <><span>Continue</span><ArrowRight size={14} /></>}
                  </button>
                </form>

                <p className="text-center text-[14px] text-[#6B7280] mt-8">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Create one
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ── Step 2: OTP ── */}
            {step === "otp" && (
              <motion.div
                key="otp" custom={dir} variants={stepVars}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
              >
                <BackBtn onClick={() => { setDir(-1); setStep("email"); setError(""); setOtp(Array(6).fill("")); }} />

                <div className="mb-8">
                  <h1 className="text-[34px] font-bold tracking-[-0.5px] text-[#111827] mb-2 leading-tight">
                    Check your inbox
                  </h1>
                  <p className="text-[15px] text-[#6B7280]">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-[#111827]">{email}</span>.{" "}
                    Check spam too.
                  </p>
                </div>

                <form onSubmit={verifyOTP} className="space-y-4">
                  <div className="space-y-3">
                    {/* OTP — 3+3 grouped */}
                    <motion.div
                      className="flex items-center gap-2"
                      animate={shake ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }}
                      transition={{ duration: 0.38, ease: "easeOut" }}
                    >
                      <div className="flex gap-2 flex-1">
                        {otp.slice(0, 3).map((d, i) => (
                          <OTPBox key={i} digit={d} i={i} refs={refs} onChange={otpChange} onKeyDown={otpKey} onPaste={otpPaste} hasError={!!error} />
                        ))}
                      </div>
                      <span className="w-5 h-[2px] rounded-full bg-[#D1D5DB] shrink-0" />
                      <div className="flex gap-2 flex-1">
                        {otp.slice(3).map((d, i) => (
                          <OTPBox key={i + 3} digit={d} i={i + 3} refs={refs} onChange={otpChange} onKeyDown={otpKey} onPaste={otpPaste} hasError={!!error} />
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {error && <ErrorMsg msg={error} />}

                  <button type="submit" disabled={loading || otpStr.length !== 6} className={btnCls + " mt-2"}>
                    {loading
                      ? <Loader2 size={16} className="animate-spin" />
                      : <><span>Verify &amp; Sign In</span><ArrowRight size={14} /></>}
                  </button>

                  <button
                    type="button"
                    onClick={() => sendOTP()}
                    disabled={loading}
                    className="w-full text-[13px] text-[#6B7280] hover:text-primary font-medium py-1 transition-colors disabled:cursor-not-allowed text-center"
                  >
                    {loading
                      ? <span className="flex items-center justify-center gap-1.5"><Loader2 size={12} className="animate-spin" />Sending...</span>
                      : "Didn't receive it? Resend code"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
