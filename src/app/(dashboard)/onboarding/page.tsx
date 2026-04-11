"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 8;

const stepMeta = [
  {
    id: 1,
    tag: "Step 01 — Identity",
    title: "Your journey to\nGlobal Excellence\nbegins here.",
    description:
      "Connect your professional profile to our academic intelligence network to unlock personalized institutional matching.",
    sectionLabel: "Application Progress",
    sectionTitle: "Personal Information",
  },
  {
    id: 2,
    tag: "Step 02 — Academics",
    title: "Quantify\nYour\nJourney.",
    description:
      "Elite institutions look for the nuance in your numbers. We use this data to match you with global cohorts that align with your trajectory.",
    sectionLabel: "Academic Integrity",
    sectionTitle: "Academic Credentials",
  },
  {
    id: 3,
    tag: "Step 03 — Credentialing",
    title: "Quantifying\nAcademic\nExcellence.",
    description:
      "Standardized tests provide the objective baseline for global admissions. Share your scores to unlock matching institutional benchmarks.",
    sectionLabel: "Linguistic Foundation",
    sectionTitle: "English Language Proficiency",
  },
  {
    id: 4,
    tag: "Step 04 — Experience",
    title: "Showcase\nYour\nImpact.",
    description:
      "Top universities value real-world experience. Your work history, internships, and leadership roles demonstrate readiness for advanced study.",
    sectionLabel: "Professional History",
    sectionTitle: "Work Experience & Internships",
  },
  {
    id: 5,
    tag: "Step 05 — Achievements",
    title: "Beyond\nthe\nClassroom.",
    description:
      "Extracurriculars, competitions, and certifications reveal the dimensions of your personality that transcripts can't capture.",
    sectionLabel: "Holistic Profile",
    sectionTitle: "Extracurriculars & Achievements",
  },
  {
    id: 6,
    tag: "Step 06 — Your Story",
    title: "Define Your\nNarrative.",
    description:
      "The most compelling applications tell a story. Your motivations, goals, and unique perspective are what separate good from great.",
    sectionLabel: "Strategic Positioning",
    sectionTitle: "Story & Positioning",
  },
  {
    id: 7,
    tag: "Step 07 — Financials",
    title: "Plan Your\nInvestment.",
    description:
      "Understanding your financial profile helps us identify the right scholarships, affordable programs, and realistic funding strategies.",
    sectionLabel: "Financial Planning",
    sectionTitle: "Financial Information",
  },
  {
    id: 8,
    tag: "Step 08 — Preferences",
    title: "Define Your\nAcademic\nHorizon.",
    description:
      "Visa history, target destinations, and degree preferences shape your entire application strategy. Let's finalize your profile.",
    sectionLabel: "Final Submission",
    sectionTitle: "Visa, Preferences & Submit",
  },
];

const countries = [
  "Germany",
  "Australia",
  "Canada",
  "United Kingdom",
  "United States",
  "Ireland",
  "Netherlands",
  "France",
  "Singapore",
  "New Zealand",
  "Sweden",
  "Italy",
  "Spain",
  "Japan",
  "South Korea",
  "Switzerland",
  "Denmark",
  "Norway",
  "Hong Kong",
  "Finland",
];

const fields = [
  "Computer Science & AI",
  "Data Science / AI",
  "Information Technology",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biomedical Engineering",
  "Global Business & MBA",
  "Management",
  "Finance / Economics",
  "Marketing",
  "Supply Chain / Operations",
  "Biotechnology",
  "Public Health",
  "Medicine / Pre-Med",
  "Pharmacy",
  "Public Policy & Law",
  "International Relations",
  "Psychology",
  "Education",
  "Design",
  "Architecture",
  "Media & Communications",
  "Environmental Science",
  "Mathematics / Statistics",
  "Physics",
  "Chemistry",
  "Biology",
  "Agriculture & Food Science",
  "Hospitality & Tourism",
  "Other",
];

const nationalities = [
  "Indian",
  "Chinese",
  "Nigerian",
  "Bangladeshi",
  "Pakistani",
  "Vietnamese",
  "Nepalese",
  "Sri Lankan",
  "Indonesian",
  "Filipino",
  "Brazilian",
  "Mexican",
  "Turkish",
  "Iranian",
  "Egyptian",
  "Kenyan",
  "Ghanaian",
  "South African",
  "Colombian",
  "Thai",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEnglishTest, setSelectedEnglishTest] = useState<string>("");
  const [notTakenEnglish, setNotTakenEnglish] = useState(false);
  const [planningGmat, setPlanningGmat] = useState(false);
  const [selectedBacklog, setSelectedBacklog] = useState("0");
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [selectedPlannedTests, setSelectedPlannedTests] = useState<string[]>(
    []
  );
  const [degreeType, setDegreeType] = useState<"bachelors" | "masters" | "">("");

  const [form, setForm] = useState({
    // Step 1: Identity
    fullName: "",
    email: "",
    phone: "",
    city: "",
    dob: "",
    gender: "",
    nationality: "",
    countryOfResidence: "",

    // Step 2: Academics
    tenthPct: "",
    twelfthPct: "",
    degree: "",
    specialization: "",
    college: "",
    universityRanking: "",
    gpa: "",
    gpaScale: "scale_4",
    gradYear: "",
    backlogs: "0",

    // Step 3: Test Scores
    ielts: "",
    toefl: "",
    pte: "",
    duolingo: "",
    sat: "",
    gre: "",
    greVerbal: "",
    greQuant: "",
    gmat: "",

    // Step 4: Work Experience
    workExpMonths: "",
    currentCompany: "",
    currentJobTitle: "",
    keyAchievements: "",
    leadershipRoles: "",
    internships: "",
    internshipDetails: "",

    // Step 5: Extracurriculars
    clubs: "",
    competitions: "",
    volunteering: "",
    sportsArtsHobbies: "",
    publications: "",
    researchPapers: "",
    extracurriculars: "",

    // Step 6: Story & Positioning
    whyThisField: "",
    whyThisCountry: "",
    whyNow: "",
    shortTermGoals: "",
    longTermGoals: "",
    uniqueStory: "",
    careerGoals: "",

    // Step 7: Financial
    familyIncomeRange: "",
    sponsorType: "",
    sponsorDetails: "",
    savingsRange: "",
    loanPlanned: false,
    loanDetails: "",
    budgetForTuition: "",
    scholarshipPref: "",

    // Step 8: Visa & Preferences
    passportNumber: "",
    passportExpiry: "",
    countriesVisited: "",
    visaRejections: false,
    visaRejectionDetails: "",
    targetCountries: [] as string[],
    targetField: "",
    degreeLevel: "masters",
    budgetRange: "ten_20L",
    targetIntake: "Fall 2027",
    preferredUniversities: "",
  });

  // Pre-populate form with existing profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) return;
        const data = await res.json();
        const u = data.user;
        if (!u) return;

        const ap = u.academicProfile;
        const pref = u.preferences;
        const fin = u.financialProfile;

        setForm((prev) => ({
          ...prev,
          fullName: u.name || prev.fullName,
          email: u.email || data.authEmail || prev.email,
          phone: u.phone || prev.phone,
          city: u.city || prev.city,
          dob: u.dob ? u.dob.slice(0, 10) : prev.dob,
          gender: u.gender || prev.gender,
          nationality: u.nationality || prev.nationality,
          countryOfResidence: u.countryOfResidence || prev.countryOfResidence,
          passportNumber: u.passportNumber || prev.passportNumber,
          passportExpiry: u.passportExpiry
            ? u.passportExpiry.slice(0, 10)
            : prev.passportExpiry,
          countriesVisited:
            u.countriesVisited?.join(", ") || prev.countriesVisited,
          visaRejections: u.visaRejections ?? prev.visaRejections,
          visaRejectionDetails:
            u.visaRejectionDetails || prev.visaRejectionDetails,
          tenthPct:
            ap?.tenthPercentage != null
              ? String(ap.tenthPercentage)
              : prev.tenthPct,
          twelfthPct:
            ap?.twelfthPercentage != null
              ? String(ap.twelfthPercentage)
              : prev.twelfthPct,
          degree: ap?.degreeName || prev.degree,
          specialization: ap?.specialization || prev.specialization,
          college: ap?.collegeName || prev.college,
          universityRanking: ap?.universityRanking || prev.universityRanking,
          gpa: ap?.gpa != null ? String(ap.gpa) : prev.gpa,
          gpaScale: ap?.gpaScale || prev.gpaScale,
          gradYear:
            ap?.graduationYear != null
              ? String(ap.graduationYear)
              : prev.gradYear,
          backlogs:
            ap?.backlogs != null ? String(ap.backlogs) : prev.backlogs,
          ielts:
            ap?.ieltsScore != null ? String(ap.ieltsScore) : prev.ielts,
          toefl:
            ap?.toeflScore != null ? String(ap.toeflScore) : prev.toefl,
          pte: ap?.pteScore != null ? String(ap.pteScore) : prev.pte,
          duolingo:
            ap?.duolingoScore != null
              ? String(ap.duolingoScore)
              : prev.duolingo,
          sat: ap?.satScore != null ? String(ap.satScore) : prev.sat,
          gre: ap?.greScore != null ? String(ap.greScore) : prev.gre,
          greVerbal:
            ap?.greVerbal != null ? String(ap.greVerbal) : prev.greVerbal,
          greQuant:
            ap?.greQuant != null ? String(ap.greQuant) : prev.greQuant,
          gmat: ap?.gmatScore != null ? String(ap.gmatScore) : prev.gmat,
          workExpMonths:
            ap?.workExperienceMonths != null
              ? String(ap.workExperienceMonths)
              : prev.workExpMonths,
          currentCompany: ap?.currentCompany || prev.currentCompany,
          currentJobTitle: ap?.currentJobTitle || prev.currentJobTitle,
          keyAchievements: ap?.keyAchievements || prev.keyAchievements,
          leadershipRoles: ap?.leadershipRoles || prev.leadershipRoles,
          internshipDetails: ap?.internshipDetails || prev.internshipDetails,
          clubs: ap?.clubs || prev.clubs,
          competitions: ap?.competitions || prev.competitions,
          volunteering: ap?.volunteering || prev.volunteering,
          sportsArtsHobbies: ap?.sportsArtsHobbies || prev.sportsArtsHobbies,
          publications: ap?.publications || prev.publications,
          targetCountries: pref?.targetCountries || prev.targetCountries,
          targetField: pref?.targetField || prev.targetField,
          degreeLevel: pref?.targetDegreeLevel || prev.degreeLevel,
          budgetRange: pref?.budgetRange || prev.budgetRange,
          targetIntake: pref?.targetIntake || prev.targetIntake,
          preferredUniversities:
            pref?.preferredUniversities?.join(", ") ||
            prev.preferredUniversities,
          extracurriculars:
            pref?.extracurriculars?.join(", ") || prev.extracurriculars,
          careerGoals: pref?.careerGoals || prev.careerGoals,
          whyThisField: pref?.whyThisField || prev.whyThisField,
          whyThisCountry: pref?.whyThisCountry || prev.whyThisCountry,
          whyNow: pref?.whyNow || prev.whyNow,
          shortTermGoals: pref?.shortTermGoals || prev.shortTermGoals,
          longTermGoals: pref?.longTermGoals || prev.longTermGoals,
          uniqueStory: pref?.uniqueStory || prev.uniqueStory,
          familyIncomeRange: fin?.familyIncomeRange || prev.familyIncomeRange,
          sponsorType: fin?.sponsorType || prev.sponsorType,
          sponsorDetails: fin?.sponsorDetails || prev.sponsorDetails,
          savingsRange: fin?.savingsRange || prev.savingsRange,
          loanPlanned: fin?.loanPlanned ?? prev.loanPlanned,
          loanDetails: fin?.loanDetails || prev.loanDetails,
          budgetForTuition: fin?.budgetForTuition || prev.budgetForTuition,
          scholarshipPref: fin?.scholarshipPref || prev.scholarshipPref,
        }));

        // Restore degree type from saved profile
        if (pref?.targetDegreeLevel) {
          setDegreeType(pref.targetDegreeLevel === "bachelors" ? "bachelors" : "masters");
        }

        // Set secondary state
        if (ap?.backlogs != null) {
          const b = ap.backlogs;
          setSelectedBacklog(b === 0 ? "0" : b <= 2 ? "1-2" : "3+");
        }
        if (ap?.ieltsScore != null) setSelectedEnglishTest("ielts");
        else if (ap?.toeflScore != null) setSelectedEnglishTest("toefl");
        else if (ap?.pteScore != null) setSelectedEnglishTest("pte");
        else if (ap?.duolingoScore != null) setSelectedEnglishTest("duolingo");
        if (ap?.plannedTests?.length) setSelectedPlannedTests(ap.plannedTests);
        if (ap?.certifications?.length) setSelectedCerts(ap.certifications);
      } catch {
        // silent — fresh form is fine
      }
    }
    loadProfile();
  }, []);

  const update = (key: string, value: string | string[] | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCountry = (c: string) => {
    const list = form.targetCountries.includes(c)
      ? form.targetCountries.filter((x) => x !== c)
      : [...form.targetCountries, c];
    update("targetCountries", list);
  };

  const toggleCert = (c: string) => {
    setSelectedCerts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const togglePlannedTest = (t: string) => {
    setSelectedPlannedTests((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const selectDegreeType = (type: "bachelors" | "masters") => {
    setDegreeType(type);
    update("degreeLevel", type);
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          certifications: selectedCerts,
          backlogs: selectedBacklog,
          plannedTests: selectedPlannedTests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const current = stepMeta[step - 1];
  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="onb-light-root">
      {/* ─── Degree Type Selection Screen ─── */}
      {degreeType === "" && (
        <div className="flex min-h-screen">
          {/* Left Blue Panel */}
          <div className="hidden lg:flex w-[440px] shrink-0 bg-[#3438d8] text-white flex-col justify-between p-10 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold tracking-tight font-headline">RIBRIZ</h2>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/60 font-semibold mt-1">Elite Academic Intel</p>
            </div>
            <div className="relative z-10 space-y-6">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60 font-semibold">Before we begin</p>
              <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight font-headline whitespace-pre-line">{"What level\nare you\napplying for?"}</h1>
              <p className="text-white/70 text-base leading-relaxed max-w-sm">
                Your answer shapes the entire profile we build for you — questions, benchmarks, and strategy are all tailored to your goal.
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-3 bg-white/10 rounded-xl px-5 py-3.5">
              <span className="material-symbols-outlined text-white/80 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span className="text-sm text-white/80 font-medium">Your data is secure and encrypted</span>
            </div>
            <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full border border-white/10" />
            <div className="absolute top-[-40px] right-[-40px] w-[220px] h-[220px] rounded-full border border-white/5" />
          </div>

          {/* Right Selection Panel */}
          <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 md:px-16 py-12">
            <div className="w-full max-w-lg">
              <div className="mb-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1">Application Profile</p>
                <h2 className="text-2xl font-bold font-headline text-on-surface">What are you applying for?</h2>
                <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                  This helps us show only the questions that matter for your application — no irrelevant fields, no wasted time.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bachelor's card */}
                <button
                  onClick={() => selectDegreeType("bachelors")}
                  className="group p-8 border-2 border-surface-container-high text-left hover:border-primary hover:bg-primary-fixed/20 transition-all"
                >
                  <span className="material-symbols-outlined text-primary text-4xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Bachelor&apos;s</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Completed 10th & 12th. We&apos;ll ask about your school scores, SAT, and English proficiency.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["10th & 12th Marks", "English Proficiency", "SAT Score"].map((tag) => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary bg-primary-fixed px-2 py-1">{tag}</span>
                    ))}
                  </div>
                </button>
                {/* Master's card */}
                <button
                  onClick={() => selectDegreeType("masters")}
                  className="group p-8 border-2 border-surface-container-high text-left hover:border-primary hover:bg-primary-fixed/20 transition-all"
                >
                  <span className="material-symbols-outlined text-primary text-4xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Master&apos;s / MBA</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Completed a Bachelor&apos;s degree. We&apos;ll ask about your college, GPA, GRE/GMAT, and work experience.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["Bachelor's Degree", "GPA / CGPA", "GRE / GMAT", "Work Experience"].map((tag) => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary bg-primary-fixed px-2 py-1">{tag}</span>
                    ))}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 1: Identity & Target Clarity ─── */}
      {degreeType !== "" && step === 1 && (
        <div className="flex min-h-screen">
          {/* Left Blue Panel */}
          <div className="hidden lg:flex w-[440px] shrink-0 bg-[#3438d8] text-white flex-col justify-between p-10 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold tracking-tight font-headline">
                RIBRIZ
              </h2>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/60 font-semibold mt-1">
                Elite Academic Intel
              </p>
            </div>

            <div className="relative z-10 space-y-6">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60 font-semibold">
                {current.tag}
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight font-headline whitespace-pre-line">
                {current.title}
              </h1>
              <p className="text-white/70 text-base leading-relaxed max-w-sm">
                {current.description}
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 bg-white/10 rounded-xl px-5 py-3.5">
              <span
                className="material-symbols-outlined text-white/80 text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <span className="text-sm text-white/80 font-medium">
                Your data is secure and encrypted
              </span>
            </div>

            <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full border border-white/10" />
            <div className="absolute top-[-40px] right-[-40px] w-[220px] h-[220px] rounded-full border border-white/5" />
          </div>

          {/* Right Form Panel */}
          <div className="flex-1 flex flex-col justify-between bg-white min-h-screen">
            <div className="flex-1 flex items-center justify-center px-8 md:px-16 py-12">
              <div className="w-full max-w-lg">
                <div className="mb-10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1">
                    {current.sectionLabel}
                  </p>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold font-headline text-on-surface">
                      {current.sectionTitle}
                    </h2>
                    <span className="text-sm text-on-surface-variant">
                      <span className="text-primary font-bold">
                        {String(step).padStart(2, "0")}
                      </span>{" "}
                      / {String(TOTAL_STEPS).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-1">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(
                      (s) => (
                        <div
                          key={s}
                          className={cn(
                            "h-[3px] flex-1 rounded-full transition-all",
                            s <= step
                              ? "bg-primary"
                              : "bg-surface-container-high"
                          )}
                        />
                      )
                    )}
                  </div>
                </div>

                <form
                  className="space-y-7"
                  onSubmit={(e) => {
                    e.preventDefault();
                    next();
                  }}
                >
                  <LightField
                    label="Full Legal Name"
                    value={form.fullName}
                    onChange={(v) => update("fullName", v)}
                    placeholder="Enter your full name as it appears on passport"
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                    <LightField
                      label="Email Address"
                      value={form.email}
                      onChange={(v) => update("email", v)}
                      placeholder="name@example.com"
                      type="email"
                    />
                    <LightField
                      label="Mobile Number"
                      value={form.phone}
                      onChange={(v) => update("phone", v)}
                      placeholder="+91 98765 43210"
                      type="tel"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                    <LightField
                      label="Date of Birth"
                      value={form.dob}
                      onChange={(v) => update("dob", v)}
                      type="date"
                      placeholder="mm/dd/yyyy"
                    />
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-3">
                        Gender
                      </label>
                      <select
                        value={form.gender}
                        onChange={(e) => update("gender", e.target.value)}
                        className="w-full bg-transparent border-b-2 border-surface-container-high py-2.5 text-on-surface text-base focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer-not-to-say">
                          Prefer not to say
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-3">
                        Nationality
                      </label>
                      <select
                        value={form.nationality}
                        onChange={(e) => update("nationality", e.target.value)}
                        className="w-full bg-transparent border-b-2 border-surface-container-high py-2.5 text-on-surface text-base focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <option value="">Select nationality</option>
                        {nationalities.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <LightField
                      label="Country of Residence"
                      value={form.countryOfResidence}
                      onChange={(v) => update("countryOfResidence", v)}
                      placeholder="e.g. India"
                    />
                  </div>
                  <LightField
                    label="City of Residence"
                    value={form.city}
                    onChange={(v) => update("city", v)}
                    placeholder="e.g. Mumbai"
                  />

                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">
                        lock
                      </span>
                      <p className="text-xs max-w-[260px]">
                        Your data is secure and will only be shared with
                        verified institutions.
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="bg-primary text-on-primary px-8 py-3.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:brightness-110 transition-all"
                    >
                      Continue
                      <span className="material-symbols-outlined text-lg">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="px-8 md:px-16 py-6 border-t border-surface-container flex gap-8">
              <button className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary transition-colors">
                Need Help?
              </button>
              <button className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary transition-colors">
                Privacy Policy
              </button>
              <button className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant hover:text-primary transition-colors">
                Save &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 2: Academic Profile ─── */}
      {step === 2 && (
        <div className="min-h-screen bg-white flex flex-col">
          <OnbTopNav step={step} progress={progress} />
          <div className="flex-1 flex overflow-hidden">
            <StepHeroPanel current={current} />

            <div className="flex-1 overflow-y-auto px-8 md:px-16 py-10">
              <form
                className="max-w-2xl space-y-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                {/* Primary Credentials */}
                <div>
                  <SectionBadge>Primary Credentials</SectionBadge>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <LightField
                      label="10th Grade Percentage"
                      value={form.tenthPct}
                      onChange={(v) => update("tenthPct", v)}
                      placeholder="e.g. 92.5"
                      type="number"
                    />
                    <LightField
                      label="12th Grade Percentage"
                      value={form.twelfthPct}
                      onChange={(v) => update("twelfthPct", v)}
                      placeholder="e.g. 89.0"
                      type="number"
                    />
                  </div>
                </div>

                {/* Advanced Academic Intel — Masters only */}
                {degreeType === "masters" && <div>
                  <SectionBadge>Bachelor&apos;s Degree Details</SectionBadge>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <LightField
                        label="Degree Pursued / Completed"
                        value={form.degree}
                        onChange={(v) => update("degree", v)}
                        placeholder="e.g. Bachelor of Science"
                      />
                      <LightField
                        label="Major / Specialization"
                        value={form.specialization}
                        onChange={(v) => update("specialization", v)}
                        placeholder="e.g. Computer Engineering"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <LightField
                        label="Institution / College Name"
                        value={form.college}
                        onChange={(v) => update("college", v)}
                        placeholder="e.g. IIT Delhi"
                      />
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-3">
                          University Ranking / Tier
                        </label>
                        <select
                          value={form.universityRanking}
                          onChange={(e) =>
                            update("universityRanking", e.target.value)
                          }
                          className="w-full bg-transparent border-b-2 border-surface-container-high py-2.5 text-on-surface text-base focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                        >
                          <option value="">Select tier</option>
                          <option value="top_50">Top 50 (globally)</option>
                          <option value="top_100">Top 100</option>
                          <option value="top_200">Top 200</option>
                          <option value="top_500">Top 500</option>
                          <option value="nationally_ranked">
                            Nationally ranked
                          </option>
                          <option value="not_ranked">Not ranked / Unsure</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <LightField
                            label="Cumulative GPA / CGPA"
                            value={form.gpa}
                            onChange={(v) => update("gpa", v)}
                            placeholder="e.g. 3.85"
                            type="number"
                            required
                          />
                        </div>
                        <div className="pb-1">
                          <select
                            value={form.gpaScale}
                            onChange={(e) =>
                              update("gpaScale", e.target.value)
                            }
                            className="bg-transparent border-b-2 border-surface-container-high py-2.5 text-on-surface text-sm focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                          >
                            <option value="scale_4">/ 4.0</option>
                            <option value="scale_10">/ 10.0</option>
                            <option value="scale_100">/ 100</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-3">
                          Graduation Year
                        </label>
                        <select
                          value={form.gradYear}
                          onChange={(e) => update("gradYear", e.target.value)}
                          className="w-full bg-transparent border-b-2 border-surface-container-high py-2.5 text-on-surface text-base focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                        >
                          <option value="">Select Year</option>
                          {Array.from({ length: 12 }, (_, i) => 2018 + i).map(
                            (y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Backlogs */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                        History of Backlogs
                      </label>
                      <div className="flex gap-3">
                        {[
                          { val: "0", label: "None" },
                          { val: "1-2", label: "Moderate" },
                          { val: "3+", label: "Extended" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setSelectedBacklog(opt.val)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all",
                              selectedBacklog === opt.val
                                ? "border-primary text-primary bg-primary-fixed"
                                : "border-surface-container-high text-on-surface-variant hover:border-outline"
                            )}
                          >
                            <span className="font-bold">{opt.val}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-error mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">
                          info
                        </span>
                        Total history of unsuccessful attempts (active or
                        cleared).
                      </p>
                    </div>
                  </div>
                </div>}

                <StepNavButtons step={step} prev={prev} nextLabel="Continue to Step 3" />
              </form>
            </div>

            <StepSidebar step={step} progress={progress}>
              <div className="bg-surface-container-low rounded-2xl p-5">
                <h4 className="font-bold text-sm text-on-surface mb-2">
                  Did you know?
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Top-tier US universities often normalize CGPA based on your
                  institution&apos;s historical ranking. We automatically adjust
                  these for you.
                </p>
              </div>
            </StepSidebar>
          </div>
        </div>
      )}

      {/* ─── Step 3: Test Scores ─── */}
      {step === 3 && (
        <div className="flex min-h-screen">
          <BlueSidePanel current={current} progress={progress} />

          <div className="flex-1 overflow-y-auto bg-white px-8 md:px-16 py-12">
            <form
              className="max-w-2xl mx-auto space-y-12"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              {/* English Proficiency */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-1">
                  Linguistic Foundation
                </p>
                <h2 className="text-2xl font-bold font-headline text-on-surface mb-8">
                  English Language Proficiency
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    {
                      key: "ielts",
                      label: "IELTS",
                      desc: "International English Language Testing System",
                      icon: "language",
                    },
                    {
                      key: "toefl",
                      label: "TOEFL",
                      desc: "Test of English as a Foreign Language",
                      icon: "translate",
                    },
                    {
                      key: "pte",
                      label: "PTE",
                      desc: "Pearson Test of English Academic",
                      icon: "record_voice_over",
                    },
                    {
                      key: "duolingo",
                      label: "Duolingo",
                      desc: "Duolingo English Test",
                      icon: "quiz",
                    },
                  ].map((test) => (
                    <button
                      key={test.key}
                      type="button"
                      onClick={() => setSelectedEnglishTest(test.key)}
                      className={cn(
                        "p-5 rounded-xl border text-left transition-all",
                        selectedEnglishTest === test.key
                          ? "border-primary bg-primary-fixed/30"
                          : "border-surface-container-high bg-surface-container-low hover:border-outline"
                      )}
                    >
                      <span className="material-symbols-outlined text-primary text-2xl mb-3 block">
                        {test.icon}
                      </span>
                      <p className="font-bold text-on-surface text-sm">
                        {test.label}
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                        {test.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {selectedEnglishTest && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <LightField
                      label="Overall Band / Score"
                      value={
                        form[
                          selectedEnglishTest as keyof typeof form
                        ] as string
                      }
                      onChange={(v) => update(selectedEnglishTest, v)}
                      placeholder="Enter Total Score"
                      type="number"
                    />
                    <label className="flex items-center gap-3 pt-8 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notTakenEnglish}
                        onChange={(e) => setNotTakenEnglish(e.target.checked)}
                        className="w-4 h-4 border-2 border-outline-variant rounded accent-primary"
                      />
                      <span className="text-sm text-on-surface-variant">
                        I haven&apos;t taken this test yet
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <hr className="border-surface-container" />

              {/* Aptitude Tests — Bachelor's: SAT only */}
              {degreeType === "bachelors" && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-1">
                    Cognitive Assessment
                  </p>
                  <h2 className="text-2xl font-bold font-headline text-on-surface mb-8">
                    Aptitude Test Scores
                  </h2>
                  <div className="max-w-xs">
                    <div className="bg-surface-container-low p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="material-symbols-outlined text-primary text-2xl">school</span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">Undergraduate</span>
                      </div>
                      <p className="font-bold text-on-surface mb-4">SAT Score</p>
                      <LightField
                        label=""
                        value={form.sat}
                        onChange={(v) => update("sat", v)}
                        placeholder="Total (400–1600)"
                        type="number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Aptitude Tests — Master's: GRE + GMAT only */}
              {degreeType === "masters" && <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-1">
                  Cognitive Assessment
                </p>
                <h2 className="text-2xl font-bold font-headline text-on-surface mb-8">
                  Aptitude Test Scores
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GRE */}
                  <div className="bg-surface-container-low p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        assessment
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
                        Graduate Record
                      </span>
                    </div>
                    <p className="font-bold text-on-surface mb-4">GRE Score</p>
                    <div className="space-y-4">
                      <LightField
                        label=""
                        value={form.greVerbal}
                        onChange={(v) => update("greVerbal", v)}
                        placeholder="Verbal Reasoning"
                        type="number"
                      />
                      <LightField
                        label=""
                        value={form.greQuant}
                        onChange={(v) => update("greQuant", v)}
                        placeholder="Quantitative Reasoning"
                        type="number"
                      />
                    </div>
                  </div>

                  {/* GMAT */}
                  <div className="bg-surface-container-low p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        business_center
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
                        Business
                      </span>
                    </div>
                    <p className="font-bold text-on-surface mb-4">GMAT Score</p>
                    <LightField
                      label=""
                      value={form.gmat}
                      onChange={(v) => update("gmat", v)}
                      placeholder="Total Score"
                      type="number"
                    />
                    <label className="flex items-center gap-3 mt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planningGmat}
                        onChange={(e) => setPlanningGmat(e.target.checked)}
                        className="w-4 h-4 border-2 border-outline-variant rounded accent-primary"
                      />
                      <span className="text-sm text-on-surface-variant">
                        Planning to take later
                      </span>
                    </label>
                  </div>
                </div>
              </div>}

              <hr className="border-surface-container" />

              {/* Planned Tests */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-1">
                  Upcoming Tests
                </p>
                <h2 className="text-lg font-bold font-headline text-on-surface mb-4">
                  Planning to take any tests?
                </h2>
                <div className="flex flex-wrap gap-3">
                  {(degreeType === "bachelors"
                    ? ["IELTS", "TOEFL", "PTE", "Duolingo", "SAT"]
                    : ["IELTS", "TOEFL", "PTE", "Duolingo", "GRE", "GMAT"]
                  ).map((test) => (
                    <button
                      key={test}
                      type="button"
                      onClick={() => togglePlannedTest(test)}
                      className={cn(
                        "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                        selectedPlannedTests.includes(test)
                          ? "border-primary text-primary bg-primary-fixed"
                          : "border-surface-container-high text-on-surface-variant hover:border-outline"
                      )}
                    >
                      {test}
                    </button>
                  ))}
                </div>
              </div>

              <StepNavButtons step={step} prev={prev} nextLabel="Continue to Step 4" />

              <p className="text-xs text-on-surface-variant text-center">
                Your data is securely processed via TLS 1.3 encryption.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ─── Step 4: Work Experience & Internships ─── */}
      {step === 4 && (
        <div className="min-h-screen bg-white flex flex-col">
          <OnbTopNav step={step} progress={progress} />
          <div className="flex-1 flex overflow-hidden">
            <StepHeroPanel current={current} />

            <div className="flex-1 overflow-y-auto px-8 md:px-16 py-10">
              <form
                className="max-w-2xl space-y-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                {/* Professional History */}
                <div>
                  <SectionBadge>{degreeType === "bachelors" ? "Internship History" : "Professional History"}</SectionBadge>
                  <div className="space-y-8">
                    {degreeType === "masters" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <LightField
                            label="Total Work Experience (months)"
                            value={form.workExpMonths}
                            onChange={(v) => update("workExpMonths", v)}
                            placeholder="e.g. 24"
                            type="number"
                          />
                          <LightField
                            label="Number of Internships"
                            value={form.internships}
                            onChange={(v) => update("internships", v)}
                            placeholder="e.g. 3"
                            type="number"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <LightField
                            label="Current / Most Recent Company"
                            value={form.currentCompany}
                            onChange={(v) => update("currentCompany", v)}
                            placeholder="e.g. Google, TCS, startup name"
                          />
                          <LightField
                            label="Current / Most Recent Job Title"
                            value={form.currentJobTitle}
                            onChange={(v) => update("currentJobTitle", v)}
                            placeholder="e.g. Software Engineer, Analyst"
                          />
                        </div>
                      </>
                    )}
                    {degreeType === "bachelors" && (
                      <LightField
                        label="Number of Internships"
                        value={form.internships}
                        onChange={(v) => update("internships", v)}
                        placeholder="e.g. 2"
                        type="number"
                      />
                    )}
                  </div>
                </div>

                {/* Impact & Achievements */}
                <div>
                  <SectionBadge>{degreeType === "bachelors" ? "Internships & Leadership" : "Impact & Achievements"}</SectionBadge>
                  <p className="text-xs text-on-surface-variant mb-6 -mt-2">
                    {degreeType === "bachelors"
                      ? "Internships, school projects, and leadership roles show universities your potential beyond marks."
                      : "Top universities care about impact, not just job titles. What did you create, improve, or lead?"}
                  </p>
                  <div className="space-y-8">
                    {degreeType === "masters" && (
                      <LightTextArea
                        label="Key Achievements & Impact"
                        value={form.keyAchievements}
                        onChange={(v) => update("keyAchievements", v)}
                        placeholder="e.g. Led a team of 5 to launch a product used by 10K users; Reduced processing time by 40% through automation..."
                        rows={4}
                      />
                    )}
                    <LightTextArea
                      label="Leadership Roles"
                      value={form.leadershipRoles}
                      onChange={(v) => update("leadershipRoles", v)}
                      placeholder={degreeType === "bachelors"
                        ? "e.g. School Head Boy/Girl, Club President, Sports Captain, Event Organizer..."
                        : "e.g. Team Lead, Project Manager, Club President, Teaching Assistant..."}
                      rows={3}
                    />
                    <LightTextArea
                      label="Internship Details"
                      value={form.internshipDetails}
                      onChange={(v) => update("internshipDetails", v)}
                      placeholder={degreeType === "bachelors"
                        ? "e.g. Summer intern at a local firm (2 months) — assisted with marketing; school project on renewable energy..."
                        : "e.g. Summer intern at Microsoft (3 months) — Built internal dashboard; Research intern at IISc..."}
                      rows={3}
                    />
                  </div>
                </div>

                <StepNavButtons step={step} prev={prev} nextLabel="Continue to Step 5" />
              </form>
            </div>

            <StepSidebar step={step} progress={progress}>
              <div className="p-4 border-l-2 border-primary bg-primary-fixed/20 rounded-r-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-1">
                  Expert Tip
                </p>
                <p className="text-xs text-on-surface-variant italic leading-relaxed">
                  &ldquo;Focus on quantifiable achievements: numbers, percentages,
                  and outcomes speak louder than responsibilities.&rdquo;
                </p>
              </div>
            </StepSidebar>
          </div>
        </div>
      )}

      {/* ─── Step 5: Extracurriculars & Achievements ─── */}
      {step === 5 && (
        <div className="flex min-h-screen">
          <BlueSidePanel current={current} progress={progress} />

          <div className="flex-1 overflow-y-auto bg-white px-8 md:px-16 py-12">
            <form
              className="max-w-2xl mx-auto space-y-10"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <div>
                <SectionBadge>Clubs & Societies</SectionBadge>
                <LightTextArea
                  label="Clubs, Societies & Organizations"
                  value={form.clubs}
                  onChange={(v) => update("clubs", v)}
                  placeholder="e.g. Debate Society (Vice President), IEEE Student Chapter, Rotaract Club..."
                  rows={3}
                />
              </div>

              <div>
                <SectionBadge>Competitions & Awards</SectionBadge>
                <LightTextArea
                  label="Competitions (national / international)"
                  value={form.competitions}
                  onChange={(v) => update("competitions", v)}
                  placeholder="e.g. Smart India Hackathon finalist, Math Olympiad state rank 12, Google Code Jam..."
                  rows={3}
                />
              </div>

              <div>
                <SectionBadge>Social Impact</SectionBadge>
                <LightTextArea
                  label="Volunteering & Social Work"
                  value={form.volunteering}
                  onChange={(v) => update("volunteering", v)}
                  placeholder="e.g. Taught underprivileged children for 2 years, organized blood donation drives, NGO work..."
                  rows={3}
                />
              </div>

              <div>
                <SectionBadge>Personal Interests</SectionBadge>
                <LightTextArea
                  label="Sports, Arts & Hobbies"
                  value={form.sportsArtsHobbies}
                  onChange={(v) => update("sportsArtsHobbies", v)}
                  placeholder="e.g. State-level cricket player, classical guitar, photography, marathon runner..."
                  rows={3}
                />
              </div>

              <div>
                <SectionBadge>Intellectual Capital</SectionBadge>
                <LightTextArea
                  label="Research Publications / Papers"
                  value={form.publications}
                  onChange={(v) => update("publications", v)}
                  placeholder="e.g. Published in IEEE on 'ML in Healthcare' (2025); Co-authored paper on NLP..."
                  rows={3}
                />
              </div>

              {/* Certifications */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                  Global Certifications
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    "CFA Level 1",
                    "CFA Level 2",
                    "PMP",
                    "AWS Certified",
                    "Google Cloud Certified",
                    "Azure Certified",
                    "DELE C1",
                    "Six Sigma",
                    "CPA",
                    "ACCA",
                    "FRM",
                    "Cisco CCNA",
                  ].map((cert) => (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => toggleCert(cert)}
                      className={cn(
                        "px-5 py-2.5 rounded-full border-2 text-sm font-semibold transition-all",
                        selectedCerts.includes(cert)
                          ? "border-primary text-white bg-primary"
                          : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                      )}
                    >
                      {cert}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-full border-2 border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary text-sm font-semibold transition-all"
                  >
                    + Add Other
                  </button>
                </div>
              </div>

              <div>
                <LightField
                  label="Other Extracurricular Activities"
                  value={form.extracurriculars}
                  onChange={(v) => update("extracurriculars", v)}
                  placeholder="Anything else? (comma-separated)"
                />
              </div>

              <StepNavButtons step={step} prev={prev} nextLabel="Continue to Step 6" />
            </form>
          </div>
        </div>
      )}

      {/* ─── Step 6: Story & Positioning ─── */}
      {step === 6 && (
        <div className="min-h-screen bg-white flex flex-col">
          <OnbTopNav step={step} progress={progress} />
          <div className="flex-1 flex overflow-hidden">
            <StepHeroPanel current={current} />

            <div className="flex-1 overflow-y-auto px-8 md:px-16 py-10">
              <form
                className="max-w-2xl space-y-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                <div className="bg-primary-fixed/20 border border-primary/10 rounded-2xl p-6">
                  <p className="text-sm text-on-surface font-semibold mb-2">
                    Why does this matter?
                  </p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    The most competitive applications tell a compelling story.
                    Your answers here will be used to craft your SOP, personal
                    statement, and interview narratives. Be honest and
                    reflective.
                  </p>
                </div>

                <div>
                  <SectionBadge>Motivation</SectionBadge>
                  <div className="space-y-8">
                    <LightTextArea
                      label="Why this field of study?"
                      value={form.whyThisField}
                      onChange={(v) => update("whyThisField", v)}
                      placeholder="What sparked your interest? What experiences led you to this field? What do you hope to contribute?"
                      rows={4}
                    />
                    <LightTextArea
                      label="Why study abroad / Why this country?"
                      value={form.whyThisCountry}
                      onChange={(v) => update("whyThisCountry", v)}
                      placeholder="What draws you to studying overseas? Any specific countries and why?"
                      rows={4}
                    />
                    <LightTextArea
                      label="Why now? What's driving the timing?"
                      value={form.whyNow}
                      onChange={(v) => update("whyNow", v)}
                      placeholder="What makes this the right time for your education? Career transition, gap in skills, next step..."
                      rows={3}
                    />
                  </div>
                </div>

                <div>
                  <SectionBadge>Career Vision</SectionBadge>
                  <div className="space-y-8">
                    <LightTextArea
                      label="Short-term Goals (3-5 years)"
                      value={form.shortTermGoals}
                      onChange={(v) => update("shortTermGoals", v)}
                      placeholder="What role, industry, or impact do you envision immediately after your degree?"
                      rows={3}
                    />
                    <LightTextArea
                      label="Long-term Goals (10+ years)"
                      value={form.longTermGoals}
                      onChange={(v) => update("longTermGoals", v)}
                      placeholder="What's your ultimate career vision? Entrepreneurship, research, industry leadership, social impact..."
                      rows={3}
                    />
                    <LightTextArea
                      label="Career Goals Summary"
                      value={form.careerGoals}
                      onChange={(v) => update("careerGoals", v)}
                      placeholder="Summarize your overall career aspirations..."
                      rows={3}
                    />
                  </div>
                </div>

                <div>
                  <SectionBadge>Your Unique Story</SectionBadge>
                  <LightTextArea
                    label="Personal story, challenges, or unique perspective"
                    value={form.uniqueStory}
                    onChange={(v) => update("uniqueStory", v)}
                    placeholder="Share any life experiences, obstacles overcome, or unique perspectives that shaped who you are. This becomes your 'secret weapon' in applications."
                    rows={5}
                  />
                </div>

                <StepNavButtons step={step} prev={prev} nextLabel="Continue to Step 7" />
              </form>
            </div>

            <StepSidebar step={step} progress={progress}>
              <div className="p-4 border-l-2 border-primary bg-primary-fixed/20 rounded-r-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-1">
                  Expert Tip
                </p>
                <p className="text-xs text-on-surface-variant italic leading-relaxed">
                  &ldquo;All your documents — SOP, LOR, resume, essays — must
                  align into one strong narrative. What you write here becomes
                  the foundation.&rdquo;
                </p>
              </div>
            </StepSidebar>
          </div>
        </div>
      )}

      {/* ─── Step 7: Financial Information ─── */}
      {step === 7 && (
        <div className="flex min-h-screen">
          <BlueSidePanel current={current} progress={progress} />

          <div className="flex-1 overflow-y-auto bg-white px-8 md:px-16 py-12">
            <form
              className="max-w-2xl mx-auto space-y-10"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <div className="bg-surface-container-low border border-surface-container rounded-2xl p-6">
                <p className="text-sm text-on-surface font-semibold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">
                    lock
                  </span>
                  Why we ask this
                </p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Financial information helps us shortlist affordable
                  universities, identify scholarship opportunities, and prepare
                  stronger visa applications. This data is encrypted and never
                  shared without your consent.
                </p>
              </div>

              <div>
                <SectionBadge>Family Financial Profile</SectionBadge>
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                      Family Annual Income
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { val: "under_5L", label: "Under 5 Lakhs" },
                        { val: "5_10L", label: "5 - 10 Lakhs" },
                        { val: "10_20L", label: "10 - 20 Lakhs" },
                        { val: "20_40L", label: "20 - 40 Lakhs" },
                        { val: "40_80L", label: "40 - 80 Lakhs" },
                        { val: "above_80L", label: "Above 80 Lakhs" },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() =>
                            update("familyIncomeRange", opt.val)
                          }
                          className={cn(
                            "py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                            form.familyIncomeRange === opt.val
                              ? "border-primary text-primary bg-primary-fixed"
                              : "border-surface-container-high text-on-surface-variant hover:border-outline"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                      Who will sponsor your education?
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { val: "self", label: "Self-funded" },
                        { val: "family", label: "Family" },
                        { val: "employer", label: "Employer" },
                        { val: "scholarship", label: "Scholarship only" },
                        { val: "loan", label: "Education Loan" },
                        { val: "mixed", label: "Mix of Sources" },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => update("sponsorType", opt.val)}
                          className={cn(
                            "px-5 py-2.5 rounded-lg border text-sm font-medium transition-all",
                            form.sponsorType === opt.val
                              ? "border-primary text-primary bg-primary-fixed"
                              : "border-surface-container-high text-on-surface-variant hover:border-outline"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(form.sponsorType === "family" ||
                    form.sponsorType === "employer") && (
                    <LightField
                      label="Sponsor Details"
                      value={form.sponsorDetails}
                      onChange={(v) => update("sponsorDetails", v)}
                      placeholder="Name and relationship of sponsor"
                    />
                  )}
                </div>
              </div>

              <div>
                <SectionBadge>Savings & Loan</SectionBadge>
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                      Available Savings / Assets
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { val: "under_5L", label: "Under 5 Lakhs" },
                        { val: "5_15L", label: "5 - 15 Lakhs" },
                        { val: "15_30L", label: "15 - 30 Lakhs" },
                        { val: "30_60L", label: "30 - 60 Lakhs" },
                        { val: "above_60L", label: "Above 60 Lakhs" },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => update("savingsRange", opt.val)}
                          className={cn(
                            "py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                            form.savingsRange === opt.val
                              ? "border-primary text-primary bg-primary-fixed"
                              : "border-surface-container-high text-on-surface-variant hover:border-outline"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.loanPlanned as boolean}
                        onChange={(e) =>
                          update("loanPlanned", e.target.checked)
                        }
                        className="w-4 h-4 border-2 border-outline-variant rounded accent-primary"
                      />
                      <span className="text-sm text-on-surface font-medium">
                        Planning to take an education loan
                      </span>
                    </label>
                  </div>

                  {form.loanPlanned && (
                    <LightField
                      label="Loan Details"
                      value={form.loanDetails}
                      onChange={(v) => update("loanDetails", v)}
                      placeholder="e.g. SBI Education Loan, up to 20 Lakhs"
                    />
                  )}

                  <LightField
                    label="Budget for Annual Tuition"
                    value={form.budgetForTuition}
                    onChange={(v) => update("budgetForTuition", v)}
                    placeholder="e.g. 15 Lakhs per year / $20,000 per year"
                  />
                </div>
              </div>

              <div>
                <SectionBadge>Scholarship Preference</SectionBadge>
                <div className="flex flex-wrap gap-3">
                  {[
                    { val: "need_based", label: "Need-based" },
                    { val: "merit_based", label: "Merit-based" },
                    { val: "both", label: "Both" },
                    { val: "not_required", label: "Not required" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => update("scholarshipPref", opt.val)}
                      className={cn(
                        "px-5 py-2.5 rounded-lg border text-sm font-medium transition-all",
                        form.scholarshipPref === opt.val
                          ? "border-primary text-primary bg-primary-fixed"
                          : "border-surface-container-high text-on-surface-variant hover:border-outline"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <StepNavButtons step={step} prev={prev} nextLabel="Continue to Step 8" />
            </form>
          </div>
        </div>
      )}

      {/* ─── Step 8: Visa, Preferences & Final Submit ─── */}
      {step === 8 && (
        <div className="min-h-screen bg-white flex flex-col">
          <OnbTopNav step={step} progress={progress} />
          <div className="flex-1 flex overflow-hidden">
            <div className="hidden lg:flex w-[400px] shrink-0 flex-col justify-between px-10 py-12 bg-surface-container-lowest">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-4">
                  Final Submission
                </p>
                <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight font-headline text-on-surface">
                  Almost
                  <br />
                  There.
                </h1>
                <p className="text-on-surface-variant text-base leading-relaxed mt-6 max-w-sm">
                  {current.description}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-10">
                  <div className="bg-surface-container-low rounded-2xl p-5">
                    <span className="material-symbols-outlined text-primary text-2xl mb-2 block">
                      flight_takeoff
                    </span>
                    <p className="text-2xl font-bold text-on-surface">
                      {form.targetCountries.length}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant mt-1">
                      Target Countries
                    </p>
                  </div>
                  <div className="bg-surface-container-low rounded-2xl p-5">
                    <span
                      className="material-symbols-outlined text-[#8d3800] text-2xl mb-2 block"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      workspace_premium
                    </span>
                    <p className="text-2xl font-bold text-on-surface">
                      {Math.round(progress)}%
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant mt-1">
                      Profile Complete
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 md:px-16 py-10">
              <form
                className="max-w-2xl space-y-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                {/* Visa & Travel */}
                <div>
                  <SectionBadge>Visa & Travel History</SectionBadge>
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <LightField
                        label="Passport Number"
                        value={form.passportNumber}
                        onChange={(v) => update("passportNumber", v)}
                        placeholder="e.g. A1234567 (optional)"
                      />
                      <LightField
                        label="Passport Expiry Date"
                        value={form.passportExpiry}
                        onChange={(v) => update("passportExpiry", v)}
                        type="date"
                      />
                    </div>
                    <LightField
                      label="Countries Visited"
                      value={form.countriesVisited}
                      onChange={(v) => update("countriesVisited", v)}
                      placeholder="e.g. USA, UK, Singapore (comma-separated)"
                    />
                    <div className="flex items-start gap-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.visaRejections as boolean}
                          onChange={(e) =>
                            update("visaRejections", e.target.checked)
                          }
                          className="w-4 h-4 border-2 border-outline-variant rounded accent-primary"
                        />
                        <span className="text-sm text-on-surface font-medium">
                          I have previous visa rejections
                        </span>
                      </label>
                    </div>
                    {form.visaRejections && (
                      <LightTextArea
                        label="Visa Rejection Details"
                        value={form.visaRejectionDetails}
                        onChange={(v) => update("visaRejectionDetails", v)}
                        placeholder="Which country? When? Reason given (if known)?"
                        rows={3}
                      />
                    )}
                  </div>
                </div>

                {/* Target Preferences */}
                <div>
                  <SectionBadge>Target Preferences</SectionBadge>
                  <div className="space-y-8">
                    {/* Field of Study */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                        Academic Field
                      </label>
                      <select
                        value={form.targetField}
                        onChange={(e) => update("targetField", e.target.value)}
                        className="w-full bg-transparent border-b-2 border-surface-container-high py-3 text-on-surface text-base focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <option value="">Select your field of study</option>
                        {fields.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Countries */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                        Target Countries
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {countries.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => toggleCountry(c)}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              form.targetCountries.includes(c)
                                ? "border-primary text-primary bg-primary-fixed"
                                : "border-surface-container-high text-on-surface-variant hover:border-outline"
                            )}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Degree Level */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                        Degree Level
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { val: "bachelors", label: "Bachelor's" },
                          { val: "masters", label: "Master's" },
                          { val: "mba", label: "MBA" },
                          { val: "phd", label: "PhD" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => update("degreeLevel", opt.val)}
                            className={cn(
                              "py-3 rounded-xl border text-sm font-semibold transition-all",
                              form.degreeLevel === opt.val
                                ? "border-primary text-primary bg-primary-fixed"
                                : "border-surface-container-high text-on-surface-variant hover:border-outline"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget Range */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                        Annual Budget Range
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { val: "under_5L", label: "Under 5L" },
                          { val: "five_10L", label: "5 - 10L" },
                          { val: "ten_20L", label: "10 - 20L" },
                          { val: "twenty_40L", label: "20 - 40L" },
                          { val: "above_40L", label: "Above 40L" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => update("budgetRange", opt.val)}
                            className={cn(
                              "py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                              form.budgetRange === opt.val
                                ? "border-primary text-primary bg-primary-fixed"
                                : "border-surface-container-high text-on-surface-variant hover:border-outline"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Intake */}
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-4">
                        Target Intake
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          {
                            val: "Fall 2026",
                            label: "Fall 2026",
                            sub: "Aug/Sep",
                          },
                          {
                            val: "Spring 2027",
                            label: "Spring 2027",
                            sub: "Jan/Feb",
                          },
                          {
                            val: "Fall 2027",
                            label: "Fall 2027",
                            sub: "Aug/Sep",
                          },
                          {
                            val: "Spring 2028",
                            label: "Spring 2028",
                            sub: "Jan/Feb",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => update("targetIntake", opt.val)}
                            className={cn(
                              "py-4 rounded-xl border text-center transition-all",
                              form.targetIntake === opt.val
                                ? "border-primary bg-primary-fixed"
                                : "border-surface-container-high hover:border-outline"
                            )}
                          >
                            <p className="font-bold text-on-surface text-sm">
                              {opt.label}
                            </p>
                            <p className="text-[10px] text-on-surface-variant">
                              {opt.sub}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preferred Universities */}
                    <LightTextArea
                      label="Preferred Universities (if any)"
                      value={form.preferredUniversities}
                      onChange={(v) => update("preferredUniversities", v)}
                      placeholder="e.g. MIT, Stanford, TU Munich, University of Toronto (comma-separated)"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col md:flex-row items-center gap-6 pt-8">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full md:w-auto px-10 py-5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl font-headline font-bold text-lg tracking-tight hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">
                          progress_activity
                        </span>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze My Profile
                        <span
                          className="material-symbols-outlined text-lg"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          analytics
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={prev}
                    className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-all group"
                  >
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">
                      chevron_left
                    </span>
                    Back to Financials
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-error-container border border-error/20 rounded-xl text-sm text-on-error-container font-medium">
                    {error}
                  </div>
                )}
              </form>
            </div>

            <StepSidebar step={step} progress={progress}>
              <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                <div className="h-32 bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-outline-variant/30">
                    workspace_premium
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Elite universities increasingly prioritize{" "}
                    <strong className="text-primary">Narrative Cohesion</strong>{" "}
                    over isolated metrics. Your complete profile enables our AI
                    to craft a compelling application story.
                  </p>
                </div>
              </div>
            </StepSidebar>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared Components ────────────────────────────────── */

function OnbTopNav({ step, progress }: { step: number; progress: number }) {
  return (
    <header className="h-14 px-8 flex items-center justify-between border-b border-surface-container shrink-0 bg-white">
      <div className="flex items-center gap-6">
        <span className="text-lg font-bold tracking-tight font-headline text-on-surface">
          RIBRIZ
        </span>
        <span className="text-xs font-bold text-primary">
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>
      <div className="flex-1 max-w-sm mx-8">
        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors">
          Save Progress
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            person
          </span>
        </div>
      </div>
    </header>
  );
}

function StepHeroPanel({
  current,
}: {
  current: (typeof stepMeta)[number];
}) {
  return (
    <div className="hidden lg:flex w-[400px] shrink-0 flex-col justify-between px-10 py-12 bg-surface-container-lowest">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-4">
          {current.sectionLabel}
        </p>
        <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight font-headline text-on-surface whitespace-pre-line">
          {current.title}
        </h1>
        <p className="text-on-surface-variant text-base leading-relaxed mt-6 max-w-sm">
          {current.description}
        </p>

        <div className="mt-10 flex items-start gap-3">
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          <div>
            <p className="text-sm font-bold text-on-surface">
              Data Verification
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Information will be cross-referenced with uploaded transcripts
              later.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-48 bg-surface-container rounded-2xl overflow-hidden flex items-center justify-center">
        <span className="material-symbols-outlined text-6xl text-outline-variant/30">
          school
        </span>
      </div>
    </div>
  );
}

function BlueSidePanel({
  current,
  progress,
}: {
  current: (typeof stepMeta)[number];
  progress: number;
}) {
  return (
    <div className="hidden lg:flex w-[440px] shrink-0 bg-[#3438d8] text-white flex-col justify-between p-10 relative overflow-hidden">
      <div className="relative z-10 flex items-center gap-3">
        <span className="material-symbols-outlined text-white/60">school</span>
        <span className="text-lg font-bold tracking-tight font-headline">
          RIBRIZ
        </span>
      </div>

      <div className="relative z-10 space-y-6">
        <p className="text-xs uppercase tracking-[0.15em] text-white/60 font-semibold">
          {current.tag}
        </p>
        <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight font-headline whitespace-pre-line">
          {current.title}
        </h1>
        <p className="text-white/70 text-base leading-relaxed max-w-sm">
          {current.description}
        </p>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/50 font-bold">
            Progress Journey
          </span>
          <span className="text-2xl font-bold">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full border border-white/10" />
    </div>
  );
}

function StepSidebar({
  step,
  progress,
  children,
}: {
  step: number;
  progress: number;
  children: React.ReactNode;
}) {
  return (
    <div className="hidden xl:flex w-64 shrink-0 flex-col gap-6 p-6 border-l border-surface-container">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant mb-2">
          Step {step} of {TOTAL_STEPS}
        </p>
        <div className="h-1 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {children}
      <div className="mt-auto flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-sm">lock</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
          End-to-End Encrypted
        </span>
      </div>
    </div>
  );
}

function StepNavButtons({
  step,
  prev,
  nextLabel,
}: {
  step: number;
  prev: () => void;
  nextLabel: string;
}) {
  return (
    <div className="flex items-center justify-between pt-6">
      {step > 1 ? (
        <button
          type="button"
          onClick={prev}
          className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Previous Step
        </button>
      ) : (
        <div />
      )}
      <button
        type="submit"
        className="bg-primary text-on-primary px-8 py-3.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:brightness-110 transition-all"
      >
        {nextLabel}
        <span className="material-symbols-outlined text-lg">arrow_forward</span>
      </button>
    </div>
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-bold uppercase tracking-[0.12em] text-primary bg-primary-fixed px-3 py-1 rounded mb-6">
      {children}
    </span>
  );
}

function LightField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-3">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-transparent border-b-2 border-surface-container-high py-2.5 text-on-surface text-base placeholder:text-outline focus:border-primary focus:outline-none transition-colors"
      />
    </div>
  );
}

function LightTextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.12em] block mb-3">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-transparent border-b-2 border-surface-container-high py-2.5 text-on-surface text-base placeholder:text-outline focus:border-primary focus:outline-none transition-colors resize-none"
      />
    </div>
  );
}
