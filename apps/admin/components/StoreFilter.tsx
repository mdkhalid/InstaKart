"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import api from "@/lib/api";

interface StoreOption {
  id: string;
  name: string;
}

interface StoreFilterProps {
  value: string;
  onChange: (storeId: string) => void;
}

export function StoreFilter({ value, onChange }: StoreFilterProps) {
  const [stores, setStores] = useState<StoreOption[]>([]);

  useEffect(() => {
    api.get("/admin/stores").then((res) => {
      setStores(res.data.data || []);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex items-center space-x-2">
      <Store className="h-4 w-4 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">All Stores</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
