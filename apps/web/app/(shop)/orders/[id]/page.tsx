"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, CreditCard, AlertCircle, Clock, CheckCircle2, XCircle, RotateCcw, Image as ImageIcon } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OrderTracker } from "@/components/order/OrderTracker";
import { QuickReorderPanel } from "@/components/order/QuickReorderPanel";
import { IssueReportModal } from "@/components/order/IssueReportModal";
import { formatPrice, formatDate, formatDateTime, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

const ISSUE_TYPE_LABELS: Record<string, string> = {
  WRONG_ITEM: "Wrong item",
  DAMAGED: "Damaged",
  MISSING_ITEM: "Missing item",
  POOR_QUALITY: "Poor quality",
  EXPIRED: "Near expiry",
  OTHER: "Other",
};

const ISSUE_STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  OPEN: "warning",
  AUTO_APPROVED: "success",
  APPROVED: "success",
  REJECTED: "destructive",
  RESOLVED: "secondary",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [issueWindow, setIssueWindow] = useState<{ canReportNew: boolean; windowExpiresAt: string | null; windowMinutes: number }>({ canReportNew: false, windowExpiresAt: null, windowMinutes: 10 });
  const [showIssueModal, setShowIssueModal] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (params?.id) {
      fetchOrder();
      fetchIssues();
    }
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

  const fetchIssues = async () => {
    try {
      const { data } = await api.get(`/orders/${params.id}/issues`);
      setIssues(data.data?.issues || []);
      setIssueWindow({
        canReportNew: data.data?.canReportNew || false,
        windowExpiresAt: data.data?.windowExpiresAt || null,
        windowMinutes: data.data?.windowMinutes || 10,
      });
    } catch {
      // Silent - issues endpoint failure is non-critical
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: "Cancel order?",
      message: "This will cancel your order. You can place a new one anytime.",
      confirmText: "Cancel order",
      variant: "danger",
    });
    if (!ok) return;
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
  const canReportIssue =
    order.status === "DELIVERED" && issueWindow.canReportNew;

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

        {/* Quick Reorder Panel */}
        {order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
          <div className="bg-white border rounded-xl p-6 mb-6">
            <QuickReorderPanel orderId={order.id} />
          </div>
        )}

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
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {order.couponCode ? `Discount (${order.couponCode})` : "Discount"}
                </span>
                <span className="text-green-600">-{formatPrice(order.discount)}</span>
              </div>
            )}
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

        {/* Issues / Refund Section */}
        {(canReportIssue || issues.length > 0) && (
          <div className="bg-white border rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Issues & Refunds
              </h2>
              {canReportIssue && (
                <Button
                  onClick={() => setShowIssueModal(true)}
                  variant="outline"
                  size="sm"
                  className="text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Report an Issue
                </Button>
              )}
            </div>

            {canReportIssue && issueWindow.windowExpiresAt && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  You can report an issue until{" "}
                  <strong>
                    {new Date(issueWindow.windowExpiresAt).toLocaleTimeString(
                      "en-IN",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </strong>{" "}
                  ({issueWindow.windowMinutes} min after delivery). After that,
                  contact support.
                </div>
              </div>
            )}

            {!canReportIssue &&
              order.status === "DELIVERED" &&
              issues.length === 0 && (
                <p className="text-sm text-gray-500">
                  The issue reporting window has closed. Please contact support
                  for help.
                </p>
              )}

            {issues.length > 0 && (
              <div className="space-y-3">
                {issues.map((issue: any) => (
                  <div
                    key={issue.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">
                          {ISSUE_TYPE_LABELS[issue.type] || issue.type}
                        </span>
                        {issue.orderItem && (
                          <span className="text-xs text-gray-500">
                            · {issue.orderItem.productName}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={ISSUE_STATUS_VARIANT[issue.status] || "default"}
                        className="text-xs"
                      >
                        {issue.status === "AUTO_APPROVED" && "✓ Auto-Approved"}
                        {issue.status === "APPROVED" && "✓ Approved"}
                        {issue.status === "REJECTED" && "✗ Rejected"}
                        {issue.status === "RESOLVED" && "Resolved"}
                        {issue.status === "OPEN" && "Under Review"}
                      </Badge>
                    </div>
                    {issue.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {issue.description}
                      </p>
                    )}
                    {issue.photoUrls && issue.photoUrls.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        {issue.photoUrls.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-primary-500 transition-colors"
                          >
                            <img
                              src={url}
                              alt=""
                              className="block w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {issue.refundAmount && (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700 mt-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Refund of {formatPrice(Number(issue.refundAmount))} via{" "}
                        {issue.refundMethod === "WALLET"
                          ? "InstaCart wallet"
                          : "original payment"}
                        {issue.status === "AUTO_APPROVED" && " (within 24h)"}
                      </div>
                    )}
                    {issue.adminNotes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <span className="font-semibold">Admin note:</span>{" "}
                        {issue.adminNotes}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Reported on {formatDateTime(issue.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
      <Footer />
      <IssueReportModal
        orderId={order.id}
        orderItems={order.items || []}
        orderTotal={Number(order.total)}
        open={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        onSuccess={fetchIssues}
      />
    </>
  );
}
