"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

interface ProductEntry {
  id: string;
  name: string;
  slug: string;
  sku: string;
  unit: string;
  imageUrl: string | null;
  storeProduct: {
    price: number;
    salePrice: number | null;
    costPrice: number | null;
    stock: number;
    lowStockAlert: number;
    isAvailable: boolean;
  } | null;
}

export default function StoreProductsPage() {
  const router = useRouter();
  const params = useParams();
  const [storeName, setStoreName] = useState("");
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    try {
      const res = await api.get(`/stores/${params.id}/products?page=${page}&limit=50`);
      setProducts(res.data.data?.products || []);
      setTotalPages(res.data.data?.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get(`/stores/${params.id}`).then((res) => {
      setStoreName(res.data.data?.name || "");
    }).catch(() => {});
    fetchProducts();
  }, [page]);

  const handleEdit = (productId: string, field: string, value: any) => {
    setEdits((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: value },
    }));
  };

  const handleSave = async () => {
    const items = Object.entries(edits).map(([productId, data]) => ({
      productId,
      price: parseFloat(data.price) || 0,
      salePrice: data.salePrice !== undefined && data.salePrice !== "" ? parseFloat(data.salePrice) : null,
      costPrice: data.costPrice !== undefined && data.costPrice !== "" ? parseFloat(data.costPrice) : null,
      stock: parseInt(data.stock) || 0,
      lowStockAlert: parseInt(data.lowStockAlert) || 10,
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    }));

    if (items.length === 0) {
      toast.error("No changes to save");
      return;
    }

    setSaving(true);
    try {
      await api.post("/stores/products", { storeId: params.id, items });
      toast.success("Inventory updated");
      setEdits({});
      fetchProducts();
    } catch {
      toast.error("Failed to save inventory");
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <button
        onClick={() => router.push("/stores")}
        className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back to Stores</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Inventory</h1>
          <p className="text-sm text-gray-500">{storeName}</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-64"
          />
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(edits).length === 0}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : `Save Changes (${Object.keys(edits).length})`}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sale Price</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Stock</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Alert</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => {
                  const edit = edits[p.id] || {};
                  const sp: any = p.storeProduct || {};
                  const price = edit.price ?? sp.price ?? "";
                  const salePrice = edit.salePrice ?? sp.salePrice ?? "";
                  const stock = edit.stock ?? sp.stock ?? "";
                  const lowStockAlert = edit.lowStockAlert ?? sp.lowStockAlert ?? 10;
                  const isAvailable = edit.isAvailable !== undefined ? edit.isAvailable : (sp.isAvailable ?? true);

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                            {p.imageUrl ? "IMG" : "N/A"}
                          </div>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.sku} / {p.unit}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={price}
                          onChange={(e) => handleEdit(p.id, "price", e.target.value)}
                          className="w-24 border rounded px-2 py-1 text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={salePrice}
                          onChange={(e) => handleEdit(p.id, "salePrice", e.target.value)}
                          className="w-24 border rounded px-2 py-1 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={stock}
                          onChange={(e) => handleEdit(p.id, "stock", e.target.value)}
                          className="w-20 border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={lowStockAlert}
                          onChange={(e) => handleEdit(p.id, "lowStockAlert", e.target.value)}
                          className="w-20 border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isAvailable}
                          onChange={(e) => handleEdit(p.id, "isAvailable", e.target.checked)}
                          className="rounded"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {filtered.length} of {products.length} products
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
