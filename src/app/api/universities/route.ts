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
import { getUniversityLogoUrl } from "@/lib/university-logo";
import { fetchExternalPrograms } from "@/lib/external-university-api";
import { deductCredits } from "@/lib/subscription/credits";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { academicProfile: true, preferences: true },
    });

    if (!dbUser?.academicProfile || !dbUser?.preferences) {
      return NextResponse.json(
        { error: "Complete onboarding first", universities: [] },
        { status: 200 }
      );
    }

    const { academicProfile, preferences } = dbUser;

    // Fetch programs: try external API first, fall back to local DB
    let programs: Awaited<ReturnType<typeof fetchExternalPrograms>>;
    try {
      programs = await fetchExternalPrograms({
        degreeLevel: preferences.targetDegreeLevel,
        countries: preferences.targetCountries,
        fieldSearch: preferences.targetField || undefined,
      });
    } catch (err) {
      console.warn("External API unavailable, falling back to local DB:", err);
      programs = await prisma.program.findMany({
        where: { degreeLevel: preferences.targetDegreeLevel },
        include: { university: true },
      });
    }

    // Score each program
    const scored = programs
      .map((program) => {
        const { score, breakdown } = computeMatchScore(
          academicProfile,
          preferences,
          program
        );
        const badge = getBadge(score);

        return {
          programId: program.id,
          universityId: program.university.id,
          name: program.university.name,
          country: program.university.country,
          countryFlag: program.university.countryFlagEmoji ?? "",
          city: program.university.city,
          courseName: program.name,
          logoUrl: getUniversityLogoUrl(program.university.logoUrl, program.university.websiteUrl),
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
          minGre: program.minGre,
          acceptanceRate: program.university.acceptanceRate ?? 0,
          badge: badge.label,
          badgeColor: badge.color,
          breakdown,

          // Enriched university data
          universityType: program.university.type,
          overview: program.university.overview,
          postStudyWorkVisa: program.university.postStudyWorkVisa,
          employmentRate: program.university.employmentRate,
          internationalPct: program.university.internationalPct,

          // Enriched program data
          requiresGre: program.requiresGre,
          requiresGmat: program.requiresGmat,
          backlogsAllowed: program.backlogsAllowed,
          scholarshipDetails: program.scholarshipDetails,
          stemDesignated: program.stemDesignated,
          coopInternship: program.coopInternship,
          courseHighlights: program.courseHighlights,
          intakesAvailable: program.intakesAvailable,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    // Deduct credits for this match call
    const creditResult = await deductCredits(user.id, "universityMatch", "university_match");
    if (!creditResult.ok) {
      return NextResponse.json(
        { error: creditResult.error, upgradeRequired: true },
        { status: 402 }
      );
    }

    return NextResponse.json({ universities: scored, creditsRemaining: creditResult.remaining });
  } catch (error) {
    console.error("Universities fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch universities" },
      { status: 500 }
    );
  }
}
