"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { CategorySelect } from "@/components/CategorySelect";
import { ImageUploader, type ProductImage } from "@/components/ImageUploader";

type ProductForm = {
  name: string;
  sku: string;
  price: string;
  salePrice: string;
  stock: string;
  unit: string;
  categoryId: string;
  description: string;
  shortDesc: string;
  isFeatured: boolean;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>({
    name: "", sku: "", price: "", salePrice: "", stock: "0", unit: "pcs",
    categoryId: "", description: "", shortDesc: "", isFeatured: false,
  });
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [params?.id]);

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/admin/products/${params.id}`);
      const p = data.data;
      setForm({
        name: p.name || "",
        sku: p.sku || "",
        price: String(p.price ?? ""),
        salePrice: p.salePrice ? String(p.salePrice) : "",
        stock: String(p.stock ?? 0),
        unit: p.unit || "pcs",
        categoryId: p.categoryId || p.category?.id || "",
        description: p.description || "",
        shortDesc: p.shortDesc || "",
        isFeatured: !!p.isFeatured,
      });
      setImages(
        (p.images || []).map((img: any) => ({
          id: img.id,
          url: img.url,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
        })),
      );
    } catch {
      toast.error("Product not found");
      router.push("/products");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error("Please select a category");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/products/${params.id}`, {
        name: form.name,
        sku: form.sku,
        price: parseFloat(form.price),
        salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
        stock: parseInt(form.stock || "0", 10),
        unit: form.unit,
        categoryId: form.categoryId,
        description: form.description || undefined,
        shortDesc: form.shortDesc || undefined,
        isFeatured: form.isFeatured,
      });
      toast.success("Product updated");
      router.push("/products");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to update product";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SKU *</label>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <CategorySelect
              value={form.categoryId}
              onChange={(id) => setForm({ ...form, categoryId: id })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="ml">ml</option>
              <option value="dozen">dozen</option>
              <option value="pack">pack</option>
              <option value="500 g">500 g</option>
              <option value="250 g">250 g</option>
              <option value="200 ml">200 ml</option>
              <option value="100 ml">100 ml</option>
              <option value="100 g">100 g</option>
              <option value="400 g">400 g</option>
              <option value="2 L">2 L</option>
              <option value="500 ml">500 ml</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sale Price (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stock</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Short Description</label>
          <input
            value={form.shortDesc}
            onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            maxLength={300}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none h-24"
          />
        </div>

        <div className="border-t pt-4">
          <ImageUploader
            productId={params?.id as string}
            images={images}
            onChange={setImages}
            maxFiles={10}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            id="featured-edit"
          />
          <label htmlFor="featured-edit" className="text-sm">Featured product</label>
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="border px-6 py-2 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
