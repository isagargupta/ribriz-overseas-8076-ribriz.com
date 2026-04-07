import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

// Called after signup/login to ensure a Prisma User record exists
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    if (existing) {
      return NextResponse.json({ user: existing, created: false });
    }

    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";

    const created = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name,
      },
    });

    return NextResponse.json({ user: created, created: true }, { status: 201 });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
