"use client";

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useCart } from "@/hooks/useCart";
import { useCartStore } from "@/stores/cartStore";
import Link from "next/link";
import toast from "react-hot-toast";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [recentlyViewedLoaded, setRecentlyViewedLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { addItem } = useCart();
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

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sort]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (sort) params.set("sort", sort);
      const { data } = await api.get(`/products?${params}`);
      setProducts(data.data?.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSearch = async () => {
    if (!search.trim()) {
      fetchProducts();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/products/search?q=${search}`);
      setProducts(data.data || []);

      // Track search activity (fire-and-forget)
      const token = localStorage.getItem("accessToken");
      if (token) {
        api.post("/suggestions/track-search", {
          query: search,
          resultsCount: data.data?.length || 0,
        }).catch(() => {});
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

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
                <h2 className="text-2xl font-semibold">👁️ Recently Viewed</h2>
                <p className="text-sm text-gray-500 mt-1">Pick up where you left off</p>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex space-x-4">
                  {recentlyViewed.map((product: any) => (
                    <div key={product.id} className="flex-shrink-0 w-56">
                      <div className="bg-white rounded-xl border p-3 hover:shadow-lg transition-shadow">
                        <Link href={`/products/${product.slug}`}>
                          <div className="relative h-36 mb-3">
                            <img
                              src={product.images?.[0]?.url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            {product.discountPercent > 0 && (
                              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                                {product.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{product.category?.name}</p>
                          <div className="mt-1.5 flex items-center space-x-1">
                            <span className="font-medium text-primary-600 text-sm">
                              ₹{product.salePrice?.toFixed(2) || product.price.toFixed(2)}
                            </span>
                            {product.discountPercent > 0 && (
                              <span className="text-xs text-gray-400 line-through">₹{product.price.toFixed(2)}</span>
                            )}
                          </div>
                        </Link>
                        <Button
                          onClick={() => {
                            if (!product.isAvailable || product.stock <= 0) {
                              toast.error(`${product.name} is out of stock`);
                              return;
                            }
                            addItem(product);
                            toast.success(`${product.name} added to cart`);
                          }}
                          className="w-full mt-2 bg-primary-600 text-white hover:bg-primary-700 text-xs py-1.5"
                          disabled={!product.isAvailable || product.stock <= 0}
                          size="sm"
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
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
                <h2 className="text-2xl font-semibold">✨ Suggested for You</h2>
                <p className="text-sm text-gray-500 mt-1">Based on your searches and activity</p>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex space-x-4">
                  {suggestedProducts.map((product: any) => (
                    <div key={product.id} className="flex-shrink-0 w-64">
                      <div className="bg-white rounded-xl border p-4 hover:shadow-lg transition-shadow">
                        <Link href={`/products/${product.slug}`}>
                          <div className="relative">
                            {product.discountPercent > 0 && (
                              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                                {product.discountPercent}% OFF
                              </span>
                            )}
                            <img
                              src={product.images?.[0]?.url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-lg mb-3"
                            />
                          </div>
                          <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                          <p className="mt-1 text-sm text-gray-500">{product.category?.name}</p>
                          <div className="mt-2 flex items-center space-x-1">
                            <span className="font-medium text-primary-600">
                              ₹{product.salePrice?.toFixed(2) || product.price.toFixed(2)}
                            </span>
                            {product.discountPercent > 0 && (
                              <span className="text-sm text-gray-400 line-through">₹{product.price.toFixed(2)}</span>
                            )}
                          </div>
                        </Link>
                        <Button
                          onClick={() => {
                            if (!product.isAvailable || product.stock <= 0) {
                              toast.error(`${product.name} is out of stock`);
                              return;
                            }
                            addItem(product);
                            toast.success(`${product.name} added to cart`);
                          }}
                          className="w-full mt-2 bg-primary-600 text-white hover:bg-primary-700 text-sm"
                          disabled={!product.isAvailable || product.stock <= 0}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Trending Products Section */}
        {!loading && trendingProducts.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">🔥 Trending Now</h2>
                <p className="text-sm text-gray-500 mt-1">What's hot right now</p>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-flex space-x-4">
                  {trendingProducts.map((product: any) => (
                    <div key={product.id} className="flex-shrink-0 w-64">
                      <div className="bg-white rounded-xl border p-4 hover:shadow-lg transition-shadow">
                        <div className="relative">
                          <span className="absolute top-2 right-2 bg-primary-500 text-white text-xs px-2 py-1 rounded">Trending</span>
                          <img 
                            src={product.images?.[0]?.url || '/placeholder.svg'} 
                            alt={product.name} 
                            className="w-full h-48 object-cover rounded-lg mb-3"
                          />
                        </div>
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                        <p className="mt-2">
                          <span className="font-medium text-red-600">₹{product.price.toFixed(2)}</span>
                          {product.originalPrice && (
                            <span className="ml-2 text-gray-400 line-through">₹{product.originalPrice.toFixed(2)}</span>
                          )}
                        </p>
                        <div className="mt-3 flex items-center">
                          <div className="flex items-center space-x-1 text-yellow-400 text-xs">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star}>{star <= (product.rating || 0) ? '★' : '☆'}</span>
                            ))}
                          </div>
                          <span className="ml-2 text-gray-500 text-xs">({product.reviewsCount || 0})</span>
                        </div>
                        <Button 
                          onClick={() => {
                            if (!product.isAvailable || product.stock <= 0) {
                              toast.error(`${product.name} is out of stock`);
                              return;
                            }
                            addItem(product);
                            toast.success(`${product.name} added to cart`);
                          }}
                          className="w-full mt-2 bg-primary-600 text-white hover:bg-primary-700"
                          disabled={!product.isAvailable || product.stock <= 0}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Popular Categories Section */}
        {!loading && popularCategories.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">🛒 Shop by Category</h2>
                <p className="text-sm text-gray-500 mt-1">Explore our most popular sections</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {popularCategories.map((category: any) => (
                  <div 
                    key={category.id} 
                    onClick={() => setSelectedCategory(category.slug)}
                    className="group relative cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-w-16 aspect-h-9 overflow-hidden rounded-xl bg-gray-50">
                      <img 
                        src={category.imageUrl || '/placeholder.svg'} 
                        alt={category.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <h3 className="text-lg font-semibold">{category.name}</h3>
                        <p className="text-sm mt-1">{category.productsCount || 0}+ products</p>
                      </div>
                    </div>
                  </div>
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
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No products found</p>
                </div>
              ) : (
                <ProductGrid products={products} />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
