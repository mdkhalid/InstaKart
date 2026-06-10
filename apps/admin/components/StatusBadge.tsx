import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const variants: Record<string, string> = {
  default: "bg-primary-100 text-primary-800",
  secondary: "bg-gray-100 text-gray-800",
  destructive: "bg-red-100 text-red-800",
  outline: "border border-gray-300 text-gray-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
};

export function StatusBadge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
    PENDING: "warning",
    CONFIRMED: "default",
    PREPARING: "secondary",
    OUT_FOR_DELIVERY: "default",
    DELIVERED: "success",
    CANCELLED: "destructive",
    REFUNDED: "secondary",
    ACTIVE: "success",
    INACTIVE: "destructive",
    ADMIN: "default",
    CUSTOMER: "secondary",
    DELIVERY_AGENT: "warning",
  };
  return map[status] || "secondary";
}
