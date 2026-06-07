"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, Loader2 } from "lucide-react";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface OrderCardProps {
  order: any;
}

export function OrderCard({ order }: OrderCardProps) {
  const [reordering, setReordering] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toggleCart = useCartStore((s) => s.toggleCart);
  const user = useAuthStore((s) => s.user);

  const canReorder =
    user &&
    order.status !== "CANCELLED" &&
    order.status !== "REFUNDED" &&
    order.items?.length > 0;

  const handleReorder = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canReorder || reordering) return;
    setReordering(true);
    try {
      const { data } = await api.get(`/orders/${order.id}/reorder`);
      const payload = data.data;
      const available = payload?.items ?? [];

      if (available.length === 0) {
        toast.error("None of these items are available right now");
        return;
      }

      let totalQty = 0;
      for (const item of available) {
        const qty = item.maxQuantity;
        if (qty <= 0) continue;
        addItem(
          {
            id: item.productId,
            name: item.name,
            slug: item.slug,
            price: item.originalPrice,
            salePrice:
              item.currentPrice < item.originalPrice ? item.currentPrice : null,
            stock: item.availableStock,
            isAvailable: true,
            images: item.imageUrl ? [{ url: item.imageUrl }] : [],
          },
          qty
        );
        totalQty += qty;
      }

      const label = available.length === 1 ? "item" : "items";
      const skipped = payload?.summary?.unavailableCount ?? 0;
      const suffix = skipped > 0 ? ` (${skipped} skipped)` : "";
      toast.success(
        `Added ${totalQty} ${label} from order ${order.orderNumber}${suffix}`
      );
      toggleCart();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reorder");
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="block">
      <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <Link
            href={`/orders/${order.id}`}
            className="font-semibold text-sm hover:text-primary-600"
          >
            {order.orderNumber}
          </Link>
          <Badge variant={statusBadgeVariant(order.status) as any}>
            {order.status}
          </Badge>
        </div>
        <Link href={`/orders/${order.id}`} className="block">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{order.items?.length || 0} items</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
        </Link>
        {canReorder && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={handleReorder}
              disabled={reordering}
              className="inline-flex items-center text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reordering ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
              )}
              {reordering ? "Reordering..." : "Reorder"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
