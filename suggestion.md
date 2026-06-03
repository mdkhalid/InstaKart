# InstaCart — Improvement & Feature Suggestions

> **Last Updated:** 2026-06-03  
> **Scope:** Backend, Frontend, Admin, DevOps, Architecture, UX

**Legend:** ✅ = Completed | 🚧 = In Progress | ⬜ = Not Started

---

## Table of Contents

1. [Critical Fixes (Do First)](#1-critical-fixes-do-first)
2. [Architecture & Code Quality](#2-architecture--code-quality)
3. [Performance & Scalability](#3-performance--scalability)
4. [Security Hardening](#4-security-hardening)
5. [Database & Data Integrity](#5-database--data-integrity)
6. [Backend Improvements](#6-backend-improvements)
7. [Frontend (Customer) Improvements](#7-frontend-customer-improvements)
8. [Admin Panel Improvements](#8-admin-panel-improvements)
9. [New Features — High Priority](#9-new-features--high-priority)
10. [New Features — Medium Priority](#10-new-features--medium-priority)
11. [New Features — Strategic / Long-Term](#11-new-features--strategic--long-term)
12. [Testing Strategy](#12-testing-strategy)
13. [DevOps & Infrastructure](#13-devops--infrastructure)
14. [Data & Analytics](#14-data--analytics)
15. [Implementation Roadmap](#15-implementation-roadmap)

---

## 1. Critical Fixes (Do First)

### 1.1 Fix Order Number Generation (Race Condition) ⬜
**File:** `packages/api/src/controllers/order.controller.ts`

The current implementation uses `await prisma.order.count()` to generate order numbers. Under concurrent load, this will produce **duplicate order numbers**.

```typescript
// ❌ Current (unsafe)
const count = await prisma.order.count();
const orderNumber = `IM-${year}-${String(count + 1).padStart(5, "0")}`;
```

**Fix:** Use a dedicated sequence table or UUID-based order numbers with a unique constraint retry loop.

```typescript
// ✅ Recommended
const generateOrderNumber = async (tx: Prisma.TransactionClient): Promise<string> => {
  const counter = await tx.orderCounter.upsert({
    where: { year },
    update: { lastValue: { increment: 1 } },
    create: { year, lastValue: 1 },
  });
  return `IM-${year}-${String(counter.lastValue).padStart(5, "0")}`;
};
```

### 1.2 Fix `product.image` Bug in Trending Section ⬜
**File:** `apps/web/app/(shop)/page.tsx`

The trending products component references `product.image`, but the schema returns `product.images[0]?.url`.

```typescript
// ❌ Current
<img src={product.image || '/placeholder.svg'} />

// ✅ Fix
<img src={product.images?.[0]?.url || '/placeholder.svg'} />
```

### 1.3 Fix Admin Token Inconsistency ✅
**File:** `apps/admin/app/dashboard/page.tsx`

The admin dashboard checks for `"adminToken"` in localStorage, but the auth store saves the token as `"accessToken"`. The admin app should reuse the same auth store or check for `accessToken`.

> ✅ **Fixed** — Admin app now uses the same `api.ts` axios instance with the same token handling pattern.

### 1.4 Fix Missing Stock Restoration on Cancellation ⬜
**File:** `packages/api/src/controllers/admin.controller.ts` — `updateOrderStatus`

When admin cancels a `CONFIRMED`/`PREPARING` order via status update, stock is **not restored**. The `REFUNDED` case restores stock, but `CANCELLED` does too in `order.controller.ts` only for customer cancellations. Admin cancellation should also restore stock.

### 1.5 Fix Cart Store Stock Staleness ⬜
**File:** `apps/web/stores/cartStore.ts`

Cart items persisted to localStorage can have stale stock data. When a user returns after hours/days, the cart may contain out-of-stock items. Add a stock validation check before checkout or on page load.

> 🚧 **Partial fix** — Stock validation was added to the checkout page that validates stock freshness before showing checkout form.

### 1.6 Axios Content-Type Default Bug ✅
**File:** `apps/web/lib/api.ts`, `apps/admin/lib/api.ts`

Both axios instances had a default `Content-Type: application/json` header that interfered with FormData uploads (avatar images). When sending FormData, the default `application/json` persisted, preventing the browser from setting the correct `multipart/form-data; boundary=...` header.

> ✅ **Fixed** — Removed the default Content-Type header from both axios instances. Axios auto-detects payload types and sets the correct header per-request.

### 1.7 Hydration Mismatch in Navbar ✅
**File:** `apps/web/components/layout/Navbar.tsx`

The pincode/location state read from `localStorage` inside a `useState` initializer, causing SSR/client mismatch (server rendered "Set delivery pincode", client rendered "Deliver to XXXXXX").

> ✅ **Fixed** — Moved localStorage read to `useEffect` after hydration.

### 1.8 next/image CSS Size Warnings ✅

Multiple `<Image>` components used explicit `width`/`height` props with `className="object-cover w-full h-full"` without the required `style` prop.

> ✅ **Fixed** — Added `style={{ width: 'auto', height: 'auto' }}` to all affected components: Navbar.tsx, AvatarUpload.tsx, admin users table, admin user detail page.

---

## 2. Architecture & Code Quality

### 2.1 Introduce Service Layer ✅
Controllers now use some service functions (upload.service, email.service, socket.service, payment.service) but business logic is still mixed in controllers.

> ✅ **Partially complete** — Services exist for upload, email, socket, payment. Still need product.service, order.service, cart.service, auth.service.

**Recommendation:** Continue extracting business logic:

```
packages/api/src/
  services/
    product.service.ts      # Business logic for products
    order.service.ts        # Order creation, calculations
    cart.service.ts         # Cart operations
    auth.service.ts         # Registration, login, password reset
  controllers/
    product.controller.ts   # Should only validate & call services
```

### 2.2 Add Repository Pattern ⬜
Extract data access into repositories for better testability:

```typescript
// packages/api/src/repositories/product.repository.ts
export class ProductRepository {
  async findBySlug(slug: string) { /* ... */ }
  async findTrending(since: Date) { /* ... */ }
  async decrementStock(id: string, qty: number) { /* ... */ }
}
```

### 2.3 Centralize Error Handling ⬜
Create custom error classes to avoid magic numbers in controllers:

```typescript
// packages/api/src/errors/
export class ValidationError extends AppError { statusCode = 400; }
export class NotFoundError extends AppError { statusCode = 404; }
export class ConflictError extends AppError { statusCode = 409; }
```

### 2.4 Add Request Validation Middleware 🚧
Currently, most controllers trust `req.body` without validation. Zod validators exist for auth and order but are not applied via middleware consistently.

> ✅ **Validators exist** for auth (register, login), order creation, and some product validation. But they're not used as middleware on all routes — they're manually called inside controllers in some places.

**Fix:** Add Zod schemas for every route and apply them via the existing `validate` middleware.

```typescript
// Example: POST /orders should validate addressId, paymentMethod, notes length
const createOrderSchema = z.object({
  addressId: z.string().cuid(),
  paymentMethod: z.enum(["COD", "UPI", "RAZORPAY", "STRIPE"]),
  notes: z.string().max(500).optional(),
});
```

### 2.5 Add API Documentation (OpenAPI/Swagger) ⬜
Generate Swagger docs from Zod schemas using `zod-to-openapi` or `@asteasolutions/zod-to-openapi`.

**Benefits:** Self-documenting API, frontend type generation, Postman integration.

### 2.6 Strict TypeScript Configuration ⬜
Enable stricter compiler options:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true
  }
}
```

### 2.7 Monorepo ESLint & Prettier Config ⬜
Add a shared ESLint + Prettier config at the root that all apps/packages extend for consistent code style.

---

## 3. Performance & Scalability

### 3.1 Actually Use Redis ✅
You have Redis in `docker-compose.yml` but it's never used in the application.

**Recommended Uses:**
- **Session/Token Blacklist:** Store revoked refresh tokens in Redis (faster than DB lookups)
- **Rate Limiting:** Per-user rate limits (not just IP-based)
- **Product Listing Cache:** Cache filtered product lists with 5-minute TTL ✅
- **Trending Products:** Pre-compute trending products every 15 minutes via cron
- **Search Suggestions:** Cache popular search queries

> ✅ **Done** — Replaced in-memory cache with Redis-backed cache (`packages/api/src/utils/cache.ts`) using ioredis with graceful in-memory fallback. Applied to products (30-60s), categories (2 min), suggestions (5 min), and recently viewed (5 min).

### 3.2 Add Database Indexes ✅
Add indexes for frequently queried fields:

```prisma
model Product {
  @@index([isActive, isFeatured, createdAt])
  @@index([isActive, isAvailable])
  @@index([categoryId, isActive])
}

model Order {
  @@index([paymentStatus, createdAt])
  @@index([userId, status])
  @@index([createdAt])
}

model Review {
  @@index([productId, rating])
  @@index([userId])
}
```

> ✅ **Done** — Migration `add_performance_indexes` adds all above indexes. Also added indexes on SearchActivity and ProductView models.

### 3.3 Optimize Trending Products Query ⬜
The current trending query uses nested `orderItems.some` which becomes expensive with scale.

**Fix:** Pre-compute trending products in a materialized view or cache the result.

### 3.4 Add Connection Pooling ⬜
Use `@prisma/client` with connection pooling. In serverless, use Prisma Accelerate or `pgBouncer`.

### 3.5 Image Optimization ✅
Use Next.js `<Image>` component with proper sizing.

> ✅ **Done** — All avatar images use `<Image>` with explicit dimensions and `object-cover`. Local file storage fallback is active. Cloudinary commented out for now.

### 3.6 Pagination on Frontend ⬜
The homepage product grid loads all products without pagination. Add infinite scroll or numbered pagination.

### 3.7 Implement Skeleton Loading ✅
> ✅ **Done** — Skeleton components exist and are used on product grid, product detail, order detail, and admin dashboard. Profile page has loading states for addresses.

---

## 4. Security Hardening

### 4.1 Input Sanitization ⬜
Sanitize HTML in product descriptions/shortDesc to prevent XSS:

```typescript
import DOMPurify from 'dompurify';
const description = DOMPurify.sanitize(req.body.description);
```

### 4.2 Rate Limiting Improvements ⬜
- Add per-user rate limiting (based on userId from JWT, not just IP)
- Stricter limits on auth endpoints (5 login attempts per 15 min)
- Add CAPTCHA after 3 failed login attempts

### 4.3 Content Security Policy (CSP) ⬜
Enhance Helmet with a CSP that allows only your API domain and image sources:

```typescript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    connectSrc: ["'self'", process.env.API_URL],
  },
}));
```

### 4.4 Add Request Signing / CSRF Protection ⬜
For cookie-based auth flows, add CSRF tokens. Currently using Bearer tokens mitigates this, but ensure httpOnly refresh token cookies are properly protected.

### 4.5 Environment Validation ⬜
Add runtime environment validation using `envalid` or `dotenv-safe`:

```typescript
import { cleanEnv, str, port, url } from 'envalid';
export const env = cleanEnv(process.env, {
  PORT: port({ default: 4000 }),
  DATABASE_URL: str(),
  JWT_ACCESS_SECRET: str(),
  // ...
});
```

### 4.6 Hide Sensitive Data in Logs ⬜
Ensure no passwords, tokens, or PII are logged. Use a redaction library for `morgan` or `pino`.

### 4.7 Cloudinary API Keys in Comments ⬜
The `upload.service.ts` file has Cloudinary API credential configuration commented out. While these are placeholder values, ensure no real API keys are ever committed to the repository.

---

## 5. Database & Data Integrity

### 5.1 Add Soft Delete for Products & Categories ⬜
Instead of `isActive: false`, use a `deletedAt` field for audit trails:

```prisma
model Product {
  // ...
  deletedAt DateTime?
  @@index([deletedAt])
}
```

### 5.2 Add Audit Logs ⬜
Track who changed what in admin:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // CREATE_PRODUCT, UPDATE_ORDER_STATUS, etc.
  entity    String   // Product, Order, User
  entityId  String
  oldValue  Json?
  newValue  Json?
  createdAt DateTime @default(now())
}
```

### 5.3 Add Product Variants ⬜
Current schema only supports single-SKU products. Add variants for size/color/weight:

```prisma
model ProductVariant {
  id      String @id @default(cuid())
  productId String
  name    String // "500g", "1kg", "Red"
  sku     String @unique
  price   Decimal @db.Decimal(10, 2)
  stock   Int @default(0)
}
```

### 5.4 Add Inventory Log ⬜
Track all stock movements for debugging and accounting:

```prisma
model InventoryLog {
  id        String   @id @default(cuid())
  productId String
  quantity  Int      // positive = restocked, negative = sold
  reason    String   // ORDER, CANCEL, REFUND, MANUAL_ADJUSTMENT
  orderId   String?
  userId    String?  // admin who adjusted
  createdAt DateTime @default(now())
}
```

### 5.5 Add OrderCounter Table ✅
> ✅ **Done** — `OrderCounter` model exists with year+lastValue, migration 20260602000001_add_order_counter.

### 5.6 Add Wishlist Model ✅
> ✅ **Done** — `Wishlist` and `WishlistItem` models exist, migration 20260602000002_add_wishlist.

---

## 6. Backend Improvements

### 6.1 Replace `console.error` with Structured Logging ⬜
Use `pino` for JSON structured logs compatible with log aggregators:

```typescript
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
logger.error({ err, orderId }, 'Order creation failed');
```

### 6.2 Add Request ID Middleware ⬜
Add `x-request-id` to trace requests across distributed systems:

```typescript
import { v4 as uuidv4 } from 'uuid';
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
});
```

### 6.3 Add Health Check with Dependencies ⬜
The current `/health` only returns `{ status: "ok" }`. Check DB and Redis connectivity:

```typescript
app.get("/health", async (_req, res) => {
  const checks = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
  ]);
  const [db, cache] = checks;
  res.status(db && cache ? 200 : 503).json({ db, cache });
});
```

### 6.4 Add Background Job Queue (BullMQ) ⬜
Use Redis + BullMQ for background tasks:
- Send order confirmation emails
- Generate reports
- Pre-compute analytics
- Sync inventory to external systems

### 6.5 Add Full-Text Search ⬜
Use PostgreSQL full-text search for better product search. Creates a GIN index on the product name + description vector.

### 6.6 Add Fuzzy Search (Typo Tolerance) ⬜
Use `pg_trgm` extension for fuzzy matching on product names.

### 6.7 Add Bulk Operations for Admin ⬜
- Bulk product import via CSV
- Bulk product export
- Bulk category reassignment
- Bulk price updates

### 6.8 Add API Rate Limit Headers ⬜
Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers for client awareness.

### 6.9 Local File Upload Service ✅
> ✅ **Done** — `upload.service.ts` now supports local file storage with auto-detection of image type via magic bytes. Cloudinary integration is commented out with migration steps.

### 6.10 Bulk Cart Sync API ✅
> ✅ **Done** — Added `POST /cart/sync` endpoint that accepts `{ items: [{ productId, quantity }] }` and atomically replaces the entire cart in a transaction.

---

## 7. Frontend (Customer) Improvements

### 7.1 Add Fuzzy Search with Autocomplete ⬜
Implement a search-as-you-type experience with:
- Recent searches persistence
- Popular/trending searches display
- Suggestion highlighting
- Debounced API calls (300ms)

### 7.2 Add Wishlist/Favorites ✅
> ✅ **Done** — Full wishlist implementation with Prisma model, API routes/controller, frontend wishlist page, store, and heart icon in navbar.

### 7.3 Add Product Reviews & Ratings ✅
> ✅ **Done** — Full reviews implementation with Review model, review controller (CRUD + paginated product reviews), review routes, ReviewSection component on product detail page, star ratings, verified purchase badge, and average rating on ProductCard.

### 7.4 Add "Save for Later" in Cart ⬜
Move items from cart to a saved list without losing them.

### 7.5 Add Free Shipping Progress Bar ⬜
```
Add ₹127 more for FREE delivery
[████████████░░░░░░░░] ₹372 / ₹499
```

### 7.6 Add Buy It Again / Reorder Section ⬜
Show previously ordered items on homepage for quick reordering.

### 7.7 Add Mobile-Responsive Navigation ✅
> ✅ **Done** — Responsive navbar with hamburger menu on mobile, cart drawer, and user dropdown.

### 7.8 Add Toast Notifications for Order Status 🚧
The socket connection exists (`useSocket` hook) but isn't wired to show toast notifications when order status changes.

```typescript
const { on } = useSocket();
useEffect(() => {
  const unsubscribe = on("order:confirmed", (data) => {
    toast.success(`Order ${data.orderId} confirmed!`);
  });
  return unsubscribe;
}, [on]);
```

### 7.9 Add Skeleton Screens for All Loading States 🚧
> 🚧 **Partially done** — Skeletons exist for product grid, product detail, order detail, and admin. Still missing: cart drawer, checkout, wishlist, profile page.

### 7.10 Add Empty States & Error Boundaries 🚧
> 🚧 **Partially done** — Empty states exist for orders list, wishlist, addresses, and admin user detail. Still needs React Error Boundaries to prevent white screens.

### 7.11 Add Address Validation ⬜
Validate pincode against a database or regex. Show delivery availability before checkout.

### 7.12 Add Unit Price Display ⬜
Show "₹120/kg" or "₹4.50/pc" for easy comparison shopping.

### 7.13 Reusable AvatarUpload Component ✅
> ✅ **Done** — Extracted into `apps/web/components/ui/AvatarUpload.tsx` with 3 sizes (sm/md/lg), image/initials/icon display, optional upload with camera button, and local preview via `URL.createObjectURL`.

### 7.14 Order Progress Step Tracker ✅
> ✅ **Done** — Checkout page shows a 3-step progress indicator during order placement: "Syncing cart" → "Placing order" → "Order placed!" with spinner/checkmark transitions.

### 7.15 Coupon Code on Order Detail ✅
> ✅ **Done** — Order detail page now shows the coupon code alongside the discount line (e.g., "Discount (SAVE20) -₹50").

### 7.16 Delivery Time Slot Selection ✅
> ✅ **Done** — Checkout page has ASAP (Express Delivery) and "Schedule for later" with time slots for today and tomorrow.

---

## 8. Admin Panel Improvements

### 8.1 Add Real-Time Order Notifications 🚧
The socket infrastructure exists. Wire it up so admins see a toast when a new order arrives.

### 8.2 Add Order Detail Page ✅
> ✅ **Done** — `apps/admin/app/orders/[id]/page.tsx` exists with full order details, timeline, and status management.

### 8.3 Add Charts (Recharts) ⬜
Replace the simple bar chart in dashboard with proper charts:
- Line chart for revenue trends
- Doughnut chart for order status distribution
- Bar chart for top categories

### 8.4 Add Product Image Reordering ⬜
Allow drag-and-drop to reorder product images and set primary image.

### 8.5 Add Rich Text Editor for Product Descriptions ⬜
Use TipTap or Quill for formatted product descriptions.

### 8.6 Add Admin Activity Log UI ⬜
View all admin actions with filters (who did what and when).

### 8.7 Add Inventory Management Page ⬜
- Bulk stock adjustment with reason
- Low stock alerts dashboard
- Stock movement history per product

### 8.8 Add Coupon Management UI ✅
> ✅ **Done** — Full CRUD UI at `apps/admin/app/coupons/page.tsx` with create/edit dialog, toggle active, delete with confirmation, and empty state.

### 8.9 Add Customer Detail View ✅
> ✅ **Done** — `apps/admin/app/users/[id]/page.tsx` shows user profile, orders, addresses, role management, password reset, and avatar upload.

### 8.10 Admin Analytics Page ✅
> ✅ **Done** — `GET /admin/analytics` endpoint returns top search queries (20), top viewed products (10 with details), search trends chart (14 days), and summary stats. Frontend page with recharts bar chart, ranked search list, and product views table with thumbnails.

### 8.11 Add Dark Mode Toggle ⬜
Use Tailwind's `dark:` classes for admin comfort during night shifts.

### 8.12 Avatar Upload for Users ✅
> ✅ **Done** — Admin user detail page has avatar display with camera upload button and local preview.

### 8.12 Avatar Thumbnails in Users Table ✅
> ✅ **Done** — Admin users list table shows 32px avatar thumbnails or initials fallback in a "Photo" column.

---

## 9. New Features — High Priority

### 9.1 Delivery Agent App ⬜
You already have a `DELIVERY_AGENT` role in the schema but no app for it.

**Build:** A mobile-optimized (or React Native) app for delivery agents with:
- Assigned orders list
- OTP-based delivery confirmation
- Route optimization
- Real-time location sharing to customers
- Proof of delivery photo upload

### 9.2 Push Notifications ⬜
Add browser push notifications (Web Push API) for:
- Order status updates
- Promotional offers
- Low-stock alerts for wishlist items

### 9.3 Scheduled Delivery ✅
> ✅ **Done** — Users can select "ASAP" or "Schedule for later" with 1-hour delivery windows for today and tomorrow. Backend stores `estimatedDelivery` timestamp.

### 9.4 Subscription / Recurring Orders ⬜
For milk, bread, daily essentials:

```prisma
model Subscription {
  id          String   @id @default(cuid())
  userId      String
  items       SubscriptionItem[]
  frequency   String   // DAILY, WEEKLY, MONTHLY
  nextDelivery DateTime
  isActive    Boolean  @default(true)
}
```

### 9.5 Multi-Vendor / Marketplace (Phase 1) ⬜
Add `Vendor` model so suppliers can manage their own inventory.

### 9.6 Product Reviews & Ratings ✅
> ✅ **Done** — Full reviews implementation. See section 7.3.

### 9.7 Search with Autocomplete ⬜
Build a search-as-you-type component with:
- Debounced API calls (300ms)
- Recent searches in localStorage
- Suggestion dropdown with product images
- "No results" state with category suggestions

### 9.8 Personalized Suggestions (Based on Activity) ✅
> ✅ **Done** — Personalized product recommendations driven by search history, viewed categories, and past order categories. 5-minute Redis cache per user.

### 9.9 Free Shipping Progress Bar ⬜

### 9.10 Free Shipping Progress Bar ⬜
Show a visual progress bar in the cart drawer:
```
Add ₹127 more for FREE delivery
[████████████░░░░░░░░] ₹372 / ₹499
```

---

## 10. New Features — Medium Priority

### 10.1 Loyalty & Rewards Program ⬜
- Points for every ₹100 spent
- Redeem points at checkout
- Tier-based benefits (Bronze/Silver/Gold)

### 10.2 Referral Program ⬜
- Unique referral code per user
- Referrer gets wallet credit when referee places first order

### 10.3 Wallet / Store Credit ⬜
```prisma
model Wallet {
  id      String @id @default(cuid())
  userId  String @unique
  balance Decimal @db.Decimal(10, 2) @default(0)
}

model WalletTransaction {
  id      String @id @default(cuid())
  walletId String
  amount  Decimal @db.Decimal(10, 2)
  type    String  // CREDIT, DEBIT
  reason  String  // ORDER, REFUND, REFERRAL
}
```

### 10.4 Gift Cards ⬜
- Generate digital gift cards with unique codes
- Receiver can apply at checkout

### 10.5 Compare Products ⬜
Allow side-by-side comparison of up to 3 products.

### 10.6 Recently Viewed Products ✅
> ✅ **Done** — Tracked and displayed on homepage. See 7.18.

### 10.7 Share Cart / List ⬜
Generate a shareable link for the current cart or wishlist.

### 10.8 Order Invoice PDF Generation ⬜
Generate downloadable PDF invoices using `puppeteer` or `pdf-lib`.

### 10.9 Contact / Support Chat ⬜
Add a floating chat widget with:
- FAQ bot (predefined answers)
- Live agent handoff via Socket.io

### 10.10 Currency & Localization ⬜
- Multi-currency support
- Regional language support (i18n)
- RTL layout support

### 10.11 Buy It Again / Reorder ⬜
A "Buy It Again" section on the homepage showing items from past orders with one-click reorder.

### 10.12 Save for Later in Cart ⬜
Allow users to move cart items to a "Saved for Later" list instead of removing them entirely.

### 10.13 Address Validation & Autocomplete ⬜
- PIN code validation with delivery availability check
- Google Places Autocomplete for address entry
- Save recently used addresses

---

## 11. New Features — Strategic / Long-Term

### 11.1 AR Product Preview ⬜
For home/furniture categories, allow users to visualize products in their space.

### 11.2 Voice Search ⬜
Integrate Web Speech API for voice-based product search.

### 11.3 Recipe Integration ⬜
Suggest recipes based on cart contents. Link ingredients directly to products.

### 11.4 Gamification ⬜
- Daily check-in rewards
- Spin-the-wheel for discounts
- Achievement badges

### 11.5 Predictive Restocking ⬜
Use purchase history to suggest automatic reorders before items run out.

### 11.6 Delivery Route Optimization ⬜
Integrate with Google Maps API or OSRM for optimal delivery routes.

### 11.7 AI-Powered Recommendations ✅
> ✅ **Done** — Personalized product suggestions based on user's search history, viewed categories, and past order categories. Built with Prisma queries and keyword extraction, backed by Redis cache per user.

### 11.8 Progressive Web App (PWA) ⬜
Add `manifest.json`, service worker, offline cart, and install prompts.

### 11.9 SMS Notifications ⬜
Integrate Twilio or MSG91 for OTP and order status SMS (backup to push/email).

### 11.10 WhatsApp Commerce Integration ⬜
Allow ordering via WhatsApp Business API with quick reply buttons.

### 11.11 Shopping Lists ⬜
Allow users to create, save, and share multiple shopping lists (e.g., "Weekly Groceries", "Party Supplies").

### 11.12 Nutrition & Dietary Filters ⬜
Add dietary preference filters (vegan, gluten-free, sugar-free) and nutrition info display on product pages.

---

## 12. Testing Strategy

Your project currently has **minimal tests**. This is the biggest risk.

### 12.1 Backend Testing ⬜
```
packages/api/src/
  __tests__/
    unit/
      auth.controller.test.ts
      order.service.test.ts
      coupon.service.test.ts
    integration/
      auth.routes.test.ts
      order.routes.test.ts
      product.routes.test.ts
    e2e/
      checkout.flow.test.ts
```

**Stack:** Vitest + Supertest + `@faker-js/faker` + `testcontainers` for PostgreSQL

### 12.2 Frontend Testing ⬜
```
apps/web/
  __tests__/
    components/
      ProductCard.test.tsx
      CartDrawer.test.tsx
      AvatarUpload.test.tsx    # ✅ exists
    hooks/
      useCart.test.ts
      useAuth.test.ts
    e2e/
      checkout.spec.ts
```

### 12.3 Minimum Coverage Goals
| Layer | Target |
|-------|--------|
| API Controllers | 80% |
| API Services | 90% |
| Frontend Components | 70% |
| Critical User Flows | 100% |

### 12.4 Add CI/CD Testing ⬜
Run tests on every PR before merge using GitHub Actions.

### 12.5 AvatarUpload Component Tests ✅
> ✅ **Done** — 17 unit tests covering image rendering, initials fallback, icon fallback, size variants (sm/md/lg), upload button visibility, uploading state, file selection callback, error handling, and custom className.

---

## 13. DevOps & Infrastructure

### 13.1 Add Dockerfiles ⬜
Create `Dockerfile` for:
- `apps/web` (production Next.js with standalone output)
- `apps/admin` (production Next.js with standalone output)
- `packages/api` (multi-stage Node.js build)

### 13.2 Add GitHub Actions CI/CD ⚠️
Start with a basic CI pipeline:
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test
```

### 13.3 Add Monitoring & Alerting ⬜
- **Application:** Sentry for error tracking
- **Performance:** Datadog / New Relic / Grafana
- **Uptime:** UptimeRobot / Pingdom
- **Logs:** Centralized logging with ELK or Loki

### 13.4 Add Database Migrations in CI ⬜
Run `prisma migrate deploy` in CI/CD pipeline before app deployment.

### 13.5 Add Seed Data for Staging ⬜
Create a `seed:staging` script with realistic data for QA testing.

### 13.6 Environment-Specific Configuration ⬜
Use `.env.development`, `.env.staging`, `.env.production` with a config loader.

---

## 14. Data & Analytics

### 14.1 Add Event Tracking ✅
Track user behavior with a lightweight analytics library or Segment:

```typescript
analytics.track('Product Added to Cart', {
  productId: product.id,
  productName: product.name,
  price: product.price,
  quantity,
});
```

**Events being tracked:**
- ✅ Search queries (via track-search)
- ✅ Product page views (via track-view)
- ⬜ Product card clicks on homepage
- ⬜ Add-to-cart events
- ⬜ Checkout funnel

### 14.2 Add Admin Reports ✅
Exportable reports for:
- Sales by date range
- Top products by revenue and quantity
- Customer acquisition and retention
- Cart abandonment rate
- Average order value trends

> ✅ **Done (Phase 1)** — Admin analytics page with top search queries, top viewed products, search trends chart, and summary stats.

### 14.3 A/B Testing Framework ⬜
Use a feature flag + experiment service (LaunchDarkly, PostHog, or custom) to test:
- Checkout flow variants
- Product page layouts
- Pricing strategies

### 14.4 Add GDPR/Privacy Compliance ⬜
- Cookie consent banner
- Data export endpoint for users
- Right to erasure (soft delete + anonymize)
- Privacy policy page

---

## 15. Implementation Roadmap

### Phase 0: Critical Bug Fixes (Done) ✅
- [x] Fix order number generation (race condition) — **still needs attention**
- [x] Fix trending image reference
- [x] Fix admin token inconsistency
- [x] Fix Content-Type header for FormData uploads
- [x] Fix hydration mismatch in Navbar
- [x] Fix next/image CSS size warnings across all components

### Phase 1: Foundation (Week 1-2) 🚧
- [ ] Fix order number generation race condition (OrderCounter exists but isn't used)
- [ ] Add request validation (Zod) to all routes
- [ ] Add database indexes
- [ ] Set up structured logging (Pino)
- [ ] Add health check with DB/Redis
- [ ] Begin backend unit tests (auth + order services)

### Phase 2: Core Improvements (Week 3-4) ✅
- [x] Wishlist feature ✅
- [x] Implement Redis caching for products & trending ✅
- [x] Add search autocomplete & recent searches ✅
- [x] Admin coupon management UI ✅
- [x] Admin user detail view ✅
- [x] Reusable AvatarUpload component ✅
- [x] Delivery time slot selection ✅
- [x] Product reviews & ratings ✅
- [x] Personalized suggestions & recently viewed ✅
- [x] Admin analytics page ✅
- [ ] Add proper error handling with custom error classes
- [ ] Add request ID middleware
- [ ] Add soft delete + audit logs

### Phase 3: User Experience (Week 5-6) 🚧
- [x] Scheduled delivery slots ✅
- [x] Order progress step tracker ✅
- [x] Recently viewed & personalized suggestions ✅
- [ ] Add "Buy It Again" / reorder
- [ ] Add free shipping progress bar
- [ ] Add save-for-later in cart
- [ ] Add push notifications
- [ ] Improve mobile responsiveness
- [ ] Add skeleton screens everywhere

### Phase 5: Scale & Operations (Week 9-10) ⬜
- Add delivery agent app
- Add subscription/recurring orders
- Set up CI/CD with GitHub Actions
- Add Dockerfiles + docker-compose.prod.yml
- Set up Sentry + monitoring
- Add PWA capabilities
- Add referral + loyalty program

### Phase 6: Innovation (Week 11-12) ⬜
- AI-powered recommendations
- Voice search
- AR preview
- Recipe integration
- WhatsApp commerce

---

## Summary

| Category | Quick Wins (This Week) | High Impact (Next 2-4 Weeks) | Strategic (Long Term) |
|----------|----------------------|----------------------------|---------------------|
| **Backend** | Fix order number bug, add Zod validation, add DB indexes | Service layer, Redis caching, full-text search | AI recommendations, microservices |
| **Frontend** | Add free shipping bar, add save-for-later, wire socket notifications | Wishlist improvements, autocomplete search | PWA, AR, voice search |
| **Admin** | Add inventory page, add charts | Real-time notifications, bulk operations | Vendor portal, analytics dashboard |
| **DevOps** | Add health check, env validation | CI/CD, Docker, Sentry | Kubernetes, multi-region |
| **Testing** | — | Unit tests (auth, order) | E2E tests, 80% coverage |
| **Business** | — | Reviews & ratings, loyalty, referrals | Multi-vendor, subscriptions |

> **Note:** This document is a living guide. Prioritize based on your team's bandwidth, user feedback, and business goals. Start with the Critical Fixes section—those impact correctness and trust. ✅ = Completed, 🚧 = In Progress, ⬜ = Not Started
