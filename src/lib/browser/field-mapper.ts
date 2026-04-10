import type { FormField } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dob?: string;          // ISO date string: "2000-08-15"
  gender?: string;
  nationality?: string;
  countryOfResidence?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  // Academic
  degreeName?: string;
  collegeName?: string;
  gpa?: number;
  gpaScale?: string;
  graduationYear?: number;
  backlogs?: number;
  workExperienceMonths?: number;
  // Test scores
  ieltsScore?: number;
  toeflScore?: number;
  pteScore?: number;
  greScore?: number;
  gmatScore?: number;
  // Target program
  targetField?: string;
  targetDegreeLevel?: string;
  targetIntake?: string;
  careerGoals?: string;
}

export interface MappedField {
  selector: string;
  fieldLabel: string;
  profileKey: string;
  rawValue: string;         // value from student profile (before validation)
  normalizedValue: string;  // value after format normalization
  confidence: number;       // 0.0 – 1.0
  confidenceReason: string;
  isSensitive: boolean;     // passport, DOB, etc. — always require explicit confirm
  isValid: boolean;
  validationError?: string;
  fieldType: string;
  autoFill: boolean;        // true if confidence >= THRESHOLD and valid
}

export interface UnmappedField {
  selector: string;
  fieldLabel: string;
  reason: string;
}

export interface MappingResult {
  mapped: MappedField[];
  unmapped: UnmappedField[];
  autoFillRate: number;     // % of mapped fields that can be auto-filled
}

// ─── Confidence threshold ─────────────────────────────────────────────────────

const AUTO_FILL_THRESHOLD = 0.75;

// ─── Profile key → form alias mapping ────────────────────────────────────────

type ProfileAlias = { aliases: string[]; type: string; sensitive?: boolean };

const PROFILE_ALIASES: Record<keyof StudentProfile, ProfileAlias> = {
  firstName:             { aliases: ["first_name","firstname","given_name","fname","first","forename","given","applicant_first"], type: "text" },
  lastName:              { aliases: ["last_name","lastname","surname","family_name","lname","last","last_name","family","applicant_last","applicant_surname"], type: "text" },
  email:                 { aliases: ["email","email_address","applicant_email","e-mail","contact_email","user_email"], type: "email" },
  phone:                 { aliases: ["phone","phone_number","mobile","mobile_number","contact_number","cell","telephone"], type: "tel" },
  dob:                   { aliases: ["dob","date_of_birth","birthdate","birth_date","birthday","date_birth","dateofbirth","birth"], type: "date", sensitive: true },
  gender:                { aliases: ["gender","sex","applicant_gender"], type: "select" },
  nationality:           { aliases: ["nationality","citizenship","country_of_citizenship","country_citizenship","national"], type: "text" },
  countryOfResidence:    { aliases: ["country_of_residence","residence_country","current_country","country_residence"], type: "text" },
  passportNumber:        { aliases: ["passport","passport_number","passport_no","passport_num"], type: "text", sensitive: true },
  address:               { aliases: ["address","street_address","home_address","current_address","mailing_address"], type: "text" },
  city:                  { aliases: ["city","town","city_of_residence","current_city"], type: "text" },
  degreeName:            { aliases: ["degree","degree_name","undergraduate_degree","current_degree","bachelor_degree","major","field_of_study","program_of_study"], type: "text" },
  collegeName:           { aliases: ["college","university","undergraduate_university","institution","college_name","school_name","university_name","institution_name","undergraduate_institution"], type: "text" },
  gpa:                   { aliases: ["gpa","cgpa","grade_point_average","cumulative_gpa","academic_score","grades"], type: "number" },
  gpaScale:              { aliases: ["gpa_scale","grade_scale","marking_scheme"], type: "select" },
  graduationYear:        { aliases: ["graduation_year","year_of_graduation","expected_graduation","grad_year"], type: "number" },
  backlogs:              { aliases: ["backlogs","arrears","backlogs_count","number_of_backlogs","failed_subjects"], type: "number" },
  workExperienceMonths:  { aliases: ["work_experience","work_exp","work_experience_months","experience_months","experience"], type: "number" },
  ieltsScore:            { aliases: ["ielts","ielts_score","ielts_band","english_test","english_proficiency","ielts_overall"], type: "number" },
  toeflScore:            { aliases: ["toefl","toefl_score","toefl_total"], type: "number" },
  pteScore:              { aliases: ["pte","pte_score","pte_academic"], type: "number" },
  greScore:              { aliases: ["gre","gre_score","gre_total","gre_composite"], type: "number" },
  gmatScore:             { aliases: ["gmat","gmat_score","gmat_total"], type: "number" },
  targetField:           { aliases: ["field_of_interest","program_interest","intended_major","area_of_study","subject"], type: "text" },
  targetDegreeLevel:     { aliases: ["intended_degree","degree_level","degree_type","program_level","level_of_study"], type: "select" },
  targetIntake:          { aliases: ["intake","start_date","intended_start","enrollment_term","semester"], type: "text" },
  careerGoals:           { aliases: ["career_goals","career_objective","statement","short_statement","professional_goals"], type: "textarea" },
};

// ─── Levenshtein distance (for fuzzy matching) ────────────────────────────────

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-_\/]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateValue(
  type: string,
  value: string,
  gpaScale?: string
): { valid: boolean; normalized: string; error?: string } {
  if (!value || value.trim() === "") {
    return { valid: false, normalized: "", error: "Value is empty" };
  }

  const v = value.trim();

  switch (type) {
    case "email": {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      return { valid: ok, normalized: v.toLowerCase(), error: ok ? undefined : "Invalid email format" };
    }
    case "date": {
      // Accept multiple formats, normalize to YYYY-MM-DD
      const formats = [
        /^(\d{4})-(\d{2})-(\d{2})$/,           // ISO
        /^(\d{2})\/(\d{2})\/(\d{4})$/,          // DD/MM/YYYY
        /^(\d{2})-(\d{2})-(\d{4})$/,            // DD-MM-YYYY
        /^(\d{1,2})\s+\w+\s+(\d{4})$/,         // 15 Aug 2000
      ];
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        const iso = d.toISOString().split("T")[0];
        return { valid: true, normalized: iso };
      }
      // Try DD/MM/YYYY
      const ddmm = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (ddmm) {
        const iso = `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;
        return { valid: true, normalized: iso };
      }
      void formats;
      return { valid: false, normalized: v, error: "Could not parse date — please enter as YYYY-MM-DD" };
    }
    case "number": {
      const num = parseFloat(v);
      if (isNaN(num)) return { valid: false, normalized: v, error: "Expected a number" };
      // GPA range check
      if (gpaScale === "scale_4" && num > 4.0) return { valid: false, normalized: v, error: "GPA on 4.0 scale should be ≤ 4.0" };
      if (gpaScale === "scale_10" && num > 10.0) return { valid: false, normalized: v, error: "GPA on 10.0 scale should be ≤ 10.0" };
      return { valid: true, normalized: String(num) };
    }
    case "tel": {
      const digits = v.replace(/[\s\-\(\)\+]/g, "");
      if (digits.length < 7 || digits.length > 15) {
        return { valid: false, normalized: v, error: "Phone number should be 7-15 digits" };
      }
      return { valid: true, normalized: v };
    }
    default:
      return { valid: true, normalized: v };
  }
}

// ─── Core Mapping Function ────────────────────────────────────────────────────

export function mapProfileToForm(
  profile: StudentProfile,
  formFields: FormField[],
  portalOverrides?: Record<string, string> // profile key → known selector
): MappingResult {
  const mapped: MappedField[] = [];
  const unmapped: UnmappedField[] = [];
  const usedSelectors = new Set<string>();

  for (const [profileKey, aliasConfig] of Object.entries(PROFILE_ALIASES) as [keyof StudentProfile, ProfileAlias][]) {
    const rawValue = profile[profileKey];
    if (rawValue === undefined || rawValue === null) continue;

    const strValue = String(rawValue);
    if (!strValue.trim()) continue;

    // Check for portal-specific selector override
    if (portalOverrides && profileKey in portalOverrides) {
      const selector = portalOverrides[profileKey];
      const formField = formFields.find((f) => f.selector === selector);
      if (formField && !usedSelectors.has(selector)) {
        const validation = validateValue(
          aliasConfig.type,
          strValue,
          profileKey === "gpa" ? profile.gpaScale : undefined
        );
        usedSelectors.add(selector);
        mapped.push({
          selector,
          fieldLabel: formField.label || profileKey,
          profileKey,
          rawValue: strValue,
          normalizedValue: validation.normalized,
          confidence: 1.0,
          confidenceReason: "portal override",
          isSensitive: aliasConfig.sensitive ?? false,
          isValid: validation.valid,
          validationError: validation.error,
          fieldType: aliasConfig.type,
          autoFill: validation.valid && !aliasConfig.sensitive,
        });
        continue;
      }
    }

    // Try to find a matching form field
    let bestMatch: FormField | null = null;
    let bestConfidence = 0;
    let bestReason = "";

    for (const field of formFields) {
      if (usedSelectors.has(field.selector)) continue;

      const fieldName = normalize(field.name);
      const fieldLabel = normalize(field.label);
      const fieldId = normalize(field.id);

      // 1. Exact alias match on name attribute (highest confidence)
      for (const alias of aliasConfig.aliases) {
        const normalizedAlias = normalize(alias);
        if (fieldName === normalizedAlias || fieldId === normalizedAlias) {
          if (bestConfidence < 1.0) {
            bestConfidence = 1.0;
            bestReason = "exact name/id match";
            bestMatch = field;
          }
        }
      }

      // 2. Exact label match
      for (const alias of aliasConfig.aliases) {
        const normalizedAlias = normalize(alias);
        if (fieldLabel === normalizedAlias) {
          if (bestConfidence < 0.9) {
            bestConfidence = 0.9;
            bestReason = "exact label match";
            bestMatch = field;
          }
        }
      }

      // 3. Partial / fuzzy label match (Levenshtein ≤ 2)
      for (const alias of aliasConfig.aliases) {
        const normalizedAlias = normalize(alias);
        const dist = levenshtein(fieldLabel, normalizedAlias);
        if (dist <= 2 && fieldLabel.length > 3) {
          const conf = 0.75 - dist * 0.05;
          if (bestConfidence < conf) {
            bestConfidence = conf;
            bestReason = `fuzzy label match (distance ${dist})`;
            bestMatch = field;
          }
        }
      }

      // 4. Type inference (lowest confidence)
      if (aliasConfig.type === "date" && field.type === "date" && bestConfidence < 0.5) {
        // Only use if no other field has matched
        bestConfidence = 0.5;
        bestReason = "type inference (date field)";
        bestMatch = field;
      }
      if (aliasConfig.type === "email" && field.type === "email" && bestConfidence < 0.5) {
        bestConfidence = 0.5;
        bestReason = "type inference (email field)";
        bestMatch = field;
      }
    }

    if (!bestMatch || bestConfidence < 0.3) {
      // No match found — this field will need manual input
      continue;
    }

    const validation = validateValue(
      bestMatch.type !== "select" ? aliasConfig.type : "text",
      strValue,
      profileKey === "gpa" ? profile.gpaScale : undefined
    );

    usedSelectors.add(bestMatch.selector);
    mapped.push({
      selector: bestMatch.selector,
      fieldLabel: bestMatch.label || profileKey,
      profileKey,
      rawValue: strValue,
      normalizedValue: validation.normalized,
      confidence: bestConfidence,
      confidenceReason: bestReason,
      isSensitive: aliasConfig.sensitive ?? false,
      isValid: validation.valid,
      validationError: validation.error,
      fieldType: bestMatch.type,
      autoFill: validation.valid && bestConfidence >= AUTO_FILL_THRESHOLD && !(aliasConfig.sensitive ?? false),
    });
  }

  // Collect form fields that have no mapping
  for (const field of formFields) {
    if (!usedSelectors.has(field.selector) && field.required) {
      unmapped.push({
        selector: field.selector,
        fieldLabel: field.label || field.name || field.id,
        reason: "No matching profile data found",
      });
    }
  }

  const autoFillCount = mapped.filter((m) => m.autoFill).length;
  const autoFillRate = mapped.length > 0 ? autoFillCount / mapped.length : 0;

  return { mapped, unmapped, autoFillRate };
}

