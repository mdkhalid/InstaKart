"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface CouponForm {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  usageLimit: string;
  expiresAt: string;
}

const emptyForm: CouponForm = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  expiresAt: "",
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get("/admin/coupons");
      setCoupons(data.data || []);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
    if (!form.discountValue || Number(form.discountValue) <= 0) { toast.error("Valid discount value is required"); return; }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        expiresAt: form.expiresAt || undefined,
      };

      if (editingCoupon) {
        await api.put(`/admin/coupons/${editingCoupon.id}`, payload);
        toast.success("Coupon updated");
      } else {
        await api.post("/admin/coupons", payload);
        toast.success("Coupon created");
      }

      setShowForm(false);
      setEditingCoupon(null);
      setForm(emptyForm);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : "",
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await api.delete(`/admin/coupons/${id}`);
      toast.success("Coupon deleted");
      fetchCoupons();
    } catch {
      toast.error("Failed to delete coupon");
    }
  };

  const handleToggleActive = async (coupon: any) => {
    try {
      await api.put(`/admin/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      toast.success(`Coupon ${coupon.isActive ? "deactivated" : "activated"}`);
      fetchCoupons();
    } catch {
      toast.error("Failed to toggle coupon");
    }
  };

  const openCreateForm = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">Manage promo codes and discounts</p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-1" /> Add Coupon
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <Percent className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-1">No coupons yet</p>
            <p className="text-sm text-gray-400 mb-4">Create your first promo code</p>
            <Button variant="outline" onClick={openCreateForm}>Create Coupon</Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {coupons.map((coupon: any) => {
              const expired = isExpired(coupon.expiresAt);
              return (
                <div key={coupon.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <Percent className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-gray-900">{coupon.code}</span>
                        <StatusBadge variant={coupon.isActive ? "success" : "destructive"}>
                          {coupon.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                        {expired && coupon.isActive && (
                          <StatusBadge variant="warning">Expired</StatusBadge>
                        )}
                      </div>
                      {coupon.description && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{coupon.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-1.5 text-xs text-gray-400">
                        <span className="font-medium text-gray-700">
                          {coupon.discountType === "PERCENTAGE"
                            ? `${coupon.discountValue}% OFF`
                            : formatPrice(coupon.discountValue)}
                        </span>
                        {coupon.minOrderAmount && (
                          <span>Min: {formatPrice(coupon.minOrderAmount)}</span>
                        )}
                        {coupon.maxDiscount && coupon.discountType === "PERCENTAGE" && (
                          <span>Max: {formatPrice(coupon.maxDiscount)}</span>
                        )}
                        {coupon.usageLimit && (
                          <span>Used: {coupon.usedCount}/{coupon.usageLimit}</span>
                        )}
                        {coupon.expiresAt && (
                          <span>Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={coupon.isActive ? "Deactivate" : "Activate"}
                    >
                      <ToggleLeft className={`h-4 w-4 ${coupon.isActive ? "text-green-600" : "text-gray-400"}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingCoupon(null); }}
        title={editingCoupon ? "Edit Coupon" : "Create Coupon"}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. SAVE20"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!!editingCoupon}
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the offer"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                Discount {form.discountType === "PERCENTAGE" ? "Percentage" : "Amount"} *
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                placeholder={form.discountType === "PERCENTAGE" ? "e.g. 20" : "e.g. 100"}
                min="0"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                placeholder="e.g. 499"
                min="0"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {form.discountType === "PERCENTAGE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount</label>
                <input
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="e.g. 500"
                  min="0"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                placeholder="Unlimited"
                min="0"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button className="flex-1" onClick={handleSubmit} loading={saving}>
              {editingCoupon ? "Update Coupon" : "Create Coupon"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingCoupon(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
