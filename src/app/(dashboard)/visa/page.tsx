"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────── */

interface VisaItem {
  id: string;
  label: string;
  description: string;
  badge?: { text: string; type: "mandatory" | "critical" };
  icon?: string;
}

interface VisaPhase {
  number: string;
  title: string;
  color: "primary" | "tertiary";
  layout: "list" | "grid";
  items: VisaItem[];
}

interface CountryVisa {
  visaType: string;
  tagline: string;
  appointmentLabel: string;
  appointmentDesc: string;
  officialLinks: { label: string; url: string }[];
  disclaimerOrg: string;
  destination: string;
  phases: VisaPhase[];
}

/* ─── Country Data ──────────────────────────────────────── */

const countryList = [
  "Germany",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Ireland",
] as const;

const countryFlags: Record<string, string> = {
  Germany: "\uD83C\uDDE9\uD83C\uDDEA",
  "United States": "\uD83C\uDDFA\uD83C\uDDF8",
  "United Kingdom": "\uD83C\uDDEC\uD83C\uDDE7",
  Canada: "\uD83C\uDDE8\uD83C\uDDE6",
  Australia: "\uD83C\uDDE6\uD83C\uDDFA",
  Ireland: "\uD83C\uDDEE\uD83C\uDDEA",
};

const countryData: Record<string, CountryVisa> = {
  Germany: {
    visaType: "National Visa (D) Checklist",
    tagline: "A precision-engineered guide for your German academic residency application. High-stakes documentation handled with curated simplicity.",
    appointmentLabel: "VFS Global Appointment",
    appointmentDesc: "Ensure all Phase 01 & 02 items are complete before booking your slot at the consulate.",
    officialLinks: [
      { label: "Federal Foreign Office", url: "https://www.auswaertiges-amt.de/" },
      { label: "VFS Global Portal", url: "https://visa.vfsglobal.com/" },
    ],
    disclaimerOrg: "the Federal Foreign Office of Germany",
    destination: "Berlin, Germany",
    phases: [
      { number: "01", title: "Pre-Application", color: "primary", layout: "list", items: [
        { id: "g1", label: "Passport Validity Check", description: "Ensuring your primary identification meets the 12-month minimum validity requirement.", badge: { text: "MANDATORY", type: "mandatory" } },
        { id: "g2", label: "Admission Letter (Zulassungsbescheid)", description: "The official confirmation of your academic placement in Germany." },
      ]},
      { number: "02", title: "Financial Sovereignty", color: "tertiary", layout: "list", items: [
        { id: "g3", label: "Blocked Account (Sperrkonto)", description: "Securing the requisite \u20AC11,208 in a certified German financial institution.", badge: { text: "CRITICAL", type: "critical" } },
        { id: "g4", label: "Health Insurance Proof", description: "Confirmation of insurance coverage for the first 90 days of stay." },
      ]},
      { number: "03", title: "Document Synthesis", color: "primary", layout: "grid", items: [
        { id: "g5", label: "Biometric Photos", description: "3 recently taken biometric passport photos (35\u00D745mm) on a light background.", icon: "badge" },
        { id: "g6", label: "Academic Transcripts", description: "Authenticated copies of all previous degrees and high school certificates.", icon: "description" },
        { id: "g7", label: "Language Proficiency", description: "IELTS/TOEFL (English) or TestDaF/DSH (German) score reports.", icon: "translate" },
        { id: "g8", label: "Curriculum Vitae", description: "A concise, professional CV in Europass format (No gaps in timeline).", icon: "history_edu" },
      ]},
      { number: "04", title: "Submission & Appointment", color: "tertiary", layout: "list", items: [
        { id: "g9", label: "Book VFS/Embassy Appointment", description: "Schedule your appointment at the German Embassy or VFS Global in your city." },
        { id: "g10", label: "Pay Visa Fee (\u20AC75)", description: "Visa processing fee payable at the appointment." },
        { id: "g11", label: "Attend Biometrics Appointment", description: "Provide fingerprints and photograph at the scheduled appointment." },
      ]},
    ],
  },
  "United States": {
    visaType: "F-1 Student Visa Checklist",
    tagline: "Your complete guide to the US F-1 student visa application. From I-20 to interview, every step covered.",
    appointmentLabel: "Embassy Interview",
    appointmentDesc: "Prepare all documents and practice your interview answers before the appointment date.",
    officialLinks: [
      { label: "US Travel Docs", url: "https://www.ustraveldocs.com/" },
      { label: "SEVIS Fee Payment", url: "https://www.fmjfee.com/" },
    ],
    disclaimerOrg: "the US Department of State",
    destination: "New York, USA",
    phases: [
      { number: "01", title: "Pre-Application", color: "primary", layout: "list", items: [
        { id: "s1", label: "Receive I-20 Form", description: "Your university issues Form I-20 (Certificate of Eligibility) after you accept the offer.", badge: { text: "MANDATORY", type: "mandatory" } },
        { id: "s2", label: "Pay SEVIS Fee (I-901)", description: "USD 350 SEVIS fee \u2014 pay at fmjfee.com and keep the receipt.", badge: { text: "CRITICAL", type: "critical" } },
      ]},
      { number: "02", title: "Financial Evidence", color: "tertiary", layout: "list", items: [
        { id: "s3", label: "Proof of Financial Support", description: "Bank statements, sponsor affidavit, scholarship letter, or loan sanction covering tuition + living." },
        { id: "s4", label: "Education Loan Documentation", description: "If applicable, loan sanction letter from bank covering full program cost." },
      ]},
      { number: "03", title: "Document Synthesis", color: "primary", layout: "grid", items: [
        { id: "s5", label: "Valid Passport", description: "Valid for at least 6 months beyond your period of stay.", icon: "badge" },
        { id: "s6", label: "Passport Photo", description: "2\u00D72 inch (51\u00D751mm) photo as per US visa specifications.", icon: "photo_camera" },
        { id: "s7", label: "Academic Records", description: "All academic records from 10th through graduation.", icon: "description" },
        { id: "s8", label: "Test Score Reports", description: "GRE/GMAT and TOEFL/IELTS official score reports.", icon: "quiz" },
      ]},
      { number: "04", title: "Visa Interview", color: "tertiary", layout: "list", items: [
        { id: "s9", label: "Complete DS-160 Form", description: "Online nonimmigrant visa application at ceac.state.gov." },
        { id: "s10", label: "Pay Visa Fee (USD 185)", description: "MRV fee \u2014 pay at the designated bank or online." },
        { id: "s11", label: "Attend F-1 Visa Interview", description: "Bring all documents, I-20, DS-160 confirmation, SEVIS receipt, and financial proof.", badge: { text: "CRITICAL", type: "critical" } },
      ]},
    ],
  },
  "United Kingdom": {
    visaType: "Student Visa Checklist",
    tagline: "Step-by-step guide for the UK Student visa (formerly Tier 4). From CAS to biometrics, every detail mapped.",
    appointmentLabel: "VFS Biometrics",
    appointmentDesc: "Complete your online application and pay the IHS before booking your VFS appointment.",
    officialLinks: [
      { label: "GOV.UK Student Visa", url: "https://www.gov.uk/student-visa" },
      { label: "VFS Global UK", url: "https://visa.vfsglobal.com/gbr/" },
    ],
    disclaimerOrg: "UK Visas and Immigration (UKVI)",
    destination: "London, UK",
    phases: [
      { number: "01", title: "Pre-Application", color: "primary", layout: "list", items: [
        { id: "u1", label: "Receive CAS Number", description: "Your university issues a Confirmation of Acceptance for Studies after you accept and pay the deposit.", badge: { text: "MANDATORY", type: "mandatory" } },
        { id: "u2", label: "Pay Tuition Deposit", description: "Usually \u00A33,000\u2013\u00A35,000 to secure your place." },
      ]},
      { number: "02", title: "Financial Requirements", color: "tertiary", layout: "list", items: [
        { id: "u3", label: "Maintenance Funds", description: "\u00A31,334/month (London) or \u00A31,023/month (outside) for 9 months held for 28+ consecutive days.", badge: { text: "CRITICAL", type: "critical" } },
        { id: "u4", label: "Immigration Health Surcharge (IHS)", description: "\u00A3776/year \u2014 mandatory NHS access fee paid during visa application." },
      ]},
      { number: "03", title: "Document Synthesis", color: "primary", layout: "grid", items: [
        { id: "u5", label: "Valid Passport", description: "Valid for the full duration of your course.", icon: "badge" },
        { id: "u6", label: "Academic Documents", description: "Originals and certified copies of all qualifications.", icon: "description" },
        { id: "u7", label: "IELTS for UKVI", description: "English proficiency test \u2014 usually 6.0\u20137.0 overall.", icon: "translate" },
        { id: "u8", label: "TB Test Certificate", description: "Required for Indian applicants \u2014 from an approved clinic.", icon: "health_and_safety" },
      ]},
      { number: "04", title: "Application & Submission", color: "tertiary", layout: "list", items: [
        { id: "u9", label: "Complete Online Application", description: "Apply on gov.uk for the Student visa (previously Tier 4)." },
        { id: "u10", label: "Pay Visa Fee (\u00A3490)", description: "Standard Student visa application fee." },
        { id: "u11", label: "Attend VFS Biometrics", description: "Provide fingerprints, photo, and all supporting documents at VFS." },
      ]},
    ],
  },
  Canada: {
    visaType: "Study Permit Checklist",
    tagline: "Complete preparation guide for the Canadian Study Permit. GIC, biometrics, and everything in between.",
    appointmentLabel: "VAC Appointment",
    appointmentDesc: "Submit your online application first, then book your biometrics at the Visa Application Centre.",
    officialLinks: [
      { label: "IRCC Study Permit", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html" },
      { label: "VFS Global Canada", url: "https://visa.vfsglobal.com/can/" },
    ],
    disclaimerOrg: "Immigration, Refugees and Citizenship Canada (IRCC)",
    destination: "Toronto, Canada",
    phases: [
      { number: "01", title: "Pre-Application", color: "primary", layout: "list", items: [
        { id: "c1", label: "Letter of Acceptance (LOA)", description: "From a Designated Learning Institution (DLI) in Canada.", badge: { text: "MANDATORY", type: "mandatory" } },
        { id: "c2", label: "Pay Tuition Deposit", description: "Some universities require a deposit before issuing the LOA." },
      ]},
      { number: "02", title: "Financial Proof", color: "tertiary", layout: "list", items: [
        { id: "c3", label: "Proof of Funds (CAD 20,635 + tuition)", description: "Bank statements showing funds for tuition + living expenses for the first year.", badge: { text: "CRITICAL", type: "critical" } },
        { id: "c4", label: "GIC (Guaranteed Investment Certificate)", description: "CAD 20,635 GIC from Scotiabank, ICICI, or other participating bank." },
      ]},
      { number: "03", title: "Document Synthesis", color: "primary", layout: "grid", items: [
        { id: "c5", label: "Valid Passport", description: "Valid for the duration of your study permit plus 6 months.", icon: "badge" },
        { id: "c6", label: "Academic Transcripts", description: "All academic records with certified English translations if needed.", icon: "description" },
        { id: "c7", label: "Language Test Results", description: "IELTS or TOEFL score report.", icon: "translate" },
        { id: "c8", label: "Statement of Purpose", description: "Explain why you chose Canada and your study/career plans.", icon: "history_edu" },
      ]},
      { number: "04", title: "Submission", color: "tertiary", layout: "list", items: [
        { id: "c9", label: "Create IRCC Account & Apply", description: "Register at canada.ca and submit the study permit application online." },
        { id: "c10", label: "Pay Fees (CAD 235)", description: "CAD 150 application fee + CAD 85 biometrics fee." },
        { id: "c11", label: "Attend Biometrics at VAC", description: "Provide fingerprints and photo at a Visa Application Centre." },
      ]},
    ],
  },
  Australia: {
    visaType: "Subclass 500 Visa Checklist",
    tagline: "Your roadmap to the Australian Student Visa (Subclass 500). CoE, OSHC, and GTE covered.",
    appointmentLabel: "ImmiAccount Submission",
    appointmentDesc: "The Australian student visa is entirely online. Complete your ImmiAccount application with all documents.",
    officialLinks: [
      { label: "Home Affairs", url: "https://immi.homeaffairs.gov.au/" },
      { label: "Bupa Medical Visa", url: "https://www.bupa.com.au/health-insurance/oshc" },
    ],
    disclaimerOrg: "the Australian Department of Home Affairs",
    destination: "Melbourne, Australia",
    phases: [
      { number: "01", title: "Pre-Application", color: "primary", layout: "list", items: [
        { id: "a1", label: "Confirmation of Enrolment (CoE)", description: "Accept your offer and pay the deposit to get your CoE from the university.", badge: { text: "MANDATORY", type: "mandatory" } },
        { id: "a2", label: "Overseas Student Health Cover (OSHC)", description: "OSHC is mandatory for the duration of your visa. Providers: Medibank, Allianz, Bupa.", badge: { text: "CRITICAL", type: "critical" } },
      ]},
      { number: "02", title: "Financial Requirements", color: "tertiary", layout: "list", items: [
        { id: "a3", label: "Proof of Funds (AUD 24,505/year)", description: "Bank statements, scholarship letter, or loan sanction covering tuition + living." },
        { id: "a4", label: "Genuine Temporary Entrant (GTE) Statement", description: "A written statement explaining why you chose Australia and your plans to return home." },
      ]},
      { number: "03", title: "Document Synthesis", color: "primary", layout: "grid", items: [
        { id: "a5", label: "Valid Passport", description: "At least 6 months validity beyond your intended stay.", icon: "badge" },
        { id: "a6", label: "Academic Records", description: "Certified copies of all academic records.", icon: "description" },
        { id: "a7", label: "English Proficiency", description: "IELTS, TOEFL, or PTE Academic score report.", icon: "translate" },
        { id: "a8", label: "Health Examination", description: "Complete medical exam at a panel-approved Bupa clinic.", icon: "health_and_safety" },
      ]},
      { number: "04", title: "Online Submission", color: "tertiary", layout: "list", items: [
        { id: "a9", label: "Create ImmiAccount", description: "Register at immi.homeaffairs.gov.au to apply online." },
        { id: "a10", label: "Submit Subclass 500 Application", description: "Complete and submit the Student Visa (500) application online." },
        { id: "a11", label: "Pay Visa Fee (AUD 710)", description: "Pay the application fee via ImmiAccount." },
      ]},
    ],
  },
  Ireland: {
    visaType: "Student Visa Checklist",
    tagline: "Step-by-step guide for the Irish student visa. From AVATS to IRP registration on arrival.",
    appointmentLabel: "AVATS Application",
    appointmentDesc: "Submit your visa application online via AVATS, then post documents to the Irish Embassy.",
    officialLinks: [
      { label: "INIS Visa Portal", url: "https://www.irishimmigration.ie/" },
      { label: "AVATS Application", url: "https://www.visas.inis.gov.ie/" },
    ],
    disclaimerOrg: "the Irish Naturalisation and Immigration Service",
    destination: "Dublin, Ireland",
    phases: [
      { number: "01", title: "Pre-Application", color: "primary", layout: "list", items: [
        { id: "i1", label: "Offer Letter & Deposit", description: "Accept your offer and pay the required deposit to your Irish university.", badge: { text: "MANDATORY", type: "mandatory" } },
        { id: "i2", label: "Private Medical Insurance", description: "Health insurance covering you in Ireland for the duration of your studies." },
      ]},
      { number: "02", title: "Financial Proof", color: "tertiary", layout: "list", items: [
        { id: "i3", label: "Proof of Funds (\u20AC10,000)", description: "\u20AC10,000 available in your or sponsor\u2019s bank account, in addition to first year fees.", badge: { text: "CRITICAL", type: "critical" } },
        { id: "i4", label: "Tuition Fees Receipt", description: "Receipt showing at least first-year fees are paid or a scholarship letter." },
      ]},
      { number: "03", title: "Document Synthesis", color: "primary", layout: "grid", items: [
        { id: "i5", label: "Valid Passport", description: "Valid for at least 12 months after your expected arrival date.", icon: "badge" },
        { id: "i6", label: "Academic Documents", description: "Certified copies of all academic records.", icon: "description" },
        { id: "i7", label: "English Proficiency", description: "IELTS 6.5+ or equivalent test results.", icon: "translate" },
        { id: "i8", label: "Cover Letter", description: "Summary of application, course details, and reasons for choosing Ireland.", icon: "history_edu" },
      ]},
      { number: "04", title: "Application & Arrival", color: "tertiary", layout: "list", items: [
        { id: "i9", label: "Apply via AVATS", description: "Submit visa application online at visas.inis.gov.ie." },
        { id: "i10", label: "Pay Visa Fee (\u20AC60/\u20AC100)", description: "\u20AC60 single entry or \u20AC100 multi-entry visa fee." },
        { id: "i11", label: "Register IRP on Arrival", description: "Register with local immigration office within 90 days and get your IRP card." },
      ]},
    ],
  },
};

/* ─── Persistence Key ───────────────────────────────────── */

const STORAGE_KEY = "ribriz-visa-checks";

/* ─── Component ─────────────────────────────────────────── */

export default function VisaPage() {
  const [selectedCountry, setSelectedCountry] =
    useState<(typeof countryList)[number]>("Germany");
  const [checkStates, setCheckStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCheckStates(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const toggleItem = useCallback((itemId: string) => {
    setCheckStates((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const data = countryData[selectedCountry];
  const allItems = data.phases.flatMap((p) => p.items);
  const totalItems = allItems.length;
  const checkedItems = allItems.filter((i) => checkStates[i.id]).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 transition-colors duration-300">
      {/* Header */}
      <header className="mb-10 md:mb-12">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
          <span>Visa Navigator</span>
          <span className="material-symbols-outlined text-[10px]">chevron_right</span>
          <span className="text-on-surface-variant">{selectedCountry}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2 text-on-surface font-headline">
              {data.visaType}
            </h1>
            <p className="text-on-surface-variant max-w-2xl text-sm leading-relaxed">
              {data.tagline}
            </p>
          </div>
          <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 shrink-0 transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-outline tracking-wider">Curator Confidence</div>
              <div className="text-xl font-bold text-primary">
                {progress}% <span className="text-sm font-normal text-on-surface-variant">Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Country Tabs */}
        <div className="flex flex-wrap gap-2 mt-8">
          {countryList.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCountry === c
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-surface-container-low text-outline border border-outline-variant/10 hover:text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="text-sm">{countryFlags[c]}</span> {c}
            </button>
          ))}
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Checklist Sections */}
        <div className="lg:col-span-8 space-y-12">
          {data.phases.map((phase) => (
            <section key={phase.number + phase.title}>
              {/* Phase Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-outline-variant/30" />
                <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${
                  phase.color === "primary" ? "text-primary" : "text-tertiary"
                }`}>
                  Phase {phase.number}: {phase.title}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-outline-variant/30" />
              </div>

              {phase.layout === "list" ? (
                <div className="space-y-4">
                  {phase.items.map((item) => {
                    const checked = checkStates[item.id] ?? false;
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`group relative flex items-start gap-5 p-6 rounded-2xl transition-all duration-300 cursor-pointer ${
                          item.badge?.type === "critical"
                            ? "bg-surface-container-low hover:bg-surface-container border-l-2 border-amber-500/40"
                            : "bg-surface-container-low hover:bg-surface-container"
                        } ${checked ? "opacity-60" : ""}`}
                      >
                        <div className="pt-0.5">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            checked
                              ? "bg-[#4f55f1] border-[#4f55f1]"
                              : "border-outline-variant bg-surface-container-lowest"
                          }`}>
                            {checked && (
                              <span className="material-symbols-outlined text-white text-sm">check</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className={`font-semibold text-on-surface ${checked ? "line-through" : ""}`}>
                              {item.label}
                            </h3>
                          </div>
                          <p className="text-sm text-on-surface-variant">{item.description}</p>
                        </div>
                        {item.badge && (
                          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shrink-0 ${
                            item.badge.type === "critical"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {item.badge.type === "critical" && (
                              <span className="material-symbols-outlined text-xs">priority_high</span>
                            )}
                            {item.badge.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {phase.items.map((item) => {
                    const checked = checkStates[item.id] ?? false;
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`p-6 rounded-2xl bg-surface-container border border-outline-variant/10 cursor-pointer hover:bg-surface-container-high transition-all ${
                          checked ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className="material-symbols-outlined text-primary text-3xl">
                            {item.icon || "description"}
                          </span>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            checked
                              ? "bg-[#4f55f1] border-[#4f55f1]"
                              : "border-outline-variant bg-surface-container-lowest"
                          }`}>
                            {checked && (
                              <span className="material-symbols-outlined text-white text-sm">check</span>
                            )}
                          </div>
                        </div>
                        <h3 className={`font-bold text-on-surface mb-2 ${checked ? "line-through" : ""}`}>
                          {item.label}
                        </h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24">
          {/* Appointment CTA */}
          <div className="p-8 rounded-3xl bg-[#4f55f1] text-white relative overflow-hidden shadow-2xl shadow-[#4f55f1]/20">
            <div className="relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-6">Next Step</div>
              <h3 className="text-2xl font-bold mb-4">{data.appointmentLabel}</h3>
              <p className="text-sm mb-8 opacity-90 leading-relaxed">{data.appointmentDesc}</p>
              <button className="w-full bg-white text-[#4f55f1] font-bold py-4 rounded-xl active:scale-95 transition-transform hover:bg-slate-50">
                Book Appointment Slot
              </button>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-20 rotate-12">
              <span className="material-symbols-outlined text-[96px]">event_available</span>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/10 transition-colors">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <span className="material-symbols-outlined">gavel</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Legal Disclaimer</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              RIBRIZ provides this checklist as a curated informational tool. Requirements for National Visas are subject to change by {data.disclaimerOrg}.
            </p>
            <div className="space-y-3">
              {data.officialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high transition-colors group"
                >
                  <span className="text-[11px] font-bold text-on-surface">{link.label}</span>
                  <span className="material-symbols-outlined text-sm text-outline group-hover:translate-x-1 transition-transform">open_in_new</span>
                </a>
              ))}
            </div>
          </div>

          {/* Destination Card */}
          <div className="rounded-3xl overflow-hidden aspect-[4/3] relative group bg-surface-container-low">
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent z-10" />
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <span className="material-symbols-outlined text-[120px] text-primary">location_city</span>
            </div>
            <div className="absolute bottom-6 left-6 right-6 z-20">
              <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Destination Profile</div>
              <div className="text-lg font-bold text-on-surface">{data.destination}</div>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Completion</span>
              <span className="text-lg font-bold text-primary">{checkedItems}/{totalItems}</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-[#4f55f1] to-[#bfc1ff] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-outline">
              {progress === 100
                ? "All items complete \u2014 you\u2019re ready to apply!"
                : `${totalItems - checkedItems} items remaining`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
