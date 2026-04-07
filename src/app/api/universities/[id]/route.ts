import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import {
  computeMatchScore,
  getBadge,
  formatTuition,
  formatLivingCost,
  formatDeadline,
} from "@/lib/scoring";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [program, dbUser] = await Promise.all([
      prisma.program.findUnique({
        where: { id },
        include: { university: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        include: { academicProfile: true, preferences: true },
      }),
    ]);

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    if (!dbUser?.academicProfile || !dbUser?.preferences) {
      return NextResponse.json(
        { error: "Complete onboarding first" },
        { status: 400 }
      );
    }

    const { academicProfile, preferences } = dbUser;
    const { score, breakdown } = computeMatchScore(
      academicProfile,
      preferences,
      program
    );
    const badge = getBadge(score);

    return NextResponse.json({
      programId: program.id,
      universityId: program.university.id,
      name: program.university.name,
      country: program.university.country,
      countryFlag: program.university.countryFlagEmoji ?? "",
      city: program.university.city,
      courseName: program.name,
      tuition: formatTuition(program.tuitionAnnual, program.tuitionCurrency),
      livingCost: formatLivingCost(program.livingCostMonthly, program.tuitionCurrency),
      qsRanking: program.university.qsRanking ?? 999,
      matchScore: score,
      deadline: formatDeadline(program.applicationDeadline),
      scholarships: program.scholarshipsCount,
      field: program.field,
      subField: program.subField,
      degreeLevel: program.degreeLevel,
      intake: program.intake ?? "",
      durationMonths: program.durationMonths,
      minGpa: program.minGpa,
      minIelts: program.minIelts,
      minToefl: program.minToefl,
      minPte: program.minPte,
      minGre: program.minGre,
      minGmat: program.minGmat,
      acceptanceRate: program.university.acceptanceRate ?? 0,
      websiteUrl: program.university.websiteUrl,
      applicationUrl: program.applicationUrl,
      badge: badge.label,
      badgeColor: badge.color,
      breakdown,

      // Enriched university details
      universityType: program.university.type,
      overview: program.university.overview,
      theRanking: program.university.theRanking,
      totalStudents: program.university.totalStudents,
      internationalPct: program.university.internationalPct,
      studentFacultyRatio: program.university.studentFacultyRatio,
      researchOutput: program.university.researchOutput,
      postStudyWorkVisa: program.university.postStudyWorkVisa,
      avgPostGradSalary: program.university.avgPostGradSalary,
      avgPostGradSalaryCcy: program.university.avgPostGradSalaryCcy,
      employmentRate: program.university.employmentRate,
      applicationPortalUrl: program.university.applicationPortalUrl,
      generalAppFee: program.university.generalAppFee,
      generalAppFeeCcy: program.university.generalAppFeeCcy,

      // Enriched program details
      requiresGre: program.requiresGre,
      requiresGmat: program.requiresGmat,
      minWorkExpMonths: program.minWorkExpMonths,
      backlogsAllowed: program.backlogsAllowed,
      requiresLor: program.requiresLor,
      requiresSop: program.requiresSop,
      requiresResume: program.requiresResume,
      requiresPortfolio: program.requiresPortfolio,
      earlyDeadline: formatDeadline(program.earlyDeadline),
      intakesAvailable: program.intakesAvailable,
      applicationFee: program.applicationFee,
      applicationFeeCcy: program.applicationFeeCcy,
      scholarshipDetails: program.scholarshipDetails,
      hasAssistantship: program.hasAssistantship,
      hasFellowship: program.hasFellowship,
      avgAdmitGpa: program.avgAdmitGpa,
      avgAdmitGre: program.avgAdmitGre,
      placementRate: program.placementRate,
      stemDesignated: program.stemDesignated,
      thesisOption: program.thesisOption,
      coopInternship: program.coopInternship,
      onlineMixed: program.onlineMixed,
      courseHighlights: program.courseHighlights,
      lastVerifiedAt: program.lastVerifiedAt,
      dataSource: program.dataSource,

      studentProfile: {
        gpa: academicProfile.gpa,
        gpaScale: academicProfile.gpaScale,
        ielts: academicProfile.ieltsScore,
        toefl: academicProfile.toeflScore,
        pte: academicProfile.pteScore,
        gre: academicProfile.greScore,
        gmat: academicProfile.gmatScore,
        backlogs: academicProfile.backlogs,
        workExperienceMonths: academicProfile.workExperienceMonths,
      },
    });
  } catch (error) {
    console.error("University detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch university" },
      { status: 500 }
    );
  }
}
