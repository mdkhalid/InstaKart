"use client";

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { InfiniteProductGrid } from "@/components/product/InfiniteProductGrid";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [recentlyViewedLoaded, setRecentlyViewedLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  // Fetch personalized suggestions when logged in
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
      // Fallback to random products if API fails
      setTrendingProducts([]);
    }
  };

   const fetchPopularCategories = async () => {
     try {
       const { data } = await api.get("/categories/popular");
       setPopularCategories(data.data || []);
     } catch {
       // Fallback to all categories if API fails
       setPopularCategories([]);
     }
   };

   const fetchCategories = async () => {
     try {
       const { data } = await api.get("/categories");
       setCategories(data.data || []);
     } catch {
       // Fallback to empty array if API fails
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
      // Silently fail — suggestions are optional
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

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold mb-4">Fresh Groceries Delivered in Minutes</h1>
            <p className="text-lg text-primary-100 mb-6">Shop from thousands of products at your fingertips</p>
            <div className="flex max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 rounded-l-lg text-gray-900 focus:outline-none"
                />
              </div>
              <Button onClick={handleSearch} className="rounded-l-none bg-white text-primary-700 hover:bg-gray-100">
                Search
              </Button>
            </div>
          </div>
        </section>

        {/* Recently Viewed Section */}
        {recentlyViewedLoaded && recentlyViewed.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">
                  <span aria-hidden>👁️</span> Recently Viewed
                </h2>
                <p className="text-sm text-gray-500 mt-1">Pick up where you left off</p>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex space-x-4">
                  {recentlyViewed.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="inline-compact"
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Suggested for You Section */}
        {suggestionsLoaded && suggestedProducts.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">
                  <span aria-hidden>✨</span> Suggested for You
                </h2>
                <p className="text-sm text-gray-500 mt-1">Based on your searches and activity</p>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex space-x-4">
                  {suggestedProducts.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="inline"
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Trending Products Section */}
        {trendingProducts.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">
                  <span aria-hidden>🔥</span> Trending Now
                </h2>
                <p className="text-sm text-gray-500 mt-1">What's hot right now</p>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex space-x-4">
                  {trendingProducts.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="inline"
                      trendingBadge
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Popular Categories Section */}
        {popularCategories.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">
                  <span aria-hidden>🛒</span> Shop by Category
                </h2>
                <p className="text-sm text-gray-500 mt-1">Explore our most popular sections</p>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {popularCategories.map((category: any) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.slug)}
                    className="group flex flex-col items-center text-center focus:outline-none"
                  >
                    <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-200 group-hover:ring-primary-500 group-hover:shadow-lg transition-all duration-300">
                      <img
                        src={category.imageUrl || '/placeholder.svg'}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className="w-full md:w-56 flex-shrink-0">
              <div className="bg-white rounded-xl border p-4 sticky top-20">
                <div className="flex items-center space-x-2 mb-4">
                  <SlidersHorizontal className="h-4 w-4" />
                  <h3 className="font-semibold">Filters</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedCategory("")}
                        className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg ${!selectedCategory ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        All
                      </button>
                      {categories.map((cat: any) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.slug)}
                          className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg ${selectedCategory === cat.slug ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                          {cat.name} ({cat._count?.products || 0})
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Sort By</h4>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full text-sm border rounded-lg px-3 py-2"
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
            <div className="flex-1">
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
    </>
  );
}
