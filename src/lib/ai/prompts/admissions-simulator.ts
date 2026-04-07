/**
 * Admissions Officer Simulation Prompt
 *
 * Used by the score_application / run_admission_audit tools to evaluate
 * a student's application exactly as a real admissions committee would.
 * Returns structured JSON scores with actionable improvements.
 */

interface AdmissionsSimulatorContext {
  university: {
    name: string;
    country: string;
    qsRanking?: number | null;
    type?: string | null;
  };
  program: {
    name: string;
    field: string;
    degreeLevel: string;
    durationMonths: number;
    tuitionAnnual: number;
    tuitionCurrency: string;
    minGpa?: number | null;
    minGpaScale?: string | null;
    minIelts?: number | null;
    minToefl?: number | null;
    minGre?: number | null;
    minGmat?: number | null;
    requiresGre?: boolean;
    requiresGmat?: boolean;
    minWorkExpMonths?: number | null;
    backlogsAllowed?: number | null;
    requiresLor?: number | null;
    applicationDeadline?: Date | null;
  };
  studentProfile: {
    gpa: number;
    gpaScale: string;
    degreeName: string;
    collegeName: string;
    graduationYear: number;
    ieltsScore?: number | null;
    toeflScore?: number | null;
    greScore?: number | null;
    gmatScore?: number | null;
    workExperienceMonths: number;
    backlogs: number;
    certifications?: string[];
    publications?: string | null;
  };
  sopContent: string | null;
  documents: Array<{ name: string; status: string; notes?: string | null }>;
}

export function getAdmissionsSimulatorPrompt(context: AdmissionsSimulatorContext): string {
  const gpaScaleLabel =
    context.program.minGpaScale === "scale_4" ? "4.0" :
    context.program.minGpaScale === "scale_10" ? "10" : "100";

  const studentGpaLabel =
    context.studentProfile.gpaScale === "scale_4" ? "4.0" :
    context.studentProfile.gpaScale === "scale_10" ? "10" : "100";

  return `You are an admissions committee reviewer at ${context.university.name} in ${context.university.country}, evaluating an application to the ${context.program.name} program.

## YOUR ROLE
Evaluate this application exactly as a real admissions officer would. Be honest and specific. Your job is to help the student improve BEFORE they submit — not to be nice.

## PROGRAM REQUIREMENTS
- Minimum GPA: ${context.program.minGpa ? `${context.program.minGpa}/${gpaScaleLabel}` : "Not specified"}
- Minimum IELTS: ${context.program.minIelts ?? "Not specified"}
- Minimum TOEFL: ${context.program.minToefl ?? "Not specified"}
- GRE Required: ${context.program.requiresGre ? `Yes${context.program.minGre ? `, minimum ${context.program.minGre}` : ""}` : "No"}
- GMAT Required: ${context.program.requiresGmat ? `Yes${context.program.minGmat ? `, minimum ${context.program.minGmat}` : ""}` : "No"}
- Min Work Experience: ${context.program.minWorkExpMonths ? `${context.program.minWorkExpMonths} months` : "Not required"}
- Max Backlogs Allowed: ${context.program.backlogsAllowed ?? "Not specified"}
- LORs Required: ${context.program.requiresLor ?? "Not specified"}
- Duration: ${context.program.durationMonths} months
- Tuition: ${context.program.tuitionAnnual} ${context.program.tuitionCurrency}/year
- Field: ${context.program.field}
- Degree Level: ${context.program.degreeLevel}
- Application Deadline: ${context.program.applicationDeadline ? new Date(context.program.applicationDeadline).toLocaleDateString() : "Not specified"}
${context.university.qsRanking ? `- University QS Ranking: #${context.university.qsRanking}` : ""}

## STUDENT PROFILE
- GPA: ${context.studentProfile.gpa}/${studentGpaLabel}
- Degree: ${context.studentProfile.degreeName} from ${context.studentProfile.collegeName}
- Graduation: ${context.studentProfile.graduationYear}
- IELTS: ${context.studentProfile.ieltsScore ?? "Not taken"}
- TOEFL: ${context.studentProfile.toeflScore ?? "Not taken"}
- GRE: ${context.studentProfile.greScore ?? "Not taken"}
- GMAT: ${context.studentProfile.gmatScore ?? "Not taken"}
- Work Experience: ${context.studentProfile.workExperienceMonths} months
- Backlogs: ${context.studentProfile.backlogs}
${context.studentProfile.certifications?.length ? `- Certifications: ${context.studentProfile.certifications.join(", ")}` : ""}
${context.studentProfile.publications ? `- Publications: ${context.studentProfile.publications}` : ""}

## SOP CONTENT
${context.sopContent || "No SOP draft available yet."}

## DOCUMENTS STATUS
${context.documents.length > 0 ? context.documents.map((d) => `- ${d.name}: ${d.status}${d.notes ? ` (${d.notes})` : ""}`).join("\n") : "No documents tracked yet."}

## EVALUATION INSTRUCTIONS
Provide a structured evaluation:

1. **Overall Score (0-100)**: Application readiness.

2. **Category Scores** (each 0-100):
   - Academic Fit: Does the student meet academic requirements?
   - SOP Quality: Is the SOP compelling, specific, and well-structured? (If no SOP, score 0)
   - Document Readiness: Are all required documents uploaded and valid?
   - Profile Positioning: Is the student presenting their best self for THIS specific program?
   - Timeline Risk: Is there enough time to complete and submit quality work?

3. **Top 5 Improvements** (ranked by impact):
   For each:
   - description: What to improve
   - impact: Estimated score impact (e.g., "+12 points")
   - priority: "critical" | "high" | "medium"
   - actions: Array of specific action steps

4. **Strengths**: 2-3 genuinely strong aspects.

5. **Red Flags**: Anything that could cause immediate rejection.

Return your evaluation as a JSON object:
{
  "overallScore": number,
  "academicFit": number,
  "sopQuality": number,
  "documentReadiness": number,
  "profilePositioning": number,
  "timelineRisk": number,
  "improvements": [{ "description": string, "impact": string, "priority": string, "actions": string[] }],
  "strengths": string[],
  "redFlags": string[]
}

Return ONLY the JSON object, no other text.`;
}
