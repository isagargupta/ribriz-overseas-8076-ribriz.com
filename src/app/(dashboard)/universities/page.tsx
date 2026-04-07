import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import {
  computeMatchScore,
  getBadge,
  getBucket,
  analyzeProfileStrength,
  formatTuition,
} from "@/lib/scoring";
import { getUniversityLogoUrl } from "@/lib/university-logo";
import { fetchExternalPrograms } from "@/lib/external-university-api";
import UniversityList from "./university-list";
import type { UniversityItem, ProfileInsights } from "./university-list";

export default async function UniversitiesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { academicProfile: true, preferences: true },
  });

  if (!dbUser?.academicProfile || !dbUser?.preferences) {
    redirect("/onboarding");
  }

  const { academicProfile, preferences } = dbUser;

  // Fetch programs from external API, fall back to local DB
  const programsFetch = fetchExternalPrograms({
    degreeLevel: preferences.targetDegreeLevel,
    countries: preferences.targetCountries,
    fieldSearch: preferences.targetField || undefined,
  }).catch((err) => {
    console.warn("External API unavailable, falling back to local DB:", err.message);
    return prisma.program.findMany({
      where: { degreeLevel: preferences.targetDegreeLevel },
      include: { university: true },
    });
  });

  const [programs, existingApps] = await Promise.all([
    programsFetch,
    prisma.application.findMany({
      where: { userId: user.id },
      select: { programId: true },
    }),
  ]);

  const shortlistedIds = new Set(existingApps.map((a) => a.programId));

  const universities: UniversityItem[] = programs
    .map((program) => {
      const { score } = computeMatchScore(academicProfile, preferences, program);
      const badge = getBadge(score);
      const bucket = getBucket(score, program.university.acceptanceRate);

      return {
        programId: program.id,
        name: program.university.name,
        country: program.university.country,
        countryFlag: program.university.countryFlagEmoji ?? "",
        city: program.university.city,
        courseName: program.name,
        logoUrl: getUniversityLogoUrl(program.university.logoUrl, program.university.websiteUrl),
        tuition: formatTuition(program.tuitionAnnual, program.tuitionCurrency),
        tuitionRaw: program.tuitionAnnual,
        tuitionCurrency: program.tuitionCurrency,
        tuitionPeriod: program.durationMonths <= 12 ? "/yr" : "/sem",
        qsRanking: program.university.qsRanking ?? 999,
        matchScore: score,
        field: program.field,
        subField: program.subField ?? "",
        degreeLevel: program.degreeLevel,
        intake: program.intake ?? "",
        intakesAvailable: program.intakesAvailable ?? [],
        durationMonths: program.durationMonths,
        universityType: program.university.type ?? "",
        stemDesignated: program.stemDesignated,
        coopInternship: program.coopInternship,
        scholarshipsCount: program.scholarshipsCount,
        hasAssistantship: program.hasAssistantship,
        hasFellowship: program.hasFellowship,
        backlogsAllowed: program.backlogsAllowed,
        requiresGre: program.requiresGre,
        requiresGmat: program.requiresGmat,
        badge: badge.label,
        badgeColor: badge.color,
        bucket,
        isShortlisted: shortlistedIds.has(program.id),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  /* Profile analysis */
  const profileStrength = analyzeProfileStrength(academicProfile, preferences);

  /* Bucket counts */
  const bucketCounts = { safety: 0, target: 0, reach: 0, long_shot: 0 };
  universities.forEach((u) => bucketCounts[u.bucket]++);

  /* Build summary */
  const gre = academicProfile.greScore;
  const gpa = academicProfile.gpa;
  const gpaScale = academicProfile.gpaScale;
  const targetField = preferences.targetField;

  const summaryParts: string[] = [];
  if (gre) summaryParts.push(`GRE ${gre}`);
  if (gpa && gpaScale) summaryParts.push(`GPA ${gpa}/${gpaScale}`);
  const summaryLine = summaryParts.length
    ? `Refined academic matches based on your ${summaryParts.join(", ")} and desired specialization in ${targetField}.`
    : `Refined academic matches based on your profile and desired specialization in ${targetField}.`;

  /* Profile insights for the AI bar */
  const insights: ProfileInsights = {
    archetype: profileStrength.archetype,
    overallStrength: profileStrength.overallStrength,
    completeness: profileStrength.completeness,
    strengths: profileStrength.strengths.slice(0, 3),
    weaknesses: profileStrength.weaknesses.slice(0, 2),
    recommendations: profileStrength.recommendations.slice(0, 3),
    bucketCounts,
    totalMatches: universities.length,
    shortlistedCount: shortlistedIds.size,
    targetField: targetField ?? "",
    targetCountries: preferences.targetCountries,
  };

  return (
    <div className="p-4 sm:p-8 bg-surface">
      <UniversityList
        universities={universities}
        summaryLine={summaryLine}
        totalCount={programs.length}
        insights={insights}
      />
    </div>
  );
}
