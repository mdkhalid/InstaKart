"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  Percent,
  BarChart3,
  LogOut,
  AlertCircle,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";

const SUPER_ADMIN_ITEMS = [
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/users", label: "Users", icon: Users },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/coupons", label: "Coupons", icon: Percent },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const COMMON_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/issues", label: "Issues & Refunds", icon: AlertCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("adminUser");
    if (raw) {
      try {
        const user = JSON.parse(raw);
        const role = user?.role || "";
        setIsSuperAdmin(role === "ADMIN" || role === "SUPER_ADMIN");
        // Store admins have storeId, but we won't fetch store name here
        // to avoid extra API calls on every render
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("adminUser");
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Package className="h-8 w-8 text-primary-400" />
          <span className="text-xl font-bold">InstaCart</span>
        </Link>
        <p className="text-gray-400 text-xs mt-1">
          {isSuperAdmin ? "Super Admin" : "Store Admin"}
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {COMMON_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {isSuperAdmin && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                Administration
              </p>
            </div>
            {SUPER_ADMIN_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
