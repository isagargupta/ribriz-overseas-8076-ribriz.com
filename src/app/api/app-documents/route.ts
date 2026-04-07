import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { AppDocType } from "@/generated/prisma/client";

/**
 * GET /api/app-documents?applicationId=xxx
 * Fetch all documents for an application
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    const where: Record<string, unknown> = { userId: user.id };
    if (applicationId) where.applicationId = applicationId;

    const docs = await prisma.applicationDocument.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        wordCount: true,
        universityName: true,
        programName: true,
        country: true,
        isDraft: true,
        isComplete: true,
        lastEditedAt: true,
        currentVersion: true,
        applicationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("App documents fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/app-documents
 * Create a new document tied to an application
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { applicationId, type, title } = (await request.json()) as {
      applicationId: string;
      type: AppDocType;
      title?: string;
    };

    if (!applicationId || !type) {
      return NextResponse.json(
        { error: "applicationId and type are required" },
        { status: 400 }
      );
    }

    // Verify application belongs to user
    const app = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
      include: { program: { include: { university: true } } },
    });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const universityName = app.program.university.name;
    const programName = app.program.name;
    const country = app.program.university.country;

    // Generate title if not provided
    const docTypeLabels: Record<string, string> = {
      sop: "Statement of Purpose",
      lor: "Letter of Recommendation",
      motivation: "Motivation Letter",
      cv: "Resume / CV",
      essay: "Supplemental Essay",
      research: "Research Proposal",
      portfolio: "Portfolio",
      cover_letter: "Cover Letter",
      other: "Document",
    };
    const docTitle =
      title ?? `${docTypeLabels[type] ?? type} — ${universityName}`;

    // Check for existing document of same type + title
    const existing = await prisma.applicationDocument.findFirst({
      where: { applicationId, type, title: docTitle },
    });
    if (existing) {
      return NextResponse.json(
        { document: existing, isExisting: true },
        { status: 200 }
      );
    }

    const doc = await prisma.applicationDocument.create({
      data: {
        userId: user.id,
        applicationId,
        type,
        title: docTitle,
        universityName,
        programName,
        country,
      },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error("App document create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
