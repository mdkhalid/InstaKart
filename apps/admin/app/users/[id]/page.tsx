"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, User, Mail, Phone, Calendar, Shield,
  Package, RefreshCw, Save, Edit3, Camera,
} from "lucide-react";
import { StatusBadge, getStatusVariant } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirm } from "@/hooks/useConfirm";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    setUploadingAvatar(true);
    try {
      const { data } = await api.post(`/admin/users/${params.id}/avatar`, formData);
      if (data.data?.avatarUrl) {
        setUser((prev: any) => ({ ...prev, avatarUrl: data.data.avatarUrl }));
      }
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload avatar");
      setLocalPreviewUrl(null);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploadingAvatar(false);
    }
  };

  // Reset password state
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/admin/users/${params.id}`);
      setUser(data.data);
      setEditFirstName(data.data.firstName);
      setEditLastName(data.data.lastName);
      setEditEmail(data.data.email);
      setEditPhone(data.data.phone || "");
    } catch (err: any) {
      const message = err.response?.status === 404
        ? "User not found"
        : "Failed to load user details";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params?.id) fetchUser();
  }, [params?.id, fetchUser]);

  const handleToggleStatus = async () => {
    try {
      await api.put(`/admin/users/${params.id}/status`);
      toast.success(`User ${user.isActive ? "deactivated" : "activated"}`);
      fetchUser();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const handleChangeRole = async (role: string) => {
    try {
      await api.put(`/admin/users/${params.id}/role`, { role });
      toast.success("Role updated");
      fetchUser();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/users/${params.id}/profile`, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone || undefined,
      });
      setUser({ ...user, ...data.data });
      setEditing(false);
      toast.success("User profile updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const ok = await confirm({
      title: "Reset this user's password?",
      message: "They will be logged out of all sessions immediately and need to log in again with the new password.",
      confirmText: "Reset password",
      variant: "danger",
    });
    if (!ok) return;

    setResetting(true);
    try {
      await api.put(`/admin/users/${params.id}/reset-password`, { newPassword });
      toast.success("Password reset successful");
      setShowResetPwd(false);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-6">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-16">
        <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{error}</h2>
        <p className="text-gray-500 mb-6">The user could not be found or loaded.</p>
        <div className="flex items-center justify-center space-x-3">
          <Button variant="outline" onClick={() => router.push("/users")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
          </Button>
          <Button onClick={fetchUser}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start space-x-4">
          <button
            onClick={() => router.push("/users")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            title="Back to Users"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="relative flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
              {(localPreviewUrl || user.avatarUrl) ? (
                <Image
                  src={localPreviewUrl || user.avatarUrl}
                  alt={`${user.firstName}'s avatar`}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                  style={{ width: "auto", height: "auto" }}
                />
              ) : (
                <User className="h-8 w-8 text-primary-600" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-full p-1.5 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title={uploadingAvatar ? "Uploading..." : "Upload avatar"}
            >
              <Camera className="h-3 w-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <StatusBadge variant={getStatusVariant(user.role) as any}>
                {user.role}
              </StatusBadge>
              <StatusBadge variant={user.isActive ? "success" : "destructive"}>
                {user.isActive ? "Active" : "Inactive"}
              </StatusBadge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Joined {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold">Profile Information</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (editing) {
                    setEditFirstName(user.firstName);
                    setEditLastName(user.lastName);
                    setEditEmail(user.email);
                    setEditPhone(user.phone || "");
                  }
                  setEditing(!editing);
                }}
              >
                {editing ? "Cancel" : <><Edit3 className="h-4 w-4 mr-1" /> Edit</>}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Not set"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <Button onClick={handleSaveProfile} loading={saving}>
                    <Save className="h-4 w-4 mr-1" /> Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{user.email}</span>
                  {user.isEmailVerified ? (
                    <StatusBadge variant="success">Verified</StatusBadge>
                  ) : (
                    <StatusBadge variant="warning">Unverified</StatusBadge>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{user.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">Joined {formatDate(user.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">
                    {user._count?.orders || 0} orders, {user._count?.addresses || 0} addresses
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Package className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Recent Orders</h2>
            </div>
            {user.orders && user.orders.length > 0 ? (
              <div className="space-y-2">
                {user.orders.map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-right flex items-center space-x-3">
                      <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                      <StatusBadge variant={getStatusVariant(order.status) as any}>
                        {order.status}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No orders yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Role & Status */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Account Controls</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={user.role}
                  onChange={(e) => handleChangeRole(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="DELIVERY_AGENT">Delivery Agent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Button
                  variant={user.isActive ? "destructive" : "default"}
                  className="w-full"
                  onClick={handleToggleStatus}
                >
                  {user.isActive ? "Deactivate User" : "Activate User"}
                </Button>
              </div>
            </div>
          </div>

          {/* Reset Password */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
            {showResetPwd ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleResetPassword} loading={resetting} variant="destructive" size="sm">
                    Reset Password
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowResetPwd(false); setNewPassword(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowResetPwd(true)}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Reset Password
              </Button>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Account Info</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">User ID</span>
                <span className="font-mono text-xs text-gray-700">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email Verified</span>
                <StatusBadge variant={user.isEmailVerified ? "success" : "warning"} className="text-xs">
                  {user.isEmailVerified ? "Yes" : "No"}
                </StatusBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Orders</span>
                <span className="font-medium">{user._count?.orders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Addresses</span>
                <span className="font-medium">{user._count?.addresses || 0}</span>
              </div>
              {user.updatedAt && (
                <div className="flex justify-between pt-2 border-t mt-2">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-xs">{formatDate(user.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
