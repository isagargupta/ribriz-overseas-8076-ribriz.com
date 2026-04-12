"use client";

import { useEffect } from "react";
import { sendCapiEvent } from "@/lib/capi";

export function CapiPageView() {
  useEffect(() => {
    sendCapiEvent({
      event_name: "PageView",
      event_id: `pv_${Date.now()}`,
    });
  }, []);

  return null;
}
