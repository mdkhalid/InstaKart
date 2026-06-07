"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { InfiniteProductGrid } from "@/components/product/InfiniteProductGrid";
import { ProductCard } from "@/components/product/ProductCard";
import { CategoryPills } from "@/components/product/CategoryPills";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";

export default function HomePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [popularCategories, setPopularCategories] = useState<any[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [recentlyViewedLoaded, setRecentlyViewedLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const syncWithServer = useCartStore((state) => state.syncWithServer);

  useEffect(() => {
    syncWithServer();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsLoggedIn(!!token);
    fetchCategories();
    fetchPopularCategories();
    fetchTrendingProducts();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchSuggestions();
      fetchRecentlyViewed();
    }
  }, [isLoggedIn]);

  const fetchTrendingProducts = async () => {
    try {
      const { data } = await api.get("/products/trending");
      setTrendingProducts(data.data || []);
    } catch {
      setTrendingProducts([]);
    }
  };

  const fetchPopularCategories = async () => {
    try {
      const { data } = await api.get("/categories/popular");
      setPopularCategories(data.data || []);
    } catch {
      setPopularCategories([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data.data || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const { data } = await api.get("/suggestions");
      if (data.data?.length > 0) {
        setSuggestedProducts(data.data);
      }
    } catch {
      // Silently fail
    } finally {
      setSuggestionsLoaded(true);
    }
  };

  const fetchRecentlyViewed = async () => {
    try {
      const { data } = await api.get("/suggestions/recently-viewed");
      if (data.data?.length > 0) {
        setRecentlyViewed(data.data);
      }
    } catch {
      // Silently fail
    } finally {
      setRecentlyViewedLoaded(true);
    }
  };

  const handleSearch = () => {
    const q = search.trim();
    setAppliedSearch(q);

    if (!q) return;
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("accessToken")) return;
    api.post("/suggestions/track-search", { query: q, resultsCount: 0 }).catch(() => {});
  };

  const listingPageSize = selectedCategory ? 100 : 20;

  // Top categories for the pill row (top 12 by product count)
  const topCategories = useMemo(() => {
    return [...categories]
      .sort((a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0))
      .slice(0, 12);
  }, [categories]);

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        {/* Compact search bar (Blinkit-style, sticks below navbar) */}
        <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for groceries, fruits, dairy..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-11 pr-4 py-2.5 rounded-l-xl border-2 border-r-0 border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="rounded-l-none px-6"
              >
                Search
              </Button>
            </div>
          </div>
        </section>

        {/* Category Pills (sticky) */}
        {topCategories.length > 0 && (
          <section className="sticky top-[112px] sm:top-[108px] z-20 bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <CategoryPills
                categories={topCategories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>
          </section>
        )}

        {/* Popular Categories Grid */}
        {popularCategories.length > 0 && (
          <section className="py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary-600" />
                  Shop by Category
                </h2>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                {popularCategories.map((category: any) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.slug)}
                    className="group flex flex-col items-center text-center focus:outline-none"
                  >
                    <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-200 group-hover:ring-primary-500 group-hover:shadow-lg transition-all duration-300">
                      <img
                        src={category.imageUrl || "/placeholder.svg"}
                        alt={category.name}
                        className="block w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <h3 className="mt-2 text-xs sm:text-sm font-medium text-gray-700 line-clamp-1 group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                      {category.productsCount || 0} items
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recently Viewed Section */}
        {recentlyViewedLoaded && recentlyViewed.length > 0 && (
          <section className="py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span aria-hidden>👁️</span> Recently Viewed
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pick up where you left off
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                <div className="inline-flex space-x-3 pr-4">
                  {recentlyViewed.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="inline-compact"
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Suggested for You Section */}
        {suggestionsLoaded && suggestedProducts.length > 0 && (
          <section className="py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span aria-hidden>✨</span> Suggested for You
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Based on your searches and activity
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                <div className="inline-flex space-x-3 pr-4">
                  {suggestedProducts.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="inline"
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Trending Products Section */}
        {trendingProducts.length > 0 && (
          <section className="py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span aria-hidden>🔥</span> Trending Now
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  What&apos;s hot right now
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                <div className="inline-flex space-x-3 pr-4">
                  {trendingProducts.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="inline"
                      trendingBadge
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main product grid with sidebar filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar Filters */}
            <aside className="hidden md:block w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-44">
                <div className="flex items-center space-x-2 mb-4">
                  <SlidersHorizontal className="h-4 w-4 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                </div>
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Category
                    </h4>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => setSelectedCategory("")}
                        className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                          !selectedCategory
                            ? "bg-primary-50 text-primary-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        All Categories
                      </button>
                      {categories.map((cat: any) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.slug)}
                          className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                            selectedCategory === cat.slug
                              ? "bg-primary-50 text-primary-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {cat.name}{" "}
                          <span className="text-gray-400">
                            ({cat._count?.products || 0})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </h4>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500"
                    >
                      <option value="newest">Newest</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                    </select>
                  </div>
                </div>
              </div>
            </aside>

            {/* Product Grid */}
            <div className="flex-1 min-w-0">
              {selectedCategory && (
                <div className="mb-4 flex items-center justify-between bg-primary-50 border border-primary-100 rounded-xl px-4 py-2.5">
                  <p className="text-sm text-primary-800">
                    Showing{" "}
                    <strong>
                      {categories.find((c) => c.slug === selectedCategory)
                        ?.name || selectedCategory}
                    </strong>
                  </p>
                  <button
                    onClick={() => setSelectedCategory("")}
                    className="text-xs text-primary-700 hover:text-primary-900 font-medium"
                  >
                    Clear ✕
                  </button>
                </div>
              )}
              <InfiniteProductGrid
                category={selectedCategory}
                sort={sort}
                search={appliedSearch}
                pageSize={listingPageSize}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
      <QuickViewModal
        product={quickViewProduct}
        open={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </>
  );
}
