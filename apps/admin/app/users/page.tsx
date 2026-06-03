"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DataTable } from "@/components/DataTable";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get(`/admin/users?page=${page}&limit=20`);
      setUsers(data.data?.users || []);
      setTotalPages(data.data?.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await api.put(`/admin/users/${id}/status`);
      toast.success("User status toggled");
      fetchUsers();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      toast.success("Role updated");
      fetchUsers();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const columns = [
    {
      key: "avatarUrl",
      label: "Photo",
      render: (v: string, row: any) => (
        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
          {v ? (
            <Image src={v} alt="" width={32} height={32} className="object-cover w-full h-full" style={{ width: "auto", height: "auto" }} />
          ) : (
            <span className="text-xs font-semibold text-primary-700">
              {row.firstName?.charAt(0)}{row.lastName?.charAt(0)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (_: any, row: any) => (
        <span className="font-medium text-gray-900">{row.firstName} {row.lastName}</span>
      ),
    },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    {
      key: "role",
      label: "Role",
      render: (v: string) => <StatusBadge variant={getStatusVariant(v) as any}>{v}</StatusBadge>,
    },
    {
      key: "isActive",
      label: "Status",
      render: (v: boolean, row: any) => (
        <button onClick={() => toggleStatus(row.id)}>
          <StatusBadge variant={v ? "success" : "destructive"}>{v ? "Active" : "Inactive"}</StatusBadge>
        </button>
      ),
    },
    {
      key: "_count",
      label: "Orders",
      render: (v: any) => v?.orders || 0,
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (v: string) => formatDate(v),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: any) => (
        <select
          value={row.role}
          onChange={(e) => changeRole(row.id, e.target.value)}
          className="text-xs border rounded px-2 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="CUSTOMER">Customer</option>
          <option value="ADMIN">Admin</option>
          <option value="DELIVERY_AGENT">Delivery Agent</option>
        </select>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchable
        pagination={{ page, totalPages, onPageChange: setPage }}
      />
    </div>
  );
}
