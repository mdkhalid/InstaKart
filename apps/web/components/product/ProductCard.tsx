"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatQuantity } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: any;
  /** "grid" = main product grid (full features: wishlist, quantity).
   *  "inline" = horizontal-scroll card (compact, with category).
   *  "inline-compact" = even smaller inline card (used by Recently Viewed). */
  variant?: "grid" | "inline" | "inline-compact";
  /** Show a "Trending" badge over the image (inline variant only). */
  trendingBadge?: boolean;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

function RatingRow({
  rating,
  count,
  size = "md",
}: {
  rating: number;
  count: number;
  size?: "sm" | "md";
}) {
  const starText = size === "sm" ? "text-[10px]" : "text-xs";
  const countText = size === "sm" ? "ml-1.5 text-[10px]" : "ml-2 text-xs";
  return (
    <div className="flex items-center">
      <div className={`flex items-center space-x-0.5 text-yellow-400 ${starText}`}>
        {STAR_VALUES.map((star) => (
          <span key={star}>{star <= rating ? "\u2605" : "\u2606"}</span>
        ))}
      </div>
      <span className={`text-gray-500 ${countText}`}>({count || 0})</span>
    </div>
  );
}

export function ProductCard({
  product,
  variant = "grid",
  trendingBadge = false,
}: ProductCardProps) {
  const { addItem } = useCart();
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const checkItems = useWishlistStore((s) => s.checkItems);
  const isWishlisted = useWishlistStore((s) => s.itemIds.has(product.id));
  const user = useAuthStore((state) => state.user);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const imageUrl = product.images?.[0]?.url || "/placeholder.svg";
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const rating = product.rating ?? 0;

  const isGrid = variant === "grid";
  const isCompact = variant === "inline-compact";
  const isInline = !isGrid;

  useEffect(() => {
    if (user && isGrid) {
      checkItems([product.id]);
    }
  }, [user?.id, product.id, isGrid]);

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
    toast.success(
      inWishlist
        ? `${product.name} added to wishlist`
        : `${product.name} removed from wishlist`
    );
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.isAvailable || product.stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  // ----- Per-variant class config -----
  const outerClass = isInline ? `flex-shrink-0 ${isCompact ? "w-56" : "w-64"}` : "";
  const cardClass = isGrid
    ? "rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-lg"
    : isCompact
    ? "bg-white rounded-xl border p-3 hover:shadow-lg transition-shadow"
    : "bg-white rounded-xl border p-4 hover:shadow-lg transition-shadow";
  const imageAreaClass = isGrid
    ? "relative h-48 bg-gray-100 overflow-hidden"
    : `relative ${isCompact ? "h-36" : "h-48"} mb-3`;
  const contentClass = isGrid ? "p-4" : "";
  const titleClass =
    isGrid || isCompact
      ? "font-semibold text-gray-900 text-sm mb-1 line-clamp-2"
      : "font-semibold text-gray-900 line-clamp-2";
  const categoryClass = isCompact
    ? "text-xs text-gray-500 mt-0.5"
    : "text-sm text-gray-500 mt-1";
  const priceClass = isGrid
    ? "flex items-center space-x-2 mb-3"
    : isCompact
    ? "mt-1.5 flex items-center space-x-1"
    : "mt-2 flex items-center space-x-1";
  const starsWrapClass = isGrid
    ? "flex items-center space-x-1 mb-1"
    : isCompact
    ? "mt-1.5"
    : "mt-2";
  const quantityClass = "text-xs text-gray-500 mb-2";
  const buttonClass = isGrid
    ? "w-full"
    : isCompact
    ? "w-full mt-2 text-xs py-1.5"
    : "w-full mt-2 text-sm";

  const imageEl = isGrid ? (
    <Image
      src={imageUrl}
      alt={product.name}
      fill
      className="object-cover group-hover:scale-105 transition-transform duration-300"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
    />
  ) : (
    <img
      src={imageUrl}
      alt={product.name}
      className="w-full h-full object-cover rounded-lg"
    />
  );

  const discountBadge = hasDiscount ? (
    isGrid ? (
      <Badge variant="destructive" className="absolute top-2 left-2">
        {product.discountPercent}% OFF
      </Badge>
    ) : (
      <span
        className={`absolute ${
          isCompact ? "top-1 left-1" : "top-2 left-2"
        } bg-red-500 text-white text-xs px-1.5 py-0.5 rounded`}
      >
        {product.discountPercent}% OFF
      </span>
    )
  ) : null;

  const trendingBadgeEl =
    trendingBadge && isInline ? (
      <span
        className={`absolute ${
          isCompact ? "top-1 right-1" : "top-2 right-2"
        } bg-primary-500 text-white text-xs px-2 py-1 rounded`}
      >
        Trending
      </span>
    ) : null;

  const priceBlock = (
    <div className={priceClass}>
      <span
        className={`font-medium text-primary-600 ${
          isCompact ? "text-sm" : isGrid ? "text-lg font-bold" : ""
        }`}
      >
        {formatPrice(product.salePrice || product.price)}
      </span>
      {hasDiscount && (
        <span
          className={`text-gray-400 line-through ${
            isCompact ? "text-xs" : "text-sm"
          }`}
        >
          {formatPrice(product.price)}
        </span>
      )}
    </div>
  );

  const ratingRow = (
    <div className={starsWrapClass}>
      <RatingRow
        rating={rating}
        count={product.reviewsCount || 0}
        size={isCompact ? "sm" : "md"}
      />
    </div>
  );

  const addToCartButton = (
    <Button
      onClick={handleAddToCart}
      size="sm"
      className={buttonClass}
      disabled={!product.isAvailable || product.stock <= 0}
    >
      <ShoppingCart className="h-4 w-4 mr-1" />
      Add to Cart
    </Button>
  );

  // ===== Grid variant: Link wraps card; rating/qty/button are siblings =====
  if (isGrid) {
    return (
      <div className={outerClass}>
        <Link href={`/products/${product.slug}`} className="group block">
          <div className={cardClass}>
            <div className={imageAreaClass}>
              {imageEl}
              {discountBadge}
              {!product.isAvailable && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold">Out of Stock</span>
                </div>
              )}
              <button
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
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
            <div className={contentClass}>
              <h3 className={titleClass}>{product.name}</h3>
              {priceBlock}
            </div>
          </div>
        </Link>
        {ratingRow}
        <p className={quantityClass}>{formatQuantity(product)}</p>
        {addToCartButton}
      </div>
    );
  }

  // ===== Inline variant: card wraps image+link+rating+button (matches
  // original layout where everything sits inside the white card). =====
  return (
    <div className={outerClass}>
      <div className={cardClass}>
        <Link href={`/products/${product.slug}`} className="group block">
          <div className={imageAreaClass}>
            {imageEl}
            {discountBadge}
            {trendingBadgeEl}
          </div>
          <h3 className={titleClass}>{product.name}</h3>
          {product.category?.name && (
            <p className={categoryClass}>{product.category.name}</p>
          )}
          {priceBlock}
        </Link>
        {ratingRow}
        {addToCartButton}
      </div>
    </div>
  );
}
