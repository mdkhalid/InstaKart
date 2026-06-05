"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: any;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const checkItems = useWishlistStore((s) => s.checkItems);
  const isWishlisted = useWishlistStore((s) => s.itemIds.has(product.id));
  const user = useAuthStore((state) => state.user);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const imageUrl = product.images?.[0]?.url || "/placeholder.svg";
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const rating = product.rating ?? 0;

  useEffect(() => {
    if (user) {
      checkItems([product.id]);
    }
  }, [user?.id, product.id]);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please login to save items to wishlist");
      return;
    }

    setWishlistLoading(true);
    const inWishlist = await toggleItem(product.id);
    setWishlistLoading(false);

    toast.success(inWishlist ? `${product.name} added to wishlist` : `${product.name} removed from wishlist`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.isAvailable || product.stock <= 0) {
      toast.error("Product is out of stock");
      return;
    }
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          {hasDiscount && (
            <Badge variant="destructive" className="absolute top-2 left-2">
              {product.discountPercent}% OFF
            </Badge>
          )}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
          <button
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            className={`absolute top-2 right-2 p-2 rounded-full shadow transition-all ${
              isWishlisted
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white/90 text-gray-600 hover:bg-white hover:text-red-500"
            }`}
          >
            <Heart
              className={`h-4 w-4 ${wishlistLoading ? "animate-pulse" : ""}`}
              fill={isWishlisted ? "currentColor" : "none"}
            />
          </button>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{product.name}</h3>
          <div className="flex items-center space-x-1 mb-1">
            <div className="flex items-center space-x-0.5 text-yellow-400 text-xs">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>{star <= rating ? '★' : '☆'}</span>
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.reviewsCount || 0})</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">{product.unit}</p>
          <div className="flex items-center space-x-2 mb-3">
            {hasDiscount ? (
              <>
                <span className="text-lg font-bold text-primary-600">{formatPrice(product.salePrice)}</span>
                <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
            )}
          </div>
          <Button
            onClick={handleAddToCart}
            size="sm"
            className="w-full"
            disabled={!product.isAvailable || product.stock <= 0}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Link>
  );
}
