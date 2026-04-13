"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCreditContext } from "@/contexts/credits";
import { CREDIT_BUNDLES, type CreditBundle } from "@/lib/subscription/plans";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export function CreditGateModal() {
  const { gateVisible, gateMessage, hideCreditGate, credits, refreshCredits } = useCreditContext();
  const [selected, setSelected] = useState<string>("value");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Load Razorpay script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("razorpay-script")) return;
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const verifyAndActivate = useCallback(
    async (response: RazorpayHandlerResponse) => {
      setConfirming(true);
      // Fast path: direct server-side verify
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        if (res.ok) {
          await refreshCredits();
          setConfirming(false);
          hideCreditGate();
          return;
        }
      } catch { /* fall through to polling */ }

      // Fallback: poll status (webhook may activate it)
      const MAX = 20;
      for (let i = 0; i < MAX; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const res = await fetch(`/api/subscription/status?orderId=${response.razorpay_order_id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "paid") {
              await refreshCredits();
              setConfirming(false);
              hideCreditGate();
              return;
            }
          }
        } catch {
          // keep polling
        }
      }
      setConfirming(false);
    },
    [refreshCredits, hideCreditGate]
  );

  const handleRecharge = useCallback(async () => {
    const bundle = CREDIT_BUNDLES[selected];
    if (!bundle) return;
    setLoading(true);

    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "RIBRIZ Credits",
        description: `${bundle.credits} Credits`,
        order_id: data.orderId,
        handler: (response: RazorpayHandlerResponse) => {
          setLoading(false);
          verifyAndActivate(response);
        },
        prefill: {},
        theme: { color: "#3525cd" },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }, [selected, verifyAndActivate]);

  if (!gateVisible) return null;

  const bundles = Object.values(CREDIT_BUNDLES);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) hideCreditGate(); }}
    >
      <div className="bg-surface w-full max-w-md border border-outline-variant/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-error leading-none"
                  style={{ fontSize: 16, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
                >bolt</span>
              </div>
              <h2 className="text-base font-bold text-on-surface font-headline">Out of Credits</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-snug">{gateMessage}</p>
          </div>
          <button
            onClick={hideCreditGate}
            className="text-outline hover:text-on-surface transition-colors ml-4 shrink-0"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Balance row */}
        <div className="px-6 py-4 flex items-center justify-between bg-surface-container-low border-b border-outline-variant/20">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">Current Balance</span>
          <span className={`flex items-center gap-1 text-sm font-bold tabular-nums ${credits === 0 ? "text-error" : "text-on-surface"}`}>
            <span
              className="material-symbols-outlined leading-none"
              style={{ fontSize: 14, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
            >bolt</span>
            {credits} credits
          </span>
        </div>

        {/* Bundle selector */}
        <div className="p-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-outline mb-4">Choose a pack</p>
          {bundles.map((bundle: CreditBundle) => (
            <button
              key={bundle.id}
              onClick={() => setSelected(bundle.id)}
              className={`w-full flex items-center justify-between px-4 py-3 border transition-all text-left ${
                selected === bundle.id
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant/30 hover:border-outline-variant/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected === bundle.id ? "border-primary" : "border-outline-variant"
                }`}>
                  {selected === bundle.id && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-on-surface">
                    <span
                      className="material-symbols-outlined leading-none text-primary"
                      style={{ fontSize: 14, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 20" }}
                    >bolt</span>
                    {bundle.credits} credits
                    {bundle.popular && (
                      <span className="ml-2 text-[10px] font-bold bg-primary text-on-primary px-2 py-0.5 uppercase tracking-wider">
                        Best Value
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-outline">{bundle.totalDisplay}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-on-surface shrink-0">{bundle.priceDisplay}</p>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          {confirming ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-primary-container/30 text-primary text-sm font-bold">
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Confirming payment…
            </div>
          ) : (
            <button
              onClick={handleRecharge}
              disabled={loading}
              className="btn-primary w-full py-3 text-sm disabled:opacity-60"
            >
              {loading ? "Opening Razorpay…" : `Recharge — ${CREDIT_BUNDLES[selected]?.priceDisplay}`}
            </button>
          )}

          <div className="flex items-center justify-between text-xs text-outline">
            <span>Need human expert support?</span>
            <Link
              href="/settings?tab=plans"
              onClick={hideCreditGate}
              className="text-primary font-bold hover:underline"
            >
              View consultant plans →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
