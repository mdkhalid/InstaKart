"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Bike, User } from "lucide-react";
import { useStoreStore } from "../../../../web/stores/storeStore";
import api from "@/lib/api";
import toast from "react-hot-toast";

const VEHICLE_TYPES = [
  { value: "BIKE", label: "🏍️ Bike" },
  { value: "SCOOTER", label: "🛵 Scooter" },
  { value: "CAR", label: "🚗 Car" },
  { value: "WALK", label: "🚶 Walk" },
];

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
];

export default function NewDeliveryPersonPage() {
  const router = useRouter();
  const { currentStore } = useStoreStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    employeeId: "",
    type: "FULL_TIME",
    hourlyRate: "",
    monthlySalary: "",
    vehicleType: "BIKE",
    vehicleNumber: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (form.phone.trim().length < 10) {
      toast.error("Phone number must be at least 10 digits");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        employeeId: form.employeeId.trim() || undefined,
        type: form.type,
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber.trim() || undefined,
      };

      if (form.type === "PART_TIME" && form.hourlyRate) {
        payload.hourlyRate = parseFloat(form.hourlyRate);
      }
      if (form.type === "FULL_TIME" && form.monthlySalary) {
        payload.monthlySalary = parseFloat(form.monthlySalary);
      }

      // Pass storeId so SUPER_ADMIN users can create persons in the selected store
      if (currentStore?.id) {
        payload.storeId = currentStore.id;
      }

      await api.post("/admin/delivery-persons", payload);
      toast.success("Delivery person added");
      router.push("/delivery-persons");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to add delivery person";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const showHourlyRate = form.type === "PART_TIME";
  const showMonthlySalary = form.type === "FULL_TIME";

  return (
    <div>
      <button
        onClick={() => router.push("/delivery-persons")}
        className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back to Delivery Persons</span>
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
          <User className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Delivery Person</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentStore ? `Store: ${currentStore.name}` : "Add a new delivery person to your team"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. Rahul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. Kumar"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                type="tel"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. 9876543210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="rahul@example.com"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID (Internal)</label>
            <input
              name="employeeId"
              value={form.employeeId}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. EMP-001"
            />
          </div>
        </div>

        {/* Employment */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Employment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              {showHourlyRate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₹)</label>
                  <input
                    name="hourlyRate"
                    value={form.hourlyRate}
                    onChange={handleChange}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g. 150"
                  />
                </div>
              )}
              {showMonthlySalary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
                  <input
                    name="monthlySalary"
                    value={form.monthlySalary}
                    onChange={handleChange}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g. 25000"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bike className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Vehicle</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
              <select
                name="vehicleType"
                value={form.vehicleType}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {VEHICLE_TYPES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
              <input
                name="vehicleNumber"
                value={form.vehicleNumber}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. DL-01-AB-1234"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Adding..." : "Add Delivery Person"}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/delivery-persons")}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
