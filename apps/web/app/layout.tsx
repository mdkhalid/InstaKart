import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { VisitorInit } from "@/components/VisitorInit";
import { StoreInit } from "@/components/StoreInit";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InstaCart - Instant Grocery Delivery",
  description: "Get your groceries delivered in minutes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <VisitorInit />
        <StoreInit />
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#363636",
              color: "#fff",
            },
          }}
        />
      </body>
    </html>
  );
}
