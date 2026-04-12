import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { sendCapiEventServer } from "@/lib/capi";

const onboardingSchema = z.object({
  // Step 1: Identity
  fullName: z.string().min(1, "Name is required").max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  countryOfResidence: z.string().optional(),

  // Step 2: Academics
  tenthPct: z.string().optional(),
  twelfthPct: z.string().optional(),
  degree: z.string().max(200).optional(),
  specialization: z.string().max(200).optional(),
  college: z.string().max(200).optional(),
  universityRanking: z.string().optional(),
  gpa: z.string().optional().refine(
    (v) => !v || (() => { const n = parseFloat(v); return !isNaN(n) && n >= 0 && n <= 100; })(),
    "GPA must be a number between 0 and 100"
  ),
  gpaScale: z.enum(["scale_10", "scale_4", "scale_100"]).optional(),
  gradYear: z.string().optional().refine(
    (v) => !v || (() => { const n = parseInt(v, 10); return !isNaN(n) && n >= 1980 && n <= 2035; })(),
    "Graduation year must be between 1980 and 2035"
  ),
  backlogs: z.string().optional(),

  // Step 3: Test Scores
  ielts: z.string().optional().refine(
    (v) => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 9),
    "IELTS must be between 0 and 9"
  ),
  toefl: z.string().optional().refine(
    (v) => !v || (parseInt(v, 10) >= 0 && parseInt(v, 10) <= 120),
    "TOEFL must be between 0 and 120"
  ),
  pte: z.string().optional().refine(
    (v) => !v || (parseInt(v, 10) >= 10 && parseInt(v, 10) <= 90),
    "PTE must be between 10 and 90"
  ),
  duolingo: z.string().optional().refine(
    (v) => !v || (parseInt(v, 10) >= 10 && parseInt(v, 10) <= 160),
    "Duolingo must be between 10 and 160"
  ),
  sat: z.string().optional().refine(
    (v) => !v || (parseInt(v, 10) >= 400 && parseInt(v, 10) <= 1600),
    "SAT must be between 400 and 1600"
  ),
  gre: z.string().optional().refine(
    (v) => !v || (parseInt(v, 10) >= 260 && parseInt(v, 10) <= 340),
    "GRE must be between 260 and 340"
  ),
  greVerbal: z.string().optional().refine(
    (v) => !v || (parseInt(v, 10) >= 130 && parseInt(v, 10) <= 170),
    "GRE Verbal must be between 130 and 170"
  ),
  greQuant: z.string().optional().refine(
    (v) => !v || (parseInt(v, 10) >= 130 && parseInt(v, 10) <= 170),
    "GRE Quant must be between 130 and 170"
  ),
  gmat: z.string().optional().refine(
    (v) => !v || (parseInt(v, 10) >= 200 && parseInt(v, 10) <= 800),
    "GMAT must be between 200 and 800"
  ),
  plannedTests: z.array(z.string()).optional(),

  // Step 4: Work Experience
  workExpMonths: z.string().optional(),
  currentCompany: z.string().max(200).optional(),
  currentJobTitle: z.string().max(200).optional(),
  keyAchievements: z.string().max(3000).optional(),
  leadershipRoles: z.string().max(2000).optional(),
  internships: z.string().optional(),
  internshipDetails: z.string().max(3000).optional(),

  // Step 5: Extracurriculars
  clubs: z.string().max(2000).optional(),
  competitions: z.string().max(2000).optional(),
  volunteering: z.string().max(2000).optional(),
  sportsArtsHobbies: z.string().max(2000).optional(),
  publications: z.string().max(3000).optional(),
  researchPapers: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  extracurriculars: z.string().optional(),

  // Step 6: Story & Positioning
  whyThisField: z.string().max(3000).optional(),
  whyThisCountry: z.string().max(3000).optional(),
  whyNow: z.string().max(3000).optional(),
  shortTermGoals: z.string().max(2000).optional(),
  longTermGoals: z.string().max(2000).optional(),
  uniqueStory: z.string().max(5000).optional(),
  careerGoals: z.string().max(2000).optional(),

  // Step 7: Financial
  familyIncomeRange: z.string().optional(),
  sponsorType: z.string().optional(),
  sponsorDetails: z.string().max(500).optional(),
  savingsRange: z.string().optional(),
  loanPlanned: z.boolean().optional(),
  loanDetails: z.string().max(500).optional(),
  budgetForTuition: z.string().max(200).optional(),
  scholarshipPref: z.string().optional(),

  // Step 8: Visa & Preferences
  passportNumber: z.string().max(20).optional(),
  passportExpiry: z.string().optional(),
  countriesVisited: z.string().optional(),
  visaRejections: z.boolean().optional(),
  visaRejectionDetails: z.string().max(2000).optional(),
  targetCountries: z.array(z.string()).min(1, "Select at least one country"),
  targetField: z.string().min(1, "Target field is required"),
  degreeLevel: z.enum(["masters", "mba", "bachelors", "phd"]),
  budgetRange: z.enum(["under_5L", "five_10L", "ten_20L", "twenty_40L", "above_40L"]),
  targetIntake: z.string().min(1, "Target intake is required"),
  preferredUniversities: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const result = onboardingSchema.safeParse(rawBody);

    if (!result.success) {
      const errors = result.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const body = result.data;

    const parseFloat_ = (v?: string) => (v ? parseFloat(v) : null);
    const parseInt_ = (v?: string) => (v ? parseInt(v, 10) : null);

    const parseBacklogs = (v?: string): number => {
      if (!v) return 0;
      if (v === "0") return 0;
      if (v === "1-2") return 2;
      if (v === "3+") return 3;
      const n = parseInt(v, 10);
      return isNaN(n) ? 0 : n;
    };

    const splitComma = (v?: string): string[] =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    // Compute total GRE if verbal + quant provided
    const greVerbalVal = parseInt_(body.greVerbal);
    const greQuantVal = parseInt_(body.greQuant);
    const greTotal =
      greVerbalVal && greQuantVal
        ? greVerbalVal + greQuantVal
        : parseInt_(body.gre);

    await prisma.$transaction(async (tx) => {
      // 1. Upsert User
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: body.email || user.email!,
          name: body.fullName,
          phone: body.phone || null,
          city: body.city || null,
          dob: body.dob ? new Date(body.dob) : null,
          gender: body.gender || null,
          nationality: body.nationality || null,
          countryOfResidence: body.countryOfResidence || null,
          passportNumber: body.passportNumber || null,
          passportExpiry: body.passportExpiry
            ? new Date(body.passportExpiry)
            : null,
          countriesVisited: splitComma(body.countriesVisited),
          visaRejections: body.visaRejections ?? false,
          visaRejectionDetails: body.visaRejectionDetails || null,
          onboardingComplete: true,
        },
        update: {
          name: body.fullName,
          phone: body.phone || null,
          city: body.city || null,
          dob: body.dob ? new Date(body.dob) : null,
          gender: body.gender || null,
          nationality: body.nationality || null,
          countryOfResidence: body.countryOfResidence || null,
          passportNumber: body.passportNumber || null,
          passportExpiry: body.passportExpiry
            ? new Date(body.passportExpiry)
            : null,
          countriesVisited: splitComma(body.countriesVisited),
          visaRejections: body.visaRejections ?? false,
          visaRejectionDetails: body.visaRejectionDetails || null,
          onboardingComplete: true,
        },
      });

      // 2. Upsert AcademicProfile
      await tx.academicProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          tenthPercentage: parseFloat_(body.tenthPct),
          twelfthPercentage: parseFloat_(body.twelfthPct),
          degreeName: body.degree || "",
          specialization: body.specialization || null,
          collegeName: body.college || "",
          universityRanking: body.universityRanking || null,
          gpa: body.gpa ? parseFloat(body.gpa) : 0,
          gpaScale: body.gpaScale || "scale_4",
          graduationYear: body.gradYear ? parseInt(body.gradYear, 10) : 0,
          backlogs: parseBacklogs(body.backlogs),
          workExperienceMonths: parseInt_(body.workExpMonths) ?? 0,
          ieltsScore: parseFloat_(body.ielts),
          toeflScore: parseInt_(body.toefl),
          pteScore: parseInt_(body.pte),
          duolingoScore: parseInt_(body.duolingo),
          satScore: parseInt_(body.sat),
          greScore: greTotal,
          greVerbal: greVerbalVal,
          greQuant: greQuantVal,
          gmatScore: parseInt_(body.gmat),
          plannedTests: body.plannedTests || [],
          currentCompany: body.currentCompany || null,
          currentJobTitle: body.currentJobTitle || null,
          keyAchievements: body.keyAchievements || null,
          leadershipRoles: body.leadershipRoles || null,
          internshipDetails: body.internshipDetails || null,
          clubs: body.clubs || null,
          competitions: body.competitions || null,
          volunteering: body.volunteering || null,
          sportsArtsHobbies: body.sportsArtsHobbies || null,
          publications: body.publications || null,
          certifications: body.certifications || [],
        },
        update: {
          tenthPercentage: parseFloat_(body.tenthPct),
          twelfthPercentage: parseFloat_(body.twelfthPct),
          degreeName: body.degree || "",
          specialization: body.specialization || null,
          collegeName: body.college || "",
          universityRanking: body.universityRanking || null,
          gpa: body.gpa ? parseFloat(body.gpa) : 0,
          gpaScale: body.gpaScale || "scale_4",
          graduationYear: body.gradYear ? parseInt(body.gradYear, 10) : 0,
          backlogs: parseBacklogs(body.backlogs),
          workExperienceMonths: parseInt_(body.workExpMonths) ?? 0,
          ieltsScore: parseFloat_(body.ielts),
          toeflScore: parseInt_(body.toefl),
          pteScore: parseInt_(body.pte),
          duolingoScore: parseInt_(body.duolingo),
          satScore: parseInt_(body.sat),
          greScore: greTotal,
          greVerbal: greVerbalVal,
          greQuant: greQuantVal,
          gmatScore: parseInt_(body.gmat),
          plannedTests: body.plannedTests || [],
          currentCompany: body.currentCompany || null,
          currentJobTitle: body.currentJobTitle || null,
          keyAchievements: body.keyAchievements || null,
          leadershipRoles: body.leadershipRoles || null,
          internshipDetails: body.internshipDetails || null,
          clubs: body.clubs || null,
          competitions: body.competitions || null,
          volunteering: body.volunteering || null,
          sportsArtsHobbies: body.sportsArtsHobbies || null,
          publications: body.publications || null,
          certifications: body.certifications || [],
        },
      });

      // 3. Upsert Preferences
      const extras = body.extracurriculars
        ? body.extracurriculars
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      await tx.preferences.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          targetCountries: body.targetCountries,
          targetField: body.targetField,
          targetDegreeLevel: body.degreeLevel,
          budgetRange: body.budgetRange,
          targetIntake: body.targetIntake,
          preferredUniversities: splitComma(body.preferredUniversities),
          extracurriculars: extras,
          careerGoals: body.careerGoals || null,
          whyThisField: body.whyThisField || null,
          whyThisCountry: body.whyThisCountry || null,
          whyNow: body.whyNow || null,
          shortTermGoals: body.shortTermGoals || null,
          longTermGoals: body.longTermGoals || null,
          uniqueStory: body.uniqueStory || null,
          scholarshipPref: body.scholarshipPref || null,
        },
        update: {
          targetCountries: body.targetCountries,
          targetField: body.targetField,
          targetDegreeLevel: body.degreeLevel,
          budgetRange: body.budgetRange,
          targetIntake: body.targetIntake,
          preferredUniversities: splitComma(body.preferredUniversities),
          extracurriculars: extras,
          careerGoals: body.careerGoals || null,
          whyThisField: body.whyThisField || null,
          whyThisCountry: body.whyThisCountry || null,
          whyNow: body.whyNow || null,
          shortTermGoals: body.shortTermGoals || null,
          longTermGoals: body.longTermGoals || null,
          uniqueStory: body.uniqueStory || null,
          scholarshipPref: body.scholarshipPref || null,
        },
      });

      // 4. Upsert FinancialProfile
      await tx.financialProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          familyIncomeRange: body.familyIncomeRange || null,
          sponsorType: body.sponsorType || null,
          sponsorDetails: body.sponsorDetails || null,
          savingsRange: body.savingsRange || null,
          loanPlanned: body.loanPlanned ?? false,
          loanDetails: body.loanDetails || null,
          budgetForTuition: body.budgetForTuition || null,
          scholarshipPref: body.scholarshipPref || null,
        },
        update: {
          familyIncomeRange: body.familyIncomeRange || null,
          sponsorType: body.sponsorType || null,
          sponsorDetails: body.sponsorDetails || null,
          savingsRange: body.savingsRange || null,
          loanPlanned: body.loanPlanned ?? false,
          loanDetails: body.loanDetails || null,
          budgetForTuition: body.budgetForTuition || null,
          scholarshipPref: body.scholarshipPref || null,
        },
      });
    });

    await sendCapiEventServer({
      event_name: "Lead",
      event_id: `lead_${user.id}`,
      email: body.email || user.email || undefined,
      phone: body.phone || undefined,
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding failed" },
      { status: 500 }
    );
  }
}
