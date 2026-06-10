import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  withCredentials: true,
});

// Attach access token, visitor ID, and store context
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const visitorId = localStorage.getItem("visitorId");
    if (visitorId) {
      config.headers["x-visitor-id"] = visitorId;
    }

    // Attach storeId from persisted store
    try {
      const raw = localStorage.getItem("instamart-store");
      if (raw) {
        const parsed = JSON.parse(raw);
        const storeId = parsed?.state?.currentStore?.id;
        if (storeId) {
          config.params = { ...config.params, storeId };
        }
      }
    } catch {}
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh if there's no token (anonymous user)
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (data.data?.accessToken) {
          localStorage.setItem("accessToken", data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem("accessToken");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

// ── Tracking helper ──

export type TrackingEventType =
  | "product_click"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_start"
  | "checkout_complete";

/**
 * Fire-and-forget tracking event. Never throws.
 */
export function trackEvent(
  eventType: TrackingEventType,
  productId?: string,
  metadata?: Record<string, any>
) {
  api
    .post("/suggestions/track-event", { eventType, productId, metadata })
    .catch(() => {});
}

export default api;
