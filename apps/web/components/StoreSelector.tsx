"use client";

import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useStoreStore } from "@/stores/storeStore";
import { useCartStore } from "@/stores/cartStore";
import toast from "react-hot-toast";

export function StoreSelector() {
  const { currentStore, availableStores, setStore, detectStore, location, notServiceable, loading } = useStoreStore();
  const clearCart = useCartStore((s) => s.clearCart);
  const [open, setOpen] = useState(false);

  if (loading || !currentStore) return null;

  const handleChange = async (store: any) => {
    if (store.id === currentStore?.id) {
      setOpen(false);
      return;
    }

    // Verify the new store serves the user's location
    if (location) {
      try {
        const { default: api } = await import("@/lib/api");
        const { data } = await api.get(`/stores/${store.id}/verify?lat=${location.lat}&lng=${location.lng}`);
        if (!data.data?.serves) {
          toast.error("This store doesn't serve your area. Please choose a nearer store.");
          return;
        }
      } catch {
        // If verify fails, allow anyway
      }
    }

    // Switching stores — clear cart
    if (useCartStore.getState().items.length > 0) {
      clearCart();
      toast.success("Cart cleared for the new store");
    }

    setStore(store);
    setOpen(false);
  };

  if (loading || !currentStore) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-1 text-xs text-gray-600 hover:text-primary-600"
      >
        <MapPin className="h-3 w-3" />
        <span>{currentStore.name}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[200px] py-1">
            {availableStores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleChange(store)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  store.id === currentStore.id ? "text-primary-600 font-medium" : "text-gray-700"
                }`}
              >
                <div className="font-medium">{store.name}</div>
                <div className="text-xs text-gray-400">{store.city}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
