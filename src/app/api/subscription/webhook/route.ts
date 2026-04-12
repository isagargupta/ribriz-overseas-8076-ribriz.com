export const runtime = "nodejs";

import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { addCredits } from "@/lib/subscription/credits";
import { sendCapiEventServer } from "@/lib/capi";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  const expectedSignature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("Razorpay webhook: invalid signature");
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload: { payment: { entity: { order_id: string; id: string; signature?: string } } };
  };

  if (event.event !== "payment.captured") {
    return new Response("Ignored", { status: 200 });
  }

  const payment = event.payload.payment.entity;
  const razorpayOrderId = payment.order_id;
  const razorpayPaymentId = payment.id;
  const razorpaySignature = payment.signature ?? "";

  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { razorpayOrderId },
    include: { user: { select: { email: true } } },
  });

  if (!paymentOrder) {
    console.error("Razorpay webhook: unknown order", razorpayOrderId);
    return new Response("Unknown order", { status: 404 });
  }

  // Idempotency guard
  if (paymentOrder.status === "paid") {
    return new Response("OK", { status: 200 });
  }

  if (paymentOrder.orderType === "credits") {
    // ── Credit bundle purchase ──────────────────────────────
    const creditsToAdd = paymentOrder.creditsAmount;

    await prisma.$transaction([
      prisma.paymentOrder.update({
        where: { razorpayOrderId },
        data: {
          status: "paid",
          razorpayPaymentId,
          razorpaySignature,
          paidAt: new Date(),
        },
      }),
    ]);

    await addCredits(paymentOrder.userId, creditsToAdd, "recharge");

    await sendCapiEventServer({
      event_name: "Purchase",
      event_id: razorpayOrderId,
      email: paymentOrder.user.email ?? undefined,
      custom_data: {
        value: paymentOrder.amountPaise / 100,
        currency: "INR",
        content_name: `Credits: ${creditsToAdd}`,
      },
    });

  } else {
    // ── Plan purchase ───────────────────────────────────────
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + paymentOrder.validityDays);

    await prisma.$transaction([
      prisma.paymentOrder.update({
        where: { razorpayOrderId },
        data: {
          status: "paid",
          razorpayPaymentId,
          razorpaySignature,
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

    // Grant included credits outside the transaction (addCredits uses its own tx)
    if (paymentOrder.creditsAmount > 0) {
      await addCredits(paymentOrder.userId, paymentOrder.creditsAmount, "plan_included");
    }

    await sendCapiEventServer({
      event_name: "Purchase",
      event_id: razorpayOrderId,
      email: paymentOrder.user.email ?? undefined,
      custom_data: {
        value: paymentOrder.amountPaise / 100,
        currency: "INR",
        content_name: `Plan: ${paymentOrder.tier}`,
      },
    });
  }

  return new Response("OK", { status: 200 });
}
