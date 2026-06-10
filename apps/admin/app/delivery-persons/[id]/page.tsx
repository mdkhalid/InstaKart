"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Mail, Bike, Star, Clock,
  RefreshCw, CheckCircle,
  Navigation, Award, IndianRupee, Activity,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

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
  createdAt: string;
  updatedAt: string;
  _count: { assignments: number };
  assignments: Assignment[];
}

interface Assignment {
  id: string;
  status: string;
  assignedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  notes: string | null;
  distanceKm: number | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
  } | null;
}

interface ActivitySummary {
  totalOrdersAssigned: number;
  totalOrdersCompleted: number;
  totalOrdersFailed: number;
  totalEarnings: number;
  totalDistanceKm: number;
  today: {
    ordersAssigned: number;
    ordersCompleted: number;
    ordersFailed: number;
    earnings: number;
    distanceKm: number;
    startTime: string | null;
    endTime: string | null;
  } | null;
}

interface DailyActivity {
  id: string;
  date: string;
  ordersAssigned: number;
  ordersCompleted: number;
  ordersFailed: number;
  earnings: number;
  distanceKm: number;
  startTime: string | null;
  endTime: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  ON_DELIVERY: "bg-blue-100 text-blue-800",
  OFF_DUTY: "bg-gray-100 text-gray-600",
  INACTIVE: "bg-red-100 text-red-800",
};

const ASSIGNMENT_STATUS_DOT: Record<string, string> = {
  ASSIGNED: "bg-blue-500",
  PICKED_UP: "bg-amber-500",
  IN_TRANSIT: "bg-indigo-500",
  DELIVERED: "bg-green-500",
  FAILED: "bg-red-500",
};

const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

const VEHICLE_ICONS: Record<string, string> = {
  BIKE: "🏍️",
  SCOOTER: "🛵",
  CAR: "🚗",
  WALK: "🚶",
};

export default function DeliveryPersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [person, setPerson] = useState<DeliveryPerson | null>(null);
  const [activity, setActivity] = useState<{ activities: DailyActivity[]; summary: ActivitySummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerson = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [personRes, activityRes] = await Promise.all([
        api.get(`/admin/delivery-persons/${params.id}`),
        api.get(`/admin/delivery-persons/${params.id}/activity?days=30`),
      ]);
      setPerson(personRes.data.data);
      setActivity(activityRes.data.data);
    } catch (err: any) {
      const message = err.response?.status === 404
        ? "Delivery person not found"
        : "Failed to load details";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params?.id) fetchPerson();
  }, [params?.id, fetchPerson]);

  const completionRate = person && person.totalDeliveries > 0
    ? Math.round((person.totalDeliveries / Math.max(person._count.assignments, 1)) * 100)
    : 0;

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-6">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border p-6 mt-6">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <Bike className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{error}</h2>
        <p className="text-gray-500 mb-6">The delivery person could not be found or loaded.</p>
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={() => router.push("/delivery-persons")}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Delivery Persons
          </button>
          <button
            onClick={fetchPerson}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!person) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start space-x-4">
          <button
            onClick={() => router.push("/delivery-persons")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            title="Back to Delivery Persons"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-lg font-bold text-primary-700">
                  {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {person.firstName} {person.lastName}
                  </h1>
                  <StatusBadge variant={person.status === "ON_DELIVERY" ? "warning" : person.status === "ACTIVE" ? "success" : person.status === "OFF_DUTY" ? "secondary" : "destructive"}>
                    {person.status === "ON_DELIVERY" ? "On Delivery" : person.status.charAt(0) + person.status.slice(1).toLowerCase()}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {person.employeeId && (
                    <span className="text-xs text-gray-400">ID: {person.employeeId}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {VEHICLE_ICONS[person.vehicleType] || "🚲"} {person.vehicleType?.toLowerCase()}
                    {person.vehicleNumber && <span className="ml-1">({person.vehicleNumber})</span>}
                  </span>
                  <span className="text-xs text-gray-400">
                    Joined {formatDate(person.joinedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={fetchPerson}
          className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </button>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            Rating
          </div>
          <p className="text-2xl font-bold text-gray-900">{person.rating.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Deliveries
          </div>
          <p className="text-2xl font-bold text-gray-900">{person.totalDeliveries}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Award className="h-4 w-4 text-purple-500" />
            Completion Rate
          </div>
          <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <IndianRupee className="h-4 w-4 text-emerald-500" />
            Total Earnings
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(person.totalEarnings)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Activity className="h-4 w-4 text-blue-500" />
            Today
          </div>
          <p className="text-2xl font-bold text-gray-900">{activity?.summary.today?.ordersCompleted || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">completed today</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Navigation className="h-4 w-4 text-indigo-500" />
            Assignments
          </div>
          <p className="text-2xl font-bold text-gray-900">{person._count.assignments}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment History */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold">Assignment History</h2>
                </div>
                <span className="text-xs text-gray-400">{person.assignments.length} recent</span>
              </div>
            </div>
            {person.assignments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Assigned</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {person.assignments.map((a) => (
                      <tr
                        key={a.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/orders/${a.order?.id}`)}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{a.order?.orderNumber || "—"}</p>
                          <p className="text-xs text-gray-400">{a.order && formatDate(a.order.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${ASSIGNMENT_STATUS_DOT[a.status] || "bg-gray-400"}`} />
                            <span className="text-sm text-gray-700">{ASSIGNMENT_STATUS_LABEL[a.status] || a.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDateTime(a.assignedAt)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {a.order ? formatPrice(a.order.total) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {a.deliveredAt ? (
                            <span className="text-xs text-green-600">
                              {Math.round((new Date(a.deliveredAt).getTime() - new Date(a.assignedAt).getTime()) / 60000)} min
                            </span>
                          ) : a.failedAt ? (
                            <span className="text-xs text-red-500">Failed</span>
                          ) : (
                            <span className="text-xs text-gray-400">In progress</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Navigation className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-500">No delivery assignments yet</p>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          {activity && activity.activities.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold">Last 30 Days Activity</h2>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> Completed: {activity.summary.totalOrdersCompleted}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> Failed: {activity.summary.totalOrdersFailed}
                  </span>
                </div>
              </div>

              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-24 mb-4">
                {activity.activities.slice().reverse().slice(-30).map((day) => {
                  const maxVal = Math.max(
                    ...activity.activities.map((a) => a.ordersCompleted + a.ordersFailed),
                    1
                  );
                  const completedHeight = (day.ordersCompleted / maxVal) * 100;
                  const failedHeight = (day.ordersFailed / maxVal) * 100;
                  return (
                    <div
                      key={day.id}
                      className="flex-1 flex flex-col justify-end relative group"
                      title={`${formatDate(day.date)}: ${day.ordersCompleted} completed, ${day.ordersFailed} failed, ₹${day.earnings}`}
                    >
                      <div className="flex flex-col-reverse">
                        {day.ordersFailed > 0 && (
                          <div
                            className="w-full bg-red-400 rounded-t transition-all hover:opacity-80"
                            style={{ height: `${Math.max(failedHeight, 2)}%` }}
                          />
                        )}
                        {day.ordersCompleted > 0 && (
                          <div
                            className="w-full bg-green-400 rounded-t transition-all hover:opacity-80"
                            style={{ height: `${Math.max(completedHeight, 2)}%` }}
                          />
                        )}
                      </div>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                        {formatDate(day.date)}: {day.ordersCompleted} done, ₹{day.earnings}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Activity summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{activity.summary.totalOrdersAssigned}</p>
                  <p className="text-xs text-gray-500">Total Assigned</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{activity.summary.totalOrdersCompleted}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-500">{activity.summary.totalOrdersFailed}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{formatPrice(activity.summary.totalEarnings)}</p>
                  <p className="text-xs text-gray-500">Earnings (30d)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bike className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Profile Info</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900">{person.phone}</span>
              </div>
              {person.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900">{person.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900">
                  {person.type === "FULL_TIME" ? "Full Time" : "Part Time"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Navigation className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900">
                  {VEHICLE_ICONS[person.vehicleType] || "🚲"} {person.vehicleType?.toLowerCase()}
                  {person.vehicleNumber ? ` (${person.vehicleNumber})` : ""}
                </span>
              </div>
              {person.hourlyRate && (
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900">{formatPrice(person.hourlyRate)}/hr</span>
                </div>
              )}
              {person.monthlySalary && (
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900">{formatPrice(person.monthlySalary)}/mo</span>
                </div>
              )}
            </div>
          </div>

          {/* Today's Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Today</h2>
            </div>
            {activity?.summary.today ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Completed</span>
                  <span className="font-medium text-green-600">{activity.summary.today.ordersCompleted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Failed</span>
                  <span className="font-medium text-red-500">{activity.summary.today.ordersFailed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Earnings</span>
                  <span className="font-medium text-emerald-600">{formatPrice(activity.summary.today.earnings)}</span>
                </div>
                {activity.summary.today.distanceKm > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Distance</span>
                    <span className="font-medium">{activity.summary.today.distanceKm.toFixed(1)} km</span>
                  </div>
                )}
                {activity.summary.today.startTime && (
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-gray-500">Started</span>
                    <span className="font-medium text-xs">
                      {new Date(activity.summary.today.startTime).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-500">No activity today yet</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Meta</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Person ID</span>
                <span className="font-mono text-xs text-gray-700">{person.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Assignments</span>
                <span className="font-medium">{person._count.assignments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Deliveries</span>
                <span className="font-medium">{person.totalDeliveries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Completion Rate</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-gray-500">Created</span>
                <span className="text-xs">{formatDate(person.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="text-xs">{formatDate(person.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
