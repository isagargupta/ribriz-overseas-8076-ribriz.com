/**
 * Client for the external university data API (university.wyriz.dev).
 *
 * Fetches real university + course data and maps it into the same
 * Prisma `University` / `Program` shapes the rest of the app expects,
 * so scoring, matching, and UI code works unchanged.
 */

import { createHash } from "crypto";
import type {
  University,
  Program,
  DegreeLevel,
} from "@/generated/prisma/client";
import { getUniversityLogoUrl } from "./university-logo";

// ─── Config ────────────────────────────────────────────

function getApiConfig() {
  const url = process.env.UNIVERSITY_API_URL || "https://university.wyriz.dev/api/v1";
  const key = process.env.UNIVERSITY_API_KEY || "";
  return { url, key };
}

/**
 * Generate a deterministic UUID from a string (e.g. "ext-uni-42").
 * Uses SHA-256 truncated to UUID v4 format so the same external ID
 * always produces the same UUID, letting us upsert safely.
 */
function externalIdToUuid(externalId: string): string {
  const hash = createHash("sha256").update(externalId).digest("hex");
  const v = "4"; // version nibble
  const r = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16); // variant
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    v + hash.slice(13, 16),
    r + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

// ─── External API response types ───────────────────────

interface ExtUniversity {
  id: number;
  name: string;
  country: string;
  city: string;
  state: string | null;
  website: string | null;
  ranking_world: number | null;
  ranking_national: number | null;
  university_type: string | null;
  accreditation: string | null;
  accepts_international: boolean;
  application_portal_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  logo_url: string | null;
  established_year: number | null;
  campus_size: string | null;
  student_count: number | null;
  acceptance_rate: number | null;
}

interface ExtCourse {
  id: number;
  university_id: number;
  name: string;
  degree_id: number;
  department: string | null;
  faculty: string | null;
  duration_years: number | null;
  duration_semesters: number | null;
  credit_hours: number | null;
  tuition_fee_per_year: number | null;
  tuition_fee_currency: string | null;
  tuition_fee_international: number | null;
  language_of_instruction: string | null;
  mode: string | null;
  open_for_international: boolean;
  eligibility_criteria: string | null;
  required_documents: string | null;
  application_deadline: string | null;
  application_fee: number | null;
  application_url: string | null;
  description: string | null;
  career_prospects: string | null;
  course_structure: string | null;
}


// ─── Degree-level mapping ──────────────────────────────

// Map external degree IDs to our DegreeLevel enum.
// BSc(1), BA(2), BEng(3), BBA(4) → bachelors
// MSc(5), MA(6), MBA(7), MEng(8), MPH(12) → masters / mba
// PhD(9) → phd
// Others are mapped to closest fit.

function degreeIdToDegreeLevel(degreeId: number): DegreeLevel {
  switch (degreeId) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 14:
    case 15:
      return "bachelors";
    case 7:
      return "mba";
    case 9:
      return "phd";
    case 5:
    case 6:
    case 8:
    case 12:
    default:
      return "masters";
  }
}

// Reverse: app DegreeLevel → list of external degree IDs to query
function degreeLevelToDegreeIds(level: DegreeLevel): number[] {
  switch (level) {
    case "bachelors":
      return [1, 2, 3, 4, 14, 15];
    case "masters":
      return [5, 6, 8, 12];
    case "mba":
      return [7];
    case "phd":
      return [9];
  }
}

// ─── Fetch helpers (server-side only) ──────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const { url: baseUrl, key } = getApiConfig();
  if (!key) {
    throw new Error("UNIVERSITY_API_KEY not configured");
  }

  const fullUrl = `${baseUrl}${path}`;
  const res = await fetch(fullUrl, {
    headers: { "X-API-Key": key },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ExternalAPI] ${res.status} on ${path}:`, body.slice(0, 200));
    throw new Error(`External API error: ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

// ─── External scholarship response type ───────────────

export interface ExtScholarship {
  id: number;
  university_id: number | null;
  name: string;
  provider: string | null;
  scholarship_type: string | null;
  amount: number | null;
  amount_currency: string | null;
  coverage: string | null;
  eligible_degrees: string | null;
  eligible_countries: string | null;
  open_for_international: boolean;
  eligibility_criteria: string | null;
  required_documents: string | null;
  application_deadline: string | null;
  application_url: string | null;
  renewable: boolean;
  number_of_awards: number | null;
  description: string | null;
}

/**
 * Fetch scholarships from the external API.
 * The API caps list results at 200 per call and offset wraps around,
 * so we fetch the first 200 and optionally fetch individual IDs beyond that.
 */
export async function fetchExternalScholarships(opts?: {
  limit?: number;
}): Promise<ExtScholarship[]> {
  const limit = opts?.limit ?? 200;
  return apiFetch<ExtScholarship[]>(`/scholarships/?limit=${limit}`);
}

/**
 * Fetch a single scholarship by ID.
 */
export async function fetchExternalScholarshipById(
  id: number
): Promise<ExtScholarship | null> {
  try {
    return await apiFetch<ExtScholarship>(`/scholarships/${id}`);
  } catch {
    return null;
  }
}

/**
 * Fetch a university by ID (used to resolve scholarship → university links).
 */
export async function fetchExternalUniversityById(
  id: number
): Promise<{ name: string; country: string; city: string } | null> {
  try {
    const uni = await apiFetch<ExtUniversity>(`/universities/${id}`);
    return { name: uni.name, country: uni.country, city: uni.city };
  } catch {
    return null;
  }
}

/**
 * Fetch a single external program by its synthetic ID (e.g. "ext-prog-4486").
 * Returns the Program with its University attached, or null if not found.
 */
export async function fetchExternalProgramById(
  syntheticId: string
): Promise<(Program & { university: University }) | null> {
  const match = syntheticId.match(/^ext-prog-(\d+)$/);
  if (!match) return null;

  const courseId = Number(match[1]);
  try {
    const course = await apiFetch<ExtCourse>(`/courses/${courseId}`);
    const extUni = await apiFetch<ExtUniversity>(
      `/universities/${course.university_id}`
    );
    const uni = mapUniversity(extUni);
    const degreeLevel = degreeIdToDegreeLevel(course.degree_id);
    const program = mapProgram(course, uni, degreeLevel);
    return { ...program, university: uni };
  } catch {
    return null;
  }
}

/**
 * Ensure an external program (and its university) exist in the local DB
 * so that Application and other FK-constrained records can reference it.
 *
 * Uses deterministic UUIDs derived from the external IDs, so repeated
 * calls for the same program are idempotent upserts.
 *
 * Returns the local Program (with university) or null if the external
 * fetch failed.
 */
export async function materializeExternalProgram(
  syntheticId: string
): Promise<(Program & { university: University }) | null> {
  const match = syntheticId.match(/^ext-prog-(\d+)$/);
  if (!match) return null;

  const courseId = Number(match[1]);
  let course: ExtCourse;
  let extUni: ExtUniversity;
  try {
    course = await apiFetch<ExtCourse>(`/courses/${courseId}`);
    extUni = await apiFetch<ExtUniversity>(
      `/universities/${course.university_id}`
    );
  } catch {
    return null;
  }

  // Lazy-import prisma to avoid circular deps at module level
  const { prisma } = await import("@/lib/db");

  const uniId = externalIdToUuid(`ext-uni-${extUni.id}`);
  const progId = externalIdToUuid(syntheticId);
  const degreeLevel = degreeIdToDegreeLevel(course.degree_id);
  const mappedUni = mapUniversity(extUni);
  const mappedProg = mapProgram(course, { ...mappedUni, id: uniId }, degreeLevel);

  // Upsert university
  await prisma.university.upsert({
    where: { id: uniId },
    create: { ...mappedUni, id: uniId },
    update: { name: mappedUni.name, country: mappedUni.country, city: mappedUni.city },
  });

  // Upsert program
  await prisma.program.upsert({
    where: { id: progId },
    create: { ...mappedProg, id: progId, universityId: uniId },
    update: { name: mappedProg.name, tuitionAnnual: mappedProg.tuitionAnnual },
  });

  const program = await prisma.program.findUnique({
    where: { id: progId },
    include: { university: true },
  });

  return program;
}

// ─── Public API ────────────────────────────────────────

// ─── Related field expansion ───────────────────────────

const RELATED_FIELDS: Record<string, string[]> = {
  "data science": ["Computer Science", "Artificial Intelligence", "Statistics", "Machine Learning", "Analytics"],
  "computer science": ["Data Science", "Software Engineering", "Information Technology", "Cybersecurity"],
  "artificial intelligence": ["Data Science", "Computer Science", "Machine Learning", "Robotics"],
  "business": ["Management", "Finance", "Economics", "Marketing"],
  "engineering": ["Mechanical Engineering", "Electrical Engineering", "Civil Engineering"],
  "mathematics": ["Statistics", "Applied Mathematics", "Data Science"],
  "biology": ["Biotechnology", "Biomedical", "Life Sciences", "Biochemistry"],
  "physics": ["Applied Physics", "Astrophysics", "Engineering Physics"],
  "psychology": ["Cognitive Science", "Neuroscience", "Behavioral Science"],
  "economics": ["Finance", "Business", "Statistics", "Public Policy"],
};

function expandFieldSearch(fieldSearch?: string): string[] {
  if (!fieldSearch) return [];

  // Clean: "Data Science / AI" → "Data Science"
  const primary = fieldSearch.split(/[\/,&]/)[0].trim();
  if (!primary) return [];

  const terms = [primary];
  const key = primary.toLowerCase();

  // Find related terms
  for (const [field, related] of Object.entries(RELATED_FIELDS)) {
    if (key.includes(field) || field.includes(key)) {
      for (const r of related) {
        if (!terms.some((t) => t.toLowerCase() === r.toLowerCase())) {
          terms.push(r);
        }
      }
    }
  }

  return terms;
}

/**
 * Fetch courses from external API that match the user's target degree level,
 * with optional field search. Joins with university data.
 *
 * Returns Program objects with their University attached (same shape
 * that Prisma returns with `include: { university: true }`).
 */
export async function fetchExternalPrograms(opts: {
  degreeLevel: DegreeLevel;
  countries?: string[];
  fieldSearch?: string;
  limit?: number;
}): Promise<(Program & { university: University })[]> {
  const { degreeLevel, countries, fieldSearch, limit = 200 } = opts;

  // Expand field search into related terms for broader results
  const searchTerms = expandFieldSearch(fieldSearch);

  // 1. Fetch courses for each degree ID × search term combination
  const degreeIds = degreeLevelToDegreeIds(degreeLevel);
  const seenCourseIds = new Set<number>();
  const allCourses: ExtCourse[] = [];

  // Fetch primary term first, then related terms
  for (const term of searchTerms) {
    const coursePromises = degreeIds.map((did) => {
      const path = `/courses/?degree_id=${did}&open_for_international=true&limit=${limit}&search=${encodeURIComponent(term)}`;
      return apiFetch<ExtCourse[]>(path);
    });

    const results = await Promise.all(coursePromises);
    for (const batch of results) {
      for (const course of batch) {
        if (!seenCourseIds.has(course.id)) {
          seenCourseIds.add(course.id);
          allCourses.push(course);
        }
      }
    }
  }

  // 2. Resolve universities for matched courses
  const uniIdsNeeded = [...new Set(allCourses.map((c) => c.university_id))];
  const uniMap = new Map<number, University>();

  // Batch-fetch universities (10 at a time to stay within rate limits)
  for (let i = 0; i < uniIdsNeeded.length; i += 10) {
    const batch = uniIdsNeeded.slice(i, i + 10);
    await Promise.all(
      batch.map(async (uid) => {
        try {
          const extUni = await apiFetch<ExtUniversity>(`/universities/${uid}`);
          uniMap.set(uid, mapUniversity(extUni));
        } catch {
          // skip
        }
      })
    );
  }

  // 3. Map courses → Programs, filtering by country
  const programs: (Program & { university: University })[] = [];

  for (const course of allCourses) {
    const uni = uniMap.get(course.university_id);
    if (!uni) continue;

    // Filter by country if specified
    if (countries && countries.length > 0) {
      if (!countries.some((c) => c.toLowerCase() === uni.country.toLowerCase())) {
        continue;
      }
    }

    const program = mapProgram(course, uni, degreeLevel);
    programs.push({ ...program, university: uni });
  }

  return programs;
}

/**
 * Search courses across all universities using the search endpoint.
 */
export async function searchExternalPrograms(
  query: string,
  degreeLevel?: DegreeLevel,
  limit = 50
): Promise<(Program & { university: University })[]> {
  const degreeIds = degreeLevel ? degreeLevelToDegreeIds(degreeLevel) : [];

  let allCourses: ExtCourse[] = [];

  if (degreeIds.length > 0) {
    const coursePromises = degreeIds.map((did) =>
      apiFetch<ExtCourse[]>(
        `/courses/?degree_id=${did}&search=${encodeURIComponent(query)}&limit=${limit}`
      )
    );
    allCourses = (await Promise.all(coursePromises)).flat();
  } else {
    allCourses = await apiFetch<ExtCourse[]>(
      `/courses/?search=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  // Resolve universities
  const uniIds = [...new Set(allCourses.map((c) => c.university_id))];
  const uniMap = new Map<number, University>();

  for (let i = 0; i < uniIds.length; i += 10) {
    const batch = uniIds.slice(i, i + 10);
    await Promise.all(
      batch.map(async (uid) => {
        try {
          const extUni = await apiFetch<ExtUniversity>(`/universities/${uid}`);
          uniMap.set(uid, mapUniversity(extUni));
        } catch {
          // skip
        }
      })
    );
  }

  const programs: (Program & { university: University })[] = [];

  for (const course of allCourses) {
    const uni = uniMap.get(course.university_id);
    if (!uni) continue;

    const dl = degreeLevel ?? degreeIdToDegreeLevel(course.degree_id);
    const program = mapProgram(course, uni, dl);
    programs.push({ ...program, university: uni });
  }

  return programs;
}

// ─── Internal mapping functions ────────────────────────

function mapUniversity(ext: ExtUniversity): University {
  const logoUrl = ext.logo_url || getUniversityLogoUrl(null, ext.website);

  return {
    id: `ext-uni-${ext.id}`,
    name: ext.name,
    country: ext.country,
    city: ext.city,
    qsRanking: ext.ranking_world,
    theRanking: ext.ranking_national,
    acceptanceRate: ext.acceptance_rate
      ? ext.acceptance_rate > 1
        ? ext.acceptance_rate // already a percentage like 3.96
        : ext.acceptance_rate * 100
      : null,
    websiteUrl: ext.website,
    countryFlagEmoji: null,
    logoUrl,
    type: ext.university_type,

    // Enriched
    overview: ext.description,
    campusSize: ext.campus_size,
    totalStudents: ext.student_count,
    internationalPct: null,
    studentFacultyRatio: null,
    researchOutput: null,

    // Post-study
    postStudyWorkVisa: null,
    avgPostGradSalary: null,
    avgPostGradSalaryCcy: null,
    employmentRate: null,

    // Application
    applicationPortalUrl: ext.application_portal_url,
    generalAppFee: null,
    generalAppFeeCcy: "USD",
    acceptsCommonApp: false,

    // Data freshness
    lastEnrichedAt: null,
    enrichmentSource: "api",
  } as University;
}

function mapProgram(
  course: ExtCourse,
  uni: University,
  degreeLevel: DegreeLevel,
): Program {
  const deadline = course.application_deadline
    ? new Date(course.application_deadline)
    : null;

  // Use international tuition if available, else domestic
  const tuition = course.tuition_fee_international ?? course.tuition_fee_per_year ?? 0;
  const currency = course.tuition_fee_currency ?? "USD";

  return {
    id: `ext-prog-${course.id}`,
    universityId: uni.id,
    name: course.name,
    degreeLevel,
    field: course.department ?? course.name, // best guess for field
    subField: null,
    durationMonths: course.duration_years
      ? Math.round(course.duration_years * 12)
      : 24,
    tuitionAnnual: tuition,
    tuitionCurrency: currency,
    livingCostMonthly: null,
    applicationUrl: course.application_url,

    // Admission requirements — not available from the API, leave null
    // so the scoring gives neutral scores rather than hard-failing
    minGpa: null,
    minGpaScale: null,
    minIelts: null,
    minToefl: null,
    minPte: null,
    minGre: null,
    minGmat: null,
    requiresGre: false,
    requiresGmat: false,
    minWorkExpMonths: null,
    backlogsAllowed: null,
    requiresLor: null,
    requiresSop: true,
    requiresResume: true,
    requiresPortfolio: false,

    // Deadlines
    applicationDeadline: deadline,
    earlyDeadline: null,
    intake: null,
    intakesAvailable: [],
    applicationFee: course.application_fee,
    applicationFeeCcy: currency,

    // Scholarships
    scholarshipsCount: 0,
    scholarshipDetails: null,
    hasAssistantship: false,
    hasFellowship: false,

    // Outcome
    avgAdmitGpa: null,
    avgAdmitGre: null,
    placementRate: null,

    // Curriculum
    stemDesignated: false,
    thesisOption: false,
    coopInternship: false,
    onlineMixed: course.mode === "online" || course.mode === "hybrid",
    courseHighlights: [],

    // Data freshness
    lastVerifiedAt: null,
    dataSource: "api",
  } as Program;
}

