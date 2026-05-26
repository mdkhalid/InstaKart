"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, Package, ShoppingCart, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatsCard } from "@/components/StatsCard";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { formatPrice, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data: res } = await api.get("/admin/dashboard");
      setData(res.data);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load data</div>;

  const { stats, recentOrders, revenueChart } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Revenue" value={formatPrice(stats.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatsCard title="Today Revenue" value={formatPrice(stats.todayRevenue)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatsCard title="Pending Orders" value={stats.pendingOrders} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatsCard title="Total Products" value={stats.totalProducts} icon={<Package className="h-5 w-5" />} />
        <StatsCard title="Low Stock Items" value={stats.lowStockProducts} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatsCard title="Total Users" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="New Users Today" value={stats.newUsersToday} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="All Time Orders" value={stats.totalOrders} icon={<ShoppingCart className="h-5 w-5" />} />
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
                    <StatusBadge variant={getStatusVariant(order.status) as any}>
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
            <div className="space-y-1">
              {revenueChart?.slice(-14).map((day: any, i: number) => (
                <div key={i} className="flex items-center space-x-2 text-sm">
                  <span className="w-24 text-gray-500">{day.date?.slice(5)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4">
                    <div
                      className="bg-primary-500 rounded-full h-4 transition-all"
                      style={{ width: `${Math.min(100, (day.revenue / Math.max(...revenueChart.map((d: any) => d.revenue))) * 100)}%` }}
                    />
                  </div>
                  <span className="w-20 text-right font-medium">{formatPrice(day.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
