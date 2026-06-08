"use client";

import { useEffect } from "react";

/**
 * Generates a unique visitor ID on first visit and stores it in localStorage.
 * This ID is sent with all API requests via the x-visitor-id header,
 * enabling anonymous tracking of searches, views, and funnel events.
 */
export function VisitorInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = localStorage.getItem("visitorId");
    if (existing) return;

    // Generate a unique visitor ID (UUID v4)
    const visitorId = crypto.randomUUID
      ? crypto.randomUUID()
      : "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

    localStorage.setItem("visitorId", visitorId);
  }, []);

  return null;
}
