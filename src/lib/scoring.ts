import type {
  AcademicProfile,
  Preferences,
  Program,
  University,
  GpaScale,
  BudgetRange,
} from "@/generated/prisma/client";
import type { ConfidenceCalibration, WeightAdjustments } from "@/lib/ai/ml-engine";

// ─── Types ──────────────────────────────────────────────

export interface MatchBreakdown {
  gpaScore: number;
  gpaPass: boolean;
  ieltsScore: number;
  ieltsPass: boolean;
  greScore: number;
  grePass: boolean;
  countryMatch: boolean;
  budgetFit: boolean;
  fieldMatch: boolean;
  backlogsOk: boolean;
  workExpScore: number;
  overallScore: number;
  calibration?: ConfidenceCalibration;
  mlAdjusted?: boolean;
}

export interface ScoredProgram {
  program: Program;
  university: University;
  matchScore: number;
  breakdown: MatchBreakdown;
  badge: string;
  badgeColor: string;
}

// ─── Helpers ────────────────────────────────────────────

function normalizeGpaTo10(gpa: number, scale: GpaScale): number {
  switch (scale) {
    case "scale_10":
      return gpa;
    case "scale_4":
      return gpa * 2.5;
    case "scale_100":
      return gpa / 10;
  }
}

const budgetMaxINR: Record<BudgetRange, number> = {
  under_5L: 500_000,
  five_10L: 1_000_000,
  ten_20L: 2_000_000,
  twenty_40L: 4_000_000,
  above_40L: Infinity,
};

const currencyToINR: Record<string, number> = {
  EUR: 90,
  USD: 83,
  GBP: 105,
  AUD: 55,
  CAD: 62,
  INR: 1,
  SGD: 62,
  NZD: 50,
  CHF: 95,
  SEK: 8,
};

const relatedFields: Record<string, string[]> = {
  "Computer Science": ["Data Science / AI", "Information Technology", "Software Engineering", "Cybersecurity"],
  "Data Science / AI": ["Computer Science", "Information Technology", "Statistics"],
  "Information Technology": ["Computer Science", "Data Science / AI", "Software Engineering", "Cybersecurity"],
  "Software Engineering": ["Computer Science", "Information Technology"],
  "Cybersecurity": ["Computer Science", "Information Technology"],
  "Statistics": ["Data Science / AI", "Mathematics"],
  "Mathematics": ["Statistics", "Data Science / AI"],
  "Mechanical Engineering": ["Civil Engineering", "Aerospace Engineering"],
  "Civil Engineering": ["Mechanical Engineering", "Environmental Engineering"],
  "Aerospace Engineering": ["Mechanical Engineering"],
  "Environmental Engineering": ["Civil Engineering"],
  "Electrical Engineering": ["Computer Science", "Electronics"],
  "Electronics": ["Electrical Engineering", "Computer Science"],
  "Business / MBA": ["Management", "Finance / Economics", "Marketing"],
  "Management": ["Business / MBA", "Finance / Economics", "Marketing"],
  "Finance / Economics": ["Business / MBA", "Management"],
  "Marketing": ["Business / MBA", "Management"],
  "Biotechnology": ["Life Sciences", "Biomedical Engineering"],
  "Life Sciences": ["Biotechnology", "Biomedical Engineering"],
  "Biomedical Engineering": ["Biotechnology", "Life Sciences"],
  "Architecture": ["Urban Planning"],
  "Urban Planning": ["Architecture"],
  "Psychology": ["Public Health"],
  "Public Health": ["Psychology", "Life Sciences"],
};

// ─── Country-Specific Weight Profiles ──────────────────
// Based on published admissions research (Posselt 2016, NAGAP surveys,
// Mohan et al. 2019 UCLA dataset, institutional guidelines).

interface CountryWeights {
  gpa: number;
  englishTest: number;
  gradTest: number;     // GRE/GMAT
  sop: number;          // SOP/personal statement quality (estimated)
  lor: number;          // letter of recommendation strength (estimated)
  workExp: number;
  backlogs: number;
  fieldMatch: number;
  budget: number;
  backlogTolerance: "strict" | "moderate" | "lenient";
  sopImportance: "critical" | "high" | "medium" | "low";
  lorImportance: "critical" | "high" | "medium" | "low";
}

const COUNTRY_WEIGHTS: Record<string, CountryWeights> = {
  "United States": {
    gpa: 0.25, englishTest: 0.08, gradTest: 0.12, sop: 0.15, lor: 0.12,
    workExp: 0.08, backlogs: 0.05, fieldMatch: 0.08, budget: 0.07,
    backlogTolerance: "moderate", sopImportance: "critical", lorImportance: "critical",
  },
  "United Kingdom": {
    gpa: 0.40, englishTest: 0.10, gradTest: 0.03, sop: 0.12, lor: 0.08,
    workExp: 0.07, backlogs: 0.05, fieldMatch: 0.08, budget: 0.07,
    backlogTolerance: "lenient", sopImportance: "medium", lorImportance: "medium",
  },
  "Canada": {
    gpa: 0.30, englishTest: 0.10, gradTest: 0.05, sop: 0.12, lor: 0.10,
    workExp: 0.08, backlogs: 0.08, fieldMatch: 0.08, budget: 0.09,
    backlogTolerance: "moderate", sopImportance: "high", lorImportance: "high",
  },
  "Germany": {
    gpa: 0.45, englishTest: 0.10, gradTest: 0.03, sop: 0.05, lor: 0.05,
    workExp: 0.04, backlogs: 0.15, fieldMatch: 0.08, budget: 0.05,
    backlogTolerance: "strict", sopImportance: "low", lorImportance: "low",
  },
  "Australia": {
    gpa: 0.38, englishTest: 0.12, gradTest: 0.03, sop: 0.07, lor: 0.07,
    workExp: 0.10, backlogs: 0.05, fieldMatch: 0.08, budget: 0.10,
    backlogTolerance: "lenient", sopImportance: "low", lorImportance: "low",
  },
  "Ireland": {
    gpa: 0.35, englishTest: 0.10, gradTest: 0.03, sop: 0.10, lor: 0.08,
    workExp: 0.08, backlogs: 0.06, fieldMatch: 0.08, budget: 0.12,
    backlogTolerance: "lenient", sopImportance: "medium", lorImportance: "medium",
  },
  "Netherlands": {
    gpa: 0.38, englishTest: 0.10, gradTest: 0.03, sop: 0.10, lor: 0.07,
    workExp: 0.07, backlogs: 0.05, fieldMatch: 0.10, budget: 0.10,
    backlogTolerance: "lenient", sopImportance: "medium", lorImportance: "low",
  },
  "Singapore": {
    gpa: 0.35, englishTest: 0.08, gradTest: 0.12, sop: 0.10, lor: 0.08,
    workExp: 0.07, backlogs: 0.08, fieldMatch: 0.05, budget: 0.07,
    backlogTolerance: "strict", sopImportance: "high", lorImportance: "medium",
  },
  "New Zealand": {
    gpa: 0.35, englishTest: 0.12, gradTest: 0.03, sop: 0.08, lor: 0.07,
    workExp: 0.10, backlogs: 0.05, fieldMatch: 0.08, budget: 0.12,
    backlogTolerance: "lenient", sopImportance: "medium", lorImportance: "low",
  },
};

const DEFAULT_WEIGHTS: CountryWeights = {
  gpa: 0.30, englishTest: 0.10, gradTest: 0.08, sop: 0.10, lor: 0.08,
  workExp: 0.08, backlogs: 0.08, fieldMatch: 0.08, budget: 0.10,
  backlogTolerance: "moderate", sopImportance: "medium", lorImportance: "medium",
};

function getCountryWeights(country: string): CountryWeights {
  return COUNTRY_WEIGHTS[country] ?? DEFAULT_WEIGHTS;
}

// ─── Country-Specific Alerts ───────────────────────────
// Real regulatory/process requirements that students must know about.

export interface CountryAlert {
  type: "mandatory_document" | "visa_requirement" | "regulatory" | "financial";
  title: string;
  description: string;
  severity: "blocker" | "warning" | "info";
}

function getCountryAlerts(country: string, _academic: AcademicProfile): CountryAlert[] {
  const alerts: CountryAlert[] = [];

  switch (country) {
    case "Germany":
      alerts.push({
        type: "mandatory_document",
        title: "APS Certificate Required",
        description: "Indian students MUST obtain an APS (Akademische Prüfstelle) certificate from the German embassy. This involves document verification and an interview about your coursework. Apply 4-8 weeks in advance. Without APS, your application cannot be processed.",
        severity: "blocker",
      });
      alerts.push({
        type: "financial",
        title: "Blocked Account (Sperrkonto) Required",
        description: "You must open a blocked account with €11,904/year before applying for a visa. No tuition fees at most public universities (except Baden-Württemberg: €1,500/semester for non-EU students).",
        severity: "warning",
      });
      break;
    case "United Kingdom":
      alerts.push({
        type: "regulatory",
        title: "ATAS Clearance May Be Required",
        description: "For certain sensitive subjects (aerospace, nuclear, advanced materials, some engineering/physics), Indian students need ATAS (Academic Technology Approval Scheme) clearance. Apply 4-6 weeks before visa. Check if your specific program requires it.",
        severity: "warning",
      });
      alerts.push({
        type: "financial",
        title: "Maintenance Funds Required",
        description: "Visa requires showing tuition + living costs (London: £1,334/month × 9, Outside London: £1,023/month × 9) held for 28 consecutive days before visa application.",
        severity: "info",
      });
      break;
    case "Canada":
      alerts.push({
        type: "regulatory",
        title: "Provincial Attestation Letter Required",
        description: "Since 2024, study permit applications require a Provincial Attestation Letter (PAL). Processing times are 8-16 weeks. The Student Direct Stream (SDS) has been discontinued.",
        severity: "warning",
      });
      alerts.push({
        type: "mandatory_document",
        title: "WES Credential Evaluation",
        description: "Many Canadian universities require WES (World Education Services) evaluation of your Indian transcripts. WES may deflate your GPA — a 75% in India often converts to 3.0-3.2/4.0 on WES scale.",
        severity: "info",
      });
      break;
    case "Australia":
      alerts.push({
        type: "visa_requirement",
        title: "GTE Statement Required",
        description: "Your visa application requires a Genuine Temporary Entrant (GTE) statement explaining why this course, why Australia, and your ties to your home country. Weak GTE statements are a common visa rejection reason.",
        severity: "warning",
      });
      alerts.push({
        type: "financial",
        title: "OSHC (Health Cover) Mandatory",
        description: "Overseas Student Health Cover (~AUD 500-700/year) is mandatory and must be arranged before visa application. Show tuition + AUD 24,505/year for living costs.",
        severity: "info",
      });
      break;
    case "Singapore":
      alerts.push({
        type: "financial",
        title: "Tuition Grant Available (with Bond)",
        description: "Singapore government offers tuition grants reducing fees by 40-60%. In return, you must work in Singapore for 3 years after graduation. This is a significant financial advantage but a binding commitment.",
        severity: "info",
      });
      break;
  }

  return alerts;
}

// ─── Score Components ───────────────────────────────────

function scoreGpa(
  studentGpa: number,
  studentScale: GpaScale,
  minGpa: number | null,
  minGpaScale: GpaScale | null,
  avgAdmitGpa: number | null
): { score: number; pass: boolean } {
  if (minGpa == null) return { score: 100, pass: true };

  const normalized = normalizeGpaTo10(studentGpa, studentScale);
  const targetScale = minGpaScale ?? studentScale;
  const normalizedMin = normalizeGpaTo10(minGpa, targetScale);

  const pass = normalized >= normalizedMin;
  const gap = normalizedMin - normalized;

  let score: number;
  if (pass) {
    score = 100;
    if (avgAdmitGpa != null) {
      const normalizedAvg = normalizeGpaTo10(avgAdmitGpa, targetScale);
      if (normalized >= normalizedAvg) score = 100;
      else score = Math.max(85, 100 - (normalizedAvg - normalized) * 10);
    }
  } else {
    score = Math.max(0, 100 - gap * 20);
  }

  return { score, pass };
}

function scoreIelts(
  ielts: number | null | undefined,
  toefl: number | null | undefined,
  pte: number | null | undefined,
  minIelts: number | null,
  minToefl: number | null | undefined,
  minPte: number | null | undefined
): { score: number; pass: boolean } {
  if (minIelts == null && minToefl == null && minPte == null) {
    return { score: 100, pass: true };
  }

  if (ielts != null && minIelts != null) {
    const pass = ielts >= minIelts;
    const gap = minIelts - ielts;
    return { score: pass ? 100 : Math.max(0, 100 - gap * 30), pass };
  }

  if (toefl != null && minToefl != null) {
    const pass = toefl >= minToefl;
    const gap = minToefl - toefl;
    return { score: pass ? 100 : Math.max(0, 100 - gap * 2), pass };
  }

  if (pte != null && minPte != null) {
    const pass = pte >= minPte;
    const gap = minPte - pte;
    return { score: pass ? 100 : Math.max(0, 100 - gap * 2), pass };
  }

  let studentIelts = ielts ?? null;
  if (studentIelts == null && toefl != null) {
    studentIelts = Math.min(9, Math.max(4, (toefl - 20) / 12.5));
  }
  if (studentIelts == null && pte != null) {
    studentIelts = Math.min(9, Math.max(4, pte / 10));
  }

  const effectiveMin = minIelts ?? (minToefl != null ? Math.min(9, Math.max(4, (minToefl - 20) / 12.5)) : null);

  if (studentIelts == null || effectiveMin == null) return { score: 50, pass: false };

  const pass = studentIelts >= effectiveMin;
  const gap = effectiveMin - studentIelts;
  return { score: pass ? 100 : Math.max(0, 100 - gap * 30), pass };
}

function scoreGre(
  studentGre: number | null | undefined,
  studentGmat: number | null | undefined,
  minGre: number | null,
  minGmat: number | null | undefined,
  requiresGre: boolean,
  requiresGmat: boolean,
  avgAdmitGre: number | null | undefined
): { score: number; pass: boolean } {
  if (!requiresGre && !requiresGmat && minGre == null && minGmat == null) {
    return { score: 100, pass: true };
  }

  if (minGre != null || requiresGre) {
    let effectiveGre = studentGre ?? null;
    if (effectiveGre == null && studentGmat != null) {
      effectiveGre = Math.round(260 + (studentGmat / 800) * 80);
    }

    if (effectiveGre == null) return { score: 30, pass: false };

    const threshold = minGre ?? 300;
    const pass = effectiveGre >= threshold;

    let score: number;
    if (pass) {
      score = 100;
      if (avgAdmitGre != null && effectiveGre < avgAdmitGre) {
        score = Math.max(80, 100 - (avgAdmitGre - effectiveGre));
      }
    } else {
      score = Math.max(0, 100 - (threshold - effectiveGre) * 2);
    }

    return { score, pass };
  }

  if (minGmat != null || requiresGmat) {
    let effectiveGmat = studentGmat ?? null;
    if (effectiveGmat == null && studentGre != null) {
      effectiveGmat = Math.round(((studentGre - 260) / 80) * 800);
    }

    if (effectiveGmat == null) return { score: 30, pass: false };

    const threshold = minGmat ?? 500;
    const pass = effectiveGmat >= threshold;
    const gap = threshold - effectiveGmat;
    return { score: pass ? 100 : Math.max(0, 100 - gap * 0.5), pass };
  }

  return { score: 100, pass: true };
}

function scoreCountryBudget(
  preferences: Preferences,
  program: Program & { university: University }
): { countryMatch: boolean; budgetFit: boolean; score: number } {
  const countryMatch = preferences.targetCountries.includes(
    program.university.country
  );

  const rate = currencyToINR[program.tuitionCurrency] ?? 83;
  const annualINR = program.tuitionAnnual * rate;
  const maxBudget = budgetMaxINR[preferences.budgetRange];
  const budgetFit = annualINR <= maxBudget;

  let score = 0;
  if (countryMatch) score += 50;
  if (budgetFit) score += 50;
  else {
    const ratio = annualINR / maxBudget;
    if (ratio <= 1.3) score += 35;
    else if (ratio <= 1.5) score += 20;
  }

  return { countryMatch, budgetFit, score };
}

function scoreField(
  targetField: string,
  programField: string
): { match: boolean; score: number } {
  if (programField === targetField) return { match: true, score: 100 };
  const related = relatedFields[targetField] ?? [];
  if (related.includes(programField)) return { match: true, score: 60 };
  return { match: false, score: 0 };
}

function scoreAcceptance(acceptanceRate: number | null): number {
  if (acceptanceRate == null) return 50;
  return Math.min(100, acceptanceRate * 2.5);
}

function scoreWorkExperience(
  workMonths: number,
  degreeLevel: string,
  minWorkExpMonths: number | null | undefined
): number {
  if (minWorkExpMonths != null && minWorkExpMonths > 0) {
    if (workMonths >= minWorkExpMonths) return 100;
    if (workMonths > 0) return Math.max(30, (workMonths / minWorkExpMonths) * 80);
    return 15;
  }

  if (degreeLevel === "mba") {
    if (workMonths >= 36) return 100;
    if (workMonths >= 24) return 85;
    if (workMonths >= 12) return 60;
    if (workMonths > 0) return 40;
    return 20;
  }

  if (workMonths >= 24) return 100;
  if (workMonths >= 12) return 80;
  if (workMonths > 0) return 65;
  return 50;
}

function scoreBacklogs(
  studentBacklogs: number,
  backlogsAllowed: number | null | undefined
): { ok: boolean; score: number } {
  if (backlogsAllowed == null) {
    if (studentBacklogs === 0) return { ok: true, score: 100 };
    if (studentBacklogs <= 2) return { ok: true, score: 80 };
    return { ok: true, score: 60 };
  }

  if (studentBacklogs <= backlogsAllowed) return { ok: true, score: 100 };

  const excess = studentBacklogs - backlogsAllowed;
  return {
    ok: false,
    score: Math.max(0, 80 - excess * 20),
  };
}

// ─── Main Scoring Function ──────────────────────────────

export function computeMatchScore(
  academic: AcademicProfile,
  preferences: Preferences,
  program: Program & { university: University },
  mlAdjustments?: WeightAdjustments | null,
  calibration?: ConfidenceCalibration
): { score: number; breakdown: MatchBreakdown } {
  const gpa = scoreGpa(
    academic.gpa,
    academic.gpaScale,
    program.minGpa,
    (program as Record<string, unknown>).minGpaScale as GpaScale | null ?? null,
    (program as Record<string, unknown>).avgAdmitGpa as number | null ?? null
  );

  const ielts = scoreIelts(
    academic.ieltsScore,
    academic.toeflScore,
    academic.pteScore,
    program.minIelts,
    (program as Record<string, unknown>).minToefl as number | null | undefined,
    (program as Record<string, unknown>).minPte as number | null | undefined
  );

  const gre = scoreGre(
    academic.greScore,
    academic.gmatScore,
    program.minGre,
    (program as Record<string, unknown>).minGmat as number | null | undefined,
    (program as Record<string, unknown>).requiresGre as boolean ?? false,
    (program as Record<string, unknown>).requiresGmat as boolean ?? false,
    (program as Record<string, unknown>).avgAdmitGre as number | null | undefined
  );

  const cb = scoreCountryBudget(preferences, program);
  const field = scoreField(preferences.targetField, program.field);
  const acceptance = scoreAcceptance(program.university.acceptanceRate);

  const workExp = scoreWorkExperience(
    academic.workExperienceMonths,
    program.degreeLevel,
    (program as Record<string, unknown>).minWorkExpMonths as number | null | undefined
  );

  const backlogs = scoreBacklogs(
    academic.backlogs,
    (program as Record<string, unknown>).backlogsAllowed as number | null | undefined
  );

  // Use country-specific weights, optionally adjusted by ML
  const cw = getCountryWeights(program.university.country);
  const isMba = program.degreeLevel === "mba";
  const hasML = !!mlAdjustments;

  // Apply ML weight adjustments if available (multiply base weights by adjustment factor)
  const mlGpa = mlAdjustments?.gpa ?? 1.0;
  const mlEnglish = mlAdjustments?.englishTest ?? 1.0;
  const mlGrad = mlAdjustments?.gradTest ?? 1.0;
  const mlWork = mlAdjustments?.workExp ?? 1.0;
  const mlBacklogs = mlAdjustments?.backlogs ?? 1.0;

  // Adjust weights for MBA + apply ML multipliers
  const gpaWeight = (isMba ? cw.gpa * 0.8 : cw.gpa) * mlGpa;
  const englishWeight = cw.englishTest * mlEnglish;
  const gradWeight = cw.gradTest * mlGrad;
  const workWeight = (isMba ? Math.max(cw.workExp, 0.15) : cw.workExp) * mlWork;
  const backlogWeight = cw.backlogs * mlBacklogs;

  // Normalize weights so they still sum correctly
  const rawSum = gpaWeight + englishWeight + gradWeight + cw.budget + cw.fieldMatch + 0.05 + workWeight + backlogWeight + cw.sop + cw.lor;
  const scale = rawSum > 0 ? 1.0 / rawSum : 1.0;

  const overall = Math.round(
    (gpa.score * gpaWeight +
    ielts.score * englishWeight +
    gre.score * gradWeight +
    cb.score * cw.budget +
    field.score * cw.fieldMatch +
    acceptance * 0.05 +
    workExp * workWeight +
    backlogs.score * backlogWeight +
    // SOP/LOR estimated score (we don't have this data, so use neutral 70)
    70 * cw.sop +
    70 * cw.lor) * scale
  );

  return {
    score: overall,
    breakdown: {
      gpaScore: Math.round(gpa.score),
      gpaPass: gpa.pass,
      ieltsScore: Math.round(ielts.score),
      ieltsPass: ielts.pass,
      greScore: Math.round(gre.score),
      grePass: gre.pass,
      countryMatch: cb.countryMatch,
      budgetFit: cb.budgetFit,
      fieldMatch: field.match,
      backlogsOk: backlogs.ok,
      workExpScore: Math.round(workExp),
      overallScore: overall,
      calibration,
      mlAdjusted: hasML,
    },
  };
}

// ─── Badge Logic ────────────────────────────────────────

export function getBadge(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "STRONG MATCH", color: "bg-tertiary-fixed text-tertiary" };
  if (score >= 75) return { label: "GOOD FIT", color: "bg-secondary-fixed text-secondary" };
  if (score >= 50) return { label: "MODERATE", color: "bg-surface-container text-primary" };
  return { label: "REACH", color: "bg-surface-container text-on-surface-variant" };
}

// ─── Strategic Bucketing ────────────────────────────────

export type AdmissionBucket = "safety" | "target" | "reach" | "long_shot";

export function getBucket(score: number, acceptanceRate: number | null): AdmissionBucket {
  const effectiveScore = acceptanceRate != null && acceptanceRate < 15
    ? score * 0.85
    : acceptanceRate != null && acceptanceRate < 30
    ? score * 0.92
    : score;

  if (effectiveScore >= 80) return "safety";
  if (effectiveScore >= 60) return "target";
  if (effectiveScore >= 40) return "reach";
  return "long_shot";
}

export function getBucketLabel(bucket: AdmissionBucket): { label: string; emoji: string; advice: string } {
  switch (bucket) {
    case "safety":
      return { label: "SAFETY", emoji: "shield", advice: "High confidence of admission. Include 2-3 of these." };
    case "target":
      return { label: "TARGET", emoji: "target", advice: "Realistic chance. Should be the core of your portfolio (3-4 schools)." };
    case "reach":
      return { label: "REACH", emoji: "rocket_launch", advice: "Competitive. Worth trying if profile has unique strengths. Apply to 2-3." };
    case "long_shot":
      return { label: "LONG SHOT", emoji: "warning", advice: "Significant gaps. Only if you have exceptional extenuating factors." };
  }
}

// ─── Profile Strength Analysis ──────────────────────────

export interface ProfileStrength {
  archetype: string;
  archetypeDescription: string;
  overallStrength: "strong" | "competitive" | "moderate" | "needs_work";
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  completeness: number;
}

export function analyzeProfileStrength(
  academic: AcademicProfile,
  preferences: Preferences | null
): ProfileStrength {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  const normalizedGpa = normalizeGpaTo10(academic.gpa, academic.gpaScale);

  if (normalizedGpa >= 8.5) strengths.push(`Strong GPA (${academic.gpa}/${academic.gpaScale === "scale_4" ? "4.0" : academic.gpaScale === "scale_10" ? "10" : "100"}) — competitive for top-50 universities`);
  else if (normalizedGpa >= 7.0) strengths.push(`Good GPA (${academic.gpa}) — competitive for top-100 universities`);
  else if (normalizedGpa >= 6.0) weaknesses.push(`Below-average GPA (${academic.gpa}) — limits options at top-ranked schools. Compensate with test scores or work experience.`);
  else { weaknesses.push(`Low GPA (${academic.gpa}) — significant limitation. Consider pathway programs or universities with holistic review.`); recommendations.push("Look into bridge/pathway programs or universities that emphasize work experience over GPA"); }

  if (academic.ieltsScore && academic.ieltsScore >= 7.5) strengths.push(`Excellent IELTS (${academic.ieltsScore}) — opens all programs`);
  else if (academic.ieltsScore && academic.ieltsScore >= 6.5) strengths.push(`Adequate IELTS (${academic.ieltsScore}) — meets most requirements`);
  else if (academic.ieltsScore && academic.ieltsScore < 6.5) { weaknesses.push(`Low IELTS (${academic.ieltsScore}) — many programs require 6.5+`); recommendations.push("Retake IELTS targeting 7.0+. Focus on weak band."); }
  else if (!academic.ieltsScore && !academic.toeflScore && !academic.pteScore) { weaknesses.push("No English test score on file"); recommendations.push("Take IELTS/TOEFL immediately — required for virtually all programs"); }

  if (academic.greScore && academic.greScore >= 320) strengths.push(`Strong GRE (${academic.greScore}) — competitive for top US programs`);
  else if (academic.greScore && academic.greScore >= 310) strengths.push(`Good GRE (${academic.greScore}) — meets most requirements`);
  else if (academic.greScore && academic.greScore < 300) { weaknesses.push(`Below-average GRE (${academic.greScore})`); recommendations.push("Consider retaking GRE or applying to GRE-optional programs"); }

  if (academic.workExperienceMonths >= 36) strengths.push(`Strong work experience (${Math.round(academic.workExperienceMonths / 12)} years) — valuable for MBA/professional programs`);
  else if (academic.workExperienceMonths >= 12) strengths.push(`Some work experience (${academic.workExperienceMonths} months)`);
  else if (academic.workExperienceMonths === 0) weaknesses.push("No work experience — limits MBA options and some professional masters");

  if (academic.backlogs === 0) strengths.push("Clean academic record (no backlogs)");
  else if (academic.backlogs <= 2) weaknesses.push(`${academic.backlogs} backlog(s) — manageable but limits some programs (especially in Germany)`);
  else { weaknesses.push(`${academic.backlogs} backlogs — significant limitation`); recommendations.push("Apply to programs that explicitly allow backlogs. Address in SOP with improvement narrative."); }

  let complete = 0;
  if (academic.gpa) complete += 15;
  if (academic.degreeName && academic.degreeName !== "Not specified") complete += 10;
  if (academic.collegeName && academic.collegeName !== "Not specified") complete += 10;
  if (academic.ieltsScore || academic.toeflScore || academic.pteScore) complete += 20;
  if (academic.greScore || academic.gmatScore) complete += 10;
  if (academic.workExperienceMonths > 0) complete += 10;
  if (preferences?.targetCountries?.length) complete += 10;
  if (preferences?.targetField) complete += 5;
  if (preferences?.careerGoals) complete += 5;
  if (preferences?.budgetRange) complete += 5;

  let archetype = "Standard Applicant";
  let archetypeDescription = "Well-rounded profile suitable for a range of programs.";

  if (normalizedGpa >= 8.5 && (academic.greScore ?? 0) >= 320 && academic.workExperienceMonths < 12) {
    archetype = "Academic Star";
    archetypeDescription = "High scores, limited work exp. Strong for research programs and scholarships. Target research universities.";
  } else if (normalizedGpa < 7.0 && academic.workExperienceMonths >= 36) {
    archetype = "Experienced Professional";
    archetypeDescription = "Career experience compensates for moderate academics. Strong for MBA and professional masters. Lead SOP with career narrative.";
  } else if (normalizedGpa < 6.5 && academic.workExperienceMonths < 12) {
    archetype = "Needs Strategic Positioning";
    archetypeDescription = "Below-average academics without strong compensating factors. Focus on affordable destinations (Germany), pathway programs, or programs with holistic review.";
  } else if (academic.workExperienceMonths >= 60) {
    archetype = "Senior Professional";
    archetypeDescription = "Extensive experience. MBA or executive programs ideal. Some programs may see overqualification for standard masters.";
  } else if (academic.backlogs >= 5) {
    archetype = "Backlog Recovery";
    archetypeDescription = "Multiple backlogs require careful school selection. Target programs that explicitly accept backlogs. Strong SOP explaining recovery arc is critical.";
  }

  const overallStrength =
    strengths.length >= 4 ? "strong" :
    strengths.length >= 2 && weaknesses.length <= 1 ? "competitive" :
    weaknesses.length <= 2 ? "moderate" : "needs_work";

  return {
    archetype,
    archetypeDescription,
    overallStrength,
    strengths,
    weaknesses,
    recommendations,
    completeness: complete,
  };
}

// ─── Comprehensive Admission Audit ─────────────────────
// Research-backed evaluation using country-specific weights,
// hard filter detection, and sigmoid probability mapping.
// Sources: Posselt 2016, NAGAP surveys, Mohan et al. 2019,
// institutional admission guidelines, NACAC data.

export interface AuditParameter {
  name: string;
  category: "academic" | "test_score" | "experience" | "documents" | "financial" | "soft_factor";
  studentValue: string;
  requiredValue: string;
  status: "exceeds" | "meets" | "borderline" | "below" | "missing" | "not_required" | "auto_reject";
  score: number; // 0-100
  gap: string | null;
  weight: number; // actual weight for this country (percentage)
  recommendation: string | null;
  isHardFilter: boolean; // if true, failing this = likely auto-rejection
}

export interface AuditRoadmapItem {
  priority: "critical" | "high" | "medium" | "low" | "optional";
  title: string;
  description: string;
  impact: string;
  actionable: boolean;
  timeEstimate?: string; // how long this takes to fix
}

export interface AdmissionAudit {
  overallScore: number;
  admissionProbability: { low: number; high: number; label: string };
  parameters: AuditParameter[];
  hardFiltersFailed: string[];
  roadmap: AuditRoadmapItem[];
  strengths: string[];
  risks: string[];
  countryAlerts: CountryAlert[];
  verdict: string;
  confidenceNote: string;
  countryContext: string; // how this country evaluates applications
  sopWeight: string; // how important SOP is for this country
  lorWeight: string; // how important LOR is for this country
}

export function generateAdmissionAudit(
  academic: AcademicProfile,
  preferences: Preferences,
  program: Program & { university: University }
): AdmissionAudit {
  const parameters: AuditParameter[] = [];
  const roadmap: AuditRoadmapItem[] = [];
  const strengths: string[] = [];
  const risks: string[] = [];
  const hardFiltersFailed: string[] = [];

  const prog = program as Record<string, unknown>;
  const country = program.university.country;
  const cw = getCountryWeights(country);
  const normalizedStudentGpa = normalizeGpaTo10(academic.gpa, academic.gpaScale);
  const isMba = program.degreeLevel === "mba";

  // ── 1. GPA (Hard Filter + Scored) ──
  const minGpa = program.minGpa;
  const minGpaScale = (prog.minGpaScale as GpaScale | null) ?? academic.gpaScale;
  const avgAdmitGpa = prog.avgAdmitGpa as number | null;

  if (minGpa != null) {
    const normalizedMin = normalizeGpaTo10(minGpa, minGpaScale);
    const normalizedAvg = avgAdmitGpa != null ? normalizeGpaTo10(avgAdmitGpa, minGpaScale) : null;
    const gpaScale = academic.gpaScale === "scale_4" ? "4.0" : academic.gpaScale === "scale_10" ? "10" : "100";

    let status: AuditParameter["status"];
    let gpaScore: number;
    let gap: string | null = null;
    let recommendation: string | null = null;

    const excedsAvg = normalizedAvg != null
      ? normalizedStudentGpa >= normalizedAvg
      : normalizedStudentGpa >= normalizedMin + 0.5;

    if (excedsAvg) {
      status = "exceeds";
      gpaScore = 100;
      strengths.push(`GPA ${academic.gpa}/${gpaScale} ${normalizedAvg != null ? "at or above average admitted student GPA" : "comfortably above the minimum requirement"}`);
    } else if (normalizedStudentGpa >= normalizedMin) {
      // Meets minimum but check how far from average
      if (normalizedAvg != null && normalizedStudentGpa < normalizedAvg - 0.3) {
        status = "borderline";
        gpaScore = Math.max(60, 100 - (normalizedAvg - normalizedStudentGpa) * 15);
        gap = `GPA meets minimum (${minGpa}) but is significantly below average admit GPA (~${avgAdmitGpa}). Most admitted students have higher GPAs.`;
        recommendation = country === "United States"
          ? "In the US, a borderline GPA can be offset by a strong SOP, research experience, and excellent LORs. Focus on these."
          : country === "Germany"
          ? "Germany is heavily GPA-driven. A borderline GPA is a significant disadvantage — consider programs with lower GPA thresholds."
          : "Compensate with strong supporting documents and test scores.";
      } else {
        status = "meets";
        gpaScore = normalizedAvg != null && normalizedStudentGpa < normalizedAvg
          ? Math.max(75, 100 - (normalizedAvg - normalizedStudentGpa) * 10)
          : 90;
      }
    } else {
      // Below minimum — this is a HARD FILTER in most countries
      const gapPoints = normalizedMin - normalizedStudentGpa;
      if (gapPoints > 1.0) {
        status = "auto_reject";
        gpaScore = Math.max(5, 100 - gapPoints * 25);
        gap = `GPA ${academic.gpa}/${gpaScale} is well below the minimum ${minGpa}. Applications below minimum GPA are typically not reviewed.`;
        hardFiltersFailed.push("GPA below minimum requirement");
        recommendation = country === "United States"
          ? "Some US programs practice holistic review and may consider applications with strong compensating factors. But most auto-filter below the stated minimum."
          : "This GPA gap is likely an automatic disqualification. Consider programs with lower requirements or pathway programs.";
      } else {
        status = "below";
        gpaScore = Math.max(20, 100 - gapPoints * 20);
        gap = `GPA ${academic.gpa}/${gpaScale} is ${gapPoints.toFixed(1)} points below the minimum ${minGpa} (on 10-point scale)`;
        recommendation = "Highlight upward GPA trajectory in your SOP if your later semesters were stronger. Some programs focus on last-2-years GPA.";
        risks.push(`GPA (${academic.gpa}) below minimum requirement (${minGpa})`);
      }

      roadmap.push({
        priority: status === "auto_reject" ? "critical" : "high",
        title: "Address GPA Gap",
        description: status === "auto_reject"
          ? `Your GPA (${academic.gpa}) is well below the minimum (${minGpa}). Consider: (1) programs with lower requirements, (2) pathway/bridging programs, (3) programs that evaluate last-2-years GPA separately.`
          : `Your GPA (${academic.gpa}) is slightly below the minimum (${minGpa}). In your SOP, show an upward academic trend and emphasize strong final-year performance if applicable.`,
        impact: country === "Germany"
          ? "GPA accounts for ~50% of the admission decision in Germany. This is the #1 factor."
          : country === "United Kingdom"
          ? "UK admissions are credential-heavy — GPA/degree classification is ~40-45% of the decision."
          : "GPA is typically 25-30% of the evaluation, but below-minimum is often an auto-filter.",
        actionable: true,
        timeEstimate: "N/A — GPA cannot be changed retroactively",
      });
    }

    parameters.push({
      name: "GPA / Academic Record",
      category: "academic",
      studentValue: `${academic.gpa}/${gpaScale}${academic.collegeName ? ` (${academic.collegeName})` : ""}`,
      requiredValue: avgAdmitGpa != null
        ? `Min: ${minGpa} | Avg Admitted: ~${avgAdmitGpa}`
        : `Min: ${minGpa}`,
      status,
      score: Math.round(gpaScore),
      gap,
      weight: Math.round(cw.gpa * 100),
      recommendation,
      isHardFilter: true,
    });
  } else {
    parameters.push({
      name: "GPA / Academic Record",
      category: "academic",
      studentValue: `${academic.gpa}/${academic.gpaScale === "scale_4" ? "4.0" : academic.gpaScale === "scale_10" ? "10" : "100"}`,
      requiredValue: "Not specified by program",
      status: normalizedStudentGpa >= 7.5 ? "exceeds" : "meets",
      score: normalizedStudentGpa >= 7.5 ? 95 : 80,
      gap: null,
      weight: Math.round(cw.gpa * 100),
      recommendation: null,
      isHardFilter: true,
    });
  }

  // ── 2. English Proficiency (Hard Filter) ──
  const studentIelts = academic.ieltsScore;
  const studentToefl = academic.toeflScore;
  const studentPte = academic.pteScore;
  const minIelts = program.minIelts;
  const minToefl = prog.minToefl as number | null | undefined;
  const minPte = prog.minPte as number | null | undefined;

  const hasEnglishScore = studentIelts != null || studentToefl != null || studentPte != null;
  const hasEnglishReq = minIelts != null || minToefl != null || minPte != null;

  if (hasEnglishReq) {
    const reqParts: string[] = [];
    if (minIelts != null) reqParts.push(`IELTS ${minIelts}+`);
    if (minToefl != null) reqParts.push(`TOEFL ${minToefl}+`);
    if (minPte != null) reqParts.push(`PTE ${minPte}+`);
    const reqDisplay = reqParts.join(" / ");

    if (!hasEnglishScore) {
      parameters.push({
        name: "English Proficiency",
        category: "test_score",
        studentValue: "No score on file",
        requiredValue: reqDisplay,
        status: "auto_reject",
        score: 0,
        gap: "English proficiency test is a mandatory hard requirement. Without a valid score, your application will not be processed.",
        weight: Math.round(cw.englishTest * 100),
        recommendation: "Take IELTS, TOEFL, or PTE immediately. Most programs need 6-8 weeks for score delivery. IELTS is accepted universally; PTE is popular in Australia.",
        isHardFilter: true,
      });
      hardFiltersFailed.push("No English proficiency test score");
      risks.push("No English proficiency test score — mandatory requirement");
      roadmap.push({
        priority: "critical",
        title: "Take English Proficiency Test Immediately",
        description: `This program requires ${reqDisplay}. Book your test now — scores take 2-4 weeks to arrive, and you need them before the application deadline.`,
        impact: "Without this, your application is automatically incomplete and will not be reviewed",
        actionable: true,
        timeEstimate: "4-8 weeks (booking + test + score delivery)",
      });
    } else {
      let engScore = 0;
      let engStatus: AuditParameter["status"] = "below";
      let engGap: string | null = null;
      let engRec: string | null = null;
      let studentDisplay = "";

      // Direct IELTS comparison
      if (studentIelts != null && minIelts != null) {
        studentDisplay = `IELTS ${studentIelts}`;
        const diff = studentIelts - minIelts;
        if (diff >= 0.5) {
          engStatus = "exceeds"; engScore = 100;
          strengths.push(`IELTS ${studentIelts} is ${diff} bands above the ${minIelts} requirement`);
        } else if (diff >= 0) {
          engStatus = diff === 0 ? "borderline" : "meets";
          engScore = diff === 0 ? 80 : 90;
          if (diff === 0) { engGap = `IELTS exactly at minimum (${minIelts}). No margin for rounding — some programs require exceeding, not meeting.`; }
        } else {
          const isClose = diff >= -0.5;
          engStatus = isClose ? "below" : "auto_reject";
          engScore = Math.max(10, 100 + diff * 30);
          engGap = `IELTS ${studentIelts} is ${Math.abs(diff)} band(s) below the minimum ${minIelts}. ${engStatus === "auto_reject" ? "This will result in automatic rejection." : "This is a hard requirement — most programs do not accept below-minimum scores."}`;
          engRec = `Retake IELTS targeting ${minIelts + 0.5}+. Focus on your weakest band. Consider PTE Academic as an alternative — many students score higher on PTE.`;
          if (engStatus === "auto_reject") hardFiltersFailed.push(`IELTS ${studentIelts} below minimum ${minIelts}`);
          risks.push(`IELTS (${studentIelts}) below minimum requirement (${minIelts})`);
          roadmap.push({
            priority: "critical",
            title: "Retake IELTS or Switch to PTE",
            description: `Your IELTS (${studentIelts}) is below the minimum (${minIelts}). Target ${minIelts + 0.5}+ on retake. Alternative: PTE Academic — many students from India score 10-15% higher on PTE vs IELTS.`,
            impact: "English proficiency is a hard filter — below minimum = automatic rejection at virtually all programs",
            actionable: true,
            timeEstimate: "4-8 weeks (prep + test + delivery)",
          });
        }
      }
      // Direct TOEFL comparison
      else if (studentToefl != null && minToefl != null) {
        studentDisplay = `TOEFL ${studentToefl}`;
        if (studentToefl >= minToefl + 5) { engStatus = "exceeds"; engScore = 100; strengths.push(`TOEFL ${studentToefl} above requirement (${minToefl})`); }
        else if (studentToefl >= minToefl) { engStatus = studentToefl === minToefl ? "borderline" : "meets"; engScore = studentToefl === minToefl ? 80 : 90; }
        else {
          engStatus = (minToefl - studentToefl) > 10 ? "auto_reject" : "below";
          engScore = Math.max(10, 100 - (minToefl - studentToefl) * 2);
          engGap = `TOEFL ${studentToefl} is ${minToefl - studentToefl} points below minimum ${minToefl}`;
          engRec = `Retake TOEFL or consider IELTS/PTE as alternatives.`;
          if (engStatus === "auto_reject") hardFiltersFailed.push(`TOEFL ${studentToefl} below minimum ${minToefl}`);
          risks.push(`TOEFL (${studentToefl}) below minimum (${minToefl})`);
        }
      }
      // Direct PTE comparison
      else if (studentPte != null && minPte != null) {
        studentDisplay = `PTE ${studentPte}`;
        if (studentPte >= minPte + 5) { engStatus = "exceeds"; engScore = 100; strengths.push(`PTE ${studentPte} above requirement (${minPte})`); }
        else if (studentPte >= minPte) { engStatus = studentPte === minPte ? "borderline" : "meets"; engScore = studentPte === minPte ? 80 : 90; }
        else {
          engStatus = (minPte - studentPte) > 10 ? "auto_reject" : "below";
          engScore = Math.max(10, 100 - (minPte - studentPte) * 2);
          engGap = `PTE ${studentPte} is ${minPte - studentPte} points below minimum ${minPte}`;
          if (engStatus === "auto_reject") hardFiltersFailed.push(`PTE ${studentPte} below minimum ${minPte}`);
        }
      }
      // Cross-conversion
      else {
        let effectiveIelts = studentIelts ?? null;
        if (effectiveIelts == null && studentToefl != null) effectiveIelts = Math.min(9, Math.max(4, (studentToefl - 20) / 12.5));
        if (effectiveIelts == null && studentPte != null) effectiveIelts = Math.min(9, Math.max(4, studentPte / 10));
        const effectiveMin = minIelts ?? (minToefl != null ? Math.min(9, Math.max(4, (minToefl - 20) / 12.5)) : minPte != null ? Math.min(9, Math.max(4, minPte / 10)) : null);
        const testName = studentIelts != null ? "IELTS" : studentToefl != null ? "TOEFL" : "PTE";
        const testVal = studentIelts ?? studentToefl ?? studentPte;
        studentDisplay = `${testName} ${testVal} (cross-converted)`;
        if (effectiveIelts != null && effectiveMin != null) {
          if (effectiveIelts >= effectiveMin) { engStatus = "meets"; engScore = 80; engRec = `Your ${testName} score converts approximately. Consider taking the program's preferred test for certainty.`; }
          else { engStatus = "below"; engScore = Math.max(10, 100 - (effectiveMin - effectiveIelts) * 30); engGap = `Cross-converted score is below requirement. Take the program's preferred test for accurate comparison.`; }
        } else { engStatus = "meets"; engScore = 70; }
      }

      parameters.push({
        name: "English Proficiency",
        category: "test_score",
        studentValue: studentDisplay,
        requiredValue: reqDisplay,
        status: engStatus,
        score: Math.round(engScore),
        gap: engGap,
        weight: Math.round(cw.englishTest * 100),
        recommendation: engRec,
        isHardFilter: true,
      });
    }
  }

  // ── 3. GRE / GMAT ──
  const studentGre = academic.greScore;
  const studentGmat = academic.gmatScore;
  const minGre = program.minGre;
  const minGmat = prog.minGmat as number | null | undefined;
  const requiresGre = (prog.requiresGre as boolean) ?? false;
  const requiresGmat = (prog.requiresGmat as boolean) ?? false;
  const avgAdmitGre = prog.avgAdmitGre as number | null | undefined;

  const greRequired = requiresGre || requiresGmat || minGre != null || minGmat != null;
  const isGmatProgram = requiresGmat || (minGmat != null && minGre == null);
  const testName = isGmatProgram ? "GMAT" : "GRE";

  if (greRequired) {
    let greReqDisplay = "";
    if (minGre != null) greReqDisplay = `GRE ${minGre}+${avgAdmitGre ? ` (Avg Admit: ${avgAdmitGre})` : ""}`;
    else if (minGmat != null) greReqDisplay = `GMAT ${minGmat}+`;
    else if (requiresGre) greReqDisplay = `GRE Required (no minimum published)`;
    else if (requiresGmat) greReqDisplay = `GMAT Required (no minimum published)`;

    const hasScore = isGmatProgram ? (studentGmat != null || studentGre != null) : (studentGre != null || studentGmat != null);

    if (!hasScore) {
      parameters.push({
        name: testName,
        category: "test_score",
        studentValue: "No score on file",
        requiredValue: greReqDisplay,
        status: (requiresGre || requiresGmat) ? "auto_reject" : "missing",
        score: 0,
        gap: `This program ${requiresGre || requiresGmat ? "requires" : "recommends"} ${testName}. ${requiresGre || requiresGmat ? "Without a score, your application is incomplete." : "Submitting a score strengthens your application."}`,
        weight: Math.round(cw.gradTest * 100),
        recommendation: `Register for ${testName}. ${testName === "GRE" ? "Allow 3-4 months prep. Target 320+ for competitive programs, 310+ for mid-tier." : "Allow 3-4 months prep. Target 700+ for top MBA, 650+ for mid-tier."}`,
        isHardFilter: requiresGre || requiresGmat,
      });
      if (requiresGre || requiresGmat) {
        hardFiltersFailed.push(`${testName} required but not taken`);
        roadmap.push({ priority: "critical", title: `Take the ${testName}`, description: `This program requires ${greReqDisplay}. Without it, your application cannot be processed.`, impact: "Application will not be reviewed without this score", actionable: true, timeEstimate: "3-4 months (prep + test)" });
      }
    } else {
      let testScore = 0;
      let testStatus: AuditParameter["status"] = "below";
      let testGap: string | null = null;
      let testRec: string | null = null;
      let testDisplay = "";

      if (studentGre != null && !isGmatProgram) {
        testDisplay = `GRE ${studentGre}/340`;
        const threshold = minGre ?? 300;
        const avgThreshold = avgAdmitGre ?? null;

        if (studentGre >= (avgThreshold ?? threshold) + 5) {
          testStatus = "exceeds"; testScore = 100;
          strengths.push(`GRE ${studentGre} is ${studentGre - (avgThreshold ?? threshold)} points above the ${avgThreshold ? "average admitted score" : "minimum"}`);
        } else if (studentGre >= threshold) {
          if (avgThreshold != null && studentGre < avgThreshold - 3) {
            testStatus = "borderline";
            testScore = Math.max(65, 100 - (avgThreshold - studentGre) * 1.5);
            testGap = `GRE ${studentGre} meets minimum (${threshold}) but is ${avgThreshold - studentGre} points below average admit (${avgThreshold}). You'll be in the lower half of admitted students.`;
            testRec = country === "United States" ? `For US programs, GRE matters less than SOP/LOR but being below average puts you at a disadvantage. Consider retaking if targeting top-30 programs.` : `Consider retaking to strengthen your application, or compensate with other profile elements.`;
            roadmap.push({ priority: "medium", title: "Consider GRE Retake", description: `GRE ${studentGre} meets min (${threshold}) but avg admit is ${avgThreshold}. Retaking to ${avgThreshold + 3}+ moves you from bottom to middle of the admit pool.`, impact: `${country === "United States" ? "GRE is ~10-15% of the US evaluation" : "Moderate impact"} — retaking has diminishing returns if your SOP/LOR are also weak`, actionable: true, timeEstimate: "6-8 weeks focused prep" });
          } else {
            testStatus = "meets"; testScore = 90;
          }
        } else {
          testStatus = (threshold - studentGre) > 15 ? "auto_reject" : "below";
          testScore = Math.max(10, 100 - (threshold - studentGre) * 2);
          testGap = `GRE ${studentGre} is ${threshold - studentGre} points below ${minGre ? `minimum (${threshold})` : "competitive range"}`;
          testRec = `Retake GRE targeting ${threshold + 5}+. Focus on Quant for STEM programs.`;
          risks.push(`GRE (${studentGre}) below ${minGre ? "minimum" : "competitive range"} (${threshold})`);
          if (testStatus === "auto_reject") hardFiltersFailed.push(`GRE ${studentGre} well below minimum ${threshold}`);
          roadmap.push({ priority: "high", title: "Retake GRE", description: `GRE ${studentGre} is ${threshold - studentGre} points below ${threshold}. Target ${threshold + 5}+.`, impact: "Closing this gap removes a likely auto-reject trigger", actionable: true, timeEstimate: "6-10 weeks focused prep" });
        }
      } else if (studentGmat != null && isGmatProgram) {
        testDisplay = `GMAT ${studentGmat}`;
        const threshold = (minGmat as number) ?? 500;
        if (studentGmat >= threshold + 30) { testStatus = "exceeds"; testScore = 100; strengths.push(`GMAT ${studentGmat} well above requirement`); }
        else if (studentGmat >= threshold) { testStatus = "meets"; testScore = 85; }
        else {
          testStatus = (threshold - studentGmat) > 50 ? "auto_reject" : "below";
          testScore = Math.max(10, 100 - (threshold - studentGmat) * 0.5);
          testGap = `GMAT ${studentGmat} is ${threshold - studentGmat} points below minimum ${threshold}`;
          risks.push(`GMAT below minimum`);
          if (testStatus === "auto_reject") hardFiltersFailed.push(`GMAT well below minimum`);
        }
      } else {
        // Cross-convert
        testDisplay = studentGre != null ? `GRE ${studentGre} (converted)` : `GMAT ${studentGmat} (converted)`;
        testStatus = "meets"; testScore = 65;
        testRec = `You have ${studentGre != null ? "GRE" : "GMAT"} but program prefers ${testName}. Consider taking ${testName} for a stronger application.`;
      }

      parameters.push({
        name: testName,
        category: "test_score",
        studentValue: testDisplay,
        requiredValue: greReqDisplay,
        status: testStatus,
        score: Math.round(testScore),
        gap: testGap,
        weight: Math.round(cw.gradTest * 100),
        recommendation: testRec,
        isHardFilter: requiresGre || requiresGmat,
      });
    }
  } else {
    // GRE/GMAT not required — bonus if you have it
    const hasAnyScore = studentGre != null || studentGmat != null;
    const scoreDisplay = studentGre ? `GRE ${studentGre}` : studentGmat ? `GMAT ${studentGmat}` : "N/A";
    parameters.push({
      name: "GRE/GMAT",
      category: "test_score",
      studentValue: scoreDisplay,
      requiredValue: "Not required by this program",
      status: "not_required",
      score: 100,
      gap: null,
      weight: Math.round(cw.gradTest * 100),
      recommendation: hasAnyScore && (studentGre ?? 0) >= 310 ? "Your score adds competitive value even though not required" : null,
      isHardFilter: false,
    });
    if (studentGre && studentGre >= 315) strengths.push(`GRE ${studentGre} provides competitive advantage even though not required`);
  }

  // ── 4. Work Experience ──
  const minWorkExp = prog.minWorkExpMonths as number | null | undefined;
  const workMonths = academic.workExperienceMonths;
  const workYears = (workMonths / 12).toFixed(1);

  const workWeight = isMba ? Math.max(Math.round(cw.workExp * 100), 15) : Math.round(cw.workExp * 100);

  if (minWorkExp != null && minWorkExp > 0) {
    const minYears = (minWorkExp / 12).toFixed(1);
    let weStatus: AuditParameter["status"];
    let weScore: number;
    let weGap: string | null = null;
    let weRec: string | null = null;

    if (workMonths >= minWorkExp * 1.5) { weStatus = "exceeds"; weScore = 100; strengths.push(`${workYears} years of work experience substantially exceeds the ${minYears}-year requirement`); }
    else if (workMonths >= minWorkExp) { weStatus = "meets"; weScore = 90; }
    else if (workMonths > 0) {
      const ratio = workMonths / minWorkExp;
      weStatus = ratio < 0.5 ? "auto_reject" : "below";
      weScore = Math.max(15, ratio * 80);
      weGap = `You have ${workYears} years but ${minYears} years is required. ${weStatus === "auto_reject" ? "This is a hard requirement for this program." : ""}`;
      weRec = isMba
        ? `MBA programs weigh work experience heavily (~${workWeight}% of evaluation). Consider deferring 1-2 years to build experience.`
        : `Gain ${Math.ceil((minWorkExp - workMonths) / 12)} more year(s), or target the next intake cycle.`;
      risks.push(`Work experience (${workYears} yrs) below minimum (${minYears} yrs)`);
      if (weStatus === "auto_reject") hardFiltersFailed.push(`Work experience below minimum for ${isMba ? "MBA" : "this program"}`);
      roadmap.push({ priority: isMba ? "critical" : "high", title: "Build Work Experience", description: `Requires ${minYears} years, you have ${workYears}. ${isMba ? "MBA programs rarely waive this. Consider deferring to next year's intake." : "Consider deferring admission or applying for next intake cycle."}`, impact: isMba ? "Work experience is ~20-25% of MBA evaluation and is often a hard minimum" : "Meeting this requirement significantly improves your chances", actionable: true, timeEstimate: `${Math.ceil((minWorkExp - workMonths) / 12)} year(s)` });
    } else {
      weStatus = "auto_reject"; weScore = 5;
      weGap = `No work experience — ${minYears} years is a hard requirement`;
      weRec = "Without meeting this requirement, your application will almost certainly be rejected.";
      hardFiltersFailed.push("No work experience — hard requirement");
      risks.push(`No work experience — ${minYears} years required`);
    }

    parameters.push({
      name: "Work Experience",
      category: "experience",
      studentValue: workMonths > 0 ? `${workYears} years (${workMonths} months)` : "None",
      requiredValue: `Min: ${minYears} years${isMba ? " (MBA programs typically expect 3-5 years)" : ""}`,
      status: weStatus,
      score: Math.round(weScore),
      gap: weGap,
      weight: workWeight,
      recommendation: weRec,
      isHardFilter: true,
    });
  } else {
    // No explicit requirement
    let weScore: number;
    let weStatus: AuditParameter["status"];
    if (isMba) {
      weScore = workMonths >= 36 ? 100 : workMonths >= 24 ? 80 : workMonths >= 12 ? 55 : 20;
      weStatus = workMonths >= 36 ? "exceeds" : workMonths >= 24 ? "meets" : workMonths >= 12 ? "borderline" : "below";
      if (workMonths < 24) {
        risks.push("MBA programs strongly prefer 3+ years of work experience");
        roadmap.push({ priority: "high", title: "Build Work Experience for MBA", description: `Most MBA programs expect 3-5 years of work experience (median at top programs is 5 years). You have ${workYears} years.`, impact: `Work experience is ~20-25% of MBA admission decisions${country === "United States" ? " in the US" : ""}`, actionable: true, timeEstimate: `${Math.max(1, Math.ceil((36 - workMonths) / 12))} year(s)` });
      }
    } else {
      weScore = workMonths >= 24 ? 100 : workMonths >= 12 ? 85 : 60;
      weStatus = workMonths >= 12 ? "meets" : "meets";
    }

    parameters.push({
      name: "Work Experience",
      category: "experience",
      studentValue: workMonths > 0 ? `${workYears} years` : "None (fresh graduate)",
      requiredValue: isMba ? "Not specified (3+ years strongly preferred for MBA)" : "Not required",
      status: weStatus,
      score: Math.round(weScore),
      gap: null,
      weight: workWeight,
      recommendation: null,
      isHardFilter: false,
    });

    if (workMonths >= 36) strengths.push(`${workYears} years of professional experience adds significant value`);
  }

  // ── 5. Backlogs (Country-Sensitive Hard Filter) ──
  const backlogsAllowed = prog.backlogsAllowed as number | null | undefined;
  const studentBacklogs = academic.backlogs;

  // Country-specific backlog tolerance
  const backlogSeverity = cw.backlogTolerance;

  if (backlogsAllowed != null || studentBacklogs > 0) {
    let blStatus: AuditParameter["status"];
    let blScore: number;
    let blGap: string | null = null;
    let blRec: string | null = null;

    if (studentBacklogs === 0) {
      blStatus = "exceeds"; blScore = 100;
      strengths.push("Clean academic record — zero backlogs");
    } else if (backlogsAllowed != null && studentBacklogs <= backlogsAllowed) {
      blStatus = "meets"; blScore = 100;
    } else if (backlogsAllowed != null && studentBacklogs > backlogsAllowed) {
      const excess = studentBacklogs - backlogsAllowed;
      if (backlogSeverity === "strict") {
        blStatus = excess > 2 ? "auto_reject" : "below";
        blScore = Math.max(0, 60 - excess * 25);
        blGap = `${studentBacklogs} backlogs exceed the ${backlogsAllowed} allowed. ${country === "Germany" ? "Germany is extremely strict about backlogs — this is likely a disqualification." : "This country scrutinizes backlogs closely."}`;
        if (blStatus === "auto_reject") hardFiltersFailed.push(`Backlogs (${studentBacklogs}) exceed limit (${backlogsAllowed}) — ${country} is very strict`);
      } else {
        blStatus = "below";
        blScore = Math.max(20, 80 - excess * 15);
        blGap = `${studentBacklogs} backlogs exceed the ${backlogsAllowed} allowed`;
      }
      blRec = "Clear pending backlogs before applying. Get updated transcripts. Address academic recovery in your SOP.";
      risks.push(`${studentBacklogs} backlogs exceed the allowed limit of ${backlogsAllowed}`);
      roadmap.push({
        priority: backlogSeverity === "strict" ? "critical" : "high",
        title: "Clear Excess Backlogs",
        description: `Max ${backlogsAllowed} allowed, you have ${studentBacklogs}. ${backlogSeverity === "strict" ? `${country} is one of the strictest countries for backlogs. Clear all possible backlogs and get updated transcripts before applying.` : "Clear backlogs and update transcripts."}`,
        impact: backlogSeverity === "strict" ? "In this country, excess backlogs are often an automatic disqualification" : "Exceeding backlog limits significantly reduces admission chances",
        actionable: true,
      });
    } else {
      // No explicit limit, but student has backlogs — rate by country tolerance
      if (backlogSeverity === "strict" && studentBacklogs > 3) {
        blStatus = "below"; blScore = Math.max(20, 70 - studentBacklogs * 8);
        blGap = `${studentBacklogs} backlogs in a country (${country}) that is strict about academic record`;
        blRec = `${country} heavily weighs academic purity. Consider countries with more lenient backlog policies (UK, Australia, Ireland) or programs that explicitly accept backlogs.`;
        risks.push(`${studentBacklogs} backlogs — ${country} is strict about academic record`);
      } else if (backlogSeverity === "moderate" && studentBacklogs > 5) {
        blStatus = "below"; blScore = Math.max(30, 80 - studentBacklogs * 6);
        blGap = `${studentBacklogs} backlogs may limit options`;
      } else {
        blStatus = studentBacklogs <= 2 ? "meets" : "borderline";
        blScore = studentBacklogs <= 2 ? 85 : 65;
      }
    }

    parameters.push({
      name: "Academic Backlogs",
      category: "academic",
      studentValue: `${studentBacklogs} backlog(s)`,
      requiredValue: backlogsAllowed != null ? `Max ${backlogsAllowed} allowed` : `Not specified (${country}: ${backlogSeverity} tolerance)`,
      status: blStatus,
      score: Math.round(blScore),
      gap: blGap,
      weight: Math.round(cw.backlogs * 100),
      recommendation: blRec,
      isHardFilter: backlogSeverity === "strict",
    });
  } else {
    parameters.push({
      name: "Academic Backlogs",
      category: "academic",
      studentValue: "0 backlogs",
      requiredValue: backlogsAllowed != null ? `Max ${backlogsAllowed}` : "No limit specified",
      status: "exceeds",
      score: 100,
      gap: null,
      weight: Math.round(cw.backlogs * 100),
      recommendation: null,
      isHardFilter: false,
    });
  }

  // ── 6. Budget & Affordability ──
  const rate = currencyToINR[program.tuitionCurrency] ?? 83;
  const annualINR = program.tuitionAnnual * rate;
  const maxBudget = budgetMaxINR[preferences.budgetRange];
  const totalCostINR = annualINR * (program.durationMonths / 12);
  const livingMonthly = (program.livingCostMonthly ?? 0) * (currencyToINR[program.tuitionCurrency] ?? 83);
  const totalLivingINR = livingMonthly * program.durationMonths;
  const grandTotalINR = totalCostINR + totalLivingINR;

  const budgetRatio = annualINR / maxBudget;
  const formatINR = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

  let budgetStatus: AuditParameter["status"];
  let budgetScore: number;
  let budgetGap: string | null = null;
  let budgetRec: string | null = null;

  if (budgetRatio <= 0.7) { budgetStatus = "exceeds"; budgetScore = 100; strengths.push("Tuition well within budget — financial stress is unlikely"); }
  else if (budgetRatio <= 1.0) { budgetStatus = "meets"; budgetScore = 90; }
  else if (budgetRatio <= 1.3) {
    budgetStatus = "borderline"; budgetScore = 60;
    budgetGap = `Annual tuition (${formatINR(annualINR)}) is ${Math.round((budgetRatio - 1) * 100)}% above your stated budget`;
    budgetRec = `Explore: ${program.scholarshipsCount > 0 ? `${program.scholarshipsCount} scholarship(s) at this program. ` : ""}${(prog.hasAssistantship as boolean) ? "Teaching/Research assistantships available. " : ""}Education loans from Indian banks cover up to ₹20L without collateral.`;
  } else {
    budgetStatus = "below"; budgetScore = Math.max(15, 100 - (budgetRatio - 1) * 80);
    budgetGap = `Annual tuition (${formatINR(annualINR)}) significantly exceeds your budget (${formatINR(maxBudget)}). Estimated total cost: ${formatINR(grandTotalINR)}`;
    budgetRec = "This may not be financially viable without substantial scholarships or education loans. Consider more affordable alternatives.";
    risks.push(`Tuition (${formatINR(annualINR)}/yr) exceeds budget by ${Math.round((budgetRatio - 1) * 100)}%`);
  }

  parameters.push({
    name: "Budget & Affordability",
    category: "financial",
    studentValue: `Budget: ${formatINR(maxBudget)}/yr`,
    requiredValue: `Tuition: ${formatINR(annualINR)}/yr${program.livingCostMonthly ? ` + Living: ${formatINR(livingMonthly * 12)}/yr` : ""} | Est. Total: ${formatINR(grandTotalINR)}`,
    status: budgetStatus,
    score: Math.round(budgetScore),
    gap: budgetGap,
    weight: Math.round(cw.budget * 100),
    recommendation: budgetRec,
    isHardFilter: false,
  });

  if (budgetRatio > 1.0 && program.scholarshipsCount > 0) {
    roadmap.push({
      priority: "high",
      title: "Apply for Scholarships",
      description: `${program.scholarshipsCount} scholarship(s) available. ${program.scholarshipDetails ?? "Check program website."}${(prog.hasAssistantship as boolean) ? " TA/RA assistantships also available." : ""}${(prog.hasFellowship as boolean) ? " Fellowships available." : ""}`,
      impact: "Scholarships can reduce costs by 20-100%. Apply early — many have earlier deadlines than admission.",
      actionable: true,
    });
  }

  // ── 7. Field Alignment ──
  const fieldResult = scoreField(preferences.targetField, program.field);
  parameters.push({
    name: "Field Alignment",
    category: "academic",
    studentValue: preferences.targetField,
    requiredValue: program.field + (program.subField ? ` → ${program.subField}` : ""),
    status: fieldResult.score === 100 ? "exceeds" : fieldResult.score >= 60 ? "meets" : "below",
    score: fieldResult.score,
    gap: fieldResult.score < 60 ? `Your target field (${preferences.targetField}) doesn't directly align with this program (${program.field}). ${country === "Germany" ? "Germany is strict about prerequisite coursework matching — this could be a blocker." : "Explain the connection in your SOP."}` : null,
    weight: Math.round(cw.fieldMatch * 100),
    recommendation: fieldResult.score < 60 ? "Address the field transition in your SOP. Show how your background provides a unique perspective for this program." : null,
    isHardFilter: country === "Germany",
  });

  // ── 8. SOP & LOR (Estimated Soft Factors) ──
  // We can't measure these directly, but we tell the student how important they are
  // for this specific country and provide actionable guidance.

  const requiresSop = (prog.requiresSop as boolean) ?? true;
  const requiresLor = prog.requiresLor as number | null | undefined;
  const requiresResume = (prog.requiresResume as boolean) ?? true;
  const requiresPortfolio = (prog.requiresPortfolio as boolean) ?? false;

  const sopImportanceLabel = {
    critical: "Critical — SOP is the #1 differentiator",
    high: "High — SOP significantly influences decisions",
    medium: "Medium — SOP matters but academics dominate",
    low: "Low — decision is mostly formulaic/GPA-based",
  }[cw.sopImportance];

  const lorImportanceLabel = {
    critical: "Critical — strong LORs can override weak academics",
    high: "High — LOR quality significantly matters",
    medium: "Medium — LORs are required but less decisive",
    low: "Low — LORs are a formality in this country",
  }[cw.lorImportance];

  if (requiresSop) {
    parameters.push({
      name: "Statement of Purpose",
      category: "soft_factor",
      studentValue: "Quality cannot be measured here",
      requiredValue: `Required — Importance in ${country}: ${sopImportanceLabel}`,
      status: "meets",
      score: 70,
      gap: null,
      weight: Math.round(cw.sop * 100),
      recommendation: cw.sopImportance === "critical"
        ? `In ${country === "United States" ? "the US" : country}, your SOP is ~${Math.round(cw.sop * 100)}% of the decision. Write a program-specific SOP mentioning faculty, research labs, and specific courses at ${program.university.name}. Generic SOPs are easy to spot.`
        : cw.sopImportance === "high"
        ? `SOP carries significant weight. Tailor it to ${program.university.name} specifically — mention why this program, not just this field.`
        : `SOP is less decisive in ${country} than academics, but a poor SOP can still hurt. Keep it focused and genuine.`,
      isHardFilter: false,
    });

    roadmap.push({
      priority: cw.sopImportance === "critical" ? "high" : "medium",
      title: `Write Program-Specific SOP for ${program.university.name}`,
      description: cw.sopImportance === "critical"
        ? `The SOP is ~${Math.round(cw.sop * 100)}% of your evaluation in ${country === "United States" ? "the US" : country}. Research 2-3 faculty members, mention specific courses/labs, and connect your past experience to your goals at this program. Do NOT use a generic SOP.`
        : `Write a focused SOP connecting your background to this program. Reference specific aspects of ${program.university.name}.`,
      impact: cw.sopImportance === "critical"
        ? "A strong, tailored SOP can compensate for borderline GPA/test scores. A generic SOP will waste a strong profile."
        : "A well-written SOP strengthens your application but won't override weak academics.",
      actionable: true,
      timeEstimate: "1-3 weeks per program",
    });
  }

  if (requiresLor != null && requiresLor > 0) {
    parameters.push({
      name: `Letters of Recommendation (${requiresLor} required)`,
      category: "soft_factor",
      studentValue: "Quality cannot be measured here",
      requiredValue: `${requiresLor} LOR(s) required — Importance in ${country}: ${lorImportanceLabel}`,
      status: "meets",
      score: 70,
      gap: null,
      weight: Math.round(cw.lor * 100),
      recommendation: cw.lorImportance === "critical"
        ? `LORs are ~${Math.round(cw.lor * 100)}% of the decision. Get letters from professors/managers who know your work deeply. A letter saying "top 5% of students I've taught" is 10x more valuable than "good student, hardworking."`
        : `Request LORs from people who know your work well. Brief them on ${program.university.name} and why you're applying.`,
      isHardFilter: false,
    });

    roadmap.push({
      priority: cw.lorImportance === "critical" ? "high" : "medium",
      title: `Secure ${requiresLor} Strong Recommendation Letters`,
      description: `${requiresLor} LORs required. ${cw.lorImportance === "critical" ? "Choose recommenders who can speak specifically about your abilities — generic letters hurt more than help. Ask 3-4 weeks in advance." : "Request from professors or managers who know your work. Give them enough lead time."}`,
      impact: cw.lorImportance === "critical" ? "A strong LOR from a known researcher or industry leader can tip borderline decisions in your favor" : "LORs validate your academic/professional claims",
      actionable: true,
      timeEstimate: "3-4 weeks (request + writing time)",
    });
  }

  // Document checklist item
  const docParts: string[] = [];
  if (requiresSop) docParts.push("SOP");
  if (requiresLor != null && requiresLor > 0) docParts.push(`${requiresLor} LOR(s)`);
  if (requiresResume) docParts.push("Resume/CV");
  if (requiresPortfolio) docParts.push("Portfolio");

  if (docParts.length > 0) {
    parameters.push({
      name: "Application Documents",
      category: "documents",
      studentValue: "Ensure all documents are ready",
      requiredValue: docParts.join(", "),
      status: "meets",
      score: 70,
      gap: null,
      weight: 0,
      recommendation: `Complete checklist: ${docParts.join(", ")}. ${program.applicationFee ? `Application fee: ${program.applicationFeeCcy ?? ""} ${program.applicationFee}.` : ""}`,
      isHardFilter: false,
    });
  }

  // ── Sort roadmap by priority ──
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, optional: 4 };
  roadmap.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Add exploration items if roadmap is sparse
  if (roadmap.length < 4) {
    if (preferences.extracurriculars.length === 0 && (cw.sopImportance === "critical" || cw.sopImportance === "high")) {
      roadmap.push({ priority: "low", title: "Strengthen Extracurricular Profile", description: "Leadership roles, volunteer work, and relevant projects add depth to your application, especially in countries that value holistic review.", impact: "Differentiates you from candidates with similar academic profiles", actionable: true });
    }
    roadmap.push({ priority: "optional", title: `Research Faculty at ${program.university.name}`, description: `Identify 2-3 faculty whose research aligns with your interests. Mention them in your SOP. ${country === "Canada" ? "In Canada, finding a willing thesis supervisor is often a prerequisite for admission to research programs." : ""}`, impact: "Shows genuine interest and can lead to research/assistantship opportunities", actionable: true });
  }

  // ── Calculate overall score from weighted parameters ──
  let weightedSum = 0;
  let totalWeight = 0;
  for (const p of parameters) {
    if (p.weight > 0) {
      weightedSum += p.score * p.weight;
      totalWeight += p.weight;
    }
  }
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // ── Admission Probability (Sigmoid Mapping) ──
  // Maps score to probability range, calibrated by selectivity.
  // Based on logistic regression approach from Mohan et al. 2019.
  const acceptanceRate = program.university.acceptanceRate;
  let threshold: number;
  if (acceptanceRate != null && acceptanceRate < 0.10) threshold = 85;
  else if (acceptanceRate != null && acceptanceRate < 0.25) threshold = 75;
  else if (acceptanceRate != null && acceptanceRate < 0.50) threshold = 65;
  else threshold = 55;

  const k = 0.12;
  const rawProbability = 1 / (1 + Math.exp(-k * (overallScore - threshold)));
  // Apply hard filter penalty
  const hardFilterPenalty = hardFiltersFailed.length > 0 ? Math.pow(0.15, hardFiltersFailed.length) : 1;
  const adjustedProbability = rawProbability * hardFilterPenalty;

  // Present as range (honest about uncertainty)
  const probLow = Math.max(1, Math.round(adjustedProbability * 100 * 0.7));
  const probHigh = Math.min(95, Math.round(adjustedProbability * 100 * 1.3));
  let probLabel: string;
  if (hardFiltersFailed.length > 0) probLabel = "Very Low — hard requirements not met";
  else if (probHigh >= 80) probLabel = "Strong";
  else if (probHigh >= 60) probLabel = "Competitive";
  else if (probHigh >= 35) probLabel = "Moderate";
  else probLabel = "Challenging";

  // ── Country Context ──
  const countryContextMap: Record<string, string> = {
    "United States": `US graduate admissions use holistic review. Your SOP (~${Math.round(cw.sop * 100)}%) and LORs (~${Math.round(cw.lor * 100)}%) carry substantial weight alongside GPA (~${Math.round(cw.gpa * 100)}%). Many programs have dropped GRE requirements post-2020. Admissions committees typically review in two phases: (1) GPA/test score screen to shortlist, (2) holistic review of SOP, LOR, and fit by faculty.`,
    "United Kingdom": `UK admissions are credential-heavy. Your degree classification equivalent (GPA) is the primary factor (~${Math.round(cw.gpa * 100)}%). Personal statements and references matter less than in the US. GRE is rarely required. Decision-making is more formulaic than holistic.`,
    "Canada": `Canadian admissions focus on GPA (~${Math.round(cw.gpa * 100)}%), especially last 2 years. For research/thesis programs, finding a willing supervisor is often a prerequisite — no supervisor match = no admission regardless of profile. WES credential evaluation may deflate Indian GPAs.`,
    "Germany": `Germany uses the most formulaic admission process. GPA (converted via Bavarian formula) accounts for ~${Math.round(cw.gpa * 100)}% of the decision. Backlogs are heavily penalized (~${Math.round(cw.backlogs * 100)}%). SOP/LOR carry minimal weight. Coursework/ECTS match is strictly verified.`,
    "Australia": `Australian admissions are GPA-driven (~${Math.round(cw.gpa * 100)}%). Coursework masters are almost entirely based on academic record. SOPs carry less weight than in the US. PTE is widely accepted (popular alternative to IELTS). Work experience is valued more than in other countries.`,
    "Ireland": `Irish admissions follow the UK model — degree classification equivalent is primary. Generally more lenient on backlogs. The 2-year Graduate Route visa makes Ireland attractive for post-study work.`,
    "Singapore": `Singapore universities (NUS, NTU) are highly selective. GPA and GRE are important. Programs are short (1-1.5 years). Tuition grants with 3-year work bond significantly reduce costs.`,
    "New Zealand": `New Zealand has relatively accessible admissions. GPA is primary but thresholds are lower than Australia. The Green List provides fast-track residence for certain occupations.`,
  };

  const countryContext = countryContextMap[country] ?? `Admission evaluation varies by institution. GPA and English proficiency are universal hard requirements. Check the specific program page for detailed criteria.`;

  // ── Verdict ──
  let verdict: string;
  if (hardFiltersFailed.length >= 2) {
    verdict = `Your profile fails ${hardFiltersFailed.length} hard requirements: ${hardFiltersFailed.join("; ")}. These are typically auto-reject criteria — submitting without addressing them risks rejection without review. Fix these before applying.`;
  } else if (hardFiltersFailed.length === 1) {
    verdict = `Critical gap: ${hardFiltersFailed[0]}. This is typically an auto-reject criterion. All other parameters look ${overallScore >= 70 ? "competitive" : "workable"}, but this single gap likely prevents admission. Address it first.`;
  } else if (overallScore >= 85) {
    verdict = `Strong candidate. Your profile meets or exceeds requirements across all measured parameters. Focus on SOP quality${cw.sopImportance === "critical" ? " (the #1 differentiator in " + country + ")" : ""} and LOR strength to maximize your chances.`;
  } else if (overallScore >= 70) {
    verdict = `Competitive profile with room for improvement. You meet most requirements. ${risks.length > 0 ? `Key risk areas: ${risks.slice(0, 2).join("; ")}.` : ""} Strengthen the flagged areas below to move from "competitive" to "strong match."`;
  } else if (overallScore >= 55) {
    verdict = `Moderate fit. You meet basic requirements but have notable gaps. This is a realistic "reach" school. ${country === "United States" ? "The US's holistic review gives you a chance if your SOP and LORs are exceptional." : "Focus on closing the specific gaps identified below."}`;
  } else {
    verdict = `Significant gaps in your profile for this program. Consider this a long shot. ${risks.length > 0 ? `Major issues: ${risks.slice(0, 3).join("; ")}.` : ""} Ensure you have safer options in your application portfolio.`;
  }

  // ── Confidence Note ──
  const lastEnriched = program.university.lastEnrichedAt;
  const dataSource = prog.dataSource as string | null ?? program.university.enrichmentSource;
  let confidenceNote: string;
  if (lastEnriched) {
    const daysSince = Math.floor((Date.now() - new Date(lastEnriched).getTime()) / (1000 * 60 * 60 * 24));
    confidenceNote = `Requirements data ${dataSource === "university_website" ? "verified from university website" : dataSource === "ai" ? "researched via AI" : dataSource === "manual" ? "manually verified" : "from available sources"}${daysSince > 0 ? `, updated ${daysSince} days ago` : " today"}. SOP and LOR quality (~${Math.round((cw.sop + cw.lor) * 100)}% of evaluation in ${country}) cannot be measured here — the scores shown reflect only quantifiable parameters. Always verify requirements on the official program page.`;
  } else {
    confidenceNote = `Requirement data may not reflect the latest admission cycle. SOP and LOR quality (~${Math.round((cw.sop + cw.lor) * 100)}% of evaluation in ${country}) are not measured — actual admission chances depend heavily on these unmeasurable factors. Verify on the official website.`;
  }

  // Country alerts
  const countryAlerts = getCountryAlerts(country, academic);

  return {
    overallScore,
    admissionProbability: { low: probLow, high: probHigh, label: probLabel },
    parameters,
    hardFiltersFailed,
    roadmap,
    strengths,
    risks,
    countryAlerts,
    verdict,
    confidenceNote,
    countryContext,
    sopWeight: `${Math.round(cw.sop * 100)}% — ${sopImportanceLabel}`,
    lorWeight: `${Math.round(cw.lor * 100)}% — ${lorImportanceLabel}`,
  };
}

// ─── Format Helpers ─────────────────────────────────────

const currencySymbols: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
  AUD: "AUD ",
  CAD: "CAD ",
  INR: "\u20b9",
  SGD: "SGD ",
  NZD: "NZD ",
  CHF: "CHF ",
  SEK: "SEK ",
};

export function formatTuition(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] ?? currency + " ";
  if (amount === 0) return `${symbol}0 (no tuition)`;
  return `${symbol}${amount.toLocaleString("en-IN")}/yr`;
}

export function formatLivingCost(amount: number | null, currency: string): string {
  if (amount == null) return "N/A";
  const symbol = currencySymbols[currency] ?? currency + " ";
  return `${symbol}${amount.toLocaleString("en-IN")}/mo`;
}

export function formatDeadline(date: Date | null): string {
  if (!date) return "Rolling";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
