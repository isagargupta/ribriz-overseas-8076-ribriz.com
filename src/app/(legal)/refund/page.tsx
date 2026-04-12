import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "RIBRIZ refund and cancellation policy for subscriptions and credits.",
};

const EFFECTIVE_DATE = "23 April 2024";
const CONTACT_EMAIL = "billing@ribriz.com";
const COMPANY_NAME = "RIBRIZ OVERSEAS VENTURES PRIVATE LIMITED";
const ADDRESS = "Unit 101, Oxford Towers, 139, HAL Old Airport Rd, H.A.L II Stage, Bangalore North, Bangalore – 560008, Karnataka, India";
const CIN = "U85499KA2024PTC187740";

export default function RefundPage() {
  return (
    <article>
      <header className="mb-12 pb-8 border-b border-black/[0.06]">
        <p className="text-xs font-bold uppercase tracking-widest text-[#3525cd] mb-3">Legal</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter font-headline text-[#191c1e] mb-4">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="text-sm text-[#777587]">
          Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: April 2025
        </p>
      </header>

      <Section title="1. Overview">
        <p>
          This Refund and Cancellation Policy explains when and how {COMPANY_NAME} (&ldquo;RIBRIZ&rdquo;)
          issues refunds for subscription plans and AI credit purchases on ribriz.com.
        </p>
        <p>
          All transactions are subject to the Consumer Protection Act, 2019 and applicable Indian law.
          Please read this policy carefully before purchasing any paid plan or add-on.
        </p>
      </Section>

      <Section title="2. Subscription Plans">
        <Subsection title="2.1 Monthly subscriptions">
          <p>
            Monthly subscriptions renew automatically every 30 days. We offer a <strong>7-day money-back
            guarantee</strong> on first-time purchases of a monthly plan. If you are not satisfied for any
            reason, contact us within 7 days of the initial charge for a full refund.
          </p>
          <p>
            After the 7-day window, monthly subscription fees are <strong>non-refundable</strong>. You may
            cancel at any time; your access continues until the end of the current billing cycle and will not
            renew.
          </p>
        </Subsection>
        <Subsection title="2.2 Annual subscriptions">
          <p>
            Annual subscriptions offer a discounted rate in exchange for an upfront yearly commitment. We offer
            a <strong>14-day money-back guarantee</strong> on first-time annual purchases. Contact us within
            14 days of the charge for a full refund.
          </p>
          <p>
            After the 14-day window, annual subscription fees are <strong>non-refundable</strong>, including
            for partial-year usage. You may cancel auto-renewal at any time; your access continues until the
            end of the annual period.
          </p>
        </Subsection>
        <Subsection title="2.3 Plan upgrades">
          <p>
            When you upgrade from a lower-tier plan to a higher-tier plan mid-cycle, you will be charged a
            prorated amount for the remainder of the billing period. The upgrade charge is non-refundable.
          </p>
        </Subsection>
        <Subsection title="2.4 Plan downgrades">
          <p>
            Downgrades take effect at the start of the next billing cycle. No refund or credit is issued for
            the unused portion of the current period.
          </p>
        </Subsection>
      </Section>

      <Section title="3. AI Credit Purchases">
        <p>
          AI credit top-ups (purchased separately from a subscription plan) are <strong>non-refundable</strong>
          once the transaction is complete. Credits are non-transferable and have no cash value. Unused credits
          expire 12 months from the date of purchase or upon account deletion, whichever is earlier.
        </p>
        <p>
          Exception: if credits were charged due to a verified platform error (e.g., a billing bug that
          debited your account without delivering the credits), we will issue a full refund or credit
          restoration upon investigation.
        </p>
      </Section>

      <Section title="4. Free Plan">
        <p>
          The free plan carries no charges and is therefore not subject to this refund policy.
        </p>
      </Section>

      <Section title="5. Technical Failures and Service Outages">
        <p>
          If the platform is unavailable for a continuous period exceeding <strong>72 hours</strong> due to a
          failure on our end (excluding scheduled maintenance or force-majeure events), you may request a
          prorated credit for the affected period. We will evaluate such requests on a case-by-case basis and
          issue account credits (not cash refunds) where warranted.
        </p>
      </Section>

      <Section title="6. Duplicate or Erroneous Charges">
        <p>
          If you believe you have been charged in error or charged twice for the same purchase, contact us
          within 30 days of the transaction date with the following details:
        </p>
        <ul>
          <li>Registered email address</li>
          <li>Razorpay transaction or order ID</li>
          <li>Description of the issue</li>
        </ul>
        <p>
          We will investigate and, where a billing error is confirmed, process a full refund or credit within
          10 business days.
        </p>
      </Section>

      <Section title="7. How to Request a Refund">
        <p>To request a refund within an eligible window:</p>
        <ol>
          <li>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the subject line &ldquo;Refund Request — [your registered email]&rdquo;.</li>
          <li>Include your registered email, the plan or product purchased, the transaction date, and the reason for your request.</li>
          <li>Our billing team will respond within <strong>3 business days</strong> to confirm eligibility and initiate the process.</li>
        </ol>
        <p>
          Approved refunds are returned to the original payment method. Processing time depends on your bank
          or card issuer but is typically <strong>5–10 business days</strong> after we initiate the refund.
        </p>
      </Section>

      <Section title="8. Chargebacks">
        <p>
          We strongly encourage you to contact us before initiating a chargeback with your bank or card issuer.
          Unauthorised chargebacks may result in account suspension pending investigation. Where a chargeback is
          found to be unwarranted, we reserve the right to dispute it and recover the amount plus any associated
          fees.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this policy from time to time. Changes will be posted on this page with an updated
          effective date. Continued use of the Service after a change is posted constitutes acceptance of the
          updated policy.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p>For refund or billing queries, contact our billing team:</p>
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
      <div className="space-y-3 text-[15px] leading-relaxed text-[#464555] [&_a]:text-[#3525cd] [&_a]:font-medium [&_a]:underline-offset-2 [&_a]:hover:underline [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_strong]:text-[#191c1e] [&_address]:not-italic [&_address]:leading-7">
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
