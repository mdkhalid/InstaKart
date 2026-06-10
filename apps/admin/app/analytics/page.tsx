"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, Users, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { StatsCard } from "@/components/StatsCard";
import { StoreFilter } from "@/components/StoreFilter";
import { formatPrice } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = storeId ? `?storeId=${storeId}` : "";
      const { data: res } = await api.get(`/admin/analytics${params}`);
      setData(res.data);
    } catch {
      toast.error("Failed to load analytics");
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
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading analytics...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Failed to load data</div>;

  const { topSearches, topViewedProducts, searchTrend, summary } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <StoreFilter value={storeId} onChange={setStoreId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Searches (30d)" value={summary?.totalSearches || 0} icon={<Search className="h-5 w-5" />} />
        <StatsCard title="Unique Searchers" value={summary?.uniqueSearchers || 0} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="Unique Search Terms" value={summary?.uniqueSearchTerms || 0} icon={<BarChart3 className="h-5 w-5" />} />
        <StatsCard title="Products Viewed" value={topViewedProducts?.length || 0} icon={<Eye className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Search Trends (Last 14 Days)</h2>
          {searchTrend?.length === 0 ? (
            <p className="text-gray-500 text-sm">No search data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={searchTrend?.slice(-14)} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(val: string) => val?.slice(5) || ""}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Searches"]}
                  labelFormatter={(label: string) => `Date: ${label}`}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "13px",
                  }}
                  cursor={{ fill: "#f0fdf4" }}
                />
                <Bar dataKey="searches" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Top Search Queries</h2>
          {topSearches?.length === 0 ? (
            <p className="text-gray-500 text-sm">No search data</p>
          ) : (
            <div className="space-y-2">
              {topSearches?.map((item: any, i: number) => (
                <div
                  key={item.query}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-400 w-6">{i + 1}.</span>
                    <span className="text-sm font-medium text-gray-900">{item.query}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-primary-600">{item.count}</span>
                    <span className="text-xs text-gray-400">searches</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Top Viewed Products</h2>
        {topViewedProducts?.length === 0 ? (
          <p className="text-gray-500 text-sm">No view data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-gray-500">#</th>
                  <th className="pb-3 font-medium text-gray-500">Product</th>
                  <th className="pb-3 font-medium text-gray-500">Price</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {topViewedProducts?.map((item: any, i: number) => (
                  <tr key={item.productId} className="border-b last:border-0">
                    <td className="py-3 text-gray-400 w-8">{i + 1}</td>
                    <td className="py-3">
                      {item.product ? (
                        <Link
                          href={`/products/${item.product.id}/edit`}
                          className="flex items-center space-x-3 hover:text-primary-600"
                        >
                          <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {item.product.images?.[0]?.url ? (
                              <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{item.product.name}</span>
                        </Link>
                      ) : (
                        <span className="text-gray-400 italic">Deleted product</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-600">
                      {item.product ? formatPrice(Number(item.product.salePrice || item.product.price)) : "-"}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center space-x-1 font-semibold text-primary-600">
                        <Eye className="h-4 w-4" />
                        <span>{item.views}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
