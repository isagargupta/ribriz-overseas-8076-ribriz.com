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
    const search = searchParams.get("search") ?? "";
    const tier = searchParams.get("tier") ?? "";
    const onboarded = searchParams.get("onboarded");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(tier ? { subscriptionTier: tier as never } : {}),
      ...(onboarded !== null ? { onboardingComplete: onboarded === "true" } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          nationality: true,
          city: true,
          credits: true,
          subscriptionTier: true,
          subscriptionExpiresAt: true,
          onboardingComplete: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              applications: true,
              threads: true,
              paymentOrders: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
