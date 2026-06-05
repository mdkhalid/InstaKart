"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Package, User, MapPin, CreditCard,
  Clock, RefreshCw,
} from "lucide-react";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirm } from "@/hooks/useConfirm";
import { formatPrice, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

// Valid transitions mirroring the backend
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/admin/orders/${params.id}`);
      setOrder(data.data);
      setNewStatus("");
      setStatusNote("");
    } catch (err: any) {
      const message = err.response?.status === 404
        ? "Order not found"
        : "Failed to load order details";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params?.id) fetchOrder();
  }, [params?.id, fetchOrder]);

  const handleStatusUpdate = async (status: string) => {
    // Confirmation for destructive actions
    if (status === "CANCELLED") {
      const ok = await confirm({
        title: "Cancel this order?",
        message: "This will restore stock and notify the customer. The order cannot be reactivated.",
        confirmText: "Cancel order",
        variant: "danger",
      });
      if (!ok) return;
    }
    if (status === "REFUNDED") {
      const ok = await confirm({
        title: "Refund this order?",
        message: "This will restore stock. The original payment will be returned to the customer.",
        confirmText: "Refund order",
        variant: "danger",
      });
      if (!ok) return;
    }

    setUpdating(true);
    try {
      const { data } = await api.put(`/admin/orders/${params.id}/status`, {
        status,
        note: statusNote || undefined,
      });
      setOrder(data.data);
      setNewStatus("");
      setStatusNote("");
      toast.success(`Order status updated to ${STATUS_LABELS[status] || status}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-6">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-20 w-full bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{error}</h2>
        <p className="text-gray-500 mb-6">The order could not be found or loaded.</p>
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={() => router.push("/orders")}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Orders
          </button>
          <button
            onClick={fetchOrder}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state (shouldn't happen with error handling, but just in case)
  if (!order) return null;

  const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
  const paymentStatusVariant = order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "destructive" : "warning";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <button
          onClick={() => router.push("/orders")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Orders"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <StatusBadge variant={getStatusVariant(order.status) as any} className="text-sm px-3 py-1">
              {STATUS_LABELS[order.status] || order.status}
            </StatusBadge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Placed on {formatDate(order.createdAt)} at {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Customer</h2>
            </div>
            {order.user ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-900">
                  {order.user.firstName} {order.user.lastName}
                </p>
                <p className="text-gray-500">{order.user.email}</p>
                {order.user.phone && <p className="text-gray-500">{order.user.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Customer information unavailable</p>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Package className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Order Items ({order.items?.length || 0})</h2>
            </div>
            {order.items && order.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="flex items-center space-x-3">
                            {item.productImage ? (
                              <img src={item.productImage} alt="" className="h-10 w-10 rounded object-cover bg-gray-100" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                            <span className="font-medium text-gray-900">{item.productName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">{item.quantity}</td>
                        <td className="px-3 py-3 text-right">{formatPrice(item.unitPrice)}</td>
                        <td className="px-3 py-3 text-right font-medium">{formatPrice(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No items in this order</p>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Price Breakdown</h2>
            <div className="space-y-2 text-sm max-w-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery Fee</span>
                <span>{order.deliveryFee === 0 ? <span className="text-green-600">Free</span> : formatPrice(order.deliveryFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-green-600">-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              {order.couponCode && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Coupon</span>
                  <span className="text-primary-600 font-medium">{order.couponCode}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Status History</h2>
            </div>
            {order.statusHistory && order.statusHistory.length > 0 ? (
              <div className="space-y-0">
                {order.statusHistory.map((entry: any, index: number) => (
                  <div key={entry.id} className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className={`w-3 h-3 rounded-full border-2 ${
                        index === order.statusHistory.length - 1
                          ? "bg-primary-500 border-primary-500"
                          : "bg-white border-gray-300"
                      }`} />
                      {index < order.statusHistory.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200" />
                      )}
                    </div>
                    <div className={`pb-6 ${index === order.statusHistory.length - 1 ? "" : ""}`}>
                      <div className="flex items-center space-x-2">
                        <p className={`text-sm font-medium ${index === order.statusHistory.length - 1 ? "text-primary-700" : "text-gray-700"}`}>
                          {STATUS_LABELS[entry.status] || entry.status}
                        </p>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.createdAt).toLocaleString("en-IN", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {entry.note && entry.note !== `Status updated to ${entry.status}` && (
                        <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No status history available</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>
            {allowedTransitions.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                  <p className="text-sm font-medium text-gray-900">
                    {STATUS_LABELS[order.status] || order.status}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select status...</option>
                    {allowedTransitions.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status] || status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Add a note about this status change..."
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none h-20 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <button
                  onClick={() => newStatus && handleStatusUpdate(newStatus)}
                  disabled={!newStatus || updating}
                  className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                >
                  {updating ? "Updating..." : `Update to ${newStatus ? (STATUS_LABELS[newStatus] || newStatus) : "..."}`}
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  No further status transitions available for <strong>{STATUS_LABELS[order.status] || order.status}</strong> orders.
                </p>
              </div>
            )}
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Delivery Address</h2>
            </div>
            {order.address ? (
              <div className="text-sm space-y-1">
                <p className="font-medium text-gray-900">
                  <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded mr-2">
                    {order.address.label || "Address"}
                  </span>
                </p>
                <p className="text-gray-600">{order.address.street}</p>
                <p className="text-gray-600">{order.address.city}, {order.address.state}</p>
                <p className="text-gray-600">Pincode: {order.address.pincode}</p>
                {order.address.landmark && (
                  <p className="text-gray-500">Landmark: {order.address.landmark}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Address information unavailable</p>
            )}
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Payment</h2>
            </div>
            <div className="text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <StatusBadge variant={paymentStatusVariant as any}>
                  {order.paymentStatus}
                </StatusBadge>
              </div>
              {order.paymentId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment ID</span>
                  <span className="font-mono text-xs">{order.paymentId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Meta */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Order Info</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Order ID</span>
                <span className="font-mono text-xs text-gray-700">{order.id}</span>
              </div>
              {order.estimatedDelivery && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Est. Delivery</span>
                  <span>{formatDate(order.estimatedDelivery)}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivered At</span>
                  <span>{formatDate(order.deliveredAt)}</span>
                </div>
              )}
              {order.cancelledAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cancelled At</span>
                  <span>{formatDate(order.cancelledAt)}</span>
                </div>
              )}
              {order.cancellationReason && (
                <div className="pt-2 border-t mt-2">
                  <span className="text-gray-500 block mb-1">Cancellation Reason</span>
                  <p className="text-gray-700">{order.cancellationReason}</p>
                </div>
              )}
              {order.notes && (
                <div className="pt-2 border-t mt-2">
                  <span className="text-gray-500 block mb-1">Order Notes</span>
                  <p className="text-gray-700">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
