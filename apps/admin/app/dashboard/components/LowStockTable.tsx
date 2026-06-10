"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, Package, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import api from "@/lib/api";

interface LowStockItem {
  productId: string;
  productName: string;
  slug: string;
  storeId: string | null;
  storeName: string | null;
  stock: number;
  lowStockAlert: number;
  isOutOfStock: boolean;
}

interface LowStockTableProps {
  storeId?: string;
  /** Triggered by socket events to refresh data */
  refreshKey?: number;
}

export function LowStockTable({ storeId, refreshKey = 0 }: LowStockTableProps) {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLowStock = useCallback(async () => {
    setLoading(true);
    try {
      const params = storeId ? `?storeId=${storeId}` : "";
      const { data } = await api.get(`/admin/low-stock${params}`);
      setItems(data.data || []);
    } catch (err) {
      console.error("Failed to fetch low stock:", err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock, refreshKey]);

  const outOfStock = items.filter((i) => i.isOutOfStock);
  const lowStock = items.filter((i) => !i.isOutOfStock);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span>Low Stock Products</span>
        </h2>
        <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span>Low Stock Products</span>
        </h2>
        <div className="flex items-center space-x-3">
          {items.length > 0 && (
            <span className="text-sm text-gray-500">
              <span className="text-red-600 font-semibold">{outOfStock.length}</span> out of stock
              {" · "}
              <span className="text-amber-600 font-semibold">{lowStock.length}</span> low
            </span>
          )}
          <button
            onClick={fetchLowStock}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <Package className="h-10 w-10 mb-2" />
          <p className="text-sm">All products are well-stocked</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-2 pr-3 font-medium">Product</th>
                <th className="text-left py-2 px-3 font-medium">Store</th>
                <th className="text-center py-2 px-3 font-medium">Stock</th>
                <th className="text-center py-2 px-3 font-medium">Alert At</th>
                <th className="text-center py-2 px-3 font-medium">Status</th>
                <th className="text-right py-2 pl-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr
                  key={`${item.productId}-${item.storeId || "global"}`}
                  className={`hover:bg-gray-50 transition-colors ${
                    item.isOutOfStock ? "bg-red-50/50" : ""
                  }`}
                >
                  <td className="py-2.5 pr-3">
                    <span className="font-medium text-gray-900">{item.productName}</span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600">
                    {item.storeName || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`font-semibold ${
                        item.isOutOfStock ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {item.stock}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-gray-500">
                    {item.lowStockAlert}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.isOutOfStock ? (
                      <StatusBadge variant="destructive">Out of Stock</StatusBadge>
                    ) : (
                      <StatusBadge variant="warning">Low Stock</StatusBadge>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <Link
                      href={`/products/${item.productId}/edit`}
                      className="text-primary-600 hover:text-primary-700 text-xs font-medium hover:underline"
                    >
                      Edit Product
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
