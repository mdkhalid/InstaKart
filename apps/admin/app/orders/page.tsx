"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { StoreFilter } from "@/components/StoreFilter";
import { formatPrice } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

const STATUSES = ["", "PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [storeId, setStoreId] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.append("status", statusFilter);
      if (storeId) params.append("storeId", storeId);
      const { data } = await api.get(`/admin/orders?${params}`);
      setOrders(data.data?.orders || []);
      setTotalPages(data.data?.pagination?.totalPages || 1);
      setTotal(data.data?.pagination?.total || 0);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, storeId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const columns = [
    { key: "orderNumber", label: "Order #" },
    {
      key: "user",
      label: "Customer",
      render: (_: any, row: any) => row.user ? `${row.user.firstName} ${row.user.lastName}` : "—",
    },
    {
      key: "items",
      label: "Items",
      render: (items: any[]) => items?.length || 0,
    },
    {
      key: "total",
      label: "Total",
      render: (v: number) => formatPrice(Number(v)),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <StatusBadge variant={getStatusVariant(v)}>{v}</StatusBadge>
      ),
    },
    {
      key: "paymentStatus",
      label: "Payment",
      render: (v: string) => (
        <StatusBadge variant={v === "PAID" ? "success" : "warning"}>{v}</StatusBadge>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="flex items-center space-x-3">
          <StoreFilter value={storeId} onChange={(id) => { setStoreId(id); setPage(1); }} />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="">All Status</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        onRowClick={(row: any) => router.push(`/orders/${row.id}`)}
        pagination={{ page, totalPages, onPageChange: setPage }}
      />
    </div>
  );
}
