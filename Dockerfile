# DocuRoute Web Application Dockerfile
# Multi-stage build for Next.js production deployment

# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@10.32.1

WORKDIR /app

# Copy workspace configuration and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy all packages and apps
COPY packages/ packages/
COPY apps/ apps/

# Install dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Generate Prisma client before build
RUN pnpm --filter @docuroute/db exec prisma generate

# Build all packages and apps
RUN pnpm build

# ─── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install pnpm globally
RUN npm install -g pnpm@10.32.1

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml

# Copy built Next.js application
COPY --from=builder /app/apps/web/.next /app/apps/web/.next
COPY --from=builder /app/apps/web/public /app/apps/web/public
COPY --from=builder /app/apps/web/package.json /app/apps/web/package.json
COPY --from=builder /app/apps/web/next.config.js /app/apps/web/next.config.js

# Copy built packages (including Prisma client)
COPY --from=builder /app/packages /app/packages

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Expose port
EXPOSE 3000

# Start Next.js production server
CMD ["pnpm", "--filter", "web", "start"]
