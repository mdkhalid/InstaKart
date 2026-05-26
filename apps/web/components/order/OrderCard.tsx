"use client";

import Link from "next/link";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";

interface OrderCardProps {
  order: any;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Link href={`/orders/${order.id}`} className="block">
      <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">{order.orderNumber}</span>
          <Badge variant={statusBadgeVariant(order.status) as any}>{order.status}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{order.items?.length || 0} items</span>
          <span>{formatPrice(order.total)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
      </div>
    </Link>
  );
}
