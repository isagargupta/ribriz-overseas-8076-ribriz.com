"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Mail,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  FileText,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

type Step = "personal" | "details" | "whatsapp" | "email" | "email-otp";
type Education = "12th" | "bachelor" | "masters";

const PROGRESS_STAGES = ["Personal", "Education", "WhatsApp", "Email"] as const;

const progressMap: Record<Step, number> = {
  personal: 0,
  details: 1,
  whatsapp: 2,
  email: 3,
  "email-otp": 3,
};

const educationOptions: { value: Education; label: string; sublabel: string }[] = [
  { value: "12th", label: "12th", sublabel: "Higher Secondary" },
  { value: "bachelor", label: "Bachelor's", sublabel: "Graduation" },
  { value: "masters", label: "Master's", sublabel: "Post-Graduation" },
];

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("personal");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [education, setEducation] = useState<Education | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const progressIndex = progressMap[step];

  // Max DOB: must be at least 13 years old
  const maxDob = new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const postJSON = async (url: string, body: object) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        console.error(`Non-JSON from ${url}:`, res.status, await res.text());
        return { ok: false, data: { error: "Server error. Please try again." } };
      }
      const data = await res.json();
      return { ok: res.ok, data };
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      return {
        ok: false,
        data: {
          error: isTimeout
            ? "Request timed out. Please try again."
            : "Something went wrong. Please try again.",
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  // ── Step 1: Personal Info ──
  const handlePersonalNext = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    setStep("details");
  };

  // ── Step 2: Education + City ──
  const handleDetailsNext = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    if (!city.trim()) {
      setError("Please enter your city.");
      return;
    }
    if (!education) {
      setError("Please select your current education level.");
      return;
    }
    setStep("whatsapp");
  };

  // ── Step 3: WhatsApp number collected — skip verification for now ──
  const handleWhatsappNext = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setStep("email");
  };

  // ── Step 4: Send Email OTP ──
  const handleSendEmailOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await postJSON("/api/auth/otp/send", {
        email,
        type: "signup",
        name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        dob,
        city: city.trim(),
        education,
      });
      if (!ok) {
        setError(data.error || "Failed to send verification code.");
      } else {
        setOtp("");
        setStep("email-otp");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 6: Verify Email OTP ──
  const handleVerifyEmailOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await postJSON("/api/auth/otp/verify", { otp });
      if (!ok) {
        setError(data.error || "Verification failed. Please try again.");
        return;
      }
      router.push(data.redirect ?? "/onboarding");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: GraduationCap, text: "Match with 30+ universities" },
    { icon: BarChart3, text: "AI-powered chance calculator" },
    { icon: FileText, text: "Auto-generate your SOP" },
  ];

  const stepTitles: Record<Step, string> = {
    personal: "Create your account",
    details: "About you",
    whatsapp: "WhatsApp number",
    email: "Verify your email",
    "email-otp": "Verify your email",
  };

  const stepSubtitles: Record<Step, string> = {
    personal: "Let's start with your basics",
    details: "Tell us a bit about your education",
    whatsapp: "Add your WhatsApp number to stay updated",
    email: "Almost there — verify your email to finish",
    "email-otp": `OTP sent to ${email}`,
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Branding Panel ── */}
      <div className="hidden lg:flex lg:w-[45%] gradient-dark relative overflow-hidden noise-overlay">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/15 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black shadow-lg shadow-primary/30">
              R
            </div>
            <span className="text-2xl font-black tracking-tight text-white">RIBRIZ</span>
          </div>
          <div>
            <h2 className="text-5xl font-black text-white tracking-tight leading-[1.1] mb-8">
              Start your
              <br />
              journey <span className="text-primary">today.</span>
            </h2>
            <div className="space-y-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <span className="text-white/50 text-sm font-medium">{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 text-white/20 text-sm font-bold">
            <Sparkles size={14} />
            <span>Free to start, no credit card required</span>
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-10 lg:hidden">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black shadow-lg shadow-primary/20">
                R
              </div>
              <h1 className="text-2xl font-black tracking-tighter text-on-surface">RIBRIZ</h1>
            </div>
          </div>

          {/* ── Progress indicator ── */}
          <div className="flex items-center mb-8">
            {PROGRESS_STAGES.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < progressIndex
                        ? "bg-primary text-white"
                        : i === progressIndex
                        ? "bg-primary text-white ring-4 ring-primary/20"
                        : "bg-on-surface/8 text-on-surface/30"
                    }`}
                  >
                    {i < progressIndex ? <CheckCircle2 size={13} /> : i + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-semibold transition-colors ${
                      i <= progressIndex ? "text-primary" : "text-on-surface/30"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < PROGRESS_STAGES.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 mx-2 mb-[18px] rounded-full transition-colors ${
                      i < progressIndex ? "bg-primary" : "bg-on-surface/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ── Step heading ── */}
          <div className="mb-6">
            <h1 className="text-3xl font-black tracking-tight text-on-surface">
              {stepTitles[step]}
            </h1>
            <p className="text-on-surface-variant text-sm mt-2 font-medium">
              {stepSubtitles[step]}
            </p>
          </div>

          {/* ── Card ── */}
          <div className="surface-elevated rounded-2xl p-7">

            {/* ── STEP 1: Personal Info ── */}
            {step === "personal" && (
              <form onSubmit={handlePersonalNext} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Arjun"
                      className="input-premium w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Sharma"
                      className="input-premium w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    max={maxDob}
                    className="input-premium w-full"
                  />
                </div>

                {error && (
                  <p className="text-sm text-error font-medium bg-error/[0.04] border border-error/10 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                >
                  Continue
                </button>
              </form>
            )}

            {/* ── STEP 2: City + Education ── */}
            {step === "details" && (
              <form onSubmit={handleDetailsNext} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("personal"); setError(""); }}
                  className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-medium mb-2 transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                    className="input-premium w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                    Current Education
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {educationOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEducation(opt.value)}
                        className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 text-center transition-all ${
                          education === opt.value
                            ? "border-primary bg-primary/[0.05] text-primary"
                            : "border-on-surface/10 text-on-surface-variant hover:border-primary/40 hover:text-on-surface"
                        }`}
                      >
                        <span className="text-sm font-bold">{opt.label}</span>
                        <span className="text-[10px] mt-0.5 opacity-70">{opt.sublabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-error font-medium bg-error/[0.04] border border-error/10 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                >
                  Continue
                </button>
              </form>
            )}

            {/* ── STEP 3: WhatsApp Number ── */}
            {step === "whatsapp" && (
              <form onSubmit={handleWhatsappNext} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("details"); setError(""); }}
                  className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-medium mb-2 transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="input-premium w-full"
                    autoComplete="tel"
                  />
                  <p className="text-[11px] text-on-surface-variant ml-1">
                    Optional — we'll use this to send you updates
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-error font-medium bg-error/[0.04] border border-error/10 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
                >
                  Continue
                </button>
              </form>
            )}

            {/* ── STEP 4: Email ── */}
            {step === "email" && (
              <form onSubmit={handleSendEmailOTP} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("whatsapp"); setError(""); }}
                  className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-medium mb-2 transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arjun@example.com"
                    className="input-premium w-full"
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <p className="text-sm text-error font-medium bg-error/[0.04] border border-error/10 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="btn-primary w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Send Verification Code
                </button>
              </form>
            )}

            {/* ── STEP 6: Email OTP Verify ── */}
            {step === "email-otp" && (
              <>
                <button
                  onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                  className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-medium mb-6 transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl mb-2">
                    <Mail size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-800">
                      We sent a 6-digit code to{" "}
                      <strong>{email}</strong>. Check your inbox.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="input-premium w-full text-center text-2xl font-mono tracking-[0.5em]"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-error font-medium bg-error/[0.04] border border-error/10 rounded-xl px-4 py-2.5">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="btn-primary w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Verify &amp; Get Started
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmailOTP}
                    disabled={loading}
                    className="w-full text-xs text-on-surface-variant hover:text-primary font-medium py-2 transition-colors disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Didn't receive the code? Resend"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
