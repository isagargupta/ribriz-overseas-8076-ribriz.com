import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/applications/initialize
 *
 * Creates an application workspace:
 * 1. Creates Application record (or returns existing)
 * 2. Auto-generates program-specific document checklist
 * 3. Returns application ID for redirect to workspace
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { programId, matchScore } = await request.json();
    if (!programId) {
      return NextResponse.json(
        { error: "programId is required" },
        { status: 400 }
      );
    }

    // Check for existing application
    const existing = await prisma.application.findFirst({
      where: { userId: user.id, programId },
    });
    if (existing) {
      return NextResponse.json(
        { applicationId: existing.id, application: existing, isNew: false },
        { status: 409 }
      );
    }

    // Fetch program details to build document checklist
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { university: true },
    });
    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        programId,
        matchScore: matchScore ?? null,
        status: "not_started",
      },
      include: { program: { include: { university: true } } },
    });

    // Build program-specific document checklist
    interface DocItem {
      name: string;
      category: "academic" | "test_scores" | "identity" | "financial" | "application";
      isRequired: boolean;
    }

    const docs: DocItem[] = [
      // Universal documents
      {
        name: "Passport",
        category: "identity",
        isRequired: true,
      },
      {
        name: "10th Marksheet",
        category: "academic",
        isRequired: true,
      },
      {
        name: "12th Marksheet",
        category: "academic",
        isRequired: true,
      },
      {
        name: "Degree Certificate / Provisional",
        category: "academic",
        isRequired: true,
      },
      {
        name: "Semester Transcripts (all semesters)",
        category: "academic",
        isRequired: true,
      },
    ];

    // Backlog certificate if student has backlogs
    const academicProfile = await prisma.academicProfile.findUnique({
      where: { userId: user.id },
    });
    if (academicProfile && academicProfile.backlogs > 0) {
      docs.push({
        name: "Backlog Certificate",
        category: "academic",
        isRequired: true,
      });
    }

    // Test score reports based on what student has
    if (academicProfile?.ieltsScore != null) {
      docs.push({
        name: "IELTS Score Report (TRF)",
        category: "test_scores",
        isRequired: true,
      });
    }
    if (academicProfile?.toeflScore != null) {
      docs.push({
        name: "TOEFL Score Report",
        category: "test_scores",
        isRequired: true,
      });
    }
    if (academicProfile?.pteScore != null) {
      docs.push({
        name: "PTE Score Report",
        category: "test_scores",
        isRequired: true,
      });
    }
    if (academicProfile?.greScore != null) {
      docs.push({
        name: "GRE Score Report",
        category: "test_scores",
        isRequired: program.requiresGre,
      });
    }
    if (academicProfile?.gmatScore != null) {
      docs.push({
        name: "GMAT Score Report",
        category: "test_scores",
        isRequired: program.requiresGmat,
      });
    }

    // SOP
    if (program.requiresSop !== false) {
      docs.push({
        name: `Statement of Purpose — ${program.university.name}`,
        category: "application",
        isRequired: true,
      });
    }

    // LORs
    const lorCount = program.requiresLor ?? 0;
    for (let i = 1; i <= lorCount; i++) {
      docs.push({
        name: `Letter of Recommendation #${i}`,
        category: "application",
        isRequired: true,
      });
    }

    // Resume
    if (program.requiresResume !== false) {
      docs.push({
        name: "Resume / CV",
        category: "application",
        isRequired: true,
      });
    }

    // Portfolio
    if (program.requiresPortfolio) {
      docs.push({
        name: "Portfolio",
        category: "application",
        isRequired: true,
      });
    }

    // Financial documents
    docs.push({
      name: "Bank Statements (last 6 months)",
      category: "financial",
      isRequired: true,
    });

    // Country-specific documents
    const country = program.university.country;
    if (country === "Germany") {
      docs.push({
        name: "APS Certificate",
        category: "application",
        isRequired: true,
      });
      docs.push({
        name: "Blocked Account Confirmation (Sperrkonto)",
        category: "financial",
        isRequired: true,
      });
    }
    if (country === "Canada") {
      docs.push({
        name: "WES Credential Evaluation",
        category: "academic",
        isRequired: false,
      });
      docs.push({
        name: "Provincial Attestation Letter",
        category: "application",
        isRequired: true,
      });
    }
    if (country === "Australia") {
      docs.push({
        name: "GTE Statement",
        category: "application",
        isRequired: true,
      });
      docs.push({
        name: "OSHC (Health Cover) Confirmation",
        category: "financial",
        isRequired: true,
      });
    }
    if (country === "United Kingdom") {
      docs.push({
        name: "Financial Proof (28-day bank statement)",
        category: "financial",
        isRequired: true,
      });
    }

    // Application fee proof
    if (program.applicationFee && program.applicationFee > 0) {
      docs.push({
        name: `Application Fee Payment (${program.applicationFeeCcy ?? ""} ${program.applicationFee})`,
        category: "financial",
        isRequired: true,
      });
    }

    // Check which docs already exist for user (avoid duplicates)
    const existingDocs = await prisma.document.findMany({
      where: { userId: user.id },
      select: { name: true },
    });
    const existingNames = new Set(existingDocs.map((d) => d.name));

    // Create only new documents
    const newDocs = docs.filter((d) => !existingNames.has(d.name));
    if (newDocs.length > 0) {
      await prisma.document.createMany({
        data: newDocs.map((d) => ({
          userId: user.id,
          name: d.name,
          category: d.category,
          isRequired: d.isRequired,
          status: "not_started",
        })),
      });
    }

    return NextResponse.json(
      {
        applicationId: application.id,
        application,
        isNew: true,
        documentsCreated: newDocs.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Application initialize error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to initialize",
      },
      { status: 500 }
    );
  }
}
