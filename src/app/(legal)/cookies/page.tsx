import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How RIBRIZ uses cookies and similar tracking technologies.",
};

const EFFECTIVE_DATE = "23 April 2024";
const CONTACT_EMAIL = "privacy@ribriz.com";
const COMPANY_NAME = "RIBRIZ OVERSEAS VENTURES PRIVATE LIMITED";
const ADDRESS = "Unit 101, Oxford Towers, 139, HAL Old Airport Rd, H.A.L II Stage, Bangalore North, Bangalore – 560008, Karnataka, India";
const CIN = "U85499KA2024PTC187740";

export default function CookiesPage() {
  return (
    <article>
      <header className="mb-12 pb-8 border-b border-black/[0.06]">
        <p className="text-xs font-bold uppercase tracking-widest text-[#3525cd] mb-3">Legal</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter font-headline text-[#191c1e] mb-4">
          Cookie Policy
        </h1>
        <p className="text-sm text-[#777587]">
          Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: April 2025
        </p>
      </header>

      <Section title="1. What Are Cookies?">
        <p>
          Cookies are small text files placed on your device when you visit a website. They are widely used to
          make websites work, improve their efficiency, and provide information to website owners. Similar
          technologies include local storage, session storage, and pixels.
        </p>
        <p>
          This Cookie Policy explains how {COMPANY_NAME} (&ldquo;RIBRIZ&rdquo;) uses cookies and similar
          technologies on ribriz.com and describes your choices regarding their use.
        </p>
      </Section>

      <Section title="2. Cookies We Use">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Purpose</th>
              <th>Examples</th>
              <th>Required?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Strictly Necessary</strong></td>
              <td>Enable core functionality: authentication sessions, security tokens, load-balancing.</td>
              <td>Supabase auth session cookie, CSRF token</td>
              <td>Yes — cannot be disabled</td>
            </tr>
            <tr>
              <td><strong>Functional</strong></td>
              <td>Remember your preferences: theme (light/dark), language, and UI state.</td>
              <td><code>theme</code> (localStorage)</td>
              <td>No — optional</td>
            </tr>
            <tr>
              <td><strong>Analytics</strong></td>
              <td>Understand how users interact with the platform so we can improve it. Data is aggregated and anonymised where possible.</td>
              <td>First-party analytics events</td>
              <td>No — optional</td>
            </tr>
            <tr>
              <td><strong>Payment</strong></td>
              <td>Support secure payment flows via Razorpay.</td>
              <td>Razorpay session identifiers</td>
              <td>Yes, when making a payment</td>
            </tr>
          </tbody>
        </table>
        <p>
          We do <strong>not</strong> use advertising or cross-site tracking cookies.
        </p>
      </Section>

      <Section title="3. Third-Party Cookies">
        <p>
          Some of our service providers set their own cookies when delivering their services. These providers
          have their own privacy and cookie policies which govern how they use that data:
        </p>
        <ul>
          <li><strong>Supabase</strong> — authentication infrastructure.</li>
          <li><strong>Razorpay</strong> — payment processing.</li>
          <li><strong>Sentry</strong> — error monitoring (session replay may use in-memory storage, no persistent cookie).</li>
        </ul>
      </Section>

      <Section title="4. Local Storage and Session Storage">
        <p>
          In addition to cookies, we use the browser&rsquo;s localStorage and sessionStorage APIs to store
          small amounts of data on your device. This includes:
        </p>
        <ul>
          <li>Your selected colour theme (light or dark mode).</li>
          <li>Temporary form state to prevent data loss if you navigate away accidentally.</li>
          <li>Cached, non-sensitive API responses to reduce loading times.</li>
        </ul>
        <p>
          Local storage data is not transmitted to our servers automatically and is cleared when you clear your
          browser&rsquo;s site data.
        </p>
      </Section>

      <Section title="5. Your Choices and How to Control Cookies">
        <Subsection title="5.1 Browser settings">
          <p>
            Most browsers allow you to view, block, or delete cookies through their settings. Blocking strictly
            necessary cookies will prevent the platform from functioning correctly (you will not be able to log
            in).
          </p>
          <p>Links to cookie settings for common browsers:</p>
          <ul>
            <li>Google Chrome — Settings → Privacy and security → Cookies and other site data</li>
            <li>Mozilla Firefox — Preferences → Privacy &amp; Security → Cookies and Site Data</li>
            <li>Apple Safari — Preferences → Privacy → Manage Website Data</li>
            <li>Microsoft Edge — Settings → Cookies and site permissions</li>
          </ul>
        </Subsection>
        <Subsection title="5.2 Opt-out of analytics">
          <p>
            You may opt out of analytics data collection at any time through the &ldquo;Privacy&rdquo; section
            in your account settings. Opting out does not affect platform functionality.
          </p>
        </Subsection>
      </Section>

      <Section title="6. Retention">
        <p>
          Session cookies are deleted when you close your browser. Persistent cookies remain on your device for
          a set period or until you delete them. Authentication cookies typically expire after 30 days of
          inactivity or when you sign out.
        </p>
      </Section>

      <Section title="7. Changes to This Policy">
        <p>
          We may update this Cookie Policy from time to time to reflect changes in technology or law. When we
          do, we will update the &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to
          review this page periodically.
        </p>
      </Section>

      <Section title="8. Contact Us">
        <p>If you have questions about our use of cookies, contact us at:</p>
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
      <div className="space-y-3 text-[15px] leading-relaxed text-[#464555] [&_a]:text-[#3525cd] [&_a]:font-medium [&_a]:underline-offset-2 [&_a]:hover:underline [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_strong]:text-[#191c1e] [&_address]:not-italic [&_address]:leading-7 [&_code]:text-xs [&_code]:font-mono [&_code]:bg-[#f2f4f6] [&_code]:px-1.5 [&_code]:py-0.5 [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:text-[#191c1e] [&_th]:py-2 [&_th]:pr-4 [&_th]:border-b [&_th]:border-black/[0.06] [&_td]:py-2.5 [&_td]:pr-4 [&_td]:border-b [&_td]:border-black/[0.04] [&_td]:align-top">
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
