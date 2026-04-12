"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { User, CreditCard, Bell, Shield, Check, Loader2, Crown, Zap, Users, RefreshCw, Sparkles, Star, AlertTriangle, TrendingUp, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CREDIT_BUNDLES, PLAN_CONFIG } from "@/lib/subscription/plans";

type Tab = "account" | "subscription" | "notifications" | "privacy";

interface UserProfile {
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
}

const CREDIT_COSTS = [
  { label: "University match", cost: 5, icon: "🎓" },
  { label: "Riz AI message", cost: 1, icon: "💬" },
  { label: "SOP draft", cost: 10, icon: "📝" },
  { label: "Scholarship scan", cost: 5, icon: "🏆" },
];

function tierDisplayName(tier: string): string {
  const map: Record<string, string> = {
    free: "Free", explorer: "Legacy", pro: "Legacy",
    basic: "Basic", premium: "Premium", elite: "Elite",
  };
  return map[tier] ?? tier;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "account";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const fetchCredits = useCallback(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => { if (typeof d.credits === "number") setCredits(d.credits); });
  }, []);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile({
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone,
            city: data.user.city,
            subscriptionTier: data.user.subscriptionTier,
            subscriptionExpiresAt: data.user.subscriptionExpiresAt ?? null,
          });
        }
      })
      .finally(() => setLoading(false));
    fetchCredits();
  }, [fetchCredits]);

  const verifyAndActivate = useCallback(async (
    response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string },
    type: "credits" | "plan"
  ) => {
    setActivating(true);
    try {
      // 1. Try immediate server-side verification
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      if (res.ok) {
        const data = await res.json() as { ok: boolean; tier?: string; expiresAt?: string };
        fetchCredits();
        if (type === "plan" && data.tier) {
          setProfile((prev) => prev ? {
            ...prev,
            subscriptionTier: data.tier!,
            subscriptionExpiresAt: data.expiresAt ?? null,
          } : prev);
        }
        setActivating(false);
        return;
      }
    } catch { /* fall through to polling */ }

    // 2. Fallback: poll status endpoint (webhook backup)
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const r = await fetch(`/api/subscription/status?orderId=${response.razorpay_order_id}`);
        const data = await r.json() as { status: string; tier?: string; expiresAt?: string | null };
        if (data.status === "paid") {
          clearInterval(poll);
          fetchCredits();
          if (type === "plan" && data.tier) {
            setProfile((prev) => prev ? {
              ...prev,
              subscriptionTier: data.tier!,
              subscriptionExpiresAt: data.expiresAt ?? null,
            } : prev);
          }
          setActivating(false);
        } else if (attempts >= 15) {
          clearInterval(poll);
          setActivating(false);
        }
      } catch {
        if (attempts >= 15) { clearInterval(poll); setActivating(false); }
      }
    }, 2000);
  }, [fetchCredits]);

  const openRazorpay = useCallback((
    orderData: { orderId: string; amount: number; currency: string; planName?: string; bundleName?: string; keyId: string; notes: Record<string, unknown> },
    type: "credits" | "plan"
  ) => {
    const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
    if (!win?.Razorpay) { alert("Razorpay not loaded. Please refresh."); return; }
    const RazorpayConstructor = win.Razorpay as new (opts: Record<string, unknown>) => { open: () => void };
    const rzp = new RazorpayConstructor({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "RIBRIZ Overseas",
      description: orderData.planName ?? orderData.bundleName ?? "",
      order_id: orderData.orderId,
      prefill: { name: profile?.name, email: profile?.email },
      notes: orderData.notes,
      theme: { color: "#3525cd" },
      handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) =>
        verifyAndActivate(response, type),
    });
    rzp.open();
  }, [profile, verifyAndActivate]);

  const handleCreditPurchase = async (bundleId: string) => {
    setPurchasing(bundleId);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: bundleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      openRazorpay({ ...data, bundleName: data.bundleName }, "credits");
    } catch (err) { console.error(err); }
    finally { setPurchasing(null); }
  };

  const handlePlanPurchase = async (planId: string) => {
    if (planId === profile?.subscriptionTier) return;
    setPurchasing(planId);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      openRazorpay({ ...data, planName: data.planName }, "plan");
    } catch (err) { console.error(err); }
    finally { setPurchasing(null); }
  };

  const tabs: { id: Tab; icon: typeof User; label: string }[] = [
    { id: "account", icon: User, label: "Account" },
    { id: "subscription", icon: CreditCard, label: "Plans & Credits" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "privacy", icon: Shield, label: "Privacy" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      <h2 className="text-3xl font-black tracking-tight text-on-surface font-headline">Settings</h2>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-surface-container-low/60 p-1 rounded-xl border border-outline-variant/15 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === t.id
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <t.icon size={14} strokeWidth={1.8} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Account ─────────────────────────────────────────────── */}
      {tab === "account" && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 editorial-shadow p-7 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-outline">Account Details</h3>
          {loading ? (
            <Loader2 size={20} className="animate-spin text-primary" />
          ) : profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: "Full Name", value: profile.name },
                { label: "Email", value: profile.email },
                { label: "Phone", value: profile.phone || "Not set" },
                { label: "City", value: profile.city || "Not set" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline">{f.label}</label>
                  <p className="text-sm font-semibold text-on-surface mt-1">{f.value}</p>
                </div>
              ))}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline">Plan</label>
                <p className="text-sm font-semibold text-on-surface mt-1 flex items-center gap-2">
                  {tierDisplayName(profile.subscriptionTier)}
                  {["basic","premium","elite"].includes(profile.subscriptionTier) && <Crown size={13} className="text-amber-500" />}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline">Credits</label>
                <p className="text-sm font-semibold text-primary mt-1 flex items-center gap-1.5">
                  <Zap size={12} className="text-primary" />
                  {credits !== null ? credits.toLocaleString() : "—"} credits
                </p>
              </div>
              {profile.subscriptionExpiresAt && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline">Plan Expires</label>
                  <p className="text-sm font-semibold text-on-surface mt-1">
                    {new Date(profile.subscriptionExpiresAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant font-medium">Complete onboarding to see your account details.</p>
          )}
          <a href="/onboarding" className="inline-block text-sm font-semibold text-primary hover:underline">
            Edit Profile →
          </a>
        </div>
      )}

      {/* ── Plans & Credits ──────────────────────────────────────── */}
      {tab === "subscription" && (
        <div className="space-y-10">

          {activating && (
            <div className="flex items-center gap-3 p-4 bg-primary/[0.05] border border-primary/20 rounded-xl">
              <Loader2 size={15} className="animate-spin text-primary shrink-0" />
              <p className="text-sm font-semibold text-primary">Activating your purchase…</p>
            </div>
          )}

          {/* ════════ CONVICTION BANNER ════════ */}
          <div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant/15 rounded-xl editorial-shadow p-6">
            <div className="absolute inset-0 pointer-events-none opacity-40"
              style={{ background: "radial-gradient(ellipse at top right, rgba(53,37,205,0.08) 0%, transparent 70%)" }} />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex -space-x-1">
                    {["🇺🇸","🇬🇧","🇨🇦","🇩🇪","🇦🇺"].map((flag) => (
                      <span key={flag} className="text-sm">{flag}</span>
                    ))}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">847 students admitted this year</span>
                </div>
                <h3 className="text-lg font-black text-on-surface font-headline leading-snug mb-1.5">
                  Your education abroad costs ₹50L+.{" "}
                  <span className="text-primary">Your admission partner: ₹30K.</span>
                </h3>
                <p className="text-[12px] text-on-surface-variant font-medium leading-relaxed">
                  Less than <strong className="text-on-surface">0.06%</strong> of your total investment.
                  Students with consultant support got into{" "}
                  <strong className="text-on-surface">3.4× more programs</strong> on average.
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400">{[1,2,3,4,5].map((i) => <Star key={i} size={11} fill="currentColor" />)}</div>
                  <span className="text-xs font-bold text-on-surface">4.9/5</span>
                  <span className="text-[10px] text-on-surface-variant">(312 reviews)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                  <TrendingUp size={12} className="text-emerald-500" />
                  <span><strong className="text-on-surface">94%</strong> visa success rate</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                  <Users size={12} className="text-primary" />
                  <span><strong className="text-on-surface">47</strong> students upgraded this week</span>
                </div>
              </div>
            </div>
          </div>

          {/* ════════ INTAKE URGENCY ════════ */}
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl border text-sm font-semibold"
            style={{ background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" }}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              <strong>April 2026 intake is closing fast.</strong>{" "}
              University deadlines typically fall October–January. Starting with a consultant before the rush
              improves shortlisting quality significantly. <strong>Don&apos;t wait.</strong>
            </span>
          </div>

          {/* ════════ FREE VS PAID STRIP ════════ */}
          {profile?.subscriptionTier === "free" && (
            <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl overflow-hidden editorial-shadow">
              <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center gap-2">
                <Lock size={13} className="text-on-surface-variant" />
                <h4 className="text-xs font-black uppercase tracking-widest text-outline">What your Free plan doesn&apos;t include</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/10">
                <div className="p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-3">Free plan</p>
                  {[
                    "AI matching (12% of programs only)",
                    "No human document review",
                    "No SOP or LOR editing",
                    "No consultant assigned",
                    "No visa guidance",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-[11px] text-on-surface-variant/60 font-medium">
                      <Lock size={9} className="shrink-0 text-on-surface-variant/30" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Any paid plan</p>
                  {[
                    "Full program database, ranked for you",
                    "Expert document review & enhancement",
                    "Human-edited SOP + LOR feedback",
                    "Dedicated consultant on your file",
                    "Step-by-step visa support",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
                      <Check size={9} className="shrink-0 text-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════ CREDITS ════════ */}
          <section className="space-y-6">

            {/* Section header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="material-symbols-outlined leading-none text-primary"
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
                  >bolt</span>
                  <h3 className="text-base font-black text-on-surface font-headline">Credits</h3>
                  <span className="badge-primary">Pay-as-you-go</span>
                </div>
                <p className="text-xs text-on-surface-variant font-medium">
                  Buy credits and spend them on any AI feature — no plan needed.
                </p>
              </div>

              {/* Live balance */}
              <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-primary/[0.06] border border-primary/15 rounded-xl">
                <span
                  className="material-symbols-outlined leading-none text-primary"
                  style={{ fontSize: 16, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
                >bolt</span>
                <span className="text-lg font-black text-primary font-headline">
                  {credits !== null ? credits.toLocaleString() : "—"}
                </span>
                <span className="text-[11px] font-semibold text-on-surface-variant">credits</span>
                <button onClick={fetchCredits} className="ml-1 p-1 rounded hover:bg-primary/10 transition-colors" title="Refresh">
                  <RefreshCw size={11} className="text-on-surface-variant" />
                </button>
              </div>
            </div>

            {/* Credit cost pills */}
            <div className="flex flex-wrap gap-2">
              {CREDIT_COSTS.map((item) => (
                <div key={item.label}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant/15 rounded-lg"
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="text-xs font-black text-primary">{item.cost}cr</span>
                  <span className="text-xs text-on-surface-variant font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Bundle cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.values(CREDIT_BUNDLES).map((bundle) => {
                const isPopular = bundle.popular;
                return (
                  <div key={bundle.id}
                    className={cn(
                      "relative rounded-xl overflow-hidden flex flex-col",
                      isPopular
                        ? "p-px"
                        : "border border-outline-variant/15 bg-surface-container-lowest editorial-shadow"
                    )}
                    style={isPopular ? {
                      background: "linear-gradient(135deg, #3525cd, #4f46e5, #7c74f0)"
                    } : undefined}
                  >
                    {/* Inner content (for gradient border card) */}
                    <div className={cn(
                      "flex flex-col h-full p-5",
                      isPopular
                        ? "rounded-[11px] bg-surface-container-lowest"
                        : ""
                    )}>
                      {isPopular && (
                        <div className="flex justify-between items-start mb-3">
                          <span className="badge-primary">Best Value</span>
                          <Sparkles size={13} className="text-primary" />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-4xl font-black text-on-surface font-headline">{bundle.credits}</span>
                          <span className="text-sm font-bold text-on-surface-variant">cr</span>
                        </div>
                        <div className="flex items-baseline gap-1 mt-3">
                          <span className="text-xl font-black text-on-surface font-headline">{bundle.priceDisplay}</span>
                          <span className="text-[10px] font-semibold text-on-surface-variant/60">+GST</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant/50 font-medium mt-0.5">{bundle.totalDisplay}</p>
                        <p className="text-[11px] font-bold text-primary mt-2">
                          ₹{Math.round(bundle.basePrice / bundle.credits)}/credit
                        </p>
                      </div>

                      <button
                        onClick={() => handleCreditPurchase(bundle.id)}
                        disabled={!!purchasing || activating}
                        className={cn(
                          "mt-4 w-full py-2.5 text-sm font-bold transition-all rounded-md",
                          isPopular ? "btn-primary" : "btn-secondary"
                        )}
                      >
                        {purchasing === bundle.id
                          ? <Loader2 size={15} className="animate-spin mx-auto" />
                          : "Recharge"
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-on-surface-variant/40 font-medium">
              All prices exclude 18% GST · Minimum recharge ₹3,599
            </p>
          </section>

          {/* ════════ CONSULTANT PLANS ════════ */}
          <section className="space-y-6">

            {/* Section header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users size={15} className="text-primary" />
                <h3 className="text-base font-black text-on-surface font-headline">Consultant Plans</h3>
                <span className="badge-primary">60 days</span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium">
                Human-led admission support with credits included. Expert consultant assigned to your file.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {Object.entries(PLAN_CONFIG).map(([id, plan]) => {
                const isCurrent = profile?.subscriptionTier === plan.tier;
                const isPopular = plan.popular;
                const socialData: Record<string, { weeklyBuyers: number; seatsLeft: number; vsStandalone: string; outcome: string }> = {
                  basic:   { weeklyBuyers: 12, seatsLeft: 14, vsStandalone: "₹60K+", outcome: "2.1x" },
                  premium: { weeklyBuyers: 34, seatsLeft: 8,  vsStandalone: "₹80K+", outcome: "3.4x" },
                  elite:   { weeklyBuyers: 9,  seatsLeft: 4,  vsStandalone: "₹1.2L+", outcome: "4.8x" },
                };
                const social = socialData[id];

                return (
                  <div key={id}
                    className={cn(
                      "relative flex flex-col rounded-xl overflow-hidden",
                      isPopular ? "p-px" : "border border-outline-variant/15 editorial-shadow bg-surface-container-lowest"
                    )}
                    style={isPopular ? {
                      background: "linear-gradient(135deg, #3525cd, #4f46e5, #7c74f0)"
                    } : undefined}
                  >
                    <div className={cn(
                      "flex flex-col h-full p-6",
                      isPopular ? "rounded-[11px] bg-surface-container-lowest" : ""
                    )}>

                      {/* Plan badge + icon */}
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          {plan.badge && <span className="badge-primary mb-1.5 block w-fit">{plan.badge}</span>}
                          <h4 className="text-base font-black text-on-surface font-headline">{plan.name}</h4>
                          <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{plan.tagline}</p>
                        </div>
                        {id === "elite" && <Star size={16} className="text-amber-500 fill-amber-500 shrink-0" />}
                        {id === "premium" && <Sparkles size={16} className="text-primary shrink-0" />}
                        {id === "basic" && <Users size={16} className="text-on-surface-variant shrink-0" />}
                      </div>

                      {/* Social proof: weekly buyers */}
                      <div className="flex items-center gap-1.5 mb-3 mt-1">
                        <Users size={10} className="text-primary" />
                        <span className="text-[10px] font-bold text-primary">
                          {social.weeklyBuyers} students chose this plan this week
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mb-3 pb-3 border-b border-outline-variant/10">
                        <div className="flex items-baseline gap-1">
                          <span className={cn("text-3xl font-black font-headline", isPopular ? "text-gradient" : "text-on-surface")}>
                            {plan.priceDisplay}
                          </span>
                          <span className="text-[10px] font-semibold text-on-surface-variant/50">+GST</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant/40 font-medium mt-0.5">{plan.totalDisplay}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-md">
                            60 days
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-primary">
                            <span
                              className="material-symbols-outlined leading-none"
                              style={{ fontSize: 11, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
                            >bolt</span>
                            {plan.includedCredits} credits
                          </span>
                        </div>
                        {/* Savings anchor vs standalone */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-on-surface-variant/40 line-through font-medium">
                            {social.vsStandalone} standalone counselor
                          </span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Save big
                          </span>
                        </div>
                      </div>

                      {/* Scarcity */}
                      {social.seatsLeft <= 10 && !isCurrent && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md mb-3 text-[10px] font-bold"
                          style={{ background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e", border: "1px solid" }}>
                          <AlertTriangle size={10} className="shrink-0" />
                          Only {social.seatsLeft} consultant slots left for this intake
                        </div>
                      )}

                      {/* Features */}
                      <ul className="space-y-2 flex-1 mb-3">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[12px] text-on-surface-variant font-medium leading-relaxed">
                            <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* Outcome claim */}
                      {!isCurrent && (
                        <div className="mb-3 text-[10px] font-bold text-on-surface-variant bg-primary/[0.04] border border-primary/10 rounded-lg px-3 py-2">
                          Students on {plan.name} got into <span className="text-primary">{social.outcome} more programs</span> on avg
                        </div>
                      )}

                      <button
                        onClick={() => handlePlanPurchase(id)}
                        disabled={isCurrent || !!purchasing || activating}
                        className={cn(
                          "w-full py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2",
                          isCurrent
                            ? "bg-surface-container-low text-on-surface-variant cursor-default"
                            : isPopular
                            ? "btn-primary"
                            : "btn-secondary"
                        )}
                      >
                        {purchasing === id
                          ? <Loader2 size={15} className="animate-spin" />
                          : isCurrent ? "Active Plan" : `Get ${plan.name}`
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-on-surface-variant/40 text-center font-medium">
              Payments via Razorpay · All plan prices exclude 18% GST · Not a recurring subscription
            </p>
          </section>
        </div>
      )}

      {/* ── Notifications ────────────────────────────────────────── */}
      {tab === "notifications" && <NotificationPreferences />}

      {/* ── Privacy ─────────────────────────────────────────────── */}
      {tab === "privacy" && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 editorial-shadow p-7 space-y-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-outline">Privacy & Data</h3>
          <div className="space-y-3">
            <div className="p-4 bg-surface-container-low/60 rounded-xl border border-outline-variant/10">
              <p className="text-sm font-bold text-on-surface">Export your data</p>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Download a copy of all your profile data, applications, and documents.</p>
              <button className="mt-3 text-xs font-semibold text-primary hover:underline">Request Data Export</button>
            </div>
            <div className="p-4 bg-error/[0.03] rounded-xl border border-error/10">
              <p className="text-sm font-bold text-error">Delete account</p>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Permanently delete your account and all associated data. This cannot be undone.</p>
              <button className="mt-3 text-xs font-semibold text-error hover:underline">Delete My Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const notifItems = [
  { key: "deadlineReminders", label: "Deadline reminders", desc: "Reminders 30, 14, and 3 days before application deadlines" },
  { key: "statusUpdates", label: "Application status updates", desc: "Email notifications when application statuses change" },
  { key: "newMatches", label: "New university matches", desc: "Notify when new programs matching your profile are added" },
  { key: "productUpdates", label: "Product updates", desc: "Occasional updates about new RIBRIZ features" },
];

function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    deadlineReminders: true, statusUpdates: true,
    newMatches: false, productUpdates: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/user/notifications")
      .then((r) => r.json())
      .then((data) => { if (data.preferences) setPrefs(data.preferences); })
      .finally(() => setLoaded(true));
  }, []);

  const toggle = async (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await fetch("/api/user/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 editorial-shadow p-7 space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-outline">Notifications</h3>
      {!loaded ? (
        <Loader2 size={20} className="animate-spin text-primary" />
      ) : (
        notifItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-surface-container-low/40 rounded-xl border border-outline-variant/[0.06]">
            <div>
              <p className="text-sm font-bold text-on-surface">{item.label}</p>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={cn("toggle-track", prefs[item.key] ? "toggle-track-active" : "toggle-track-inactive")}
            >
              <div className={cn("toggle-thumb", prefs[item.key] ? "left-[calc(100%-1.375rem)]" : "left-[0.1875rem]")} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
