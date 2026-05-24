# ---------------------------------------------------------------------------
# Stage 1 — Install ALL dependencies (dev + prod) for the TypeScript build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
COPY app/server/package*.json app/server/
COPY app/client/package*.json app/client/
RUN npm ci --workspace app/server --include-workspace-root

# ---------------------------------------------------------------------------
# Stage 2 — Compile TypeScript
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/app/server/node_modules ./app/server/node_modules
COPY package*.json ./
COPY app/server app/server
RUN npm exec --workspace app/server -- tsc -p tsconfig.json

# ---------------------------------------------------------------------------
# Stage 3 — Production dependencies only (no devDependencies)
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS prod-deps

WORKDIR /app

COPY package*.json ./
COPY app/server/package*.json app/server/
COPY app/client/package*.json app/client/
RUN npm ci --workspace app/server --include-workspace-root --omit=dev

# ---------------------------------------------------------------------------
# Stage 4 — Minimal runtime image
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# System deps: ca-certificates for HTTPS, curl for HEALTHCHECK
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Production node_modules only (no dev deps → smaller image)
COPY package*.json ./
COPY app/server/package*.json app/server/
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/app/server/node_modules ./app/server/node_modules

# Compiled output
COPY --from=build /app/app/server/dist ./app/server/dist

# AI skills pack — required at runtime by the skills registry
COPY ai-website-generator-repo-skills-pack ./ai-website-generator-repo-skills-pack

# Playwright (must run as root for --with-deps system packages)
RUN npx --yes playwright install --with-deps chromium

# Non-root user for security
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nestjs \
  && mkdir -p /app/app/server/generated \
  && chown -R nestjs:nodejs /app/app/server/generated

USER nestjs

WORKDIR /app/app/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main"]
