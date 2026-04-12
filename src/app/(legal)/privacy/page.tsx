import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How RIBRIZ collects, uses, and protects your personal data.",
};

const EFFECTIVE_DATE = "23 April 2024";
const CONTACT_EMAIL = "privacy@ribriz.com";
const COMPANY_NAME = "RIBRIZ OVERSEAS VENTURES PRIVATE LIMITED";
const ADDRESS = "Unit 101, Oxford Towers, 139, HAL Old Airport Rd, H.A.L II Stage, Bangalore North, Bangalore – 560008, Karnataka, India";
const CIN = "U85499KA2024PTC187740";

export default function PrivacyPage() {
  return (
    <article className="prose-legal">
      <header className="mb-12 pb-8 border-b border-black/[0.06]">
        <p className="text-xs font-bold uppercase tracking-widest text-[#3525cd] mb-3">Legal</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter font-headline text-[#191c1e] mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#777587]">
          Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: April 2025
        </p>
      </header>

      <Section title="1. Introduction">
        <p>
          {COMPANY_NAME} (&ldquo;RIBRIZ&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), CIN {CIN},
          operates the website ribriz.com and the RIBRIZ AI-powered study abroad platform (the &ldquo;Service&rdquo;).
          This Privacy Policy explains what personal data we collect from you, how we use it, and your rights
          regarding that data.
        </p>
        <p>
          By using the Service you agree to the collection and use of information in accordance with this policy.
          If you do not agree, please do not use the Service.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <Subsection title="2.1 Information you provide directly">
          <ul>
            <li><strong>Account data:</strong> full name, email address, phone number, country of residence, and password.</li>
            <li><strong>Profile &amp; academic data:</strong> educational qualifications, grades, test scores (GRE, GMAT, IELTS, TOEFL, etc.), work experience, and intended field of study.</li>
            <li><strong>Documents:</strong> Statement of Purpose (SOP) drafts, résumés, and other supporting documents you upload or create using our tools.</li>
            <li><strong>Communication content:</strong> messages sent to our support team or through the platform.</li>
            <li><strong>Payment information:</strong> billing address and transaction identifiers (we do not store card numbers — payments are processed by Razorpay).</li>
          </ul>
        </Subsection>
        <Subsection title="2.2 Information collected automatically">
          <ul>
            <li><strong>Usage data:</strong> pages visited, features used, search queries, clicks, and session duration.</li>
            <li><strong>Device &amp; log data:</strong> IP address, browser type and version, operating system, referring URLs, and timestamps.</li>
            <li><strong>Cookies &amp; similar technologies:</strong> see our <a href="/cookies">Cookie Policy</a> for details.</li>
          </ul>
        </Subsection>
        <Subsection title="2.3 Information from third parties">
          <ul>
            <li>If you sign in via a third-party OAuth provider we receive the data that provider shares (typically name and email).</li>
            <li>Publicly available university data to power our matching engine.</li>
          </ul>
        </Subsection>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul>
          <li>Create and manage your account and authenticate you securely.</li>
          <li>Power AI features including university matching, admission-chance prediction, SOP generation, and interview preparation.</li>
          <li>Process payments and manage subscription plans.</li>
          <li>Send transactional emails (OTPs, receipts, application reminders) and, where you have opted in, marketing communications.</li>
          <li>Analyse usage to improve the platform, fix bugs, and develop new features.</li>
          <li>Detect and prevent fraud, abuse, and security incidents.</li>
          <li>Comply with applicable legal obligations under Indian law.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal data to third parties. We do not use your documents or
          academic data to train external AI models without your explicit consent.
        </p>
      </Section>

      <Section title="4. Legal Bases for Processing">
        <p>We rely on the following lawful bases under applicable Indian data-protection law (including the Digital Personal Data Protection Act, 2023):</p>
        <ul>
          <li><strong>Contract:</strong> processing necessary to provide the Service you have signed up for.</li>
          <li><strong>Consent:</strong> marketing emails and optional analytics — you may withdraw consent at any time.</li>
          <li><strong>Legitimate interests:</strong> security, fraud prevention, and product analytics.</li>
          <li><strong>Legal obligation:</strong> compliance with tax, corporate, and other statutory requirements.</li>
        </ul>
      </Section>

      <Section title="5. Data Sharing and Disclosure">
        <p>We share data only in the following circumstances:</p>
        <table>
          <thead>
            <tr><th>Recipient</th><th>Purpose</th></tr>
          </thead>
          <tbody>
            <tr><td>Supabase Inc.</td><td>Authentication and database hosting</td></tr>
            <tr><td>Razorpay Software Pvt. Ltd.</td><td>Payment processing</td></tr>
            <tr><td>Resend Inc.</td><td>Transactional email delivery</td></tr>
            <tr><td>Anthropic PBC</td><td>AI inference for platform features</td></tr>
            <tr><td>Sentry Inc.</td><td>Error monitoring and diagnostics</td></tr>
          </tbody>
        </table>
        <p>
          All sub-processors are contractually bound to process data only as instructed and to maintain
          appropriate security standards. We may also disclose data when required by law, court order, or
          government authority.
        </p>
      </Section>

      <Section title="6. Data Retention">
        <p>
          We retain your account data for as long as your account is active. If you delete your account, we
          delete or anonymise your personal data within 90 days, except where we are legally required to retain
          it longer (for example, financial records which must be kept for 7 years under Indian tax law).
        </p>
      </Section>

      <Section title="7. Data Security">
        <p>
          We implement industry-standard safeguards: TLS encryption in transit, AES-256 encryption at rest,
          role-based access controls, and regular security audits. However, no method of transmission over the
          internet is 100% secure and we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="8. International Transfers">
        <p>
          Our service providers may process data outside India. We ensure such transfers comply with applicable
          law and that adequate safeguards are in place through standard contractual clauses or equivalent
          mechanisms.
        </p>
      </Section>

      <Section title="9. Your Rights">
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li><strong>Access</strong> the personal data we hold about you.</li>
          <li><strong>Correct</strong> inaccurate or incomplete data.</li>
          <li><strong>Delete</strong> your account and associated data.</li>
          <li><strong>Withdraw consent</strong> for marketing communications at any time via the unsubscribe link or account settings.</li>
          <li><strong>Port</strong> your data in a machine-readable format.</li>
          <li><strong>Nominate a nominee</strong> as provided under the Digital Personal Data Protection Act, 2023.</li>
        </ul>
        <p>To exercise any right, email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
      </Section>

      <Section title="10. Children's Privacy">
        <p>
          The Service is not directed to children under the age of 18. We do not knowingly collect personal data
          from anyone under 18. If we become aware that we have collected such data without parental consent, we
          will delete it promptly.
        </p>
      </Section>

      <Section title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be notified to you by email
          or by a prominent notice on the platform at least 7 days before taking effect. Continued use of the
          Service after the effective date constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="12. Contact Us">
        <p>For privacy-related queries or to exercise your rights, contact our data-protection contact at:</p>
        <address>
          <strong>{COMPANY_NAME}</strong><br />
          {ADDRESS}<br />
          CIN: {CIN}<br />
          Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </address>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold font-headline text-[#191c1e] mb-4 pb-2 border-b border-black/[0.06]">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-[#464555] [&_a]:text-[#3525cd] [&_a]:font-medium [&_a]:underline-offset-2 [&_a]:hover:underline [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_strong]:text-[#191c1e] [&_address]:not-italic [&_address]:leading-7 [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:text-[#191c1e] [&_th]:py-2 [&_th]:pr-4 [&_th]:border-b [&_th]:border-black/[0.06] [&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:border-black/[0.04]">
        {children}
      </div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-[#191c1e] mb-2">{title}</h3>
      {children}
    </div>
  );
}
