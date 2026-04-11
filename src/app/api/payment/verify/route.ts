import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { addCredits } from "@/lib/subscription/credits";

// POST: Verify a completed Razorpay payment and immediately activate it.
// Called from the Razorpay checkout handler callback on the client.
// The webhook at /api/subscription/webhook is the backup for delayed events.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    // ── Verify Razorpay signature ────────────────────────
    const expectedSig = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      console.error("Payment verify: invalid signature for order", razorpay_order_id);
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // ── Look up the order ────────────────────────────────
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!paymentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (paymentOrder.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Idempotency: already activated ──────────────────
    if (paymentOrder.status === "paid") {
      return NextResponse.json({ ok: true, alreadyActivated: true });
    }

    // ── Activate ─────────────────────────────────────────
    if (paymentOrder.orderType === "credits") {
      await prisma.paymentOrder.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          status: "paid",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: new Date(),
        },
      });
      await addCredits(paymentOrder.userId, paymentOrder.creditsAmount, "recharge");

      return NextResponse.json({ ok: true, type: "credits", credits: paymentOrder.creditsAmount });

    } else {
      // Plan purchase
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + paymentOrder.validityDays);

      await prisma.$transaction([
        prisma.paymentOrder.update({
          where: { razorpayOrderId: razorpay_order_id },
          data: {
            status: "paid",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paidAt: new Date(),
            expiresAt,
          },
        }),
        prisma.user.update({
          where: { id: paymentOrder.userId },
          data: {
            subscriptionTier: paymentOrder.tier,
            subscriptionExpiresAt: expiresAt,
          },
        }),
      ]);

      if (paymentOrder.creditsAmount > 0) {
        await addCredits(paymentOrder.userId, paymentOrder.creditsAmount, "plan_included");
      }

      return NextResponse.json({
        ok: true,
        type: "plan",
        tier: paymentOrder.tier,
        expiresAt: expiresAt.toISOString(),
        credits: paymentOrder.creditsAmount,
      });
    }
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
