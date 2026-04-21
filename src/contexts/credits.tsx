"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface CreditContextValue {
  credits: number;
  refreshCredits: () => Promise<void>;
  showCreditGate: (message?: string) => void;
  hideCreditGate: () => void;
  gateVisible: boolean;
  gateMessage: string;
}

const CreditContext = createContext<CreditContextValue | null>(null);

const CREDIT_PATHS = ["/api/ai/chat", "/api/ai/generate-sop", "/api/universities"];

export function CreditProvider({
  children,
  initialCredits = 0,
}: {
  children: ReactNode;
  initialCredits?: number;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const [gateVisible, setGateVisible] = useState(false);
  const [gateMessage, setGateMessage] = useState("You need more credits to continue.");
  const originalFetchRef = useRef<typeof window.fetch | null>(null);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await (originalFetchRef.current ?? window.fetch)("/api/credits");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits ?? 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  const showCreditGate = useCallback((message?: string) => {
    if (message) setGateMessage(message);
    setGateVisible(true);
  }, []);

  const hideCreditGate = useCallback(() => {
    setGateVisible(false);
  }, []);

  // Intercept fetch to catch 402 responses on credit-consuming endpoints
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    originalFetchRef.current = originalFetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);

      if (response.status === 402) {
        // Check if it's one of our credit-consuming paths
        const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].toString() : (args[0] as Request).url;
        const isCreditPath = CREDIT_PATHS.some((p) => url.includes(p));

        if (isCreditPath) {
          // Clone so the caller can still read the body
          const cloned = response.clone();
          try {
            const body = await cloned.json();
            if (body?.upgradeRequired) {
              // Refresh balance so the gate shows accurate count
              refreshCredits();
              showCreditGate(body.error ?? "You've run out of credits. Recharge to continue.");
            }
          } catch {
            // Non-JSON 402 — ignore
          }
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
      originalFetchRef.current = null;
    };
  }, [refreshCredits, showCreditGate]);

  return (
    <CreditContext.Provider
      value={{ credits, refreshCredits, showCreditGate, hideCreditGate, gateVisible, gateMessage }}
    >
      {children}
    </CreditContext.Provider>
  );
}

export function useCreditContext(): CreditContextValue {
  const ctx = useContext(CreditContext);
  if (!ctx) throw new Error("useCreditContext must be used inside CreditProvider");
  return ctx;
}
