"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatQuantity, cn } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: any;
  /** "grid" = main product grid (full features: wishlist, quantity, quick view).
   *  "inline" = horizontal-scroll card (compact, with category).
   *  "inline-compact" = even smaller inline card (used by Recently Viewed). */
  variant?: "grid" | "inline" | "inline-compact";
  /** Show a "Trending" badge over the image (inline variant only). */
  trendingBadge?: boolean;
  /** Called when the user clicks the card body (not the buttons). Used to
   *  open a quick-view modal instead of navigating. */
  onQuickView?: (product: any) => void;
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
  onQuickView,
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
  const outOfStock = !product.isAvailable || product.stock <= 0;

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
    if (outOfStock) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onQuickView) {
      e.preventDefault();
      onQuickView(product);
    }
  };

  // ----- Per-variant class config (modern grocery app look) -----
  const outerClass = isInline
    ? `flex-shrink-0 snap-start ${isCompact ? "w-48" : "w-56"}`
    : "min-w-0";
  const cardClass = isGrid
    ? "group flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:border-primary-200 hover:shadow-xl hover:-translate-y-0.5"
    : isCompact
    ? "flex flex-col h-full bg-white rounded-2xl border border-gray-100 p-3 transition-all duration-300 hover:border-primary-200 hover:shadow-xl hover:-translate-y-0.5"
    : "flex flex-col h-full bg-white rounded-2xl border border-gray-100 p-4 transition-all duration-300 hover:border-primary-200 hover:shadow-xl hover:-translate-y-0.5";
  const imageAreaClass = isGrid
    ? "relative w-full aspect-square bg-gray-50 overflow-hidden"
    : `relative w-full aspect-square overflow-hidden rounded-xl ${isCompact ? "mb-2" : "mb-3"}`;
  const contentClass = isGrid ? "p-4 flex-1 flex flex-col" : "flex-1 flex flex-col";
  const titleClass =
    isGrid || isCompact
      ? "font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-snug min-h-[2.5rem]"
      : "font-semibold text-gray-900 line-clamp-2 leading-snug";
  const categoryClass = isCompact
    ? "text-[11px] text-gray-500 mt-0.5 line-clamp-1"
    : "text-xs text-gray-500 mt-1 line-clamp-1";
  const priceClass = isGrid
    ? "flex items-baseline gap-1.5 mt-auto"
    : isCompact
    ? "mt-1.5 flex items-baseline gap-1"
    : "mt-2 flex items-baseline gap-1";
  const starsWrapClass = isGrid
    ? "flex items-center mb-1"
    : isCompact
    ? "mt-1.5"
    : "mt-2";
  const quantityClass = isGrid
    ? "text-xs text-gray-500 mb-3 line-clamp-1"
    : "text-xs text-gray-500 mt-1 line-clamp-1";
  const buttonClass = isGrid
    ? "w-full mt-2 h-9 text-sm font-medium"
    : isCompact
    ? "w-full mt-2 h-8 text-xs font-medium"
    : "w-full mt-2 h-9 text-sm font-medium";

  const imageEl = isGrid ? (
    <Image
      src={imageUrl}
      alt={product.name}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
    />
  ) : (
    <img
      src={imageUrl}
      alt={product.name}
      className="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );

  const discountBadge = hasDiscount ? (
    isGrid ? (
      <Badge variant="destructive" className="absolute top-2.5 left-2.5 text-[10px] font-bold shadow-md">
        {product.discountPercent}% OFF
      </Badge>
    ) : (
      <span
        className={`absolute ${
          isCompact ? "top-1.5 left-1.5" : "top-2 left-2"
        } bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md`}
      >
        {product.discountPercent}% OFF
      </span>
    )
  ) : null;

  const trendingBadgeEl =
    trendingBadge && isInline ? (
      <span
        className={`absolute ${
          isCompact ? "top-1.5 right-1.5" : "top-2 right-2"
        } bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md`}
      >
        Trending
      </span>
    ) : null;

  const priceBlock = (
    <div className={priceClass}>
      <span
        className={`font-bold text-primary-600 ${
          isCompact ? "text-sm" : isGrid ? "text-lg" : "text-base"
        }`}
      >
        {formatPrice(product.salePrice || product.price)}
      </span>
      {hasDiscount && (
        <span
          className={`text-gray-400 line-through ${
            isCompact ? "text-[11px]" : "text-xs"
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

  // Floating action buttons overlay (grid variant only)
  const floatingActions = isGrid ? (
    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={handleQuickView}
        aria-label="Quick view"
        className="p-1.5 rounded-full bg-white/95 backdrop-blur text-gray-600 hover:text-primary-600 shadow-md hover:scale-110 transition-all"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={handleWishlistToggle}
        disabled={wishlistLoading}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={cn(
          "p-1.5 rounded-full shadow-md hover:scale-110 transition-all",
          isWishlisted
            ? "bg-red-500 text-white"
            : "bg-white/95 backdrop-blur text-gray-600 hover:text-red-500"
        )}
      >
        <Heart
          className={cn("h-3.5 w-3.5", wishlistLoading && "animate-pulse")}
          fill={isWishlisted ? "currentColor" : "none"}
        />
      </button>
    </div>
  ) : (
    <button
      onClick={handleWishlistToggle}
      disabled={wishlistLoading}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "absolute top-2 right-2 p-1.5 rounded-full shadow-md transition-all",
        isWishlisted
          ? "bg-red-500 text-white"
          : "bg-white/95 backdrop-blur text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100"
      )}
    >
      <Heart
        className={cn("h-3.5 w-3.5", wishlistLoading && "animate-pulse")}
        fill={isWishlisted ? "currentColor" : "none"}
      />
    </button>
  );

  // Mobile-friendly persistent wishlist (always visible on touch)
  const mobileWishlist = !isGrid ? null : isWishlisted ? (
    <div className="absolute top-2.5 right-2.5 md:opacity-0 md:group-hover:opacity-100">
      <button
        onClick={handleWishlistToggle}
        disabled={wishlistLoading}
        aria-label="Remove from wishlist"
        className="p-1.5 rounded-full bg-red-500 text-white shadow-md"
      >
        <Heart className="h-3.5 w-3.5" fill="currentColor" />
      </button>
    </div>
  ) : null;

  const addToCartButton = isGrid ? (
    <Button
      onClick={handleAddToCart}
      size="sm"
      className={buttonClass}
      disabled={outOfStock}
    >
      <Plus className="h-4 w-4 mr-1" />
      {outOfStock ? "Out of Stock" : "Add"}
    </Button>
  ) : (
    <Button
      onClick={handleAddToCart}
      size="sm"
      className={buttonClass}
      disabled={outOfStock}
    >
      <ShoppingCart className="h-3.5 w-3.5 mr-1" />
      {outOfStock ? "Out of Stock" : "Add to Cart"}
    </Button>
  );

  // ===== Grid variant: card contains image+content+rating+qty+button =====
  if (isGrid) {
    return (
      <div className={outerClass}>
        <div className={cardClass}>
          <Link
            href={`/products/${product.slug}`}
            className="group block"
            onClick={handleCardClick}
          >
            <div className={imageAreaClass}>
              {imageEl}
              {discountBadge}
              {outOfStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">Out of Stock</span>
                </div>
              )}
              {mobileWishlist}
              {floatingActions}
            </div>
            <div className={contentClass}>
              {product.category?.name && (
                <p className="text-[10px] uppercase tracking-wider text-primary-600 font-semibold mb-1 line-clamp-1">
                  {product.category.name}
                </p>
              )}
              <h3 className={titleClass}>{product.name}</h3>
              {ratingRow}
              <p className={quantityClass}>{formatQuantity(product)}</p>
              {priceBlock}
            </div>
          </Link>
          {addToCartButton}
        </div>
      </div>
    );
  }

  // ===== Inline variant (horizontal scroll carousels) =====
  return (
    <div className={outerClass}>
      <div className={cardClass}>
        <Link href={`/products/${product.slug}`} className="group block">
          <div className={imageAreaClass}>
            {imageEl}
            {discountBadge}
            {trendingBadgeEl}
            {floatingActions}
            {outOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <span className="text-white font-semibold text-sm">Out of Stock</span>
              </div>
            )}
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
