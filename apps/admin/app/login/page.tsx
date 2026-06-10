"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Store } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "STORE_ADMIN"];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@instamart.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const user = data.data?.user;
      if (!user || !ADMIN_ROLES.includes(user.role)) {
        toast.error("Admin access required");
        setLoading(false);
        return;
      }
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("adminUser", JSON.stringify(user));

      const label = user.role === "STORE_ADMIN"
        ? `Welcome Store Admin!`
        : "Welcome Admin!";
      toast.success(label);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-md">
        <div className="text-center mb-6">
          <Package className="h-10 w-10 text-primary-600 mx-auto mb-2" />
          <h1 className="text-xl font-bold">Admin Login</h1>
          <p className="text-sm text-gray-500">InstaCart Admin Panel</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
