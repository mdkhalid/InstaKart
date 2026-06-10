"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutDashboard, Package, ShoppingCart, Users, TrendingUp, AlertTriangle, Store, UserCheck, Navigation } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { StoreFilter } from "@/components/StoreFilter";
import { formatPrice } from "@/lib/utils";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { LowStockTable } from "./components/LowStockTable";
import api from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState("");
  const [lowStockRefresh, setLowStockRefresh] = useState(0);

  // ── Real-time socket notifications ──
  useAdminSocket({
    onLowStock: (alert) => {
      const count = alert.items.length;
      toast(
        `⚠️ ${count} product(s) running low${alert.storeId ? " in selected store" : ""}`,
        { icon: "⚠️", duration: 5000 }
      );
      setLowStockRefresh((n) => n + 1);
    },
    onNewOrder: () => {
      toast.success("New order received!");
      fetchDashboard();
    },
  });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = storeId ? `?storeId=${storeId}` : "";
      const { data: res } = await api.get(`/admin/dashboard${params}`);
      setData(res.data);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load data</div>;

  const { stats, recentOrders, revenueChart } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <StoreFilter value={storeId} onChange={setStoreId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Revenue" value={formatPrice(stats.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatsCard title="Today Revenue" value={formatPrice(stats.todayRevenue)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatsCard title="Pending Orders" value={stats.pendingOrders} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatsCard title="Total Products" value={stats.totalProducts} icon={<Package className="h-5 w-5" />} />
        <StatsCard title="Total Users" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="New Users Today" value={stats.newUsersToday} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="All Time Orders" value={stats.totalOrders} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatsCard title="Active Stores" value={stats.totalStores} icon={<Store className="h-5 w-5" />} />
        <StatsCard title="Active Delivery" value={stats.activeDeliveryPersons} icon={<UserCheck className="h-5 w-5" />} />
        <StatsCard title="Pending Delivery" value={stats.pendingDeliveries} icon={<Navigation className="h-5 w-5" />} />
      </div>

      {/* ── Low Stock Products Table ── */}
      <div className="mb-6">
        <LowStockTable storeId={storeId} refreshKey={lowStockRefresh} />
      </div>

      {/* ── Delivery Activity Section ── */}
      {data.recentDeliveryAssignments && data.recentDeliveryAssignments.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              <span className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary-600" />
                Recent Delivery Activity
              </span>
            </h2>
            <button
              onClick={() => router.push("/delivery-persons")}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              View all →
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Delivery Person</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Assigned At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentDeliveryAssignments.map((a: any) => (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/orders/${a.orderId}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{a.order?.orderNumber || "—"}</p>
                      <p className="text-xs text-gray-400">
                        {a.order?.createdAt ? new Date(a.order.createdAt).toLocaleDateString() : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary-700">
                            {a.deliveryPerson?.firstName?.charAt(0)}{a.deliveryPerson?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {a.deliveryPerson?.firstName} {a.deliveryPerson?.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{a.deliveryPerson?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 capitalize">
                        {a.deliveryPerson?.vehicleType?.toLowerCase() === "bike" ? "🏍️" : "🛵"} {a.deliveryPerson?.vehicleType?.toLowerCase()}
                        {a.deliveryPerson?.vehicleNumber && (
                          <span className="text-xs text-gray-400 ml-1">({a.deliveryPerson.vehicleNumber})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={getStatusVariant(a.status)}>
                        {a.status === "ASSIGNED" ? "Assigned" : a.status === "PICKED_UP" ? "Picked Up" : a.status === "IN_TRANSIT" ? "In Transit" : a.status === "DELIVERED" ? "Delivered" : a.status === "FAILED" ? "Failed" : a.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-500">
                        {a.assignedAt ? new Date(a.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          {recentOrders?.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent orders</p>
          ) : (
            <div className="space-y-3">
              {recentOrders?.map((order: any) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.user?.firstName} {order.user?.lastName}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </StatusBadge>
                    <p className="text-sm font-semibold mt-1">{formatPrice(Number(order.total))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue (Last 30 Days)</h2>
          {revenueChart?.length === 0 ? (
            <p className="text-gray-500 text-sm">No revenue data</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={revenueChart?.slice(-14)} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickFormatter={(val: string) => val?.slice(5) || ""}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickFormatter={(val: number) => `₹${(val / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), "Revenue"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "13px",
                  }}
                  cursor={{ fill: "#f0fdf4" }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
