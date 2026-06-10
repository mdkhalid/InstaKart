"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useConfirm } from "@/hooks/useConfirm";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", parentId: "", sortOrder: 0 });
  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data.data || []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingCat) {
        await api.put(`/categories/${editingCat.id}`, form);
        toast.success("Category updated");
      } else {
        await api.post("/categories", form);
        toast.success("Category created");
      }
      setShowForm(false);
      setEditingCat(null);
      setForm({ name: "", description: "", parentId: "", sortOrder: 0 });
      fetchCategories();
    } catch {
      toast.error("Failed to save category");
    }
  };

  const handleEdit = (cat: any) => {
    setEditingCat(cat);
    setForm({ name: cat.name, description: cat.description || "", parentId: cat.parentId || "", sortOrder: cat.sortOrder });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete category?",
      message: "Products in this category will become uncategorised. This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category deleted");
      fetchCategories();
    } catch {
      toast.error("Failed to delete category");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Button
          onClick={() => { setEditingCat(null); setForm({ name: "", description: "", parentId: "", sortOrder: 0 }); setShowForm(true); }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      <div className="bg-white rounded-xl border">
        {loading ? (
          <div className="p-6 text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="p-6 text-gray-500 text-center">No categories</div>
        ) : (
          <div className="divide-y">
            {categories.map((cat: any) => (
              <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{cat.name}</span>
                    {!cat.isActive && <StatusBadge variant="destructive">Inactive</StatusBadge>}
                    <span className="text-xs text-gray-400">({cat._count?.products || 0} products)</span>
                  </div>
                  {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleEdit(cat)} className="p-1 hover:bg-gray-100 rounded">
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1 hover:bg-gray-100 rounded">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingCat(null); }}
        title={editingCat ? "Edit Category" : "Add Category"}
      >
        <div className="p-4 space-y-3">
          <input
            placeholder="Category name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none h-20"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">No parent</option>
              {categories
                .filter((c: any) => c.id !== editingCat?.id)
                .map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <input
              type="number"
              placeholder="Sort order"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            {editingCat ? "Update" : "Create"}
          </Button>
        </div>
      </Dialog>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
