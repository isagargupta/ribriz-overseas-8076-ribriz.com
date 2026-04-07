import { prisma } from "@/lib/db";
import { anthropic, INSIGHT_MODEL } from "./claude";
import type {
  AcademicProfile,
  Preferences,
  Decision,
  GpaScale,
  BudgetRange,
  AppDocType,
} from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────

export interface ProfileSnapshot {
  gpa: number;
  gpaScale: GpaScale;
  ielts: number | null;
  toefl: number | null;
  gre: number | null;
  gmat: number | null;
  workExpMonths: number;
  backlogs: number;
  degreeName: string;
  collegeName: string;
}

export interface ProgramSnapshot {
  universityName: string;
  programName: string;
  country: string;
  field: string;
  qsRanking: number | null;
  minGpa: number | null;
  minIelts: number | null;
  acceptanceRate: number | null;
}

export interface CalibrationScoreRange {
  range: string;
  predicted: number;
  actual: number;
  calibrationError: number;
  sampleSize: number;
}

export interface CalibrationData {
  country: string;
  programTier: string;
  field: string;
  sampleSize: number;
  scoreRanges: CalibrationScoreRange[];
  weightAdjustments: WeightAdjustments;
  lastUpdated: string;
}

export interface WeightAdjustments {
  gpa: number;
  englishTest: number;
  gradTest: number;
  workExp: number;
  backlogs: number;
}

export interface ConfidenceCalibration {
  adjustedProbability: number;
  rawProbability: number;
  confidence: "high" | "medium" | "low";
  basedOnN: number;
  calibrationNote: string;
}

export interface PeerResult {
  similarity: number;
  gpa: string;
  ielts: number | null;
  gre: number | null;
  workExpMonths: number;
  outcome: Decision;
  universityName: string;
  matchScore: number;
}

export interface PeerPrediction {
  peerCount: number;
  acceptedCount: number;
  rejectedCount: number;
  waitlistedCount: number;
  acceptanceRate: number;
  avgMatchScore: number;
  yourMatchScore: number;
  prediction: string;
  confidence: "high" | "medium" | "low";
}

export interface DocumentQualityScore {
  overall: number;
  dimensions: {
    specificity: number;
    universityFit: number;
    narrativeStrength: number;
    structure: number;
    wordCount: number;
    weaknessAddressed: number;
  };
  suggestions: string[];
  strengths: string[];
  estimatedImpact: string;
}

// ─── Constants ──────────────────────────────────────────

const MIN_SAMPLE_THRESHOLD = 10;

const BUDGET_INDEX: Record<BudgetRange, number> = {
  under_5L: 0,
  five_10L: 1,
  ten_20L: 2,
  twenty_40L: 3,
  above_40L: 4,
};

// Score range boundaries for calibration buckets
const SCORE_RANGES = [
  { range: "0-40", min: 0, max: 40 },
  { range: "40-60", min: 40, max: 60 },
  { range: "60-70", min: 60, max: 70 },
  { range: "70-80", min: 70, max: 80 },
  { range: "80-90", min: 80, max: 90 },
  { range: "90-100", min: 90, max: 100 },
];

// ─── Outcome Snapshots ──────────────────────────────────

export async function snapshotProfileForOutcome(userId: string): Promise<ProfileSnapshot> {
  const profile = await prisma.academicProfile.findUnique({
    where: { userId },
  });
  if (!profile) throw new Error("Academic profile not found");
  return {
    gpa: profile.gpa,
    gpaScale: profile.gpaScale,
    ielts: profile.ieltsScore,
    toefl: profile.toeflScore,
    gre: profile.greScore,
    gmat: profile.gmatScore,
    workExpMonths: profile.workExperienceMonths,
    backlogs: profile.backlogs,
    degreeName: profile.degreeName,
    collegeName: profile.collegeName,
  };
}

export async function snapshotProgramForOutcome(programId: string): Promise<ProgramSnapshot> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { university: true },
  });
  if (!program) throw new Error("Program not found");
  return {
    universityName: program.university.name,
    programName: program.name,
    country: program.university.country,
    field: program.field,
    qsRanking: program.university.qsRanking,
    minGpa: program.minGpa,
    minIelts: program.minIelts,
    acceptanceRate: program.university.acceptanceRate,
  };
}

export async function recordOutcome(
  applicationId: string,
  decision: Decision,
  metadata?: {
    scholarshipReceived?: boolean;
    scholarshipAmount?: number;
    applicationCycle?: string;
    notes?: string;
  }
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { program: { include: { university: true } } },
  });
  if (!application) throw new Error("Application not found");

  const profileSnapshot = await snapshotProfileForOutcome(application.userId);
  const programSnapshot = await snapshotProgramForOutcome(application.programId);

  // Determine bucket from match score
  const score = application.matchScore ?? 0;
  const bucket =
    score >= 80 ? "safety" :
    score >= 60 ? "target" :
    score >= 40 ? "reach" : "long_shot";

  const outcome = await prisma.admissionOutcome.create({
    data: {
      applicationId,
      profileSnapshot: profileSnapshot as never,
      programSnapshot: programSnapshot as never,
      matchScoreAtApplication: application.matchScore ?? 0,
      bucket,
      decision,
      scholarshipReceived: metadata?.scholarshipReceived ?? false,
      scholarshipAmount: metadata?.scholarshipAmount,
      applicationCycle: metadata?.applicationCycle,
      notes: metadata?.notes,
    },
  });

  // Also update the application's decision field
  await prisma.application.update({
    where: { id: applicationId },
    data: { decision, status: "decision" },
  });

  return outcome;
}

// ─── Ranking Tier Helper ────────────────────────────────

export function rankingToTier(qsRanking: number | null): string {
  if (!qsRanking) return "other";
  if (qsRanking <= 50) return "top_50";
  if (qsRanking <= 100) return "top_100";
  if (qsRanking <= 200) return "top_200";
  return "other";
}

// ─── Weight Calibration (Bayesian Updating) ─────────────

export async function computeCalibration(
  country: string,
  programTier: string,
  field: string = "all"
): Promise<CalibrationData | null> {
  // Fetch all outcomes for this country/tier/field
  const outcomes = await prisma.admissionOutcome.findMany({
    where: {
      programSnapshot: {
        path: ["country"],
        equals: country,
      },
    },
  });

  // Filter by tier and field in JS (JSONB queries have limits)
  const filtered = outcomes.filter((o) => {
    const prog = o.programSnapshot as unknown as ProgramSnapshot;
    const tier = rankingToTier(prog.qsRanking);
    if (tier !== programTier) return false;
    if (field !== "all" && prog.field !== field) return false;
    return true;
  });

  if (filtered.length < MIN_SAMPLE_THRESHOLD) return null;

  // Compute acceptance rates per score range
  const scoreRanges: CalibrationScoreRange[] = SCORE_RANGES.map(({ range, min, max }) => {
    const inRange = filtered.filter(
      (o) => o.matchScoreAtApplication >= min && o.matchScoreAtApplication < max
    );
    const accepted = inRange.filter((o) => o.decision === "accepted").length;
    const total = inRange.length;
    const actualRate = total > 0 ? accepted / total : 0;

    // Expected acceptance probability based on score range
    const midpoint = (min + max) / 2;
    const predicted =
      midpoint >= 80 ? 0.8 :
      midpoint >= 60 ? 0.55 :
      midpoint >= 40 ? 0.3 : 0.1;

    return {
      range,
      predicted,
      actual: Math.round(actualRate * 100) / 100,
      calibrationError: Math.round(Math.abs(predicted - actualRate) * 100) / 100,
      sampleSize: total,
    };
  });

  // Compute weight adjustments based on outcome analysis
  const weightAdjustments = computeWeightAdjustments(filtered);

  return {
    country,
    programTier,
    field,
    sampleSize: filtered.length,
    scoreRanges,
    weightAdjustments,
    lastUpdated: new Date().toISOString(),
  };
}

function computeWeightAdjustments(
  outcomes: Array<{
    decision: Decision;
    profileSnapshot: unknown;
    matchScoreAtApplication: number;
  }>
): WeightAdjustments {
  // Compare accepted vs rejected profiles to determine which factors
  // are most predictive of actual acceptance
  const accepted = outcomes.filter((o) => o.decision === "accepted");
  const rejected = outcomes.filter((o) => o.decision === "rejected");

  if (accepted.length < 3 || rejected.length < 3) {
    return { gpa: 1.0, englishTest: 1.0, gradTest: 1.0, workExp: 1.0, backlogs: 1.0 };
  }

  function avgField(
    group: typeof outcomes,
    getter: (snap: ProfileSnapshot) => number | null
  ): number {
    const vals = group
      .map((o) => getter(o.profileSnapshot as unknown as ProfileSnapshot))
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  // Compare means between accepted and rejected groups
  // A larger difference means the factor is more discriminative
  const gpaGap = avgField(accepted, (p) => p.gpa) - avgField(rejected, (p) => p.gpa);
  const ieltsGap = avgField(accepted, (p) => p.ielts) - avgField(rejected, (p) => p.ielts);
  const greGap = avgField(accepted, (p) => p.gre) - avgField(rejected, (p) => p.gre);
  const workGap = avgField(accepted, (p) => p.workExpMonths) - avgField(rejected, (p) => p.workExpMonths);
  const backlogGap = avgField(rejected, (p) => p.backlogs) - avgField(accepted, (p) => p.backlogs);

  // Convert gaps to adjustment multipliers (1.0 = no change)
  // Positive gap = accepted students had higher values = factor is predictive → increase weight
  function gapToMultiplier(gap: number, scale: number): number {
    const normalized = gap / scale; // normalize by typical range
    return Math.max(0.7, Math.min(1.3, 1.0 + normalized * 0.3));
  }

  return {
    gpa: Math.round(gapToMultiplier(gpaGap, 2.0) * 100) / 100,         // GPA on 10-scale, 2.0 is a meaningful gap
    englishTest: Math.round(gapToMultiplier(ieltsGap, 1.0) * 100) / 100, // 1.0 IELTS band difference
    gradTest: Math.round(gapToMultiplier(greGap, 15) * 100) / 100,       // 15 GRE points
    workExp: Math.round(gapToMultiplier(workGap, 12) * 100) / 100,       // 12 months difference
    backlogs: Math.round(gapToMultiplier(backlogGap, 3) * 100) / 100,    // 3 backlogs difference
  };
}

export async function getMLAdjustedWeights(
  country: string,
  qsRanking: number | null,
  field: string
): Promise<WeightAdjustments | null> {
  const tier = rankingToTier(qsRanking);

  // Try to fetch cached calibration
  const cached = await prisma.mLCalibration.findUnique({
    where: { country_programTier_field: { country, programTier: tier, field: "all" } },
  });

  if (!cached || cached.sampleSize < MIN_SAMPLE_THRESHOLD) return null;

  return cached.weightAdjustments as unknown as WeightAdjustments;
}

export async function refreshAllCalibrations(): Promise<number> {
  // Get all unique country/tier combinations from outcomes
  const outcomes = await prisma.admissionOutcome.findMany({
    select: { programSnapshot: true },
  });

  const combos = new Set<string>();
  for (const o of outcomes) {
    const prog = o.programSnapshot as unknown as ProgramSnapshot;
    const tier = rankingToTier(prog.qsRanking);
    combos.add(`${prog.country}|${tier}`);
  }

  let updated = 0;
  for (const combo of combos) {
    const [country, tier] = combo.split("|");
    const calibration = await computeCalibration(country, tier, "all");
    if (!calibration) continue;

    await prisma.mLCalibration.upsert({
      where: {
        country_programTier_field: { country, programTier: tier, field: "all" },
      },
      create: {
        country,
        programTier: tier,
        field: "all",
        sampleSize: calibration.sampleSize,
        calibrationData: calibration as never,
        weightAdjustments: calibration.weightAdjustments as never,
      },
      update: {
        sampleSize: calibration.sampleSize,
        calibrationData: calibration as never,
        weightAdjustments: calibration.weightAdjustments as never,
        computedAt: new Date(),
      },
    });
    updated++;
  }
  return updated;
}

// ─── Student Similarity Engine ──────────────────────────

function normalizeGpaTo10(gpa: number, scale: GpaScale): number {
  switch (scale) {
    case "scale_10": return gpa;
    case "scale_4": return gpa * 2.5;
    case "scale_100": return gpa / 10;
  }
}

export function computeFeatureVector(
  profile: AcademicProfile,
  preferences: Preferences
): { features: number[]; labels: string[] } {
  const labels = ["gpa", "ielts", "gre", "gmat", "workExpMonths", "backlogs", "budgetIndex"];
  const features = [
    normalizeGpaTo10(profile.gpa, profile.gpaScale) / 10,                              // 0-1
    profile.ieltsScore ? profile.ieltsScore / 9.0 : 0,                                 // 0-1
    profile.greScore ? (profile.greScore - 260) / 80 : 0,                              // 0-1 (260-340 range)
    profile.gmatScore ? profile.gmatScore / 800 : 0,                                   // 0-1
    Math.min(profile.workExperienceMonths, 60) / 60,                                   // 0-1, capped at 60 months
    1 - Math.min(profile.backlogs, 10) / 10,                                           // 0-1, inverted (0 backlogs = 1.0)
    BUDGET_INDEX[preferences.budgetRange] / 4,                                          // 0-1
  ];
  return { features, labels };
}

export async function recomputeStudentVector(userId: string): Promise<void> {
  const [profile, preferences] = await Promise.all([
    prisma.academicProfile.findUnique({ where: { userId } }),
    prisma.preferences.findUnique({ where: { userId } }),
  ]);
  if (!profile || !preferences) return;

  const { features, labels } = computeFeatureVector(profile, preferences);

  await prisma.studentVector.upsert({
    where: { userId },
    create: {
      userId,
      features,
      featureLabels: labels,
      country: preferences.targetCountries,
      field: preferences.targetField,
      degreeLevel: preferences.targetDegreeLevel,
    },
    update: {
      features,
      featureLabels: labels,
      country: preferences.targetCountries,
      field: preferences.targetField,
      degreeLevel: preferences.targetDegreeLevel,
    },
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function findSimilarStudents(
  userId: string,
  filters?: { country?: string; field?: string; limit?: number }
): Promise<PeerResult[]> {
  const myVector = await prisma.studentVector.findUnique({ where: { userId } });
  if (!myVector) return [];

  // Get all other vectors with overlapping field or country
  const candidates = await prisma.studentVector.findMany({
    where: {
      userId: { not: userId },
      ...(filters?.field ? { field: filters.field } : {}),
    },
  });

  // Compute similarity and sort
  const scored = candidates
    .map((c) => ({
      userId: c.userId,
      similarity: cosineSimilarity(myVector.features, c.features),
    }))
    .filter((s) => s.similarity > 0.6) // minimum similarity threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, filters?.limit ?? 20);

  if (scored.length === 0) return [];

  // Fetch outcomes for similar students
  const outcomes = await prisma.admissionOutcome.findMany({
    where: {
      application: {
        userId: { in: scored.map((s) => s.userId) },
      },
      ...(filters?.country
        ? { programSnapshot: { path: ["country"], equals: filters.country } }
        : {}),
    },
    include: { application: true },
  });

  return outcomes.map((o) => {
    const profile = o.profileSnapshot as unknown as ProfileSnapshot;
    const program = o.programSnapshot as unknown as ProgramSnapshot;
    const sim = scored.find((s) => s.userId === o.application.userId);
    return {
      similarity: Math.round((sim?.similarity ?? 0) * 100) / 100,
      gpa: `${profile.gpa}/${profile.gpaScale === "scale_4" ? "4" : profile.gpaScale === "scale_100" ? "100" : "10"}`,
      ielts: profile.ielts,
      gre: profile.gre,
      workExpMonths: profile.workExpMonths,
      outcome: o.decision,
      universityName: program.universityName,
      matchScore: o.matchScoreAtApplication,
    };
  });
}

export async function predictFromPeers(
  userId: string,
  programId: string
): Promise<PeerPrediction | null> {
  const [myVector, program, myApp] = await Promise.all([
    prisma.studentVector.findUnique({ where: { userId } }),
    prisma.program.findUnique({
      where: { id: programId },
      include: { university: true },
    }),
    prisma.application.findFirst({
      where: { userId, programId },
    }),
  ]);
  if (!myVector || !program) return null;

  const tier = rankingToTier(program.university.qsRanking);

  // Find similar students' outcomes for same university or same tier+country
  const allVectors = await prisma.studentVector.findMany({
    where: { userId: { not: userId } },
  });

  const similarUserIds = allVectors
    .map((v) => ({
      userId: v.userId,
      similarity: cosineSimilarity(myVector.features, v.features),
    }))
    .filter((s) => s.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 50)
    .map((s) => s.userId);

  if (similarUserIds.length === 0) return null;

  // Get outcomes for these users in same country+tier
  const outcomes = await prisma.admissionOutcome.findMany({
    where: {
      application: { userId: { in: similarUserIds } },
      programSnapshot: { path: ["country"], equals: program.university.country },
    },
  });

  // Filter by tier
  const tierFiltered = outcomes.filter((o) => {
    const prog = o.programSnapshot as unknown as ProgramSnapshot;
    return rankingToTier(prog.qsRanking) === tier;
  });

  if (tierFiltered.length < 3) return null;

  const accepted = tierFiltered.filter((o) => o.decision === "accepted").length;
  const rejected = tierFiltered.filter((o) => o.decision === "rejected").length;
  const waitlisted = tierFiltered.filter((o) => o.decision === "waitlisted").length;
  const avgScore = tierFiltered.reduce((sum, o) => sum + o.matchScoreAtApplication, 0) / tierFiltered.length;
  const rate = accepted / tierFiltered.length;

  const confidence: "high" | "medium" | "low" =
    tierFiltered.length >= 20 ? "high" :
    tierFiltered.length >= 10 ? "medium" : "low";

  const bucket =
    rate >= 0.7 ? "Safety" :
    rate >= 0.4 ? "Target" :
    rate >= 0.2 ? "Reach" : "Long Shot";

  return {
    peerCount: tierFiltered.length,
    acceptedCount: accepted,
    rejectedCount: rejected,
    waitlistedCount: waitlisted,
    acceptanceRate: Math.round(rate * 100) / 100,
    avgMatchScore: Math.round(avgScore),
    yourMatchScore: myApp?.matchScore ?? 0,
    prediction: `${bucket} - ${Math.round(rate * 100)}% acceptance rate based on ${tierFiltered.length} similar students`,
    confidence,
  };
}

// ─── Document Quality Scoring ───────────────────────────

export function quickScoreHeuristics(
  content: string,
  docType: AppDocType,
  universityName: string
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 70; // baseline

  const words = content.split(/\s+/).filter(Boolean).length;

  // Word count check
  if (docType === "sop" || docType === "motivation") {
    if (words < 400) {
      score -= 20;
      issues.push(`Too short (${words} words). Target 600-800 words.`);
    } else if (words < 600) {
      score -= 10;
      issues.push(`Slightly short (${words} words). Aim for 600-800 words.`);
    } else if (words > 1200) {
      score -= 10;
      issues.push(`Too long (${words} words). Most programs expect under 1000 words.`);
    }
  }

  // University name mentioned
  const uniLower = universityName.toLowerCase();
  if (!content.toLowerCase().includes(uniLower)) {
    score -= 15;
    issues.push(`Doesn't mention ${universityName} by name. This SOP appears generic.`);
  }

  // Generic opening detection
  const genericOpenings = [
    "since childhood",
    "since my childhood",
    "from a young age",
    "i have always been passionate",
    "i have always wanted",
    "ever since i was a child",
    "it has been my dream",
  ];
  const firstSentence = content.toLowerCase().slice(0, 200);
  for (const opening of genericOpenings) {
    if (firstSentence.includes(opening)) {
      score -= 10;
      issues.push("Opens with a generic/cliched phrase. Start with a specific hook instead.");
      break;
    }
  }

  // Check for professor/lab/course mentions (specificity)
  const specificityPatterns = [/prof\.|professor|dr\./i, /lab|laboratory|research group/i, /course|curriculum|module/i];
  let specifics = 0;
  for (const pattern of specificityPatterns) {
    if (pattern.test(content)) specifics++;
  }
  if (specifics === 0) {
    score -= 10;
    issues.push("No mentions of specific professors, labs, or courses. Add university-specific details.");
  } else if (specifics >= 2) {
    score += 5;
  }

  // Paragraph structure check
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 20);
  if (paragraphs.length < 3) {
    score -= 5;
    issues.push("Needs better paragraph structure. Use at least 4-5 paragraphs.");
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

export async function scoreDocument(
  content: string,
  docType: AppDocType,
  universityName: string,
  programName: string,
  country: string,
  profile: AcademicProfile
): Promise<DocumentQualityScore> {
  // Run quick heuristics first
  const heuristics = quickScoreHeuristics(content, docType, universityName);

  // Full AI-powered assessment
  const response = await anthropic.messages.create({
    model: INSIGHT_MODEL,
    max_tokens: 1000,
    temperature: 0.3,
    system: `You are an admissions committee reader reviewing a ${docType.toUpperCase()} for ${programName} at ${universityName} (${country}). Score the document on 6 dimensions (0-100 each) and provide specific feedback. Respond in JSON only.`,
    messages: [
      {
        role: "user",
        content: `Student Profile: GPA ${profile.gpa}/${profile.gpaScale}, ${profile.workExperienceMonths} months work experience, ${profile.backlogs} backlogs, studying ${profile.degreeName} at ${profile.collegeName}.

Document content:
---
${content.slice(0, 4000)}
---

Score this document as JSON:
{
  "specificity": <0-100, does it mention specific professors, labs, courses at ${universityName}?>,
  "universityFit": <0-100, how well does it connect the student's profile to THIS university specifically?>,
  "narrativeStrength": <0-100, is there a compelling personal story arc?>,
  "structure": <0-100, clear intro/body/conclusion with logical flow?>,
  "wordCount": <0-100, appropriate length for this document type?>,
  "weaknessAddressed": <0-100, does it proactively address profile gaps like low GPA or backlogs?>,
  "suggestions": [<3-5 specific improvement suggestions>],
  "strengths": [<2-3 things done well>],
  "estimatedImpact": "<one sentence on how improving this doc could affect admission chances>"
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    const aiOverall = Math.round(
      (parsed.specificity + parsed.universityFit + parsed.narrativeStrength +
       parsed.structure + parsed.wordCount + parsed.weaknessAddressed) / 6
    );

    // Blend AI score with heuristic score (70% AI, 30% heuristics)
    const blendedOverall = Math.round(aiOverall * 0.7 + heuristics.score * 0.3);

    return {
      overall: blendedOverall,
      dimensions: {
        specificity: parsed.specificity,
        universityFit: parsed.universityFit,
        narrativeStrength: parsed.narrativeStrength,
        structure: parsed.structure,
        wordCount: parsed.wordCount,
        weaknessAddressed: parsed.weaknessAddressed,
      },
      suggestions: [...(parsed.suggestions || []), ...heuristics.issues],
      strengths: parsed.strengths || [],
      estimatedImpact: parsed.estimatedImpact || "",
    };
  } catch {
    // Fallback to heuristics-only if AI parsing fails
    return {
      overall: heuristics.score,
      dimensions: {
        specificity: 50,
        universityFit: 50,
        narrativeStrength: 50,
        structure: 50,
        wordCount: heuristics.score,
        weaknessAddressed: 50,
      },
      suggestions: heuristics.issues,
      strengths: [],
      estimatedImpact: "Improve specificity and university fit to strengthen your application.",
    };
  }
}

// ─── Confidence Calibration ─────────────────────────────

export async function calibrateConfidence(
  matchScore: number,
  country: string,
  qsRanking: number | null,
  field: string
): Promise<ConfidenceCalibration> {
  const tier = rankingToTier(qsRanking);

  const cached = await prisma.mLCalibration.findUnique({
    where: { country_programTier_field: { country, programTier: tier, field: "all" } },
  });

  // Default prediction based on score
  const rawProbability =
    matchScore >= 80 ? 0.8 :
    matchScore >= 60 ? 0.55 :
    matchScore >= 40 ? 0.3 : 0.1;

  if (!cached || cached.sampleSize < MIN_SAMPLE_THRESHOLD) {
    return {
      adjustedProbability: rawProbability,
      rawProbability,
      confidence: "low",
      basedOnN: 0,
      calibrationNote: "Not enough historical data yet. Prediction based on research-derived weights.",
    };
  }

  const data = cached.calibrationData as unknown as CalibrationData;

  // Find the matching score range
  const range = data.scoreRanges.find((r) => {
    const [min, max] = r.range.split("-").map(Number);
    return matchScore >= min && matchScore < max;
  });

  const adjustedProbability = range && range.sampleSize >= 3
    ? range.actual
    : rawProbability;

  const confidence: "high" | "medium" | "low" =
    cached.sampleSize >= 50 ? "high" :
    cached.sampleSize >= 20 ? "medium" : "low";

  const overUnder = adjustedProbability > rawProbability ? "conservative" : "optimistic";

  return {
    adjustedProbability: Math.round(adjustedProbability * 100) / 100,
    rawProbability,
    confidence,
    basedOnN: cached.sampleSize,
    calibrationNote: `Based on ${cached.sampleSize} outcomes. Our predictions for ${country} ${tier.replace("_", " ")} universities have been slightly ${overUnder}.`,
  };
}
