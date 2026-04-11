"use client";

import { useState, useEffect } from "react";
import { CreditProvider } from "@/contexts/credits";
import { CreditGateModal } from "@/components/ui/credit-gate-modal";

export function DashboardMain({
  children,
  initialCredits,
}: {
  children: React.ReactNode;
  initialCredits?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCollapsed(detail.collapsed);
    };
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, []);

  return (
    <CreditProvider initialCredits={initialCredits ?? 0}>
      <main
        className={`min-h-screen bg-surface transition-all duration-300
          ${collapsed ? "md:ml-[68px]" : "md:ml-[256px]"}`}
      >
        {children}
      </main>
      <CreditGateModal />
    </CreditProvider>
  );
}
