"use client";

import { useState, useCallback } from "react";
import { Crown, Zap, Star, Sparkles, Users, TrendingUp, Check, Lock, AlertTriangle, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreditContext } from "@/contexts/credits";
import { CREDIT_BUNDLES, PLAN_CONFIG, type CreditBundle, type PlanConfig } from "@/lib/subscription/plans";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

// ── Social proof & scarcity data (marketing copy) ──────────────────────────
const PLAN_SOCIAL: Record<string, { weeklyBuyers: number; seatsLeft: number; vsStandalone: string; outcome: string }> = {
  basic:   { weeklyBuyers: 12, seatsLeft: 14, vsStandalone: "₹60K+", outcome: "2.1x" },
  premium: { weeklyBuyers: 34, seatsLeft: 8,  vsStandalone: "₹80K+", outcome: "3.4x" },
  elite:   { weeklyBuyers: 9,  seatsLeft: 4,  vsStandalone: "₹1.2L+", outcome: "4.8x" },
};

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

function useRazorpay() {
  const { refreshCredits } = useCreditContext();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Verify payment server-side immediately, then refresh credits.
  // Falls back to polling the status endpoint if verify takes too long.
  const verifyAndActivate = useCallback(
    async (response: RazorpayHandlerResponse, localId: string, onDone: () => void) => {
      setConfirmingId(localId);
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        if (res.ok) {
          await refreshCredits();
          onDone();
          return;
        }
      } catch { /* fall through to polling */ }

      // Fallback: poll the status endpoint (webhook may activate it)
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const r = await fetch(`/api/subscription/status?orderId=${response.razorpay_order_id}`);
          if (r.ok) {
            const d = await r.json();
            if (d.status === "paid") {
              await refreshCredits();
              break;
            }
          }
        } catch { /* keep polling */ }
      }
      onDone();
    },
    [refreshCredits]
  );

  const openBundle = useCallback(async (bundleId: string) => {
    setLoadingId(bundleId);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: bundleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (typeof window.Razorpay !== "function") {
        throw new Error("Checkout is not ready yet. Please wait a moment and try again.");
      }
      new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency,
        name: "RIBRIZ Credits",
        description: `${CREDIT_BUNDLES[bundleId]?.credits} Credits`,
        order_id: data.orderId,
        handler: (response: RazorpayHandlerResponse) => {
          setLoadingId(null);
          verifyAndActivate(response, bundleId, () => setConfirmingId(null));
        },
        theme: { color: "#3525cd" },
        modal: { ondismiss: () => setLoadingId(null) },
      }).open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoadingId(null);
    }
  }, [verifyAndActivate]);

  const openPlan = useCallback(async (planId: string) => {
    setLoadingId(planId);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (typeof window.Razorpay !== "function") {
        throw new Error("Checkout is not ready yet. Please wait a moment and try again.");
      }
      new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency,
        name: "RIBRIZ Overseas", description: data.planName,
        order_id: data.orderId,
        handler: (response: RazorpayHandlerResponse) => {
          setLoadingId(null);
          verifyAndActivate(response, planId, () => {
            setConfirmingId(null);
            window.location.reload();
          });
        },
        theme: { color: "#3525cd" },
        modal: { ondismiss: () => setLoadingId(null) },
      }).open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoadingId(null);
    }
  }, [verifyAndActivate]);

  return { loadingId, confirmingId, openBundle, openPlan };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ConvictionBanner() {
  return (
    <div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant/15 rounded-xl editorial-shadow p-6 sm:p-8">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{ background: "radial-gradient(ellipse at top right, rgba(53,37,205,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Left: headline */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-1">
              {["🇺🇸","🇬🇧","🇨🇦","🇩🇪","🇦🇺"].map((flag) => (
                <span key={flag} className="text-sm">{flag}</span>
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              847 students admitted this year
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-on-surface font-headline leading-snug mb-2">
            Your education abroad costs ₹50L+.
            <br />
            <span className="text-primary">Your admission partner: ₹30K.</span>
          </h2>
          <p className="text-sm text-on-surface-variant font-medium leading-relaxed max-w-lg">
            That&apos;s less than <strong className="text-on-surface">0.06%</strong> of your total investment —
            and it&apos;s the difference between a strong application and a rejected one.
            Students who had consultant support got into <strong className="text-on-surface">3.4x more programs</strong> on average.
          </p>
        </div>

        {/* Right: trust signals */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex text-amber-400">
              {[1,2,3,4,5].map((i) => <Star key={i} size={12} fill="currentColor" />)}
            </div>
            <span className="text-xs font-bold text-on-surface">4.9 / 5.0</span>
            <span className="text-[10px] text-on-surface-variant font-medium">(312 reviews)</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <TrendingUp size={13} className="text-emerald-500" />
            <span><strong className="text-on-surface">94%</strong> visa success rate</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <Shield size={13} className="text-primary" />
            <span><strong className="text-on-surface">Not a recurring</strong> subscription</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <Users size={13} className="text-on-surface-variant" />
            <span><strong className="text-on-surface">47</strong> students upgraded this week</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FreeVsPaidComparison() {
  const rows = [
    { feature: "AI university matching", free: "12% of programs", paid: "Full database, ranked for you" },
    { feature: "Document review", free: "None", paid: "Human-reviewed & improved" },
    { feature: "SOP assistance", free: "AI draft only", paid: "Expert editing + feedback" },
    { feature: "Consultant access", free: "Not included", paid: "Dedicated to your file" },
    { feature: "Visa guidance", free: "Not included", paid: "Step-by-step support" },
    { feature: "Success probability", free: "Industry average", paid: "3.4× higher with consultant" },
  ];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl overflow-hidden editorial-shadow">
      <div className="p-5 border-b border-outline-variant/10">
        <h3 className="text-sm font-black text-on-surface font-headline">Free vs Expert Support — Side by Side</h3>
        <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
          See exactly what you unlock when you upgrade.
        </p>
      </div>
      <div className="divide-y divide-outline-variant/[0.06]">
        {rows.map((row) => (
          <div key={row.feature} className="grid grid-cols-3 gap-0">
            <div className="col-span-1 px-5 py-3 text-[11px] font-bold text-on-surface flex items-center">{row.feature}</div>
            <div className="col-span-1 px-4 py-3 text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5 bg-error/[0.02]">
              <Lock size={9} className="text-on-surface-variant/40 shrink-0" />
              {row.free}
            </div>
            <div className="col-span-1 px-4 py-3 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50/50">
              <Check size={9} className="text-emerald-500 shrink-0" />
              {row.paid}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 bg-surface-container-low/60 px-5 py-2 border-t border-outline-variant/10">
        <div className="text-[9px] font-black uppercase tracking-widest text-outline">Feature</div>
        <div className="text-[9px] font-black uppercase tracking-widest text-outline">Free plan</div>
        <div className="text-[9px] font-black uppercase tracking-widest text-primary">Any paid plan</div>
      </div>
    </div>
  );
}

function IntakeUrgencyBanner() {
  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-xl border text-sm font-semibold"
      style={{ background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" }}
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div>
        <strong>April 2026 intake is closing fast.</strong>{" "}
        University deadlines typically fall between October–January.
        Starting your application with a consultant{" "}
        <strong>before the rush</strong> improves shortlisting quality significantly.
        {" "}Don&apos;t wait until you&apos;re scrambling.
      </div>
    </div>
  );
}

// ── Credit bundle card ──────────────────────────────────────────────────────

function BundleCard({
  bundle,
  isLoading,
  isConfirming,
  onBuy,
}: {
  bundle: CreditBundle;
  isLoading: boolean;
  isConfirming: boolean;
  onBuy: () => void;
}) {
  const perCredit = Math.round(bundle.basePrice / bundle.credits);
  const isPopular = bundle.popular;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl overflow-hidden",
        isPopular ? "p-px" : "border border-outline-variant/15 bg-surface-container-lowest editorial-shadow"
      )}
      style={isPopular ? { background: "linear-gradient(135deg, #3525cd, #4f46e5, #7c74f0)" } : undefined}
    >
      <div className={cn("flex flex-col h-full p-5", isPopular ? "rounded-[11px] bg-surface-container-lowest" : "")}>
        {isPopular && (
          <div className="flex justify-between items-start mb-3">
            <span className="badge-primary">Best Value · Save 20%</span>
            <Sparkles size={13} className="text-primary" />
          </div>
        )}

        <div className="text-3xl font-black text-on-surface font-headline">
          {bundle.credits}
          <span className="text-sm font-bold text-on-surface-variant ml-1">credits</span>
        </div>

        <div className="mt-2">
          <span className="text-xl font-black text-on-surface font-headline">{bundle.priceDisplay}</span>
          <span className="text-[10px] font-semibold text-on-surface-variant/50 ml-1">+GST</span>
        </div>
        <p className="text-[10px] text-on-surface-variant/40 font-medium mt-0.5">{bundle.totalDisplay}</p>

        <p className="text-[11px] font-bold text-primary mt-2">₹{perCredit}/credit</p>

        {/* What you can do with these credits */}
        <div className="mt-3 space-y-1">
          {[
            `${Math.floor(bundle.credits / 5)} university matches`,
            `${Math.floor(bundle.credits / 10)} SOP drafts`,
            `${bundle.credits} AI messages`,
          ].map((use) => (
            <div key={use} className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-medium">
              <Zap size={9} className="text-primary shrink-0" />
              {use}
            </div>
          ))}
        </div>

        <button
          onClick={onBuy}
          disabled={isLoading || isConfirming}
          className={cn("mt-4 w-full py-2.5 text-sm font-bold rounded-md transition-all disabled:opacity-60 flex items-center justify-center gap-2",
            isPopular ? "btn-primary" : "btn-secondary"
          )}
        >
          {isConfirming
            ? <><Loader2 size={13} className="animate-spin" /> Confirming…</>
            : isLoading
            ? <><Loader2 size={13} className="animate-spin" /> Opening…</>
            : "Recharge"}
        </button>
      </div>
    </div>
  );
}

// ── Plan card ───────────────────────────────────────────────────────────────

function PlanCard({
  id,
  plan,
  isLoading,
  isConfirming,
  onBuy,
}: {
  id: string;
  plan: PlanConfig;
  isLoading: boolean;
  isConfirming: boolean;
  onBuy: () => void;
}) {
  const social = PLAN_SOCIAL[id];
  const isPopular = plan.popular;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl overflow-hidden",
        isPopular ? "p-px" : "border border-outline-variant/15 editorial-shadow bg-surface-container-lowest"
      )}
      style={isPopular ? { background: "linear-gradient(135deg, #3525cd, #4f46e5, #7c74f0)" } : undefined}
    >
      <div className={cn("flex flex-col h-full p-6", isPopular ? "rounded-[11px] bg-surface-container-lowest" : "")}>

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            {plan.badge && <span className="badge-primary mb-1.5 block w-fit">{plan.badge}</span>}
            <h4 className="text-base font-black text-on-surface font-headline">{plan.name}</h4>
            <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{plan.tagline}</p>
          </div>
          {id === "elite" && <Star size={16} className="text-amber-500 fill-amber-500 shrink-0" />}
          {id === "premium" && <Sparkles size={16} className="text-primary shrink-0" />}
          {id === "basic" && <Crown size={16} className="text-on-surface-variant shrink-0" />}
        </div>

        {/* Social proof: weekly buyers */}
        {social && (
          <div className="flex items-center gap-1.5 mb-3 mt-1">
            <Users size={10} className="text-primary" />
            <span className="text-[10px] font-bold text-primary">
              {social.weeklyBuyers} students chose this plan this week
            </span>
          </div>
        )}

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
              60 days access
            </span>
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-primary">
              <span
                className="material-symbols-outlined leading-none"
                style={{ fontSize: 11, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
              >bolt</span> {plan.includedCredits} credits included
            </span>
          </div>

          {/* vs standalone consultant */}
          {social && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[10px] font-medium text-on-surface-variant/50 line-through">
                {social.vsStandalone} standalone
              </span>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Save big
              </span>
            </div>
          )}
        </div>

        {/* Scarcity */}
        {social && social.seatsLeft <= 10 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md mb-3 text-[10px] font-bold"
            style={{ background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e", border: "1px solid" }}
          >
            <AlertTriangle size={10} className="shrink-0" />
            Only {social.seatsLeft} consultant slots left for this intake
          </div>
        )}

        {/* Features */}
        <ul className="space-y-2 flex-1 mb-4">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[12px] text-on-surface-variant font-medium leading-relaxed">
              <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>

        {/* Outcome claim */}
        {social && (
          <div className="mb-3 text-[10px] font-bold text-on-surface-variant bg-primary/[0.04] border border-primary/10 rounded-lg px-3 py-2">
            Students on {plan.name} got into <span className="text-primary">{social.outcome}× more programs</span> on average
          </div>
        )}

        <button
          onClick={onBuy}
          disabled={isLoading || isConfirming}
          className={cn(
            "w-full py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60",
            isPopular ? "btn-primary" : "btn-secondary"
          )}
        >
          {isConfirming
            ? <><Loader2 size={13} className="animate-spin" /> Confirming…</>
            : isLoading
            ? <><Loader2 size={13} className="animate-spin" /> Opening…</>
            : `Get ${plan.name}`}
        </button>
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function DashboardUpsellSection() {
  const { credits } = useCreditContext();
  const { loadingId, confirmingId, openBundle, openPlan } = useRazorpay();

  const bundles = Object.values(CREDIT_BUNDLES) as CreditBundle[];
  const plans = Object.entries(PLAN_CONFIG) as [string, PlanConfig][];

  return (
    <section className="mt-10 sm:mt-14 space-y-8">

      {/* ── Conviction banner ─────────────────────────────── */}
      <ConvictionBanner />

      {/* ── Intake urgency ───────────────────────────────── */}
      <IntakeUrgencyBanner />

      {/* ── Consultant Plans ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Crown size={14} className="text-primary" />
              <h3 className="text-base font-black text-on-surface font-headline">Consultant Plans</h3>
              <span className="badge-primary">60 days</span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">
              Human-led admission support · Expert consultant assigned to your file
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <div className="flex text-amber-400">
              {[1,2,3,4,5].map((i) => <Star key={i} size={10} fill="currentColor" />)}
            </div>
            <span className="text-[9px] text-on-surface-variant font-medium">4.9 · 312 reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {plans.map(([id, plan]) => (
            <PlanCard
              key={id}
              id={id}
              plan={plan}
              isLoading={loadingId === id}
              isConfirming={confirmingId === id}
              onBuy={() => openPlan(id)}
            />
          ))}
        </div>

        <p className="text-[10px] text-on-surface-variant/40 text-center font-medium mt-3">
          Payments via Razorpay · All prices exclude 18% GST · Not a recurring subscription
        </p>
      </div>

      {/* ── Free vs Paid comparison ───────────────────────── */}
      <FreeVsPaidComparison />

      {/* ── Credits ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap size={14} className="text-primary" />
              <h3 className="text-base font-black text-on-surface font-headline">AI Credits</h3>
              <span className="badge-primary">Pay-as-you-go</span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">
              Spend credits on university matching, Riz AI chat, SOP drafts & more. No plan needed.
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-black border rounded-xl font-headline",
              credits === 0
                ? "border-error/50 text-error bg-error/[0.06]"
                : credits < 10
                ? "border-amber-400/50 text-amber-600 bg-amber-400/[0.06]"
                : "border-primary/25 text-primary bg-primary/[0.05]"
            )}
          >
            <span
              className="material-symbols-outlined leading-none"
              style={{ fontSize: 14, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
            >bolt</span>
            <span>{credits}</span>
            <span className="text-[10px] font-semibold text-on-surface-variant">credits</span>
          </div>
        </div>

        {credits === 0 && (
          <div className="flex items-center gap-2.5 mb-4 px-4 py-3 bg-error/[0.04] border border-error/20 rounded-xl text-sm font-bold text-error">
            <AlertTriangle size={14} className="shrink-0" />
            You&apos;re out of credits — AI features are paused. Recharge to continue.
          </div>
        )}
        {credits > 0 && credits < 10 && (
          <div className="flex items-center gap-2.5 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-700">
            <AlertTriangle size={14} className="shrink-0" />
            Running low — only {credits} credits left. Recharge before you run out mid-search.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {bundles.map((bundle) => (
            <BundleCard
              key={bundle.id}
              bundle={bundle}
              isLoading={loadingId === bundle.id}
              isConfirming={confirmingId === bundle.id}
              onBuy={() => openBundle(bundle.id)}
            />
          ))}
        </div>

        <p className="text-[10px] text-on-surface-variant/40 font-medium mt-3">
          All prices exclude 18% GST · Credits never expire · More credits = lower price per credit
        </p>
      </div>

    </section>
  );
}
