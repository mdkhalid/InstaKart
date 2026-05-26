import { useCartStore } from "@/stores/cartStore";

export function useCart() {
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQty = useCartStore((state) => state.updateQty);
  const clearCart = useCartStore((state) => state.clearCart);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const total = useCartStore((state) => state.total());
  const itemCount = useCartStore((state) => state.itemCount());

  return {
    items,
    isOpen,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    toggleCart,
    total,
    itemCount,
  };
}
