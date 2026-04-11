import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { CREDIT_BUNDLES } from "@/lib/subscription/plans";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// GET: Return current credit balance
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        credits: true,
        creditTransactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { amount: true, reason: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({
      credits: dbUser?.credits ?? 0,
      transactions: dbUser?.creditTransactions ?? [],
    });
  } catch (error) {
    console.error("Credits GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: Create Razorpay order for a credit bundle purchase
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bundle } = await request.json() as { bundle: string };
    const config = CREDIT_BUNDLES[bundle];
    if (!config) return NextResponse.json({ error: "Invalid bundle" }, { status: 400 });

    const order = await razorpay.orders.create({
      amount: config.amountPaise,
      currency: "INR",
      receipt: `cr_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        userId: user.id,
        orderType: "credits",
        bundleId: bundle,
        creditsAmount: String(config.credits),
      },
    });

    await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        orderType: "credits",
        creditsAmount: config.credits,
        amountPaise: config.amountPaise,
        validityDays: 0,
        status: "created",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: config.amountPaise,
      currency: "INR",
      bundleName: `${config.credits} Credits`,
      keyId: process.env.RAZORPAY_KEY_ID!,
      notes: { orderType: "credits", credits: config.credits },
    });
  } catch (error) {
    console.error("Credits POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
