import type { Metadata } from "next";
import { PartnersPage } from "./partners-page";

export const metadata: Metadata = {
  title: "Partner with RIBRIZ — B2B Partnership Program",
  description:
    "Join RIBRIZ's partner network. Offer AI-powered university matching and admission tools to your students. Earn revenue share. Zero tech investment needed.",
  robots: { index: true, follow: true },
};

export default function Page() {
  return <PartnersPage />;
}
