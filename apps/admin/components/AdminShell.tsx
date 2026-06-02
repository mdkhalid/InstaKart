"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token && !pathname.includes("/login")) {
      router.push("/login");
    }
  }, [pathname, router]);

  const isLoginPage = pathname.includes("/login");

  if (isLoginPage) {
    return (
      <>
        {children}
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
