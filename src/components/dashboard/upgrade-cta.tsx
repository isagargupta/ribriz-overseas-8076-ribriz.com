"use client";

import Link from "next/link";
import { Crown, Lock, ChevronRight, Users, TrendingUp, Zap, AlertTriangle } from "lucide-react";

const LOCKED_ITEMS = [
  "Human consultant assigned",
  "SOP & LOR reviewed by experts",
  "Visa filing guidance",
  "Priority shortlisting support",
  "Mock interview sessions",
];

const FREE_LIMITS = [
  { icon: "🎓", stat: "12%", label: "of programs visible to you" },
  { icon: "📝", stat: "0", label: "human document reviews" },
  { icon: "🛂", stat: "None", label: "visa guidance or expert support" },
];

export function DashboardUpgradeCTA({ tier }: { tier: string }) {
  if (tier !== "free") return null;

  return (
    <div className="mb-6">
      {/* Main upgrade banner */}
      <div
        className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant/20 editorial-shadow"
        style={{ borderRadius: "14px" }}
      >
        {/* Subtle left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: "linear-gradient(180deg, #3525cd, #7c74f0)" }}
        />

        <div className="pl-6 pr-5 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">

            {/* Left block */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2.5">
                <Crown size={13} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                  Free Plan
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#fef3c7", color: "#92400e" }}>
                  Limited Access
                </span>
              </div>

              <h3 className="text-lg font-black text-on-surface font-headline leading-snug mb-1">
                You&apos;re missing what gets students admitted.
              </h3>
              <p className="text-[12px] text-on-surface-variant font-medium leading-relaxed mb-3">
                Free users browse. Premium students get in. The difference is a consultant
                reviewing your file — not an algorithm.
              </p>

              {/* Locked pills */}
              <div className="flex flex-wrap gap-1.5">
                {LOCKED_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-1.5 px-2.5 py-1 border border-outline-variant/15 rounded-md"
                    style={{ background: "var(--surface-container-low)" }}
                  >
                    <Lock size={9} className="text-on-surface-variant/40" />
                    <span className="text-[10px] font-semibold text-on-surface-variant/60">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right block: stats + CTA */}
            <div className="flex flex-col gap-2.5 shrink-0 sm:min-w-[200px]">

              {/* Social proof */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
                <Users size={11} className="text-primary" />
                <span><strong className="text-on-surface">847</strong> students upgraded this month</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
                <TrendingUp size={11} className="text-emerald-500" />
                <span><strong className="text-on-surface">94%</strong> visa success rate</span>
              </div>

              {/* Scarcity */}
              <div
                className="flex items-start gap-2 px-3 py-2 border rounded-md text-[10px] font-bold"
                style={{ background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" }}
              >
                <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                <span>Only <strong>8 consultant slots</strong> left for April 2026 intake</span>
              </div>

              {/* CTA */}
              <Link
                href="/settings?tab=subscription"
                className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-md transition-opacity hover:opacity-90 text-on-primary"
                style={{ background: "linear-gradient(135deg, #3525cd, #4f46e5)" }}
              >
                See Plans &amp; Pricing <ChevronRight size={14} />
              </Link>

              <p className="text-[9px] text-on-surface-variant/40 text-center font-medium">
                Not a subscription · One-time · 60 days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What you're missing strip */}
      <div
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {FREE_LIMITS.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center text-center p-3 bg-surface-container-lowest border border-outline-variant/10 rounded-xl"
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-base font-black text-on-surface font-headline">{item.stat}</span>
            <span className="text-[9px] text-on-surface-variant/60 font-medium leading-snug mt-0.5">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
