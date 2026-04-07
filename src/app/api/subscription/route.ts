import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/generated/prisma/client";

// POST: Create Razorpay order (placeholder — replace with real Razorpay SDK)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan } = await request.json() as { plan: string };

    const planConfig: Record<string, { tier: SubscriptionTier; amountINR: number; name: string }> = {
      explorer: { tier: "explorer", amountINR: 299900, name: "Explorer" },
      pro: { tier: "pro", amountINR: 999900, name: "Pro" },
    };

    const config = planConfig[plan];
    if (!config) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // TODO: Replace with real Razorpay order creation
    // const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
    // const order = await razorpay.orders.create({ amount: config.amountINR, currency: "INR", receipt: `sub_${user.id}_${Date.now()}` });

    // Placeholder order for development
    const orderId = `order_dev_${Date.now()}`;

    return NextResponse.json({
      orderId,
      amount: config.amountINR,
      currency: "INR",
      planName: config.name,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

// PATCH: Confirm payment and upgrade tier
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tier } = await request.json() as { tier: SubscriptionTier };

    if (!["explorer", "pro", "premium"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: tier },
    });

    return NextResponse.json({ success: true, tier: updated.subscriptionTier });
  } catch (error) {
    console.error("Tier update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
