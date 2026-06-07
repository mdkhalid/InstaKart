"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatQuantity, cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

interface QuickViewModalProps {
  product: any | null;
  open: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, open, onClose }: QuickViewModalProps) {
  const { addItem } = useCart();
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isWishlisted = useWishlistStore((s) =>
    product ? s.itemIds.has(product.id) : false
  );
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !product) return null;

  const imageUrl = product.images?.[0]?.url || "/placeholder.svg";
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const rating = product.rating ?? 0;
  const reviews = product.reviewsCount || 0;
  const outOfStock = !product.isAvailable || product.stock <= 0;

  const handleAddToCart = () => {
    if (outOfStock) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  const handleWishlist = async () => {
    if (!user) {
      toast.error("Please login to save items to wishlist");
      return;
    }
    const inWishlist = await toggleItem(product.id);
    toast.success(
      inWishlist
        ? `${product.name} added to wishlist`
        : `${product.name} removed from wishlist`
    );
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div
          className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto pointer-events-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-md text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="relative w-full aspect-square bg-gray-50 sm:rounded-tl-2xl sm:rounded-bl-2xl overflow-hidden">
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {hasDiscount && (
                <Badge variant="destructive" className="absolute top-3 left-3">
                  {product.discountPercent}% OFF
                </Badge>
              )}
              {outOfStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col">
              {product.category?.name && (
                <p className="text-xs uppercase tracking-wider text-primary-600 font-semibold mb-2">
                  {product.category.name}
                </p>
              )}
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {product.name}
              </h2>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center text-yellow-400 text-sm">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s}>{s <= rating ? "\u2605" : "\u2606"}</span>
                  ))}
                </div>
                <span className="text-xs text-gray-500">({reviews})</span>
              </div>

              <p className="text-sm text-gray-500 mb-1">
                {formatQuantity(product)}
              </p>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold text-primary-600">
                  {formatPrice(product.salePrice || product.price)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              {product.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {product.description}
                </p>
              )}

              {product.stock > 0 && product.stock <= 5 && (
                <p className="text-xs text-orange-600 font-medium mb-3">
                  Only {product.stock} left in stock!
                </p>
              )}

              <div className="mt-auto space-y-2">
                <Button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className="w-full"
                  size="lg"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleWishlist}
                    variant="outline"
                    size="sm"
                    className={cn(
                      isWishlisted && "text-red-500 border-red-200 bg-red-50"
                    )}
                  >
                    <Heart
                      className="h-4 w-4 mr-1.5"
                      fill={isWishlisted ? "currentColor" : "none"}
                    />
                    {isWishlisted ? "Saved" : "Save"}
                  </Button>
                  <Link
                    href={`/products/${product.slug}`}
                    onClick={onClose}
                    className="contents"
                  >
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
