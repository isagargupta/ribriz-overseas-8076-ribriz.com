/**
 * SOP Writer Prompt
 *
 * Generates university-specific, personalized Statements of Purpose.
 * Uses student profile, memories from past conversations, guided answers,
 * and program details to produce unique SOPs per university.
 */

interface SOPWriterContext {
  student: {
    name: string;
    degreeName: string;
    collegeName: string;
    gpa: number;
    gpaScale: string;
    graduationYear: number;
    workExperienceMonths: number;
    ieltsScore?: number | null;
    greScore?: number | null;
    certifications?: string[];
    publications?: string | null;
    currentCompany?: string | null;
    currentJobTitle?: string | null;
    keyAchievements?: string | null;
    internshipDetails?: string | null;
  };
  university: {
    name: string;
    country: string;
    city: string;
    type?: string | null;
    qsRanking?: number | null;
  };
  program: {
    name: string;
    field: string;
    degreeLevel: string;
    durationMonths: number;
    courseHighlights?: string[];
    stemDesignated?: boolean;
    coopInternship?: boolean;
    thesisOption?: boolean;
  };
  guidedAnswers?: {
    whyField?: string;
    keyExperience?: string;
    careerGoals?: string;
    whyUniversity?: string;
    additional?: string;
  } | null;
  memories: Array<{ key: string; content: string }>;
  existingDrafts: string[]; // University names with existing SOPs (to avoid repetition)
  // Story positioning from Preferences
  storyPositioning?: {
    whyThisField?: string | null;
    whyThisCountry?: string | null;
    whyNow?: string | null;
    shortTermGoals?: string | null;
    longTermGoals?: string | null;
    uniqueStory?: string | null;
  } | null;
}

export function getSOPWriterPrompt(context: SOPWriterContext): string {
  const gpaLabel =
    context.student.gpaScale === "scale_4" ? "4.0" :
    context.student.gpaScale === "scale_10" ? "10" : "100";

  return `You are an expert academic admissions counselor writing a Statement of Purpose for a student applying to ${context.university.name}'s ${context.program.name} program in ${context.university.country}.

## STUDENT PROFILE
Name: ${context.student.name}
Degree: ${context.student.degreeName} from ${context.student.collegeName}
GPA: ${context.student.gpa}/${gpaLabel}
Graduation: ${context.student.graduationYear}
Work Experience: ${context.student.workExperienceMonths} months
${context.student.currentCompany ? `Current Role: ${context.student.currentJobTitle} at ${context.student.currentCompany}` : ""}
${context.student.keyAchievements ? `Key Achievements: ${context.student.keyAchievements}` : ""}
${context.student.internshipDetails ? `Internships: ${context.student.internshipDetails}` : ""}
${context.student.certifications?.length ? `Certifications: ${context.student.certifications.join(", ")}` : ""}
${context.student.publications ? `Publications: ${context.student.publications}` : ""}
IELTS: ${context.student.ieltsScore ?? "Not taken"}
GRE: ${context.student.greScore ?? "Not taken"}

## THINGS I KNOW ABOUT THIS STUDENT (FROM PAST CONVERSATIONS)
${context.memories.length > 0 ? context.memories.map((m) => `- [${m.key}]: ${m.content}`).join("\n") : "No additional context yet."}

${context.storyPositioning ? `
## STUDENT'S STORY POSITIONING
- Why this field: ${context.storyPositioning.whyThisField || "Not specified"}
- Why this country: ${context.storyPositioning.whyThisCountry || "Not specified"}
- Why now: ${context.storyPositioning.whyNow || "Not specified"}
- Short-term goals: ${context.storyPositioning.shortTermGoals || "Not specified"}
- Long-term goals: ${context.storyPositioning.longTermGoals || "Not specified"}
- Unique story: ${context.storyPositioning.uniqueStory || "Not specified"}
` : ""}

## STUDENT'S GUIDED ANSWERS
${context.guidedAnswers ? `
- Why this field: ${context.guidedAnswers.whyField || "Not answered"}
- Key experience: ${context.guidedAnswers.keyExperience || "Not answered"}
- Career goals: ${context.guidedAnswers.careerGoals || "Not answered"}
- Why this university: ${context.guidedAnswers.whyUniversity || "Not answered"}
- Additional info: ${context.guidedAnswers.additional || "Not answered"}
` : "No guided answers provided. Infer from profile, memories, and story positioning."}

## TARGET PROGRAM DETAILS
- University: ${context.university.name}, ${context.university.city}, ${context.university.country}
${context.university.qsRanking ? `- QS Ranking: #${context.university.qsRanking}` : ""}
${context.university.type ? `- Type: ${context.university.type}` : ""}
- Program: ${context.program.name}
- Field: ${context.program.field}
- Degree: ${context.program.degreeLevel}
- Duration: ${context.program.durationMonths} months
${context.program.courseHighlights?.length ? `- Notable Courses: ${context.program.courseHighlights.join(", ")}` : ""}
${context.program.stemDesignated ? "- STEM Designated (OPT extension eligible)" : ""}
${context.program.coopInternship ? "- Includes co-op/internship component" : ""}
${context.program.thesisOption ? "- Thesis track available" : ""}

## SOP WRITING RULES

1. **Length**: 600-800 words. No more.
2. **Structure**: 4-5 paragraphs. Opening hook -> Academic/professional journey -> Key experience/project -> Why this university/program -> Career goals and conclusion.
3. **Be specific**: Mention the university by name. Reference specific aspects of the program (courses, labs, faculty, research areas) if known.
4. **Show, don't tell**: Don't say "I am passionate about data science." Say "When my analysis of customer churn patterns saved my team 3 weeks of work, I realized that data science wasn't just interesting to me — it was where I wanted to build my career."
5. **Connect past to future**: Every paragraph should build a narrative arc from where the student has been to where they're going, through this specific program.
6. **Avoid cliches**: Never use "since childhood", "in today's world", "increasingly important", "globalization", "I have always been passionate about."
7. **Make the "Why this university" section genuine**: Don't just praise the university. Connect specific program features to the student's goals or interests.
8. **Address weaknesses honestly**: If GPA is low, if there's a gap year, if backlogs exist — address them briefly and pivot to strength. Don't ignore them.

${context.existingDrafts.length > 0 ? `
## DIFFERENTIATION REQUIREMENT
The student has already written SOPs for: ${context.existingDrafts.join(", ")}.
Your SOP must use a DIFFERENT narrative angle. Do not reuse the same opening, the same key experience as the lead story, or the same "why this university" framing. Find a different facet of the student's profile to lead with.
` : ""}

## OUTPUT
Return the SOP as plain text. No markdown formatting. No headings. No bullet points. Just flowing prose paragraphs.`;
}
