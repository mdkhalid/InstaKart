# InstaMart — Improvement & Feature Suggestions

> **Last Updated:** 2026-06-02  
> **Scope:** Backend, Frontend, Admin, DevOps, Architecture, UX

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

### 1.1 Fix Order Number Generation (Race Condition)
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

### 1.2 Fix `product.image` Bug in Trending Section
**File:** `apps/web/app/(shop)/page.tsx`

The trending products component references `product.image`, but the schema returns `product.images[0]?.url`.

```typescript
// ❌ Current
<img src={product.image || '/placeholder.svg'} />

// ✅ Fix
<img src={product.images?.[0]?.url || '/placeholder.svg'} />
```

### 1.3 Fix Admin Token Inconsistency
**File:** `apps/admin/app/dashboard/page.tsx`

The admin dashboard checks for `"adminToken"` in localStorage, but the auth store saves the token as `"accessToken"`. The admin app should reuse the same auth store or check for `accessToken`.

### 1.4 Fix Missing Stock Restoration on Cancellation
**File:** `packages/api/src/controllers/admin.controller.ts` — `updateOrderStatus`

When admin cancels a `CONFIRMED`/`PREPARING` order via status update, stock is **not restored**. The `REFUNDED` case restores stock, but `CANCELLED` does too in `order.controller.ts` only for customer cancellations. Admin cancellation should also restore stock.

### 1.5 Fix Cart Store Stock Staleness
**File:** `apps/web/stores/cartStore.ts`

Cart items persisted to localStorage can have stale stock data. When a user returns after hours/days, the cart may contain out-of-stock items. Add a stock validation check before checkout or on page load.

---

## 2. Architecture & Code Quality

### 2.1 Introduce Service Layer
Currently, controllers directly call Prisma. This creates tight coupling and makes unit testing impossible.

**Recommendation:** Add a `services/` layer for business logic:

```
packages/api/src/
  services/
    product.service.ts      # Business logic for products
    order.service.ts        # Order creation, calculations
    cart.service.ts         # Cart operations
    email.service.ts        # Already exists ✓
    payment.service.ts      # Already exists ✓
  controllers/
    product.controller.ts   # Should only validate & call services
```

### 2.2 Add Repository Pattern
Extract data access into repositories for better testability:

```typescript
// packages/api/src/repositories/product.repository.ts
export class ProductRepository {
  async findBySlug(slug: string) { /* ... */ }
  async findTrending(since: Date) { /* ... */ }
  async decrementStock(id: string, qty: number) { /* ... */ }
}
```

### 2.3 Centralize Error Handling
Create custom error classes to avoid magic numbers in controllers:

```typescript
// packages/api/src/errors/
export class ValidationError extends AppError { statusCode = 400; }
export class NotFoundError extends AppError { statusCode = 404; }
export class ConflictError extends AppError { statusCode = 409; }
```

### 2.4 Add Request Validation Middleware
Currently, most controllers trust `req.body` without validation. Add Zod schemas for every route:

```typescript
// Example: POST /orders should validate addressId, paymentMethod, notes length
const createOrderSchema = z.object({
  addressId: z.string().cuid(),
  paymentMethod: z.enum(["COD", "UPI", "RAZORPAY", "STRIPE"]),
  notes: z.string().max(500).optional(),
});
```

### 2.5 Add API Documentation (OpenAPI/Swagger)
Generate Swagger docs from Zod schemas using `zod-to-openapi` or `@asteasolutions/zod-to-openapi`.

**Benefits:** Self-documenting API, frontend type generation, Postman integration.

### 2.6 Strict TypeScript Configuration
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

---

## 3. Performance & Scalability

### 3.1 Actually Use Redis
You have Redis in `docker-compose.yml` but it’s never used in the application.

**Recommended Uses:**
- **Session/Token Blacklist:** Store revoked refresh tokens in Redis (faster than DB lookups)
- **Rate Limiting:** Per-user rate limits (not just IP-based)
- **Product Listing Cache:** Cache filtered product lists with 5-minute TTL
- **Trending Products:** Pre-compute trending products every 15 minutes via cron
- **Search Suggestions:** Cache popular search queries

### 3.2 Add Database Indexes
Add indexes for frequently queried fields:

```prisma
model Product {
  // ...
  @@index([isActive, isAvailable, categoryId])
  @@index([createdAt])
  @@index([price])
}

model Order {
  // ...
  @@index([userId, createdAt])
  @@index([status])
  @@index([createdAt])
  @@index([orderNumber])
}

model OrderItem {
  // ...
  @@index([productId])
}
```

### 3.3 Optimize Trending Products Query
The current trending query uses nested `orderItems.some` which becomes expensive with scale.

**Fix:** Pre-compute trending products in a materialized view or cache the result:

```sql
-- Create a view or run a scheduled job every 15 min
SELECT productId, SUM(quantity) as totalSold
FROM OrderItem
WHERE order.createdAt > NOW() - INTERVAL '7 days'
GROUP BY productId
ORDER BY totalSold DESC;
```

### 3.4 Add Connection Pooling
Use `@prisma/client` with connection pooling. In serverless, use Prisma Accelerate or `pgBouncer`.

### 3.5 Image Optimization
- Use Next.js `<Image>` component with `priority` for above-the-fold images
- Serve images via Cloudinary with `f_auto,q_auto` transformations
- Add blur placeholders for product images

### 3.6 Pagination on Frontend
The homepage product grid loads all products without pagination. Add infinite scroll or numbered pagination.

---

## 4. Security Hardening

### 4.1 Input Sanitization
Sanitize HTML in product descriptions/shortDesc to prevent XSS:

```typescript
import DOMPurify from 'dompurify';

// In product controller
const description = DOMPurify.sanitize(req.body.description);
```

### 4.2 Rate Limiting Improvements
- Add per-user rate limiting (based on userId from JWT, not just IP)
- Stricter limits on auth endpoints (5 login attempts per 15 min)
- Add CAPTCHA after 3 failed login attempts

### 4.3 Content Security Policy (CSP)
Enhance Helmet with a CSP that allows only Cloudinary and your API domain:

```typescript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    connectSrc: ["'self'", process.env.API_URL],
  },
}));
```

### 4.4 Add Request Signing / CSRF Protection
For cookie-based auth flows, add CSRF tokens. Currently using Bearer tokens mitigates this, but ensure httpOnly refresh token cookies are properly protected.

### 4.5 Environment Validation
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

### 4.6 Hide Sensitive Data in Logs
Ensure no passwords, tokens, or PII are logged. Use a redaction library for `morgan` or `pino`.

---

## 5. Database & Data Integrity

### 5.1 Add Soft Delete for Products & Categories
Instead of `isActive: false`, use a `deletedAt` field for audit trails:

```prisma
model Product {
  // ...
  deletedAt DateTime?
  @@index([deletedAt])
}
```

### 5.2 Add Audit Logs
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

### 5.3 Add Product Variants
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

### 5.4 Add Inventory Log
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

---

## 6. Backend Improvements

### 6.1 Replace `console.error` with Structured Logging
Use `pino` for JSON structured logs compatible with log aggregators:

```typescript
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

logger.error({ err, orderId }, 'Order creation failed');
```

### 6.2 Add Request ID Middleware
Add `x-request-id` to trace requests across distributed systems:

```typescript
import { v4 as uuidv4 } from 'uuid';
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
});
```

### 6.3 Add Health Check with Dependencies
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

### 6.4 Add Background Job Queue (BullMQ)
Use Redis + BullMQ for background tasks:
- Send order confirmation emails
- Generate reports
- Pre-compute analytics
- Sync inventory to external systems

```typescript
// packages/api/src/queues/email.queue.ts
import { Queue } from 'bullmq';
export const emailQueue = new Queue('emails', { connection: redisConnection });
```

### 6.5 Add Full-Text Search
Use PostgreSQL full-text search for better product search:

```prisma
model Product {
  // ...
  searchVector Unsupported("tsvector")?
  @@index([searchVector], type: Gin)
}
```

```sql
CREATE INDEX idx_product_search ON "Product" USING GIN (
  to_tsvector('english', name || ' ' || coalesce(description, ''))
);
```

### 6.6 Add Fuzzy Search (Typo Tolerance)
Use `pg_trgm` extension for fuzzy matching:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_product_name_trgm ON "Product" USING gin (name gin_trgm_ops);
```

### 6.7 Add Bulk Operations for Admin
- Bulk product import via CSV
- Bulk product export
- Bulk category reassignment
- Bulk price updates

### 6.8 Add API Rate Limit Headers
Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers for client awareness.

---

## 7. Frontend (Customer) Improvements

### 7.1 Add Fuzzy Search with Autocomplete
Implement a search-as-you-type experience with:
- Recent searches persistence
- Popular/trending searches display
- Suggestion highlighting
- Debounced API calls (300ms)

### 7.2 Add Wishlist/Favorites
```prisma
model Wishlist {
  id        String @id @default(cuid())
  userId    String @unique
  items     WishlistItem[]
}

model WishlistItem {
  id        String @id @default(cuid())
  wishlistId String
  productId String
  createdAt DateTime @default(now())
}
```

### 7.3 Add Product Reviews & Ratings
```prisma
model Review {
  id        String @id @default(cuid())
  userId    String
  productId String
  rating    Int // 1-5
  title     String?
  comment   String?
  verified  Boolean @default(false) // only if user purchased
  createdAt DateTime @default(now())
}
```

### 7.4 Add "Save for Later" in Cart
Move items from cart to a saved list without losing them.

### 7.5 Add Free Shipping Progress Bar
```
Add ₹127 more for FREE delivery
[████████████░░░░░░░░] ₹372 / ₹499
```

### 7.6 Add Buy It Again / Reorder Section
Show previously ordered items on homepage for quick reordering.

### 7.7 Add Mobile-Responsive Navigation
The current sidebar filter layout may not work well on mobile. Add:
- Bottom sheet for filters
- Horizontal scroll category pills
- Sticky "Add to Cart" bottom bar

### 7.8 Add Toast Notifications for Order Status
Use the existing socket connection to show toast notifications when order status changes:

```typescript
const { on } = useSocket();
useEffect(() => {
  const unsubscribe = on("order:confirmed", (data) => {
    toast.success(`Order ${data.orderId} confirmed!`);
  });
  return unsubscribe;
}, [on]);
```

### 7.9 Add Skeleton Screens for All Loading States
Currently only product grid has skeletons. Add to:
- Order history
- Product detail page
- Cart drawer
- Checkout page

### 7.10 Add Empty States & Error Boundaries
Add friendly empty states and React Error Boundaries to prevent white screens.

### 7.11 Add Address Validation
Validate pincode against a database or regex. Show delivery availability before checkout.

### 7.12 Add Unit Price Display
Show "₹120/kg" or "₹4.50/pc" for easy comparison shopping.

---

## 8. Admin Panel Improvements

### 8.1 Add Real-Time Order Notifications
Use the existing socket connection to play a sound and show a toast when a new order arrives.

### 8.2 Add Order Detail Page
The admin panel has `/orders` but clicking an order routes to it without a dedicated page. Build a full order detail view.

### 8.3 Add Charts (Recharts)
Replace the simple bar chart in dashboard with proper charts:
- Line chart for revenue trends
- Doughnut chart for order status distribution
- Bar chart for top categories

### 8.4 Add Product Image Reordering
Allow drag-and-drop to reorder product images and set primary image.

### 8.5 Add Rich Text Editor for Product Descriptions
Use TipTap or Quill for formatted product descriptions.

### 8.6 Add Admin Activity Log UI
View all admin actions with filters (who did what and when).

### 8.7 Add Inventory Management Page
- Bulk stock adjustment with reason
- Low stock alerts dashboard
- Stock movement history per product

### 8.8 Add Coupon Management UI
Currently coupons only exist in the schema. Build CRUD UI for:
- Creating coupons (percentage/flat)
- Setting expiry, usage limits, min order amounts
- Viewing coupon usage analytics

### 8.9 Add Customer Detail View
Clicking a user in the users table should show their order history, addresses, and lifetime value.

### 8.10 Add Dark Mode Toggle
Use Tailwind's `dark:` classes for admin comfort during night shifts.

---

## 9. New Features — High Priority

### 9.1 Delivery Agent App
You already have a `DELIVERY_AGENT` role in the schema but no app for it.

**Build:** A mobile-optimized (or React Native) app for delivery agents with:
- Assigned orders list
- OTP-based delivery confirmation
- Route optimization
- Real-time location sharing to customers
- Proof of delivery photo upload

### 9.2 Push Notifications
Add browser push notifications (Web Push API) for:
- Order status updates
- Promotional offers
- Low-stock alerts for wishlist items

### 9.3 Scheduled Delivery
Allow users to choose delivery time slots:

```prisma
model DeliverySlot {
  id        String   @id @default(cuid())
  date      DateTime
  startTime String   // "09:00"
  endTime   String   // "12:00"
  maxOrders Int      @default(20)
  orders    Order[]
}
```

### 9.4 Subscription / Recurring Orders
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

### 9.5 Multi-Vendor / Marketplace (Phase 1)
Add `Vendor` model so suppliers can manage their own inventory:

```prisma
model Vendor {
  id      String    @id @default(cuid())
  name    String
  email   String    @unique
  products Product[]
  orders   Order[]
}
```

---

## 10. New Features — Medium Priority

### 10.1 Loyalty & Rewards Program
- Points for every ₹100 spent
- Redeem points at checkout
- Tier-based benefits (Bronze/Silver/Gold)

### 10.2 Referral Program
- Unique referral code per user
- Referrer gets wallet credit when referee places first order

### 10.3 Wallet / Store Credit
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

### 10.4 Gift Cards
- Generate digital gift cards with unique codes
- Receiver can apply at checkout

### 10.5 Compare Products
Allow side-by-side comparison of up to 3 products.

### 10.6 Recently Viewed Products
Track recently viewed products in Redis or localStorage.

### 10.7 Share Cart / List
Generate a shareable link for the current cart or wishlist.

### 10.8 Order Invoice PDF Generation
Generate downloadable PDF invoices using `puppeteer` or `pdf-lib`.

### 10.9 Contact / Support Chat
Add a floating chat widget with:
- FAQ bot (predefined answers)
- Live agent handoff via Socket.io

### 10.10 Currency & Localization
- Multi-currency support
- Regional language support (i18n)
- RTL layout support

---

## 11. New Features — Strategic / Long-Term

### 11.1 AR Product Preview
For home/furniture categories, allow users to visualize products in their space.

### 11.2 Voice Search
Integrate Web Speech API for voice-based product search.

### 11.3 Recipe Integration
Suggest recipes based on cart contents. Link ingredients directly to products.

### 11.4 Gamification
- Daily check-in rewards
- Spin-the-wheel for discounts
- Achievement badges

### 11.5 Predictive Restocking
Use purchase history to suggest automatic reorders before items run out.

### 11.6 Delivery Route Optimization
Integrate with Google Maps API or OSRM for optimal delivery routes.

### 11.7 AI-Powered Recommendations
Use collaborative filtering or integrate with a recommendation service (AWS Personalize, Vertex AI).

### 11.8 Progressive Web App (PWA)
Add `manifest.json`, service worker, offline cart, and install prompts.

### 11.9 SMS Notifications
Integrate Twilio or MSG91 for OTP and order status SMS (backup to push/email).

### 11.10 WhatsApp Commerce Integration
Allow ordering via WhatsApp Business API with quick reply buttons.

---

## 12. Testing Strategy

Your project currently has **zero tests**. This is the biggest risk.

### 12.1 Backend Testing
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

### 12.2 Frontend Testing
```
apps/web/
  __tests__/
    components/
      ProductCard.test.tsx
      CartDrawer.test.tsx
    hooks/
      useCart.test.ts
      useAuth.test.ts
    e2e/
      checkout.spec.ts
```

**Stack:** Vitest + React Testing Library + Playwright for E2E

### 12.3 Minimum Coverage Goals
| Layer | Target |
|-------|--------|
| API Controllers | 80% |
| API Services | 90% |
| Frontend Components | 70% |
| Critical User Flows | 100% |

### 12.4 Add CI/CD Testing
Run tests on every PR before merge using GitHub Actions.

---

## 13. DevOps & Infrastructure

### 13.1 Add Dockerfiles
Create `Dockerfile` for:
- `apps/web` (production Next.js with standalone output)
- `apps/admin` (production Next.js with standalone output)
- `packages/api` (multi-stage Node.js build)

### 13.2 Add GitHub Actions CI/CD
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
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
```

### 13.3 Add Monitoring & Alerting
- **Application:** Sentry for error tracking
- **Performance:** Datadog / New Relic / Grafana
- **Uptime:** UptimeRobot / Pingdom
- **Logs:** Centralized logging with ELK or Loki

### 13.4 Add Database Migrations in CI
Run `prisma migrate deploy` in CI/CD pipeline before app deployment.

### 13.5 Add Seed Data for Staging
Create a `seed:staging` script with realistic data for QA testing.

### 13.6 Environment-Specific Configuration
Use `.env.development`, `.env.staging`, `.env.production` with a config loader.

---

## 14. Data & Analytics

### 14.1 Add Event Tracking
Track user behavior with a lightweight analytics library or Segment:

```typescript
// Track events
analytics.track('Product Added to Cart', {
  productId: product.id,
  productName: product.name,
  price: product.price,
  quantity,
});
```

**Events to track:**
- Page views
- Product impressions, clicks, add-to-cart
- Checkout funnel steps
- Search queries (and zero-result searches)
- Order completion

### 14.2 Add Admin Reports
Exportable reports for:
- Sales by date range
- Top products by revenue and quantity
- Customer acquisition and retention
- Cart abandonment rate
- Average order value trends

### 14.3 A/B Testing Framework
Use a feature flag + experiment service (LaunchDarkly, PostHog, or custom) to test:
- Checkout flow variants
- Product page layouts
- Pricing strategies

### 14.4 Add GDPR/Privacy Compliance
- Cookie consent banner
- Data export endpoint for users
- Right to erasure (soft delete + anonymize)
- Privacy policy page

---

## 15. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Fix critical bugs (order numbers, trending image, admin token, stock restore)
- [ ] Add request validation (Zod) to all routes
- [ ] Add database indexes
- [ ] Set up structured logging (Pino)
- [ ] Add health check with DB/Redis
- [ ] Begin backend unit tests (auth + order services)

### Phase 2: Core Improvements (Week 3-4)
- [ ] Implement Redis caching for products & trending
- [ ] Add search autocomplete & recent searches
- [ ] Add wishlist feature
- [ ] Add product reviews & ratings
- [ ] Add proper error handling with custom error classes
- [ ] Add request ID middleware
- [ ] Add soft delete + audit logs

### Phase 3: User Experience (Week 5-6)
- [ ] Add scheduled delivery slots
- [ ] Add "Buy It Again" / reorder
- [ ] Add free shipping progress bar
- [ ] Add save-for-later in cart
- [ ] Add push notifications
- [ ] Improve mobile responsiveness
- [ ] Add skeleton screens everywhere

### Phase 4: Admin Power (Week 7-8)
- [ ] Coupon management UI
- [ ] Inventory management page
- [ ] Real-time order notifications with sound
- [ ] Customer detail view
- [ ] Bulk operations (import/export)
- [ ] Admin activity logs
- [ ] Charts and reporting

### Phase 5: Scale & Operations (Week 9-10)
- [ ] Add delivery agent app
- [ ] Add subscription/recurring orders
- [ ] Set up CI/CD with GitHub Actions
- [ ] Add Dockerfiles + docker-compose.prod.yml
- [ ] Set up Sentry + monitoring
- [ ] Add PWA capabilities
- [ ] Add referral + loyalty program

### Phase 6: Innovation (Week 11-12)
- [ ] AI-powered recommendations
- [ ] Voice search
- [ ] AR preview
- [ ] Recipe integration
- [ ] WhatsApp commerce

---

## Summary

| Category | Quick Wins (This Week) | High Impact (Next 2-4 Weeks) | Strategic (Long Term) |
|----------|----------------------|----------------------------|---------------------|
| **Backend** | Fix order number bug, add Zod validation, add DB indexes | Service layer, Redis caching, full-text search | AI recommendations, microservices |
| **Frontend** | Fix trending image, add skeletons, add error boundaries | Wishlist, reviews, autocomplete search | PWA, AR, voice search |
| **Admin** | Fix token check, add order detail page | Coupons, inventory log, real-time notifications | Vendor portal, analytics dashboard |
| **DevOps** | Add health check, env validation | CI/CD, Docker, Sentry | Kubernetes, multi-region |
| **Testing** | — | Unit tests (auth, order) | E2E tests, 80% coverage |
| **Business** | — | Loyalty, referrals, subscriptions | Multi-vendor, WhatsApp |

---

> **Note:** This document is a living guide. Prioritize based on your team's bandwidth, user feedback, and business goals. Start with the Critical Fixes section—those impact correctness and trust.
