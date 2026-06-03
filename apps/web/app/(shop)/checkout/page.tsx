"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Percent, Check, XCircle, Clock, Zap, Loader2 } from "lucide-react";
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
  const { items, total, subtotal, coupon, itemCount, clearCart, validateStock, applyCoupon, removeCoupon, syncToServer } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const user = useAuthStore((state) => state.user);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [deliveryMode, setDeliveryMode] = useState("asap");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderStep, setOrderStep] = useState<'syncing' | 'placing' | 'completed' | null>(null);
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
    if (deliveryMode === "schedule" && !selectedSlot) {
      toast.error("Please select a delivery time slot");
      return;
    }
    setOrderStep('syncing');
    try {
      // Step 1: Sync local cart to server
      await syncToServer();

      // Step 2: Place the order
      setOrderStep('placing');
      const { data } = await api.post("/orders", {
        addressId: selectedAddress,
        paymentMethod,
        notes: notes || undefined,
        couponCode: coupon?.code || undefined,
        estimatedDelivery: deliveryMode === "schedule" && selectedSlot ? selectedSlot : undefined,
      });

      // Step 3: Completed
      setOrderStep('completed');
      toast.success("Order placed successfully!");
      clearCart();
      // Brief pause to show the completed state before redirect
      setTimeout(() => router.push(`/orders/${data.data.id}`), 600);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to place order");
      setOrderStep(null);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      await applyCoupon(couponCode.trim());
      toast.success("Coupon applied!");
      setCouponCode("");
    } catch (err: any) {
      toast.error(err.message || "Invalid coupon code");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success("Coupon removed");
  };

  // Generate time slots for today and tomorrow
  const generateTimeSlots = () => {
    const now = new Date();
    const slots: { label: string; dateTime: string; day: string }[] = [];
    const currentHour = now.getHours();

    const formatHour = (hour: number) => {
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${h12}:00 ${ampm}`;
    };

    // Generate slots for today (starting 2 hours from now, until 10 PM)
    const todayStartHour = Math.max(currentHour + 2, 8);
    for (let h = todayStartHour; h <= 22; h++) {
      const slotDate = new Date(now);
      slotDate.setHours(h, 0, 0, 0);
      slots.push({
        label: `${formatHour(h)} - ${formatHour(h + 1)}`,
        dateTime: slotDate.toISOString(),
        day: "today",
      });
    }

    // Generate slots for tomorrow (7 AM to 10 PM)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    for (let h = 7; h <= 22; h++) {
      const slotDate = new Date(tomorrow);
      slotDate.setHours(h, 0, 0, 0);
      slots.push({
        label: `${formatHour(h)} - ${formatHour(h + 1)}`,
        dateTime: slotDate.toISOString(),
        day: "tomorrow",
      });
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();
  const todaySlots = timeSlots.filter((s) => s.day === "today");
  const tomorrowSlots = timeSlots.filter((s) => s.day === "tomorrow");

  const discount = subtotal() - total();
  const deliveryFee = subtotal() >= 499 ? 0 : 40;
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

            {/* Delivery Time */}
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Delivery Time</h2>
              <div className="space-y-3">
                <label
                  className={`block p-3 border rounded-lg cursor-pointer transition-all ${deliveryMode === "asap" ? "border-primary-500 bg-primary-50 ring-1 ring-primary-200" : "hover:bg-gray-50"}`}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="deliveryTime"
                      value="asap"
                      checked={deliveryMode === "asap"}
                      onChange={() => { setDeliveryMode("asap"); setSelectedSlot(null); }}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-primary-600" />
                        <span className="text-sm font-medium">ASAP (Express Delivery)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-6">Delivered within 30–60 minutes</p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block p-3 border rounded-lg cursor-pointer transition-all ${deliveryMode === "schedule" ? "border-primary-500 bg-primary-50 ring-1 ring-primary-200" : "hover:bg-gray-50"}`}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="deliveryTime"
                      value="schedule"
                      checked={deliveryMode === "schedule"}
                      onChange={() => setDeliveryMode("schedule")}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">Schedule for later</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-6">Pick a 1-hour delivery window</p>
                    </div>
                  </div>
                </label>

                {deliveryMode === "schedule" && (
                  <div className="pt-2 pl-7 space-y-4">
                    {todaySlots.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Today</p>
                        <div className="flex flex-wrap gap-2">
                          {todaySlots.map((slot) => (
                            <button
                              key={slot.dateTime}
                              onClick={() => setSelectedSlot(slot.dateTime)}
                              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                                selectedSlot === slot.dateTime
                                  ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-600"
                              }`}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                        Tomorrow
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tomorrowSlots.map((slot) => (
                          <button
                            key={slot.dateTime}
                            onClick={() => setSelectedSlot(slot.dateTime)}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                              selectedSlot === slot.dateTime
                                ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                : "bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-600"
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

              {/* Coupon */}
              <div className="border-t pt-3">
                {coupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-3">
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
                  <div className="flex items-center space-x-2 mb-3">
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
                      loading={applyingCoupon}
                      disabled={!couponCode.trim()}
                    >
                      Apply
                    </Button>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(subtotal())}</span>
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
                <div className="flex justify-between font-semibold text-base pt-2 border-t mt-2">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
            {orderStep ? (
              <div className="mt-4 bg-gray-50 rounded-xl p-4 border">
                <div className="space-y-3">
                  {/* Step 1: Sync */}
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      orderStep === 'syncing'
                        ? 'bg-primary-600'
                        : orderStep === 'placing' || orderStep === 'completed'
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}>
                      {orderStep === 'syncing' ? (
                        <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                      ) : orderStep === 'placing' || orderStep === 'completed' ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${orderStep === 'syncing' ? 'text-gray-900' : 'text-green-700'}`}>
                        Syncing cart
                      </p>
                      <p className={`text-xs ${orderStep === 'syncing' ? 'text-gray-500' : 'text-green-500'}`}>
                        {orderStep === 'syncing' ? 'Uploading items to server...' : 'Items synced'}
                      </p>
                    </div>
                  </div>

                  {/* Connector line */}
                  <div className={`ml-3 w-0.5 h-5 ${orderStep === 'placing' || orderStep === 'completed' ? 'bg-green-400' : 'bg-gray-200'} transition-colors duration-300`} />

                  {/* Step 2: Place */}
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      orderStep === 'placing'
                        ? 'bg-primary-600'
                        : orderStep === 'completed'
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}>
                      {orderStep === 'placing' ? (
                        <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                      ) : orderStep === 'completed' ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${orderStep === 'placing' ? 'text-gray-900' : orderStep === 'completed' ? 'text-green-700' : 'text-gray-400'}`}>
                        Placing order
                      </p>
                      <p className={`text-xs ${orderStep === 'placing' ? 'text-gray-500' : orderStep === 'completed' ? 'text-green-500' : 'text-gray-400'}`}>
                        {orderStep === 'placing' ? 'Processing your order...' : orderStep === 'completed' ? 'Order confirmed!' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Done */}
                  {orderStep === 'completed' && (
                    <>
                      <div className="ml-3 w-0.5 h-5 bg-green-400 transition-colors duration-300" />
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-700">Redirecting to order...</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <Button
                className="w-full mt-4"
                onClick={handlePlaceOrder}
                disabled={!selectedAddress || (deliveryMode === "schedule" && !selectedSlot)}
              >
                Place Order — {formatPrice(grandTotal)}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
