import { useCartStore } from "@/stores/cartStore";

export function useCart() {
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const coupon = useCartStore((state) => state.coupon);
  const couponLoading = useCartStore((state) => state.couponLoading);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQty = useCartStore((state) => state.updateQty);
  const clearCart = useCartStore((state) => state.clearCart);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const removeCoupon = useCartStore((state) => state.removeCoupon);
  const total = useCartStore((state) => state.total());
  const subtotal = useCartStore((state) => state.subtotal());
  const couponDiscount = useCartStore((state) => state.couponDiscount());
  const itemCount = useCartStore((state) => state.itemCount());

  return {
    items,
    isOpen,
    coupon,
    couponLoading,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    toggleCart,
    applyCoupon,
    removeCoupon,
    total,
    subtotal,
    couponDiscount,
    itemCount,
  };
}
