"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ArrowLeft, Sparkles, GraduationCap, FileText, BarChart3 } from "lucide-react";

type Step = "form" | "verify";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, type: "signup", name, password }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to send verification code");
    } else {
      setStep("verify");
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Create Prisma User record & send welcome email (fire-and-forget)
    await fetch("/api/user/sync", { method: "POST" }).catch((e) => console.error("User sync failed:", e));
    fetch("/api/email/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    }).catch((e) => console.error("Welcome email failed:", e));

    router.push("/onboarding");
    router.refresh();
  };

  const handleResendOTP = async () => {
    setError("");
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, type: "signup", name, password }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed to resend code");
  };

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  const features = [
    { icon: GraduationCap, text: "Match with 30+ universities" },
    { icon: BarChart3, text: "AI-powered chance calculator" },
    { icon: FileText, text: "Auto-generate your SOP" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] gradient-dark relative overflow-hidden noise-overlay">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/15 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black shadow-lg shadow-primary/30">
              R
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              RIBRIZ
            </span>
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

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-10 lg:hidden">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black shadow-lg shadow-primary/20">
                R
              </div>
              <h1 className="text-2xl font-black tracking-tighter text-on-surface">
                RIBRIZ
              </h1>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-on-surface">
              {step === "form" ? "Create your account" : "Verify your email"}
            </h1>
            <p className="text-on-surface-variant text-sm mt-2 font-medium">
              {step === "form"
                ? "Start matching with universities worldwide"
                : "Enter the verification code to get started"}
            </p>
          </div>

          {/* Card */}
          <div className="surface-elevated rounded-2xl p-7">
            {/* ── Step 1: Signup Form ── */}
            {step === "form" && (
              <>
                {/* Google OAuth */}
                <button
                  onClick={handleGoogleSignup}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-low border border-outline/30 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface hover:border-outline/50 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline/30" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-on-surface-variant font-medium">
                      or sign up with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Arjun Sharma"
                      className="input-premium w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="arjun@example.com"
                      className="input-premium w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
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
                    disabled={loading}
                    className="btn-primary w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Create Account
                  </button>
                </form>
              </>
            )}

            {/* ── Step 2: OTP Verification ── */}
            {step === "verify" && (
              <>
                <button
                  onClick={() => { setStep("form"); setError(""); }}
                  className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-medium mb-6 transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl mb-2">
                    <Mail size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-800">
                      We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your account.
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
                    Verify & Get Started
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="w-full text-xs text-on-surface-variant hover:text-primary font-medium py-2 transition-colors"
                  >
                    Didn&apos;t receive the code? Resend
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
