# Project Instructions

## Project Overview

- **Name**: Shipyard
- **Description**: Self-hosted deployment dashboard that aggregates CI/CD events, tracks deployment history, monitors service health, and provides real-time visibility across environments
- **Status**: Active development (Phase 1 — Foundation)

## Tech Stack

- **Language**: TypeScript 5.9
- **Frontend**: Angular 21 (standalone components, signals, new control flow)
- **UI Library**: Angular Material 21 + Tailwind CSS 4
- **Backend**: NestJS 11 (modules, DI, guards, interceptors, WebSocket gateway)
- **Database**: PostgreSQL 17 via Prisma ORM 7
- **Cache/Queue**: Redis 7 + BullMQ 5 via @nestjs/bullmq
- **Real-time**: Socket.IO 4 via @nestjs/platform-socket.io
- **Auth**: Passport.js with JWT strategy (passport-jwt)
- **Testing**: Jest 30 (backend unit/e2e), Vitest 4 (frontend via @angular/build:unit-test)
- **Package Manager**: pnpm 10.33
- **Monorepo**: Turborepo 2.9 with pnpm workspaces
- **CI/CD**: GitHub Actions (not yet configured)
- **Containerization**: Docker + Docker Compose
- **Node.js**: v22 LTS

## Architecture

This is a **pnpm monorepo** with three packages managed by Turborepo:

```
shipyard/
├── apps/
│   ├── api/                          # NestJS 11 backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema (all models)
│   │   │   └── migrations/           # Auto-generated migration files
│   │   ├── prisma.config.ts          # Prisma 7 config (datasource URL)
│   │   ├── src/
│   │   │   ├── main.ts               # App entry point
│   │   │   ├── app.module.ts         # Root module (wires everything)
│   │   │   ├── common/               # Shared decorators, guards, filters, pipes
│   │   │   │   ├── decorators/       # @CurrentUser, @Roles
│   │   │   │   ├── filters/          # Global exception filters
│   │   │   │   ├── guards/           # RolesGuard
│   │   │   │   └── interceptors/     # Logging, transform
│   │   │   ├── prisma/               # PrismaService + PrismaModule (@Global)
│   │   │   ├── auth/                 # Auth module (register, login, JWT, strategies)
│   │   │   ├── users/                # User CRUD
│   │   │   ├── teams/                # Team management
│   │   │   ├── services/             # Service registry (core domain entity)
│   │   │   ├── environments/         # Environment management
│   │   │   ├── deployments/          # Deployment tracking + rollbacks
│   │   │   ├── pipelines/            # CI/CD pipeline run tracking
│   │   │   ├── health-checks/        # Health check scheduler + processor (BullMQ)
│   │   │   ├── integrations/         # External system adapters
│   │   │   │   ├── github/           # GitHub webhook handler + API client
│   │   │   │   └── docker/           # Docker Engine API client
│   │   │   ├── notifications/        # In-app + Slack/Discord notifications
│   │   │   ├── websocket/            # Socket.IO EventsGateway
│   │   │   └── analytics/            # Deployment analytics queries
│   │   │   └── generated/prisma/     # Prisma 7 generated client (gitignored)
│   │   ├── test/                     # E2E tests
│   │   └── .env                      # Environment variables (gitignored)
│   │
│   └── web/                          # Angular 19 frontend
│       └── src/
│           └── app/
│               ├── app.component.ts
│               ├── app.config.ts     # Providers (HttpClient, etc.)
│               ├── app.routes.ts     # Top-level lazy-loaded routes
│               ├── core/             # Singleton services (auth, API, WebSocket, theme)
│               ├── features/         # Feature modules (lazy-loaded)
│               │   ├── dashboard/    # Home dashboard with service cards
│               │   ├── services/     # Service detail + deployment timeline
│               │   ├── deployments/  # Deployment feed + filters
│               │   ├── pipelines/    # Pipeline monitor
│               │   ├── environments/ # Environment grid overview
│               │   ├── settings/     # Team settings, integrations, channels
│               │   └── auth/         # Login + register pages
│               ├── shared/           # Reusable components, pipes, layouts
│               └── models/           # Frontend-specific interfaces
│
├── packages/
│   └── shared/                       # @shipyard/shared — TypeScript types
│       └── src/
│           └── index.ts              # Enums, API types, WebSocket event types
│
├── docker/                           # Production Dockerfiles + nginx config (Phase 6)
├── .github/workflows/                # CI/CD pipeline definitions (not yet created)
├── docker-compose.dev.yml            # Local dev databases (Postgres + Redis)
├── docker-compose.yml                # Production compose (Phase 6)
├── turbo.json                        # Turborepo task config
├── pnpm-workspace.yaml               # Workspace package definitions
└── package.json                      # Root scripts + devDependencies
```

### Key architectural patterns

- **Three-tier + event-driven integration layer**: External systems → Adapters → Backend → Frontend
- **Adapter pattern for integrations**: Each external system (GitHub, Docker) implements a standard interface. Adding GitLab = new adapter class, zero core changes.
- **WebSocket rooms for multi-tenancy**: Users join `team:{teamId}` rooms on connect. Events broadcast only to the relevant team.
- **Background jobs via BullMQ**: Health checks run on a schedule, not inside request handlers. Redis manages the job queue.
- **Shared types package**: `@shipyard/shared` defines all enums, API request/response types, and WebSocket event types. Both apps import from it — one source of truth.
- **Prisma 7 with adapter-pg**: Generated client outputs to `src/generated/prisma/` with `moduleFormat = "cjs"` for NestJS compatibility.

### Data model core axis

**Team → Service → Environment → Deployment** is the primary relationship chain. Everything else orbits this.

- A **Team** owns Services, Users, and Notifications
- A **Service** represents one deployable thing (maps to a Git repo + Docker image)
- An **Environment** is a running instance of a Service (dev/staging/prod) with a `currentDeploymentId`
- A **Deployment** records what was deployed, where, when, by whom, and whether it succeeded

## Common Commands

```bash
# Development
pnpm dev                   # Start both frontend + backend (via Turborepo)
pnpm build                 # Build all packages (shared → api + web)
pnpm lint                  # Lint all packages

# Database (from root — delegates to apps/api)
pnpm db:migrate            # Run Prisma migrations (npx prisma migrate dev)
pnpm db:generate           # Regenerate Prisma client
pnpm db:seed               # Seed database with dev data
pnpm db:studio             # Open Prisma Studio GUI

# Docker (local dev databases)
docker compose -f docker-compose.dev.yml up -d     # Start Postgres + Redis
docker compose -f docker-compose.dev.yml down       # Stop databases

# Testing
pnpm test                  # Run all tests via Turborepo
pnpm --filter api test     # Backend tests only (Jest)
pnpm --filter web test     # Frontend tests only (Vitest)

# Individual app dev (when you need just one)
pnpm --filter api start:dev    # NestJS in watch mode (port 3000)
pnpm --filter web start        # Angular dev server (port 4200)

# Prisma (from apps/api/)
npx prisma migrate dev --name <name>   # Create + apply migration
npx prisma generate                     # Regenerate client after schema change
npx prisma studio                       # Open database GUI
```

## Code Conventions

### General

- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces/types/components, UPPER_SNAKE for constants and enums
- **Files**: kebab-case for file names (e.g., `deployment-timeline.component.ts`, `health-checks.service.ts`)
- **Imports**: Use `@shipyard/shared` for shared types. Use relative imports within each app.
- **Error handling**: Use NestJS built-in exceptions (`NotFoundException`, `UnauthorizedException`, `ConflictException`). Never swallow errors silently.
- **Types**: Prefer interfaces for object shapes, enums for fixed sets, types for unions/intersections
- **No `any`**: Use proper types. If truly unknown, use `unknown` and narrow.

### Backend (NestJS)

- Every feature gets its own NestJS module (e.g., `DeploymentsModule` with controller + service)
- Use `@CurrentUser()` custom decorator instead of `req.user`
- Use `@Roles('OWNER', 'ADMIN')` decorator + `RolesGuard` for authorization
- Use `@UseGuards(AuthGuard('jwt'), RolesGuard)` at controller level, not per-route (unless some routes are public)
- `PrismaModule` is `@Global()` — don't re-import it in feature modules
- All database access goes through `PrismaService`, never raw SQL
- Team isolation: every query must filter by `teamId` from the authenticated user
- When a deployment or health check event occurs, always call `eventsGateway.emitToTeam()` to broadcast

### Frontend (Angular)

- **Standalone components only** — no NgModules for features
- **Signals** for local state management
- **Lazy-loaded routes** for each feature (`loadChildren` in `app.routes.ts`)
- Angular Material for UI components, Tailwind for layout/spacing
- `core/` services are singleton (provided in root)
- `shared/` components are reusable across features
- `features/` are self-contained page modules

### Prisma 7 specifics

- Generator is `prisma-client` (not `prisma-client-js`)
- Output path: `../src/generated/prisma`
- Module format: `moduleFormat = "cjs"` (required for NestJS CommonJS)
- Config lives in `apps/api/prisma.config.ts` (not in schema.prisma)
- Import PrismaClient from `../generated/prisma/client` (or relative path from the service file)
- Always use `@@map("table_name")` for snake_case table names and `@map("column_name")` for snake_case columns

### BullMQ specifics (not Bull)

- Import from `@nestjs/bullmq`, not `@nestjs/bull`
- Processors extend `WorkerHost` and implement `process()` method
- Use `BullModule.forRootAsync()` for Redis config, `BullModule.registerQueue()` per queue
- Explicit Redis `connection` object is mandatory (no implicit defaults)

## Git Conventions

- **Branch naming**: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/` prefixes (e.g., `feat/auth-module`, `fix/health-check-timeout`)
- **Commits**: Conventional commits format (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `build:`)
- **PRs**: One logical change per PR, require passing CI before merge
- **Default branch**: `main`

## Important Patterns

- **Team isolation is non-negotiable**: Every database query MUST include `where: { teamId }` derived from the authenticated user. Never expose cross-team data.
- **WebSocket auth flow**: Client sends JWT in `handshake.auth.token` → server verifies → joins `team:{teamId}` room → broadcasts scoped to room.
- **Deployment lifecycle**: `create()` sets status `IN_PROGRESS` and emits `deployment:started` → `complete()` sets `SUCCESS` or `FAILED`, updates environment's `currentDeploymentId` (on success), and emits `deployment:completed` or `deployment:failed`.
- **Health check scheduling**: `HealthChecksService.onModuleInit()` reads all environments with health check URLs from DB and schedules repeating BullMQ jobs. When environment config changes, call `rescheduleForEnvironment()`.
- **GitHub webhook verification**: Always verify `x-hub-signature-256` header using HMAC-SHA256 before processing any webhook payload. Unverified payloads are rejected.
- **Notification fan-out**: `NotificationsService.notify()` creates an in-app notification AND iterates over enabled `NotificationChannel` records to send to Slack/Discord/webhook.
- **Rollback = new deployment**: Rollbacks create a new Deployment record pointing to the old commit/image, not reverting the old record.

## Known Issues / Gotchas

- **Prisma 7 does NOT auto-load `.env` files** — `prisma.config.ts` handles datasource URL via `import 'dotenv/config'`. If you get `DATABASE_URL missing`, check that dotenv is imported in `prisma.config.ts`.
- **Prisma 7 generated client is gitignored** — After cloning, you must run `npx prisma generate` before the backend will compile. CI must also run this step.
- **BullMQ ≠ Bull** — The guide's original code uses `@nestjs/bull` and `Bull`. We use `@nestjs/bullmq` and `BullMQ`. The processor pattern is different: extend `WorkerHost` instead of using `@Process()` decorator. Refer to NestJS BullMQ docs, NOT the Bull docs.
- **Angular dev server runs on port 4200**, NestJS on **port 3000**. CORS is configured in the backend via `CORS_ORIGIN` env var.
- **Docker Compose dev file only runs databases** — the Angular and NestJS apps run natively on your machine for hot reload. Don't try to put them in Docker during development.
- **`@shipyard/shared` must build first** — Turborepo handles this via `dependsOn: ["^build"]`, but if you run apps individually, build shared first: `pnpm --filter @shipyard/shared build`.
- **Socket.IO namespace is `/events`** — the WebSocket gateway uses a namespace to keep WS traffic separate from REST. Frontend must connect to `http://localhost:3000/events`, not just port 3000.

## Environment Variables

Required in `apps/api/.env`:

```
DATABASE_URL              # PostgreSQL connection string (e.g., postgresql://shipyard:shipyard_dev@localhost:5432/shipyard)
REDIS_HOST                # Redis host (localhost for dev)
REDIS_PORT                # Redis port (6379)
JWT_SECRET                # Secret key for signing JWTs (use a long random string in production)
JWT_EXPIRATION            # Token expiry (e.g., 7d)
PORT                      # Backend port (3000)
NODE_ENV                  # development | production | test
CORS_ORIGIN               # Frontend URL for CORS (http://localhost:4200 in dev)
GITHUB_APP_ID             # GitHub App ID (Phase 4)
GITHUB_CLIENT_ID          # GitHub OAuth client ID (Phase 4)
GITHUB_CLIENT_SECRET      # GitHub OAuth client secret (Phase 4)
GITHUB_WEBHOOK_SECRET     # Secret for verifying GitHub webhook signatures (Phase 4)
```

## Dependencies Notes

- **Prisma 7 requires `@prisma/adapter-pg` + `pg`** — unlike Prisma 5/6, v7 uses database-specific adapters. The PostgreSQL adapter wraps the `pg` (node-postgres) driver.
- **BullMQ requires explicit Redis connection** — unlike old Bull, BullMQ v5 will throw at startup if no connection config is provided. Always pass `connection: { host, port }` in `BullModule.forRootAsync()`.
- **`class-validator` + `class-transformer`** — required for NestJS DTO validation. Used with `ValidationPipe` in `main.ts`.
- **`helmet`** — sets security HTTP headers. One line in `main.ts`: `app.use(helmet())`.
- **`bcrypt`** — for password hashing. Salt rounds = 12.
- **`@octokit/rest` + `@octokit/webhooks`** — GitHub API client and webhook utilities. Used in Phase 4 (GitHub integration).
- **`dockerode`** — Docker Engine API client for container monitoring. Used in Phase 5+.
- **`ngx-echarts` + `echarts`** — charting library for deployment analytics. Used in Phase 6.
- **`socket.io-client`** — frontend WebSocket client. Must match the Socket.IO major version on the backend.
- **`date-fns`** — lightweight date manipulation. Used for "15 minutes ago" formatting.

## Build Phases

The project is built incrementally. Each phase produces a working, demo-able product:

1. **Foundation** (current) — Monorepo setup, Prisma schema, auth module (register/login/JWT), basic Angular shell
2. **Core Data** — Service CRUD, Environment CRUD, manual deployment recording
3. **Real-Time** — WebSocket gateway, live dashboard with service cards, deployment feed
4. **GitHub Integration** — GitHub App, webhook handler, automatic pipeline tracking
5. **Health & Monitoring** — Health check system with BullMQ, notifications (in-app + Slack/Discord)
6. **Polish & Ship** — Analytics charts, rollback UI, dark theme, responsive design, Docker production setup, README → **v1.0 release**

## Claude Code Guidance

When exploring the codebase, skip these directories — they are large, auto-generated, or irrelevant to source code tasks:

- `**/node_modules/` — package dependencies
- `**/dist/` — compiled output
- `**/coverage/` — test coverage reports
- `**/.angular/` — Angular build cache
- `**/src/generated/` — Prisma generated client (auto-generated, do not edit)
- `**/prisma/migrations/` — auto-generated SQL (read only if explicitly asked)
- `pnpm-lock.yaml` — do not read or modify directly
