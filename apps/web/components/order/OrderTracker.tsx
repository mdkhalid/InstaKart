"use client";

import { cn } from "@/lib/utils";

const orderSteps = [
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

const orderStatusOrder: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

const deliverySteps = [
  { key: "ASSIGNED", label: "Driver Assigned" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "DELIVERED", label: "Delivered" },
];

const deliveryStatusOrder: Record<string, number> = {
  ASSIGNED: 0,
  PICKED_UP: 1,
  IN_TRANSIT: 2,
  DELIVERED: 3,
};

interface DeliveryAssignment {
  status?: string;
  deliveryPerson?: {
    name?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface OrderTrackerProps {
  currentStatus: string;
  cancelled?: boolean;
  deliveryAssignment?: DeliveryAssignment | null;
}

export function OrderTracker({ currentStatus, cancelled, deliveryAssignment }: OrderTrackerProps) {
  const hasDelivery = !!deliveryAssignment;
  const deliveryStatus = deliveryAssignment?.status;
  const deliveryStep = deliveryStatus ? deliveryStatusOrder[deliveryStatus] : -1;
  const orderStep = orderStatusOrder[currentStatus] ?? 0;

  // Determine which steps to show based on delivery assignment
  // If delivery assigned, show enhanced flow with delivery steps after PREPARING
  const showDeliverySteps = hasDelivery && deliveryStep >= 0;
  const stepsToShow = showDeliverySteps
    ? [
        ...orderSteps.slice(0, 3), // PENDING, CONFIRMED, PREPARING
        ...deliverySteps,           // ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED
      ]
    : orderSteps;

  const getStepIndex = (stepKey: string) => {
    if (showDeliverySteps) {
      const deliveryIdx = deliveryStatusOrder[stepKey];
      if (deliveryIdx !== undefined) {
        return 3 + deliveryIdx; // after first 3 order steps
      }
      return orderStatusOrder[stepKey] ?? 0;
    }
    return orderStatusOrder[stepKey] ?? 0;
  };

  const getCurrentStepIndex = () => {
    if (showDeliverySteps && deliveryStep >= 0) {
      // Map delivery status to combined step index
      if (deliveryStep <= 2) { // ASSIGNED, PICKED_UP, IN_TRANSIT
        return 3 + deliveryStep;
      }
      // DELIVERED in delivery = DELIVERED in order (last step)
      return stepsToShow.length - 1;
    }
    return orderStep;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="py-6">
      {cancelled && (
        <div className="text-center mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-lg">
          <p className="font-medium">Order Cancelled</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        {stepsToShow.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const stepKey = step.key;

          // Determine if this is a delivery step
          const isDeliveryStep = showDeliverySteps && deliveryStatusOrder[stepKey] !== undefined;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div className="relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                    isCompleted
                      ? "bg-primary-600 border-primary-600 text-white"
                      : "bg-white border-gray-300 text-gray-400",
                    isCurrent && !cancelled && "ring-2 ring-primary-300"
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < stepsToShow.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-5 left-10 w-[calc(100%_-_2.5rem)] h-0.5",
                      isCompleted ? "bg-primary-600" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  "text-xs mt-2 text-center",
                  isCompleted ? "text-primary-600 font-medium" : "text-gray-400"
                )}
              >
                {step.label}
              </p>
              {isCurrent && isDeliveryStep && deliveryAssignment?.deliveryPerson && (
                <p className="text-[10px] mt-1 text-primary-500 font-medium text-center max-w-[80px]">
                  {deliveryAssignment.deliveryPerson.name ||
                    `${deliveryAssignment.deliveryPerson.firstName} ${deliveryAssignment.deliveryPerson.lastName}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
