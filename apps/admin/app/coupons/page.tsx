"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, ToggleLeft, ToggleRight, Trash2, Percent, Copy } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/useConfirm";
import { formatPrice, cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CouponFormData {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  expiresAt: string;
}

const defaultForm: CouponFormData = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: 10,
  minOrderAmount: null,
  maxDiscount: null,
  usageLimit: null,
  expiresAt: "",
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/coupons");
      setCoupons(data.data || []);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (form.discountValue <= 0) {
      toast.error("Discount value must be positive");
      return;
    }
    if (form.discountType === "PERCENTAGE" && form.discountValue > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: form.discountValue,
        minOrderAmount: form.minOrderAmount || null,
        maxDiscount: form.maxDiscount || null,
        usageLimit: form.usageLimit || null,
        expiresAt: form.expiresAt || null,
      };

      if (editId) {
        await api.put(`/admin/coupons/${editId}`, payload);
        toast.success("Coupon updated");
      } else {
        await api.post("/admin/coupons", payload);
        toast.success("Coupon created");
      }

      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount,
      usageLimit: coupon.usageLimit,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : "",
    });
    setEditId(coupon.id);
    setShowForm(true);
  };

  const handleNew = () => {
    setForm(defaultForm);
    setEditId(null);
    setShowForm(true);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await api.put(`/admin/coupons/${id}`, { isActive: !currentActive });
      toast.success(`Coupon ${currentActive ? "deactivated" : "activated"}`);
      fetchCoupons();
    } catch {
      toast.error("Failed to toggle coupon");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete coupon?",
      message: "This will permanently delete the coupon. Customers with saved codes will no longer be able to use it.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/coupons/${id}`);
      toast.success("Coupon deleted");
      fetchCoupons();
    } catch {
      toast.error("Failed to delete coupon");
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft < 48;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() < Date.now();
  };

  const columns = [
    {
      key: "code",
      label: "Code",
      render: (v: string) => (
        <div className="flex items-center space-x-2">
          <span className="font-mono font-semibold text-sm bg-gray-100 px-2 py-0.5 rounded">
            {v}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(v); }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Copy code"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (v: string | null) => (
        <span className="text-gray-600 text-sm">{v || "—"}</span>
      ),
    },
    {
      key: "discountType",
      label: "Discount",
      render: (_: any, row: Coupon) => (
        <span className="font-medium text-sm">
          {row.discountType === "PERCENTAGE"
            ? `${row.discountValue}% off`
            : formatPrice(row.discountValue)}
          {row.maxDiscount && row.discountType === "PERCENTAGE" && (
            <span className="text-gray-400 text-xs ml-1">
              (up to {formatPrice(row.maxDiscount)})
            </span>
          )}
        </span>
      ),
    },
    {
      key: "minOrderAmount",
      label: "Min Order",
      render: (v: number | null) => (
        <span className="text-sm text-gray-600">
          {v ? formatPrice(v) : "—"}
        </span>
      ),
    },
    {
      key: "usedCount",
      label: "Used",
      render: (v: number, row: Coupon) => (
        <span className="text-sm">
          {v}
          {row.usageLimit && (
            <span className="text-gray-400"> / {row.usageLimit}</span>
          )}
        </span>
      ),
    },
    {
      key: "expiresAt",
      label: "Expires",
      render: (v: string | null) => {
        if (!v) return <span className="text-sm text-gray-400">Never</span>;
        const expired = isExpired(v);
        const soon = isExpiringSoon(v);
        return (
          <span className={cn(
            "text-sm",
            expired ? "text-red-600 font-medium" : soon ? "text-amber-600 font-medium" : "text-gray-600"
          )}>
            {expired ? "Expired" : soon ? "Expiring soon" : new Date(v).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      render: (v: boolean) => (
        <StatusBadge variant={v ? "success" : "destructive"}>
          {v ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: Coupon) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            className="p-1 hover:bg-gray-100 rounded text-blue-600"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(row.id, row.isActive); }}
            className="p-1 hover:bg-gray-100 rounded"
            title={row.isActive ? "Deactivate" : "Activate"}
          >
            {row.isActive ? (
              <ToggleRight className="h-4 w-4 text-green-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
            className="p-1 hover:bg-gray-100 rounded text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // ── Summary stats ──
  const activeCount = coupons.filter((c) => c.isActive && !isExpired(c.expiresAt)).length;
  const expiredCount = coupons.filter((c) => isExpired(c.expiresAt)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} active · {expiredCount} expired · {coupons.length} total
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Coupon
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Percent className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Active</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Expired</p>
              <p className="text-2xl font-bold text-gray-900">{expiredCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Copy className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Total Codes</p>
              <p className="text-2xl font-bold text-gray-900">{coupons.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Table */}
      <DataTable columns={columns} data={coupons} loading={loading} searchable />
      {dialogProps && <ConfirmDialog {...dialogProps} />}

      {/* Create/Edit Modal */}
      <Dialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditId(null); }}
        title={editId ? "Edit Coupon" : "Create Coupon"}
      >
        <div className="p-4 space-y-4">
          {/* Coupon Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. SAVE20"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase"
              maxLength={20}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. 20% off on your first order"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "PERCENTAGE" | "FIXED" })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.discountType === "PERCENTAGE" ? "Discount %" : "Discount Amount"}
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                min={0}
                max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                step={form.discountType === "PERCENTAGE" ? 1 : 1}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Max Discount (percentage only) */}
          {form.discountType === "PERCENTAGE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Amount (₹)</label>
              <input
                type="number"
                value={form.maxDiscount || ""}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value ? parseFloat(e.target.value) : null })}
                min={0}
                placeholder="Leave empty for no limit"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          )}

          {/* Min Order Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount (₹)</label>
            <input
              type="number"
              value={form.minOrderAmount || ""}
              onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value ? parseFloat(e.target.value) : null })}
              min={0}
              placeholder="Leave empty for no minimum"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Usage Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
            <input
              type="number"
              value={form.usageLimit || ""}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? parseInt(e.target.value) : null })}
              min={0}
              placeholder="Leave empty for unlimited"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editId ? "Update Coupon" : "Create Coupon"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
