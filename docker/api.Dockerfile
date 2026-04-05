# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# DATABASE_URL is required by prisma.config.ts at load time even though
# prisma generate does not connect to the database
ARG DATABASE_URL=postgresql://localhost/dummy
ENV DATABASE_URL=$DATABASE_URL

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy workspace manifests + lockfile first (layer-cache friendly)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all deps (dev included — needed for build tools)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# 1. Build @shipyard/shared (api depends on it)
RUN pnpm --filter @shipyard/shared build

# 2. Generate Prisma client into apps/api/src/generated/prisma
#    (gitignored — must be regenerated here, not copied from source)
RUN pnpm --filter api exec npx prisma generate

# 3. Compile NestJS → apps/api/dist/
RUN pnpm --filter api build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# pnpm deploy creates a self-contained production bundle for one package
# (resolves workspace:* deps, installs only prod dependencies)
COPY --from=builder /app ./
RUN pnpm deploy --filter api --prod /app/deploy

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy the self-contained production bundle
COPY --from=production /app/deploy ./

# Copy compiled output and generated Prisma client from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/src/generated ./src/generated
COPY --from=builder /app/apps/api/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# prisma migrate deploy applies pending migrations on container startup
# then starts the NestJS server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
