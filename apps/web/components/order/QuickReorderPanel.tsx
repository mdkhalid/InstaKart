"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RotateCcw, AlertCircle, ShoppingCart, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { formatPrice } from "@/lib/utils";

export interface ReorderItem {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  altText: string | null;
  unit: string;
  currentPrice: number;
  originalPrice: number;
  priceChanged: boolean;
  previousUnitPrice: number;
  availableStock: number;
  originalQuantity: number;
  maxQuantity: number;
  isAvailable: boolean;
}

export interface ReorderUnavailableItem {
  productId: string;
  name: string;
  reason: "DISCONTINUED" | "OUT_OF_STOCK";
  currentStock?: number;
}

interface ReorderPreview {
  orderId: string;
  orderNumber: string;
  orderedAt: string;
  items: ReorderItem[];
  unavailableItems: ReorderUnavailableItem[];
  summary: {
    totalItems: number;
    availableCount: number;
    unavailableCount: number;
    canFulfillFully: boolean;
  };
}

interface QuickReorderPanelProps {
  orderId: string;
  /** When true, hides the "Reorder All" CTA and only renders the list (used inline). */
  compact?: boolean;
  /** Optional callback fired after items are added to cart. */
  onReorderComplete?: (addedCount: number) => void;
}

export function QuickReorderPanel({
  orderId,
  compact = false,
  onReorderComplete,
}: QuickReorderPanelProps) {
  const [preview, setPreview] = useState<ReorderPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toggleCart = useCartStore((s) => s.toggleCart);

  useEffect(() => {
    let cancelled = false;
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/orders/${orderId}/reorder`);
        if (cancelled) return;
        const payload: ReorderPreview = data.data;
        setPreview(payload);
        const initialQty: Record<string, number> = {};
        const initialSel: Record<string, boolean> = {};
        payload.items.forEach((it) => {
          initialQty[it.productId] = it.maxQuantity;
          initialSel[it.productId] = true;
        });
        setQuantities(initialQty);
        setSelected(initialSel);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Failed to load reorder options");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const selectedItems = useMemo(() => {
    if (!preview) return [];
    return preview.items.filter(
      (it) => selected[it.productId] && quantities[it.productId] > 0
    );
  }, [preview, selected, quantities]);

  const selectedCount = selectedItems.length;
  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, it) => sum + it.currentPrice * quantities[it.productId], 0),
    [selectedItems, quantities]
  );

  const setQty = (productId: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: qty }));
  };

  const toggleSelected = (productId: string) => {
    setSelected((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const selectAll = () => {
    if (!preview) return;
    const next: Record<string, boolean> = {};
    preview.items.forEach((it) => {
      next[it.productId] = true;
    });
    setSelected(next);
  };

  const clearSelection = () => {
    setSelected({});
  };

  const handleReorder = async (onlySelected: boolean) => {
    if (!preview) return;
    const itemsToAdd = onlySelected
      ? selectedItems
      : preview.items;

    if (itemsToAdd.length === 0) {
      toast.error("No items to reorder");
      return;
    }

    setAdding(true);
    try {
      for (const item of itemsToAdd) {
        const qty = onlySelected
          ? quantities[item.productId]
          : item.maxQuantity;
        if (qty <= 0) continue;
        addItem(
          {
            id: item.productId,
            name: item.name,
            slug: item.slug,
            price: item.originalPrice,
            salePrice: item.currentPrice < item.originalPrice ? item.currentPrice : null,
            stock: item.availableStock,
            isAvailable: true,
            images: item.imageUrl ? [{ url: item.imageUrl }] : [],
          },
          qty
        );
      }

      const totalQty = itemsToAdd.reduce(
        (sum, it) => sum + (onlySelected ? quantities[it.productId] : it.maxQuantity),
        0
      );
      const itemLabel = itemsToAdd.length === 1 ? "item" : "items";
      toast.success(`Added ${totalQty} ${itemLabel} to cart`);

      if (!compact) {
        toggleCart();
      }
      onReorderComplete?.(itemsToAdd.length);
    } catch {
      toast.error("Failed to add items to cart");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!preview) return null;

  if (preview.items.length === 0 && preview.unavailableItems.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        This order has no items to reorder.
      </div>
    );
  }

  if (preview.items.length === 0) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              None of these items are available right now
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {preview.unavailableItems.length} item(s) discontinued or out of stock.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RotateCcw className="h-4 w-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Quick Reorder</h3>
            {!preview.summary.canFulfillFully && (
              <Badge variant="warning">
                {preview.summary.unavailableCount} unavailable
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className="text-primary-600 hover:underline"
            >
              Select all
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-gray-500 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white">
        {preview.items.map((item) => {
          const qty = quantities[item.productId] ?? item.maxQuantity;
          const isSelected = selected[item.productId];
          const isLowStock = item.availableStock <= 5 && item.availableStock > 0;
          const lineTotal = item.currentPrice * qty;

          return (
            <li
              key={item.productId}
              className={`p-3 transition-colors ${
                isSelected ? "bg-white" : "bg-gray-50"
              }`}
            >
              <div className="flex items-start space-x-3">
                {!compact && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(item.productId)}
                    aria-label={`Include ${item.name}`}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                )}
                <Link
                  href={`/products/${item.slug}`}
                  className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden relative"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.altText || item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      N/A
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.slug}`}
                    className="block font-medium text-sm text-gray-900 hover:text-primary-600 line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="font-semibold text-primary-600 text-sm">
                      {formatPrice(item.currentPrice)}
                    </span>
                    {item.priceChanged && (
                      <>
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(item.previousUnitPrice)}
                        </span>
                        <Badge
                          variant={
                            item.currentPrice < item.previousUnitPrice
                              ? "success"
                              : "warning"
                          }
                          className="text-[10px] py-0"
                        >
                          {item.currentPrice < item.previousUnitPrice
                            ? `Save ${formatPrice(item.previousUnitPrice - item.currentPrice)}`
                            : `+${formatPrice(item.currentPrice - item.previousUnitPrice)}`}
                        </Badge>
                      </>
                    )}
                  </div>
                  {isLowStock && (
                    <p className="text-xs text-amber-600 mt-1">
                      Only {item.availableStock} left in stock
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <QuantityStepper
                    value={qty}
                    onChange={(v) => setQty(item.productId, v)}
                    min={1}
                    max={item.availableStock}
                    size="sm"
                    ariaLabel={`Quantity for ${item.name}`}
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    {formatPrice(lineTotal)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {preview.unavailableItems.length > 0 && !compact && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700 select-none">
            {preview.unavailableItems.length} item(s) unavailable
          </summary>
          <ul className="mt-2 space-y-1 pl-4 border-l-2 border-amber-200">
            {preview.unavailableItems.map((item) => (
              <li key={item.productId} className="flex items-center space-x-2 text-gray-600">
                <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                <span className="line-through">{item.name}</span>
                <span className="text-xs text-gray-400">
                  ({item.reason === "DISCONTINUED" ? "Discontinued" : "Out of stock"})
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {!compact && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="text-sm">
            <p className="text-gray-600">
              {selectedCount} of {preview.items.length} item(s) selected
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(selectedTotal)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReorder(false)}
              loading={adding}
              disabled={preview.items.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reorder All
            </Button>
            <Button
              size="sm"
              onClick={() => handleReorder(true)}
              loading={adding}
              disabled={selectedCount === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Add Selected
            </Button>
          </div>
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-500">
            {preview.items.length} item(s) available
          </span>
          <Button
            size="sm"
            onClick={() => handleReorder(false)}
            loading={adding}
            disabled={preview.items.length === 0}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Reorder Now
          </Button>
        </div>
      )}
    </div>
  );
}
