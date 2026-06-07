"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, User, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useAuthStore } from "@/stores/authStore";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
}

const items: NavItem[] = [
  { href: "/", label: "Shop", icon: Home, match: (p) => p === "/" },
  { href: "?search=1", label: "Search", icon: Search, match: () => false },
  {
    href: "/wishlist",
    label: "Wishlist",
    icon: Heart,
    match: (p) => p.startsWith("/wishlist"),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: ShoppingBag,
    match: (p) => p.startsWith("/orders") || p.startsWith("/checkout"),
  },
  {
    href: "/profile",
    label: "Account",
    icon: User,
    match: (p) => p.startsWith("/profile") || p.startsWith("/login"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount, toggleCart } = useCart();
  const wishlistCount = useWishlistStore((s) => s.itemIds.size);
  const isAuthenticated = useAuthStore((s) => !!s.user);

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const input = document.querySelector<HTMLInputElement>(
      'input[type="text"][placeholder*="Search" i]'
    );
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus();
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg"
      aria-label="Bottom navigation"
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);
          const isSearch = item.label === "Search";
          const showWishlistBadge = item.label === "Wishlist" && wishlistCount > 0;

          if (isSearch) {
            return (
              <button
                key={item.label}
                onClick={handleSearchClick}
                className="flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-primary-600 active:scale-95 transition-all"
                aria-label="Search products"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          const target =
            !isAuthenticated && (item.label === "Wishlist" || item.label === "Orders" || item.label === "Account")
              ? "/login"
              : item.href;

          return (
            <Link
              key={item.label}
              href={target}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95",
                isActive
                  ? "text-primary-600"
                  : "text-gray-500 hover:text-primary-600"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn("h-5 w-5", isActive && "fill-primary-100")}
                />
                {showWishlistBadge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {itemCount > 0 && (
        <button
          onClick={toggleCart}
          className="absolute -top-12 right-4 bg-primary-600 text-white rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <span className="text-xs opacity-90">View cart</span>
        </button>
      )}
    </nav>
  );
}
