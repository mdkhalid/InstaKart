"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { formatPrice, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get(`/admin/orders?${params}`);
      setOrders(data.data?.orders || []);
      setTotalPages(data.data?.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: "orderNumber", label: "Order #" },
    {
      key: "user",
      label: "Customer",
      render: (v: any) => v ? `${v.firstName} ${v.lastName}` : "N/A",
    },
    { key: "items", label: "Items", render: (v: any[]) => v?.length || 0 },
    {
      key: "total",
      label: "Total",
      render: (v: number) => formatPrice(Number(v)),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <StatusBadge variant={getStatusVariant(v) as any}>{v}</StatusBadge>
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
      render: (v: string) => formatDate(v),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PREPARING">Preparing</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchable
        pagination={{ page, totalPages, onPageChange: setPage }}
        onRowClick={(row: any) => router.push(`/orders/${row.id}`)}
      />
    </div>
  );
}
