"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, User, LogOut, Package, Menu, X, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useWishlistStore } from "@/stores/wishlistStore";
import { CartDrawer } from "@/components/cart/CartDrawer";

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, toggleCart } = useCart();
  const wishlistCount = useWishlistStore((s) => s.itemIds.size);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">InstaCart</span>
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Shop
              </Link>
              {isAuthenticated ? (
                <>
                  <Link href="/wishlist" className="relative p-2 text-gray-600 hover:text-gray-900">
                    <Heart className="h-6 w-6" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/orders" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                    Orders
                  </Link>
                  <Link href="/profile" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                    Profile
                  </Link>
                  <button
                    onClick={toggleCart}
                    className="relative p-2 text-gray-600 hover:text-gray-900"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {itemCount}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center space-x-3 pl-3 border-l">
                    <Link href="/profile" className="text-sm text-gray-700 hover:text-gray-900">
                      {user?.firstName}
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleCart}
                    className="relative p-2 text-gray-600 hover:text-gray-900"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {itemCount}
                      </span>
                    )}
                  </button>
                  <Link href="/login">
                    <Button variant="outline" size="sm">Login</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center space-x-2">
              <button onClick={toggleCart} className="relative p-2">
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-3 space-y-2">
            <Link href="/" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>Shop</Link>
            {isAuthenticated ? (
              <>
                <Link href="/orders" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>Orders</Link>
                <Link href="/profile" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block py-2 text-red-600">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link href="/register" className="block py-2 text-primary-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </nav>
      <CartDrawer />
    </>
  );
}
