import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/is-admin";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "";
    const orderType = searchParams.get("orderType") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(orderType ? { orderType } : {}),
    };

    const [orders, total, totals] = await Promise.all([
      prisma.paymentOrder.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.paymentOrder.count({ where }),
      prisma.paymentOrder.aggregate({
        where: { status: "paid" },
        _sum: { amountPaise: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
      totalPaidINR: Math.round((totals._sum.amountPaise ?? 0) / 100),
      totalPaidCount: totals._count,
    });
  } catch (error) {
    console.error("Admin payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
