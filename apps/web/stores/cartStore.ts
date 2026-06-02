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

interface StockIssue {
  productId: string;
  name: string;
  type: 'out_of_stock' | 'reduced_stock';
  availableStock: number;
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
  validateStock: () => Promise<StockIssue[]>;
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

      total: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      itemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "instamart-cart" }
  )
);
