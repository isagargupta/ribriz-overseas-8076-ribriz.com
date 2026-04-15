import type { Metadata } from "next";
import { LandingPage } from "./landing-page";

export const metadata: Metadata = {
  title: "RIBRIZ — AI-Powered Study Abroad Platform for Students",
  description:
    "Match with universities, predict your admission chances with AI, generate SOPs, and track applications — all without an agent. Free to start. Trusted by 12,000+ students across 15+ countries.",
  keywords: [
    "study abroad",
    "AI university matching",
    "admission prediction",
    "SOP generator",
    "study abroad without agent",
    "university application platform",
    "study abroad AI",
    "RIBRIZ",
    "overseas education",
    "MS abroad",
    "MBA abroad",
    "study in Canada",
    "study in Germany",
    "study in Australia",
  ],
  authors: [{ name: "RIBRIZ" }],
  creator: "RIBRIZ",
  publisher: "RIBRIZ",
  metadataBase: new URL("https://ribriz.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://ribriz.com",
    siteName: "RIBRIZ",
    title: "RIBRIZ — AI-Powered Study Abroad Platform",
    description:
      "Match with universities, predict admission chances, and generate SOPs with AI. No agent needed. Free to start.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RIBRIZ — AI-Powered Study Abroad Platform",
    description:
      "Match with universities, predict admission chances, and generate SOPs with AI. No agent needed. Free to start.",
    creator: "@ribriz",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "RIBRIZ",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            description:
              "AI-powered study abroad platform. Match with universities, predict admission chances, generate SOPs, and track applications — all without an agent.",
            url: "https://ribriz.com",
            offers: [
              {
                "@type": "Offer",
                price: "0",
                priceCurrency: "INR",
                name: "Free",
                description: "Profile assessment, basic search, 3 university matches",
              },
              {
                "@type": "Offer",
                price: "2999",
                priceCurrency: "INR",
                name: "Explorer",
                description:
                  "Unlimited matching, admission scoring, document checklists, application tracker",
              },
              {
                "@type": "Offer",
                price: "9999",
                priceCurrency: "INR",
                name: "Pro",
                description:
                  "AI SOP assistant, priority support, visa counseling, 1-on-1 expert session",
              },
            ],
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.8",
              ratingCount: "1200",
              bestRating: "5",
            },
            featureList: [
              "AI university matching",
              "Admission chance prediction",
              "AI SOP writer",
              "Application tracker",
              "Document management",
              "Visa guidance",
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "RIBRIZ",
            url: "https://ribriz.com",
            logo: "https://ribriz.com/favicon.ico",
            description:
              "AI-powered study abroad platform helping students apply to universities without agents.",
            contactPoint: {
              "@type": "ContactPoint",
              email: "sgupta@ribriz.com",
              contactType: "customer support",
            },
            sameAs: [],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "How is RIBRIZ different from a study abroad agent?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Agents earn commissions from universities — so they push institutions that pay them, not the ones right for you. RIBRIZ earns zero from universities. Our recommendations are 100% based on your profile fit. Plus you get AI tools, real-time tracking, and 24/7 access.",
                },
              },
              {
                "@type": "Question",
                name: "Can RIBRIZ actually replace an agent?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "For the vast majority of students, yes. The platform handles university matching, admission scoring, SOP writing, document management, application tracking, and visa guidance.",
                },
              },
              {
                "@type": "Question",
                name: "Is the free plan really free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No catch. Free gives you profile assessment and 3 university matches. We make money when students upgrade for unlimited matching and the SOP tools — not from hidden fees or university commissions.",
                },
              },
              {
                "@type": "Question",
                name: "How accurate is the admission chance scoring?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Our model is trained on historical admission data across 300+ universities. It correctly predicts the outcome 82% of the time with transparent confidence intervals on every score.",
                },
              },
            ],
          }),
        }}
      />
      <LandingPage />
    </>
  );
}
