import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/app-documents/[id]
 * Fetch a single document with its content
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

    const doc = await prisma.applicationDocument.findFirst({
      where: { id, userId: user.id },
      include: {
        application: {
          include: { program: { include: { university: true } } },
        },
      },
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Doc fetch error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * PATCH /api/app-documents/[id]
 * Auto-save content, update word count, optionally create version
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const doc = await prisma.applicationDocument.findFirst({
      where: { id, userId: user.id },
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { content, guidedAnswers, isComplete, createVersion } = body as {
      content?: string;
      guidedAnswers?: Record<string, string>;
      isComplete?: boolean;
      createVersion?: boolean;
    };

    const updateData: Record<string, unknown> = {
      lastEditedAt: new Date(),
      updatedAt: new Date(),
    };

    if (content !== undefined) {
      updateData.content = content;
      updateData.wordCount = content
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 0).length;
    }
    if (guidedAnswers !== undefined) updateData.guidedAnswers = guidedAnswers;
    if (isComplete !== undefined) {
      updateData.isComplete = isComplete;
      updateData.isDraft = !isComplete;
    }

    // Create version snapshot if requested
    if (createVersion && content !== undefined) {
      const newVersion = doc.currentVersion + 1;
      updateData.currentVersion = newVersion;

      await prisma.documentVersion.create({
        data: {
          documentId: id,
          version: newVersion,
          content,
          wordCount: (updateData.wordCount as number) ?? doc.wordCount,
          changeNote: body.changeNote ?? "Manual save",
        },
      });
    }

    const updated = await prisma.applicationDocument.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("Doc update error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/app-documents/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const doc = await prisma.applicationDocument.findFirst({
      where: { id, userId: user.id },
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.applicationDocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Doc delete error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
