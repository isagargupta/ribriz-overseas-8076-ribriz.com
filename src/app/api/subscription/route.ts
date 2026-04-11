import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { PLAN_CONFIG } from "@/lib/subscription/plans";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST: Create Razorpay order for a consultant plan (Basic / Premium / Elite)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan } = await request.json() as { plan: string };
    const config = PLAN_CONFIG[plan];
    if (!config) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount: config.amountPaise,
      currency: "INR",
      receipt: `plan_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        userId: user.id,
        orderType: "plan",
        tier: config.tier,
        validityDays: String(config.validityDays),
        includedCredits: String(config.includedCredits),
      },
    });

    await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        orderType: "plan",
        tier: config.tier,
        amountPaise: config.amountPaise,
        validityDays: config.validityDays,
        status: "created",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: config.amountPaise,
      currency: "INR",
      planName: config.name,
      keyId: process.env.RAZORPAY_KEY_ID!,
      notes: {
        orderType: "plan",
        tier: config.tier,
        validityDays: config.validityDays,
        includedCredits: config.includedCredits,
      },
    });
  } catch (error) {
    console.error("Subscription order error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}
