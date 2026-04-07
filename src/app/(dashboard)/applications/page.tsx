import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const GPA_SCALE_LABELS: Record<string, string> = {
  scale_4: "4.0",
  scale_10: "10.0",
  scale_100: "100",
};

const BUDGET_LABELS: Record<string, string> = {
  under_5L: "Under 5 Lakh",
  five_10L: "5 - 10 Lakh",
  ten_20L: "10 - 20 Lakh",
  twenty_40L: "20 - 40 Lakh",
  above_40L: "Above 40 Lakh",
};

const DEGREE_LABELS: Record<string, string> = {
  masters: "Masters",
  mba: "MBA",
  bachelors: "Bachelors",
};

function computeCompletion(user: {
  phone: string | null;
  city: string | null;
  dob: Date | null;
  academicProfile: {
    ieltsScore: number | null;
    toeflScore: number | null;
    pteScore: number | null;
    greScore: number | null;
    gmatScore: number | null;
    workExperienceMonths: number;
  } | null;
  preferences: {
    careerGoals: string | null;
    extracurriculars: string[];
  } | null;
}): number {
  let filled = 0;
  const total = 10;
  if (user.phone) filled++;
  if (user.city) filled++;
  if (user.dob) filled++;
  if (user.academicProfile) filled++;
  if (
    user.academicProfile?.ieltsScore != null ||
    user.academicProfile?.toeflScore != null ||
    user.academicProfile?.pteScore != null
  )
    filled++;
  if (
    user.academicProfile?.greScore != null ||
    user.academicProfile?.gmatScore != null
  )
    filled++;
  if (user.academicProfile && user.academicProfile.workExperienceMonths > 0)
    filled++;
  if (user.preferences) filled++;
  if (user.preferences?.careerGoals) filled++;
  if (user.preferences?.extracurriculars && user.preferences.extracurriculars.length > 0)
    filled++;
  return Math.round((filled / total) * 100);
}

export default async function ApplicationsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      academicProfile: true,
      preferences: true,
      documents: true,
    },
  });

  if (!dbUser || !dbUser.onboardingComplete) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 rounded-xl bg-primary-fixed flex items-center justify-center mb-8">
          <span className="material-symbols-outlined text-primary text-4xl">person_add</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-4 font-headline">
          Complete Your Profile First
        </h2>
        <p className="text-on-surface-variant text-lg max-w-md mb-12 leading-relaxed font-body font-medium">
          Complete the onboarding process to view your academic dossier and application profile.
        </p>
        <Link
          href="/onboarding"
          className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-4 text-sm font-semibold rounded-md shadow-sm hover:opacity-90 transition-all flex items-center gap-3"
        >
          <span className="material-symbols-outlined">person_add</span>
          Start Onboarding
        </Link>
      </div>
    );
  }

  const ap = dbUser.academicProfile;
  const pref = dbUser.preferences;
  const completion = computeCompletion(dbUser);
  const uploadedDocs = dbUser.documents.filter((d) => d.status === "uploaded" || d.status === "verified");

  const nameParts = dbUser.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <div className="pb-20 md:pb-8 transition-colors duration-300">
      {/* Profile Intake Container */}
      <div className="max-w-5xl mx-auto py-12 px-6 lg:px-12">
        {/* Hero Header Section */}
        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-end mb-16 lg:mb-20">
          <div className="col-span-12 lg:col-span-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-3">
              Institutional Dossier
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold font-headline tracking-tighter leading-none text-on-surface">
              Universal Profile
              <br />
              Intake
            </h2>
            <p className="mt-6 text-lg lg:text-xl text-secondary max-w-2xl font-body leading-relaxed">
              Your academic blueprint. This ledger serves as the foundation for your global placement and scholarship evaluation.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-4 flex flex-col items-end">
            <div className="w-full bg-surface-container rounded-full h-1 mb-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary-container h-full transition-all duration-700"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-sm font-bold text-on-surface-variant font-headline">
              Completion: {completion}%
            </p>
            {completion < 100 && (
              <p className="text-[10px] uppercase tracking-widest text-outline mt-1">
                Pending: Additional Details
              </p>
            )}
          </div>
        </div>

        {/* Intake Sections */}
        <div className="space-y-24 lg:space-y-32">
          {/* Section 01: Personal Identity */}
          <section className="grid grid-cols-12 gap-8 lg:gap-12">
            <div className="col-span-12 lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <span className="text-[64px] font-extrabold text-outline-variant/30 font-headline leading-none">
                  01
                </span>
                <h3 className="text-2xl font-bold font-headline mt-2">Personal Identity</h3>
                <p className="text-sm text-secondary mt-4 leading-relaxed">
                  Legal identity markers as they appear on your passport and official documentation.
                </p>
                <div className="mt-8 flex items-center gap-2 text-primary">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Authenticated
                  </span>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8 space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <ProfileField label="Full Legal Forename" value={firstName} />
                <ProfileField label="Legal Surname" value={lastName || "—"} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <ProfileField label="Primary Contact Email" value={dbUser.email} />
                <ProfileField label="Phone" value={dbUser.phone || "—"} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <ProfileField label="City" value={dbUser.city || "—"} />
                <ProfileField
                  label="Date of Birth"
                  value={
                    dbUser.dob
                      ? new Date(dbUser.dob).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"
                  }
                />
              </div>
            </div>
          </section>

          {/* Section 02: Academic Foundation */}
          <section className="grid grid-cols-12 gap-8 lg:gap-12">
            <div className="col-span-12 lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <span className="text-[64px] font-extrabold text-outline-variant/30 font-headline leading-none">
                  02
                </span>
                <h3 className="text-2xl font-bold font-headline mt-2">Academic Foundation</h3>
                <p className="text-sm text-secondary mt-4 leading-relaxed">
                  Prior institutional history and verified GPA metrics from your academic journey.
                </p>
                {uploadedDocs.length > 0 && (
                  <div className="mt-8">
                    <Link
                      href="/documents"
                      className="text-xs font-bold uppercase text-primary tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
                    >
                      View Documents
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant/15 p-6 lg:p-8 rounded-xl shadow-sm">
              <div className="space-y-10">
                <ProfileField
                  label="Current / Most Recent Institution"
                  value={ap?.collegeName || "—"}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <ProfileField label="Degree" value={ap?.degreeName || "—"} />
                  <ProfileField
                    label="Graduation Year"
                    value={ap?.graduationYear?.toString() || "—"}
                  />
                  <div className="flex flex-col space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Cumulative GPA
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="py-3 font-body text-lg font-medium text-on-surface">
                        {ap?.gpa != null ? ap.gpa : "—"}
                      </span>
                      {ap?.gpaScale && (
                        <span className="text-outline text-sm">
                          / {GPA_SCALE_LABELS[ap.gpaScale] || ap.gpaScale}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {(ap?.tenthPercentage != null || ap?.twelfthPercentage != null) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    <ProfileField
                      label="10th Percentage"
                      value={ap?.tenthPercentage != null ? `${ap.tenthPercentage}%` : "—"}
                    />
                    <ProfileField
                      label="12th Percentage"
                      value={ap?.twelfthPercentage != null ? `${ap.twelfthPercentage}%` : "—"}
                    />
                    <ProfileField
                      label="Backlogs"
                      value={ap?.backlogs?.toString() || "0"}
                    />
                  </div>
                )}

                {/* Uploaded Docs */}
                {uploadedDocs
                  .filter((d) => d.category === "academic")
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-surface-container-low p-5 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-surface-container-lowest rounded-lg flex items-center justify-center text-primary shadow-sm">
                          <span className="material-symbols-outlined">picture_as_pdf</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{doc.name}</p>
                          <p className="text-[10px] text-outline uppercase tracking-tighter">
                            {doc.status === "verified"
                              ? "Verified"
                              : "Uploaded"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          {/* Section 03: Standardized Metrics */}
          <section className="grid grid-cols-12 gap-8 lg:gap-12">
            <div className="col-span-12 lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <span className="text-[64px] font-extrabold text-outline-variant/30 font-headline leading-none">
                  03
                </span>
                <h3 className="text-2xl font-bold font-headline mt-2">Standardized Metrics</h3>
                <p className="text-sm text-secondary mt-4 leading-relaxed">
                  Competitive intelligence including GRE, GMAT, TOEFL, IELTS, or PTE indices.
                </p>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                {/* English Test Card */}
                {(ap?.ieltsScore != null || ap?.toeflScore != null || ap?.pteScore != null) && (
                  <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl border border-outline-variant/20 hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start mb-8">
                      <div className="text-primary bg-primary/5 p-3 rounded-lg">
                        <span className="material-symbols-outlined">translate</span>
                      </div>
                      <div className="text-[10px] font-bold bg-surface-container-high px-2 py-1 rounded text-on-secondary-container uppercase tracking-widest">
                        Active
                      </div>
                    </div>
                    <h4 className="text-lg font-bold font-headline mb-6">
                      {ap?.ieltsScore != null
                        ? "IELTS"
                        : ap?.toeflScore != null
                          ? "TOEFL iBT"
                          : "PTE Academic"}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                        <span className="text-xs text-outline font-medium">Total Score</span>
                        <span className="font-bold text-on-surface">
                          {ap?.ieltsScore ?? ap?.toeflScore ?? ap?.pteScore ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* GRE Card */}
                {ap?.greScore != null && (
                  <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl border border-outline-variant/20 hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start mb-8">
                      <div className="text-primary bg-primary/5 p-3 rounded-lg">
                        <span className="material-symbols-outlined">trending_up</span>
                      </div>
                      <div className="text-[10px] font-bold bg-surface-container-high px-2 py-1 rounded text-on-secondary-container uppercase tracking-widest">
                        Active
                      </div>
                    </div>
                    <h4 className="text-lg font-bold font-headline mb-6">Graduate Record (GRE)</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                        <span className="text-xs text-outline font-medium">Total Score</span>
                        <span className="font-bold text-on-surface">{ap.greScore}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* GMAT Card */}
                {ap?.gmatScore != null && (
                  <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl border border-outline-variant/20 hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start mb-8">
                      <div className="text-primary bg-primary/5 p-3 rounded-lg">
                        <span className="material-symbols-outlined">trending_up</span>
                      </div>
                      <div className="text-[10px] font-bold bg-surface-container-high px-2 py-1 rounded text-on-secondary-container uppercase tracking-widest">
                        Active
                      </div>
                    </div>
                    <h4 className="text-lg font-bold font-headline mb-6">GMAT</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                        <span className="text-xs text-outline font-medium">Total Score</span>
                        <span className="font-bold text-on-surface">{ap.gmatScore}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* No tests fallback */}
                {ap?.ieltsScore == null &&
                  ap?.toeflScore == null &&
                  ap?.pteScore == null &&
                  ap?.greScore == null &&
                  ap?.gmatScore == null && (
                    <div className="col-span-full h-28 border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center text-outline gap-2">
                      <span className="material-symbols-outlined text-xl">quiz</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        No test scores recorded
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </section>

          {/* Section 04: Preferences & Goals */}
          <section className="grid grid-cols-12 gap-8 lg:gap-12">
            <div className="col-span-12 lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <span className="text-[64px] font-extrabold text-outline-variant/30 font-headline leading-none">
                  04
                </span>
                <h3 className="text-2xl font-bold font-headline mt-2">Strategic Preferences</h3>
                <p className="text-sm text-secondary mt-4 leading-relaxed">
                  Your target destinations, academic focus, and financial parameters for global placement.
                </p>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl border border-transparent hover:border-outline-variant/30 hover:shadow-xl hover:shadow-slate-200/40 transition-all">
                <div className="space-y-8">
                  {/* Target Countries */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-3">
                      Target Countries
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {pref?.targetCountries && pref.targetCountries.length > 0 ? (
                        pref.targetCountries.map((country) => (
                          <span
                            key={country}
                            className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full"
                          >
                            {country}
                          </span>
                        ))
                      ) : (
                        <span className="text-outline text-sm">—</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    <ProfileField label="Target Field" value={pref?.targetField || "—"} />
                    <ProfileField
                      label="Degree Level"
                      value={
                        pref?.targetDegreeLevel
                          ? DEGREE_LABELS[pref.targetDegreeLevel] || pref.targetDegreeLevel
                          : "—"
                      }
                    />
                    <ProfileField
                      label="Budget Range"
                      value={
                        pref?.budgetRange
                          ? BUDGET_LABELS[pref.budgetRange] || pref.budgetRange
                          : "—"
                      }
                    />
                  </div>

                  <ProfileField label="Target Intake" value={pref?.targetIntake || "—"} />
                </div>
              </div>
            </div>
          </section>

          {/* Section 05: Professional Narrative */}
          <section className="grid grid-cols-12 gap-8 lg:gap-12">
            <div className="col-span-12 lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <span className="text-[64px] font-extrabold text-outline-variant/30 font-headline leading-none">
                  05
                </span>
                <h3 className="text-2xl font-bold font-headline mt-2">Professional Narrative</h3>
                <p className="text-sm text-secondary mt-4 leading-relaxed">
                  Work experience, extracurriculars, and career aspirations.
                </p>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl border border-transparent hover:border-outline-variant/30 hover:shadow-xl hover:shadow-slate-200/40 transition-all">
                <div className="space-y-8">
                  <ProfileField
                    label="Work Experience"
                    value={
                      ap?.workExperienceMonths != null && ap.workExperienceMonths > 0
                        ? `${ap.workExperienceMonths} months`
                        : "No work experience"
                    }
                  />

                  {pref?.extracurriculars && pref.extracurriculars.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-3">
                        Extracurriculars
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {pref.extracurriculars.map((ec) => (
                          <span
                            key={ec}
                            className="bg-surface-container-high text-on-surface-variant text-xs font-medium px-3 py-1.5 rounded-full"
                          >
                            {ec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {pref?.careerGoals && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                        Career Goals
                      </span>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {pref.careerGoals}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Action Bar */}
        <div className="mt-24 lg:mt-32 pt-12 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link
            href="/onboarding"
            className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-secondary hover:text-on-surface transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit Profile
          </Link>
          <Link
            href="/universities"
            className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-10 py-4 rounded-lg text-sm font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Find Matching Universities
          </Link>
        </div>

        {/* Editorial Footer */}
        <div className="mt-32 lg:mt-40 grid grid-cols-12 gap-8 lg:gap-12 items-center opacity-50">
          <div className="col-span-5 h-[1px] bg-outline-variant/30" />
          <div className="col-span-2 text-center italic font-headline text-lg text-outline">
            Scientia Potentia Est
          </div>
          <div className="col-span-5 h-[1px] bg-outline-variant/30" />
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col space-y-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      <span className="py-3 font-body text-lg font-medium text-on-surface border-b-2 border-outline-variant/20">
        {value}
      </span>
    </div>
  );
}
