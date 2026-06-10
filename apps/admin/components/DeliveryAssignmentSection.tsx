"use client";

import { useState, useEffect } from "react";
import { Bike, Phone, Star, Navigation, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface DeliveryPerson {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string | null;
  rating: number;
  totalDeliveries: number;
}

interface DeliveryAssignment {
  id: string;
  status: string;
  assignedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  notes: string | null;
  deliveryPerson: DeliveryPerson;
}

const ASSIGNMENT_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: [],
};

const ASSIGNMENT_LABELS: Record<string, string> = {
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

export default function DeliveryAssignmentSection({
  order,
  onRefresh,
}: {
  order: any;
  onRefresh: () => void;
}) {
  const assignment: DeliveryAssignment | null = order?.deliveryAssignment || null;
  const orderStatus = order?.status;
  const canAssign = ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"].includes(orderStatus) && !assignment;

  const [availablePersons, setAvailablePersons] = useState<DeliveryPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  // Fetch available persons when assignment is possible
  useEffect(() => {
    if (canAssign) {
      fetchAvailablePersons();
    }
  }, [canAssign]);

  const fetchAvailablePersons = async () => {
    setLoadingAvailable(true);
    try {
      // Pass the order's storeId so SUPER_ADMIN users can scope the query
      const storeId = order?.store?.id || order?.storeId;
      const params = storeId ? `?storeId=${storeId}` : "";
      const { data } = await api.get(`/admin/delivery-persons/available${params}`);
      setAvailablePersons(data.data || []);
      if (data.data?.length > 0) {
        setSelectedPersonId(data.data[0].id);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to load available persons";
      toast.error(msg);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPersonId) {
      toast.error("Please select a delivery person");
      return;
    }
    setAssigning(true);
    try {
      await api.post(`/admin/orders/${order.id}/assign-delivery`, {
        deliveryPersonId: selectedPersonId,
      });
      toast.success("Delivery person assigned");
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to assign delivery person";
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!assignment) return;
    setUpdatingStatus(true);
    try {
      await api.put(`/admin/delivery-assignments/${assignment.id}/status`, { status });
      toast.success(`Status updated to ${ASSIGNMENT_LABELS[status] || status}`);
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to update status";
      toast.error(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Bike className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold">Delivery Assignment</h2>
      </div>

      {assignment ? (
        /* ── Assigned ── */
        <div className="space-y-4">
          {/* Person Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-700">
                  {assignment.deliveryPerson.firstName.charAt(0)}
                  {assignment.deliveryPerson.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {assignment.deliveryPerson.firstName} {assignment.deliveryPerson.lastName}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {assignment.deliveryPerson.rating.toFixed(1)}
                  </span>
                  <span>
                    {VEHICLE_ICONS[assignment.deliveryPerson.vehicleType] || "🚲"}{" "}
                    {assignment.deliveryPerson.vehicleType?.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone className="h-3 w-3" />
              {assignment.deliveryPerson.phone}
              {assignment.deliveryPerson.vehicleNumber && (
                <span className="text-gray-400 ml-1">
                  · {assignment.deliveryPerson.vehicleNumber}
                </span>
              )}
            </div>
          </div>

          {/* Status & Transitions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
              <StatusBadge
                variant={
                  assignment.status === "ASSIGNED" ? "warning" :
                  assignment.status === "PICKED_UP" ? "secondary" :
                  assignment.status === "IN_TRANSIT" ? "default" :
                  assignment.status === "DELIVERED" ? "success" : "destructive"
                }
              >
                {ASSIGNMENT_LABELS[assignment.status] || assignment.status}
              </StatusBadge>
            </div>

            {ASSIGNMENT_TRANSITIONS[assignment.status]?.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs text-gray-500">Update assignment status:</p>
                <div className="flex flex-wrap gap-2">
                  {ASSIGNMENT_TRANSITIONS[assignment.status].map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => handleUpdateStatus(nextStatus)}
                      disabled={updatingStatus}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center ${
                        nextStatus === "FAILED"
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : nextStatus === "DELIVERED"
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : nextStatus === "PICKED_UP"
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      {updatingStatus && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                      {updatingStatus ? "..." : ASSIGNMENT_LABELS[nextStatus] || nextStatus}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : canAssign ? (
        /* ── Not assigned, can assign ── */
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Assign a delivery person to this order.</p>

          {loadingAvailable ? (
            <div className="text-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-300" />
              <p className="text-xs text-gray-500 mt-1">Loading available persons...</p>
            </div>
          ) : availablePersons.length === 0 ? (
            <div className="text-center py-4">
              <Navigation className="h-8 w-8 mx-auto text-gray-200 mb-1" />
              <p className="text-xs text-gray-500">No delivery persons available right now</p>
              <button
                onClick={fetchAvailablePersons}
                className="text-xs text-primary-600 hover:text-primary-800 mt-1"
              >
                Refresh
              </button>
            </div>
          ) : (
            <>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {availablePersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} · {VEHICLE_ICONS[p.vehicleType] || "🚲"} {p.vehicleType?.toLowerCase()} · ⭐{p.rating.toFixed(1)} · {p.totalDeliveries} deliveries
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAssign}
                  disabled={assigning || !selectedPersonId}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors inline-flex items-center justify-center"
                >
                  {assigning && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {assigning ? "Assigning..." : "Assign"}
                </button>
                <button
                  onClick={fetchAvailablePersons}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Refresh available persons"
                >
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Cannot assign (order status doesn't allow it) ── */
        <div className="text-center py-4">
          <Bike className="h-8 w-8 mx-auto text-gray-200 mb-1" />
          <p className="text-xs text-gray-500">
            {assignment
              ? "Assignment complete"
              : "Delivery assignment is not available for this order status"}
          </p>
        </div>
      )}
    </div>
  );
}
