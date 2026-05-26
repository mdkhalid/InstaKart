"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";

interface CartItemProps {
  item: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  };
}

export function CartItem({ item }: CartItemProps) {
  const { updateQty, removeItem } = useCart();

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-white flex-shrink-0">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
        ) : (
          <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No img</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-sm font-semibold text-primary-600">{formatPrice(item.price)}</p>
      </div>
      <div className="flex items-center space-x-1">
        <button
          onClick={() => updateQty(item.productId, item.quantity - 1)}
          className="p-1 hover:bg-gray-200 rounded"
        >
          {item.quantity === 1 ? <Trash2 className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4" />}
        </button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <button
          onClick={() => updateQty(item.productId, item.quantity + 1)}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
