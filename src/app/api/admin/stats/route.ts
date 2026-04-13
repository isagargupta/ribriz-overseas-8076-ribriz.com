import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/is-admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      onboardedUsers,
      activeSubscriptions,
      paidOrders,
      totalCreditsRecharge,
      signupsByDay,
      revenueByDay,
      tierBreakdown,
      countryBreakdown,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { onboardingComplete: true } }),
      prisma.user.count({
        where: {
          subscriptionTier: { not: "free" as never },
          subscriptionExpiresAt: { gt: now },
        },
      }),
      prisma.paymentOrder.aggregate({
        where: { status: "paid" as never },
        _sum: { amountPaise: true },
        _count: true,
      }),
      prisma.creditTransaction.aggregate({
        where: { reason: "recharge", amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      // Signups per day — cast count to text to avoid BigInt serialization issues
      prisma.$queryRaw<{ date: string; count: string }[]>`
        SELECT DATE("createdAt")::text AS date, COUNT(*)::text AS count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Revenue per day — cast sum to text to avoid BigInt/overflow issues
      prisma.$queryRaw<{ date: string; amount: string }[]>`
        SELECT DATE("paidAt")::text AS date, COALESCE(SUM("amountPaise"), 0)::text AS amount
        FROM "PaymentOrder"
        WHERE status = 'paid' AND "paidAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("paidAt")
        ORDER BY date ASC
      `,
      // Users by subscription tier
      prisma.user.groupBy({
        by: ["subscriptionTier"],
        _count: { _all: true },
      }),
      // Top countries
      prisma.user.groupBy({
        by: ["nationality"],
        _count: { _all: true },
        orderBy: { _count: { nationality: "desc" } },
        take: 10,
        where: { nationality: { not: null } },
      }),
    ]);

    const totalRevenueINR = paidOrders._sum.amountPaise
      ? Math.round(Number(paidOrders._sum.amountPaise) / 100)
      : 0;

    return NextResponse.json({
      totalUsers,
      newUsersToday,
      onboardedUsers,
      activeSubscriptions,
      totalRevenueINR,
      totalOrders: paidOrders._count,
      totalCreditsRecharged: Number(totalCreditsRecharge._sum.amount ?? 0),
      // Parse count/amount from string to avoid any BigInt serialization issues
      signupsByDay: signupsByDay.map((r) => ({
        date: r.date,
        count: parseInt(r.count, 10),
      })),
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date,
        amount: parseInt(r.amount, 10),
      })),
      tierBreakdown: tierBreakdown.map((t) => ({
        tier: t.subscriptionTier,
        count: t._count._all,
      })),
      topCountries: countryBreakdown.map((c) => ({
        country: c.nationality,
        count: c._count._all,
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
