import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Display the quantity + unit for a product, e.g. "1 kg", "500 ml", "12 pcs".
 *
 * The product name stores the full quantity in a trailing "(...)", e.g.
 * "Fresh Milk (1 L)", "Whole Wheat Bread (400 g)", "Eggs (12 pcs)".
 * The `unit` field is the base unit only (kg, g, L, ml, pcs, pack, dozen).
 * This helper reads the quantity from the name and falls back to `unit`
 * for products without a trailing parenthesised quantity.
 */
export function formatQuantity(product: { name: string; unit?: string }): string {
  const match = product.name.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : (product.unit || "");
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
