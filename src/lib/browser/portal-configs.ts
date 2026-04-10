// ─── Portal Platform Registry ─────────────────────────────────────────────────
//
// Instead of per-university configs (which break constantly), we define
// PLATFORMS — application systems shared by many universities.
//
// A university maps to a platform. The platform defines:
//  - The portal URL to navigate to
//  - Navigation steps (how to get from the homepage to the actual form)
//  - Known field selectors
//  - Whether account creation is required first
//
// For universities not matched to any platform → co-pilot mode immediately.
// No blind navigation attempts.

export type PortalConfidence = "stable" | "experimental";

export interface NavigationStep {
  description: string        // human-readable label for SSE status
  action: "navigate" | "click" | "wait" | "dismiss_popups"
  selector?: string          // for "click"
  url?: string               // for "navigate"
  waitForSelector?: string   // wait for this to appear after action
}

export interface PlatformConfig {
  id: string
  name: string               // e.g. "uni-assist", "UCAS", "Common App"
  description: string        // shown to student in counselor chat
  portalUrl: string          // starting URL
  countries: string[]        // countries whose universities commonly use this
  accountRequired: boolean   // must create account before form
  accountCreationUrl?: string
  navigationSteps: NavigationStep[]  // steps to reach the application form
  knownSelectors: Record<string, string>  // profileKey → CSS selector
  formFieldHints: Record<string, string>  // label hints for field mapping
  notes: string
  confidence: PortalConfidence
  lastVerified: string
}

// ─── Platform Definitions ─────────────────────────────────────────────────────

export const PLATFORMS: PlatformConfig[] = [
  {
    id: "uni-assist",
    name: "uni-assist",
    description: "uni-assist is the central application portal for 300+ German universities including Humboldt, TU Berlin, Hamburg, and many others.",
    portalUrl: "https://my.uni-assist.de/apply",
    countries: ["Germany"],
    accountRequired: true,
    accountCreationUrl: "https://my.uni-assist.de/register",
    navigationSteps: [
      { description: "Opening uni-assist portal", action: "navigate", url: "https://my.uni-assist.de" },
      { description: "Dismissing notices", action: "dismiss_popups" },
      { description: "Clicking BEWERBEN / Apply", action: "click", selector: "a[href*='apply'], a[href*='bewerb'], .btn-apply, [data-target*='apply']" },
    ],
    knownSelectors: {
      firstName: "input[name='firstName'], input[id*='first'], input[placeholder*='Vorname']",
      lastName: "input[name='lastName'], input[id*='last'], input[placeholder*='Nachname']",
      email: "input[type='email'], input[name='email']",
      dob: "input[name='dateOfBirth'], input[id*='birth'], input[placeholder*='Geburtsdatum']",
      nationality: "select[name='nationality'], select[id*='nation']",
      phone: "input[type='tel'], input[name='phone']",
    },
    formFieldHints: {
      "Vorname": "firstName",
      "Nachname": "lastName",
      "Geburtsdatum": "dob",
      "Staatsangehörigkeit": "nationality",
      "E-Mail": "email",
      "Telefon": "phone",
    },
    notes: "uni-assist covers ~300 German universities. Account creation required once. After login, select the university and program from within the portal.",
    confidence: "experimental",
    lastVerified: "2025-04-09",
  },
  {
    id: "daad",
    name: "DAAD Portal",
    description: "The DAAD portal is used for scholarship applications and some German university programs.",
    portalUrl: "https://portal.daad.de",
    countries: ["Germany"],
    accountRequired: true,
    accountCreationUrl: "https://portal.daad.de/irj/portal/daad?NavKey=d.en.hig.new&SubNavKey=d.en.hig.new.reg",
    navigationSteps: [
      { description: "Opening DAAD portal", action: "navigate", url: "https://portal.daad.de" },
      { description: "Dismissing popups", action: "dismiss_popups" },
    ],
    knownSelectors: {},
    formFieldHints: {},
    notes: "DAAD is primarily for scholarships, not direct university applications.",
    confidence: "experimental",
    lastVerified: "2025-04-09",
  },
  {
    id: "ucas",
    name: "UCAS",
    description: "UCAS is the central UK university application system. All UK undergraduate applications go through UCAS.",
    portalUrl: "https://apply.ucas.com",
    countries: ["United Kingdom"],
    accountRequired: true,
    accountCreationUrl: "https://apply.ucas.com/register",
    navigationSteps: [
      { description: "Opening UCAS Apply", action: "navigate", url: "https://apply.ucas.com" },
      { description: "Dismissing cookie notice", action: "dismiss_popups" },
    ],
    knownSelectors: {
      firstName: "#firstname, input[name='firstname']",
      lastName: "#familyname, input[name='familyname']",
      email: "#email, input[name='email'], input[type='email']",
      dob: "#dateofbirth, input[name='dateofbirth']",
      phone: "#phone, input[name='phone'], input[type='tel']",
    },
    formFieldHints: {
      "First name": "firstName",
      "Family name": "lastName",
      "Date of birth": "dob",
      "Email": "email",
    },
    notes: "UCAS covers all UK undergraduate. For postgraduate, universities use their own portals.",
    confidence: "experimental",
    lastVerified: "2025-04-09",
  },
  {
    id: "common-app",
    name: "Common App",
    description: "Common App is used by 1000+ US universities for undergraduate admission.",
    portalUrl: "https://apply.commonapp.org",
    countries: ["United States"],
    accountRequired: true,
    accountCreationUrl: "https://apply.commonapp.org/createaccount",
    navigationSteps: [
      { description: "Opening Common App", action: "navigate", url: "https://apply.commonapp.org" },
      { description: "Dismissing popups", action: "dismiss_popups" },
    ],
    knownSelectors: {
      firstName: "#legalFirstName, input[name*='firstName']",
      lastName: "#legalLastName, input[name*='lastName']",
      email: "#email, input[type='email']",
      dob: "#dateOfBirth, input[name*='dob']",
    },
    formFieldHints: {
      "Legal First Name": "firstName",
      "Legal Last Name": "lastName",
      "Date of Birth": "dob",
      "Email Address": "email",
    },
    notes: "Common App covers ~1000 US colleges. Account is created once, then university added to list.",
    confidence: "experimental",
    lastVerified: "2025-04-09",
  },
  {
    id: "ouac",
    name: "OUAC (Ontario Universities Application Centre)",
    description: "OUAC is used for all Ontario university applications in Canada.",
    portalUrl: "https://www.ouac.on.ca/apply",
    countries: ["Canada"],
    accountRequired: true,
    navigationSteps: [
      { description: "Opening OUAC portal", action: "navigate", url: "https://www.ouac.on.ca/apply" },
      { description: "Dismissing popups", action: "dismiss_popups" },
    ],
    knownSelectors: {},
    formFieldHints: {},
    notes: "Covers Ontario universities: UofT, McMaster, Queen's, Western, etc.",
    confidence: "experimental",
    lastVerified: "2025-04-09",
  },
  {
    id: "studylink",
    name: "StudyLink NZ",
    description: "New Zealand university applications portal.",
    portalUrl: "https://www.studylink.govt.nz",
    countries: ["New Zealand"],
    accountRequired: true,
    navigationSteps: [
      { description: "Opening StudyLink", action: "navigate", url: "https://www.studylink.govt.nz" },
    ],
    knownSelectors: {},
    formFieldHints: {},
    notes: "New Zealand student funding and application portal.",
    confidence: "experimental",
    lastVerified: "2025-04-09",
  },
];

// ─── University → Platform mapping ───────────────────────────────────────────
//
// Maps university name keywords → platform ID.
// Add entries here as you verify universities.

const UNIVERSITY_PLATFORM_MAP: Array<{ keywords: string[]; platformId: string }> = [
  // German universities that use uni-assist
  { keywords: ["humboldt", "humbolt"], platformId: "uni-assist" },
  { keywords: ["hamburg"], platformId: "uni-assist" },
  { keywords: ["tu berlin", "technische universität berlin", "technical university berlin"], platformId: "uni-assist" },
  { keywords: ["rwth aachen"], platformId: "uni-assist" },
  { keywords: ["tübingen", "tuebingen"], platformId: "uni-assist" },
  { keywords: ["freiburg"], platformId: "uni-assist" },
  { keywords: ["heidelberg"], platformId: "uni-assist" },
  { keywords: ["mainz"], platformId: "uni-assist" },
  { keywords: ["cologne", "köln"], platformId: "uni-assist" },
  { keywords: ["bonn"], platformId: "uni-assist" },
  { keywords: ["mannheim"], platformId: "uni-assist" },
  { keywords: ["frankfurt"], platformId: "uni-assist" },
  { keywords: ["giessen", "gießen"], platformId: "uni-assist" },
  { keywords: ["marburg"], platformId: "uni-assist" },
  { keywords: ["göttingen", "gottingen"], platformId: "uni-assist" },
  { keywords: ["würzburg", "wurzburg"], platformId: "uni-assist" },
  { keywords: ["erlangen", "fau"], platformId: "uni-assist" },
  { keywords: ["augsburg"], platformId: "uni-assist" },
  { keywords: ["regensburg"], platformId: "uni-assist" },
  { keywords: ["passau"], platformId: "uni-assist" },
  { keywords: ["bayreuth"], platformId: "uni-assist" },
  { keywords: ["jena"], platformId: "uni-assist" },
  { keywords: ["halle"], platformId: "uni-assist" },
  { keywords: ["leipzig"], platformId: "uni-assist" },
  { keywords: ["dresden", "tu dresden"], platformId: "uni-assist" },
  { keywords: ["rostock"], platformId: "uni-assist" },
  { keywords: ["kiel"], platformId: "uni-assist" },
  { keywords: ["lübeck", "lubeck"], platformId: "uni-assist" },
  { keywords: ["braunschweig"], platformId: "uni-assist" },
  { keywords: ["clausthal"], platformId: "uni-assist" },
  { keywords: ["hannover"], platformId: "uni-assist" },
  { keywords: ["bremen"], platformId: "uni-assist" },
  { keywords: ["oldenburg"], platformId: "uni-assist" },
  { keywords: ["osnabrück", "osnabrueck"], platformId: "uni-assist" },
  { keywords: ["bielefeld"], platformId: "uni-assist" },
  { keywords: ["bochum", "ruhr"], platformId: "uni-assist" },
  { keywords: ["dortmund"], platformId: "uni-assist" },
  { keywords: ["duisburg", "essen", "ude"], platformId: "uni-assist" },
  { keywords: ["düsseldorf", "dusseldorf", "heinrich heine"], platformId: "uni-assist" },
  { keywords: ["münster", "munster", "westfälische"], platformId: "uni-assist" },
  { keywords: ["paderborn"], platformId: "uni-assist" },
  { keywords: ["siegen"], platformId: "uni-assist" },
  { keywords: ["wuppertal"], platformId: "uni-assist" },
  { keywords: ["saarland"], platformId: "uni-assist" },
  { keywords: ["kaiserslautern"], platformId: "uni-assist" },
  { keywords: ["koblenz", "landau"], platformId: "uni-assist" },
  { keywords: ["trier"], platformId: "uni-assist" },
  { keywords: ["kassel"], platformId: "uni-assist" },
  { keywords: ["darmstadt", "tu darmstadt"], platformId: "uni-assist" },
  { keywords: ["stuttgart", "uni stuttgart"], platformId: "uni-assist" },
  { keywords: ["karlsruhe", "kit"], platformId: "uni-assist" },
  { keywords: ["konstanz"], platformId: "uni-assist" },
  { keywords: ["ulm"], platformId: "uni-assist" },
  { keywords: ["hohenheim"], platformId: "uni-assist" },
  { keywords: ["lmu munich", "ludwig maximilian", "lmu münchen"], platformId: "uni-assist" },
  { keywords: ["tu munich", "tu münchen", "tum"], platformId: "uni-assist" },

  // Universities that accept Common App (US)
  { keywords: ["boston university", "bu boston"], platformId: "common-app" },
  { keywords: ["northeastern"], platformId: "common-app" },
  { keywords: ["nyu", "new york university"], platformId: "common-app" },
  { keywords: ["george washington"], platformId: "common-app" },
  { keywords: ["american university"], platformId: "common-app" },

  // Ontario Canada → OUAC
  { keywords: ["university of toronto", "uoft", "u of t"], platformId: "ouac" },
  { keywords: ["mcmaster"], platformId: "ouac" },
  { keywords: ["queen's university", "queens university", "queens kingston"], platformId: "ouac" },
  { keywords: ["western university", "western ontario"], platformId: "ouac" },
  { keywords: ["waterloo"], platformId: "ouac" },
  { keywords: ["york university", "york toronto"], platformId: "ouac" },
  { keywords: ["ottawa university", "university of ottawa"], platformId: "ouac" },
  { keywords: ["ryerson", "toronto metropolitan"], platformId: "ouac" },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getPlatformForUniversity(universityName: string): PlatformConfig | null {
  const normalized = universityName.toLowerCase();
  for (const entry of UNIVERSITY_PLATFORM_MAP) {
    if (entry.keywords.some((k) => normalized.includes(k))) {
      return PLATFORMS.find((p) => p.id === entry.platformId) ?? null;
    }
  }
  return null;
}

export function getPlatformById(id: string): PlatformConfig | null {
  return PLATFORMS.find((p) => p.id === id) ?? null;
}

export function getPlatformByCountry(country: string): PlatformConfig | null {
  const normalized = country.toLowerCase();
  return PLATFORMS.find((p) => p.countries.some((c) => c.toLowerCase() === normalized)) ?? null;
}

/** Returns true if we have a known navigation path for this university */
export function hasKnownPlatform(universityName: string): boolean {
  return getPlatformForUniversity(universityName) !== null;
}
