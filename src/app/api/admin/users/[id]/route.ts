import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/is-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id },
      include: {
        academicProfile: true,
        preferences: true,
        financialProfile: true,
        applications: {
          include: { program: { include: { university: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        paymentOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        creditTransactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        threads: {
          include: { _count: { select: { messages: true } } },
          orderBy: { updatedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error("Admin user detail error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { creditAdjustment, creditReason, subscriptionTier, subscriptionExpiresAt } = body;

    const updates: Record<string, unknown> = {};

    if (subscriptionTier !== undefined) updates.subscriptionTier = subscriptionTier;
    if (subscriptionExpiresAt !== undefined) {
      updates.subscriptionExpiresAt = subscriptionExpiresAt
        ? new Date(subscriptionExpiresAt)
        : null;
    }

    if (creditAdjustment !== undefined && creditAdjustment !== 0) {
      await prisma.creditTransaction.create({
        data: {
          userId: id,
          amount: creditAdjustment,
          reason: creditReason ?? "admin_adjustment",
        },
      });
      updates.credits = { increment: creditAdjustment };
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        credits: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Admin user patch error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
