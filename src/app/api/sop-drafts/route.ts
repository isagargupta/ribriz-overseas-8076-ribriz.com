import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { materializeExternalProgram } from "@/lib/external-university-api";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    const where: Record<string, unknown> = { userId: user.id };

    // If programId provided, find drafts for that program via application
    if (programId) {
      const app = await prisma.application.findFirst({
        where: { userId: user.id, programId },
      });
      if (app) where.applicationId = app.id;
    }

    const drafts = await prisma.sOPDraft.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("SOP drafts fetch error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { programId, universityName, content, guidedAnswers } = await request.json();
    if (!programId || !content) {
      return NextResponse.json({ error: "programId and content required" }, { status: 400 });
    }

    // For external programs, materialize into local DB first
    let localProgramId = programId;
    if (programId.startsWith("ext-prog-")) {
      const materialized = await materializeExternalProgram(programId);
      if (!materialized) {
        return NextResponse.json({ error: "Program not found" }, { status: 404 });
      }
      localProgramId = materialized.id;
    }

    // Validate program exists
    const program = await prisma.program.findUnique({ where: { id: localProgramId } });
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Find or create application for this program
    let app = await prisma.application.findFirst({
      where: { userId: user.id, programId: localProgramId },
    });
    if (!app) {
      app = await prisma.application.create({
        data: { userId: user.id, programId: localProgramId, status: "sop_pending" },
      });
    }

    // Check for existing draft to determine version
    const existingDrafts = await prisma.sOPDraft.count({
      where: { userId: user.id, applicationId: app.id },
    });

    const wordCount = content.trim().split(/\s+/).filter((w: string) => w.length > 0).length;

    const draft = await prisma.sOPDraft.create({
      data: {
        userId: user.id,
        applicationId: app.id,
        targetUniversity: universityName || "Unknown",
        content,
        wordCount,
        guidedAnswers: guidedAnswers ?? null,
        version: existingDrafts + 1,
      },
    });

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error("SOP draft save error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
