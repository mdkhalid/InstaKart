"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  disabled = false,
  className,
  ariaLabel = "Quantity",
}: QuantityStepperProps) {
  const dec = () => {
    if (disabled) return;
    if (value > min) onChange(value - 1);
  };

  const inc = () => {
    if (disabled) return;
    if (value < max) onChange(value + 1);
  };

  const isMin = value <= min;
  const isMax = value >= max;
  const dims = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-sm w-7" : "text-base w-9";

  return (
    <div
      className={cn(
        "inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white",
        disabled && "opacity-50",
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || isMin}
        aria-label="Decrease quantity"
        className={cn(
          dims,
          "flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:hover:bg-white disabled:text-gray-300 transition-colors"
        )}
      >
        <Minus className={iconSize} />
      </button>
      <span
        className={cn(
          textSize,
          "text-center font-semibold text-gray-900 border-x border-gray-300 select-none"
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || isMax}
        aria-label="Increase quantity"
        className={cn(
          dims,
          "flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:hover:bg-white disabled:text-gray-300 transition-colors"
        )}
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
}
