"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Trash2, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { items, isLoading, fetchWishlist, toggleItem } = useWishlistStore();
  const { addItem } = useCart();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchWishlist();
  }, [isAuthenticated]);

  const handleRemove = async (productId: string, name: string) => {
    await toggleItem(productId);
    toast.success(`Removed ${name} from wishlist`);
  };

  const handleAddToCart = (item: any) => {
    if (!item.product.isAvailable || item.product.stock <= 0) {
      toast.error("Product is out of stock");
      return;
    }
    addItem({
      id: item.productId,
      name: item.product.name,
      price: item.product.price,
      salePrice: item.product.salePrice,
      slug: item.product.slug,
      stock: item.product.stock,
      images: item.product.image ? [{ url: item.product.image }] : [],
    });
    toast.success(`${item.product.name} added to cart`);
  };

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Heart className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
            {!isLoading && items.length > 0 && (
              <span className="text-sm text-gray-500">({items.length} items)</span>
            )}
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Continue Shopping
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-0 rounded-xl border overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Save your favorite items here for quick access</p>
            <Link href="/">
              <Button>Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="min-w-0 group rounded-xl border bg-white overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/products/${item.product.slug}`} className="block relative h-48 bg-gray-100">
                  {item.product.image ? (
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <ShoppingCart className="h-8 w-8" />
                    </div>
                  )}
                  {item.product.discountPercent > 0 && (
                    <Badge variant="destructive" className="absolute top-2 left-2">
                      {item.product.discountPercent}% OFF
                    </Badge>
                  )}
                  {!item.product.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold">Out of Stock</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(item.productId, item.product.name);
                    }}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </Link>
                <div className="p-4">
                  <Link href={`/products/${item.product.slug}`}>
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 hover:text-primary-600 transition-colors">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{item.product.unit}</p>
                  </Link>
                  <div className="flex items-center space-x-2 mt-2 mb-3">
                    {item.product.salePrice ? (
                      <>
                        <span className="text-lg font-bold text-primary-600">{formatPrice(item.product.salePrice)}</span>
                        <span className="text-sm text-gray-400 line-through">{formatPrice(item.product.price)}</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">{formatPrice(item.product.price)}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.product.isAvailable || item.product.stock <= 0}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
