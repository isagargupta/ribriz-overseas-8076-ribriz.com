import { anthropic, ENRICHMENT_MODEL } from "./claude";

// ─── Types for AI-structured university data ────────────

export interface EnrichedProgram {
  name: string;
  degreeLevel: "masters" | "mba" | "bachelors";
  field: string;
  subField: string | null;
  durationMonths: number;
  tuitionAnnual: number;
  tuitionCurrency: string;
  livingCostMonthly: number | null;
  applicationUrl: string | null;

  // Admission
  minGpa: number | null;
  minGpaScale: "scale_10" | "scale_4" | "scale_100" | null;
  minIelts: number | null;
  minToefl: number | null;
  minPte: number | null;
  minGre: number | null;
  minGmat: number | null;
  requiresGre: boolean;
  requiresGmat: boolean;
  minWorkExpMonths: number | null;
  backlogsAllowed: number | null;
  requiresLor: number | null;
  requiresSop: boolean;
  requiresResume: boolean;
  requiresPortfolio: boolean;

  // Deadlines
  applicationDeadline: string | null;
  earlyDeadline: string | null;
  intake: string | null;
  intakesAvailable: string[];
  applicationFee: number | null;
  applicationFeeCcy: string | null;

  // Scholarships
  scholarshipsCount: number;
  scholarshipDetails: string | null;
  hasAssistantship: boolean;
  hasFellowship: boolean;

  // Outcome
  avgAdmitGpa: number | null;
  avgAdmitGre: number | null;
  placementRate: number | null;

  // Curriculum
  stemDesignated: boolean;
  thesisOption: boolean;
  coopInternship: boolean;
  onlineMixed: boolean;
  courseHighlights: string[];
}

export interface EnrichedUniversity {
  name: string;
  country: string;
  city: string;
  qsRanking: number | null;
  theRanking: number | null;
  acceptanceRate: number | null;
  websiteUrl: string | null;
  countryFlagEmoji: string;
  type: string | null;
  overview: string | null;
  campusSize: string | null;
  totalStudents: number | null;
  internationalPct: number | null;
  studentFacultyRatio: string | null;
  researchOutput: string | null;
  postStudyWorkVisa: string | null;
  avgPostGradSalary: number | null;
  avgPostGradSalaryCcy: string | null;
  employmentRate: number | null;
  applicationPortalUrl: string | null;
  generalAppFee: number | null;
  generalAppFeeCcy: string | null;
  programs: EnrichedProgram[];
}

// ─── Prompt for AI enrichment ───────────────────────────

const ENRICHMENT_SYSTEM_PROMPT = `You are a university data research assistant. Given a university name, country, and optionally a target field of study, you return comprehensive, accurate data about the university and its programs.

CRITICAL RULES:
1. Only return data you are reasonably confident about. Use null for unknown fields.
2. For tuition, use the INTERNATIONAL student rate (not domestic).
3. GPA minimums: use the scale the university publishes (indicate which scale via minGpaScale). If they use percentage, use scale_100. If they use 4.0, use scale_4. Indian universities on 10-point scale use scale_10.
4. For deadlines, use the NEXT upcoming intake cycle. Use ISO date format (YYYY-MM-DD).
5. Living cost should be monthly estimate for a student in that city.
6. Country flag emoji must be correct for the country.
7. Return ONLY programs in the requested field(s). If no field specified, return the most popular 5-8 programs for international students.
8. For post-study work visa, describe what's available in that country for international graduates.
9. stemDesignated only applies to US programs — set false for other countries.
10. Be specific with scholarship details — mention names, amounts, eligibility if known.

You MUST respond with valid JSON matching the schema exactly. No markdown, no explanation — just the JSON object.`;

function buildUserPrompt(
  universityName: string,
  country: string,
  targetFields?: string[],
  degreeLevel?: string
): string {
  let prompt = `Research and return comprehensive data for:

University: ${universityName}
Country: ${country}`;

  if (targetFields?.length) {
    prompt += `\nTarget fields: ${targetFields.join(", ")}`;
  }
  if (degreeLevel) {
    prompt += `\nDegree level: ${degreeLevel}`;
  }

  prompt += `\n\nReturn a JSON object with this exact structure:
{
  "name": "Full official name",
  "country": "${country}",
  "city": "City name",
  "qsRanking": number or null,
  "theRanking": number or null,
  "acceptanceRate": number (percentage 0-100) or null,
  "websiteUrl": "https://...",
  "countryFlagEmoji": "flag emoji",
  "type": "public" | "private" | "research",
  "overview": "2-3 sentence description of the university",
  "campusSize": "large" | "medium" | "small" or null,
  "totalStudents": number or null,
  "internationalPct": number (percentage) or null,
  "studentFacultyRatio": "1:X" or null,
  "researchOutput": "very high" | "high" | "medium" or null,
  "postStudyWorkVisa": "description of post-study work rights",
  "avgPostGradSalary": number or null,
  "avgPostGradSalaryCcy": "USD" etc or null,
  "employmentRate": number (percentage) or null,
  "applicationPortalUrl": "https://..." or null,
  "generalAppFee": number or null,
  "generalAppFeeCcy": "USD" etc or null,
  "programs": [
    {
      "name": "Full program name as listed on university website",
      "degreeLevel": "masters" | "mba" | "bachelors",
      "field": "Primary field category",
      "subField": "Specialization" or null,
      "durationMonths": number,
      "tuitionAnnual": number (international student rate),
      "tuitionCurrency": "USD" etc,
      "livingCostMonthly": number or null,
      "applicationUrl": "direct link to program application" or null,
      "minGpa": number or null,
      "minGpaScale": "scale_4" | "scale_10" | "scale_100" or null,
      "minIelts": number or null,
      "minToefl": number or null,
      "minPte": number or null,
      "minGre": number or null,
      "minGmat": number or null,
      "requiresGre": boolean,
      "requiresGmat": boolean,
      "minWorkExpMonths": number or null,
      "backlogsAllowed": number or null,
      "requiresLor": number (count of letters) or null,
      "requiresSop": boolean,
      "requiresResume": boolean,
      "requiresPortfolio": boolean,
      "applicationDeadline": "YYYY-MM-DD" or null,
      "earlyDeadline": "YYYY-MM-DD" or null,
      "intake": "Fall 2027" etc or null,
      "intakesAvailable": ["Fall 2027", "Spring 2028"],
      "applicationFee": number or null,
      "applicationFeeCcy": "USD" etc or null,
      "scholarshipsCount": number,
      "scholarshipDetails": "description" or null,
      "hasAssistantship": boolean,
      "hasFellowship": boolean,
      "avgAdmitGpa": number or null,
      "avgAdmitGre": number or null,
      "placementRate": number (percentage) or null,
      "stemDesignated": boolean,
      "thesisOption": boolean,
      "coopInternship": boolean,
      "onlineMixed": boolean,
      "courseHighlights": ["course1", "course2", "course3"]
    }
  ]
}`;

  return prompt;
}

// ─── Main enrichment function ───────────────────────────

export async function enrichUniversity(
  universityName: string,
  country: string,
  targetFields?: string[],
  degreeLevel?: string
): Promise<EnrichedUniversity> {
  const response = await anthropic.messages.create({
    model: ENRICHMENT_MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: ENRICHMENT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(universityName, country, targetFields, degreeLevel),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse, stripping any markdown fences the model might add
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const data = JSON.parse(cleaned) as EnrichedUniversity;

  return data;
}

// ─── Batch enrichment for multiple universities ─────────

export async function enrichMultipleUniversities(
  universities: { name: string; country: string }[],
  targetFields?: string[],
  degreeLevel?: string
): Promise<EnrichedUniversity[]> {
  // Process in parallel batches of 3 to avoid rate limits
  const batchSize = 3;
  const results: EnrichedUniversity[] = [];

  for (let i = 0; i < universities.length; i += batchSize) {
    const batch = universities.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((uni) =>
        enrichUniversity(uni.name, uni.country, targetFields, degreeLevel)
      )
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error("Enrichment failed for a university:", result.reason);
      }
    }
  }

  return results;
}
