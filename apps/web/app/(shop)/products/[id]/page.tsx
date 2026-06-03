"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Minus, Plus, ChevronRight, Star } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { ReviewSection } from "@/components/review/ReviewSection";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (params?.slug) {
      fetchProduct();
    }
  }, [params?.slug]);

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/products/${params.slug}`);
      setProduct(data.data);
    } catch {
      toast.error("Product not found");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product?.isAvailable) {
      toast.error("Product is out of stock");
      return;
    }
    addItem(product, quantity);
    toast.success(`${product.name} added to cart`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full mb-4" />
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-6 w-1/4" />
        </div>
        <Footer />
      </>
    );
  }

  if (!product) return null;

  const images = product.images || [];
  const hasDiscount = product.salePrice && product.salePrice < product.price;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/?category=${product.category?.slug}`} className="hover:text-primary-600">
            {product.category?.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="relative h-96 bg-gray-100 rounded-xl overflow-hidden mb-3">
              <Image
                src={images[selectedImage]?.url || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {hasDiscount && (
                <Badge variant="destructive" className="absolute top-3 left-3 text-sm">
                  {product.discountPercent}% OFF
                </Badge>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex space-x-2">
                {images.map((img: any, i: number) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 ${i === selectedImage ? "border-primary-500" : "border-gray-200"}`}
                  >
                    <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-500 text-sm mb-2">{product.unit} | SKU: {product.sku}</p>

            {/* Rating Summary */}
            {product.totalReviews > 0 && (
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(product.averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">{product.averageRating}</span>
                <span className="text-sm text-gray-400">({product.totalReviews} review{product.totalReviews !== 1 ? "s" : ""})</span>
              </div>
            )}

            <div className="flex items-center space-x-3 mb-4">
              {hasDiscount ? (
                <>
                  <span className="text-3xl font-bold text-primary-600">{formatPrice(product.salePrice)}</span>
                  <span className="text-xl text-gray-400 line-through">{formatPrice(product.price)}</span>
                </>
              ) : (
                <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
              )}
            </div>

            {product.shortDesc && (
              <p className="text-gray-600 mb-4">{product.shortDesc}</p>
            )}

            {product.description && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-600 text-sm">{product.description}</p>
              </div>
            )}

            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Specifications</h3>
                <div className="space-y-1">
                  {Object.entries(product.attributes).map(([key, value]) => (
                    <div key={key} className="flex text-sm">
                      <span className="text-gray-500 w-32">{key}</span>
                      <span className="text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="p-2 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-sm text-gray-500">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>
            </div>

            <Button
              size="lg"
              className="w-full md:w-auto"
              onClick={handleAddToCart}
              disabled={!product.isAvailable || product.stock <= 0}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart — {hasDiscount ? formatPrice(product.salePrice * quantity) : formatPrice(product.price * quantity)}
            </Button>
          </div>
        </div>

        {/* Reviews Section */}
        <ReviewSection productSlug={params.slug as string} productId={product.id} />
      </main>
      <Footer />
    </>
  );
}
