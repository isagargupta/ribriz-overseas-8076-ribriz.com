import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/app-documents/[id]/versions
 * Fetch version history for a document
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify ownership
    const doc = await prisma.applicationDocument.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        wordCount: true,
        changeNote: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Version fetch error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
