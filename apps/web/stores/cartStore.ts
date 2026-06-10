import { create } from "zustand";
import { persist } from "zustand/middleware";
import api, { trackEvent } from "@/lib/api";

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
  coupon: CouponInfo | null;
  couponLoading: boolean;
  storeId: string | null;
  setStoreId: (storeId: string | null) => void;
  addItem: (product: any, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  syncWithServer: () => Promise<void>;
  syncToServer: () => Promise<void>;
  validateStock: () => Promise<StockIssue[]>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  subtotal: () => number;
  couponDiscount: () => number;
  total: () => number;
  itemCount: () => number;
}

interface CouponInfo {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number | null;
  expiresAt: string | null;
}

interface StockIssue {
  productId: string;
  name: string;
  type: 'out_of_stock' | 'reduced_stock';
  availableStock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  coupon: CouponInfo | null;
  couponLoading: boolean;
  addItem: (product: any, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  syncWithServer: () => Promise<void>;
  syncToServer: () => Promise<void>;
  validateStock: () => Promise<StockIssue[]>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  subtotal: () => number;
  couponDiscount: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      coupon: null,
      couponLoading: false,
      storeId: null,

      setStoreId: (storeId) => set({ storeId }),

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

      removeItem: (productId) => {
        const item = get().items.find((i) => i.productId === productId);
        if (item) {
          trackEvent("remove_from_cart", productId, { name: item.name });
        }
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      updateQty: (productId, qty) =>
        qty <= 0
          ? get().removeItem(productId)
          : set({
              items: get().items.map((i) =>
                i.productId === productId ? { ...i, quantity: qty } : i
              ),
            }),

      clearCart: () => set({ items: [], coupon: null, storeId: null }),

      toggleCart: () => set({ isOpen: !get().isOpen }),

      syncToServer: async () => {
        const items = get().items;
        const storeId = get().storeId;
        if (items.length === 0) return;
        // Single API call: replace entire server cart with local items
        await api.post("/cart/sync", {
          storeId,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
      },

      syncWithServer: async () => {
        try {
          const { data } = await api.get("/cart");
          const serverItems = data.data?.items || [];
          const localItems = get().items;

          if (serverItems.length === 0 && localItems.length > 0) {
            // Server cart is empty but user has local items (e.g. just logged in)
            // Upload local cart to server first
            await get().syncToServer();
            // Now fetch the synced cart from server
            const { data: synced } = await api.get("/cart");
            if (synced.data?.items) {
              set({
                items: synced.data.items.map((item: any) => ({
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
          } else if (serverItems.length > 0) {
            // Server has items — use server cart (authoritative)
            set({
              items: serverItems.map((item: any) => ({
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
          // If both empty, do nothing
        } catch {
          // Not logged in or server unavailable - use local cart
        }
      },

      validateStock: async () => {
        const issues: StockIssue[] = [];
        const currentItems = get().items;

        if (currentItems.length === 0) return issues;

        try {
          // Fetch fresh stock data for all items in cart
          const productIds = currentItems.map((i) => i.productId);
          const { data } = await api.post("/products/stock-check", { productIds });
          const stockMap: Record<string, { stock: number; isAvailable: boolean }> = data.data || {};

          const updatedItems = currentItems.map((item) => {
            const fresh = stockMap[item.productId];
            if (!fresh) return item;

            if (!fresh.isAvailable || fresh.stock <= 0) {
              issues.push({
                productId: item.productId,
                name: item.name,
                type: 'out_of_stock',
                availableStock: 0,
              });
              return { ...item, stock: 0 };
            }

            if (item.quantity > fresh.stock) {
              issues.push({
                productId: item.productId,
                name: item.name,
                type: 'reduced_stock',
                availableStock: fresh.stock,
              });
              return { ...item, quantity: fresh.stock, stock: fresh.stock };
            }

            return { ...item, stock: fresh.stock };
          });

          // Auto-fix quantities for reduced stock items
          if (issues.length > 0) {
            set({ items: updatedItems });
          }
        } catch {
          // Server unavailable - can't validate
        }

        return issues;
      },

      applyCoupon: async (code: string) => {
        set({ couponLoading: true });
        try {
          const { data } = await api.post("/cart/coupon", { code });
          const c = data.data;
          set({
            coupon: {
              code: c.code,
              discountType: c.discountType,
              discountValue: Number(c.discountValue),
              maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
              minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
              expiresAt: c.expiresAt || null,
            },
            couponLoading: false,
          });
          return true;
        } catch (error: any) {
          set({ coupon: null, couponLoading: false });
          throw new Error(error.response?.data?.message || "Invalid coupon code");
        }
      },

      removeCoupon: () => set({ coupon: null }),

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      couponDiscount: () => {
        const coupon = get().coupon;
        const subtotal = get().subtotal();
        if (!coupon) return 0;
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) return 0;

        if (coupon.discountType === "PERCENTAGE") {
          const discount = subtotal * (coupon.discountValue / 100);
          return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
        }
        return Math.min(coupon.discountValue, subtotal);
      },

      total: () => {
        const subtotal = get().subtotal();
        const discount = get().couponDiscount();
        return subtotal - discount;
      },

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "instamart-cart",
      partialize: (state) => ({ items: state.items, coupon: state.coupon, storeId: state.storeId }),
    }
  )
);
