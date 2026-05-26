import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const badgeVariants: Record<string, string> = {
  default: "bg-primary-100 text-primary-800 border-transparent",
  secondary: "bg-gray-100 text-gray-800 border-transparent",
  destructive: "bg-red-100 text-red-800 border-transparent",
  outline: "text-gray-700 border-gray-300",
  success: "bg-green-100 text-green-800 border-transparent",
  warning: "bg-yellow-100 text-yellow-800 border-transparent",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export function statusBadgeVariant(status: string): string {
  const map: Record<string, string> = {
    PENDING: "warning",
    CONFIRMED: "default",
    PREPARING: "secondary",
    OUT_FOR_DELIVERY: "default",
    DELIVERED: "success",
    CANCELLED: "destructive",
    REFUNDED: "secondary",
  };
  return map[status] || "secondary";
}
