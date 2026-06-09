# Production Readiness Checklist

> Generated after commit 1a96fad — critical blockers resolved, high-priority items deferred

---

## ✅ Critical Blockers (RESOLVED)

| # | Item | Resolution |
|---|------|------------|
| 1 | JWT secrets | Strong base64 secrets in `packages/api/.env` |
| 2 | Dockerfiles | `api`, `web`, `admin` multi-stage builds |
| 3 | Production compose | `docker-compose.yml` with healthchecks, env interpolation |
| 4 | Payments | Razorpay + Stripe + COD auto-detected from env vars |
| 5 | Hardcoded delivery agent | Now `DEFAULT_DELIVERY_AGENT_NAME` / `DEFAULT_DELIVERY_AGENT_PHONE` |

---

## 🔴 High Priority — Fix Before Public Launch

### Security
- [ ] **CSP headers** — Configure `helmet.contentSecurityPolicy()` in `packages/api/src/app.ts`
- [ ] **Rate limiting** — Reduce `max: 200` to `max: 60` per minute; add per-endpoint limits
- [ ] **Input sanitization** — Add `express-validator` or DOMPurify middleware for XSS/NoSQL injection
- [ ] **CSRF protection** — SameSite=Strict cookies or `csurf` for state-changing endpoints
- [ ] **Environment validation** — Zod schema validation on boot (`packages/api/src/index.ts`)
- [ ] **Sensitive data in logs** — Mask passwords/tokens in `logger.ts`; no `console.error` in prod

### Reliability
- [ ] **Cloudinary uploads** — Replace local file storage (`upload.service.ts:8,27,80`)
- [ ] **Request ID middleware** — Correlation IDs for tracing (`packages/api/src/middleware/`)
- [ ] **Health check deps** — `/health` should verify DB + Redis connectivity
- [ ] **Background job queue** — BullMQ for emails, notifications, order processing

### Observability
- [ ] **Structured logging** — Replace `console.error` with `logger.error` across codebase
- [ ] **API documentation** — Swagger/OpenAPI spec
- [ ] **Error tracking** — Sentry or similar integration

---

## 🟡 Medium Priority — Next Sprint

- [ ] Repository pattern (service → repository → Prisma)
- [ ] Soft delete for Products/Categories (`deletedAt`)
- [ ] Audit logs for admin mutations
- [ ] Product variants schema
- [ ] Inventory log / stock movement history
- [ ] Frontend pagination (replace infinite scroll)
- [ ] Full-text search (PostgreSQL `tsvector` or Meilisearch)
- [ ] Fuzzy search / typo tolerance

---

## 🟢 Low Priority / Nice to Have

- [ ] Delivery Agent mobile app
- [ ] Push notifications (FCM/APNs)
- [ ] Subscription/recurring orders
- [ ] Multi-vendor marketplace
- [ ] Loyalty/rewards program
- [ ] Referral system
- [ ] Gift cards
- [ ] PDF invoices
- [ ] Voice search
- [ ] AR product view
- [ ] PWA support

---

## Quick Fixes (Copy-Paste Ready)

### 1. CSP + Rate Limit (`packages/api/src/app.ts`)
```ts
import rateLimit from "express-rate-limit";

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    connectSrc: ["'self'", "wss:"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
}));

app.use(rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
}));
```

### 2. Env Validation (`packages/api/src/index.ts` — top of file)
```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
  CLIENT_URL: z.string().url(),
  ADMIN_URL: z.string().url(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  FREE_DELIVERY_THRESHOLD: z.coerce.number().default(499),
  DELIVERY_FEE: z.coerce.number().default(40),
  TAX_RATE: z.coerce.number().default(0.05),
});

envSchema.parse(process.env);
```

### 3. Replace console.error (one-liner)
```bash
# From repo root
grep -r "console.error" packages/api/src --include="*.ts" -l | xargs sed -i 's/console\.error/logger.error/g'
```

---

## Deployment Command (when ready)

```bash
# 1. Copy and fill production env
cp .env.example packages/api/.env
# Edit packages/api/.env with REAL secrets, SMTP, Cloudinary, Razorpay/Stripe keys

# 2. Build & deploy
docker-compose -f docker-compose.yml up -d --build

# 3. Run migrations
docker-compose exec api npx prisma migrate deploy

# 4. Verify
curl http://localhost:4000/health
curl http://localhost:3000
curl http://localhost:3001
```

---

## Notes

- **Payment webhooks**: Ensure your domain is configured in Razorpay/Stripe dashboard for `/api/v1/payments/webhook`
- **Cloudinary**: Set `CLOUDINARY_*` vars; uploads will auto-switch from local to Cloudinary
- **CORS**: `CLIENT_URL` and `ADMIN_URL` must match your production domains exactly (no trailing slash)
- **Socket.io**: `NEXT_PUBLIC_SOCKET_URL` points to API (port 4000) for real-time order tracking