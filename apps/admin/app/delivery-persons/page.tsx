"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Phone, Bike, Star, Clock, Filter, RefreshCw, UserCheck, UserX, Navigation, ChevronDown } from "lucide-react";
import { StoreFilter } from "@/components/StoreFilter";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface DeliveryPerson {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  employeeId: string | null;
  type: string;
  status: string;
  vehicleType: string;
  vehicleNumber: string | null;
  hourlyRate: number | null;
  monthlySalary: number | null;
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  joinedAt: string;
  _count: { assignments: number };
  store: { id: string; name: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  ON_DELIVERY: "bg-blue-100 text-blue-800",
  OFF_DUTY: "bg-gray-100 text-gray-600",
  INACTIVE: "bg-red-100 text-red-800",
};

const TYPE_BADGES: Record<string, string> = {
  FULL_TIME: "bg-purple-100 text-purple-700",
  PART_TIME: "bg-amber-100 text-amber-700",
};

const VEHICLE_ICONS: Record<string, string> = {
  BIKE: "🏍️",
  SCOOTER: "🛵",
  CAR: "🚗",
  WALK: "🚶",
};

const STATUS_CYCLE = ["ACTIVE", "OFF_DUTY", "INACTIVE"];

export default function DeliveryPersonsPage() {
  const router = useRouter();
  const [persons, setPersons] = useState<DeliveryPerson[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<any>(null);
  const [storeId, setStoreId] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const fetchPersons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (storeId) params.set("storeId", storeId);

      const { data } = await api.get(`/admin/delivery-persons?${params}`);
      setPersons(data.data?.persons || []);
      setPagination(data.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      toast.error("Failed to load delivery persons");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, storeId]);

  const fetchStats = useCallback(async () => {
    try {
      const params = storeId ? `?storeId=${storeId}` : "";
      const { data } = await api.get(`/admin/delivery-persons/stats${params}`);
      setStats(data.data);
    } catch {}
  }, [storeId]);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Close menu on outside mousedown using ref-based detection
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!openMenuId) return;
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && btnRef.current && !btnRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openMenuId]);

  const handleToggleStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/admin/delivery-persons/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus === "OFF_DUTY" ? "Off Duty" : newStatus.charAt(0) + newStatus.slice(1).toLowerCase()}`);
      fetchPersons();
      fetchStats();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to update status";
      toast.error(msg);
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPersons();
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Persons</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your delivery team</p>
          </div>
          <div className="flex items-center gap-3">
            <StoreFilter value={storeId} onChange={(id) => { setStoreId(id); setPage(1); }} />
            <Button variant="outline" size="sm" onClick={() => { fetchPersons(); fetchStats(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => router.push("/delivery-persons/new")}>
              <Plus className="h-4 w-4 mr-1" /> Add Person
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPersons}</p>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4">
              <p className="text-xs text-green-600 font-medium uppercase flex items-center gap-1"><UserCheck className="h-3 w-3" /> Available</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{stats.activePersons}</p>
            </div>
            <div className="bg-white rounded-xl border border-blue-200 p-4">
              <p className="text-xs text-blue-600 font-medium uppercase flex items-center gap-1"><Navigation className="h-3 w-3" /> On Delivery</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stats.onDelivery}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Off Duty</p>
              <p className="text-2xl font-bold text-gray-700 mt-1">{stats.offDuty}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Active Assignments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeAssignments}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase">Today&apos;s Assignments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayAssignments}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                />
              </div>
            </form>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_DELIVERY">On Delivery</option>
              <option value="OFF_DUTY">Off Duty</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500"
            >
              <option value="">All Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Deliveries</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">Loading...</td>
                  </tr>
                ) : persons.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">No delivery persons found</td>
                  </tr>
                ) : (
                  persons.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary-700">
                              {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{person.firstName} {person.lastName}</p>
                            {person.employeeId && (
                              <p className="text-xs text-gray-400">ID: {person.employeeId}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{person.store?.name || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          {person.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGES[person.type] || "bg-gray-100 text-gray-700"}`}>
                          {person.type === "FULL_TIME" ? "Full Time" : "Part Time"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <span>{VEHICLE_ICONS[person.vehicleType] || "🚲"}</span>
                          <span className="capitalize">{person.vehicleType?.toLowerCase()}</span>
                          {person.vehicleNumber && <span className="text-xs text-gray-400">({person.vehicleNumber})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 relative">
                        {person.status === "ON_DELIVERY" ? (
                          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[person.status] || "bg-gray-100 text-gray-700"}`}>
                            On Delivery
                          </span>
                        ) : (
                          <div className="relative">
                            <button
                              ref={openMenuId === person.id ? btnRef : undefined}
                              onClick={() => setOpenMenuId(openMenuId === person.id ? null : person.id)}
                              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[person.status] || "bg-gray-100 text-gray-700"} hover:opacity-80 transition-opacity cursor-pointer`}
                            >
                              {person.status === "OFF_DUTY" ? "Off Duty" : person.status.charAt(0) + person.status.slice(1).toLowerCase()}
                              <ChevronDown className="h-3 w-3" />
                            </button>

                            {openMenuId === person.id && (
                              <div
                                ref={menuRef}
                                className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[130px]"
                              >
                                {STATUS_CYCLE.map((status: string) => {
                                  const isCurrent = person.status === status;
                                  const label = status === "OFF_DUTY" ? "Off Duty" : status.charAt(0) + status.slice(1).toLowerCase();
                                  const dotColor =
                                    status === "ACTIVE" ? "bg-green-500" :
                                    status === "OFF_DUTY" ? "bg-gray-400" :
                                    "bg-red-500";
                                  return (
                                    <button
                                      key={status}
                                      onClick={() => handleToggleStatus(person.id, status)}
                                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                        isCurrent
                                          ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                                          : "text-gray-700 hover:bg-gray-50"
                                      }`}
                                      disabled={isCurrent}
                                    >
                                      <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
                                      {label}
                                      {isCurrent && <span className="ml-auto text-xs text-gray-400">✓</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-medium">{person.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700 font-medium">
                        {person.totalDeliveries}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/delivery-persons/${person.id}`)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
