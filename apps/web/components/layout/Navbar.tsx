"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, User, LogOut, Package, Menu, X, Heart, MapPin, ChevronDown, Store } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useStoreStore } from "@/stores/storeStore";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { StoreSelector } from "@/components/StoreSelector";

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, toggleCart } = useCart();
  const wishlistCount = useWishlistStore((s) => s.itemIds.size);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { detectByPincode, loading: storeLoading } = useStoreStore();
  const [location, setLocation] = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  const pincodeInputRef = useRef<HTMLInputElement>(null);

  // Load saved pincode from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = localStorage.getItem("deliveryPincode");
    if (saved) setLocation(saved);
  }, []);

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setLocation(value);
  };

  const applyPincode = () => {
    const pincode = location.trim();
    if (pincode.length === 6) {
      localStorage.setItem("deliveryPincode", pincode);
      detectByPincode(pincode);
      setEditingLocation(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close user dropdown on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Listen for custom event to open pincode input from elsewhere (e.g., unserviceable banner)
  useEffect(() => {
    const handler = () => setEditingLocation(true);
    window.addEventListener("open-pincode-input", handler);
    return () => window.removeEventListener("open-pincode-input", handler);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((s) => (s as string).charAt(0).toUpperCase())
    .join("")
    .slice(0, 2) || "U";

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">InstaCart</span>
            </Link>

            {/* Delivery Location */}
            <div className="hidden md:flex items-center space-x-4">
              <StoreSelector />
              {editingLocation ? (
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                  <MapPin className="h-4 w-4 text-primary-600 flex-shrink-0" />
                  <input
                    ref={pincodeInputRef}
                    type="text"
                    value={location}
                    onChange={handleLocationChange}
                    placeholder="Enter pincode"
                    maxLength={6}
                    className="w-24 bg-transparent text-xs text-gray-700 ml-1.5 outline-none placeholder:text-gray-400"
                    autoFocus
                    onBlur={() => applyPincode()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        applyPincode();
                      } else if (e.key === "Escape") {
                        setEditingLocation(false);
                      }
                    }}
                  />
                  {storeLoading && (
                    <div className="h-3 w-3 ml-1 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              ) : location ? (
                <button
                  onClick={() => setEditingLocation(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 border border-gray-200 rounded-lg transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary-600" />
                  <span>Deliver to <strong>{location}</strong></span>
                </button>
              ) : (
                <button
                  onClick={() => setEditingLocation(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 border border-gray-200 rounded-lg transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary-600" />
                  <span>Set delivery pincode</span>
                </button>
              )}
            </div>

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
                  {/* User Dropdown */}
                  <div className="relative pl-3 border-l" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                        {user?.avatarUrl ? (
                          <Image src={user.avatarUrl} alt="" width={32} height={32} className="object-cover" style={{ width: "auto", height: "auto" }} />
                        ) : (
                          <span className="text-xs font-semibold text-primary-700">{initials}</span>
                        )}
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-sm font-medium text-gray-900 leading-tight">{user?.firstName}</p>
                        <p className="text-xs text-gray-400 leading-tight">My Account</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="h-4 w-4 text-gray-400" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ShoppingCart className="h-4 w-4 text-gray-400" />
                          <span>My Orders</span>
                        </Link>
                        <Link
                          href="/wishlist"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Heart className="h-4 w-4 text-gray-400" />
                          <span>Wishlist {wishlistCount > 0 && `(${wishlistCount})`}</span>
                        </Link>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
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
