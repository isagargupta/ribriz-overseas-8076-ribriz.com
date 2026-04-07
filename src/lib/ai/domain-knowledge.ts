// ─── Riz AI Domain Knowledge Layer ──────────────────────
// This is the "brain" — hardcoded expert knowledge that
// makes Riz AI reason like a seasoned counselor, not a chatbot.

// ─── Country Intelligence ───────────────────────────────

export const COUNTRY_INTEL: Record<
  string,
  {
    visaPolicy: string;
    prPathway: string;
    workRights: string;
    admissionTrends: string;
    scholarshipStrategy: string;
    redFlags: string;
    gapYearStance: string;
    bestFor: string;
    costReality: string;
  }
> = {
  Canada: {
    visaPolicy:
      "Study permit + PGWP (Post-Graduation Work Permit). 1-year program = 1-year PGWP, 2-year program = 3-year PGWP. PGWP is open (any employer). Need biometrics + medical. Processing: 8-16 weeks.",
    prPathway:
      "One of the strongest PR pathways globally. Express Entry (CRS score) after 1 year Canadian work exp. Provincial Nominee Programs (PNPs) boost CRS by 600 pts. Atlantic Immigration Program for Maritime provinces. Most Indian students get PR within 2-3 years of graduation.",
    workRights:
      "20 hrs/week during study (recently changed from unlimited back to 20). Full-time during breaks. PGWP: full-time any employer. Spouse gets open work permit.",
    admissionTrends:
      "Tightening for Indian students since 2024. IRCC reduced study permits. Universities now prioritize: higher IELTS (6.5+ overall, no band below 6.0), genuine student intent, financial proof >CAD $20k/year. SDS (Student Direct Stream) discontinued — all applications now standard. Competitive for CS/AI programs. Ontario most competitive, consider Saskatchewan, Manitoba, Atlantic provinces for easier admission.",
    scholarshipStrategy:
      "University-specific merit awards (auto-considered with application). Mitacs Globalink (for research). Vanier CGS for PhD. SSHRC/NSERC for grad research. Most masters programs have TA/RA positions. Apply early — scholarship pools deplete.",
    redFlags:
      "Low IELTS (<6.0 any band) = near-automatic rejection. Insufficient funds proof. Weak study plan. Previous visa refusals (must declare). Too many institutions on same application.",
    gapYearStance:
      "1-2 years acceptable with explanation (work/volunteer). 3+ years raises questions about study intent. Must justify productively — don't leave gaps unexplained in SOP.",
    bestFor:
      "Students wanting PR pathway, strong work rights, English-speaking environment, affordable compared to US/UK. Especially CS, data science, business, engineering, healthcare.",
    costReality:
      "Tuition: CAD 15k-50k/year (public universities cheaper). Living: CAD 12k-20k/year. Toronto/Vancouver most expensive. Halifax, Winnipeg, Saskatoon significantly cheaper. Budget ₹20-40L/year total.",
  },
  "United States": {
    visaPolicy:
      "F1 student visa. Need I-20 from university + SEVIS fee + visa interview at US embassy. OPT: 12 months post-graduation work. STEM OPT extension: additional 24 months (total 36 months). H1B lottery after OPT (30% selection rate).",
    prPathway:
      "Weakest PR pathway among top destinations. OPT → H1B (lottery, ~30% chance) → Green Card (employer-sponsored, 5-15 year wait for Indian nationals due to country cap). EB-1 (extraordinary ability) faster but rare. No direct study-to-PR path.",
    workRights:
      "20 hrs/week on-campus only during study. CPT for internships (needs academic credit). OPT: 12 months any employer. STEM OPT: 36 months total. H1B: employer-tied.",
    admissionTrends:
      "GRE becoming optional at many programs but still valued. GPA inflation means 3.5+ expected for top-50 schools. Research experience increasingly important for MS. Strong SOP + LORs critical. Fall intake dominant (Spring available but fewer options). Early application (by Dec-Jan) for best chances and funding. CS/AI extremely competitive — 5-10% admit rates at top schools.",
    scholarshipStrategy:
      "TA/RA positions are primary funding for MS/PhD. Merit scholarships rare for international masters. PhD typically fully funded. Apply to 8-12 schools (mix of reach/target/safety). Contact professors directly for research positions. External: Fulbright, AAUW, specific university fellowships.",
    redFlags:
      "Weak ties to home country (visa officer concern). Insufficient funding proof. Inconsistent profile story. Too many same-ranked applications. Low GRE quant for STEM (<160).",
    gapYearStance:
      "1-2 years with work/research acceptable. Must explain productively in SOP. Visa officers may question long gaps. F1 visa interview will probe intent to return.",
    bestFor:
      "STEM students wanting research opportunities, brand-name universities, strong job market (FAANG, startups). High risk-high reward immigration. Best for PhD track.",
    costReality:
      "Tuition: $25k-70k/year (public/private). Living: $12k-25k/year. NYC/SF/Boston most expensive. Midwest/South affordable. Budget ₹30-60L/year total. Financial proof critical for visa.",
  },
  Germany: {
    visaPolicy:
      "Student visa (Aufenthaltsgenehmigung). Need blocked account (€11,904/year). 18-month job-seeker visa after graduation. Blue Card with €45,300 salary (€39,682 for shortage occupations).",
    prPathway:
      "Strong PR pathway. Permanent residence after 2 years on Blue Card (with B1 German) or 33 months (with A1). Opportunity Card (Chancenkarte) since 2024 for non-EU. Settlement permit after 5 years continuous residence.",
    workRights:
      "240 half-days or 120 full-days per year during study. 18-month post-graduation job search visa. Blue Card: employer-tied initially, portable after 2 years.",
    admissionTrends:
      "Public universities tuition-free (only semester fees €150-350). Competitive for TU9 universities. APS certificate required for Indian students. Uni-assist application processing. German-taught programs need TestDaF/DSH. English-taught masters growing but competitive. ECTS conversion of Indian grades critical — 70%+ in Indian system generally competitive.",
    scholarshipStrategy:
      "DAAD (German Academic Exchange Service): most prestigious, €850-1200/month. Deutschlandstipendium: €300/month university-specific. SBW Berlin: full scholarship including living. Konrad-Adenauer, Friedrich-Ebert (political foundations). DAAD deadline usually Oct-Nov for next year. Strong research proposal critical.",
    redFlags:
      "APS certificate delays (apply 6+ months early). Blocked account proof. Health insurance mandatory. German language ability for daily life even in English programs. Proof of accommodation for visa.",
    gapYearStance:
      "Very lenient. Gap years common in German culture. Work experience valued. No stigma for 2-3 year gaps if productively spent.",
    bestFor:
      "Budget-conscious students (tuition-free!), engineering/STEM, students open to learning German, those wanting strong PR pathway without massive debt. Best value-for-money destination.",
    costReality:
      "Tuition: €0 at public universities (semester fee €150-350). Private: €5k-20k/year. Living: €800-1200/month. Munich/Frankfurt expensive, Leipzig/Dresden affordable. Budget ₹8-15L/year total. Best ROI destination.",
  },
  "United Kingdom": {
    visaPolicy:
      "Student visa (Tier 4). CAS from university + financial proof (£1,334/month London, £1,023 outside). Graduate Route: 2-year post-study work visa (3 years for PhD). Skilled Worker visa after if salary ≥£38,700.",
    prPathway:
      "Moderate. Graduate Route (2 years) → Skilled Worker visa (if employer sponsors, salary threshold) → ILR (Indefinite Leave to Remain) after 5 years. Points-based system. Not as straightforward as Canada but improving.",
    workRights:
      "20 hrs/week during term. Full-time during holidays. Graduate Route: full-time any job for 2 years. Skilled Worker: employer-specific.",
    admissionTrends:
      "1-year masters dominant (faster, cheaper). Russell Group universities competitive. Portfolio of grades important — UK uses first/2:1/2:2 classification. Indian 60%+ = 2:2, 65%+ = 2:1, 70%+ = First (varies by university). IELTS required (typically 6.5+ overall). January intake growing. Some universities accept 3-year bachelor's degree, others require 4-year.",
    scholarshipStrategy:
      "Chevening Scholarship (fully funded, competitive, needs 2 years work exp). Commonwealth Scholarships (developing countries). GREAT Scholarships (partial). University-specific: Nottingham, Warwick, Edinburgh have generous international awards. Apply as early as possible — rolling admissions means early applicants get more funding.",
    redFlags:
      "3-year Indian bachelor's not accepted everywhere (check individual university requirements). Health surcharge (IHS) expensive (£776/year). Proof of funds must be in account for 28+ days before application. English language test validity (usually 2 years).",
    gapYearStance:
      "Acceptable with 1-2 years work experience. UK values professional experience. Must explain gap in personal statement. Mature students welcome.",
    bestFor:
      "Students wanting quick degree (1-year masters), strong brand recognition, English-speaking, moderate PR pathway. Especially business, finance, law, arts, social sciences.",
    costReality:
      "Tuition: £12k-38k/year (Russell Group higher). Living: £1,000-1,500/month. London expensive. Budget ₹25-50L total for 1-year program. Shorter duration = lower total cost despite high annual fees.",
  },
  Australia: {
    visaPolicy:
      "Student visa (subclass 500). GTE (Genuine Temporary Entrant) requirement. Post-study work visa: 2-4 years depending on qualification level and regional study. 485 visa for temporary graduate.",
    prPathway:
      "Strong PR pathway via SkillSelect points system. Regional areas give bonus points (+5-15). Age, English level, work experience, qualification all contribute. State nomination programs. Processing times vary. Skilled Occupation List (SOL) defines eligible occupations.",
    workRights:
      "48 hrs/fortnight during study (recently changed from 40). Unlimited during breaks. Post-study: 485 visa full-time work rights.",
    admissionTrends:
      "Accepting of Indian qualifications. Group of Eight (Go8) universities competitive. Conditional offers common. February and July intakes. IELTS 6.5+ standard. Some programs accept PTE Academic. Work experience valued for MBA/professional programs. Regional universities offer cheaper tuition and immigration advantages.",
    scholarshipStrategy:
      "Australia Awards (government-funded, competitive). Destination Australia (regional study). University-specific merit scholarships (often automatic). Research Training Program (RTP) for PhD. Apply early for best scholarship packages.",
    redFlags:
      "GTE statement critical — weak GTE = visa refusal. Financial capacity proof. Health insurance (OSHC) mandatory. Genuine student intent questioned if studying below previous qualification level.",
    gapYearStance: "Lenient. Work experience valued. Gap years don't negatively impact applications if explained productively.",
    bestFor:
      "Students wanting work-life balance, strong PR pathway, good climate, high quality of life. Especially nursing, engineering, IT, accounting, hospitality.",
    costReality:
      "Tuition: AUD 20k-50k/year. Living: AUD 21k/year (government estimate). Melbourne/Sydney expensive. Budget ₹25-45L/year total. Regional study cheaper and gives immigration advantages.",
  },
  Ireland: {
    visaPolicy:
      "Study visa (Stamp 2). Third Level Graduate Programme: 1-year stay-back for Level 8 (honors degree), 2-year for Level 9 (masters). Critical Skills Employment Permit for skilled workers.",
    prPathway:
      "Moderate. Stay-back → Critical Skills Permit → Long-term residency after 5 years. EU Blue Card available. Less competitive than Canada/Australia but growing.",
    workRights: "20 hrs/week during term, 40 hrs/week during holidays. Full-time on Graduate Programme stamp.",
    admissionTrends:
      "Growing destination for Indian students. Trinity College Dublin, UCD competitive. Accepts Indian 3-year degrees for most programs. IELTS 6.5+ standard. Good CS/tech programs. Dublin tech hub (Google, Meta, Microsoft HQs).",
    scholarshipStrategy:
      "Government of Ireland Postgraduate Scholarship. Walsh Fellowships (agriculture/food). University-specific merit awards. Enterprise Ireland funding for research.",
    redFlags: "High cost of living in Dublin. Limited post-study options if not in tech/pharma sectors.",
    gapYearStance: "Acceptable. European norm. No stigma.",
    bestFor: "Tech/CS students wanting EU access, English-speaking environment, pharma/biotech sector.",
    costReality: "Tuition: €10k-25k/year. Living: €10k-15k/year. Dublin expensive but smaller cities affordable. Budget ₹20-35L/year.",
  },
  Netherlands: {
    visaPolicy:
      "MVV + residence permit. Orientation Year (zoekjaar): 1-year job search after graduation. Highly Skilled Migrant visa with €38,338 salary threshold (lower for <30 age).",
    prPathway: "Permanent residence after 5 years. EU Blue Card available. Dutch nationality after 5 years.",
    workRights: "16 hrs/week (employer needs TWV permit) or full-time internship. Orientation year: full-time any work.",
    admissionTrends:
      "Strong English-taught programs. TU Delft, Eindhoven, Amsterdam very competitive for STEM. Rolling admissions. IELTS 6.5+ standard. No GRE required for most. Strong in engineering, business, social sciences.",
    scholarshipStrategy:
      "Holland Scholarship (€5,000 one-time). Orange Tulip Scholarship. OKP (developing countries). University-specific excellence awards. Erasmus Mundus (EU-wide, fully funded).",
    redFlags: "Numerus fixus (limited enrollment) for some popular programs. Early application required for scholarships.",
    gapYearStance: "Very lenient. European gap year culture. No stigma.",
    bestFor: "Engineering, business, international students wanting EU work experience, cycling lifestyle, progressive culture.",
    costReality: "Tuition: €8k-20k/year. Living: €800-1200/month. Amsterdam expensive. Budget ₹15-30L/year.",
  },
};

// ─── Profile Archetype Intelligence ─────────────────────

export const PROFILE_ARCHETYPES = `
PROFILE ARCHETYPE ANALYSIS — Use this to reason about non-standard profiles:

1. THE ACADEMIC STAR (High GPA 3.8+, high test scores, limited work exp)
   → Strong for research MS/PhD at top universities
   → Weakness: may lack practical experience for industry-focused programs
   → Strategy: Emphasize research, publications, projects in SOP. Target research universities.
   → Safety schools are still top-50 (high scores give wide safety net)

2. THE PROFESSIONAL (Moderate GPA 3.0-3.5, 3+ years strong work exp)
   → Strong for MBA, professional masters (MIS, MPM, MEng)
   → Compensates GPA with career achievements, promotions, leadership
   → Strategy: SOP should lead with career narrative, not academics. Target programs that value experience.
   → Some top programs (MIT Sloan, INSEAD) value work exp over GPA

3. THE ENTREPRENEUR/FOUNDER (Any GPA, startup/business experience)
   → Conventional scoring undervalues this profile
   → Strong for MBA, innovation-focused programs, entrepreneurship tracks
   → Strategy: Frame startup as leadership + risk-taking. Quantify business impact (revenue, users, team size).
   → Target programs with entrepreneurship ecosystems (Stanford, Babson, INSEAD, Waterloo)

4. THE RESEARCHER (Any GPA, publications, conference presentations, lab experience)
   → Strong for PhD, research-focused MS
   → Publications dramatically boost chances beyond what GPA/GRE indicate
   → Strategy: Contact professors directly. Lead SOP with research narrative.
   → A student with 1 publication in a decent journal > 4.0 GPA with no research for PhD admissions

5. THE CAREER PIVOTER (Degree in field A, wants to study field B)
   → Common: Engineering → MBA, Science → Data Science, Arts → UX Design
   → Must show transferable skills and genuine motivation for new field
   → Strategy: Bridge courses, online certifications, side projects demonstrate commitment
   → Some programs designed for career changers (MiM, conversion masters)

6. THE GAP YEAR STUDENT (1-3 years between degree and application)
   → NOT a weakness if gap was productive (work, volunteer, family responsibility)
   → Strategy: Turn gap into strength narrative — "I gained X experience that makes me a stronger candidate"
   → Country sensitivity: Germany (fine), Canada (explain), US (explain in visa interview), UK (acceptable)

7. THE BACKLOG HOLDER (1+ backlogs/arrears in transcript)
   → Must check individual program tolerance (some accept 0, some accept 5+)
   → Strategy: Show upward grade trend after clearing backlogs. Address directly in SOP if significant.
   → Germany: usually strict on backlogs. Canada: program-dependent. US: holistic review.
   → 1-2 backlogs usually manageable. 5+ severely limits options.

8. THE BUDGET-CONSTRAINED STUDENT (Under ₹10L/year budget)
   → Germany (tuition-free), select programs in France, Finland, Norway are realistic
   → TA/RA positions in US/Canada can cover costs but aren't guaranteed at admission
   → Strategy: Apply for full scholarships early. Consider affordable countries first.
   → Loan availability: India banks lend ₹20-40L for top-ranked universities

9. THE HIGH-AMBITION LOW-PROFILE (Low GPA <3.0, but strong in other areas)
   → Must compensate with exceptional test scores, work exp, or unique achievements
   → Strategy: Target programs with holistic review. Avoid programs with strict GPA cutoffs.
   → Some programs have minimum GPA requirements that are non-negotiable — check first.
   → Consider pathway/bridge programs as stepping stones.
`;

// ─── Admission Strategy Knowledge ───────────────────────

export const ADMISSION_STRATEGY = `
ADMISSION STRATEGY RULES — Apply these when recommending universities:

SAFETY / TARGET / REACH BUCKETING:
- SAFETY (80%+ match score, acceptance rate >40%, student exceeds all minimums by margin)
  → Apply to 2-3 safety schools. These are your guaranteed admits.
- TARGET (60-80% match score, student meets all minimums, competitive but realistic)
  → Apply to 3-5 target schools. Strongest ROI category.
- REACH (40-60% match score, student near or slightly below some minimums)
  → Apply to 2-3 reach schools. Worth trying if profile has unique strengths.
- LONG SHOT (<40% match score, student below multiple minimums)
  → Only recommend if student specifically asks. Be honest about chances.

PORTFOLIO STRATEGY:
- Ideal application portfolio: 2 safety + 3-4 target + 2 reach = 7-8 applications
- Never let a student apply only to reach schools (common mistake)
- Never let a student apply to 15+ schools (diminishing returns, SOP quality drops)
- If budget-constrained: 1 safety + 2-3 target + 1 reach = 4-5 applications

APPLICATION TIMING:
- Most deadlines: Dec-Feb for Fall intake, Aug-Oct for Spring
- Apply EARLY within deadline window — many programs have rolling admissions
- Scholarship deadlines are often BEFORE application deadlines
- Allow 2-3 weeks for LOR writers to submit

SOP STRATEGY:
- Each SOP must be university-specific (mention faculty, labs, courses by name)
- Open with a hook (NOT "since childhood I've been passionate about...")
- Show problem → curiosity → action → skill → why this program → career goal
- Word limit: follow exactly. 800 words = 800 words, not 1200 truncated.
- Address weaknesses directly (low GPA → show upward trend, gap year → show growth)

LOR STRATEGY:
- Academic LOR from professor who knows your work (not just gave you an A)
- Professional LOR from direct supervisor (not HR or CEO who barely knows you)
- Give recommenders your SOP draft + resume + specific talking points
- Follow up 2 weeks before deadline

GRE/TEST STRATEGY:
- GRE optional ≠ GRE not valued. Strong GRE (325+) still helps, especially for scholarships.
- If GRE <310, consider not sending (if optional)
- IELTS: 7.0+ is competitive. 6.5 is minimum for most. Below 6.0 in any band = many doors close.
- Retake strategy: IELTS is easiest to improve quickly. GRE quant gains take longer. TOEFL iBT if IELTS not working.
`;

// ─── Salary & ROI Intelligence ──────────────────────────

export const SALARY_INTEL: Record<string, Record<string, { avgSalary: string; topSalary: string; currency: string }>> = {
  "United States": {
    "Computer Science": { avgSalary: "105,000", topSalary: "180,000", currency: "USD" },
    "Data Science / AI": { avgSalary: "120,000", topSalary: "200,000", currency: "USD" },
    "Business / MBA": { avgSalary: "95,000", topSalary: "170,000", currency: "USD" },
    "Electrical Engineering": { avgSalary: "90,000", topSalary: "140,000", currency: "USD" },
    "Mechanical Engineering": { avgSalary: "80,000", topSalary: "120,000", currency: "USD" },
    "Finance": { avgSalary: "85,000", topSalary: "150,000", currency: "USD" },
  },
  Canada: {
    "Computer Science": { avgSalary: "75,000", topSalary: "120,000", currency: "CAD" },
    "Data Science / AI": { avgSalary: "80,000", topSalary: "130,000", currency: "CAD" },
    "Business / MBA": { avgSalary: "70,000", topSalary: "110,000", currency: "CAD" },
    "Engineering": { avgSalary: "70,000", topSalary: "100,000", currency: "CAD" },
  },
  Germany: {
    "Computer Science": { avgSalary: "55,000", topSalary: "80,000", currency: "EUR" },
    "Engineering": { avgSalary: "50,000", topSalary: "75,000", currency: "EUR" },
    "Business / MBA": { avgSalary: "50,000", topSalary: "70,000", currency: "EUR" },
  },
  "United Kingdom": {
    "Computer Science": { avgSalary: "40,000", topSalary: "70,000", currency: "GBP" },
    "Business / MBA": { avgSalary: "45,000", topSalary: "80,000", currency: "GBP" },
    "Finance": { avgSalary: "50,000", topSalary: "90,000", currency: "GBP" },
  },
  Australia: {
    "Computer Science": { avgSalary: "80,000", topSalary: "120,000", currency: "AUD" },
    "Engineering": { avgSalary: "75,000", topSalary: "110,000", currency: "AUD" },
    "Business / MBA": { avgSalary: "70,000", topSalary: "100,000", currency: "AUD" },
  },
};

// ─── Common Mistakes to Warn About ──────────────────────

export const COMMON_MISTAKES = `
PROACTIVELY WARN STUDENTS about these common mistakes:

1. Applying only to top-ranked universities (no safety schools)
2. Generic SOPs reused across universities (admissions can tell)
3. Choosing a country only for PR without checking occupation demand lists
4. Not checking if their 3-year Indian degree is accepted (UK, some German unis reject)
5. Missing scholarship deadlines (often weeks before application deadline)
6. Not converting GPA correctly (Indian percentage ≠ US 4.0 scale directly)
7. Ignoring living costs (Toronto tuition affordable but living costs = NYC)
8. Submitting GRE scores to optional-GRE programs when score is below average
9. Choosing programs based on university ranking alone (program ranking matters more)
10. Not contacting professors before PhD applications
11. Weak financial documentation leading to visa rejection
12. Applying to too many universities (SOP quality degrades after 8)
13. Not having a Plan B country if visa gets rejected
`;

// ─── Build the domain context for system prompt ─────────

export function buildDomainContext(targetCountries: string[]): string {
  let context = "\n═══════════════════════════════════════════\nDOMAIN EXPERTISE — USE THIS KNOWLEDGE\n═══════════════════════════════════════════\n";

  // Add country-specific intelligence for target countries
  const relevantCountries = targetCountries.length > 0
    ? targetCountries
    : ["Canada", "United States", "Germany", "United Kingdom", "Australia"];

  for (const country of relevantCountries) {
    const intel = COUNTRY_INTEL[country];
    if (intel) {
      context += `\n--- ${country.toUpperCase()} ---
Visa: ${intel.visaPolicy}
PR Pathway: ${intel.prPathway}
Work Rights: ${intel.workRights}
Admission Trends: ${intel.admissionTrends}
Scholarship Strategy: ${intel.scholarshipStrategy}
Red Flags: ${intel.redFlags}
Gap Years: ${intel.gapYearStance}
Best For: ${intel.bestFor}
Cost Reality: ${intel.costReality}
`;
    }
  }

  context += `\n${PROFILE_ARCHETYPES}\n${ADMISSION_STRATEGY}\n${COMMON_MISTAKES}`;

  return context;
}
