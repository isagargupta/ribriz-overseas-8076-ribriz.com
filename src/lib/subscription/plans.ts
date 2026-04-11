import type { SubscriptionTier } from "@/generated/prisma/client";

// ─── Credit Bundles (Pay-as-you-go) ─────────────────────────────────────────
// Minimum recharge ₹1,500. GST (18%) added on top at checkout.

export interface CreditBundle {
  id: string;
  credits: number;
  basePrice: number;       // INR, ex-GST
  gstAmount: number;       // 18% of basePrice
  totalPrice: number;      // basePrice + gstAmount
  amountPaise: number;     // totalPrice * 100, sent to Razorpay
  priceDisplay: string;    // "₹1,500"
  totalDisplay: string;    // "₹1,770 incl. GST"
  popular: boolean;
}

export const CREDIT_BUNDLES: Record<string, CreditBundle> = {
  starter: {
    id: "starter",
    credits: 100,
    basePrice: 1500,
    gstAmount: 270,
    totalPrice: 1770,
    amountPaise: 177000,
    priceDisplay: "₹1,500",
    totalDisplay: "₹1,770 incl. GST",
    popular: false,
  },
  value: {
    id: "value",
    credits: 250,
    basePrice: 3000,
    gstAmount: 540,
    totalPrice: 3540,
    amountPaise: 354000,
    priceDisplay: "₹3,000",
    totalDisplay: "₹3,540 incl. GST",
    popular: true,
  },
  power: {
    id: "power",
    credits: 500,
    basePrice: 5000,
    gstAmount: 900,
    totalPrice: 5900,
    amountPaise: 590000,
    priceDisplay: "₹5,000",
    totalDisplay: "₹5,900 incl. GST",
    popular: false,
  },
};

// Credits per credit when you buy the value pack = ₹3,000/250 = ₹12/credit
// Reference: ₹1,500/100 = ₹15/credit, ₹5,000/500 = ₹10/credit

// ─── Credit Costs Per Feature ────────────────────────────────────────────────

export const CREDIT_COST = {
  universityMatch: 5,   // per match call (returns full ranked list)
  rizAiMessage: 1,      // per user message sent to Riz AI
  sopDraft: 10,         // per SOP draft generated
  scholarshipScan: 5,   // per scholarship match call
} as const;

export type CreditCostKey = keyof typeof CREDIT_COST;

// ─── Consultant Plans ────────────────────────────────────────────────────────
// Human-led, time-bound (60 days). GST added at checkout.

export interface PlanConfig {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  basePrice: number;
  gstAmount: number;
  totalPrice: number;
  amountPaise: number;
  priceDisplay: string;
  totalDisplay: string;
  validityDays: number;
  includedCredits: number;
  popular: boolean;
  badge?: string;
  features: string[];
}

export const PLAN_CONFIG: Record<string, PlanConfig> = {
  basic: {
    tier: "basic",
    name: "Basic",
    tagline: "Expert-guided admission support",
    basePrice: 19999,
    gstAmount: 3600,
    totalPrice: 23599,
    amountPaise: 2359900,
    priceDisplay: "₹19,999",
    totalDisplay: "₹23,599 incl. GST",
    validityDays: 60,
    includedCredits: 200,
    popular: false,
    features: [
      "A human expert who's helped students get into 50+ universities",
      "Your shortlist built around your profile — not a generic list",
      "Your SOP reviewed line-by-line and improved by an expert",
      "Documents strengthened before they reach the admissions desk",
      "Direct WhatsApp access to your consultant — no ticketing",
    ],
  },
  premium: {
    tier: "premium",
    name: "Premium",
    tagline: "Priority support with full guidance",
    basePrice: 29999,
    gstAmount: 5400,
    totalPrice: 35399,
    amountPaise: 3539900,
    priceDisplay: "₹29,999",
    totalDisplay: "₹35,399 incl. GST",
    validityDays: 60,
    includedCredits: 350,
    popular: true,
    badge: "Most Popular",
    features: [
      "Everything in Basic",
      "Your SOP & LOR written to the standard top universities expect",
      "Walk into any interview ready — 2 full mock sessions with feedback",
      "A clear visa roadmap so your application isn't rejected at the embassy",
      "Priority responses when your deadlines are close",
    ],
  },
  elite: {
    tier: "elite",
    name: "Elite",
    tagline: "Complete done-for-you admission",
    basePrice: 49999,
    gstAmount: 9000,
    totalPrice: 58999,
    amountPaise: 5899900,
    priceDisplay: "₹49,999",
    totalDisplay: "₹58,999 incl. GST",
    validityDays: 60,
    includedCredits: 600,
    popular: false,
    features: [
      "Everything in Premium",
      "A senior consultant dedicated to your case end-to-end",
      "We prepare and submit your entire application — you just show up",
      "Visa paperwork completed and filed for you",
      "Pre-departure support and settling-in guidance",
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

export function effectiveTier(
  tier: SubscriptionTier,
  expiresAt: Date | null | undefined
): SubscriptionTier {
  if (isExpired(expiresAt)) return "free";
  return tier;
}

export function hasActivePlan(
  tier: SubscriptionTier,
  expiresAt: Date | null | undefined
): boolean {
  const et = effectiveTier(tier, expiresAt);
  return ["basic", "premium", "elite"].includes(et);
}
