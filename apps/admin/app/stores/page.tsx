"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, MapPin, ToggleLeft, ToggleRight } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirm } from "@/hooks/useConfirm";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data } = await api.get("/admin/stores");
      setStores(data.data || []);
    } catch {
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  const toggleStore = async (id: string, currentActive: boolean) => {
    try {
      await api.put(`/stores/${id}`, { isActive: !currentActive });
      toast.success(`Store ${currentActive ? "deactivated" : "activated"}`);
      fetchStores();
    } catch {
      toast.error("Failed to toggle store");
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "city", label: "City" },
    { key: "pincode", label: "Pincode" },
    {
      key: "location",
      label: "Location",
      render: (_: any, row: any) => (
        <span className="text-xs text-gray-500">
          {row.lat?.toFixed(4)}, {row.lng?.toFixed(4)}
        </span>
      ),
    },
    {
      key: "deliveryRadiusKm",
      label: "Radius",
      render: (v: number) => `${v} km`,
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
      render: (_: any, row: any) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push(`/stores/${row.id}/edit`)}
            className="p-1 hover:bg-gray-100 rounded text-blue-600"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push(`/stores/${row.id}/products`)}
            className="p-1 hover:bg-gray-100 rounded text-green-600"
            title="Manage inventory"
          >
            <MapPin className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleStore(row.id, row.isActive)}
            className="p-1 hover:bg-gray-100 rounded"
            title={row.isActive ? "Deactivate" : "Activate"}
          >
            {row.isActive ? (
              <ToggleRight className="h-4 w-4 text-green-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
        <button
          onClick={() => router.push("/stores/new")}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>Add Store</span>
        </button>
      </div>
      <DataTable columns={columns} data={stores} loading={loading} searchable />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
