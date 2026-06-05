"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, ShoppingBag } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { formatPrice, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

export default function CartPage() {
  const router = useRouter();
  const { items, total, itemCount, updateQty, removeItem, clearCart } = useCart();
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
            <Link href="/">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center bg-white border rounded-xl p-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-primary-600 font-semibold mt-1">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center border rounded-lg">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="p-1.5 hover:bg-gray-50">
                        {item.quantity === 1 ? (
                          <Trash2 className="h-4 w-4 text-red-500" onClick={() => removeItem(item.productId)} />
                        ) : (
                          <span className="px-1">-</span>
                        )}
                      </button>
                      <span className="px-3 font-medium text-sm">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="p-1.5 hover:bg-gray-50">
                        <span className="px-1">+</span>
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={clearCart} className="text-sm text-gray-500 hover:text-red-600">
                Clear Cart
              </button>
            </div>

            <div className="bg-white border rounded-xl p-6 h-fit">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Items ({itemCount})</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span>{total >= FREE_DELIVERY_THRESHOLD ? "Free" : formatPrice(DELIVERY_FEE)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>{formatPrice(total + (total >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE))}</span>
                  </div>
                </div>
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => {
                  if (!user) {
                    toast.error("Please login to checkout");
                    router.push("/login");
                    return;
                  }
                  router.push("/checkout");
                }}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
