import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  stock?: number;
  slug?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: any, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  syncWithServer: () => Promise<void>;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, qty = 1) => {
        const existing = get().items.find((i) => i.productId === product.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.productId === product.id
                ? { ...i, quantity: i.quantity + qty }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                productId: product.id,
                name: product.name,
                price: product.salePrice ?? product.price,
                quantity: qty,
                imageUrl: product.images?.[0]?.url || null,
                stock: product.stock,
                slug: product.slug,
              },
            ],
          });
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),

      updateQty: (productId, qty) =>
        qty <= 0
          ? get().removeItem(productId)
          : set({
              items: get().items.map((i) =>
                i.productId === productId ? { ...i, quantity: qty } : i
              ),
            }),

      clearCart: () => set({ items: [] }),

      toggleCart: () => set({ isOpen: !get().isOpen }),

      syncWithServer: async () => {
        try {
          const { data } = await api.get("/cart");
          if (data.data?.items) {
            set({
              items: data.data.items.map((item: any) => ({
                productId: item.productId,
                name: item.product?.name || "",
                price: item.price,
                quantity: item.quantity,
                imageUrl: item.product?.imageUrl || null,
                stock: item.product?.stock,
                slug: item.product?.slug,
              })),
            });
          }
        } catch {
          // Not logged in or server unavailable - use local cart
        }
      },

      total: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "instamart-cart" }
  )
);
