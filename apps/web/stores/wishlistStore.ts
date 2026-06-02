import { create } from "zustand";
import api from "@/lib/api";
import { useAuthStore } from "./authStore";

export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    discountPercent: number;
    stock: number;
    unit: string;
    isAvailable: boolean;
    image: string | null;
    category: { id: string; name: string; slug: string } | null;
  };
}

interface WishlistState {
  items: WishlistItem[];
  itemIds: Set<string>;
  isLoading: boolean;
  fetchWishlist: () => Promise<void>;
  toggleItem: (productId: string) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  checkItems: (productIds: string[]) => Promise<void>;
  count: () => number;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items: [],
  itemIds: new Set<string>(),
  isLoading: false,

  fetchWishlist: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ items: [], itemIds: new Set() });
      return;
    }

    set({ isLoading: true });
    try {
      const { data } = await api.get("/wishlist");
      const items = data.data || [];
      set({
        items,
        itemIds: new Set(items.map((i: WishlistItem) => i.productId)),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleItem: async (productId) => {
    try {
      const { data } = await api.post("/wishlist/toggle", { productId });
      const inWishlist = data.data?.inWishlist === true;

      if (inWishlist) {
        const newIds = new Set(Array.from(get().itemIds));
        newIds.add(productId);
        set({ itemIds: newIds });
      } else {
        const newIds = new Set(Array.from(get().itemIds));
        newIds.delete(productId);
        set({ itemIds: newIds, items: get().items.filter((i) => i.productId !== productId) });
      }

      return inWishlist;
    } catch {
      return get().itemIds.has(productId);
    }
  },

  isInWishlist: (productId) => {
    return get().itemIds.has(productId);
  },

  checkItems: async (productIds) => {
    const user = useAuthStore.getState().user;
    if (!user || productIds.length === 0) return;

    try {
      const { data } = await api.post("/wishlist/check", { productIds });
      const map = data.data || {};
      // Merge with existing itemIds instead of replacing
      const newIds = new Set(Array.from(get().itemIds));
      for (const [id, inList] of Object.entries(map)) {
        if (inList) {
          newIds.add(id);
        } else {
          newIds.delete(id);
        }
      }
      set({ itemIds: newIds });
    } catch {
      // Ignore - will fetch on page load
    }
  },

  count: () => get().itemIds.size,
}));
