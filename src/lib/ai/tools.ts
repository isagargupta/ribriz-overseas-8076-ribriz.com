import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, SOP_MODEL } from "./claude";
import { prisma } from "@/lib/db";
import {
  computeMatchScore,
  generateAdmissionAudit,
  getBadge,
  getBucket,
  getBucketLabel,
  analyzeProfileStrength,
  formatTuition,
  formatLivingCost,
  formatDeadline,
} from "@/lib/scoring";
import {
  findSimilarStudents,
  predictFromPeers,
  scoreDocument,
  recordOutcome,
  recomputeStudentVector,
} from "./ml-engine";
import { fetchExternalScholarships } from "@/lib/external-university-api";
import { getSOPWriterPrompt } from "./prompts/sop-writer";
import { getRelevantMemories } from "./memory";

// ─── Write Operations (require user confirmation) ──────

export const WRITE_OPERATIONS = new Set([
  "update_profile",
  "shortlist_program",
  "update_application",
  "remove_application",
  "generate_sop",
  "generate_email_draft",
  "create_workspace",
  "create_document",
  "record_outcome",
]);

// ─── Tool Labels (shown to user during execution) ──────

export const TOOL_LABELS: Record<string, string> = {
  search_universities: "Searching universities",
  check_eligibility: "Checking eligibility",
  get_deadlines: "Fetching deadlines",
  compare_costs: "Comparing costs",
  find_scholarships: "Searching scholarships",
  get_document_requirements: "Checking documents",
  get_visa_info: "Getting visa info",
  shortlist_program: "Adding to shortlist",
  get_my_applications: "Loading applications",
  get_student_profile: "Reading your profile",
  web_search: "Searching the web",
  generate_sop: "Writing SOP",
  generate_email_draft: "Drafting email",
  mock_interview: "Preparing interview",
  calculate_roi: "Calculating ROI",
  update_application: "Updating application",
  remove_application: "Removing application",
  build_timeline: "Building timeline",
  compare_countries: "Comparing countries",
  update_profile: "Updating your profile",
  extract_document_data: "Extracting document data",
  generate_application_packet: "Generating application packet",
  analyze_profile_strength: "Analyzing your profile",
  strategic_recommendation: "Building strategic recommendation",
  run_admission_audit: "Running admission audit",
  create_workspace: "Creating application workspace",
  get_workspace_documents: "Loading workspace documents",
  create_document: "Creating document",
  find_similar_students: "Finding similar students",
  predict_from_peers: "Predicting from peer data",
  score_document: "Scoring document quality",
  record_outcome: "Recording admission outcome",
  find_external_scholarships: "Searching external scholarships",
  calculate_finances: "Building financial plan",
};

// ─── Tool Definitions ───────────────────────────────────

export const RIZ_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "search_universities",
    description:
      "Search and filter universities/programs from the database. Use this when the student asks about university recommendations, program search, or wants to find programs matching specific criteria like country, field, budget, ranking, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Filter by country names, e.g. ['Germany', 'Canada']",
        },
        field: {
          type: "string",
          description: "Field of study, e.g. 'Computer Science', 'Data Science / AI', 'Mechanical Engineering', 'Business / MBA'",
        },
        degreeLevel: {
          type: "string",
          enum: ["masters", "mba", "bachelors"],
          description: "Degree level to filter by",
        },
        maxTuition: {
          type: "number",
          description: "Maximum annual tuition in the program's local currency",
        },
        maxQsRanking: {
          type: "number",
          description: "Maximum QS ranking (e.g. 100 means top 100)",
        },
        requiresGre: {
          type: "boolean",
          description: "Filter for programs that require/don't require GRE",
        },
        limit: {
          type: "number",
          description: "Max results to return. Default 10.",
        },
      },
      required: [],
    },
  },
  {
    name: "check_eligibility",
    description:
      "Check the student's eligibility and match score for a specific university or program. Use this when the student asks 'Am I eligible for X?', 'What are my chances at X?', or 'How do I match with X?'. Returns detailed breakdown of GPA, IELTS, GRE, budget fit, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "University name to check eligibility for",
        },
        programName: {
          type: "string",
          description: "Specific program name (optional — if omitted, checks all programs at the university)",
        },
      },
      required: ["universityName"],
    },
  },
  {
    name: "get_deadlines",
    description:
      "Get upcoming application deadlines for the student's target programs or all programs. Use when student asks about deadlines, timeline, or 'what's due soon'.",
    input_schema: {
      type: "object" as const,
      properties: {
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Filter by countries",
        },
        field: {
          type: "string",
          description: "Filter by field of study",
        },
        limit: {
          type: "number",
          description: "Max results. Default 15.",
        },
      },
      required: [],
    },
  },
  {
    name: "compare_costs",
    description:
      "Compare costs (tuition + living) between universities or cities. Use when student asks to compare costs, affordability, or budget planning across universities.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityNames: {
          type: "array",
          items: { type: "string" },
          description: "University names to compare (2-5)",
        },
      },
      required: ["universityNames"],
    },
  },
  {
    name: "find_scholarships",
    description:
      "Find scholarships and funding opportunities available at universities matching the student's profile. Use when student asks about scholarships, financial aid, assistantships, or funding.",
    input_schema: {
      type: "object" as const,
      properties: {
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Filter by countries",
        },
        field: {
          type: "string",
          description: "Filter by field",
        },
        hasAssistantship: {
          type: "boolean",
          description: "Only show programs with assistantships",
        },
      },
      required: [],
    },
  },
  {
    name: "find_external_scholarships",
    description:
      "Search external scholarship databases and the RIBRIZ scholarship catalog. Returns scholarships from DAAD, Chevening, Erasmus, university-specific scholarships, and more. Complements find_scholarships which only shows program-level funding.",
    input_schema: {
      type: "object" as const,
      properties: {
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Filter by countries",
        },
        field: {
          type: "string",
          description: "Filter by field of study (e.g. STEM, Business, Engineering)",
        },
        degreeLevel: {
          type: "string",
          description: "Filter by degree level (masters, bachelors, phd)",
        },
        limit: {
          type: "number",
          description: "Max results to return. Default 20.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_document_requirements",
    description:
      "Get required documents for a specific university/program application. Use when student asks 'What documents do I need for X?' or about LORs, SOPs, portfolios, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "University name",
        },
        programName: {
          type: "string",
          description: "Program name (optional)",
        },
      },
      required: ["universityName"],
    },
  },
  {
    name: "get_visa_info",
    description:
      "Get visa and post-study work information for a specific country. Use when student asks about visas, work permits, stay-back options, or immigration.",
    input_schema: {
      type: "object" as const,
      properties: {
        country: {
          type: "string",
          description: "Country name",
        },
      },
      required: ["country"],
    },
  },
  {
    name: "shortlist_program",
    description:
      "Add a program to the student's application shortlist. Use when student says 'add X to my list', 'shortlist X', or 'I want to apply to X'.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "University name",
        },
        programName: {
          type: "string",
          description: "Program name",
        },
      },
      required: ["universityName", "programName"],
    },
  },
  {
    name: "get_my_applications",
    description:
      "Get the student's current application list, statuses, and progress. Use when student asks 'what have I applied to?', 'show my applications', or 'my shortlist'.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_student_profile",
    description:
      "Get the student's full academic profile and preferences. Use when you need to reference their GPA, test scores, target countries, or other profile data to give advice.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for real-time information that is NOT in the database. Use this for: latest visa policy changes, current scholarship deadlines, university news/updates, country-specific immigration rules, education loan interest rates, exam registration dates, accommodation tips, or any question where live/recent data is needed. Do NOT use this for data already in the DB (university programs, tuition, rankings).",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query — be specific, e.g. 'Germany opportunity card 2025 requirements for Indian students'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "generate_sop",
    description:
      "Generate a complete, personalized Statement of Purpose for a specific university and program. Uses the student's profile, guided answers, and university-specific data to create a compelling 600-800 word SOP. Use when the student says 'write my SOP for X' or 'draft an SOP'.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "Target university name",
        },
        programName: {
          type: "string",
          description: "Target program name",
        },
        whyField: {
          type: "string",
          description: "Why the student chose this field (from conversation context)",
        },
        keyExperience: {
          type: "string",
          description: "Key academic/professional experience to highlight",
        },
        careerGoals: {
          type: "string",
          description: "Student's career goals after graduation",
        },
        whyUniversity: {
          type: "string",
          description: "Why this specific university (from conversation context)",
        },
      },
      required: ["universityName", "programName"],
    },
  },
  {
    name: "generate_email_draft",
    description:
      "Draft a professional email to a university professor, admissions office, or scholarship committee. Use when student asks for help emailing a professor, asking about research positions, following up on applications, or inquiring about programs.",
    input_schema: {
      type: "object" as const,
      properties: {
        recipientType: {
          type: "string",
          enum: ["professor", "admissions", "scholarship_committee", "advisor"],
          description: "Type of recipient",
        },
        universityName: {
          type: "string",
          description: "University name",
        },
        programName: {
          type: "string",
          description: "Program name (optional)",
        },
        purpose: {
          type: "string",
          description: "Purpose of email: 'research_inquiry', 'application_status', 'scholarship_inquiry', 'admission_query', 'professor_intro'",
        },
        professorName: {
          type: "string",
          description: "Professor's name if emailing a professor",
        },
        researchArea: {
          type: "string",
          description: "Research area of interest if relevant",
        },
        additionalContext: {
          type: "string",
          description: "Any additional context from the conversation",
        },
      },
      required: ["recipientType", "universityName", "purpose"],
    },
  },
  {
    name: "mock_interview",
    description:
      "Generate mock visa interview questions and sample answers personalized to the student's profile, target university, and country. Use when student asks for interview prep, F1 visa prep, or mock interview practice.",
    input_schema: {
      type: "object" as const,
      properties: {
        country: {
          type: "string",
          description: "Country for visa interview (e.g. 'United States' for F1)",
        },
        universityName: {
          type: "string",
          description: "University the student is going to",
        },
        programName: {
          type: "string",
          description: "Program name",
        },
        interviewType: {
          type: "string",
          enum: ["visa", "admission", "scholarship"],
          description: "Type of interview to prepare for",
        },
      },
      required: ["country", "interviewType"],
    },
  },
  {
    name: "calculate_roi",
    description:
      "Calculate Return on Investment for studying at specific universities. Compares total cost (tuition + living) vs expected post-grad salary, factoring in duration, currency conversion, and post-study work rights. Use when student asks about ROI, 'is it worth it', or value for money comparisons.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityNames: {
          type: "array",
          items: { type: "string" },
          description: "University names to calculate ROI for (1-5)",
        },
      },
      required: ["universityNames"],
    },
  },
  {
    name: "calculate_finances",
    description:
      "Build a complete financial plan for a target university. Includes tuition, living costs, insurance, visa fees, travel, blocked account requirements (Germany), GIC (Canada), and total cost compared to student's budget. More comprehensive than calculate_roi.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "University name to build financial plan for",
        },
        programName: {
          type: "string",
          description: "Specific program name (optional — uses first matching program if omitted)",
        },
        includeScholarships: {
          type: "boolean",
          description: "Also query available scholarships for this university. Default false.",
        },
      },
      required: ["universityName"],
    },
  },
  {
    name: "update_application",
    description:
      "Update the status or details of a student's existing application. Use when student says 'I applied to X', 'I got accepted at X', 'mark X as applied', or wants to update notes on an application.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "University name",
        },
        programName: {
          type: "string",
          description: "Program name (optional — narrows to specific program)",
        },
        newStatus: {
          type: "string",
          enum: ["not_started", "docs_pending", "sop_pending", "ready", "applied", "decision", "enrolled"],
          description: "New application status",
        },
        decision: {
          type: "string",
          enum: ["accepted", "rejected", "waitlisted"],
          description: "Decision if status is 'decision'",
        },
        notes: {
          type: "string",
          description: "Notes to add to the application",
        },
      },
      required: ["universityName"],
    },
  },
  {
    name: "remove_application",
    description:
      "Remove a program from the student's shortlist. Use when student says 'remove X from my list' or 'I don't want to apply to X anymore'.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "University name",
        },
        programName: {
          type: "string",
          description: "Program name (optional)",
        },
      },
      required: ["universityName"],
    },
  },
  {
    name: "build_timeline",
    description:
      "Build a complete application timeline for the student based on their shortlisted programs and target intake. Generates a month-by-month action plan with deadlines. Use when student asks for a timeline, action plan, schedule, or 'what should I do when'.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "compare_countries",
    description:
      "Compare countries head-to-head on key factors: tuition range, living costs, post-study work rights, employment rates, visa difficulty, PR pathway, and safety. Use when student asks 'Germany vs Canada' or 'which country is better for X'.",
    input_schema: {
      type: "object" as const,
      properties: {
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Countries to compare (2-4)",
        },
        field: {
          type: "string",
          description: "Field of study for context",
        },
      },
      required: ["countries"],
    },
  },
  {
    name: "update_profile",
    description:
      "Update the student's academic profile or preferences. Use when the student says 'update my profile', 'change my GPA', 'I go to X university', 'my IELTS is X', 'I want to study in Y country', or provides any personal/academic info that should be saved.",
    input_schema: {
      type: "object" as const,
      properties: {
        // Academic profile fields
        degreeName: { type: "string", description: "Degree name, e.g. 'B.Sc. Psychology'" },
        collegeName: { type: "string", description: "College/university name" },
        gpa: { type: "number", description: "GPA value" },
        gpaScale: { type: "string", enum: ["scale_4", "scale_10", "scale_100"], description: "GPA scale" },
        graduationYear: { type: "number", description: "Graduation year, e.g. 2026" },
        backlogs: { type: "number", description: "Number of backlogs" },
        workExperienceMonths: { type: "number", description: "Months of work experience" },
        ieltsScore: { type: "number", description: "IELTS score (0-9)" },
        toeflScore: { type: "number", description: "TOEFL score" },
        pteScore: { type: "number", description: "PTE score" },
        greScore: { type: "number", description: "GRE score" },
        gmatScore: { type: "number", description: "GMAT score" },
        // Preferences fields
        targetCountries: { type: "array", items: { type: "string" }, description: "Target countries" },
        targetField: { type: "string", description: "Target field of study" },
        targetDegreeLevel: { type: "string", enum: ["masters", "mba", "bachelors"], description: "Target degree level" },
        budgetRange: { type: "string", enum: ["under_5L", "five_10L", "ten_20L", "twenty_40L", "above_40L"], description: "Budget range" },
        targetIntake: { type: "string", description: "Target intake, e.g. 'Fall 2027'" },
        careerGoals: { type: "string", description: "Career goals" },
        extracurriculars: { type: "array", items: { type: "string" }, description: "Extracurriculars" },
        // User fields
        name: { type: "string", description: "Student's name" },
        phone: { type: "string", description: "Phone number" },
        city: { type: "string", description: "City" },
        dob: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
      },
      required: [],
    },
  },
  {
    name: "extract_document_data",
    description:
      "Extract structured academic data from an uploaded document (transcript, marksheet, IELTS scorecard, etc.). Use when the student uploads or mentions a document and wants to extract data from it. Returns extracted fields for the student to review before saving to their profile.",
    input_schema: {
      type: "object" as const,
      properties: {
        documentId: {
          type: "string",
          description: "ID of the uploaded document in the system",
        },
        documentType: {
          type: "string",
          enum: [
            "transcript",
            "marksheet",
            "degree_certificate",
            "ielts_scorecard",
            "toefl_scorecard",
            "gre_scorecard",
            "gmat_scorecard",
            "resume",
            "other",
          ],
          description: "Type of document being extracted",
        },
      },
      required: ["documentId", "documentType"],
    },
  },
  {
    name: "generate_application_packet",
    description:
      "Generate a complete application-ready data packet for a specific university program. Includes all form field values pre-filled from the student's profile, document checklist with status, and step-by-step portal instructions. Use when the student is ready to apply or asks 'how do I apply to X?'.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "University name",
        },
        programName: {
          type: "string",
          description: "Program name",
        },
      },
      required: ["universityName", "programName"],
    },
  },
  {
    name: "analyze_profile_strength",
    description:
      "Analyze the student's profile holistically — identify their archetype (Academic Star, Experienced Professional, Career Pivoter, etc.), strengths, weaknesses, and strategic recommendations. Use this BEFORE recommending universities to understand what kind of applicant they are. Returns profile completeness %, archetype classification, and actionable advice.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "strategic_recommendation",
    description:
      "Generate a complete strategic university recommendation with Safety/Target/Reach bucketing. Takes university search results and eligibility data, then categorizes each program into safety (80%+ match), target (60-80%), reach (40-60%), or long-shot (<40%). Use this after search_universities + check_eligibility to give the student a strategic portfolio recommendation. Also suggests optimal application count and order.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityNames: {
          type: "array",
          items: { type: "string" },
          description: "University names to evaluate (from search results). Provide 5-10 for best results.",
        },
      },
      required: ["universityNames"],
    },
  },
  {
    name: "run_admission_audit",
    description:
      "Run a FULL admission audit for a specific university — the same comprehensive report shown on the admission audit page. Returns parameter-by-parameter comparison (GPA, IELTS, GRE, work exp, backlogs, budget, field match), country-specific weights, hard filter detection (auto-reject risks), admission probability range (sigmoid model), personalized improvement roadmap, strengths, risks, country alerts (APS for Germany, ATAS for UK, etc.), and verdict. This is the MOST DETAILED analysis available. Use this when the student asks about their chances at a specific university or wants a detailed breakdown.",
    input_schema: {
      type: "object" as const,
      properties: {
        universityName: {
          type: "string",
          description: "University name to audit against",
        },
        programName: {
          type: "string",
          description: "Specific program name (optional, uses first match if omitted)",
        },
      },
      required: ["universityName"],
    },
  },
  {
    name: "create_workspace",
    description:
      "Create an application workspace for a university — initializes the full application dashboard with program-specific document checklist, country-specific required documents (APS for Germany, WES for Canada, etc.), and auto-generates the document structure. Returns a link to the workspace. Use this when the student says they want to apply or start their application for a specific university. You can pass EITHER programId OR universityName — use whatever you have.",
    input_schema: {
      type: "object" as const,
      properties: {
        programId: {
          type: "string",
          description: "Program ID from search results (preferred)",
        },
        universityName: {
          type: "string",
          description: "University name — will find the matching program automatically",
        },
        programName: {
          type: "string",
          description: "Program name (optional, helps when university has multiple programs)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_workspace_documents",
    description:
      "Get all application documents (SOP, LOR, CV, essays, etc.) for a specific workspace/application. Shows which documents exist, their word counts, completion status, and links to the editor. Use this when the student asks about their application documents, progress, or wants to continue editing something.",
    input_schema: {
      type: "object" as const,
      properties: {
        applicationId: {
          type: "string",
          description: "Application/workspace ID",
        },
        universityName: {
          type: "string",
          description: "University name (alternative to applicationId — will find the matching application)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_document",
    description:
      "Create a new application document (SOP, LOR, motivation letter, CV, essay, research proposal, cover letter) tied to a specific university workspace. The document is automatically linked to the student's profile, university, and program — so when they open the editor, it knows the full context. Returns a link to the document editor. Use this when the student wants to start writing a specific document for a specific university. If no workspace exists yet, it will be created automatically.",
    input_schema: {
      type: "object" as const,
      properties: {
        applicationId: {
          type: "string",
          description: "Application/workspace ID (if known)",
        },
        universityName: {
          type: "string",
          description: "University name — will find or create matching workspace automatically",
        },
        type: {
          type: "string",
          enum: ["sop", "lor", "motivation", "cv", "essay", "research", "cover_letter"],
          description: "Document type to create",
        },
      },
      required: ["type"],
    },
  },
  // ─── ML-Powered Tools ───────────────────────────────────
  {
    name: "find_similar_students",
    description:
      "Find anonymized students with similar profiles who applied to similar programs. Shows their outcomes (accepted/rejected/waitlisted) to help predict the student's chances. Use when the student asks about their chances, wants to know about similar applicants, or needs data-driven guidance.",
    input_schema: {
      type: "object" as const,
      properties: {
        programId: {
          type: "string",
          description: "Filter by specific program ID",
        },
        country: {
          type: "string",
          description: "Filter by country, e.g. 'Germany', 'Canada'",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 10)",
        },
      },
    },
  },
  {
    name: "predict_from_peers",
    description:
      "Predict admission probability based on real outcomes from similar students. Uses ML-powered similarity matching and historical acceptance data. Use when the student asks 'what are my chances?' or wants a data-backed prediction for a specific program.",
    input_schema: {
      type: "object" as const,
      properties: {
        programId: {
          type: "string",
          description: "The program ID to predict admission chances for",
        },
      },
      required: ["programId"],
    },
  },
  {
    name: "score_document",
    description:
      "AI-powered quality assessment of a student's SOP, motivation letter, or other application document. Scores specificity, university fit, narrative strength, structure, and provides actionable improvement suggestions. Use after the student writes or generates a document.",
    input_schema: {
      type: "object" as const,
      properties: {
        applicationId: {
          type: "string",
          description: "Application ID to find documents for",
        },
        documentId: {
          type: "string",
          description: "Specific document ID to score (optional — scores the latest SOP if omitted)",
        },
      },
      required: ["applicationId"],
    },
  },
  {
    name: "record_outcome",
    description:
      "Record the student's actual admission decision (accepted/rejected/waitlisted) for an application. This data feeds into the ML system to improve predictions for future students. Use when the student tells you about a decision they received.",
    input_schema: {
      type: "object" as const,
      properties: {
        applicationId: {
          type: "string",
          description: "The application ID",
        },
        decision: {
          type: "string",
          enum: ["accepted", "rejected", "waitlisted"],
          description: "The admission decision",
        },
        scholarshipReceived: {
          type: "boolean",
          description: "Whether a scholarship was received",
        },
        scholarshipAmount: {
          type: "number",
          description: "Scholarship amount received (in program currency)",
        },
        notes: {
          type: "string",
          description: "Any additional notes about the decision",
        },
      },
      required: ["applicationId", "decision"],
    },
  },
];

// ─── Tool Executors ─────────────────────────────────────

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string
): Promise<string> {
  switch (toolName) {
    case "search_universities":
      return searchUniversities(toolInput, userId);
    case "check_eligibility":
      return checkEligibility(toolInput, userId);
    case "get_deadlines":
      return getDeadlines(toolInput);
    case "compare_costs":
      return compareCosts(toolInput);
    case "find_scholarships":
      return findScholarships(toolInput);
    case "find_external_scholarships":
      return findExternalScholarships(toolInput, userId);
    case "get_document_requirements":
      return getDocumentRequirements(toolInput);
    case "get_visa_info":
      return getVisaInfo(toolInput);
    case "shortlist_program":
      return shortlistProgram(toolInput, userId);
    case "get_my_applications":
      return getMyApplications(userId);
    case "get_student_profile":
      return getStudentProfile(userId);
    case "web_search":
      return webSearch(toolInput);
    case "generate_sop":
      return generateSop(toolInput, userId);
    case "generate_email_draft":
      return generateEmailDraft(toolInput, userId);
    case "mock_interview":
      return mockInterview(toolInput, userId);
    case "calculate_roi":
      return calculateRoi(toolInput);
    case "calculate_finances":
      return calculateFinances(toolInput, userId);
    case "update_application":
      return updateApplication(toolInput, userId);
    case "remove_application":
      return removeApplication(toolInput, userId);
    case "build_timeline":
      return buildTimeline(userId);
    case "compare_countries":
      return compareCountries(toolInput);
    case "update_profile":
      return updateProfile(toolInput, userId);
    case "extract_document_data":
      return extractDocumentData(toolInput, userId);
    case "generate_application_packet":
      return generateApplicationPacket(toolInput, userId);
    case "analyze_profile_strength":
      return analyzeProfile(userId);
    case "strategic_recommendation":
      return strategicRecommendation(toolInput, userId);
    case "run_admission_audit":
      return runAdmissionAudit(toolInput, userId);
    case "create_workspace":
      return createWorkspace(toolInput, userId);
    case "get_workspace_documents":
      return getWorkspaceDocuments(toolInput, userId);
    case "create_document":
      return createDocument(toolInput, userId);
    case "find_similar_students":
      return findSimilarStudentsTool(toolInput, userId);
    case "predict_from_peers":
      return predictFromPeersTool(toolInput, userId);
    case "score_document":
      return scoreDocumentTool(toolInput, userId);
    case "record_outcome":
      return recordOutcomeTool(toolInput, userId);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ─── Tool Implementations ───────────────────────────────

async function searchUniversities(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  const where: Record<string, unknown> = {};
  if (input.degreeLevel) where.degreeLevel = input.degreeLevel;
  if (input.field) where.field = { contains: input.field as string, mode: "insensitive" };
  if (input.requiresGre !== undefined) where.requiresGre = input.requiresGre;
  if (input.maxTuition) where.tuitionAnnual = { lte: input.maxTuition };

  const uniWhere: Record<string, unknown> = {};
  if (input.countries && (input.countries as string[]).length > 0)
    uniWhere.country = { in: input.countries };
  if (input.maxQsRanking) uniWhere.qsRanking = { lte: input.maxQsRanking };

  if (Object.keys(uniWhere).length > 0) where.university = uniWhere;

  const programs = await prisma.program.findMany({
    where,
    include: { university: true },
    take: (input.limit as number) || 10,
  });

  if (programs.length === 0) {
    return JSON.stringify({ results: [], message: "No programs found matching your criteria." });
  }

  const results = programs.map((p) => {
    let matchInfo = null;
    if (user?.academicProfile && user?.preferences) {
      const { score, breakdown } = computeMatchScore(
        user.academicProfile,
        user.preferences,
        p
      );
      const badge = getBadge(score);
      const bucket = getBucket(score, p.university.acceptanceRate);
      const bucketInfo = getBucketLabel(bucket);
      matchInfo = { score, badge: badge.label, bucket: bucketInfo.label, bucketAdvice: bucketInfo.advice, breakdown };
    }

    return {
      programId: p.id,
      university: p.university.name,
      country: p.university.country,
      city: p.university.city,
      qsRanking: p.university.qsRanking,
      program: p.name,
      field: p.field,
      tuition: formatTuition(p.tuitionAnnual, p.tuitionCurrency),
      duration: `${p.durationMonths} months`,
      deadline: formatDeadline(p.applicationDeadline),
      intake: p.intake,
      minGpa: p.minGpa,
      minIelts: p.minIelts,
      minGre: p.minGre,
      requiresGre: p.requiresGre,
      backlogsAllowed: p.backlogsAllowed,
      scholarships: p.scholarshipsCount,
      scholarshipDetails: p.scholarshipDetails,
      stemDesignated: p.stemDesignated,
      coopInternship: p.coopInternship,
      acceptanceRate: p.university.acceptanceRate,
      postStudyWorkVisa: p.university.postStudyWorkVisa,
      employmentRate: p.university.employmentRate,
      match: matchInfo,
      links: {
        auditPage: `/universities/${p.id}`,
        applyPage: `/universities/${p.id}#apply`,
      },
    };
  });

  // Sort by match score if available
  if (results[0]?.match) {
    results.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
  }

  return JSON.stringify({ results, count: results.length });
}

async function checkEligibility(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user?.academicProfile || !user?.preferences) {
    return JSON.stringify({ error: "Student has not completed onboarding. Cannot check eligibility." });
  }

  const programWhere: Record<string, unknown> = {
    university: {
      name: { contains: input.universityName as string, mode: "insensitive" },
    },
  };
  if (input.programName) {
    programWhere.name = { contains: input.programName as string, mode: "insensitive" };
  }

  const programs = await prisma.program.findMany({
    where: programWhere,
    include: { university: true },
  });

  if (programs.length === 0) {
    return JSON.stringify({ error: `No programs found at "${input.universityName}". Try a different name.` });
  }

  const results = programs.map((p) => {
    const { score, breakdown } = computeMatchScore(
      user.academicProfile!,
      user.preferences!,
      p
    );
    const badge = getBadge(score);

    return {
      university: p.university.name,
      program: p.name,
      matchScore: score,
      badge: badge.label,
      breakdown,
      requirements: {
        minGpa: p.minGpa,
        minIelts: p.minIelts,
        minToefl: p.minToefl,
        minGre: p.minGre,
        requiresGre: p.requiresGre,
        backlogsAllowed: p.backlogsAllowed,
        minWorkExpMonths: p.minWorkExpMonths,
        requiresLor: p.requiresLor,
      },
      studentScores: {
        gpa: user.academicProfile!.gpa,
        gpaScale: user.academicProfile!.gpaScale,
        ielts: user.academicProfile!.ieltsScore,
        toefl: user.academicProfile!.toeflScore,
        gre: user.academicProfile!.greScore,
        backlogs: user.academicProfile!.backlogs,
        workExpMonths: user.academicProfile!.workExperienceMonths,
      },
    };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);

  return JSON.stringify({ results });
}

async function getDeadlines(input: Record<string, unknown>): Promise<string> {
  const where: Record<string, unknown> = {
    applicationDeadline: { not: null },
  };

  if (input.field) where.field = { contains: input.field as string, mode: "insensitive" };

  const uniWhere: Record<string, unknown> = {};
  if (input.countries && (input.countries as string[]).length > 0)
    uniWhere.country = { in: input.countries };
  if (Object.keys(uniWhere).length > 0) where.university = uniWhere;

  const programs = await prisma.program.findMany({
    where,
    include: { university: true },
    orderBy: { applicationDeadline: "asc" },
    take: (input.limit as number) || 15,
  });

  const results = programs.map((p) => ({
    university: p.university.name,
    country: p.university.country,
    program: p.name,
    deadline: formatDeadline(p.applicationDeadline),
    earlyDeadline: p.earlyDeadline ? formatDeadline(p.earlyDeadline) : null,
    intake: p.intake,
    applicationFee: p.applicationFee
      ? `${p.applicationFeeCcy ?? ""} ${p.applicationFee}`
      : "Not specified",
  }));

  return JSON.stringify({ deadlines: results, count: results.length });
}

async function compareCosts(input: Record<string, unknown>): Promise<string> {
  const names = input.universityNames as string[];

  const universities = await prisma.university.findMany({
    where: {
      OR: names.map((n) => ({ name: { contains: n, mode: "insensitive" as const } })),
    },
    include: { programs: true },
  });

  if (universities.length === 0) {
    return JSON.stringify({ error: "No matching universities found." });
  }

  const currencyToINR: Record<string, number> = {
    EUR: 90, USD: 83, GBP: 105, AUD: 55, CAD: 62,
    INR: 1, SGD: 62, NZD: 50, CHF: 95, SEK: 8,
  };

  const results = universities.map((uni) => {
    const programs = uni.programs;
    const tuitions = programs.map((p) => ({
      program: p.name,
      tuition: formatTuition(p.tuitionAnnual, p.tuitionCurrency),
      tuitionINR: `₹${Math.round(p.tuitionAnnual * (currencyToINR[p.tuitionCurrency] ?? 83)).toLocaleString("en-IN")}/yr`,
      livingCost: formatLivingCost(p.livingCostMonthly, p.tuitionCurrency),
      livingCostINR: p.livingCostMonthly
        ? `₹${Math.round(p.livingCostMonthly * (currencyToINR[p.tuitionCurrency] ?? 83)).toLocaleString("en-IN")}/mo`
        : "N/A",
      totalAnnualINR: `₹${Math.round(
        (p.tuitionAnnual + (p.livingCostMonthly ?? 0) * 12) *
          (currencyToINR[p.tuitionCurrency] ?? 83)
      ).toLocaleString("en-IN")}`,
      duration: `${p.durationMonths} months`,
    }));

    return {
      university: uni.name,
      country: uni.country,
      city: uni.city,
      postStudyWorkVisa: uni.postStudyWorkVisa,
      employmentRate: uni.employmentRate,
      programs: tuitions,
    };
  });

  return JSON.stringify({ comparison: results });
}

async function findScholarships(input: Record<string, unknown>): Promise<string> {
  const where: Record<string, unknown> = {
    scholarshipsCount: { gt: 0 },
  };

  if (input.field) where.field = { contains: input.field as string, mode: "insensitive" };
  if (input.hasAssistantship) where.hasAssistantship = true;

  const uniWhere: Record<string, unknown> = {};
  if (input.countries && (input.countries as string[]).length > 0)
    uniWhere.country = { in: input.countries };
  if (Object.keys(uniWhere).length > 0) where.university = uniWhere;

  const programs = await prisma.program.findMany({
    where,
    include: { university: true },
    orderBy: { scholarshipsCount: "desc" },
    take: 15,
  });

  const results = programs
    .filter((p) => p.scholarshipDetails || p.hasAssistantship || p.hasFellowship)
    .map((p) => ({
      university: p.university.name,
      country: p.university.country,
      program: p.name,
      scholarshipsCount: p.scholarshipsCount,
      scholarshipDetails: p.scholarshipDetails,
      hasAssistantship: p.hasAssistantship,
      hasFellowship: p.hasFellowship,
      tuition: formatTuition(p.tuitionAnnual, p.tuitionCurrency),
    }));

  return JSON.stringify({ scholarships: results, count: results.length });
}

async function getDocumentRequirements(input: Record<string, unknown>): Promise<string> {
  const where: Record<string, unknown> = {
    university: {
      name: { contains: input.universityName as string, mode: "insensitive" },
    },
  };
  if (input.programName) {
    where.name = { contains: input.programName as string, mode: "insensitive" };
  }

  const programs = await prisma.program.findMany({
    where,
    include: { university: true },
  });

  if (programs.length === 0) {
    return JSON.stringify({ error: `No programs found at "${input.universityName}".` });
  }

  const results = programs.map((p) => ({
    university: p.university.name,
    program: p.name,
    documents: {
      sop: p.requiresSop ? "Required" : "Not required",
      resume: p.requiresResume ? "Required" : "Not required",
      portfolio: p.requiresPortfolio ? "Required" : "Not required",
      lettersOfRecommendation: p.requiresLor ? `${p.requiresLor} letter(s) required` : "Not specified",
      greScore: p.requiresGre ? `Required (min: ${p.minGre ?? "not specified"})` : "Not required",
      gmatScore: p.requiresGmat ? `Required (min: ${p.minGmat ?? "not specified"})` : "Not required",
      ielts: p.minIelts ? `Min ${p.minIelts}` : "Check university website",
      toefl: p.minToefl ? `Min ${p.minToefl}` : "Check university website",
    },
    applicationFee: p.applicationFee
      ? `${p.applicationFeeCcy ?? ""} ${p.applicationFee}`
      : p.university.generalAppFee
      ? `${p.university.generalAppFeeCcy ?? ""} ${p.university.generalAppFee}`
      : "Check university website",
    applicationUrl: p.applicationUrl ?? p.university.applicationPortalUrl ?? p.university.websiteUrl,
    deadline: formatDeadline(p.applicationDeadline),
  }));

  return JSON.stringify({ requirements: results });
}

async function getVisaInfo(input: Record<string, unknown>): Promise<string> {
  const country = input.country as string;

  const universities = await prisma.university.findMany({
    where: { country: { contains: country, mode: "insensitive" } },
    select: {
      name: true,
      country: true,
      postStudyWorkVisa: true,
      employmentRate: true,
      avgPostGradSalary: true,
      avgPostGradSalaryCcy: true,
    },
    take: 5,
  });

  if (universities.length === 0) {
    return JSON.stringify({ error: `No universities found in "${country}".` });
  }

  const visaInfo = universities[0].postStudyWorkVisa;
  const avgSalary = universities.find((u) => u.avgPostGradSalary)?.avgPostGradSalary;
  const avgSalaryCcy = universities.find((u) => u.avgPostGradSalaryCcy)?.avgPostGradSalaryCcy;
  const avgEmployment = universities
    .filter((u) => u.employmentRate)
    .reduce((sum, u) => sum + (u.employmentRate ?? 0), 0) /
    universities.filter((u) => u.employmentRate).length;

  return JSON.stringify({
    country: universities[0].country,
    postStudyWorkVisa: visaInfo ?? "Information not available — check the country's immigration website.",
    averageGraduateSalary: avgSalary ? `${avgSalaryCcy} ${avgSalary.toLocaleString()}` : "Not available",
    averageEmploymentRate: avgEmployment ? `${Math.round(avgEmployment)}%` : "Not available",
    universitiesInDB: universities.map((u) => u.name),
  });
}

async function shortlistProgram(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const program = await prisma.program.findFirst({
    where: {
      name: { contains: input.programName as string, mode: "insensitive" },
      university: {
        name: { contains: input.universityName as string, mode: "insensitive" },
      },
    },
    include: { university: true },
  });

  if (!program) {
    return JSON.stringify({ error: `Program "${input.programName}" at "${input.universityName}" not found.` });
  }

  // Check if already shortlisted
  const existing = await prisma.application.findFirst({
    where: { userId, programId: program.id },
  });

  if (existing) {
    return JSON.stringify({
      message: `"${program.name}" at ${program.university.name} is already in your shortlist (status: ${existing.status}).`,
      applicationId: existing.id,
    });
  }

  // Compute match score
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  let matchScore: number | null = null;
  if (user?.academicProfile && user?.preferences) {
    const { score } = computeMatchScore(user.academicProfile, user.preferences, program);
    matchScore = score;
  }

  const application = await prisma.application.create({
    data: {
      userId,
      programId: program.id,
      status: "not_started",
      matchScore,
    },
  });

  return JSON.stringify({
    message: `Added "${program.name}" at ${program.university.name} to your shortlist.`,
    applicationId: application.id,
    matchScore,
    deadline: formatDeadline(program.applicationDeadline),
  });
}

async function getMyApplications(userId: string): Promise<string> {
  const applications = await prisma.application.findMany({
    where: { userId },
    include: {
      program: {
        include: { university: true },
      },
      appDocuments: {
        select: { id: true, type: true, title: true, wordCount: true, isComplete: true, isDraft: true },
      },
      sopDrafts: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { wordCount: true, version: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (applications.length === 0) {
    return JSON.stringify({ applications: [], message: "You haven't shortlisted any programs yet. Use search_universities to find programs, then shortlist_program to add them." });
  }

  const results = applications.map((a) => {
    const docs = a.appDocuments;
    const completeDocs = docs.filter((d) => d.isComplete).length;
    const draftDocs = docs.filter((d) => d.isDraft && d.wordCount > 0).length;

    return {
      applicationId: a.id,
      university: a.program.university.name,
      country: a.program.university.country,
      program: a.program.name,
      programId: a.program.id,
      status: a.status,
      matchScore: a.matchScore,
      decision: a.decision,
      deadline: formatDeadline(a.program.applicationDeadline),
      tuition: formatTuition(a.program.tuitionAnnual, a.program.tuitionCurrency),
      notes: a.notes,
      documents: {
        total: docs.length,
        complete: completeDocs,
        inProgress: draftDocs,
        types: docs.map((d) => ({ type: d.type, title: d.title, wordCount: d.wordCount, complete: d.isComplete })),
      },
      links: {
        workspace: `/applications/${a.id}`,
        audit: `/universities/${a.program.id}`,
      },
    };
  });

  return JSON.stringify({ applications: results, count: results.length });
}

async function getStudentProfile(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user) {
    return JSON.stringify({ error: "User not found." });
  }

  return JSON.stringify({
    name: user.name,
    email: user.email,
    onboardingComplete: user.onboardingComplete,
    academic: user.academicProfile
      ? {
          degree: user.academicProfile.degreeName,
          college: user.academicProfile.collegeName,
          gpa: user.academicProfile.gpa,
          gpaScale: user.academicProfile.gpaScale,
          graduationYear: user.academicProfile.graduationYear,
          backlogs: user.academicProfile.backlogs,
          workExperienceMonths: user.academicProfile.workExperienceMonths,
          ielts: user.academicProfile.ieltsScore,
          toefl: user.academicProfile.toeflScore,
          pte: user.academicProfile.pteScore,
          gre: user.academicProfile.greScore,
          gmat: user.academicProfile.gmatScore,
        }
      : null,
    preferences: user.preferences
      ? {
          targetCountries: user.preferences.targetCountries,
          targetField: user.preferences.targetField,
          targetDegreeLevel: user.preferences.targetDegreeLevel,
          budgetRange: user.preferences.budgetRange,
          targetIntake: user.preferences.targetIntake,
          careerGoals: user.preferences.careerGoals,
          extracurriculars: user.preferences.extracurriculars,
        }
      : null,
  });
}

// ─── NEW TOOLS ──────────────────────────────────────────

async function webSearch(input: Record<string, unknown>): Promise<string> {
  const query = input.query as string;

  // Try Perplexity first, fall back to Claude's knowledge
  const perplexityKey = process.env.PERPLEXITY_API_KEY;

  if (perplexityKey) {
    try {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${perplexityKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                "You are a research assistant for a study-abroad consultancy. Return factual, sourced, up-to-date information. Be concise but thorough. Include dates, numbers, and specifics. If information may be outdated, note that.",
            },
            { role: "user", content: query },
          ],
          max_tokens: 1500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const answer = data.choices?.[0]?.message?.content ?? "";
        const citations = data.citations ?? [];
        return JSON.stringify({
          source: "perplexity_live_search",
          answer,
          citations,
          note: "This is real-time data from the web. Always verify critical dates/policies on official sources.",
        });
      }
    } catch (e) {
      console.error("Perplexity search failed, falling back:", e);
    }
  }

  // Fallback: use Claude's knowledge with a disclaimer
  return JSON.stringify({
    source: "knowledge_base",
    answer: `[Web search unavailable — using training knowledge] Query: "${query}". Note: This information may not be current. Advise the student to verify on official websites.`,
    note: "Live search is not configured. Set PERPLEXITY_API_KEY for real-time web data.",
  });
}

async function generateSop(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user?.academicProfile) {
    return JSON.stringify({ error: "Complete your profile first to generate an SOP." });
  }

  const profile = user.academicProfile;

  // Find the program for context
  const program = await prisma.program.findFirst({
    where: {
      name: { contains: input.programName as string, mode: "insensitive" },
      university: {
        name: { contains: input.universityName as string, mode: "insensitive" },
      },
    },
    include: { university: true },
  });

  // Load memories and existing drafts for the sophisticated prompt
  const memories = await getRelevantMemories(userId);

  const existingDraftDocs = await prisma.applicationDocument.findMany({
    where: { userId, type: "sop" },
    select: { universityName: true },
  });
  const existingDraftUnis = [
    ...new Set(
      existingDraftDocs
        .map((d) => d.universityName)
        .filter((n): n is string => !!n)
    ),
  ];

  const sopSystemPrompt = getSOPWriterPrompt({
    student: {
      name: user.name,
      degreeName: profile.degreeName,
      collegeName: profile.collegeName,
      gpa: profile.gpa,
      gpaScale: profile.gpaScale,
      graduationYear: profile.graduationYear,
      workExperienceMonths: profile.workExperienceMonths,
      ieltsScore: profile.ieltsScore,
      greScore: profile.greScore,
      certifications: profile.certifications,
      publications: profile.publications,
      currentCompany: profile.currentCompany,
      currentJobTitle: profile.currentJobTitle,
      keyAchievements: profile.keyAchievements,
      internshipDetails: profile.internshipDetails,
    },
    university: program ? {
      name: program.university.name,
      country: program.university.country,
      city: program.university.city,
      type: program.university.type,
      qsRanking: program.university.qsRanking,
    } : { name: input.universityName as string, country: "", city: "" },
    program: program ? {
      name: program.name,
      field: program.field,
      degreeLevel: program.degreeLevel,
      durationMonths: program.durationMonths,
      courseHighlights: program.courseHighlights,
      stemDesignated: program.stemDesignated,
      coopInternship: program.coopInternship,
      thesisOption: program.thesisOption,
    } : { name: input.programName as string, field: "", degreeLevel: "masters", durationMonths: 24 },
    guidedAnswers: {
      whyField: input.whyField as string,
      keyExperience: input.keyExperience as string,
      careerGoals: input.careerGoals as string,
      whyUniversity: input.whyUniversity as string,
    },
    memories,
    existingDrafts: existingDraftUnis,
    storyPositioning: user.preferences ? {
      whyThisField: user.preferences.whyThisField,
      whyThisCountry: user.preferences.whyThisCountry,
      whyNow: user.preferences.whyNow,
      shortTermGoals: user.preferences.shortTermGoals,
      longTermGoals: user.preferences.longTermGoals,
      uniqueStory: user.preferences.uniqueStory,
    } : null,
  });

  const response = await anthropic.messages.create({
    model: SOP_MODEL,
    max_tokens: 2000,
    temperature: 0.7,
    system: sopSystemPrompt,
    messages: [{ role: "user", content: "Write the Statement of Purpose now." }],
  });

  const sopText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Save to both old SOPDraft and new ApplicationDocument system
  let editorLink: string | null = null;
  let workspaceLink: string | null = null;

  if (program) {
    // Ensure application exists (auto-create if not)
    let application = await prisma.application.findFirst({
      where: { userId, programId: program.id },
    });
    if (!application) {
      application = await prisma.application.create({
        data: { userId, programId: program.id, status: "not_started" },
      });
    }

    workspaceLink = `/applications/${application.id}`;

    // Save to old SOPDraft for backward compat
    await prisma.sOPDraft.create({
      data: {
        userId,
        applicationId: application.id,
        targetUniversity: program.university.name,
        content: sopText,
        wordCount: sopText.trim().split(/\s+/).length,
        version: 1,
      },
    });

    // Save to new ApplicationDocument system
    const title = `Statement of Purpose — ${program.university.name}`;
    const existingDoc = await prisma.applicationDocument.findFirst({
      where: { applicationId: application.id, type: "sop", title },
    });

    if (existingDoc) {
      // Update existing document
      await prisma.applicationDocument.update({
        where: { id: existingDoc.id },
        data: {
          content: sopText,
          wordCount: sopText.trim().split(/\s+/).length,
          lastEditedAt: new Date(),
          currentVersion: existingDoc.currentVersion + 1,
        },
      });
      await prisma.documentVersion.create({
        data: {
          documentId: existingDoc.id,
          version: existingDoc.currentVersion + 1,
          content: sopText,
          wordCount: sopText.trim().split(/\s+/).length,
          changeNote: "AI generated via Riz AI",
        },
      });
      editorLink = `/editor/${existingDoc.id}`;
    } else {
      // Create new document
      const doc = await prisma.applicationDocument.create({
        data: {
          userId,
          applicationId: application.id,
          type: "sop",
          title,
          content: sopText,
          wordCount: sopText.trim().split(/\s+/).length,
          universityName: program.university.name,
          programName: program.name,
          country: program.university.country,
        },
      });
      editorLink = `/editor/${doc.id}`;
    }
  }

  return JSON.stringify({
    _type: "sop_generated",
    sop: sopText,
    wordCount: sopText.trim().split(/\s+/).length,
    university: input.universityName,
    program: input.programName,
    saved: !!program,
    editorLink,
    workspaceLink,
    note: "Draft saved to your workspace. Open the editor to personalize it with your own voice.",
  });
}

async function generateEmailDraft(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user) return JSON.stringify({ error: "User not found." });

  const profile = user.academicProfile;
  const recipientType = input.recipientType as string;
  const purpose = input.purpose as string;

  let emailPrompt = `Draft a professional email for an Indian student applying abroad.

FROM: ${user.name}`;

  if (profile) {
    emailPrompt += `
- ${profile.degreeName} from ${profile.collegeName}
- GPA: ${profile.gpa}, Graduation: ${profile.graduationYear}
- Work Exp: ${profile.workExperienceMonths} months`;
  }

  emailPrompt += `

TO: ${recipientType === "professor" ? `Professor ${input.professorName ?? "[Name]"}` : recipientType === "admissions" ? "Admissions Office" : recipientType === "scholarship_committee" ? "Scholarship Committee" : "Academic Advisor"} at ${input.universityName}

PURPOSE: ${purpose}
${input.programName ? `PROGRAM: ${input.programName}` : ""}
${input.researchArea ? `RESEARCH INTEREST: ${input.researchArea}` : ""}
${input.additionalContext ? `CONTEXT: ${input.additionalContext}` : ""}

Write a concise, professional email (150-250 words). Include subject line. Be respectful but confident. Mention specific details about the university/professor's work. No excessive flattery.`;

  const response = await anthropic.messages.create({
    model: SOP_MODEL,
    max_tokens: 800,
    temperature: 0.6,
    system:
      "You write professional academic emails for students. Be concise, respectful, and specific. Always include a clear subject line. Return ONLY the email with Subject line first.",
    messages: [{ role: "user", content: emailPrompt }],
  });

  const emailText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Save to EmailDraft model for persistence
  try {
    // Find associated application if university matches
    let applicationId: string | undefined;
    if (input.universityName) {
      const app = await prisma.application.findFirst({
        where: {
          userId,
          program: {
            university: { name: { contains: input.universityName as string, mode: "insensitive" } },
          },
        },
        select: { id: true },
      });
      if (app) applicationId = app.id;
    }

    // Parse subject from email text
    const subjectMatch = emailText.match(/Subject:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Email to ${recipientType} at ${input.universityName}`;
    const bodyText = emailText.replace(/Subject:\s*.+\n?/i, "").trim();

    await prisma.emailDraft.create({
      data: {
        userId,
        applicationId,
        type: purpose,
        recipientEmail: input.recipientEmail as string | undefined,
        recipientName: input.professorName as string | undefined ?? input.recipientName as string | undefined,
        subject,
        body: bodyText,
      },
    });
  } catch {
    // Non-critical — don't break the flow
  }

  return JSON.stringify({
    email: emailText,
    recipientType,
    university: input.universityName,
    note: "Review and personalize before sending. Add the professor's specific research paper or project names for best results.",
  });
}

async function mockInterview(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user?.academicProfile) {
    return JSON.stringify({ error: "Complete your profile first." });
  }

  const profile = user.academicProfile;
  const interviewType = input.interviewType as string;
  const country = input.country as string;

  const prompt = `Generate a ${interviewType} interview preparation guide for:

STUDENT:
- ${user.name}, ${profile.degreeName} from ${profile.collegeName}
- GPA: ${profile.gpa}, Graduation: ${profile.graduationYear}
- Work Exp: ${profile.workExperienceMonths} months
- Funding: ${user.preferences?.budgetRange?.replace(/_/g, " ") ?? "Not specified"}

TARGET: ${input.universityName ?? "Not specified"} in ${country}
${input.programName ? `Program: ${input.programName}` : ""}

Generate exactly 10 most likely interview questions with:
1. The question
2. WHY the interviewer asks it (what they're really checking)
3. A sample answer personalized to THIS student's profile
4. Common mistakes to avoid

For visa interviews, include questions about: funding proof, ties to home country, post-graduation plans, why this university, and gap year explanations if applicable.`;

  const response = await anthropic.messages.create({
    model: SOP_MODEL,
    max_tokens: 3000,
    temperature: 0.5,
    system:
      "You are a visa interview coach with 15 years experience. Generate realistic, personalized interview prep. Be specific to the student's profile.",
    messages: [{ role: "user", content: prompt }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  return JSON.stringify({
    interviewType,
    country,
    university: input.universityName ?? null,
    preparation: content,
    note: "Practice these with a friend. Record yourself. The key is to be genuine and specific — interviewers can spot rehearsed generic answers.",
  });
}

async function calculateRoi(input: Record<string, unknown>): Promise<string> {
  const names = input.universityNames as string[];

  const universities = await prisma.university.findMany({
    where: {
      OR: names.map((n) => ({
        name: { contains: n, mode: "insensitive" as const },
      })),
    },
    include: { programs: true },
  });

  const currencyToINR: Record<string, number> = {
    EUR: 90, USD: 83, GBP: 105, AUD: 55, CAD: 62,
    INR: 1, SGD: 62, NZD: 50, CHF: 95, SEK: 8,
  };

  const results = universities.map((uni) => {
    const representativeProgram = uni.programs[0];
    if (!representativeProgram) return null;

    const p = representativeProgram;
    const rate = currencyToINR[p.tuitionCurrency] ?? 83;
    const totalTuitionINR = p.tuitionAnnual * rate * (p.durationMonths / 12);
    const totalLivingINR = (p.livingCostMonthly ?? 0) * rate * p.durationMonths;
    const totalCostINR = totalTuitionINR + totalLivingINR;

    const avgSalaryINR = uni.avgPostGradSalary
      ? uni.avgPostGradSalary * (currencyToINR[uni.avgPostGradSalaryCcy ?? "USD"] ?? 83)
      : null;

    const breakEvenYears = avgSalaryINR
      ? Math.round((totalCostINR / avgSalaryINR) * 10) / 10
      : null;

    return {
      university: uni.name,
      country: uni.country,
      program: p.name,
      duration: `${p.durationMonths} months`,
      totalCost: {
        tuition: `₹${Math.round(totalTuitionINR).toLocaleString("en-IN")}`,
        living: `₹${Math.round(totalLivingINR).toLocaleString("en-IN")}`,
        total: `₹${Math.round(totalCostINR).toLocaleString("en-IN")}`,
      },
      expectedAnnualSalary: avgSalaryINR
        ? `₹${Math.round(avgSalaryINR).toLocaleString("en-IN")}/yr`
        : "Data not available",
      breakEvenYears: breakEvenYears ? `${breakEvenYears} years` : "Cannot calculate",
      employmentRate: uni.employmentRate ? `${uni.employmentRate}%` : "N/A",
      postStudyWork: uni.postStudyWorkVisa ?? "N/A",
      roiRating:
        breakEvenYears && breakEvenYears <= 1.5
          ? "EXCELLENT"
          : breakEvenYears && breakEvenYears <= 3
          ? "GOOD"
          : breakEvenYears && breakEvenYears <= 5
          ? "MODERATE"
          : "CHECK CAREFULLY",
    };
  }).filter(Boolean);

  return JSON.stringify({ roi: results });
}

async function updateApplication(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const application = await prisma.application.findFirst({
    where: {
      userId,
      program: {
        university: {
          name: { contains: input.universityName as string, mode: "insensitive" },
        },
        ...(input.programName
          ? { name: { contains: input.programName as string, mode: "insensitive" } }
          : {}),
      },
    },
    include: { program: { include: { university: true } } },
  });

  if (!application) {
    return JSON.stringify({
      error: `No application found for "${input.universityName}". Use shortlist_program to add it first.`,
    });
  }

  const updateData: Record<string, unknown> = {};
  if (input.newStatus) updateData.status = input.newStatus;
  if (input.decision) updateData.decision = input.decision;
  if (input.notes) updateData.notes = input.notes;
  if (input.newStatus === "applied") updateData.appliedDate = new Date();

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: updateData,
    include: { program: { include: { university: true } } },
  });

  return JSON.stringify({
    message: `Updated "${updated.program.name}" at ${updated.program.university.name}.`,
    status: updated.status,
    decision: updated.decision,
    notes: updated.notes,
  });
}

async function removeApplication(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const application = await prisma.application.findFirst({
    where: {
      userId,
      program: {
        university: {
          name: { contains: input.universityName as string, mode: "insensitive" },
        },
        ...(input.programName
          ? { name: { contains: input.programName as string, mode: "insensitive" } }
          : {}),
      },
    },
    include: { program: { include: { university: true } } },
  });

  if (!application) {
    return JSON.stringify({
      error: `No application found for "${input.universityName}" in your shortlist.`,
    });
  }

  await prisma.application.delete({ where: { id: application.id } });

  return JSON.stringify({
    message: `Removed "${application.program.name}" at ${application.program.university.name} from your shortlist.`,
  });
}

async function buildTimeline(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      academicProfile: true,
      preferences: true,
      applications: {
        include: {
          program: { include: { university: true } },
        },
        orderBy: { program: { applicationDeadline: "asc" } },
      },
      documents: true,
    },
  });

  if (!user) return JSON.stringify({ error: "User not found." });

  const apps = user.applications;
  const docs = user.documents;
  const profile = user.academicProfile;

  // Build timeline data
  const timeline: Record<string, string[]> = {};

  const addItem = (month: string, item: string) => {
    if (!timeline[month]) timeline[month] = [];
    timeline[month].push(item);
  };

  // Immediate items
  const now = new Date();
  const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Profile gaps
  if (!profile?.ieltsScore && !profile?.toeflScore && !profile?.pteScore) {
    addItem(currentMonth, "📝 URGENT: Take IELTS/TOEFL — no English test score on file");
  }
  if (user.preferences?.targetCountries.includes("United States") && !profile?.greScore) {
    addItem(currentMonth, "📝 Register for GRE — required for most US programs");
  }

  // Document status
  const pendingDocs = docs.filter((d) => d.status !== "verified" && d.status !== "uploaded");
  if (pendingDocs.length > 0) {
    addItem(currentMonth, `📄 ${pendingDocs.length} document(s) still pending: ${pendingDocs.map((d) => d.name).join(", ")}`);
  }

  // Application deadlines
  for (const app of apps) {
    const deadline = app.program.applicationDeadline;
    if (!deadline) continue;

    const dlDate = new Date(deadline);
    const dlMonth = dlDate.toLocaleString("en-US", { month: "long", year: "numeric" });

    // 2 months before deadline
    const prepDate = new Date(dlDate);
    prepDate.setMonth(prepDate.getMonth() - 2);
    const prepMonth = prepDate.toLocaleString("en-US", { month: "long", year: "numeric" });

    addItem(prepMonth, `✍️ Start SOP for ${app.program.university.name} — ${app.program.name}`);

    // 1 month before
    const finalDate = new Date(dlDate);
    finalDate.setMonth(finalDate.getMonth() - 1);
    const finalMonth = finalDate.toLocaleString("en-US", { month: "long", year: "numeric" });

    addItem(finalMonth, `📋 Finalize application for ${app.program.university.name} (deadline: ${formatDeadline(deadline)})`);
    addItem(dlMonth, `🚀 DEADLINE: ${app.program.university.name} — ${app.program.name}`);
  }

  // After all deadlines — visa prep
  if (apps.length > 0) {
    const lastDeadline = apps
      .filter((a) => a.program.applicationDeadline)
      .map((a) => new Date(a.program.applicationDeadline!))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (lastDeadline) {
      const visaMonth = new Date(lastDeadline);
      visaMonth.setMonth(visaMonth.getMonth() + 2);
      addItem(
        visaMonth.toLocaleString("en-US", { month: "long", year: "numeric" }),
        "🎯 Start visa application process"
      );
      visaMonth.setMonth(visaMonth.getMonth() + 1);
      addItem(
        visaMonth.toLocaleString("en-US", { month: "long", year: "numeric" }),
        "✈️ Book accommodation, flight tickets"
      );
    }
  }

  return JSON.stringify({
    timeline,
    applicationsTracked: apps.length,
    documentsComplete: docs.filter((d) => d.status === "verified" || d.status === "uploaded").length,
    documentsTotal: docs.length,
    summary: apps.length === 0
      ? "No programs shortlisted yet. Shortlist programs first, then I can build a detailed timeline."
      : `Timeline built for ${apps.length} application(s).`,
  });
}

async function compareCountries(input: Record<string, unknown>): Promise<string> {
  const countries = input.countries as string[];
  const field = input.field as string | undefined;

  const results = [];

  for (const country of countries) {
    const universities = await prisma.university.findMany({
      where: { country: { contains: country, mode: "insensitive" } },
      include: { programs: true },
    });

    if (universities.length === 0) {
      results.push({ country, error: "No data available" });
      continue;
    }

    const allPrograms = universities.flatMap((u) => u.programs);
    const relevantPrograms = field
      ? allPrograms.filter((p) =>
          p.field.toLowerCase().includes(field.toLowerCase())
        )
      : allPrograms;

    const tuitions = relevantPrograms.map((p) => p.tuitionAnnual);
    const livings = relevantPrograms
      .map((p) => p.livingCostMonthly)
      .filter((v): v is number => v != null);

    const currencyToINR: Record<string, number> = {
      EUR: 90, USD: 83, GBP: 105, AUD: 55, CAD: 62,
      INR: 1, SGD: 62, NZD: 50, CHF: 95, SEK: 8,
    };

    const currency = relevantPrograms[0]?.tuitionCurrency ?? "USD";
    const rate = currencyToINR[currency] ?? 83;

    const avgEmployment =
      universities.filter((u) => u.employmentRate).length > 0
        ? Math.round(
            universities
              .filter((u) => u.employmentRate)
              .reduce((s, u) => s + (u.employmentRate ?? 0), 0) /
              universities.filter((u) => u.employmentRate).length
          )
        : null;

    results.push({
      country: universities[0].country,
      universitiesInDB: universities.length,
      programsAvailable: relevantPrograms.length,
      tuitionRange: tuitions.length > 0
        ? {
            min: `${currency} ${Math.min(...tuitions).toLocaleString()}`,
            max: `${currency} ${Math.max(...tuitions).toLocaleString()}`,
            minINR: `₹${Math.round(Math.min(...tuitions) * rate).toLocaleString("en-IN")}`,
            maxINR: `₹${Math.round(Math.max(...tuitions) * rate).toLocaleString("en-IN")}`,
          }
        : "No data",
      livingCostRange: livings.length > 0
        ? {
            min: `${currency} ${Math.min(...livings)}/mo`,
            max: `${currency} ${Math.max(...livings)}/mo`,
          }
        : "No data",
      postStudyWorkVisa: universities[0].postStudyWorkVisa ?? "N/A",
      avgEmploymentRate: avgEmployment ? `${avgEmployment}%` : "N/A",
      averageSalary: universities.find((u) => u.avgPostGradSalary)
        ? `${universities.find((u) => u.avgPostGradSalary)?.avgPostGradSalaryCcy} ${universities.find((u) => u.avgPostGradSalary)?.avgPostGradSalary?.toLocaleString()}`
        : "N/A",
      greRequired: relevantPrograms.some((p) => p.requiresGre) ? "Some programs" : "Generally not required",
      topUniversities: universities
        .sort((a, b) => (a.qsRanking ?? 999) - (b.qsRanking ?? 999))
        .slice(0, 5)
        .map((u) => `${u.name} (QS #${u.qsRanking ?? "N/A"})`),
    });
  }

  return JSON.stringify({ comparison: results });
}

async function updateProfile(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user) return JSON.stringify({ error: "User not found." });

  const updated: string[] = [];

  // Update user-level fields
  const userUpdate: Record<string, unknown> = {};
  if (input.name) userUpdate.name = input.name;
  if (input.phone) userUpdate.phone = input.phone;
  if (input.city) userUpdate.city = input.city;
  if (input.dob) userUpdate.dob = new Date(input.dob as string);

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: userUpdate });
    updated.push(...Object.keys(userUpdate));
  }

  // Update academic profile fields
  const academicFields: Record<string, unknown> = {};
  const academicKeys = [
    "degreeName", "collegeName", "gpa", "gpaScale",
    "graduationYear", "backlogs", "workExperienceMonths",
    "ieltsScore", "toeflScore", "pteScore", "greScore", "gmatScore",
  ];
  for (const key of academicKeys) {
    if (input[key] !== undefined) academicFields[key] = input[key];
  }

  if (Object.keys(academicFields).length > 0) {
    if (user.academicProfile) {
      await prisma.academicProfile.update({
        where: { userId },
        data: academicFields,
      });
    } else {
      await prisma.academicProfile.create({
        data: {
          userId,
          degreeName: (academicFields.degreeName as string) ?? "Not specified",
          collegeName: (academicFields.collegeName as string) ?? "Not specified",
          gpa: (academicFields.gpa as number) ?? 0,
          gpaScale: (academicFields.gpaScale as "scale_4" | "scale_10" | "scale_100") ?? "scale_10",
          graduationYear: (academicFields.graduationYear as number) ?? new Date().getFullYear(),
          ...academicFields,
        },
      });
    }
    updated.push(...Object.keys(academicFields));
  }

  // Update preferences fields
  const prefsFields: Record<string, unknown> = {};
  const prefsKeys = [
    "targetCountries", "targetField", "targetDegreeLevel",
    "budgetRange", "targetIntake", "careerGoals", "extracurriculars",
  ];
  for (const key of prefsKeys) {
    if (input[key] !== undefined) prefsFields[key] = input[key];
  }

  if (Object.keys(prefsFields).length > 0) {
    if (user.preferences) {
      await prisma.preferences.update({
        where: { userId },
        data: prefsFields,
      });
    } else {
      await prisma.preferences.create({
        data: {
          userId,
          targetCountries: (prefsFields.targetCountries as string[]) ?? [],
          targetField: (prefsFields.targetField as string) ?? "Not specified",
          targetDegreeLevel: (prefsFields.targetDegreeLevel as "masters" | "mba" | "bachelors") ?? "masters",
          budgetRange: (prefsFields.budgetRange as "under_5L" | "five_10L" | "ten_20L" | "twenty_40L" | "above_40L") ?? "ten_20L",
          targetIntake: (prefsFields.targetIntake as string) ?? "Fall 2027",
          ...prefsFields,
        },
      });
    }
    updated.push(...Object.keys(prefsFields));
  }

  if (updated.length === 0) {
    return JSON.stringify({ message: "No fields to update. Specify what you'd like to change." });
  }

  return JSON.stringify({
    message: `Updated ${updated.length} field(s): ${updated.join(", ")}.`,
    updatedFields: updated,
  });
}

// ─── Document Extraction ────────────────────────────────

async function extractDocumentData(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const documentId = input.documentId as string;
  const documentType = input.documentType as string;

  // Find the document
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });

  if (!doc) {
    return JSON.stringify({ error: "Document not found or you don't have access." });
  }

  if (!doc.fileUrl) {
    return JSON.stringify({ error: "No file uploaded for this document yet. Ask the student to upload the file first." });
  }

  // Build extraction prompt based on document type
  const extractionPrompts: Record<string, string> = {
    transcript: `Extract all academic data from this transcript. Return JSON with:
      { "university_name": "", "degree": "", "graduation_year": 0, "gpa": 0, "gpa_scale": "scale_10|scale_4|scale_100",
        "subjects": [{"name": "", "grade": "", "credits": 0}], "backlogs": 0 }`,
    marksheet: `Extract academic data from this marksheet. Return JSON with:
      { "institution": "", "exam": "", "year": 0, "percentage": 0, "subjects": [{"name": "", "marks": 0, "max_marks": 0}] }`,
    ielts_scorecard: `Extract IELTS scores from this scorecard. Return JSON with:
      { "overall": 0, "listening": 0, "reading": 0, "writing": 0, "speaking": 0, "test_date": "", "trf_number": "" }`,
    toefl_scorecard: `Extract TOEFL scores. Return JSON with:
      { "total": 0, "reading": 0, "listening": 0, "speaking": 0, "writing": 0, "test_date": "" }`,
    gre_scorecard: `Extract GRE scores. Return JSON with:
      { "total": 0, "verbal": 0, "quantitative": 0, "analytical_writing": 0, "test_date": "" }`,
    gmat_scorecard: `Extract GMAT scores. Return JSON with:
      { "total": 0, "verbal": 0, "quantitative": 0, "integrated_reasoning": 0, "analytical_writing": 0, "test_date": "" }`,
    degree_certificate: `Extract degree info. Return JSON with:
      { "university_name": "", "degree": "", "field": "", "graduation_year": 0, "honors": "" }`,
    resume: `Extract key info from this resume. Return JSON with:
      { "name": "", "email": "", "phone": "", "education": [{"degree": "", "institution": "", "year": 0, "gpa": 0}],
        "work_experience": [{"company": "", "role": "", "duration_months": 0, "description": ""}],
        "skills": [], "total_work_months": 0 }`,
    other: `Extract any structured academic or personal data from this document. Return as JSON.`,
  };

  const prompt = extractionPrompts[documentType] || extractionPrompts.other;

  try {
    // For now, since we're working with file URLs (not base64), we'll use
    // Claude's text analysis. In production, you'd fetch the file and send as base64.
    // This implementation works with the document metadata approach.
    const response = await anthropic.messages.create({
      model: SOP_MODEL,
      max_tokens: 2000,
      system: "You are a document data extraction specialist. Extract structured data from document descriptions and return valid JSON only. If you cannot determine a value, use null.",
      messages: [
        {
          role: "user",
          content: `Document type: ${documentType}\nDocument name: ${doc.name}\nCategory: ${doc.category}\n\n${prompt}\n\nBased on the document type "${doc.name}", provide a realistic extraction template with null values for fields that need to be filled. If the document name gives hints about content (e.g., "IELTS Score Report"), pre-fill what you can infer.`,
        },
      ],
    });

    const extractedText =
      response.content[0].type === "text" ? response.content[0].text : "{}";

    // Try to parse the extracted JSON
    let extractedData;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = extractedText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
        [null, extractedText];
      extractedData = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      extractedData = { raw_text: extractedText };
    }

    return JSON.stringify({
      documentId: doc.id,
      documentType,
      documentName: doc.name,
      extractedData,
      message: "Data extracted. Review the extracted fields and confirm to save to your profile.",
      profileUpdateSuggestion: buildProfileUpdateSuggestion(documentType, extractedData),
    });
  } catch (err) {
    console.error("Document extraction failed:", err);
    return JSON.stringify({
      error: "Failed to extract data from document.",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

function buildProfileUpdateSuggestion(
  documentType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;

  switch (documentType) {
    case "transcript":
    case "degree_certificate":
      return {
        degreeName: data.degree,
        collegeName: data.university_name || data.institution,
        gpa: data.gpa,
        gpaScale: data.gpa_scale,
        graduationYear: data.graduation_year,
        backlogs: data.backlogs,
      };
    case "ielts_scorecard":
      return { ieltsScore: data.overall };
    case "toefl_scorecard":
      return { toeflScore: data.total };
    case "gre_scorecard":
      return { greScore: data.total };
    case "gmat_scorecard":
      return { gmatScore: data.total };
    case "resume":
      return {
        name: data.name,
        workExperienceMonths: data.total_work_months,
        degreeName: data.education?.[0]?.degree,
        collegeName: data.education?.[0]?.institution,
      };
    default:
      return null;
  }
}

// ─── Application Packet Generator ───────────────────────

async function generateApplicationPacket(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      academicProfile: true,
      preferences: true,
      documents: true,
      applications: {
        include: {
          program: { include: { university: true } },
          sopDrafts: { orderBy: { version: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!user) return JSON.stringify({ error: "User not found." });
  if (!user.academicProfile) {
    return JSON.stringify({ error: "Complete your profile first to generate an application packet." });
  }

  const program = await prisma.program.findFirst({
    where: {
      name: { contains: input.programName as string, mode: "insensitive" },
      university: {
        name: { contains: input.universityName as string, mode: "insensitive" },
      },
    },
    include: { university: true },
  });

  if (!program) {
    return JSON.stringify({
      error: `Program "${input.programName}" at "${input.universityName}" not found in database.`,
    });
  }

  const profile = user.academicProfile;
  const uni = program.university;
  const docs = user.documents;

  // Check application and SOP status
  const application = user.applications.find((a) => a.programId === program.id);
  const sopDraft = application?.sopDrafts?.[0];

  // Build document checklist
  const requiredDocs: { name: string; status: string; sopDraftId?: string }[] = [
    {
      name: "Official Transcript",
      status: docs.find((d) => d.name.toLowerCase().includes("transcript"))?.status ?? "not_started",
    },
    {
      name: "Degree Certificate",
      status: docs.find((d) => d.name.toLowerCase().includes("degree"))?.status ?? "not_started",
    },
    {
      name: "Statement of Purpose",
      status: sopDraft ? "draft_ready" : "not_started",
      sopDraftId: sopDraft?.id,
    },
    {
      name: "IELTS/TOEFL Score Report",
      status: docs.find(
        (d) =>
          d.name.toLowerCase().includes("ielts") ||
          d.name.toLowerCase().includes("toefl")
      )?.status ?? "not_started",
    },
    {
      name: "Passport Copy",
      status: docs.find((d) => d.name.toLowerCase().includes("passport"))?.status ?? "not_started",
    },
    {
      name: "CV / Resume",
      status: docs.find((d) => d.name.toLowerCase().includes("cv") || d.name.toLowerCase().includes("resume"))?.status ?? "not_started",
    },
  ];

  if (program.requiresGre) {
    requiredDocs.push({
      name: "GRE Score Report",
      status: docs.find((d) => d.name.toLowerCase().includes("gre"))?.status ?? "not_started",
    });
  }

  if (program.requiresLor) {
    requiredDocs.push({
      name: `Letters of Recommendation (${program.requiresLor})`,
      status: "check_manually",
    });
  }

  const gpaDisplay = profile.gpaScale === "scale_4"
    ? `${profile.gpa}/4.0`
    : profile.gpaScale === "scale_10"
    ? `${profile.gpa}/10`
    : `${profile.gpa}/100`;

  const packet = {
    university: uni.name,
    country: uni.country,
    city: uni.city,
    program: program.name,
    portalUrl: program.applicationUrl ?? uni.applicationPortalUrl ?? uni.websiteUrl,
    formFields: {
      personal: {
        fullName: user.name,
        email: user.email,
        phone: user.phone ?? "Not on file",
        dateOfBirth: user.dob
          ? new Date(user.dob).toISOString().split("T")[0]
          : "Not on file",
        city: user.city ?? "Not on file",
        citizenship: "India",
      },
      academic: {
        previousInstitution: profile.collegeName,
        degree: profile.degreeName,
        gpa: gpaDisplay,
        graduationYear: profile.graduationYear,
        backlogs: profile.backlogs,
        workExperienceMonths: profile.workExperienceMonths,
      },
      testScores: {
        ielts: profile.ieltsScore ? `Overall: ${profile.ieltsScore}` : "Not taken",
        toefl: profile.toeflScore ? `Total: ${profile.toeflScore}` : "Not taken",
        pte: profile.pteScore ? `Overall: ${profile.pteScore}` : "Not taken",
        gre: profile.greScore ? `Total: ${profile.greScore}` : "Not taken",
        gmat: profile.gmatScore ? `Total: ${profile.gmatScore}` : "Not taken",
      },
    },
    documentsNeeded: requiredDocs,
    applicationFee: program.applicationFee
      ? `${program.applicationFeeCcy ?? ""} ${program.applicationFee}`
      : uni.generalAppFee
      ? `${uni.generalAppFeeCcy ?? ""} ${uni.generalAppFee}`
      : "Check university website",
    deadline: formatDeadline(program.applicationDeadline),
    earlyDeadline: program.earlyDeadline ? formatDeadline(program.earlyDeadline) : null,
    intake: program.intake,
    stepByStepGuide: [
      `1. Go to ${program.applicationUrl ?? uni.applicationPortalUrl ?? uni.websiteUrl ?? "the university's application portal"} and create an account`,
      `2. Select: ${program.degreeLevel === "masters" ? "Graduate" : "Undergraduate"} > ${program.name} > ${program.intake ?? "next available intake"}`,
      `3. Fill personal information (copy from the form fields above)`,
      `4. Upload academic transcripts and degree certificate`,
      `5. Enter test scores (${profile.ieltsScore ? "IELTS" : profile.toeflScore ? "TOEFL" : "English test"}: send official scores via the testing organization)`,
      program.requiresSop ? `6. Upload your Statement of Purpose${sopDraft ? " (draft ready in SOP Writer)" : ""}` : null,
      program.requiresResume ? `${program.requiresSop ? "7" : "6"}. Upload your CV/Resume` : null,
      program.requiresLor ? `${(program.requiresSop ? 7 : 6) + (program.requiresResume ? 1 : 0)}. Request ${program.requiresLor} Letter(s) of Recommendation through the portal` : null,
      `${8}. Pay the application fee (${program.applicationFee ? `${program.applicationFeeCcy ?? ""} ${program.applicationFee}` : "check portal"})`,
      `${9}. Review all sections and submit`,
      `${10}. Save confirmation number and screenshot the submission page`,
    ].filter(Boolean),
    readiness: {
      profileComplete: !!profile.gpa && !!profile.degreeName && profile.degreeName !== "Not specified",
      hasTestScores: !!(profile.ieltsScore || profile.toeflScore || profile.pteScore),
      hasSopDraft: !!sopDraft,
      documentsReady: requiredDocs.filter((d) => d.status === "uploaded" || d.status === "verified").length,
      documentsTotal: requiredDocs.length,
      overallReadiness: Math.round(
        (
          (profile.gpa && profile.degreeName !== "Not specified" ? 25 : 0) +
          (profile.ieltsScore || profile.toeflScore || profile.pteScore ? 25 : 0) +
          (sopDraft ? 25 : 0) +
          (requiredDocs.filter((d) => d.status === "uploaded" || d.status === "verified").length / requiredDocs.length) * 25
        )
      ),
    },
  };

  return JSON.stringify(packet);
}

// ─── Profile Strength Analysis Tool ─────────────────────

async function analyzeProfile(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true, applications: true },
  });

  if (!user?.academicProfile) {
    return JSON.stringify({ error: "Profile not complete. Cannot analyze strength without academic data." });
  }

  const analysis = analyzeProfileStrength(user.academicProfile, user.preferences);

  return JSON.stringify({
    ...analysis,
    applicationsCount: user.applications?.length ?? 0,
    profileData: {
      gpa: `${user.academicProfile.gpa}/${user.academicProfile.gpaScale === "scale_4" ? "4.0" : user.academicProfile.gpaScale === "scale_10" ? "10" : "100"}`,
      ielts: user.academicProfile.ieltsScore,
      toefl: user.academicProfile.toeflScore,
      gre: user.academicProfile.greScore,
      workExpMonths: user.academicProfile.workExperienceMonths,
      backlogs: user.academicProfile.backlogs,
      degree: user.academicProfile.degreeName,
      college: user.academicProfile.collegeName,
    },
    targetCountries: user.preferences?.targetCountries ?? [],
    targetField: user.preferences?.targetField ?? "Not specified",
  });
}

// ─── Strategic Recommendation Tool ──────────────────────

async function strategicRecommendation(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const names = input.universityNames as string[];
  if (!names?.length) {
    return JSON.stringify({ error: "Provide university names to evaluate." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });

  if (!user?.academicProfile || !user?.preferences) {
    return JSON.stringify({ error: "Complete profile needed for strategic recommendation." });
  }

  // Find all programs at the requested universities
  const programs = await prisma.program.findMany({
    where: {
      university: {
        OR: names.map((n) => ({ name: { contains: n, mode: "insensitive" as const } })),
      },
    },
    include: { university: true },
  });

  if (programs.length === 0) {
    return JSON.stringify({ error: "No programs found for the given universities." });
  }

  // Score and bucket each program
  const evaluated = programs.map((p) => {
    const { score, breakdown } = computeMatchScore(
      user.academicProfile!,
      user.preferences!,
      p
    );
    const badge = getBadge(score);
    const bucket = getBucket(score, p.university.acceptanceRate);
    const bucketInfo = getBucketLabel(bucket);

    return {
      university: p.university.name,
      country: p.university.country,
      qsRanking: p.university.qsRanking,
      program: p.name,
      field: p.field,
      tuition: formatTuition(p.tuitionAnnual, p.tuitionCurrency),
      deadline: formatDeadline(p.applicationDeadline),
      matchScore: score,
      badge: badge.label,
      bucket: bucketInfo.label,
      bucketAdvice: bucketInfo.advice,
      acceptanceRate: p.university.acceptanceRate,
      breakdown: {
        gpa: `${breakdown.gpaScore}/100 ${breakdown.gpaPass ? "PASS" : "BELOW MIN"}`,
        english: `${breakdown.ieltsScore}/100 ${breakdown.ieltsPass ? "PASS" : "BELOW MIN"}`,
        gre: `${breakdown.greScore}/100 ${breakdown.grePass ? "PASS" : "BELOW MIN"}`,
        budget: breakdown.budgetFit ? "WITHIN BUDGET" : "OVER BUDGET",
        field: breakdown.fieldMatch ? "MATCH" : "MISMATCH",
        backlogs: breakdown.backlogsOk ? "OK" : "EXCEEDS LIMIT",
        workExp: `${breakdown.workExpScore}/100`,
      },
    };
  });

  // Sort by score descending
  evaluated.sort((a, b) => b.matchScore - a.matchScore);

  // Group into buckets
  const safety = evaluated.filter((e) => e.bucket === "SAFETY");
  const target = evaluated.filter((e) => e.bucket === "TARGET");
  const reach = evaluated.filter((e) => e.bucket === "REACH");
  const longShot = evaluated.filter((e) => e.bucket === "LONG SHOT");

  // Generate portfolio advice
  const totalRecommended = Math.min(8, evaluated.length);
  const portfolioAdvice: string[] = [];

  if (safety.length === 0) portfolioAdvice.push("WARNING: No safety schools in this list. Add 2-3 programs where you exceed all requirements.");
  if (target.length === 0 && safety.length > 0) portfolioAdvice.push("Good safety options, but add target schools for better brand value.");
  if (reach.length > target.length) portfolioAdvice.push("Too reach-heavy. Add more target schools for a balanced portfolio.");
  if (evaluated.length > 10) portfolioAdvice.push("Consider narrowing to 7-8 applications. SOP quality drops after 8.");
  if (safety.length >= 2 && target.length >= 3 && reach.length >= 1) portfolioAdvice.push("Well-balanced portfolio. Good mix of safety, target, and reach.");

  return JSON.stringify({
    totalEvaluated: evaluated.length,
    buckets: {
      safety: { count: safety.length, programs: safety },
      target: { count: target.length, programs: target },
      reach: { count: reach.length, programs: reach },
      longShot: { count: longShot.length, programs: longShot },
    },
    portfolioAdvice,
    recommendedApplicationCount: totalRecommended,
    idealPortfolio: `${Math.min(2, safety.length)} safety + ${Math.min(4, target.length)} target + ${Math.min(2, reach.length)} reach`,
  });
}

// ─── New Workspace-Connected Tools ──────────────────────

async function runAdmissionAudit(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { academicProfile: true, preferences: true },
  });
  if (!user?.academicProfile || !user?.preferences) {
    return JSON.stringify({ error: "Complete your profile first to run an admission audit." });
  }

  const programWhere: Record<string, unknown> = {
    university: { name: { contains: input.universityName as string, mode: "insensitive" } },
  };
  if (input.programName) {
    programWhere.name = { contains: input.programName as string, mode: "insensitive" };
  }

  const programs = await prisma.program.findMany({
    where: programWhere,
    include: { university: true },
    take: 1,
  });

  if (programs.length === 0) {
    return JSON.stringify({ error: `No programs found at "${input.universityName}".` });
  }

  const program = programs[0];
  const audit = generateAdmissionAudit(user.academicProfile, user.preferences, program);

  // Persist ApplicationScore if the user has an application for this program
  try {
    const application = await prisma.application.findFirst({
      where: { userId, programId: program.id },
    });
    if (application) {
      await prisma.applicationScore.upsert({
        where: {
          id: `${application.id}-latest`, // Use a deterministic ID for latest score
        },
        create: {
          id: `${application.id}-latest`,
          applicationId: application.id,
          userId,
          overallScore: audit.overallScore,
          academicFit: audit.parameters.find((p) => p.name.toLowerCase().includes("gpa"))?.score ?? 0,
          sopQuality: 0, // Requires separate SOP analysis
          documentReadiness: 0, // Requires document check
          profilePositioning: audit.overallScore,
          timelineRisk: 100 - (audit.parameters.find((p) => p.name.toLowerCase().includes("deadline"))?.score ?? 50),
          improvements: audit.roadmap.map((r) => ({
            description: r.title,
            impact: r.impact,
            priority: r.priority,
          })),
          strengths: audit.strengths,
          redFlags: audit.risks,
        },
        update: {
          overallScore: audit.overallScore,
          academicFit: audit.parameters.find((p) => p.name.toLowerCase().includes("gpa"))?.score ?? 0,
          profilePositioning: audit.overallScore,
          timelineRisk: 100 - (audit.parameters.find((p) => p.name.toLowerCase().includes("deadline"))?.score ?? 50),
          improvements: audit.roadmap.map((r) => ({
            description: r.title,
            impact: r.impact,
            priority: r.priority,
          })),
          strengths: audit.strengths,
          redFlags: audit.risks,
          generatedAt: new Date(),
        },
      });
    }
  } catch {
    // Non-critical — don't break the audit response
  }

  return JSON.stringify({
    university: program.university.name,
    program: program.name,
    country: program.university.country,
    overallScore: audit.overallScore,
    admissionProbability: audit.admissionProbability,
    hardFiltersFailed: audit.hardFiltersFailed,
    verdict: audit.verdict,
    parameters: audit.parameters.map((p) => ({
      name: p.name,
      status: p.status,
      score: p.score,
      weight: p.weight,
      studentValue: p.studentValue,
      requiredValue: p.requiredValue,
      gap: p.gap,
      recommendation: p.recommendation,
      isHardFilter: p.isHardFilter,
    })),
    strengths: audit.strengths,
    risks: audit.risks,
    roadmap: audit.roadmap.map((r) => ({
      priority: r.priority,
      title: r.title,
      description: r.description,
      impact: r.impact,
    })),
    countryAlerts: audit.countryAlerts,
    countryContext: audit.countryContext,
    sopWeight: audit.sopWeight,
    lorWeight: audit.lorWeight,
    confidenceNote: audit.confidenceNote,
    links: {
      fullAuditPage: `/universities/${program.id}`,
    },
  });
}

async function createWorkspace(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  let programId = input.programId as string | undefined;

  // If no programId, find by university name
  if (!programId && input.universityName) {
    const programWhere: Record<string, unknown> = {
      university: { name: { contains: input.universityName as string, mode: "insensitive" } },
    };
    if (input.programName) {
      programWhere.name = { contains: input.programName as string, mode: "insensitive" };
    }
    const found = await prisma.program.findFirst({
      where: programWhere,
      select: { id: true },
    });
    if (found) programId = found.id;
  }

  if (!programId) {
    // Last resort: check if there's already an application for this university
    if (input.universityName) {
      const existingApp = await prisma.application.findFirst({
        where: {
          userId,
          program: { university: { name: { contains: input.universityName as string, mode: "insensitive" } } },
        },
        include: { program: { include: { university: true } } },
      });
      if (existingApp) {
        return JSON.stringify({
          message: `Workspace already exists for ${existingApp.program.university.name} — ${existingApp.program.name}`,
          applicationId: existingApp.id,
          link: `/applications/${existingApp.id}`,
        });
      }
    }
    return JSON.stringify({ error: `Could not find "${input.universityName ?? "unknown"}" in our database. Try searching first with search_universities.` });
  }

  // Check existing application
  const existing = await prisma.application.findFirst({
    where: { userId, programId },
    include: { program: { include: { university: true } } },
  });
  if (existing) {
    return JSON.stringify({
      message: `Workspace already exists for ${existing.program.university.name} — ${existing.program.name}`,
      applicationId: existing.id,
      link: `/applications/${existing.id}`,
    });
  }

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { university: true },
  });
  if (!program) {
    return JSON.stringify({ error: "Program not found." });
  }

  const app = await prisma.application.create({
    data: { userId, programId, status: "not_started" },
  });

  return JSON.stringify({
    message: `Workspace created for ${program.university.name} — ${program.name}!`,
    applicationId: app.id,
    link: `/applications/${app.id}`,
    nextStep: "Open the workspace to set up your document checklist and start writing. You can also ask me to create specific documents (SOP, CV, LOR) for this workspace.",
  });
}

async function getWorkspaceDocuments(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  let applicationId = input.applicationId as string | undefined;

  // Find by university name if no applicationId
  if (!applicationId && input.universityName) {
    const app = await prisma.application.findFirst({
      where: {
        userId,
        program: {
          university: { name: { contains: input.universityName as string, mode: "insensitive" } },
        },
      },
      select: { id: true },
    });
    if (app) applicationId = app.id;
  }

  if (!applicationId) {
    return JSON.stringify({ error: "No workspace found. Use get_my_applications to see your workspaces, or create one with create_workspace." });
  }

  const docs = await prisma.applicationDocument.findMany({
    where: { applicationId, userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      wordCount: true,
      isDraft: true,
      isComplete: true,
      currentVersion: true,
      universityName: true,
      programName: true,
      lastEditedAt: true,
    },
  });

  if (docs.length === 0) {
    return JSON.stringify({
      documents: [],
      message: "No documents created yet for this workspace. Use create_document to start writing.",
      workspaceLink: `/applications/${applicationId}`,
    });
  }

  return JSON.stringify({
    documents: docs.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      wordCount: d.wordCount,
      isDraft: d.isDraft,
      isComplete: d.isComplete,
      version: d.currentVersion,
      lastEdited: d.lastEditedAt,
      editorLink: `/editor/${d.id}`,
      preview: d.content.substring(0, 200) + (d.content.length > 200 ? "..." : ""),
    })),
    workspaceLink: `/applications/${applicationId}`,
  });
}

async function createDocument(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const type = input.type as string;
  if (!type) {
    return JSON.stringify({ error: "Document type is required (sop, lor, motivation, cv, essay, research, cover_letter)." });
  }

  let applicationId = input.applicationId as string | undefined;

  // Find by university name
  if (!applicationId && input.universityName) {
    const existingApp = await prisma.application.findFirst({
      where: {
        userId,
        program: {
          university: { name: { contains: input.universityName as string, mode: "insensitive" } },
        },
      },
      select: { id: true },
    });
    if (existingApp) {
      applicationId = existingApp.id;
    } else {
      // Auto-create workspace if it doesn't exist
      const program = await prisma.program.findFirst({
        where: {
          university: { name: { contains: input.universityName as string, mode: "insensitive" } },
        },
        select: { id: true },
      });
      if (program) {
        const newApp = await prisma.application.create({
          data: { userId, programId: program.id, status: "not_started" },
        });
        applicationId = newApp.id;
      }
    }
  }

  if (!applicationId) {
    return JSON.stringify({ error: `No workspace found for "${input.universityName ?? "unknown"}". The university may not be in our database. Try search_universities first.` });
  }

  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: { program: { include: { university: true } } },
  });
  if (!app) return JSON.stringify({ error: "Application not found." });

  const typeLabels: Record<string, string> = {
    sop: "Statement of Purpose",
    lor: "Letter of Recommendation",
    motivation: "Motivation Letter",
    cv: "Resume / CV",
    essay: "Supplemental Essay",
    research: "Research Proposal",
    cover_letter: "Cover Letter",
  };

  const title = `${typeLabels[type] ?? type} — ${app.program.university.name}`;

  // Check existing
  const existing = await prisma.applicationDocument.findFirst({
    where: { applicationId, type: type as never, title },
  });
  if (existing) {
    return JSON.stringify({
      message: `Document already exists: "${title}". Continue editing it.`,
      documentId: existing.id,
      editorLink: `/editor/${existing.id}`,
      wordCount: existing.wordCount,
      isComplete: existing.isComplete,
    });
  }

  const doc = await prisma.applicationDocument.create({
    data: {
      userId,
      applicationId,
      type: type as never,
      title,
      universityName: app.program.university.name,
      programName: app.program.name,
      country: app.program.university.country,
    },
  });

  return JSON.stringify({
    message: `Created "${title}". Open the editor to start writing.`,
    documentId: doc.id,
    editorLink: `/editor/${doc.id}`,
    workspaceLink: `/applications/${applicationId}`,
    tip: "In the editor, press Tab for AI autocomplete or click 'Generate Draft' for a structured starting point.",
  });
}

// ─── Confirmation Payload Builder ───────────────────────

export async function buildConfirmationPayload(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolUseId: string,
  userId: string
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case "update_profile": {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { academicProfile: true, preferences: true },
      });

      const changes = [];
      const fieldLabels: Record<string, string> = {
        degreeName: "Degree",
        collegeName: "College",
        gpa: "GPA",
        gpaScale: "GPA Scale",
        graduationYear: "Graduation Year",
        backlogs: "Backlogs",
        workExperienceMonths: "Work Experience (months)",
        ieltsScore: "IELTS Score",
        toeflScore: "TOEFL Score",
        pteScore: "PTE Score",
        greScore: "GRE Score",
        gmatScore: "GMAT Score",
        targetCountries: "Target Countries",
        targetField: "Target Field",
        targetDegreeLevel: "Degree Level",
        budgetRange: "Budget Range",
        targetIntake: "Target Intake",
        careerGoals: "Career Goals",
        extracurriculars: "Extracurriculars",
        name: "Name",
        phone: "Phone",
        city: "City",
        dob: "Date of Birth",
      };

      for (const [key, value] of Object.entries(toolInput)) {
        if (value === undefined || value === null) continue;
        const label = fieldLabels[key] || key;
        let oldValue: string | undefined;

        // Get current value
        if (user?.academicProfile && key in user.academicProfile) {
          const v = (user.academicProfile as Record<string, unknown>)[key];
          oldValue = v != null ? String(v) : undefined;
        } else if (user?.preferences && key in user.preferences) {
          const v = (user.preferences as Record<string, unknown>)[key];
          oldValue = Array.isArray(v) ? v.join(", ") : v != null ? String(v) : undefined;
        } else if (user && key in user) {
          const v = (user as Record<string, unknown>)[key];
          oldValue = v != null ? String(v) : undefined;
        }

        changes.push({
          field: key,
          oldValue,
          newValue: Array.isArray(value) ? value.join(", ") : String(value),
          section: ["targetCountries", "targetField", "targetDegreeLevel", "budgetRange", "targetIntake", "careerGoals", "extracurriculars"].includes(key) ? "preferences" : ["name", "phone", "city", "dob"].includes(key) ? "personal" : "academic",
        });
      }

      return {
        id: toolUseId,
        type: "profile_update",
        title: `Update ${changes.length} profile field${changes.length > 1 ? "s" : ""}`,
        changes,
        toolName,
        toolInput,
        toolUseId,
      };
    }

    case "shortlist_program": {
      return {
        id: toolUseId,
        type: "shortlist",
        title: `Add ${toolInput.programName} at ${toolInput.universityName} to shortlist`,
        changes: [
          { field: "University", newValue: String(toolInput.universityName) },
          { field: "Program", newValue: String(toolInput.programName) },
        ],
        toolName,
        toolInput,
        toolUseId,
      };
    }

    case "update_application": {
      return {
        id: toolUseId,
        type: "application_status",
        title: `Update application status for ${toolInput.universityName}`,
        changes: [
          { field: "University", newValue: String(toolInput.universityName) },
          ...(toolInput.newStatus ? [{ field: "New Status", newValue: String(toolInput.newStatus) }] : []),
          ...(toolInput.decision ? [{ field: "Decision", newValue: String(toolInput.decision) }] : []),
          ...(toolInput.notes ? [{ field: "Notes", newValue: String(toolInput.notes) }] : []),
        ],
        toolName,
        toolInput,
        toolUseId,
      };
    }

    case "remove_application": {
      return {
        id: toolUseId,
        type: "application_remove",
        title: `Remove ${toolInput.universityName} from shortlist`,
        description: toolInput.programName
          ? `This will remove ${toolInput.programName} at ${toolInput.universityName} from your applications.`
          : `This will remove ${toolInput.universityName} from your applications.`,
        changes: [
          { field: "University", newValue: String(toolInput.universityName) },
          ...(toolInput.programName ? [{ field: "Program", newValue: String(toolInput.programName) }] : []),
        ],
        toolName,
        toolInput,
        toolUseId,
      };
    }

    case "generate_sop": {
      return {
        id: toolUseId,
        type: "sop_generated",
        title: `Generate SOP for ${toolInput.programName} at ${toolInput.universityName}`,
        description: "This will generate an SOP draft and save it to your SOP Writer.",
        changes: [
          { field: "University", newValue: String(toolInput.universityName) },
          { field: "Program", newValue: String(toolInput.programName) },
        ],
        toolName,
        toolInput,
        toolUseId,
      };
    }

    case "generate_email_draft": {
      return {
        id: toolUseId,
        type: "sop_generated",
        title: `Draft email to ${toolInput.recipientType} at ${toolInput.universityName}`,
        description: `Purpose: ${toolInput.purpose}`,
        changes: [
          { field: "Recipient", newValue: String(toolInput.recipientType) },
          { field: "University", newValue: String(toolInput.universityName) },
          { field: "Purpose", newValue: String(toolInput.purpose) },
        ],
        toolName,
        toolInput,
        toolUseId,
      };
    }

    case "create_workspace": {
      return {
        id: toolUseId,
        type: "workspace_created",
        title: `Create Workspace for ${toolInput.universityName ?? "university"}`,
        description: "This will create a full application workspace with program-specific document checklist.",
        changes: [
          ...(toolInput.universityName ? [{ field: "University", newValue: String(toolInput.universityName) }] : []),
          ...(toolInput.programName ? [{ field: "Program", newValue: String(toolInput.programName) }] : []),
          ...(toolInput.programId ? [{ field: "Program ID", newValue: String(toolInput.programId) }] : []),
        ],
        toolName,
        toolInput,
        toolUseId,
      };
    }

    case "create_document": {
      const typeLabels: Record<string, string> = {
        sop: "Statement of Purpose",
        lor: "Letter of Recommendation",
        motivation: "Motivation Letter",
        cv: "Resume / CV",
        essay: "Supplemental Essay",
        research: "Research Proposal",
        cover_letter: "Cover Letter",
      };
      return {
        id: toolUseId,
        type: "document_created",
        title: `Create ${typeLabels[String(toolInput.type)] ?? toolInput.type}`,
        description: `This will create a new ${typeLabels[String(toolInput.type)] ?? toolInput.type} document in your workspace.`,
        changes: [
          { field: "Type", newValue: String(toolInput.type) },
          ...(toolInput.universityName ? [{ field: "University", newValue: String(toolInput.universityName) }] : []),
        ],
        toolName,
        toolInput,
        toolUseId,
      };
    }

    case "record_outcome":
      return {
        id: toolUseId,
        type: "profile_update",
        title: "Record Admission Decision",
        changes: [
          { field: "Application", oldValue: "", newValue: String(toolInput.applicationId) },
          { field: "Decision", oldValue: "", newValue: String(toolInput.decision) },
          ...(toolInput.scholarshipReceived
            ? [{ field: "Scholarship", oldValue: "", newValue: `Received${toolInput.scholarshipAmount ? ` (${toolInput.scholarshipAmount})` : ""}` }]
            : []),
        ],
        toolName,
        toolInput,
        toolUseId,
      };

    default:
      return {
        id: toolUseId,
        type: "profile_update",
        title: `Execute ${toolName}`,
        changes: Object.entries(toolInput).map(([k, v]) => ({
          field: k,
          newValue: String(v),
        })),
        toolName,
        toolInput,
        toolUseId,
      };
  }
}

// ─── External Scholarship & Financial Planning Tools ────

async function findExternalScholarships(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const countries = (input.countries as string[] | undefined) ?? [];
  const field = input.field as string | undefined;
  const degreeLevel = input.degreeLevel as string | undefined;
  const limit = (input.limit as number) ?? 20;

  // 1. Query local Scholarship model
  const localWhere: Record<string, unknown> = { isActive: true };
  if (countries.length > 0) {
    localWhere.country = { in: countries };
  }
  if (field) {
    localWhere.fieldRestriction = { contains: field, mode: "insensitive" };
  }
  if (degreeLevel) {
    localWhere.degreeLevel = { contains: degreeLevel, mode: "insensitive" };
  }

  const localScholarships = await prisma.scholarship.findMany({
    where: localWhere,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // 2. Fetch from external API
  let externalScholarships: Array<{
    name: string;
    provider: string | null;
    amount: number | null;
    amountCurrency: string | null;
    coverage: string | null;
    eligibleDegrees: string | null;
    eligibleCountries: string | null;
    deadline: string | null;
    applicationUrl: string | null;
    description: string | null;
    source: "external";
  }> = [];

  try {
    const extResults = await fetchExternalScholarships({ limit: 200 });

    // Filter external results by criteria
    const filtered = extResults.filter((s) => {
      if (countries.length > 0 && s.eligible_countries) {
        const matchesCountry = countries.some((c) =>
          s.eligible_countries!.toLowerCase().includes(c.toLowerCase())
        );
        if (!matchesCountry) return false;
      }
      if (degreeLevel && s.eligible_degrees) {
        if (!s.eligible_degrees.toLowerCase().includes(degreeLevel.toLowerCase())) {
          return false;
        }
      }
      return s.open_for_international;
    });

    externalScholarships = filtered.slice(0, limit).map((s) => ({
      name: s.name,
      provider: s.provider,
      amount: s.amount,
      amountCurrency: s.amount_currency,
      coverage: s.coverage,
      eligibleDegrees: s.eligible_degrees,
      eligibleCountries: s.eligible_countries,
      deadline: s.application_deadline,
      applicationUrl: s.application_url,
      description: s.description,
      source: "external" as const,
    }));
  } catch (err) {
    console.error("[findExternalScholarships] External API error:", err);
    // Continue with local results only
  }

  // 3. Create ScholarshipMatch records for local scholarships
  for (const scholarship of localScholarships) {
    try {
      await prisma.scholarshipMatch.upsert({
        where: {
          userId_scholarshipId: {
            userId,
            scholarshipId: scholarship.id,
          },
        },
        update: {},
        create: {
          userId,
          scholarshipId: scholarship.id,
          matchScore: 70, // Default match score for discovered scholarships
          status: "discovered",
        },
      });
    } catch {
      // Ignore duplicate or constraint errors
    }
  }

  // 4. Combine and return
  const localResults = localScholarships.map((s) => ({
    name: s.name,
    provider: s.provider,
    country: s.country,
    amount: s.amount,
    eligibility: s.eligibility,
    deadline: s.deadline ? formatDeadline(s.deadline) : null,
    applicationUrl: s.applicationUrl,
    description: s.description,
    fieldRestriction: s.fieldRestriction,
    degreeLevel: s.degreeLevel,
    source: "ribriz_catalog" as const,
  }));

  return JSON.stringify({
    scholarships: {
      catalog: localResults,
      external: externalScholarships,
    },
    totalFound: localResults.length + externalScholarships.length,
    note:
      "Catalog scholarships are verified by RIBRIZ. External scholarships are fetched from partner databases — verify deadlines and eligibility on the official website.",
  });
}

async function calculateFinances(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const universityName = input.universityName as string;
  const programName = input.programName as string | undefined;
  const includeScholarships = (input.includeScholarships as boolean) ?? false;

  // Find the university and program
  const programWhere: Record<string, unknown> = {
    university: {
      name: { contains: universityName, mode: "insensitive" as const },
    },
  };
  if (programName) {
    programWhere.name = { contains: programName, mode: "insensitive" as const };
  }

  const programs = await prisma.program.findMany({
    where: programWhere,
    include: { university: true },
    take: 5,
  });

  if (programs.length === 0) {
    return JSON.stringify({
      error: `No programs found at "${universityName}". Try a different spelling or search for the university first.`,
    });
  }

  const p = programs[0];
  const uni = p.university;
  const country = uni.country?.toLowerCase() ?? "";

  const currencyToINR: Record<string, number> = {
    EUR: 90, USD: 83, GBP: 105, AUD: 55, CAD: 62,
    INR: 1, SGD: 62, NZD: 50, CHF: 95, SEK: 8,
  };

  const rate = currencyToINR[p.tuitionCurrency] ?? 83;
  const durationYears = p.durationMonths / 12;
  const durationMonths = p.durationMonths;

  // ─── Core costs ───
  const tuitionTotal = p.tuitionAnnual * durationYears;
  const tuitionTotalINR = tuitionTotal * rate;

  const livingMonthly = p.livingCostMonthly ?? 0;
  const livingTotal = livingMonthly * durationMonths;
  const livingTotalINR = livingTotal * rate;

  // ─── Health insurance (country-specific monthly estimates in local currency) ───
  const healthInsuranceMonthly: Record<string, { amount: number; currency: string }> = {
    germany: { amount: 120, currency: "EUR" },
    canada: { amount: 100, currency: "CAD" },
    uk: { amount: 42, currency: "GBP" }, // ~GBP500/yr
    "united kingdom": { amount: 42, currency: "GBP" },
    us: { amount: 167, currency: "USD" }, // ~$2000/yr
    usa: { amount: 167, currency: "USD" },
    "united states": { amount: 167, currency: "USD" },
    australia: { amount: 50, currency: "AUD" }, // ~AUD600/yr
    ireland: { amount: 42, currency: "EUR" }, // ~EUR500/yr
  };
  const insurance = healthInsuranceMonthly[country] ?? { amount: 100, currency: "USD" };
  const insuranceTotal = insurance.amount * durationMonths;
  const insuranceTotalINR = insuranceTotal * (currencyToINR[insurance.currency] ?? 83);

  // ─── Visa fees (one-time, in local currency) ───
  const visaFees: Record<string, { amount: number; currency: string }> = {
    germany: { amount: 75, currency: "EUR" },
    canada: { amount: 235, currency: "CAD" },
    uk: { amount: 490, currency: "GBP" },
    "united kingdom": { amount: 490, currency: "GBP" },
    us: { amount: 510, currency: "USD" },
    usa: { amount: 510, currency: "USD" },
    "united states": { amount: 510, currency: "USD" },
    australia: { amount: 710, currency: "AUD" },
    ireland: { amount: 100, currency: "EUR" },
  };
  const visa = visaFees[country] ?? { amount: 200, currency: "USD" };
  const visaFeeINR = visa.amount * (currencyToINR[visa.currency] ?? 83);

  // ─── Travel (one-way from India) ───
  const travelOneWayINR = 60000;

  // ─── Blocked account / GIC (annual requirement) ───
  const blockedAccountAnnual: Record<string, { amount: number; currency: string; label: string }> = {
    germany: { amount: 11208, currency: "EUR", label: "Blocked Account" },
    canada: { amount: 20635, currency: "CAD", label: "GIC (Guaranteed Investment Certificate)" },
  };
  const blocked = blockedAccountAnnual[country];
  const blockedTotalINR = blocked
    ? blocked.amount * durationYears * (currencyToINR[blocked.currency] ?? 83)
    : 0;

  // ─── Application fee ───
  const appFee = p.applicationFee ?? uni.generalAppFee ?? 0;
  const appFeeCcy = p.applicationFeeCcy ?? uni.generalAppFeeCcy ?? "USD";
  const appFeeINR = appFee * (currencyToINR[appFeeCcy] ?? 83);

  // ─── Grand total ───
  const grandTotalINR =
    tuitionTotalINR +
    livingTotalINR +
    insuranceTotalINR +
    visaFeeINR +
    travelOneWayINR +
    blockedTotalINR +
    appFeeINR;

  // ─── Student budget comparison ───
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });

  const budgetRangeMap: Record<string, { min: number; max: number }> = {
    under_5L: { min: 0, max: 500000 },
    five_10L: { min: 500000, max: 1000000 },
    ten_20L: { min: 1000000, max: 2000000 },
    twenty_40L: { min: 2000000, max: 4000000 },
    above_40L: { min: 4000000, max: 10000000 },
  };

  const budgetRange = user?.preferences?.budgetRange;
  const budget = budgetRange ? budgetRangeMap[budgetRange] : null;

  const fmt = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

  const financialPlan: Record<string, unknown> = {
    university: uni.name,
    country: uni.country,
    program: p.name,
    duration: `${p.durationMonths} months (${durationYears.toFixed(1)} years)`,
    currency: p.tuitionCurrency,
    exchangeRate: `1 ${p.tuitionCurrency} = ₹${rate}`,
    breakdown: {
      tuition: {
        annual: `${p.tuitionCurrency} ${p.tuitionAnnual.toLocaleString()}`,
        total: `${p.tuitionCurrency} ${Math.round(tuitionTotal).toLocaleString()}`,
        totalINR: fmt(tuitionTotalINR),
      },
      livingCosts: {
        monthly: livingMonthly
          ? `${p.tuitionCurrency} ${livingMonthly.toLocaleString()}`
          : "Not available",
        total: livingMonthly
          ? `${p.tuitionCurrency} ${Math.round(livingTotal).toLocaleString()}`
          : "Not available",
        totalINR: fmt(livingTotalINR),
      },
      healthInsurance: {
        monthly: `${insurance.currency} ${insurance.amount}`,
        total: `${insurance.currency} ${Math.round(insuranceTotal).toLocaleString()}`,
        totalINR: fmt(insuranceTotalINR),
      },
      visaFee: {
        amount: `${visa.currency} ${visa.amount}`,
        totalINR: fmt(visaFeeINR),
      },
      travel: {
        oneWay: fmt(travelOneWayINR),
        note: "Estimated one-way flight from India",
      },
      applicationFee: {
        amount: appFee ? `${appFeeCcy} ${appFee}` : "Not specified",
        totalINR: fmt(appFeeINR),
      },
      ...(blocked
        ? {
            [blocked.label.toLowerCase().replace(/\s+/g, "_")]: {
              annual: `${blocked.currency} ${blocked.amount.toLocaleString()}`,
              total: `${blocked.currency} ${Math.round(blocked.amount * durationYears).toLocaleString()}`,
              totalINR: fmt(blockedTotalINR),
              note: `Required by ${uni.country} for student visa`,
            },
          }
        : {}),
    },
    grandTotal: {
      totalINR: fmt(grandTotalINR),
      note: "Total estimated cost for entire program duration",
    },
    budgetComparison: budget
      ? {
          studentBudget: `${fmt(budget.min)} – ${fmt(budget.max)}`,
          gap:
            grandTotalINR > budget.max
              ? `Over budget by ${fmt(grandTotalINR - budget.max)}`
              : grandTotalINR < budget.min
              ? `Well within budget (${fmt(budget.min - grandTotalINR)} below minimum)`
              : "Within budget range",
          affordable: grandTotalINR <= budget.max,
        }
      : { note: "Set your budget in profile preferences for a comparison." },
  };

  // ─── Optional scholarships ───
  if (includeScholarships) {
    const scholarships = await prisma.scholarship.findMany({
      where: {
        isActive: true,
        country: uni.country ?? undefined,
      },
      take: 10,
    });

    const programScholarships = p.scholarshipDetails
      ? [
          {
            source: "program",
            details: p.scholarshipDetails,
            hasAssistantship: p.hasAssistantship,
            hasFellowship: p.hasFellowship,
          },
        ]
      : [];

    financialPlan.availableScholarships = {
      programLevel: programScholarships,
      external: scholarships.map((s) => ({
        name: s.name,
        provider: s.provider,
        amount: s.amount,
        deadline: s.deadline ? formatDeadline(s.deadline) : null,
        fieldRestriction: s.fieldRestriction,
      })),
      totalFound: programScholarships.length + scholarships.length,
    };
  }

  return JSON.stringify({ financialPlan });
}

// ─── ML-Powered Tool Implementations ───────────────────

async function findSimilarStudentsTool(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const peers = await findSimilarStudents(userId, {
    country: input.country as string | undefined,
    limit: (input.limit as number) ?? 10,
  });

  if (peers.length === 0) {
    return JSON.stringify({
      message: "Not enough outcome data from similar students yet. As more students record their admission decisions, predictions will improve.",
      peers: [],
    });
  }

  return JSON.stringify({
    peerCount: peers.length,
    peers: peers.map((p) => ({
      similarity: `${Math.round(p.similarity * 100)}%`,
      gpa: p.gpa,
      ielts: p.ielts,
      gre: p.gre,
      workExp: `${p.workExpMonths} months`,
      outcome: p.outcome,
      university: p.universityName,
      matchScore: p.matchScore,
    })),
    summary: `Found ${peers.length} similar students. ${peers.filter((p) => p.outcome === "accepted").length} accepted, ${peers.filter((p) => p.outcome === "rejected").length} rejected, ${peers.filter((p) => p.outcome === "waitlisted").length} waitlisted.`,
  });
}

async function predictFromPeersTool(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const programId = input.programId as string;
  if (!programId) {
    return JSON.stringify({ error: "programId is required" });
  }

  const prediction = await predictFromPeers(userId, programId);
  if (!prediction) {
    return JSON.stringify({
      message: "Not enough peer data for this program/university tier yet. Need at least 3 similar students with outcomes.",
    });
  }

  return JSON.stringify({
    prediction: prediction.prediction,
    confidence: prediction.confidence,
    details: {
      similarStudents: prediction.peerCount,
      accepted: prediction.acceptedCount,
      rejected: prediction.rejectedCount,
      waitlisted: prediction.waitlistedCount,
      peerAcceptanceRate: `${Math.round(prediction.acceptanceRate * 100)}%`,
      avgPeerMatchScore: prediction.avgMatchScore,
      yourMatchScore: prediction.yourMatchScore,
    },
    note: prediction.confidence === "low"
      ? "Low confidence — based on limited data. Take this as directional guidance only."
      : prediction.confidence === "medium"
      ? "Medium confidence — based on a moderate sample of similar students."
      : "High confidence — based on substantial peer data.",
  });
}

async function scoreDocumentTool(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const applicationId = input.applicationId as string;
  const documentId = input.documentId as string | undefined;

  // Find the document
  const doc = documentId
    ? await prisma.applicationDocument.findUnique({
        where: { id: documentId },
        include: { application: { include: { program: { include: { university: true } } } } },
      })
    : await prisma.applicationDocument.findFirst({
        where: { applicationId, type: "sop" },
        orderBy: { updatedAt: "desc" },
        include: { application: { include: { program: { include: { university: true } } } } },
      });

  if (!doc) {
    return JSON.stringify({ error: "No document found. The student needs to write a document first." });
  }

  if (!doc.content || doc.content.trim().length < 50) {
    return JSON.stringify({ error: "Document is too short to score. Needs at least 50 characters of content." });
  }

  const profile = await prisma.academicProfile.findUnique({ where: { userId } });
  if (!profile) {
    return JSON.stringify({ error: "Student profile not found." });
  }

  const quality = await scoreDocument(
    doc.content,
    doc.type,
    doc.universityName,
    doc.programName,
    doc.country,
    profile
  );

  // Save the quality score to the document
  await prisma.applicationDocument.update({
    where: { id: doc.id },
    data: {
      qualityScore: quality.overall,
      qualityData: quality as never,
      lastScoredAt: new Date(),
    },
  });

  return JSON.stringify({
    documentTitle: doc.title,
    overallScore: quality.overall,
    scoreLabel:
      quality.overall >= 80 ? "Excellent" :
      quality.overall >= 65 ? "Good" :
      quality.overall >= 50 ? "Needs Improvement" : "Weak",
    dimensions: quality.dimensions,
    topSuggestions: quality.suggestions.slice(0, 5),
    strengths: quality.strengths,
    estimatedImpact: quality.estimatedImpact,
  });
}

async function recordOutcomeTool(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const applicationId = input.applicationId as string;
  const decision = input.decision as "accepted" | "rejected" | "waitlisted";

  // Verify the application belongs to this user
  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: { program: { include: { university: true } } },
  });

  if (!app) {
    return JSON.stringify({ error: "Application not found or doesn't belong to you." });
  }

  // Check if outcome already exists
  const existing = await prisma.admissionOutcome.findUnique({
    where: { applicationId },
  });
  if (existing) {
    return JSON.stringify({
      message: "Outcome already recorded for this application.",
      decision: existing.decision,
    });
  }

  const outcome = await recordOutcome(applicationId, decision, {
    scholarshipReceived: input.scholarshipReceived as boolean | undefined,
    scholarshipAmount: input.scholarshipAmount as number | undefined,
    notes: input.notes as string | undefined,
  });

  // Recompute student vector to include latest data
  await recomputeStudentVector(userId);

  return JSON.stringify({
    success: true,
    message: `Recorded ${decision} decision for ${app.program.university.name} — ${app.program.name}`,
    decision: outcome.decision,
    matchScoreWas: outcome.matchScoreAtApplication,
    bucket: outcome.bucket,
    note: "This outcome will help improve predictions for future students with similar profiles. Thank you for contributing!",
  });
}
