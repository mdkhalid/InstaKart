"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    lat: "",
    lng: "",
    phone: "",
    email: "",
    openingTime: "06:00",
    closingTime: "23:00",
    deliveryRadiusKm: "5",
    deliveryFee: "40",
    minOrderAmount: "0",
  });

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    try {
      const { data } = await api.get(`/stores/${params.id}`);
      const s = data.data;
      setForm({
        name: s.name || "",
        addressLine1: s.addressLine1 || "",
        addressLine2: s.addressLine2 || "",
        city: s.city || "",
        state: s.state || "",
        pincode: s.pincode || "",
        lat: String(s.lat || ""),
        lng: String(s.lng || ""),
        phone: s.phone || "",
        email: s.email || "",
        openingTime: s.openingTime || "06:00",
        closingTime: s.closingTime || "23:00",
        deliveryRadiusKm: String(s.deliveryRadiusKm || "5"),
        deliveryFee: String(s.deliveryFee || "40"),
        minOrderAmount: String(s.minOrderAmount || "0"),
      });
    } catch {
      toast.error("Failed to load store");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/stores/${params.id}`, {
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        deliveryRadiusKm: parseFloat(form.deliveryRadiusKm),
        deliveryFee: parseFloat(form.deliveryFee),
        minOrderAmount: parseFloat(form.minOrderAmount),
      });
      toast.success("Store updated");
      router.push("/stores");
    } catch {
      toast.error("Failed to update store");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <button
        onClick={() => router.push("/stores")}
        className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back to Stores</span>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Store</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
          <input name="addressLine1" value={form.addressLine1} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
          <input name="addressLine2" value={form.addressLine2} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input name="city" value={form.city} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <input name="state" value={form.state} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
            <input name="pincode" value={form.pincode} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
            <input name="lat" value={form.lat} onChange={handleChange} required type="number" step="any" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
            <input name="lng" value={form.lng} onChange={handleChange} required type="number" step="any" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" value={form.email} onChange={handleChange} type="email" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Radius (km)</label>
            <input name="deliveryRadiusKm" value={form.deliveryRadiusKm} onChange={handleChange} type="number" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
            <input name="openingTime" value={form.openingTime} onChange={handleChange} type="time" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
            <input name="closingTime" value={form.closingTime} onChange={handleChange} type="time" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee (₹)</label>
            <input name="deliveryFee" value={form.deliveryFee} onChange={handleChange} type="number" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount (₹)</label>
            <input name="minOrderAmount" value={form.minOrderAmount} onChange={handleChange} type="number" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Update Store"}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/stores")}
            className="px-6 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
