"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Category = { id: string; name: string; slug: string };

type Props = {
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
};

export function CategorySelect({ value, onChange, required }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/categories");
        const list: Category[] = data?.data?.categories || data?.data || [];
        if (mounted) setCategories(list);
      } catch {
        if (mounted) setCategories([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={loading}
      className="w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
    >
      <option value="">
        {loading ? "Loading categories..." : "Select a category"}
      </option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
