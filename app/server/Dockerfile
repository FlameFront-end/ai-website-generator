FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
COPY app/server/package*.json app/server/
COPY app/client/package*.json app/client/
RUN npm ci --workspace app/server --include-workspace-root

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/app/server/node_modules ./app/server/node_modules
COPY package*.json ./
COPY app/server app/server
RUN npm exec --workspace app/server -- tsc -p tsconfig.json

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY app/server/package*.json app/server/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/app/server/node_modules ./app/server/node_modules
COPY --from=build /app/app/server/dist ./app/server/dist

RUN npx playwright install --with-deps chromium

WORKDIR /app/app/server

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
