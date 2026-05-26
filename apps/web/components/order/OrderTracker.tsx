"use client";

import { cn } from "@/lib/utils";

const steps = [
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

const statusOrder: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

interface OrderTrackerProps {
  currentStatus: string;
  cancelled?: boolean;
}

export function OrderTracker({ currentStatus, cancelled }: OrderTrackerProps) {
  const currentStep = statusOrder[currentStatus] ?? 0;

  return (
    <div className="py-6">
      {cancelled && (
        <div className="text-center mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-lg">
          <p className="font-medium">Order Cancelled</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStep;
          const isCurrent = index === currentStep;

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
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
