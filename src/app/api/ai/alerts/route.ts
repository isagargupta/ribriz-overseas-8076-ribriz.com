import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET: Fetch unread alerts for the user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const alerts = await prisma.proactiveAlert.findMany({
      where: {
        userId: user.id,
        isDismissed: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: 20,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Alerts error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: Mark alert as read or dismissed
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { alertId, action } = (await request.json()) as {
      alertId: string;
      action: "read" | "dismiss";
    };

    const alert = await prisma.proactiveAlert.findFirst({
      where: { id: alertId, userId: user.id },
    });
    if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

    const updated = await prisma.proactiveAlert.update({
      where: { id: alertId },
      data: action === "dismiss" ? { isDismissed: true } : { isRead: true },
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error("Alert update error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
