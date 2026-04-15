import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions governing use of the RIBRIZ platform.",
};

const EFFECTIVE_DATE = "23 April 2024";
const CONTACT_EMAIL = "sgupta@ribriz.com";
const COMPANY_NAME = "RIBRIZ OVERSEAS VENTURES PRIVATE LIMITED";
const ADDRESS = "Unit 101, Oxford Towers, 139, HAL Old Airport Rd, H.A.L II Stage, Bangalore North, Bangalore – 560008, Karnataka, India";
const CIN = "U85499KA2024PTC187740";

export default function TermsPage() {
  return (
    <article>
      <header className="mb-12 pb-8 border-b border-black/[0.06]">
        <p className="text-xs font-bold uppercase tracking-widest text-[#3525cd] mb-3">Legal</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter font-headline text-[#191c1e] mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-[#777587]">
          Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: April 2025
        </p>
      </header>

      <Section title="1. Acceptance of Terms">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) form a legally binding agreement between you
          (&ldquo;User&rdquo;, &ldquo;you&rdquo;) and {COMPANY_NAME} (&ldquo;RIBRIZ&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;), CIN {CIN}, governing your access to and use of ribriz.com and the RIBRIZ platform
          (the &ldquo;Service&rdquo;).
        </p>
        <p>
          By registering for an account or using the Service, you confirm that you are at least 18 years of age,
          have read and understood these Terms, and agree to be bound by them. If you do not agree, you may not
          use the Service.
        </p>
      </Section>

      <Section title="2. Description of the Service">
        <p>
          RIBRIZ is an AI-powered study abroad platform that provides tools including, but not limited to:
        </p>
        <ul>
          <li>University search, shortlisting, and AI-driven admission-chance prediction.</li>
          <li>AI-generated Statement of Purpose (SOP) drafting and editing.</li>
          <li>Application tracking and document management.</li>
          <li>Scholarship discovery and visa guidance.</li>
          <li>AI interview preparation and candidate-profile building.</li>
        </ul>
        <p>
          The Service is a technology tool and is <strong>not a licensed immigration adviser, recruitment agent,
          or educational consultancy</strong>. Outputs from AI features are for informational purposes only and
          do not constitute professional advice. RIBRIZ does not guarantee admission to any university.
        </p>
      </Section>

      <Section title="3. Accounts and Registration">
        <p>
          You must provide accurate, complete, and current information during registration and keep your account
          details up to date. You are responsible for maintaining the confidentiality of your login credentials
          and for all activity that occurs under your account. Notify us immediately at {CONTACT_EMAIL} if you
          suspect unauthorised access.
        </p>
        <p>
          One person may hold only one account. Accounts are non-transferable. We reserve the right to suspend
          or terminate accounts that violate these Terms or that we reasonably believe have been compromised.
        </p>
      </Section>

      <Section title="4. Subscriptions, Credits, and Payments">
        <Subsection title="4.1 Plans">
          <p>
            The Service is offered under free and paid subscription plans. Paid plans are billed on a recurring
            monthly or annual basis as selected at the time of purchase.
          </p>
        </Subsection>
        <Subsection title="4.2 AI Credits">
          <p>
            Certain AI features consume &ldquo;credits&rdquo; included with your plan or purchasable separately.
            Credits are non-transferable, have no cash value, and expire if unused within 12 months of purchase
            or upon account deletion.
          </p>
        </Subsection>
        <Subsection title="4.3 Pricing and Taxes">
          <p>
            All prices are displayed in Indian Rupees (INR) and are exclusive of applicable Goods and Services
            Tax (GST). GST will be added at checkout where applicable. We reserve the right to change prices
            upon 30 days&rsquo; notice.
          </p>
        </Subsection>
        <Subsection title="4.4 Payment Processing">
          <p>
            Payments are processed by Razorpay Software Pvt. Ltd. By providing payment details you authorise
            the applicable charges. RIBRIZ does not store card or bank account numbers.
          </p>
        </Subsection>
        <Subsection title="4.5 Auto-renewal">
          <p>
            Paid subscriptions renew automatically at the end of each billing cycle. You may cancel
            auto-renewal at any time through account settings; cancellation takes effect at the end of the
            current billing period. See our <a href="/refund">Refund Policy</a> for details on refunds.
          </p>
        </Subsection>
      </Section>

      <Section title="5. Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose or in violation of any applicable law or regulation.</li>
          <li>Submit false, misleading, or fraudulent information to universities using AI-generated content.</li>
          <li>Reverse-engineer, decompile, or attempt to extract the source code of the platform.</li>
          <li>Scrape, crawl, or harvest data from the Service without written permission.</li>
          <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
          <li>Resell or sublicense access to the Service without prior written consent.</li>
          <li>Use the Service to transmit spam, malware, or other harmful content.</li>
          <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
        </ul>
      </Section>

      <Section title="6. AI-Generated Content">
        <p>
          Our platform uses large language models to generate content such as SOPs, cover letters, and
          interview responses (&ldquo;AI Content&rdquo;). You acknowledge that:
        </p>
        <ul>
          <li>AI Content may contain inaccuracies or hallucinations. You must review and verify all AI Content before use.</li>
          <li>You are solely responsible for the content you submit to universities and for ensuring it accurately represents your qualifications and experiences.</li>
          <li>Submitting AI Content to universities without disclosure may violate their academic-integrity policies; it is your responsibility to comply with applicable rules.</li>
          <li>University acceptance criteria, deadlines, and admission outcomes are outside our control.</li>
        </ul>
      </Section>

      <Section title="7. Intellectual Property">
        <Subsection title="7.1 Platform IP">
          <p>
            All rights, title, and interest in the Service, including software, algorithms, branding, and
            website content, are owned by RIBRIZ or its licensors. Nothing in these Terms transfers any
            ownership to you.
          </p>
        </Subsection>
        <Subsection title="7.2 Your content">
          <p>
            You retain ownership of documents, data, and content you upload (&ldquo;User Content&rdquo;). By
            uploading User Content you grant RIBRIZ a limited, non-exclusive, royalty-free licence to process,
            store, and display it solely to provide the Service to you.
          </p>
        </Subsection>
        <Subsection title="7.3 AI Content ownership">
          <p>
            Subject to your compliance with these Terms and full payment of applicable fees, AI Content
            generated specifically for you is assigned to you upon creation. RIBRIZ retains no claim over it.
          </p>
        </Subsection>
      </Section>

      <Section title="8. Third-Party Services and Links">
        <p>
          The Service may contain links to third-party websites or integrate with third-party services
          (e.g., university portals, scholarship databases). RIBRIZ does not endorse and is not responsible for
          the content, privacy practices, or reliability of third-party services. Your use of such services is
          governed by their own terms.
        </p>
      </Section>

      <Section title="9. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY
          KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          OR NON-INFRINGEMENT. RIBRIZ DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
          FREE OF VIRUSES. AI PREDICTIONS OF ADMISSION CHANCES ARE STATISTICAL ESTIMATES ONLY AND DO NOT
          GUARANTEE ANY OUTCOME.
        </p>
      </Section>

      <Section title="10. Limitation of Liability">
        <p>
          TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, RIBRIZ, ITS DIRECTORS, EMPLOYEES, AND AGENTS
          SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
          INCLUDING LOSS OF PROFITS, LOSS OF DATA, OR LOSS OF GOODWILL, ARISING OUT OF OR IN CONNECTION WITH
          YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          IN ANY EVENT, RIBRIZ&rsquo;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED
          TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO RIBRIZ IN THE 12 MONTHS PRECEDING THE CLAIM.
        </p>
      </Section>

      <Section title="11. Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless RIBRIZ and its officers, directors, employees, and
          agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable
          legal fees) arising out of or related to your use of the Service, your User Content, or your violation
          of these Terms or any applicable law.
        </p>
      </Section>

      <Section title="12. Termination">
        <p>
          You may close your account at any time through account settings. We may suspend or terminate your
          account immediately and without notice if you materially breach these Terms, engage in fraudulent
          activity, or if we are legally required to do so.
        </p>
        <p>
          Upon termination, your right to use the Service ceases immediately. Sections 7 (Intellectual
          Property), 9 (Disclaimers), 10 (Limitation of Liability), 11 (Indemnification), and 13 (Governing
          Law) survive termination.
        </p>
      </Section>

      <Section title="13. Governing Law and Dispute Resolution">
        <p>
          These Terms are governed by and construed in accordance with the laws of India, without regard to
          conflict-of-law principles. Any dispute arising out of or in connection with these Terms shall be
          subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India.
        </p>
        <p>
          Before commencing formal proceedings, the parties agree to attempt to resolve disputes amicably by
          notifying RIBRIZ at {CONTACT_EMAIL} and allowing 30 days for resolution.
        </p>
      </Section>

      <Section title="14. Modifications to the Terms">
        <p>
          We may modify these Terms at any time. Material changes will be communicated by email or in-app
          notification at least 14 days before taking effect. Your continued use of the Service after the
          effective date constitutes acceptance of the revised Terms. If you do not agree to the changes, you
          must stop using the Service before the effective date.
        </p>
      </Section>

      <Section title="15. Miscellaneous">
        <ul>
          <li><strong>Entire agreement:</strong> These Terms, together with our Privacy Policy, Refund Policy, and Cookie Policy, constitute the entire agreement between you and RIBRIZ regarding the Service.</li>
          <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in full force.</li>
          <li><strong>No waiver:</strong> Failure to enforce any provision of these Terms shall not constitute a waiver of future enforcement.</li>
          <li><strong>Assignment:</strong> You may not assign your rights under these Terms without our prior written consent. RIBRIZ may assign its rights freely in connection with a merger or acquisition.</li>
        </ul>
      </Section>

      <Section title="16. Contact Us">
        <p>Questions about these Terms should be directed to:</p>
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
      <div className="space-y-3 text-[15px] leading-relaxed text-[#464555] [&_a]:text-[#3525cd] [&_a]:font-medium [&_a]:underline-offset-2 [&_a]:hover:underline [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_strong]:text-[#191c1e] [&_address]:not-italic [&_address]:leading-7">
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
