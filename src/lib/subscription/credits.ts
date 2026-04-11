import { prisma } from "@/lib/db";
import type { CreditCostKey } from "./plans";
import { CREDIT_COST } from "./plans";

export type CreditReason =
  | "recharge"
  | "plan_included"
  | "signup_bonus"
  | "university_match"
  | "riz_ai_message"
  | "sop_draft"
  | "scholarship_scan";

interface DeductResult {
  ok: boolean;
  remaining?: number;
  error?: string;
}

/**
 * Atomically deduct credits from a user's balance.
 * Returns { ok: false } if balance is insufficient.
 */
export async function deductCredits(
  userId: string,
  costKey: CreditCostKey,
  reason: CreditReason
): Promise<DeductResult> {
  const cost = CREDIT_COST[costKey];

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) return { ok: false, error: "User not found" };
    if (user.credits < cost) {
      return {
        ok: false,
        error: `Not enough credits. This action costs ${cost} credits. You have ${user.credits}.`,
      };
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: { userId, amount: -cost, reason },
    });

    return { ok: true, remaining: updated.credits };
  });
}

/**
 * Add credits to a user's balance (recharge, plan grant, signup bonus).
 */
export async function addCredits(
  userId: string,
  amount: number,
  reason: CreditReason
): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
    select: { credits: true },
  });

  await prisma.creditTransaction.create({
    data: { userId, amount, reason },
  });

  return updated.credits;
}
