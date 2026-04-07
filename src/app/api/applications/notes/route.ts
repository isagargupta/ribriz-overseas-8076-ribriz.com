import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId, notes } = await request.json();
    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId required" },
        { status: 400 }
      );
    }

    const app = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });
    if (!app) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { notes: notes ?? "" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notes update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update notes",
      },
      { status: 500 }
    );
  }
}
