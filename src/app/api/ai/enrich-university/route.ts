import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import {
  enrichUniversity,
  type EnrichedUniversity,
} from "@/lib/ai/enrich-university";
import { getUniversityLogoUrl } from "@/lib/university-logo";

// POST: Enrich a single university with AI and save to DB
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { universityName, country, targetFields, degreeLevel } = body as {
      universityName: string;
      country: string;
      targetFields?: string[];
      degreeLevel?: string;
    };

    if (!universityName || !country) {
      return NextResponse.json(
        { error: "universityName and country are required" },
        { status: 400 }
      );
    }

    // Check if university already exists
    const existing = await prisma.university.findFirst({
      where: {
        name: { contains: universityName, mode: "insensitive" },
        country: { equals: country, mode: "insensitive" },
      },
      include: { programs: true },
    });

    // If it exists and was enriched in the last 30 days, return cached
    if (existing?.lastEnrichedAt) {
      const daysSinceEnriched =
        (Date.now() - existing.lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceEnriched < 30) {
        return NextResponse.json({
          university: existing,
          source: "cached",
          message: "University data is fresh (enriched within 30 days)",
        });
      }
    }

    // Enrich with AI
    const enriched = await enrichUniversity(
      universityName,
      country,
      targetFields,
      degreeLevel
    );

    // Upsert university + programs
    const saved = await upsertUniversity(enriched, existing?.id);

    return NextResponse.json({
      university: saved,
      source: "ai",
      message: existing
        ? "University data refreshed with AI"
        : "New university added with AI-enriched data",
    });
  } catch (error) {
    console.error("University enrichment error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Enrichment failed",
      },
      { status: 500 }
    );
  }
}

// ─── Upsert helper ──────────────────────────────────────

async function upsertUniversity(data: EnrichedUniversity, existingId?: string) {
  const universityData = {
    name: data.name,
    country: data.country,
    city: data.city,
    qsRanking: data.qsRanking,
    theRanking: data.theRanking,
    acceptanceRate: data.acceptanceRate,
    websiteUrl: data.websiteUrl,
    countryFlagEmoji: data.countryFlagEmoji,
    type: data.type,
    overview: data.overview,
    campusSize: data.campusSize,
    totalStudents: data.totalStudents,
    internationalPct: data.internationalPct,
    studentFacultyRatio: data.studentFacultyRatio,
    researchOutput: data.researchOutput,
    postStudyWorkVisa: data.postStudyWorkVisa,
    avgPostGradSalary: data.avgPostGradSalary,
    avgPostGradSalaryCcy: data.avgPostGradSalaryCcy,
    employmentRate: data.employmentRate,
    applicationPortalUrl: data.applicationPortalUrl,
    generalAppFee: data.generalAppFee,
    generalAppFeeCcy: data.generalAppFeeCcy,
    logoUrl: getUniversityLogoUrl(null, data.websiteUrl),
    lastEnrichedAt: new Date(),
    enrichmentSource: "ai" as const,
  };

  if (existingId) {
    // Update existing university, delete old programs, create new ones
    await prisma.program.deleteMany({ where: { universityId: existingId } });

    return prisma.university.update({
      where: { id: existingId },
      data: {
        ...universityData,
        programs: {
          create: data.programs.map(mapProgramData),
        },
      },
      include: { programs: true },
    });
  }

  // Create new university with programs
  return prisma.university.create({
    data: {
      ...universityData,
      programs: {
        create: data.programs.map(mapProgramData),
      },
    },
    include: { programs: true },
  });
}

function mapProgramData(p: EnrichedUniversity["programs"][number]) {
  return {
    name: p.name,
    degreeLevel: p.degreeLevel,
    field: p.field,
    subField: p.subField,
    durationMonths: p.durationMonths,
    tuitionAnnual: p.tuitionAnnual,
    tuitionCurrency: p.tuitionCurrency,
    livingCostMonthly: p.livingCostMonthly,
    applicationUrl: p.applicationUrl,
    minGpa: p.minGpa,
    minGpaScale: p.minGpaScale,
    minIelts: p.minIelts,
    minToefl: p.minToefl,
    minPte: p.minPte,
    minGre: p.minGre,
    minGmat: p.minGmat,
    requiresGre: p.requiresGre,
    requiresGmat: p.requiresGmat,
    minWorkExpMonths: p.minWorkExpMonths,
    backlogsAllowed: p.backlogsAllowed,
    requiresLor: p.requiresLor,
    requiresSop: p.requiresSop,
    requiresResume: p.requiresResume,
    requiresPortfolio: p.requiresPortfolio,
    applicationDeadline: p.applicationDeadline
      ? new Date(p.applicationDeadline)
      : null,
    earlyDeadline: p.earlyDeadline ? new Date(p.earlyDeadline) : null,
    intake: p.intake,
    intakesAvailable: p.intakesAvailable,
    applicationFee: p.applicationFee,
    applicationFeeCcy: p.applicationFeeCcy,
    scholarshipsCount: p.scholarshipsCount,
    scholarshipDetails: p.scholarshipDetails,
    hasAssistantship: p.hasAssistantship,
    hasFellowship: p.hasFellowship,
    avgAdmitGpa: p.avgAdmitGpa,
    avgAdmitGre: p.avgAdmitGre,
    placementRate: p.placementRate,
    stemDesignated: p.stemDesignated,
    thesisOption: p.thesisOption,
    coopInternship: p.coopInternship,
    onlineMixed: p.onlineMixed,
    courseHighlights: p.courseHighlights,
    lastVerifiedAt: new Date(),
    dataSource: "ai",
  };
}
