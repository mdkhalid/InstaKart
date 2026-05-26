# InstaCart — Instant Shopping & Delivery App
## Complete Product Requirements & Developer Specification

> **Purpose:** Hand this document to any CLI agent (Claude Code, Cursor, Copilot CLI, Aider, etc.) to scaffold, implement, and wire up the entire InstaCart application end-to-end. Every section is written to be machine-readable and directly actionable.

---

## Table of Contents

1. [Tech Stack Decision](#1-tech-stack-decision)
2. [System Architecture](#2-system-architecture)
3. [Project Structure](#3-project-structure)
4. [Database Schema (PostgreSQL)](#4-database-schema)
5. [Backend — Node.js / Express API](#5-backend)
6. [Frontend — Next.js 14 App](#6-frontend)
7. [Authentication & Security](#7-authentication--security)
8. [User Management Module](#8-user-management-module)
9. [Product & Inventory Module](#9-product--inventory-module)
10. [Cart & Order Module](#10-cart--order-module)
11. [Admin Panel Module](#11-admin-panel-module)
12. [Real-Time & Delivery Tracking](#12-real-time--delivery-tracking)
13. [Email & Notification Service](#13-email--notification-service)
14. [File Upload & Media](#14-file-upload--media)
15. [Environment Variables](#15-environment-variables)
16. [Docker & Deployment](#16-docker--deployment)
17. [CLI Agent Prompt Templates](#17-cli-agent-prompt-templates)
18. [API Endpoint Reference](#18-api-endpoint-reference)
19. [Acceptance Criteria / Test Checklist](#19-acceptance-criteria--test-checklist)

---

## 1. Tech Stack Decision

### Why This Stack

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR for SEO, file-based routing, React Server Components, built-in API routes |
| **UI Library** | Tailwind CSS + shadcn/ui | Rapid, accessible, consistent design system |
| **State Management** | Zustand | Lightweight, boilerplate-free global state |
| **Backend** | Node.js + Express.js + TypeScript | Fast JSON APIs, huge ecosystem, same language as frontend |
| **ORM** | Prisma | Type-safe DB access, migrations, seed scripts |
| **Database** | PostgreSQL | ACID compliance, relational integrity, JSON columns for extras |
| **Cache / Queue** | Redis | Session cache, job queue for delivery status updates |
| **Auth** | JWT (access + refresh tokens) + bcrypt | Stateless, scalable, secure |
| **File Storage** | Cloudinary | Free tier, image transformations, CDN |
| **Email** | Nodemailer + Resend (SMTP) | Password reset, order confirmation emails |
| **Real-Time** | Socket.io | Live order tracking, admin dashboard updates |
| **Payments** | Razorpay (India) / Stripe (global) | Both have Node SDKs, webhooks |
| **Containerisation** | Docker + Docker Compose | One-command local setup |
| **Monorepo Tool** | Turborepo | Shared types, parallel builds |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│   Next.js 14 (SSR + CSR)   │   Admin Next.js App              │
└────────────────┬────────────────────────────┬───────────────────┘
                 │ HTTPS / WebSocket           │
┌────────────────▼────────────────────────────▼───────────────────┐
│                      API GATEWAY (Express)                      │
│  Rate Limiting · CORS · Helmet · JWT Middleware · Logging       │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
┌──────▼───┐  ┌───────▼──┐  ┌───────▼──┐  ┌───────▼──────┐
│  Auth    │  │ Products │  │  Orders  │  │   Admin      │
│ Service  │  │ Service  │  │ Service  │  │   Service    │
└──────┬───┘  └───────┬──┘  └───────┬──┘  └───────┬──────┘
       │              │              │              │
┌──────▼──────────────▼──────────────▼──────────────▼─────────────┐
│                     PostgreSQL (Prisma ORM)                      │
└──────────────────────────────────────────────────────────────────┘
       │              │
┌──────▼───┐  ┌───────▼──┐
│  Redis   │  │ Socket.io │
│  Cache   │  │  Server   │
└──────────┘  └───────────┘
```

---

## 3. Project Structure

```
instamart/
├── apps/
│   ├── web/                          # Next.js customer frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   └── reset-password/[token]/page.tsx
│   │   │   ├── (shop)/
│   │   │   │   ├── page.tsx                  # Home / product listing
│   │   │   │   ├── products/[id]/page.tsx
│   │   │   │   ├── cart/page.tsx
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   └── orders/
│   │   │   │       ├── page.tsx              # Order history
│   │   │   │       └── [id]/page.tsx         # Order tracking
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx                  # View/edit profile
│   │   │   │   └── change-password/page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                           # shadcn components
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── product/
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── ProductGrid.tsx
│   │   │   │   └── ProductDetail.tsx
│   │   │   ├── cart/
│   │   │   │   ├── CartDrawer.tsx
│   │   │   │   └── CartItem.tsx
│   │   │   └── order/
│   │   │       ├── OrderCard.tsx
│   │   │       └── OrderTracker.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useCart.ts
│   │   │   └── useSocket.ts
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   └── cartStore.ts
│   │   ├── lib/
│   │   │   ├── api.ts                        # Axios instance
│   │   │   └── utils.ts
│   │   └── types/index.ts
│   │
│   └── admin/                        # Next.js admin panel
│       ├── app/
│       │   ├── dashboard/page.tsx
│       │   ├── products/
│       │   │   ├── page.tsx
│       │   │   ├── new/page.tsx
│       │   │   └── [id]/edit/page.tsx
│       │   ├── orders/
│       │   │   ├── page.tsx
│       │   │   └── [id]/page.tsx
│       │   ├── users/page.tsx
│       │   └── categories/page.tsx
│       └── components/
│           ├── DataTable.tsx
│           ├── StatsCard.tsx
│           └── charts/
│
├── packages/
│   ├── api/                          # Express backend
│   │   ├── src/
│   │   │   ├── index.ts              # Server entry point
│   │   │   ├── app.ts                # Express app setup
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── user.routes.ts
│   │   │   │   ├── product.routes.ts
│   │   │   │   ├── category.routes.ts
│   │   │   │   ├── cart.routes.ts
│   │   │   │   ├── order.routes.ts
│   │   │   │   ├── payment.routes.ts
│   │   │   │   └── admin.routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── product.controller.ts
│   │   │   │   ├── order.controller.ts
│   │   │   │   └── admin.controller.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── admin.middleware.ts
│   │   │   │   ├── validate.middleware.ts
│   │   │   │   ├── rateLimit.middleware.ts
│   │   │   │   └── upload.middleware.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── payment.service.ts
│   │   │   │   ├── upload.service.ts
│   │   │   │   └── socket.service.ts
│   │   │   ├── validators/
│   │   │   │   ├── auth.validator.ts
│   │   │   │   ├── product.validator.ts
│   │   │   │   └── order.validator.ts
│   │   │   └── utils/
│   │   │       ├── jwt.ts
│   │   │       ├── response.ts
│   │   │       └── logger.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── types/                        # Shared TypeScript types
│       └── src/index.ts
│
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## 4. Database Schema

### `prisma/schema.prisma` — Complete Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────── ENUMS ───────────────────────

enum Role {
  CUSTOMER
  ADMIN
  DELIVERY_AGENT
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  UNPAID
  PAID
  FAILED
  REFUNDED
}

enum PaymentMethod {
  COD
  RAZORPAY
  STRIPE
  UPI
}

// ─────────────────────── MODELS ───────────────────────

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  phone             String?   @unique
  passwordHash      String
  firstName         String
  lastName          String
  avatarUrl         String?
  role              Role      @default(CUSTOMER)
  isEmailVerified   Boolean   @default(false)
  isActive          Boolean   @default(true)

  // Address
  addresses         Address[]
  defaultAddressId  String?

  // Relations
  orders            Order[]
  cart              Cart?
  refreshTokens     RefreshToken[]
  passwordResets    PasswordReset[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Address {
  id          String  @id @default(cuid())
  userId      String
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  label       String  @default("Home")   // Home, Work, Other
  street      String
  city        String
  state       String
  pincode     String
  landmark    String?
  lat         Float?
  lng         Float?
  isDefault   Boolean @default(false)

  orders      Order[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model PasswordReset {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  description String?
  imageUrl    String?
  isActive    Boolean   @default(true)
  sortOrder   Int       @default(0)

  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  parentId    String?
  children    Category[] @relation("CategoryTree")

  products    Product[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Product {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  description   String?
  shortDesc     String?
  sku           String   @unique
  barcode       String?

  price         Decimal  @db.Decimal(10, 2)
  salePrice     Decimal? @db.Decimal(10, 2)
  costPrice     Decimal? @db.Decimal(10, 2)

  stock         Int      @default(0)
  lowStockAlert Int      @default(10)
  unit          String   @default("pcs")  // kg, g, L, ml, pcs

  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id])

  images        ProductImage[]
  tags          String[]
  attributes    Json?    // { "brand": "Amul", "weight": "500g" }

  isActive      Boolean  @default(true)
  isFeatured    Boolean  @default(false)
  isAvailable   Boolean  @default(true)

  cartItems     CartItem[]
  orderItems    OrderItem[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model ProductImage {
  id         String  @id @default(cuid())
  productId  String
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url        String
  altText    String?
  isPrimary  Boolean @default(false)
  sortOrder  Int     @default(0)
}

model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CartItem {
  id        String  @id @default(cuid())
  cartId    String
  cart      Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int     @default(1)
  price     Decimal @db.Decimal(10, 2)  // snapshot at time of adding

  @@unique([cartId, productId])
}

model Order {
  id              String        @id @default(cuid())
  orderNumber     String        @unique  // IM-2024-00001
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  addressId       String
  address         Address       @relation(fields: [addressId], references: [id])

  items           OrderItem[]
  status          OrderStatus   @default(PENDING)

  subtotal        Decimal       @db.Decimal(10, 2)
  deliveryFee     Decimal       @db.Decimal(10, 2) @default(0)
  discount        Decimal       @db.Decimal(10, 2) @default(0)
  tax             Decimal       @db.Decimal(10, 2) @default(0)
  total           Decimal       @db.Decimal(10, 2)

  paymentMethod   PaymentMethod @default(COD)
  paymentStatus   PaymentStatus @default(UNPAID)
  paymentId       String?       // Razorpay/Stripe payment ID

  couponCode      String?
  notes           String?

  estimatedDelivery DateTime?
  deliveredAt     DateTime?
  cancelledAt     DateTime?
  cancellationReason String?

  statusHistory   OrderStatusHistory[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  product     Product @relation(fields: [productId], references: [id])
  productName String  // snapshot
  productImage String? // snapshot
  quantity    Int
  unitPrice   Decimal @db.Decimal(10, 2)
  totalPrice  Decimal @db.Decimal(10, 2)
}

model OrderStatusHistory {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  createdAt DateTime    @default(now())
}

model Coupon {
  id              String   @id @default(cuid())
  code            String   @unique
  description     String?
  discountType    String   // PERCENTAGE | FLAT
  discountValue   Decimal  @db.Decimal(10, 2)
  minOrderAmount  Decimal? @db.Decimal(10, 2)
  maxDiscount     Decimal? @db.Decimal(10, 2)
  usageLimit      Int?
  usedCount       Int      @default(0)
  expiresAt       DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
}
```

---

## 5. Backend

### 5.1 — Setup & Entry Point (`packages/api/src/index.ts`)

```typescript
import http from "http";
import app from "./app";
import { initSocket } from "./services/socket.service";
import { prisma } from "./lib/prisma";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, async () => {
  await prisma.$connect();
  console.log(`✅ API running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

### 5.2 — Express App (`packages/api/src/app.ts`)

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { rateLimiter } from "./middleware/rateLimit.middleware";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import adminRoutes from "./routes/admin.routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(rateLimiter);

// Parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(morgan("dev"));

// Routes
app.use("/api/v1/auth",       authRoutes);
app.use("/api/v1/users",      userRoutes);
app.use("/api/v1/products",   productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/cart",       cartRoutes);
app.use("/api/v1/orders",     orderRoutes);
app.use("/api/v1/payments",   paymentRoutes);
app.use("/api/v1/admin",      adminRoutes);

// Error handler
app.use(errorHandler);

export default app;
```

### 5.3 — JWT Utilities (`packages/api/src/utils/jwt.ts`)

```typescript
import jwt from "jsonwebtoken";

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const signAccessToken  = (userId: string, role: string) =>
  jwt.sign({ userId, role }, ACCESS_SECRET, { expiresIn: "15m" });

export const signRefreshToken = (userId: string) =>
  jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });

export const verifyAccessToken  = (token: string) =>
  jwt.verify(token, ACCESS_SECRET) as { userId: string; role: string };

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, REFRESH_SECRET) as { userId: string };
```

### 5.4 — Auth Middleware (`packages/api/src/middleware/auth.middleware.ts`)

```typescript
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  try {
    const payload = verifyAccessToken(authHeader.split(" ")[1]);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Token expired or invalid" });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== "ADMIN")
    return res.status(403).json({ message: "Admin access required" });
  next();
};
```

---

## 6. Frontend

### 6.1 — Axios Instance (`apps/web/lib/api.ts`)

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  withCredentials: true,
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const { data } = await axios.post(
        process.env.NEXT_PUBLIC_API_URL + "/api/v1/auth/refresh",
        {},
        { withCredentials: true }
      );
      localStorage.setItem("accessToken", data.accessToken);
      error.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 6.2 — Auth Store (`apps/web/stores/authStore.ts`)

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (current: string, newPwd: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const { data } = await api.post("/auth/login", { email, password });
        set({ user: data.user, accessToken: data.accessToken, isLoading: false });
        localStorage.setItem("accessToken", data.accessToken);
      },

      register: async (formData) => {
        set({ isLoading: true });
        const { data } = await api.post("/auth/register", formData);
        set({ user: data.user, accessToken: data.accessToken, isLoading: false });
        localStorage.setItem("accessToken", data.accessToken);
      },

      logout: async () => {
        await api.post("/auth/logout");
        localStorage.removeItem("accessToken");
        set({ user: null, accessToken: null });
      },

      updateProfile: async (updates) => {
        const { data } = await api.put("/users/profile", updates);
        set({ user: data.user });
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
    }),
    { name: "auth-storage", partialize: (s) => ({ user: s.user }) }
  )
);
```

### 6.3 — Cart Store (`apps/web/stores/cartStore.ts`)

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: any, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  syncWithServer: () => Promise<void>;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, qty = 1) => {
        const existing = get().items.find((i) => i.productId === product.id);
        if (existing) {
          set({ items: get().items.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i
          )});
        } else {
          set({ items: [...get().items, {
            productId: product.id,
            name: product.name,
            price: product.salePrice ?? product.price,
            quantity: qty,
            imageUrl: product.images?.[0]?.url,
          }]});
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),

      updateQty: (productId, qty) =>
        qty <= 0
          ? get().removeItem(productId)
          : set({ items: get().items.map((i) =>
              i.productId === productId ? { ...i, quantity: qty } : i
            )}),

      clearCart: () => set({ items: [] }),

      syncWithServer: async () => {
        const { data } = await api.get("/cart");
        set({ items: data.items });
      },

      total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: "cart-storage" }
  )
);
```

---

## 7. Authentication & Security

### 7.1 — Auth Controller (`packages/api/src/controllers/auth.controller.ts`)

Implement these functions in the auth controller:

```typescript
// POST /auth/register
// - Validate input (email, password min 8 chars, firstName, lastName)
// - Check email not already registered
// - Hash password with bcrypt (salt rounds: 12)
// - Create user in DB
// - Generate access + refresh tokens
// - Store refresh token in DB with 7-day expiry
// - Set httpOnly cookie with refresh token
// - Return: { user, accessToken }

// POST /auth/login
// - Find user by email
// - Compare password with bcrypt
// - Generate access + refresh tokens
// - Return: { user, accessToken }

// POST /auth/refresh
// - Read refresh token from httpOnly cookie
// - Verify token from DB (not expired, not revoked)
// - Issue new access token
// - Return: { accessToken }

// POST /auth/logout
// - Delete refresh token from DB
// - Clear cookie

// POST /auth/forgot-password
// - Find user by email
// - Generate crypto.randomBytes(32).toString("hex") token
// - Hash token, store in PasswordReset table with 1-hour expiry
// - Send email with link: ${CLIENT_URL}/reset-password/{raw_token}

// POST /auth/reset-password
// - Hash incoming token, look up in DB
// - Check not expired, not used
// - Hash new password, update user
// - Mark reset record as used
// - Invalidate all refresh tokens for that user
```

### 7.2 — Validation Rules

```typescript
// Registration
email:     required | isEmail | toLowerCase
password:  required | minLength(8) | hasUppercase | hasNumber
firstName: required | minLength(2) | maxLength(50)
lastName:  required | minLength(2) | maxLength(50)
phone:     optional | isMobilePhone

// Login
email:     required | isEmail
password:  required

// Change Password
currentPassword: required
newPassword:     required | minLength(8) | notSameAs(currentPassword)
```

---

## 8. User Management Module

### 8.1 — User Routes (`/api/v1/users`)

```
GET    /profile              → getMyProfile        [AUTH]
PUT    /profile              → updateProfile        [AUTH]
PUT    /change-password      → changePassword       [AUTH]
POST   /avatar               → uploadAvatar         [AUTH]
GET    /addresses            → getAddresses         [AUTH]
POST   /addresses            → addAddress           [AUTH]
PUT    /addresses/:id        → updateAddress        [AUTH]
DELETE /addresses/:id        → deleteAddress        [AUTH]
PUT    /addresses/:id/default → setDefaultAddress   [AUTH]
GET    /orders               → getMyOrders          [AUTH]
```

### 8.2 — Profile Update Rules

```typescript
// Allowed to update:
firstName, lastName, phone, avatarUrl, defaultAddressId

// Not allowed to update via this endpoint:
email (separate flow), password (separate flow), role
```

### 8.3 — Avatar Upload Flow

```typescript
// 1. Client sends multipart/form-data with image file
// 2. Multer processes in memory (max 5MB, jpg/png/webp only)
// 3. Upload to Cloudinary folder "instamart/avatars"
// 4. Store Cloudinary URL in user.avatarUrl
// 5. Delete old Cloudinary image if exists
// 6. Return updated user
```

---

## 9. Product & Inventory Module

### 9.1 — Product Routes

```
GET    /products             → listProducts       [PUBLIC]  (paginated, filtered)
GET    /products/featured    → getFeatured        [PUBLIC]
GET    /products/search      → searchProducts     [PUBLIC]
GET    /products/:slug       → getProduct         [PUBLIC]
POST   /products             → createProduct      [ADMIN]
PUT    /products/:id         → updateProduct      [ADMIN]
DELETE /products/:id         → deleteProduct      [ADMIN]
POST   /products/:id/images  → uploadImages       [ADMIN]
DELETE /products/:id/images/:imageId → deleteImage [ADMIN]

GET    /categories           → listCategories     [PUBLIC]
POST   /categories           → createCategory     [ADMIN]
PUT    /categories/:id       → updateCategory     [ADMIN]
DELETE /categories/:id       → deleteCategory     [ADMIN]
```

### 9.2 — Product Listing Query Params

```
?page=1              pagination
?limit=20            items per page (max 100)
?category=slug       filter by category slug
?minPrice=0          price range filter
?maxPrice=999
?search=keyword      full-text search on name, description, tags
?sort=price_asc      price_asc | price_desc | newest | popular
?featured=true       only featured products
?inStock=true        only in-stock products
```

### 9.3 — Product Response Shape

```typescript
{
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc: string;
  sku: string;
  price: number;
  salePrice: number | null;
  discountPercent: number;       // computed
  stock: number;
  isAvailable: boolean;
  unit: string;
  category: { id, name, slug };
  images: [{ url, isPrimary, altText }];
  tags: string[];
  isFeatured: boolean;
}
```

### 9.4 — Inventory Rules

```
- When order is CONFIRMED, decrement stock for each item
- When order is CANCELLED/REFUNDED, restore stock
- isAvailable = false when stock <= 0
- Send admin notification when stock < lowStockAlert
- Block order if product stock < requested quantity
```

---

## 10. Cart & Order Module

### 10.1 — Cart Routes

```
GET    /cart              → getCart          [AUTH]
POST   /cart/items        → addItem          [AUTH]
PUT    /cart/items/:productId → updateItem   [AUTH]
DELETE /cart/items/:productId → removeItem   [AUTH]
DELETE /cart              → clearCart        [AUTH]
POST   /cart/coupon       → applyCoupon      [AUTH]
DELETE /cart/coupon       → removeCoupon     [AUTH]
```

### 10.2 — Order Routes

```
POST   /orders                   → createOrder          [AUTH]
GET    /orders                   → getMyOrders           [AUTH]
GET    /orders/:id               → getOrder             [AUTH]
POST   /orders/:id/cancel        → cancelOrder          [AUTH]

GET    /admin/orders             → getAllOrders          [ADMIN]
PUT    /admin/orders/:id/status  → updateOrderStatus    [ADMIN]
```

### 10.3 — Order Creation Flow

```
1. Validate cart is not empty
2. Validate all products are available and have sufficient stock
3. Validate delivery address belongs to user
4. Apply coupon if provided (validate code, usage limit, expiry, min order)
5. Calculate:
   subtotal   = sum(item.price * item.quantity)
   deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE (e.g. ₹40)
   discount   = coupon ? calculateDiscount(subtotal) : 0
   tax        = (subtotal - discount) * TAX_RATE (e.g. 5%)
   total      = subtotal + deliveryFee - discount + tax
6. Generate orderNumber: "IM-" + YEAR + "-" + padStart(sequence, 5, "0")
7. Create Order with OrderItems (snapshot product name, image, price)
8. If COD: set paymentStatus=UNPAID, status=CONFIRMED
9. If online payment: return paymentIntent/orderId from Razorpay/Stripe
10. Decrement stock
11. Clear cart
12. Create OrderStatusHistory entry
13. Send order confirmation email
14. Emit socket event "order:new" to admin room
```

### 10.4 — Order Status Transitions

```
PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
                    ↘ CANCELLED
                                                     ↘ REFUNDED
```

---

## 11. Admin Panel Module

### 11.1 — Admin Dashboard Stats Endpoint

```
GET /admin/dashboard

Response:
{
  stats: {
    totalRevenue:       number,   // sum of all paid order totals
    todayRevenue:       number,
    totalOrders:        number,
    pendingOrders:      number,
    totalProducts:      number,
    lowStockProducts:   number,
    totalUsers:         number,
    newUsersToday:      number,
  },
  recentOrders:         Order[],   // last 10
  topProducts:          { product, totalSold }[],  // top 5
  revenueChart:         { date, revenue }[],  // last 30 days
}
```

### 11.2 — Admin User Management Routes

```
GET    /admin/users              → getAllUsers    (paginated, search)
GET    /admin/users/:id          → getUserDetail
PUT    /admin/users/:id/role     → changeRole
PUT    /admin/users/:id/status   → toggleActive  (activate/deactivate)
DELETE /admin/users/:id          → deleteUser    (soft delete)
```

### 11.3 — Admin Product Management

```
// All product CRUD is handled by /admin route prefix
// Use the same /api/v1/products endpoints with [ADMIN] middleware
// Additional admin-only actions:
POST /admin/products/bulk-import   → CSV import (parse, validate, upsert)
GET  /admin/products/export        → CSV export of all products
PUT  /admin/products/:id/toggle    → toggle isActive
PUT  /admin/products/bulk-status   → bulk activate/deactivate
```

---

## 12. Real-Time & Delivery Tracking

### 12.1 — Socket.io Setup (`packages/api/src/services/socket.service.ts`)

```typescript
import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";

export const initSocket = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).role   = payload.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket as any;

    // Join personal room
    socket.join(`user:${userId}`);

    // Admin joins admin room
    if (role === "ADMIN") socket.join("admin");

    socket.on("disconnect", () => {});
  });

  return io;
};
```

### 12.2 — Socket Events Reference

```
// Server → Customer
order:confirmed     { orderId, estimatedDelivery }
order:preparing     { orderId }
order:out_for_delivery { orderId, agentName, agentPhone }
order:delivered     { orderId, deliveredAt }
order:cancelled     { orderId, reason }

// Server → Admin Room
order:new           { order }          // new order placed
order:cancelled     { orderId }
stock:low           { product, stock } // stock below threshold

// Customer → Server
(none — customers only receive)
```

### 12.3 — Estimated Delivery Logic

```typescript
// Business rules
const PREP_TIME_MINUTES       = 10;
const DELIVERY_WINDOW_MINUTES = 30; // target <30 min delivery

const estimatedDelivery = new Date(
  Date.now() + (PREP_TIME_MINUTES + DELIVERY_WINDOW_MINUTES) * 60 * 1000
);
```

---

## 13. Email & Notification Service

### 13.1 — Email Templates (Nodemailer + HTML)

Implement these email templates:

```
1. welcome.html           → On registration: greeting, verify email button
2. verify-email.html      → Email verification link (24h expiry)
3. forgot-password.html   → Password reset link (1h expiry)
4. order-confirmation.html → Order summary, items, total, estimated delivery
5. order-status.html      → Status update: Confirmed / Out for Delivery / Delivered
6. order-cancelled.html   → Cancellation notice with reason
```

### 13.2 — Email Service (`packages/api/src/services/email.service.ts`)

```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({
  to, subject, html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  await transporter.sendMail({
    from: `"InstaCart" <${process.env.EMAIL_FROM}>`,
    to, subject, html,
  });
};
```

---

## 14. File Upload & Media

### 14.1 — Cloudinary Setup

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (
  buffer: Buffer,
  folder: string,
  publicId?: string
) => {
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `instamart/${folder}`, public_id: publicId, overwrite: true },
      (err, result) => {
        if (err) reject(err);
        else resolve(result!.secure_url);
      }
    );
    stream.end(buffer);
  });
};

export const deleteImage = async (publicId: string) => {
  await cloudinary.uploader.destroy(publicId);
};
```

### 14.2 — Multer Middleware

```typescript
import multer from "multer";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_, file, cb) => {
    ALLOWED_MIME.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPEG, PNG, WEBP allowed"));
  },
});
```

---

## 15. Environment Variables

### Backend `.env` (`packages/api/.env`)

```env
# Server
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/instamart

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your_super_secret_access_key_change_this
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this

# Email (Resend or Gmail SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxx
# OR
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx

# Business Rules
FREE_DELIVERY_THRESHOLD=499
DELIVERY_FEE=40
TAX_RATE=0.05
```

### Frontend `.env.local` (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

---

## 16. Docker & Deployment

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: instamart
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build:
      context: ./packages/api
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/instamart
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./packages/api:/app
      - /app/node_modules

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### Quick Start Commands

```bash
# 1. Clone and install
git clone https://github.com/yourusername/instamart
cd instamart
npm install

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Run DB migrations & seed
cd packages/api
npx prisma migrate dev --name init
npx prisma db seed

# 4. Start backend
npm run dev

# 5. Start frontend (new terminal)
cd ../../apps/web
npm run dev

# OR — one command with Turborepo
turbo dev
```

---

## 17. CLI Agent Prompt Templates

Use these prompts with Claude Code, Cursor, Aider, or any CLI coding agent:

### Prompt A — Scaffold the Full Project

```
Create a Turborepo monorepo called "instamart" with:
- apps/web: Next.js 14 app router, TypeScript, Tailwind CSS, shadcn/ui
- apps/admin: Next.js 14 admin panel
- packages/api: Express.js + TypeScript + Prisma
- packages/types: shared TypeScript types

Use the schema in this document to create prisma/schema.prisma.
Create the folder structure exactly as specified in Section 3.
Initialize git, install all dependencies, and add base tsconfig files.
```

### Prompt B — Implement Auth Module

```
Implement the complete authentication module for InstaCart backend (packages/api).

Requirements:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh (httpOnly cookie refresh token)
- POST /api/v1/auth/logout
- POST /api/v1/auth/forgot-password (sends email with reset link)
- POST /api/v1/auth/reset-password (validates token, updates password)

Use: bcrypt (12 rounds), JWT (15min access, 7d refresh), Prisma for DB.
Store refresh tokens in the RefreshToken table.
Store reset tokens hashed in PasswordReset table (1h expiry).
Use zod for input validation.
Return standardized JSON: { success, message, data }.
```

### Prompt C — Implement Product Listing Frontend

```
Build the product listing page for apps/web at app/(shop)/page.tsx.

Features:
- Grid of ProductCard components (image, name, price, salePrice, unit, add-to-cart button)
- Sidebar filters: category, price range, in-stock only
- Search bar with debounce (300ms)
- Sort dropdown: newest, price low-high, price high-low
- Pagination (infinite scroll preferred)
- Skeleton loading state
- Toast notification on add to cart

Use: Tailwind CSS, shadcn/ui, useCartStore from zustand, api.ts axios instance.
Products fetched from GET /api/v1/products with query params.
```

### Prompt D — Implement Order Flow

```
Implement the complete order placement flow:

Backend:
- POST /api/v1/orders → createOrder controller
  - Validate cart, stock, address
  - Calculate subtotal, deliveryFee, tax, total
  - Generate orderNumber: "IM-" + year + "-" + 5-digit sequence
  - Create Order + OrderItems in DB (snapshot product name/price)
  - Decrement stock
  - Clear cart
  - Send order confirmation email via emailService
  - Emit socket event "order:new" to "admin" room

Frontend:
- /checkout page: address selector, cart summary, payment method (COD/Razorpay)
- /orders page: list of user's orders with status badges
- /orders/[id] page: order detail + real-time status tracker (5 steps)
```

### Prompt E — Build Admin Dashboard

```
Build the admin dashboard at apps/admin/app/dashboard/page.tsx.

Stats cards (fetch from GET /api/v1/admin/dashboard):
- Total Revenue (today + all time)
- Pending Orders count
- Total Products / Low Stock count
- New Users today

Data tables (with search, sort, pagination):
- Recent Orders table: orderNumber, customer, total, status, date, [actions]
- Low Stock Products table: name, stock, category, [edit]

Charts (use recharts):
- Line chart: daily revenue last 30 days
- Bar chart: top 5 selling products

Order management:
- Click order row → modal with full order detail
- Status dropdown to update order status → calls PUT /api/v1/admin/orders/:id/status
- Real-time: listen to socket "order:new" event, add to table with toast
```

---

## 18. API Endpoint Reference

### Auth Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | /auth/register | — | email, password, firstName, lastName | { user, accessToken } |
| POST | /auth/login | — | email, password | { user, accessToken } |
| POST | /auth/refresh | Cookie | — | { accessToken } |
| POST | /auth/logout | Cookie | — | { message } |
| POST | /auth/forgot-password | — | email | { message } |
| POST | /auth/reset-password | — | token, password | { message } |

### User Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /users/profile | JWT | Get my profile |
| PUT | /users/profile | JWT | Update name, phone |
| PUT | /users/change-password | JWT | Change password |
| POST | /users/avatar | JWT | Upload avatar image |
| GET | /users/addresses | JWT | List my addresses |
| POST | /users/addresses | JWT | Add address |
| PUT | /users/addresses/:id | JWT | Update address |
| DELETE | /users/addresses/:id | JWT | Delete address |

### Product Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /products | — | List with filters |
| GET | /products/featured | — | Featured products |
| GET | /products/search?q= | — | Search products |
| GET | /products/:slug | — | Single product |
| POST | /products | ADMIN | Create product |
| PUT | /products/:id | ADMIN | Update product |
| DELETE | /products/:id | ADMIN | Delete product |
| POST | /products/:id/images | ADMIN | Upload images |

### Cart Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /cart | JWT | Get cart |
| POST | /cart/items | JWT | Add item { productId, quantity } |
| PUT | /cart/items/:productId | JWT | Update qty { quantity } |
| DELETE | /cart/items/:productId | JWT | Remove item |
| DELETE | /cart | JWT | Clear cart |
| POST | /cart/coupon | JWT | Apply coupon { code } |

### Order Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /orders | JWT | Place order |
| GET | /orders | JWT | My orders |
| GET | /orders/:id | JWT | Order detail |
| POST | /orders/:id/cancel | JWT | Cancel order |
| GET | /admin/orders | ADMIN | All orders |
| PUT | /admin/orders/:id/status | ADMIN | Update status |

---

## 19. Acceptance Criteria / Test Checklist

### User Registration & Login
- [ ] User can register with email + password
- [ ] Duplicate email returns 409 Conflict
- [ ] Password stored as bcrypt hash (never plaintext)
- [ ] Login returns access token + sets refresh cookie
- [ ] Invalid credentials return 401
- [ ] Access token expires in 15 minutes
- [ ] Refresh token auto-renews session silently

### Password Recovery
- [ ] Forgot password sends email within 5 seconds
- [ ] Reset link expires after 1 hour
- [ ] Reset link can only be used once
- [ ] After reset, old refresh tokens are invalidated
- [ ] Resetting with expired token returns 400

### Profile Management
- [ ] User can update first/last name and phone
- [ ] User can upload avatar (JPG/PNG/WEBP, max 5MB)
- [ ] Invalid file types rejected with 400
- [ ] User can add/edit/delete multiple addresses
- [ ] Default address pre-selected in checkout

### Product Browsing
- [ ] Products paginate correctly (20 per page)
- [ ] Category filter narrows results
- [ ] Price range filter works
- [ ] Search returns relevant results
- [ ] Out-of-stock products show "Unavailable" badge
- [ ] Product detail page loads under 1s

### Cart
- [ ] Add product increments quantity if already in cart
- [ ] Quantity can be updated or removed
- [ ] Cart persists across browser refresh (localStorage)
- [ ] Cart syncs with server on login
- [ ] Out-of-stock product cannot be added to cart
- [ ] Coupon applies correct discount

### Order Placement
- [ ] Order fails if product stock insufficient
- [ ] Stock is decremented on order confirmation
- [ ] Order number generated in IM-YYYY-NNNNN format
- [ ] Confirmation email sent within 30 seconds
- [ ] COD orders immediately move to CONFIRMED status
- [ ] Cart cleared after successful order

### Order Tracking
- [ ] Status timeline visible on order detail page
- [ ] Real-time status update via WebSocket (no page refresh)
- [ ] User can cancel PENDING orders
- [ ] Cannot cancel DELIVERED orders

### Admin Panel
- [ ] Admin can create, edit, delete products with images
- [ ] Admin can upload multiple images per product
- [ ] Admin can manage categories (nested)
- [ ] Admin can view all orders, filter by status
- [ ] Admin can update order status
- [ ] Dashboard shows real-time new order notification
- [ ] Low stock alert appears on dashboard
- [ ] Admin can activate/deactivate user accounts

### Security
- [ ] All admin routes reject non-admin tokens with 403
- [ ] Rate limiting blocks > 100 requests/minute per IP
- [ ] Passwords never appear in any API response
- [ ] SQL injection prevented via Prisma parameterized queries
- [ ] XSS prevented via Helmet + content security policy
- [ ] File uploads reject non-image MIME types

---

## Appendix A — Seed Data Script

```typescript
// packages/api/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Admin user
  await prisma.user.upsert({
    where: { email: "admin@instamart.com" },
    update: {},
    create: {
      email:        "admin@instamart.com",
      passwordHash: await bcrypt.hash("Admin@123", 12),
      firstName:    "Super",
      lastName:     "Admin",
      role:         "ADMIN",
      isEmailVerified: true,
    },
  });

  // Categories
  const categories = ["Fruits & Vegetables", "Dairy & Eggs", "Beverages",
    "Snacks", "Bakery", "Meat & Fish", "Household", "Personal Care"];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      update: {},
      create: {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      },
    });
  }

  console.log("✅ Seed complete");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## Appendix B — Package.json Dependencies

### Backend (`packages/api`)

```json
{
  "dependencies": {
    "@prisma/client": "^5.x",
    "bcrypt": "^5.x",
    "cloudinary": "^2.x",
    "cookie-parser": "^1.x",
    "cors": "^2.x",
    "express": "^4.x",
    "express-rate-limit": "^7.x",
    "helmet": "^7.x",
    "jsonwebtoken": "^9.x",
    "morgan": "^1.x",
    "multer": "^1.x",
    "nodemailer": "^6.x",
    "razorpay": "^2.x",
    "socket.io": "^4.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "@types/bcrypt": "*",
    "@types/cors": "*",
    "@types/express": "*",
    "@types/jsonwebtoken": "*",
    "@types/morgan": "*",
    "@types/multer": "*",
    "@types/nodemailer": "*",
    "prisma": "^5.x",
    "ts-node-dev": "*",
    "typescript": "^5.x"
  }
}
```

### Frontend (`apps/web`)

```json
{
  "dependencies": {
    "axios": "^1.x",
    "next": "14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "socket.io-client": "^4.x",
    "zustand": "^4.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x",
    "react-hot-toast": "^2.x",
    "lucide-react": "*",
    "class-variance-authority": "*",
    "clsx": "*",
    "tailwind-merge": "*"
  }
}
```

---

*Document version: 1.0 — InstaCart Full-Stack Specification*
*Last updated: 2026 | Ready for: Claude Code, Cursor, Aider, Copilot CLI*
