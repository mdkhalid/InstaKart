FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/api/package*.json ./packages/api/
COPY packages/types/package*.json ./packages/types/

RUN npm ci --workspaces --include-workspace-root

COPY . .

RUN npm run build --filter=@instamart/web

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]