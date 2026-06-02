"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Plus, Edit2, Trash2, Lock, Camera } from "lucide-react";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);

  // Change password state
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "Home", street: "", city: "", state: "", pincode: "", isDefault: false,
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const { data } = await api.get("/users/addresses");
      setAddresses(data.data || []);
    } catch {}
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ firstName, lastName, phone });
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async () => {
    try {
      await api.post("/users/addresses", addressForm);
      toast.success("Address added");
      setShowAddressForm(false);
      setAddressForm({ label: "Home", street: "", city: "", state: "", pincode: "", isDefault: false });
      fetchAddresses();
    } catch {
      toast.error("Failed to add address");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await api.delete(`/users/addresses/${id}`);
      toast.success("Address deleted");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.put(`/users/addresses/${id}/default`);
      toast.success("Default address updated");
      fetchAddresses();
    } catch {
      toast.error("Failed to update default address");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { toast.error("Current password is required"); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (currentPassword === newPassword) { toast.error("New password must be different from current"); return; }

    setChangingPwd(true);
    try {
      await api.put("/users/change-password", { currentPassword, newPassword });
      toast.success("Password changed successfully");
      setShowChangePwd(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPwd(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingAvatar(true);
    try {
      const { data } = await api.post("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.data?.avatarUrl) {
        useAuthStore.getState().setUser({ ...user!, avatarUrl: data.data.avatarUrl });
      }
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        <div className="bg-white border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? "Cancel" : <><Edit2 className="h-4 w-4 mr-1" /> Edit</>}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button onClick={handleSaveProfile} loading={saving}>Save Changes</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Avatar */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                    {user?.avatarUrl ? (
                      <Image src={user.avatarUrl} alt="Avatar" width={64} height={64} className="object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-primary-600" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
                    title="Upload avatar"
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <span>{user?.email}</span>
              </div>
              {user?.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span>{user?.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold">Password</h2>
            </div>
            {!showChangePwd && (
              <Button variant="outline" size="sm" onClick={() => setShowChangePwd(true)}>
                <Lock className="h-4 w-4 mr-1" /> Change Password
              </Button>
            )}
          </div>
          {showChangePwd && (
            <div className="space-y-3">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
              <div className="flex space-x-3 pt-2">
                <Button onClick={handleChangePassword} loading={changingPwd}>
                  Update Password
                </Button>
                <Button variant="outline" onClick={() => { setShowChangePwd(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Addresses */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Addresses</h2>
            <Button variant="outline" size="sm" onClick={() => setShowAddressForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Address
            </Button>
          </div>

          <div className="space-y-3">
            {addresses.map((addr: any) => (
              <div key={addr.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-primary-600" />
                    <span className="font-medium text-sm">{addr.label}</span>
                    {addr.isDefault && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Default</span>}
                  </div>
                  <p className="text-sm text-gray-600 ml-6">{addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {!addr.isDefault && (
                    <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-primary-600 hover:underline">Set Default</button>
                  )}
                  <button onClick={() => handleDeleteAddress(addr.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {addresses.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No addresses saved yet</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <Button variant="destructive" onClick={async () => { await logout(); router.push("/"); }}>
            Logout
          </Button>
        </div>
      </main>

      <Dialog open={showAddressForm} onClose={() => setShowAddressForm(false)} title="Add Address">
        <div className="p-4 space-y-3">
          <select
            value={addressForm.label}
            onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="Home">Home</option>
            <option value="Work">Work</option>
            <option value="Other">Other</option>
          </select>
          <Input placeholder="Street" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
            <Input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
          </div>
          <Input placeholder="Pincode" value={addressForm.pincode} onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })} />
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} />
            <span>Set as default address</span>
          </label>
          <Button className="w-full" onClick={handleAddAddress}>Save Address</Button>
        </div>
      </Dialog>
      <Footer />
    </>
  );
}
