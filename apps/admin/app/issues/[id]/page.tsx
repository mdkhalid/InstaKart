"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import api from "@/lib/api";
import toast from "react-hot-toast";

const ISSUE_TYPE_LABELS: Record<string, string> = {
  WRONG_ITEM: "Wrong item",
  DAMAGED: "Damaged / broken",
  MISSING_ITEM: "Item missing",
  POOR_QUALITY: "Poor quality",
  EXPIRED: "Near expiry",
  OTHER: "Other",
};

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { confirm, dialogProps } = useConfirm();
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState<string>("WALLET");
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    if (params?.id) fetchIssue();
  }, [params?.id]);

  const fetchIssue = async () => {
    try {
      const { data } = await api.get(`/admin/issues/${params.id}`);
      setIssue(data.data);
      setRefundAmount(
        data.data.refundAmount ? String(Number(data.data.refundAmount)) : ""
      );
      setRefundMethod(data.data.refundMethod || "WALLET");
      setAdminNotes(data.data.adminNotes || "");
    } catch {
      toast.error("Issue not found");
      router.push("/issues");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (action: "approve" | "reject") => {
    if (action === "approve" && !refundAmount) {
      toast.error("Refund amount is required to approve");
      return;
    }
    const ok = await confirm({
      title: action === "approve" ? "Approve refund?" : "Reject issue?",
      message:
        action === "approve"
          ? `Refund of ₹${refundAmount} will be initiated to the customer's ${refundMethod === "WALLET" ? "InstaCart wallet" : "original payment method"}.`
          : "The customer's issue will be marked as rejected. They'll be able to contact support for further help.",
      confirmText: action === "approve" ? "Approve & Refund" : "Reject",
      variant: action === "approve" ? "primary" : "danger",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const payload: any = {
        action,
        adminNotes: adminNotes || undefined,
      };
      if (action === "approve") {
        payload.refundAmount = Number(refundAmount);
        payload.refundMethod = refundMethod;
      }
      await api.post(`/admin/issues/${params.id}/resolve`, payload);
      toast.success(
        action === "approve" ? "Refund approved" : "Issue rejected"
      );
      fetchIssue();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resolve");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading…</div>;
  }

  if (!issue) return null;

  const isResolved = ["APPROVED", "REJECTED", "RESOLVED", "AUTO_APPROVED"].includes(
    issue.status
  );
  const order = issue.order;
  const suggestedRefund = issue.refundAmount
    ? Number(issue.refundAmount)
    : issue.orderItem
    ? Number(issue.orderItem.totalPrice)
    : order
    ? Number(order.total)
    : 0;

  return (
    <div>
      <button
        onClick={() => router.push("/issues")}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Issues
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {ISSUE_TYPE_LABELS[issue.type] || issue.type}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reported on {formatDateTime(issue.createdAt)} · Order{" "}
            <button
              onClick={() => router.push(`/orders/${order.id}`)}
              className="text-primary-600 hover:underline font-medium"
            >
              {order.orderNumber}
            </button>
          </p>
        </div>
        <StatusBadge variant={getStatusVariant(issue.status)}>
          {issue.status}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Customer info */}
          <div className="bg-white border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Customer</h2>
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                {order.user?.firstName} {order.user?.lastName}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${order.user?.email}`} className="text-primary-600 hover:underline">
                  {order.user?.email}
                </a>
              </p>
              {order.user?.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${order.user?.phone}`} className="text-primary-600 hover:underline">
                    {order.user?.phone}
                  </a>
                </p>
              )}
              {order.address && (
                <p className="flex items-start gap-2 mt-2 pt-2 border-t">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span>
                    {order.address.street}, {order.address.city}, {order.address.state}{" "}
                    {order.address.pincode}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Issue details */}
          <div className="bg-white border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Issue details</h2>
            {issue.orderItem && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3 text-sm">
                <div>
                  <p className="font-medium">{issue.orderItem.productName}</p>
                  <p className="text-xs text-gray-500">
                    Qty: {issue.orderItem.quantity} × {formatPrice(Number(issue.orderItem.unitPrice))}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatPrice(Number(issue.orderItem.totalPrice))}
                </p>
              </div>
            )}
            {issue.description && (
              <p className="text-sm text-gray-700 mb-3">{issue.description}</p>
            )}
            {issue.photoUrls && issue.photoUrls.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> Photos ({issue.photoUrls.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {issue.photoUrls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-primary-500"
                    >
                      <img
                        src={url}
                        alt={`Issue ${i + 1}`}
                        className="block w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order items (for context) */}
          <div className="bg-white border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Order items</h2>
            <div className="space-y-2">
              {order.items?.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity} × {formatPrice(Number(item.unitPrice))}
                    </p>
                  </div>
                  <p className="font-semibold">{formatPrice(Number(item.totalPrice))}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold pt-3 mt-2 border-t">
              <span>Order total</span>
              <span className="text-primary-600">
                {formatPrice(Number(order.total))}
              </span>
            </div>
          </div>
        </div>

        {/* Resolution panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-xl p-5 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              {isResolved ? "Resolution" : "Resolve Issue"}
            </h2>

            {isResolved ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  {issue.status === "REJECTED" ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-semibold">
                    {issue.status === "AUTO_APPROVED" && "Auto-Approved"}
                    {issue.status === "APPROVED" && "Approved"}
                    {issue.status === "REJECTED" && "Rejected"}
                    {issue.status === "RESOLVED" && "Resolved"}
                  </span>
                </div>
                {issue.refundAmount && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                    <p className="text-xs text-gray-500">Refund</p>
                    <p className="text-lg font-bold text-green-700">
                      {formatPrice(Number(issue.refundAmount))}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      via {issue.refundMethod === "WALLET" ? "InstaCart wallet" : "original payment"}
                    </p>
                  </div>
                )}
                {issue.adminNotes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{issue.adminNotes}</p>
                  </div>
                )}
                {issue.resolvedAt && (
                  <p className="text-xs text-gray-500 pt-2 border-t">
                    Resolved on {formatDateTime(issue.resolvedAt)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Refund amount (₹)
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder={String(suggestedRefund)}
                    max={order.total}
                    min={0}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Suggested: {formatPrice(suggestedRefund)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Refund method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="WALLET">InstaCart Wallet (instant)</option>
                    <option value="ORIGINAL">Original payment (3-5 days)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Admin notes (optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Add a note visible to the customer..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    onClick={() => handleResolve("reject")}
                    disabled={submitting}
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleResolve("approve")}
                    disabled={submitting}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
