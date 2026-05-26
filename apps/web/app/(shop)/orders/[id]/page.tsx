"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, CreditCard } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderTracker } from "@/components/order/OrderTracker";
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (params?.id) fetchOrder();
  }, [params?.id, isAuthenticated]);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${params.id}`);
      setOrder(data.data);
    } catch {
      toast.error("Order not found");
      router.push("/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      await api.post(`/orders/${params.id}/cancel`, { reason: "Cancelled by customer" });
      toast.success("Order cancelled");
      fetchOrder();
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Footer />
      </>
    );
  }

  if (!order) return null;

  const canCancel = ["PENDING", "CONFIRMED"].includes(order.status);

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/orders" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Orders
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500">Placed on {formatDateTime(order.createdAt)}</p>
          </div>
          <Badge variant={statusBadgeVariant(order.status) as any} className="text-sm px-3 py-1">
            {order.status}
          </Badge>
        </div>

        {/* Status Tracker */}
        <div className="bg-white border rounded-xl p-6 mb-6">
          <OrderTracker currentStatus={order.status} cancelled={order.status === "CANCELLED"} />
        </div>

        {/* Items */}
        <div className="bg-white border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{item.productName}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity} x {formatPrice(item.unitPrice)}</p>
                </div>
                <span className="font-semibold">{formatPrice(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white border rounded-xl p-6 mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}</span></div>
            {order.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-green-600">-{formatPrice(order.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.tax)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t pt-2"><span>Total</span><span className="text-primary-600">{formatPrice(order.total)}</span></div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.address && (
          <div className="bg-white border rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{order.address.label}</h3>
                <p className="text-sm text-gray-600">{order.address.street}, {order.address.city}</p>
                <p className="text-sm text-gray-600">{order.address.state} - {order.address.pincode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Info */}
        <div className="bg-white border rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-3">
            <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm"><span className="font-medium">Payment:</span> {order.paymentMethod}</p>
              <Badge variant={order.paymentStatus === "PAID" ? "success" : "warning"}>{order.paymentStatus}</Badge>
            </div>
          </div>
        </div>

        {canCancel && (
          <Button variant="destructive" onClick={handleCancel} loading={cancelling}>
            Cancel Order
          </Button>
        )}
      </main>
      <Footer />
    </>
  );
}
