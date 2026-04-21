"use client";

import { CreditProvider } from "@/contexts/credits";
import { CreditGateModal } from "@/components/ui/credit-gate-modal";

export function DashboardMain({
  children,
  initialCredits,
}: {
  children: React.ReactNode;
  initialCredits?: number;
}) {
  return (
    <CreditProvider initialCredits={initialCredits ?? 0}>
      <main className="min-h-screen bg-surface md:ml-[68px]">
        {children}
      </main>
      <CreditGateModal />
    </CreditProvider>
  );
}
