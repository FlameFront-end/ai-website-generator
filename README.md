# AI Website Generator

Visual-first MVP for generating a hero-block reference, frontend code, screenshots, and a visual QA report from a user brief.

## Stack

- `app/client`: React, TypeScript, Vite
- `app/server`: NestJS, TypeScript
- Local services: PostgreSQL and Redis via Docker Compose

## Local Start

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev:server
npm run dev:client
```

## Checks

```bash
npm run build
```

