"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
}

interface IssueReportModalProps {
  orderId: string;
  orderItems?: OrderItem[];
  orderTotal?: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ISSUE_TYPES = [
  { value: "WRONG_ITEM", label: "Wrong item", icon: "🔄" },
  { value: "DAMAGED", label: "Damaged / broken", icon: "💥" },
  { value: "MISSING_ITEM", label: "Item missing", icon: "📦" },
  { value: "POOR_QUALITY", label: "Poor quality", icon: "😕" },
  { value: "EXPIRED", label: "Near expiry", icon: "⏰" },
  { value: "OTHER", label: "Other", icon: "❓" },
] as const;

export function IssueReportModal({
  orderId,
  orderItems = [],
  orderTotal = 0,
  open,
  onClose,
  onSuccess,
}: IssueReportModalProps) {
  const [type, setType] = useState<string>("");
  const [affectedItemId, setAffectedItemId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close
      setType("");
      setAffectedItemId("");
      setDescription("");
      photoPreviews.forEach((src) => URL.revokeObjectURL(src));
      setPhotoFiles([]);
      setPhotoPreviews([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 3 - photoFiles.length;
    if (remaining <= 0) {
      toast.error("Maximum 3 photos allowed");
      return;
    }
    const accepted = files.slice(0, remaining);
    const newFiles = [...photoFiles, ...accepted];
    setPhotoFiles(newFiles);
    const newPreviews = accepted.map((f) => URL.createObjectURL(f));
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photoPreviews[idx]);
    setPhotoFiles(photoFiles.filter((_, i) => i !== idx));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== idx));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photoFiles.length === 0) return [];
    const formData = new FormData();
    photoFiles.forEach((f) => formData.append("photos", f));
    const { data } = await api.post("/upload/issues", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data?.urls || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      toast.error("Please select an issue type");
      return;
    }
    setSubmitting(true);
    try {
      const photoUrls = await uploadPhotos().catch(() => []);
      const payload = {
        type,
        description: description.trim() || undefined,
        photoUrls,
        orderItemId: affectedItemId || undefined,
      };
      await api.post(`/orders/${orderId}/issues`, payload);
      toast.success("Issue reported. We'll review and respond shortly.");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to report issue";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const affectedItem = orderItems.find((i) => i.id === affectedItemId);
  const claimEstimate = affectedItem
    ? Number(affectedItem.totalPrice)
    : orderTotal;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div
          className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto pointer-events-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Report an issue
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Tell us what went wrong — refunds within 10 min of delivery
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Window notice */}
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                Issues can only be reported within{" "}
                <strong>10 minutes</strong> of delivery. After that, please
                contact support.
              </div>
            </div>

            {/* Issue type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                What went wrong? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ISSUE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                      type === t.value
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span aria-hidden>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Affected item (optional) */}
            {orderItems.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Which item is affected?
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <select
                  value={affectedItemId}
                  onChange={(e) => setAffectedItemId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="">Whole order</option>
                  {orderItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.productName} × {item.quantity} — ₹
                      {Number(item.totalPrice).toFixed(0)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Selecting a specific item helps us process your refund faster.
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Describe the issue
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="E.g. The milk packet was leaking when delivered..."
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-primary-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {description.length}/500
              </p>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Add photos
                <span className="text-gray-400 font-normal ml-1">(optional, max 3)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 group"
                  >
                    <img
                      src={src}
                      alt={`Upload ${idx + 1}`}
                      className="block w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photoFiles.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="text-xs">Add</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Refund estimate */}
            {claimEstimate > 0 && (
              <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <div>
                  Estimated refund:{" "}
                  <strong>₹{claimEstimate.toFixed(0)}</strong>{" "}
                  {Number(claimEstimate) <= 500 ? (
                    <span className="text-green-700">
                      — auto-approved instantly to your wallet
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      — reviewed by our team (usually &lt; 2 hours)
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !type}
              className="w-full h-11 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Upload className="h-4 w-4 animate-pulse" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit issue
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
