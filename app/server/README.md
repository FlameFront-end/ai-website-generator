# AI Website Generator — Server

NestJS backend that orchestrates an AI-driven pipeline for generating complete frontend projects from a text brief.

## Tech Stack

- **Runtime** — Node.js 22, TypeScript 5 (`strict: true`)
- **Framework** — NestJS 11
- **Database** — PostgreSQL 17 + TypeORM 0.3
- **Auth** — JWT (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcryptjs`)
- **AI** — OpenAI-compatible API (LM Studio / OpenAI / OpenRouter / LLM7)
- **Image generation** — Replicate / ChatGPT (DALL-E)
- **Screenshots** — Playwright (Chromium)
- **Visual diff** — pixelmatch + pngjs + sharp
- **Config** — `@nestjs/config` + `dotenv`
- **Rate limiting** — `@nestjs/throttler`
- **Health checks** — `@nestjs/terminus`
- **Validation** — `class-validator` + `class-transformer`
- **Testing** — Jest 30, supertest

## Project Structure

```
src/
├── main.ts                         # Bootstrap, global pipes/filters/interceptors
├── app.module.ts                   # Root module (imports all feature modules)
├── app/
│   ├── app-config.module.ts        # @nestjs/config registration & typed getAppConfig()
│   └── config.ts                   # Env-based appConfig (database, server, ai, throttle)
├── common/
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   ├── types/
│   │   └── request.types.ts
│   └── utils/
│       ├── async.ts                # delay()
│       ├── mime-type.ts            # MIME detection
│       └── slug.ts                 # URL-safe slug helper
├── db/
│   ├── data-source.ts              # TypeORM DataSource & module options
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── run.entity.ts
│   │   ├── run-log.entity.ts
│   │   ├── run-artifact.entity.ts
│   │   ├── run-status.enum.ts
│   │   └── artifact-type.enum.ts
│   └── migrations/
│       ├── 1700000000000-InitialSchema.ts
│       └── 1780000000000-AddUserAvatarUrl.ts
├── modules/
│   ├── ai/                         # AI integration layer
│   │   ├── ai.module.ts
│   │   ├── ai.service.ts           # Orchestrates all LLM calls
│   │   ├── codegen-context.ts      # Compact context builder for codegen prompts
│   │   ├── summary-builders.ts     # ProjectSpecSummary, DesignContextSummary
│   │   ├── image-attachment.ts     # Image encode/attach for multimodal prompts
│   │   ├── types/                  # brief, design, codegen, style types
│   │   ├── prompts/                # 13 prompt templates (clarify-brief, extract-spec, …)
│   │   ├── providers/              # AiProvider interface + OpenAI-compatible provider
│   │   └── skills/                 # Skills registry, selector, prompt-context builder
│   ├── auth/                       # Authentication (register / login / JWT)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   ├── code-generator/             # Code scaffolding & generation
│   │   ├── code-generator.service.ts       # Split codegen orchestrator
│   │   ├── scaffold-template.service.ts    # Deterministic Next.js scaffold
│   │   ├── code-validation.service.ts      # Validate generated file set
│   │   └── code-repair.service.ts          # AI-based module / full repair
│   ├── health/                     # GET /api/health (DB ping)
│   ├── images/                     # POST /api/generate-image (Replicate / DALL-E)
│   ├── pipeline/                   # Website generation pipeline
│   │   ├── pipeline.service.ts             # Top-level orchestrator
│   │   ├── pipeline-state.service.ts       # Run state machine (status, logs, artifacts)
│   │   ├── style-step.service.ts           # Extract spec → design tokens → style variants
│   │   ├── reference-step.service.ts       # Reference image/block generation
│   │   ├── codegen-step.service.ts         # Code generation + build/QA repair loop
│   │   ├── build.service.ts                # npm run build wrapper
│   │   ├── screenshot.service.ts           # Playwright screenshot capture
│   │   ├── visual-qa.service.ts            # Visual diff comparison
│   │   └── style-to-spec.mapper.ts         # Pure mapper: selected style → enriched spec
│   ├── runs/                       # Runs CRUD, workflow, artifacts
│   │   ├── runs.controller.ts
│   │   ├── runs.service.ts                 # Facade
│   │   ├── runs-crud.service.ts            # CRUD operations
│   │   ├── runs-workflow.service.ts        # Approve, edit-request, rebuild, restart
│   │   ├── artifact-reader.service.ts      # Read artifact files/content
│   │   ├── run-log.service.ts              # Centralized run log writing
│   │   └── dto/                            # Request/response DTOs
│   └── storage/                    # File system abstraction
│       ├── storage.service.ts
│       └── filesystem.service.ts
└── types/
    └── ...                         # Shared server type declarations
```

## Modules

### AuthModule

JWT-based authentication. Endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user profile |

Auth endpoints use a stricter rate limit (`auth` throttle group).

### RunsModule

Manages generation runs (CRUD, workflow actions, artifacts).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/runs/brief/clarify` | AI brief clarification wizard |
| POST | `/api/runs` | Create a new run (starts pipeline) |
| GET | `/api/runs` | List user runs |
| GET | `/api/runs/:id` | Get run details |
| PATCH | `/api/runs/:id` | Update run |
| PATCH | `/api/runs/:id/pinned` | Pin/unpin run |
| DELETE | `/api/runs/:id` | Delete run |
| GET | `/api/runs/:id/artifacts/:artifactId/content` | Artifact JSON content |
| GET | `/api/runs/:id/artifacts/:artifactId/file` | Artifact binary file |
| GET | `/api/runs/:id/code-files` | List generated code files |
| GET | `/api/runs/:id/code-file?path=…` | Read a single code file |
| GET | `/api/runs/:id/download-code` | Download project as ZIP |
| POST | `/api/runs/:id/rebuild` | Re-run build step |
| POST | `/api/runs/:id/restart-current-step` | Restart current pipeline step |
| POST | `/api/runs/:id/stop-current-step` | Stop current pipeline step |
| POST | `/api/runs/:id/restart-code-step` | Restart code generation step |
| POST | `/api/runs/:id/approve` | Approve a pipeline step |
| POST | `/api/runs/:id/edit-request` | Request AI edit on a step |
| POST | `/api/runs/:id/select-style` | Select a style variant |

All endpoints require JWT (except brief clarification which also requires JWT).

### PipelineModule

Executes the generation pipeline per run:

1. **Style step** — extract project spec → generate design tokens → generate style variants with preview images
2. **Reference step** — generate reference SVG/image → create reference blocks
3. **Codegen step** — split code generation (plan → content → layout → sections) with validation, module-aware repair, build, screenshot, and visual QA loops

The pipeline supports graceful shutdown, stopping active runs when the server terminates.

### AiModule

Abstraction over LLM providers. Three provider channels configured independently:

- **analysis** — brief clarification, spec extraction, design tokens, design description, style variants
- **code** — code plan, content/layout/section generation, code repair
- **image** — reference image and style variant image generation

Provider types: `lmstudio`, `openai`, `openrouter`, `llm7`, `replicate`, `chatgpt`.

Includes a **skills registry** that loads prompt skills from `ai-website-generator-repo-skills-pack/` at runtime.

### CodeGeneratorModule

Split codegen orchestration:

1. **Code plan** — AI generates section plan
2. **Content module** — AI generates content/config files
3. **Layout module** — AI generates app layout and page structure
4. **Section modules** — AI generates each section independently
5. **Validation** — structural validation of the merged file set
6. **Repair** — module-aware repair → full repair → deterministic scaffold fallback

### ImagesModule

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate-image` | Generate an image from a text prompt |

### HealthModule

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (DB ping) |

Excluded from rate limiting.

### StorageModule

File system abstraction for reading/writing run artifacts to `generated/<runId>/`.

## Database

PostgreSQL 17 with TypeORM. Entities:

- **User** — `id`, `email`, `passwordHash`, `name`, `avatarUrl`
- **Run** — `id`, `userId`, `brief`, `status`, `currentStep`, `isPinned`, `metadata`
- **RunLog** — `id`, `runId`, `level`, `message`, `data`
- **RunArtifact** — `id`, `runId`, `type` (ArtifactType enum), `filePath`, `metadata`

Run statuses: `queued`, `running`, `awaiting_style_selection`, `awaiting_reference_approval`, `awaiting_code_approval`, `awaiting_final_approval`, `reference_failed`, `build_failed`, `visual_failed`, `needs_manual_review`, `completed`, `failed`.

### Migrations

```bash
# Generate a new migration after entity changes
npm run migration:generate -- src/db/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

## Environment Variables

Copy `.env.example` from the repo root and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `local` | `local` or `docker` |
| `API_PORT` | `3000` | Server listen port |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_NAME` | `ai_website_generator` | Database name |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_SYNCHRONIZE` | `true` | Auto-sync schema (disable in production) |
| `DB_LOGGING` | `false` | TypeORM SQL logging |
| `JWT_SECRET` | — | **Must change in production** |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `AI_ANALYSIS_PROVIDER` | `lmstudio` | Provider for analysis channel |
| `AI_ANALYSIS_BASE_URL` | `http://localhost:1234/v1` | Analysis API base URL |
| `AI_ANALYSIS_API_KEY` | — | API key (if required) |
| `AI_ANALYSIS_MODEL` | — | Model name |
| `AI_ANALYSIS_TIMEOUT` | `120000` | Request timeout (ms) |
| `AI_CODE_PROVIDER` | `lmstudio` | Provider for code channel |
| `AI_CODE_BASE_URL` | `http://localhost:1234/v1` | Code API base URL |
| `AI_CODE_API_KEY` | — | API key |
| `AI_CODE_MODEL` | — | Model name |
| `AI_CODE_TIMEOUT` | `120000` | Request timeout (ms) |
| `AI_IMAGE_PROVIDER` | `replicate` | Provider for images |
| `AI_IMAGE_BASE_URL` | — | Image API base URL |
| `AI_IMAGE_API_KEY` | — | Replicate / OpenAI API key |
| `AI_IMAGE_MODEL` | `black-forest-labs/flux-2-pro` | Image model |
| `THROTTLE_TTL` | `60` | Default rate limit window (seconds) |
| `THROTTLE_LIMIT` | `60` | Default max requests per window |
| `THROTTLE_AUTH_TTL` | `60` | Auth rate limit window |
| `THROTTLE_AUTH_LIMIT` | `10` | Auth max requests per window |

## Getting Started

### Prerequisites

- Node.js ≥ 22
- PostgreSQL 17 (or use Docker Compose)
- (Optional) LM Studio running locally on port 1234

### Local Development

```bash
# 1. Install dependencies (from repo root)
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, AI keys

# 3. Start PostgreSQL (if not using Docker)
#    Create database: ai_website_generator

# 4. Run migrations (optional, DB_SYNCHRONIZE=true auto-syncs)
npm run migration:run --workspace app/server

# 5. Start in watch mode
npm run start:dev --workspace app/server
```

The server starts on `http://localhost:3000` with the global prefix `/api`.

### Docker Compose

From the repo root:

```bash
cp .env.example .env
# Edit .env

docker compose up -d
```

This starts PostgreSQL, Redis, the server, and the client. The server is available at `http://localhost:${API_PUBLIC_PORT}`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start` | Start (compiled) |
| `npm run start:dev` | Start in watch mode |
| `npm run start:debug` | Start with debugger + watch |
| `npm run start:prod` | Start from `dist/main` |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Prettier |
| `npm run test` | Run all tests (unit + e2e) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:cov` | Tests with coverage |
| `npm run test:e2e` | E2E tests only |
| `npm run migration:generate` | Generate TypeORM migration |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:show` | Show migration status |

## Testing

```bash
# Unit tests
npm run test --workspace app/server

# E2E tests (requires running PostgreSQL)
npm run test:e2e --workspace app/server

# Coverage
npm run test:cov --workspace app/server
```

Unit tests cover: `CodeValidationService`, `StyleToSpecMapper`, `AiService.parseJson`, `AuthService`.
E2E tests cover: `AuthController`, `RunsController`.

## Global Middleware

- **ValidationPipe** — whitelist + forbidNonWhitelisted + transform
- **ClassSerializerInterceptor** — automatic response serialization via DTOs
- **AllExceptionsFilter** — unified error response format
- **ThrottlerGuard** — global rate limiting (default + auth groups)
- **Shutdown hooks** — graceful drain of active pipeline runs
