"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check, GraduationCap, BarChart3, FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

type Step = "personal" | "details" | "whatsapp" | "whatsapp-otp" | "email" | "email-otp";
type Education = "12th" | "bachelor" | "masters";

const progressMap: Record<Step, number> = {
  personal: 0, details: 1, whatsapp: 2, "whatsapp-otp": 2, email: 3, "email-otp": 3,
};

const educationOptions: { value: Education; label: string; sublabel: string }[] = [
  { value: "12th", label: "12th Grade", sublabel: "Higher Secondary" },
  { value: "bachelor", label: "Bachelor's", sublabel: "Undergraduate" },
  { value: "masters", label: "Master's", sublabel: "Postgraduate" },
];

const FEATURES = [
  { icon: GraduationCap, text: "AI university matching" },
  { icon: BarChart3, text: "Admission chance predictor" },
  { icon: FileText, text: "SOP auto-generator" },
];

const DESTS = [
  { f: "🇬🇧", n: "UK" }, { f: "🇨🇦", n: "Canada" }, { f: "🇦🇺", n: "Australia" },
  { f: "🇩🇪", n: "Germany" }, { f: "🇺🇸", n: "USA" },
];

const COUNTRY_CODES = [
  { code: "91", label: "🇮🇳 +91", name: "India" },
  { code: "1", label: "🇺🇸 +1", name: "USA / Canada" },
  { code: "44", label: "🇬🇧 +44", name: "UK" },
  { code: "61", label: "🇦🇺 +61", name: "Australia" },
  { code: "49", label: "🇩🇪 +49", name: "Germany" },
  { code: "971", label: "🇦🇪 +971", name: "UAE" },
  { code: "65", label: "🇸🇬 +65", name: "Singapore" },
  { code: "60", label: "🇲🇾 +60", name: "Malaysia" },
  { code: "94", label: "🇱🇰 +94", name: "Sri Lanka" },
  { code: "977", label: "🇳🇵 +977", name: "Nepal" },
  { code: "880", label: "🇧🇩 +880", name: "Bangladesh" },
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
        className={`w-full h-[56px] text-center text-[22px] font-semibold caret-transparent rounded-[12px] border transition-all duration-150 focus:outline-none ${
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

// ── OTP Row ───────────────────────────────────────────────

function OTPRow({
  otp, refs, shake, error, onChange, onKeyDown, onPaste,
}: {
  otp: string[];
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  shake: boolean;
  error: string;
  onChange: (i: number, v: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
}) {
  return (
    <motion.div
      className="flex items-center gap-2"
      animate={shake ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
    >
      <div className="flex gap-2 flex-1">
        {otp.slice(0, 3).map((d, i) => (
          <OTPBox key={i} digit={d} i={i} refs={refs} onChange={onChange} onKeyDown={onKeyDown} onPaste={onPaste} hasError={!!error} />
        ))}
      </div>
      <span className="w-5 h-[2px] rounded-full bg-[#D1D5DB] shrink-0" />
      <div className="flex gap-2 flex-1">
        {otp.slice(3).map((d, i) => (
          <OTPBox key={i + 3} digit={d} i={i + 3} refs={refs} onChange={onChange} onKeyDown={onKeyDown} onPaste={onPaste} hasError={!!error} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Step animation ────────────────────────────────────────

const stepVars = {
  enter: (d: number) => ({ x: d * 24, opacity: 0, filter: "blur(3px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (d: number) => ({ x: d * -24, opacity: 0, filter: "blur(3px)" }),
};

// ── Step Progress ─────────────────────────────────────────

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {[0, 1, 2, 3].map((i) => {
        const done = current > i;
        const active = current === i;
        return (
          <div key={i} className={`flex items-center ${i < 3 ? "flex-1" : ""}`}>
            <motion.div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-colors duration-300 ${
                done
                  ? "bg-primary text-white"
                  : active
                  ? "border-2 border-primary text-primary bg-white"
                  : "border-2 border-[#E5E7EB] text-[#9CA3AF] bg-white"
              }`}
              animate={{ scale: active ? [1, 1.06, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              {done ? <Check size={11} /> : i + 1}
            </motion.div>
            {i < 3 && (
              <motion.div
                className="flex-1 h-[1.5px] mx-1.5"
                animate={{ backgroundColor: i < current ? "#3525cd" : "#E5E7EB" }}
                transition={{ duration: 0.4 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Back button ───────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280] hover:text-[#111827] transition-colors mb-5 group"
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

// ── Phone Input with Country Code ─────────────────────────

function PhoneInput({
  countryCode, phone,
  onCountryChange, onPhoneChange,
  autoFocus,
}: {
  countryCode: string;
  phone: string;
  onCountryChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center w-full rounded-full border border-[#E2E4E9] bg-white focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/[0.07] transition-all duration-200 overflow-hidden">
      <div className="relative flex items-center shrink-0 border-r border-[#E2E4E9]">
        <select
          value={countryCode}
          onChange={e => onCountryChange(e.target.value)}
          className="appearance-none pl-4 pr-7 py-[13px] text-[15px] text-[#111827] bg-transparent focus:outline-none cursor-pointer"
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.label} — {c.name}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 text-[#9CA3AF] pointer-events-none" />
      </div>
      <input
        type="tel"
        value={phone}
        onChange={e => onPhoneChange(e.target.value.replace(/\D/g, ""))}
        placeholder="WhatsApp number"
        autoFocus={autoFocus}
        autoComplete="tel"
        className="flex-1 min-w-0 px-4 py-[13px] text-[15px] text-[#111827] placeholder:text-[#9CA3AF] bg-transparent focus:outline-none"
      />
    </div>
  );
}

// ── Signup Page ───────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("personal");
  const [dir, setDir] = useState(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [education, setEducation] = useState<Education | "">("");
  const [countryCode, setCountryCode] = useState("91");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [waOtp, setWaOtp] = useState(Array(6).fill(""));
  const waRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const progressIndex = progressMap[step];
  const otpStr = otp.join("");
  const waOtpStr = waOtp.join("");
  const maxDob = new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const fullPhone = countryCode + phone.trim();

  const makeOtpHandlers = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refsObj: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => ({
    onChange: (i: number, v: string) => {
      const d = v.replace(/\D/g, "").slice(-1);
      setter(o => { const n = [...o]; n[i] = d; return n; });
      setError("");
      if (d && i < 5) refsObj.current[i + 1]?.focus();
    },
    onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        setter(o => {
          if (o[i]) { const n = [...o]; n[i] = ""; return n; }
          if (i > 0) { refsObj.current[i - 1]?.focus(); const n = [...o]; n[i - 1] = ""; return n; }
          return o;
        });
      }
    },
    onPaste: (e: React.ClipboardEvent) => {
      const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!p.length) return;
      e.preventDefault();
      const next = [...p.split(""), ...Array(6).fill("")].slice(0, 6);
      setter(next);
      const f = next.findIndex(d => !d);
      refsObj.current[f === -1 ? 5 : f]?.focus();
    },
  });

  const emailHandlers = makeOtpHandlers(setOtp, refs);
  const waHandlers = makeOtpHandlers(setWaOtp, waRefs);

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
        console.error(`Non-JSON from ${url}:`, res.status, await res.text());
        return { ok: false, data: { error: "Server error. Please try again." } };
      }
      const data = await res.json();
      return { ok: res.ok, data };
    } catch (err) {
      const to = err instanceof DOMException && err.name === "AbortError";
      return { ok: false, data: { error: to ? "Request timed out. Please try again." : "Something went wrong. Please try again." } };
    } finally { clearTimeout(t); }
  };

  const goNext = (next: Step) => { setDir(1); setError(""); setStep(next); };
  const goBack = (prev: Step) => { setDir(-1); setError(""); setStep(prev); };

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handlePersonalNext = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { setError("Please enter your first and last name."); return; }
    if (!dob) { setError("Please enter your date of birth."); return; }
    goNext("details");
  };

  const handleDetailsNext = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!city.trim()) { setError("Please enter your city."); return; }
    if (!education) { setError("Please select your current education level."); return; }
    goNext("whatsapp");
  };

  const handleSendWaOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!phone.trim()) { goNext("email"); return; }
    if (phone.trim().length < 7) { setError("Please enter a valid phone number."); return; }
    setError("");
    setWaOtp(Array(6).fill(""));
    setLoading(true);
    try {
      const { ok, data } = await post("/api/auth/whatsapp/send", {
        phone: fullPhone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob, city: city.trim(), education,
      });
      if (!ok) setError(data.error || "Failed to send OTP. Please try again.");
      else goNext("whatsapp-otp");
    } finally { setLoading(false); }
  };

  const handleVerifyWaOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await post("/api/auth/whatsapp/verify", { otp: waOtpStr });
      if (!ok) {
        setError(data.error || "Incorrect code. Please try again.");
        triggerShake();
        return;
      }
      goNext("email");
    } finally { setLoading(false); }
  };

  const handleSendEmailOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setOtp(Array(6).fill(""));
    setLoading(true);
    try {
      const { ok, data } = await post("/api/auth/otp/send", {
        email, type: "signup",
        name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim() ? fullPhone : "",
        dob, city: city.trim(), education,
      });
      if (!ok) setError(data.error || "Failed to send verification code.");
      else goNext("email-otp");
    } finally { setLoading(false); }
  };

  const handleVerifyEmailOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await post("/api/auth/otp/verify", { otp: otpStr });
      if (!ok) {
        setError(data.error || "Verification failed. Please try again.");
        triggerShake();
        return;
      }
      router.push(data.redirect ?? "/onboarding");
      router.refresh();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">

      {/* ══ Left: Brand Panel ══ */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden" style={{ background: "#060912" }}>

        <motion.div
          className="absolute -top-28 -left-24 w-[540px] h-[540px] pointer-events-none rounded-full"
          style={{ background: "radial-gradient(circle, rgba(53,37,205,0.32) 0%, transparent 65%)", filter: "blur(55px)" }}
          animate={{ x: [-40, 55, -40], y: [-25, 40, -25], scale: [1, 1.12, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-16 w-[460px] h-[460px] pointer-events-none rounded-full"
          style={{ background: "radial-gradient(circle, rgba(79,70,229,0.22) 0%, transparent 65%)", filter: "blur(65px)" }}
          animate={{ x: [24, -44, 24], y: [24, -38, 24], scale: [1, 1.09, 1] }}
          transition={{ duration: 27, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
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

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            <div
              className="w-9 h-9 flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #3525cd, #5040e8)", borderRadius: "10px", boxShadow: "0 4px 16px rgba(53,37,205,0.5)" }}
            >
              R
            </div>
            <span className="text-[18px] font-semibold tracking-tight text-white">RIBRIZ</span>
          </motion.div>

          <div>
            <motion.div
              className="inline-flex items-center gap-2 mb-6 px-3 py-1.5"
              style={{ background: "rgba(255,255,255,0.06)", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.1)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>Free to start · No credit card</span>
            </motion.div>

            <motion.h2
              className="text-[50px] font-bold tracking-[-1.5px] leading-[1.02] mb-5 text-white"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            >
              Start your
              <br />
              journey{" "}
              <span style={{ background: "linear-gradient(130deg, #c4bcff 0%, #8b7ff5 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                today.
              </span>
            </motion.h2>

            <motion.p
              className="text-[15px] leading-relaxed mb-10 max-w-[285px]"
              style={{ color: "rgba(255,255,255,0.36)" }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            >
              The self-serve admissions platform built for ambitious students going abroad.
            </motion.p>

            <motion.div className="space-y-3.5 mb-10">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.text}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                  >
                    <div
                      className="w-7 h-7 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px" }}
                    >
                      <Icon size={13} style={{ color: "#a99ef5" }} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{f.text}</span>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div className="flex gap-2 flex-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
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
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.06 }}
                >
                  {d.f} {d.n}
                </motion.span>
              ))}
            </motion.div>
          </div>

          <motion.p
            className="text-[11px] font-medium"
            style={{ color: "rgba(255,255,255,0.16)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          >
            Free to start · No credit card required
          </motion.p>
        </div>
      </div>

      {/* ══ Right: Form Panel ══ */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative bg-white">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 15%, rgba(53,37,205,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 85%, rgba(79,70,229,0.02) 0%, transparent 50%)" }}
        />

        <div className="relative w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div
              className="w-8 h-8 flex items-center justify-center text-white font-bold text-xs"
              style={{ background: "linear-gradient(135deg, #3525cd, #5040e8)", borderRadius: "8px" }}
            >R</div>
            <span className="text-[17px] font-semibold tracking-tight text-[#111827]">RIBRIZ</span>
          </div>

          {/* Progress */}
          <StepProgress current={progressIndex} />

          <AnimatePresence mode="wait" custom={dir}>

            {/* ── Step 1: Personal ── */}
            {step === "personal" && (
              <motion.div key="personal" custom={dir} variants={stepVars} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}>
                <div className="mb-6">
                  <h1 className="text-[34px] font-bold tracking-[-0.5px] text-[#111827] mb-1.5 leading-tight">Create your account!</h1>
                  <p className="text-[14px] text-[#6B7280]">Start with the basics.</p>
                </div>
                <form onSubmit={handlePersonalNext} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className={inputCls} autoFocus />
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className={inputCls} />
                  </div>
                  <input type="date" required value={dob} onChange={e => setDob(e.target.value)} max={maxDob} className={inputCls} />
                  {error && <ErrorMsg msg={error} />}
                  <button type="submit" className={btnCls + " mt-2"}>
                    <span>Continue</span><ArrowRight size={14} />
                  </button>
                </form>
                <p className="text-center text-[14px] text-[#6B7280] mt-6">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* ── Step 2: Details ── */}
            {step === "details" && (
              <motion.div key="details" custom={dir} variants={stepVars} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}>
                <BackBtn onClick={() => goBack("personal")} />
                <div className="mb-6">
                  <h1 className="text-[32px] font-bold tracking-[-0.5px] text-[#111827] mb-1.5 leading-tight">About you</h1>
                  <p className="text-[14px] text-[#6B7280]">Tell us about your education.</p>
                </div>
                <form onSubmit={handleDetailsNext} className="space-y-3">
                  <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="City" className={inputCls} autoFocus />
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-[#374151] px-1">Current education level</p>
                    <div className="grid grid-cols-3 gap-2">
                      {educationOptions.map(opt => (
                        <motion.button
                          key={opt.value}
                          type="button"
                          onClick={() => setEducation(opt.value)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className={`relative flex flex-col items-center justify-center py-5 px-2 rounded-2xl border text-center transition-all ${
                            education === opt.value
                              ? "border-primary bg-primary/[0.04] text-primary"
                              : "border-[#E2E4E9] bg-white text-[#374151] hover:border-[#D1D5DB]"
                          }`}
                        >
                          {education === opt.value && (
                            <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check size={9} className="text-white" />
                            </div>
                          )}
                          <span className="text-[13px] font-semibold leading-tight">{opt.label}</span>
                          <span className="text-[10px] mt-1 opacity-55 font-medium">{opt.sublabel}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <button type="submit" className={btnCls + " mt-2"}>
                    <span>Continue</span><ArrowRight size={14} />
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 3: WhatsApp ── */}
            {step === "whatsapp" && (
              <motion.div key="whatsapp" custom={dir} variants={stepVars} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}>
                <BackBtn onClick={() => goBack("details")} />
                <div className="mb-6">
                  <h1 className="text-[32px] font-bold tracking-[-0.5px] text-[#111827] mb-1.5 leading-tight">Verify WhatsApp</h1>
                  <p className="text-[14px] text-[#6B7280]">We&apos;ll send you a one-time code to confirm.</p>
                </div>
                <form onSubmit={handleSendWaOTP} className="space-y-3">
                  <div className="space-y-1.5">
                    <PhoneInput
                      countryCode={countryCode}
                      phone={phone}
                      onCountryChange={setCountryCode}
                      onPhoneChange={setPhone}
                      autoFocus
                    />
                    <p className="text-[12px] text-[#9CA3AF] px-1">We&apos;ll send application updates here.</p>
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <button type="submit" disabled={loading} className={btnCls + " mt-2"}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Send OTP</span><ArrowRight size={14} /></>}
                  </button>
                  <button
                    type="button"
                    onClick={() => goNext("email")}
                    className="w-full text-[13px] text-[#6B7280] hover:text-primary font-medium py-1 transition-colors text-center"
                  >
                    Skip for now
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 3b: WhatsApp OTP ── */}
            {step === "whatsapp-otp" && (
              <motion.div key="whatsapp-otp" custom={dir} variants={stepVars} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}>
                <BackBtn onClick={() => { goBack("whatsapp"); setWaOtp(Array(6).fill("")); }} />
                <div className="mb-6">
                  <h1 className="text-[32px] font-bold tracking-[-0.5px] text-[#111827] mb-1.5 leading-tight">Enter the code</h1>
                  <p className="text-[14px] text-[#6B7280]">
                    Sent via WhatsApp to{" "}
                    <span className="font-semibold text-[#111827]">+{fullPhone}</span>.
                  </p>
                </div>
                <form onSubmit={handleVerifyWaOTP} className="space-y-4">
                  <div className="space-y-3">
                    <OTPRow
                      otp={waOtp}
                      refs={waRefs}
                      shake={shake}
                      error={error}
                      onChange={waHandlers.onChange}
                      onKeyDown={waHandlers.onKeyDown}
                      onPaste={waHandlers.onPaste}
                    />
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <button type="submit" disabled={loading || waOtpStr.length !== 6} className={btnCls + " mt-2"}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Verify &amp; Continue</span><ArrowRight size={14} /></>}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWaOTP}
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

            {/* ── Step 4: Email ── */}
            {step === "email" && (
              <motion.div key="email" custom={dir} variants={stepVars} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}>
                <BackBtn onClick={() => goBack("whatsapp")} />
                <div className="mb-6">
                  <h1 className="text-[32px] font-bold tracking-[-0.5px] text-[#111827] mb-1.5 leading-tight">Verify your email</h1>
                  <p className="text-[14px] text-[#6B7280]">Almost there — one last step.</p>
                </div>
                <form onSubmit={handleSendEmailOTP} className="space-y-3">
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className={inputCls} autoFocus autoComplete="email" />
                  {error && <ErrorMsg msg={error} />}
                  <button type="submit" disabled={loading || !email.trim()} className={btnCls + " mt-2"}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Send Verification Code</span><ArrowRight size={14} /></>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 5: Email OTP ── */}
            {step === "email-otp" && (
              <motion.div key="email-otp" custom={dir} variants={stepVars} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}>
                <BackBtn onClick={() => { goBack("email"); setOtp(Array(6).fill("")); }} />
                <div className="mb-6">
                  <h1 className="text-[32px] font-bold tracking-[-0.5px] text-[#111827] mb-1.5 leading-tight">Check your inbox</h1>
                  <p className="text-[14px] text-[#6B7280]">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-[#111827]">{email}</span>.{" "}
                    Check spam too.
                  </p>
                </div>
                <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                  <div className="space-y-3">
                    <OTPRow
                      otp={otp}
                      refs={refs}
                      shake={shake}
                      error={error}
                      onChange={emailHandlers.onChange}
                      onKeyDown={emailHandlers.onKeyDown}
                      onPaste={emailHandlers.onPaste}
                    />
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <button type="submit" disabled={loading || otpStr.length !== 6} className={btnCls + " mt-2"}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Verify &amp; Get Started</span><ArrowRight size={14} /></>}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmailOTP}
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
