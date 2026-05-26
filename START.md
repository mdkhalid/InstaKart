# InstaCart — Start Guide

A full-stack grocery delivery app with Next.js, Express, PostgreSQL, and Prisma.

## Prerequisites

- Node.js 18+ and npm
- Docker Desktop

## Quick Start

### 1. Start infrastructure (PostgreSQL + Redis)

```bash
docker-compose up -d
```

Wait ~10 seconds for databases to initialize.

### 2. Set up the database

```bash
# Generate Prisma client
npx prisma generate --schema=packages/api/prisma/schema.prisma

# Run migrations
npx prisma migrate dev --name init --schema=packages/api/prisma/schema.prisma

# Seed sample data (admin + categories)
npx ts-node --compiler-options {"module":"CommonJS"} packages/api/prisma/seed.ts
```

### 3. Start all development servers

```bash
npm run dev
```

This starts three servers:
| App       | URL                     |
|-----------|-------------------------|
| API       | http://localhost:4000   |
| Web store | http://localhost:3000   |
| Admin     | http://localhost:3001   |

## Default Credentials

| Role     | Email                    | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@instamart.com      | Admin@123     |
| Customer | customer@example.com     | Customer@123  |

## Project Structure

```
InstantShopping/
├── apps/
│   ├── web/          # Customer frontend (Next.js 14)
│   └── admin/        # Admin panel (Next.js 14)
├── packages/
│   ├── api/          # Express backend + Prisma
│   └── types/        # Shared TypeScript types
├── docker-compose.yml # PostgreSQL + Redis
├── package.json     # Workspace root
└── turbo.json       # Turborepo pipeline
```

## Useful Commands

```bash
npm run dev             # Start all apps
npm run build           # Build all apps
npm run db:studio       # Open Prisma Studio (DB browser)

# Run individual apps
cd apps/web && npm run dev      # Web only on :3000
cd apps/admin && npm run dev    # Admin only on :3001
cd packages/api && npm run dev  # API only on :4000
```

## API Reference

Base URL: `http://localhost:4000/api/v1`

### Auth
| Method | Path                  | Auth |
|--------|-----------------------|------|
| POST   | /auth/register        | -    |
| POST   | /auth/login           | -    |
| POST   | /auth/refresh         | -    |
| POST   | /auth/forgot-password | -    |
| POST   | /auth/reset-password  | -    |

### Products
| Method | Path                     | Auth  |
|--------|--------------------------|-------|
| GET    | /products                | -     |
| GET    | /products/featured       | -     |
| GET    | /products/search?q=      | -     |
| GET    | /products/:slug          | -     |
| POST   | /products                | ADMIN |
| PUT    | /products/:id            | ADMIN |

### Orders
| Method | Path                     | Auth  |
|--------|--------------------------|-------|
| POST   | /orders                  | JWT   |
| GET    | /orders                  | JWT   |
| GET    | /orders/:id              | JWT   |
| POST   | /orders/:id/cancel       | JWT   |

### Admin
| Method | Path                     | Auth  |
|--------|--------------------------|-------|
| GET    | /admin/dashboard         | ADMIN |
| GET    | /admin/orders            | ADMIN |
| PUT    | /admin/orders/:id/status | ADMIN |
| GET    | /admin/users             | ADMIN |

Full spec: see `instamart_spec.md`

## Troubleshooting

**Port already in use?**
```bash
netstat -ano | findstr :4000
```

**DB connection refused?**
```bash
docker ps
docker-compose restart
```

**Prisma client not found?**
```bash
npx prisma generate --schema=packages/api/prisma/schema.prisma
```
