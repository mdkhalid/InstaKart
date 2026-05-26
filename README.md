# InstaCart - Instant Shopping & Delivery App

A full-stack e-commerce application built with Next.js, Express, PostgreSQL, and Prisma.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **Real-time**: Socket.io
- **Auth**: JWT (access + refresh tokens)
- **File Storage**: Cloudinary
- **Payments**: Razorpay/Stripe

## Project Structure

```
instamart/
├── apps/
│   ├── web/          # Customer frontend (Next.js)
│   └── admin/        # Admin panel (Next.js)
├── packages/
│   ├── api/          # Express backend
│   └── types/        # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Docker and Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Start Docker services** (PostgreSQL + Redis):
```bash
docker-compose up -d
```

3. **Set up environment variables**:

Create `.env` files in:
- `packages/api/.env`
- `apps/web/.env.local`
- `apps/admin/.env.local`

See `.env.example` files in each directory.

4. **Set up database**:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. **Start development servers**:
```bash
npm run dev
```

This will start:
- API: http://localhost:4000
- Web: http://localhost:3000
- Admin: http://localhost:3001

## Available Scripts

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps for production
- `npm run lint` - Lint all apps
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

## Default Credentials

After seeding, you can login with:

**Admin**:
- Email: admin@instamart.com
- Password: Admin@123

**Customer**:
- Email: customer@example.com
- Password: Customer@123

## Features

### Customer App
- User registration & authentication
- Product browsing & search
- Shopping cart
- Order placement & tracking
- Profile management
- Address management
- Order history

### Admin Panel
- Dashboard with analytics
- Product management (CRUD)
- Category management
- Order management
- User management
- Inventory tracking

## API Documentation

API endpoints are available at: http://localhost:4000/api/v1

See [API_DOCS.md](./API_DOCS.md) for detailed endpoint documentation.

## License

MIT
