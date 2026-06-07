"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

interface InfiniteProductGridProps {
  category?: string;
  sort?: string;
  search?: string;
  pageSize?: number;
  emptyMessage?: string;
}

export function InfiniteProductGrid({
  category,
  sort,
  search,
  pageSize = 20,
  emptyMessage = "No products found",
}: InfiniteProductGridProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const requestIdRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setProducts([]);
    setPage(1);
    setHasMore(true);
    setTotal(0);
    loadPage(1, true, requestId);
  }, [category, sort, search]);

  const loadPage = async (pageNum: number, isReset: boolean, requestId: number) => {
    if (isReset) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      if (search) params.set("search", search);
      params.set("page", String(pageNum));
      params.set("limit", String(pageSize));

      const { data } = await api.get(`/products?${params}`);

      if (requestId !== requestIdRef.current) return;

      const newProducts = data.data?.products || [];
      const pagination = data.data?.pagination;

      setProducts((prev) => (isReset ? newProducts : [...prev, ...newProducts]));
      if (pagination) {
        setTotal(pagination.total ?? newProducts.length);
        setHasMore(pageNum < (pagination.totalPages ?? 1));
      } else {
        setHasMore(newProducts.length >= pageSize);
      }
    } catch {
      if (requestId === requestIdRef.current) {
        if (isReset) setProducts([]);
        setHasMore(false);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        if (isReset) setLoading(false);
        else setLoadingMore(false);
      }
    }
  };

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, false, requestIdRef.current);
  };

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="min-w-0">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <p className="text-4xl mb-2">🔍</p>
        <p className="text-lg font-medium text-gray-900">{emptyMessage}</p>
        <p className="text-sm text-gray-500 mt-1">
          Try a different search or category
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
        {products.map((product) => (
          <div key={product.id} className="min-w-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {hasMore && (
        <>
          <div ref={sentinelRef} className="h-10" aria-hidden />
          {loadingMore && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}
        </>
      )}

      {!hasMore && products.length > 0 && (
        <p className="text-center text-sm text-gray-400 mt-8">
          You&apos;ve seen all {total || products.length} products
        </p>
      )}
    </>
  );
}
