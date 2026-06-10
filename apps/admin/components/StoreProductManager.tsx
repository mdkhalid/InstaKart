"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { Store, ChevronDown, ChevronRight } from "lucide-react";

interface StoreOption {
  id: string;
  name: string;
}

export interface StoreProductForm {
  storeId: string;
  price: string;
  salePrice: string;
  stock: string;
  lowStockAlert: string;
  isAvailable: boolean;
}

interface StoreProductManagerProps {
  value: StoreProductForm[];
  onChange: (value: StoreProductForm[]) => void;
}

export function StoreProductManager({ value, onChange }: StoreProductManagerProps) {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    api.get("/stores")
      .then((res) => {
        const storeList: StoreOption[] = res.data.data || [];
        setStores(storeList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Initialize store product entries for stores not yet in value
  useEffect(() => {
    if (stores.length > 0 && !initialized.current) {
      initialized.current = true;
      const existingIds = new Set(value.map((v) => v.storeId));
      const missing = stores.filter((s) => !existingIds.has(s.id));
      if (missing.length > 0) {
        onChange([
          ...value,
          ...missing.map((s) => ({
            storeId: s.id,
            price: "",
            salePrice: "",
            stock: "0",
            lowStockAlert: "10",
            isAvailable: false,
          })),
        ]);
      }
    }
  }, [stores, value, onChange]);

  const updateStoreProduct = (storeId: string, updates: Partial<StoreProductForm>) => {
    onChange(value.map((sp) => (sp.storeId === storeId ? { ...sp, ...updates } : sp)));
  };

  const getStoreProduct = (storeId: string): StoreProductForm => {
    return value.find((v) => v.storeId === storeId) || {
      storeId,
      price: "",
      salePrice: "",
      stock: "0",
      lowStockAlert: "10",
      isAvailable: false,
    };
  };

  if (loading) {
    return (
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Store Availability & Pricing</h3>
        <div className="text-sm text-gray-400">Loading stores...</div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Store Availability & Pricing</h3>
        <div className="text-sm text-gray-400">No stores available. Create a store first.</div>
      </div>
    );
  }

  return (
    <div className="border-t pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Store Availability & Pricing</h3>
      <p className="text-xs text-gray-500 mb-3">
        Configure which stores this product is available in and set store-specific pricing & stock.
      </p>
      <div className="space-y-2">
        {stores.map((store) => {
          const sp = getStoreProduct(store.id);
          return (
            <div
              key={store.id}
              className={`border rounded-lg transition-colors ${
                sp.isAvailable ? "border-primary-200 bg-primary-50/30" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between p-3">
                <label className="flex items-center space-x-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sp.isAvailable}
                    onChange={(e) => updateStoreProduct(store.id, { isAvailable: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Store className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-sm text-gray-900">{store.name}</span>
                </label>
                {sp.isAvailable ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <span className="text-xs text-gray-400">Not available</span>
                )}
              </div>

              {sp.isAvailable && (
                <div className="px-3 pb-3 ml-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sp.price}
                      onChange={(e) => updateStoreProduct(store.id, { price: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Sale Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sp.salePrice}
                      onChange={(e) => updateStoreProduct(store.id, { salePrice: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={sp.stock}
                      onChange={(e) => updateStoreProduct(store.id, { stock: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Low Stock Alert
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={sp.lowStockAlert}
                      onChange={(e) => updateStoreProduct(store.id, { lowStockAlert: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="10"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
