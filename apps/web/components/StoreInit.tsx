"use client";

import { useEffect } from "react";
import { useStoreStore } from "@/stores/storeStore";

export function StoreInit() {
  const { currentStore, detectStore, detectByPincode, loading, notServiceable } = useStoreStore();

  useEffect(() => {
    if (currentStore) return; // Already have a store
    if (typeof window === "undefined") return;

    // Check for saved pincode first
    const savedPincode = localStorage.getItem("deliveryPincode");
    if (savedPincode) {
      detectByPincode(savedPincode);
      return;
    }

    // Try geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          detectStore(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Geolocation denied or failed — use default store
          detectStore(19.076, 72.8777); // Default to Mumbai
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    } else {
      detectStore(19.076, 72.8777); // Fallback
    }
  }, []);

  return null;
}
