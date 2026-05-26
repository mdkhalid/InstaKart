import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/login", { email, password });
          const userData = data.data.user;
          const token = data.data.accessToken;
          set({ user: userData, accessToken: token, isLoading: false });
          localStorage.setItem("accessToken", token);
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || "Login failed");
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/register", formData);
          const userData = data.data.user;
          const token = data.data.accessToken;
          set({ user: userData, accessToken: token, isLoading: false });
          localStorage.setItem("accessToken", token);
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || "Registration failed");
        }
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          // ignore
        }
        localStorage.removeItem("accessToken");
        set({ user: null, accessToken: null });
      },

      updateProfile: async (updates) => {
        const { data } = await api.put("/users/profile", updates);
        set({ user: data.data });
      },

      changePassword: async (currentPassword, newPassword) => {
        await api.put("/users/change-password", { currentPassword, newPassword });
      },

      forgotPassword: async (email) => {
        await api.post("/auth/forgot-password", { email });
      },

      resetPassword: async (token, password) => {
        await api.post("/auth/reset-password", { token, password });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "instamart-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
