"use client";

import { X, ShoppingCart, Percent, XCircle, Check } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { formatPrice, FREE_DELIVERY_THRESHOLD } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export function CartDrawer() {
  const { items, isOpen, toggleCart, total, subtotal, coupon, couponLoading, itemCount, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [applying, setApplying] = useState(false);

  const remainingForFree = FREE_DELIVERY_THRESHOLD - subtotal;
  const progressPercent = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    try {
      await applyCoupon(couponCode.trim());
      toast.success("Coupon applied!");
      setCouponCode("");
    } catch (err: any) {
      toast.error(err.message || "Invalid coupon code");
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success("Coupon removed");
  };

  const discount = subtotal - total;
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : 40;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={toggleCart} />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Cart ({itemCount})</h2>
            </div>
            <button onClick={toggleCart} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Free Delivery Progress Bar */}
          {items.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                {remainingForFree > 0 ? (
                  <>
                    <div className="flex justify-between text-xs text-amber-800 mb-1.5">
                      <span className="font-medium">Free delivery</span>
                      <span className="font-medium">{formatPrice(remainingForFree)} away</span>
                    </div>
                    <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-amber-700 mt-1.5">
                      Add <strong>{formatPrice(remainingForFree)}</strong> more for free delivery!
                    </p>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 text-sm">🎉</span>
                    <p className="text-xs text-green-700 font-medium">You've got free delivery!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Your cart is empty</p>
                <p className="text-sm">Add items to get started</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {items.map((item) => (
                  <CartItem key={item.productId} item={item} />
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t p-4 space-y-3 bg-white">
              {/* Coupon Input */}
              <div>
                {coupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">{coupon.code}</span>
                      <span className="text-xs text-green-600">
                        ({coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}% off` : formatPrice(coupon.discountValue)})
                      </span>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-green-600 hover:text-green-800">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                        className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      loading={applying}
                      disabled={!couponCode.trim()}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-green-600">-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span>{deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg text-primary-600">{formatPrice(total + deliveryFee)}</span>
              </div>
              <Link href="/checkout" onClick={toggleCart}>
                <Button className="w-full">Proceed to Checkout</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
