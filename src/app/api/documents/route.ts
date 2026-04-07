import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { DocumentCategory, DocumentStatus } from "@/generated/prisma/client";

// Default document checklist seeded on first access
const defaultDocs: { name: string; category: DocumentCategory; isRequired: boolean }[] = [
  { name: "10th Marksheet", category: "academic", isRequired: true },
  { name: "12th Marksheet", category: "academic", isRequired: true },
  { name: "Degree Certificate", category: "academic", isRequired: true },
  { name: "Semester Transcripts", category: "academic", isRequired: true },
  { name: "Backlog Certificate", category: "academic", isRequired: false },
  { name: "IELTS Score Report", category: "test_scores", isRequired: true },
  { name: "GRE Score Report", category: "test_scores", isRequired: false },
  { name: "Passport", category: "identity", isRequired: true },
  { name: "Bank Statements (6 months)", category: "financial", isRequired: true },
  { name: "CV / Resume", category: "application", isRequired: true },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let docs = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { category: "asc" },
    });

    // Seed default documents on first access
    if (docs.length === 0) {
      await prisma.document.createMany({
        data: defaultDocs.map((d) => ({
          userId: user.id,
          name: d.name,
          category: d.category,
          isRequired: d.isRequired,
          status: "not_started" as DocumentStatus,
        })),
      });
      docs = await prisma.document.findMany({
        where: { userId: user.id },
        orderBy: { category: "asc" },
      });
    }

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("Documents fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, category, fileUrl, notes } = body as {
      name: string;
      category?: DocumentCategory;
      fileUrl?: string;
      notes?: string;
    };

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        name,
        category: category || "application",
        isRequired: false,
        status: fileUrl ? "uploaded" : "not_started",
        fileUrl: fileUrl || null,
        uploadedAt: fileUrl ? new Date() : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error("Document create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create document" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { documentId } = body as { documentId: string };

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    await prisma.document.delete({ where: { id: documentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { documentId, status, fileUrl } = body as {
      documentId: string;
      status?: DocumentStatus;
      fileUrl?: string;
    };

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    // Verify ownership
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (fileUrl) {
      updateData.fileUrl = fileUrl;
      updateData.uploadedAt = new Date();
      if (!status) updateData.status = "uploaded";
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("Document update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update document" },
      { status: 500 }
    );
  }
}
