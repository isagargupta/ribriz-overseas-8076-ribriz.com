"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ArrowLeft, Sparkles, GraduationCap, FileText, BarChart3 } from "lucide-react";

type Step = "form" | "verify";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "linkedin" | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (window.location.search.includes("error=auth")) {
      setError("Sign-in failed. Please try again.");
    }
  }, []);

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
        console.error(`Non-JSON response from ${url}:`, res.status, await res.text());
        return { ok: false, data: { error: "Server error. Please try again." } };
      }
      const data = await res.json();
      return { ok: res.ok, data };
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      return { ok: false, data: { error: isTimeout ? "Request timed out. Please try again." : "Something went wrong. Please try again." } };
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleSignup = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await postJSON("/api/auth/otp/send", { email, type: "signup", name });
      if (!ok) {
        setError(data.error || "Failed to send verification code");
      } else {
        setStep("verify");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await postJSON("/api/auth/otp/verify", { otp });
      if (!ok) {
        setError(data.error || "Verification failed");
        return;
      }
      router.push(data.redirect ?? "/onboarding");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    const { ok, data } = await postJSON("/api/auth/otp/send", { email, type: "signup", name });
    if (!ok) setError(data.error || "Failed to resend code");
  };

  const handleGoogleSignup = async () => {
    setOauthLoading("google");
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setOauthLoading(null); }
  };

  const handleLinkedInSignup = async () => {
    setOauthLoading("linkedin");
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setOauthLoading(null); }
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
                {/* Social OAuth */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleGoogleSignup}
                    disabled={oauthLoading !== null}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-low border border-outline/30 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface hover:border-outline/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {oauthLoading === "google" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    )}
                    Google
                  </button>
                  <button
                    onClick={handleLinkedInSignup}
                    disabled={oauthLoading !== null}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-low border border-outline/30 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface hover:border-outline/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {oauthLoading === "linkedin" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    )}
                    LinkedIn
                  </button>
                </div>

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
                    disabled={loading}
                    className="w-full text-xs text-on-surface-variant hover:text-primary font-medium py-2 transition-colors disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Didn&apos;t receive the code? Resend"
                    )}
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
