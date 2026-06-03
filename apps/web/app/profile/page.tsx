"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Plus, Edit2, Trash2, Lock, Shield, Home, LogOut } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type Tab = "profile" | "addresses" | "security";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
  { id: "addresses", label: "Addresses", icon: <Home className="h-4 w-4" /> },
  { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPwd(false);
    }
  };

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
      const { data } = await api.post("/users/avatar", formData);
      if (data.data?.avatarUrl) {
        useAuthStore.getState().setUser({ ...user!, avatarUrl: data.data.avatarUrl });
      }
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload avatar");
      // Revert preview on failure
      setLocalPreviewUrl(null);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploadingAvatar(false);
    }
  };

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((s) => (s as string).charAt(0).toUpperCase())
    .join("")
    .slice(0, 2) || "U";

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center space-x-3 mb-6">
          <AvatarUpload
            src={user?.avatarUrl}
            previewUrl={localPreviewUrl}
            initials={initials}
            size="md"
            alt={user?.firstName || "Profile"}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h1>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Personal Information</h2>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                {editing ? "Cancel" : <><Edit2 className="h-4 w-4 mr-1" /> Edit</>}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 pb-4 border-b">
                  <AvatarUpload
                    src={user?.avatarUrl}
                    previewUrl={localPreviewUrl}
                    initials={initials}
                    size="md"
                    alt="Avatar"
                    uploading={uploadingAvatar}
                    onUpload={handleAvatarUpload}
                  />
                  <p className="text-sm text-gray-500">Click the camera icon to upload a new photo</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
                <div className="pt-2">
                  <Button onClick={handleSaveProfile} loading={saving}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 pb-4 border-b">
                  <AvatarUpload
                    src={user?.avatarUrl}
                    previewUrl={localPreviewUrl}
                    initials={initials}
                    size="md"
                    alt="Avatar"
                    uploading={uploadingAvatar}
                    onUpload={handleAvatarUpload}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase() || "Member"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                    </div>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-gray-900">{user?.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === "addresses" && (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">My Addresses</h2>
              <Button variant="outline" size="sm" onClick={() => setShowAddressForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Address
              </Button>
            </div>

            <div className="space-y-3">
              {addresses.map((addr: any) => (
                <div key={addr.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{addr.street}</p>
                      <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="text-xs text-primary-600 hover:text-primary-700 hover:underline font-medium whitespace-nowrap"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {addresses.length === 0 && (
                <div className="text-center py-10">
                  <MapPin className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm mb-1">No addresses saved yet</p>
                  <p className="text-xs text-gray-400">Add an address for faster checkout</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Lock className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold">Change Password</h2>
              </div>
              <div className="space-y-4 max-w-md">
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
                  placeholder="Min 8 characters, uppercase, number"
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
                  <Button
                    variant="outline"
                    onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-red-600">Sign Out</h2>
                  <p className="text-sm text-gray-500 mt-1">Sign out from all devices</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={async () => { await logout(); router.push("/"); }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Dialog open={showAddressForm} onClose={() => setShowAddressForm(false)} title="Add Address">
        <div className="p-4 space-y-3">
          <select
            value={addressForm.label}
            onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="Home">Home</option>
            <option value="Work">Work</option>
            <option value="Other">Other</option>
          </select>
          <Input placeholder="Street address" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
            <Input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
          </div>
          <Input placeholder="Pincode" value={addressForm.pincode} onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })} />
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Set as default address</span>
          </label>
          <Button className="w-full" onClick={handleAddAddress}>Save Address</Button>
        </div>
      </Dialog>
      <Footer />
    </>
  );
}
