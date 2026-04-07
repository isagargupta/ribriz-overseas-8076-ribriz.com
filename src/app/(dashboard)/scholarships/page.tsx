import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import {
  fetchExternalScholarships,
  fetchExternalUniversityById,
  type ExtScholarship,
} from "@/lib/external-university-api";
import ScholarshipList from "./scholarship-list";
import type { ScholarshipItem } from "./scholarship-list";

export default async function ScholarshipsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  // Fetch scholarships from external API
  let raw: ExtScholarship[] = [];
  try {
    raw = await fetchExternalScholarships({ limit: 200 });
  } catch (err) {
    console.warn("Failed to fetch scholarships from API:", (err as Error).message);
  }

  // Filter to only entries with meaningful data
  const meaningful = raw.filter(
    (s) =>
      s.name &&
      s.name.length > 3 &&
      (s.provider || s.description || s.amount || s.coverage)
  );

  // Resolve university names for linked scholarships
  const uniIds = [
    ...new Set(
      meaningful
        .map((s) => s.university_id)
        .filter((id): id is number => id !== null)
    ),
  ];

  const uniMap = new Map<number, { name: string; country: string; city: string }>();
  // Batch 10 at a time
  for (let i = 0; i < uniIds.length; i += 10) {
    const batch = uniIds.slice(i, i + 10);
    await Promise.all(
      batch.map(async (uid) => {
        const uni = await fetchExternalUniversityById(uid);
        if (uni) uniMap.set(uid, uni);
      })
    );
  }

  // Map to client-side shape
  const scholarships: ScholarshipItem[] = meaningful.map((s) => {
    const uni = s.university_id ? uniMap.get(s.university_id) : null;

    // Determine funding type
    let type: ScholarshipItem["type"] = "partial";
    if (s.coverage === "full-tuition" || s.coverage === "full") type = "full";
    else if (s.coverage === "stipend" || s.scholarship_type === "stipend") type = "stipend";
    else if (s.coverage === "tuition-waiver") type = "tuition-waiver";
    else if (s.scholarship_type === "merit") type = "partial";
    else if (s.scholarship_type === "need-based") type = "partial";

    // Build amount string
    let amount = "Contact provider";
    if (s.amount) {
      amount = `${s.amount_currency || "USD"} ${s.amount.toLocaleString()}`;
    } else if (s.coverage === "full-tuition") {
      amount = "Full tuition + living expenses";
    } else if (s.coverage === "stipend") {
      amount = "Monthly stipend";
    }

    // Parse degree levels
    const degreeLevel = s.eligible_degrees
      ? s.eligible_degrees.split(",").map((d) => d.trim())
      : [];

    return {
      id: `ext-sch-${s.id}`,
      name: s.name,
      provider: s.provider || uni?.name || "University scholarship",
      country: uni?.country || "",
      universityName: uni?.name || null,
      amount,
      type,
      degreeLevel,
      deadline: s.application_deadline || "Check website",
      eligibility: s.eligibility_criteria || s.eligible_countries || "",
      description: s.description || "",
      link: s.application_url || "",
      renewable: s.renewable,
      numberOfAwards: s.number_of_awards,
      scholarshipType: s.scholarship_type,
    };
  });

  return (
    <div className="p-4 sm:p-8 bg-surface">
      <ScholarshipList
        scholarships={scholarships}
        totalInApi={raw.length}
      />
    </div>
  );
}
