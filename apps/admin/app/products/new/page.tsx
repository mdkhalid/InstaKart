"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { CategorySelect } from "@/components/CategorySelect";
import { ImageUploader, type ProductImage } from "@/components/ImageUploader";
import { PRODUCT_UNITS } from "@instamart/types";

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

const EMPTY: ProductForm = {
  name: "",
  sku: "",
  price: "",
  salePrice: "",
  stock: "0",
  unit: "pcs",
  categoryId: "",
  description: "",
  shortDesc: "",
  isFeatured: false,
};

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!form.price || isNaN(parseFloat(form.price))) {
      toast.error("Please enter a valid price");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/products", {
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
        tags: [],
      });
      const productId = data?.data?.id;

      const fileImages = images.filter((i: any) => i.file) as Array<ProductImage & { file: File }>;
      if (productId && fileImages.length > 0) {
        const fd = new FormData();
        fileImages.forEach((img) => fd.append("images", img.file));
        try {
          await api.post(`/products/${productId}/images`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch {
          toast.error("Product created but image upload failed");
        }
      }

      toast.success("Product created");
      router.push("/products");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to create product";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h1>
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
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
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
          <ImageUploader images={images} onChange={setImages} maxFiles={10} />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            id="featured"
          />
          <label htmlFor="featured" className="text-sm">Featured product</label>
        </div>

        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Creating..." : "Create Product"}
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
