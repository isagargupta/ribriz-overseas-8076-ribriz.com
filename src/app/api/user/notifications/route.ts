import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_PREFS = {
  deadlineReminders: true,
  statusUpdates: true,
  newMatches: false,
  productUpdates: false,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { notificationPreferences: true },
    });

    return NextResponse.json({
      preferences: (dbUser?.notificationPreferences as Record<string, boolean>) ?? DEFAULT_PREFS,
    });
  } catch (error) {
    console.error("Notification prefs fetch error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const prefs = await request.json();

    await prisma.user.update({
      where: { id: user.id },
      data: { notificationPreferences: prefs },
    });

    return NextResponse.json({ success: true, preferences: prefs });
  } catch (error) {
    console.error("Notification prefs update error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
