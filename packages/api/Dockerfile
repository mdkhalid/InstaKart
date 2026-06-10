FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/types/package*.json ./packages/types/

RUN npm ci --workspaces --include-workspace-root

COPY . .

RUN npm run db:generate
RUN npx turbo run build --filter=@instamart/api... 

FROM node:20-bullseye-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/

WORKDIR /app/packages/api

EXPOSE 4000

CMD ["node", "dist/index.js"]