"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutDashboard, Package, ShoppingCart, Users, TrendingUp, AlertTriangle, Store } from "lucide-react";
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
      </div>

      {/* ── Low Stock Products Table ── */}
      <div className="mb-6">
        <LowStockTable storeId={storeId} refreshKey={lowStockRefresh} />
      </div>

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
