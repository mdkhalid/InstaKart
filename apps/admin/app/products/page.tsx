"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, ToggleLeft, Trash2 } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirm } from "@/hooks/useConfirm";
import { formatPrice } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get("/admin/products?limit=100");
      setProducts(data.data?.products || []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = async (id: string, currentActive: boolean) => {
    try {
      await api.put(`/products/${id}`, { isActive: !currentActive });
      toast.success(`Product ${currentActive ? "deactivated" : "activated"}`);
      fetchProducts();
    } catch {
      toast.error("Failed to toggle product");
    }
  };

  const deleteProduct = async (id: string) => {
    const ok = await confirm({
      title: "Delete product?",
      message: "This will permanently remove the product and its images. This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (_: any, row: any) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
            {row.images?.[0]?.url ? "IMG" : "N/A"}
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: "sku", label: "SKU" },
    {
      key: "price",
      label: "Price",
      render: (v: number) => formatPrice(Number(v)),
    },
    { key: "stock", label: "Stock" },
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
            onClick={() => router.push(`/products/${row.id}/edit`)}
            className="p-1 hover:bg-gray-100 rounded text-blue-600"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleProduct(row.id, row.isActive)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ToggleLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteProduct(row.id)}
            className="p-1 hover:bg-gray-100 rounded text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => router.push("/products/new")}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>
      <DataTable columns={columns} data={products} loading={loading} searchable />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
