"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, itemCount, clearCart, validateStock } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [stockValidated, setStockValidated] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (items.length === 0) {
      router.push("/cart");
      return;
    }
    fetchAddresses();
    // Validate stock freshness before showing checkout
    validateStock().then((issues) => {
      if (issues.length > 0) {
        const outOfStock = issues.filter((i) => i.type === 'out_of_stock');
        const reduced = issues.filter((i) => i.type === 'reduced_stock');
        if (outOfStock.length > 0) {
          toast.error(`${outOfStock.map((i) => i.name).join(', ')} ${outOfStock.length === 1 ? 'is' : 'are'} out of stock and have been removed`);
        }
        if (reduced.length > 0) {
          toast(`${reduced.map((i) => i.name).join(', ')} ${reduced.length === 1 ? 'has' : 'have'} reduced stock — quantity adjusted`, { icon: '⚠️' });
        }
      }
      setStockValidated(true);
    });
  }, [user, items]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users/addresses");
      setAddresses(data.data || []);
      const defaultAddr = data.data?.find((a: any) => a.isDefault);
      if (defaultAddr) setSelectedAddress(defaultAddr.id);
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        addressId: selectedAddress,
        paymentMethod,
        notes: notes || undefined,
      });
      toast.success("Order placed successfully!");
      clearCart();
      router.push(`/orders/${data.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const deliveryFee = total() >= 499 ? 0 : 40;
  const grandTotal = total() + deliveryFee;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Address Selection */}
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
              {loading ? (
                <p className="text-gray-500">Loading addresses...</p>
              ) : addresses.length === 0 ? (
                <div>
                  <p className="text-gray-500 mb-3">No addresses saved</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/profile")}
                  >
                    Add Address
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr: any) => (
                    <label
                      key={addr.id}
                      className={`block p-3 border rounded-lg cursor-pointer ${selectedAddress === addr.id ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex items-start">
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddress === addr.id}
                          onChange={(e) => setSelectedAddress(e.target.value)}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <p className="font-medium text-sm">{addr.label}</p>
                          <p className="text-sm text-gray-600">{addr.street}, {addr.city}</p>
                          <p className="text-sm text-gray-600">{addr.state} - {addr.pincode}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
              <div className="space-y-3">
                {["COD", "UPI", "RAZORPAY"].map((method) => (
                  <label key={method} className={`block p-3 border rounded-lg cursor-pointer ${paymentMethod === method ? "border-primary-500 bg-primary-50" : "hover:bg-gray-50"}`}>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium">
                        {method === "COD" ? "Cash on Delivery" : method === "UPI" ? "UPI Payment" : "Razorpay"}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Order Notes (Optional)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions..."
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none h-20 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white border rounded-xl p-6 h-fit">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              {items.slice(0, 4).map((item) => (
                <div key={item.productId} className="flex justify-between">
                  <span className="text-gray-600 truncate">{item.name} x{item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              {items.length > 4 && (
                <p className="text-xs text-gray-400">+{items.length - 4} more items</p>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(total())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span>{deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t mt-2">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
            <Button
              className="w-full mt-4"
              onClick={handlePlaceOrder}
              loading={placing}
              disabled={!selectedAddress}
            >
              Place Order — {formatPrice(grandTotal)}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
