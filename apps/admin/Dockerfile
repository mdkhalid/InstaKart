FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY packages/api/package*.json ./packages/api/
COPY packages/types/package*.json ./packages/types/

RUN npm ci --workspaces --include-workspace-root

COPY . .

RUN npx turbo run build --filter=@instamart/admin

FROM node:20-bullseye-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

EXPOSE 3001

CMD ["node", "apps/admin/server.js"]