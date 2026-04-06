# Shipyard

A self-hosted deployment dashboard that aggregates CI/CD events, tracks deployment history, monitors service health, and provides real-time visibility across environments.

> **Status**: Phase 1 — Foundation (active development)

---

## What it does

Shipyard gives teams a single place to see what is deployed, where, and whether it's healthy. Instead of checking GitHub Actions, then your cloud provider, then Slack — you open Shipyard.

- **Deployment timeline** — every deploy recorded with commit, branch, who triggered it, and outcome
- **Environment grid** — dev / staging / prod at a glance with live health status
- **Pipeline monitor** — CI run tracking linked to the deployments they produce
- **Real-time updates** — WebSocket-based live feed, no page refreshes needed
- **Health checks** — background polling of service URLs, automated status transitions
- **Notifications** — in-app, Slack, Discord, or generic webhook fanout
- **Multi-team** — strict team isolation; no team can see another team's data

---

## Tech stack

### Why these choices

| Layer             | Choice                      | Reason                                                                                                                                                                                  |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Language**      | TypeScript 5.9 (strict)     | End-to-end type safety across frontend, backend, and shared types. Shared enums and API interfaces live in one package and are imported by both apps — no drift.                        |
| **Frontend**      | Angular 21                  | Signals-based reactivity, first-class SSR, and a mature component model that scales well for dashboard UIs. Angular Material gives consistent, accessible UI components out of the box. |
| **Backend**       | NestJS 11                   | Opinionated module/DI system that enforces separation of concerns. Guards, interceptors, and decorators keep cross-cutting concerns (auth, logging, roles) out of business logic.       |
| **Database**      | PostgreSQL 17 + Prisma 7    | Postgres for reliability and JSON support (pipeline stage metadata). Prisma 7's adapter-based approach gives type-safe queries without an ORM's hidden complexity.                      |
| **Cache / Queue** | Redis 7 + BullMQ 5          | Health checks run on a schedule, not inside HTTP handlers. BullMQ persists jobs in Redis — if the server restarts, scheduled checks resume automatically.                               |
| **Real-time**     | Socket.IO 4                 | WebSocket rooms map cleanly to teams (`team:{teamId}`). Events are scoped per room so no tenant can receive another tenant's broadcasts.                                                |
| **Auth**          | Passport.js + JWT           | Stateless JWTs remove the need for a session store. Passport's strategy pattern makes it straightforward to add OAuth later (GitHub SSO in Phase 4).                                    |
| **Monorepo**      | Turborepo + pnpm workspaces | Shared types package must build before either app. Turborepo's task graph (`dependsOn: ["^build"]`) handles the ordering automatically and caches unchanged outputs.                    |

---

## Project structure

```
shipyard/
├── apps/
│   ├── api/                    # NestJS backend (port 3000)
│   │   ├── prisma/
│   │   │   └── schema.prisma   # All database models
│   │   └── src/
│   │       ├── auth/           # Register, login, JWT strategy
│   │       ├── common/         # Guards, decorators, filters, interceptors
│   │       ├── prisma/         # Global PrismaService
│   │       ├── services/       # Service registry
│   │       ├── environments/   # Environment management
│   │       ├── deployments/    # Deployment tracking + rollbacks
│   │       ├── pipelines/      # CI/CD run tracking
│   │       ├── health-checks/  # BullMQ scheduler + processor
│   │       ├── integrations/   # GitHub webhook + Docker API adapters
│   │       ├── notifications/  # In-app + Slack/Discord fanout
│   │       ├── websocket/      # Socket.IO EventsGateway
│   │       └── analytics/      # Deployment analytics queries
│   │
│   └── web/                    # Angular frontend (port 4200)
│       └── src/app/
│           ├── core/           # Singleton services (auth, API, WebSocket, theme)
│           ├── features/       # Lazy-loaded page modules
│           │   ├── dashboard/
│           │   ├── services/
│           │   ├── deployments/
│           │   ├── pipelines/
│           │   ├── environments/
│           │   ├── settings/
│           │   └── auth/
│           └── shared/         # Reusable components and pipes
│
└── packages/
    └── shared/                 # @shipyard/shared — enums, API types, WS event types
```

### Data model

The primary relationship chain is **Team → Service → Environment → Deployment**. Everything else orbits it.

```
Team
 └── Service (a deployable thing — Git repo + Docker image)
      └── Environment (a running instance: dev / staging / prod)
           └── Deployment (what was deployed, when, by whom, outcome)
                └── PipelineRun (the CI run that produced this deployment)
```

---

## Prerequisites

- Node.js 22 LTS
- pnpm 10.33 — `npm install -g pnpm`
- Docker + Docker Compose (for local databases)

---

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the databases

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts PostgreSQL 17 on port 5432 and Redis 7 on port 6379.

### 3. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
DATABASE_URL=postgresql://shipyard:shipyard_dev@localhost:5432/shipyard
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change-me-use-a-long-random-string
JWT_EXPIRATION=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

### 4. Generate the Prisma client

```bash
pnpm db:generate
```

This step is required after every fresh clone. The generated client is gitignored.

### 5. Run database migrations

```bash
pnpm db:migrate
```

### 6. Start the dev servers

```bash
pnpm dev
```

Turborepo starts both apps in parallel. The Angular dev server runs at http://localhost:4200, the NestJS API at http://localhost:3000.

---

## Common commands

```bash
# Development
pnpm dev                   # Start frontend + backend together
pnpm --filter api start:dev    # NestJS only (watch mode)
pnpm --filter web start        # Angular only

# Building
pnpm build                 # Build all packages (shared → api + web)

# Database
pnpm db:migrate            # Create and apply migrations
pnpm db:generate           # Regenerate Prisma client after schema changes
pnpm db:seed               # Seed with dev data
pnpm db:studio             # Open Prisma Studio at http://localhost:5555

# Testing
pnpm test                  # All tests (Jest for api, Vitest for web)
pnpm --filter api test     # Backend tests only
pnpm --filter web test     # Frontend tests only

# Linting
pnpm lint

# Databases (Docker)
docker compose -f docker-compose.dev.yml up -d     # Start
docker compose -f docker-compose.dev.yml down       # Stop
docker compose -f docker-compose.dev.yml down -v    # Stop + wipe volumes
```

---

## API overview

Base URL: `http://localhost:3000`

| Method | Path                           | Description             |
| ------ | ------------------------------ | ----------------------- |
| `POST` | `/auth/register`               | Create account + team   |
| `POST` | `/auth/login`                  | Login, returns JWT      |
| `GET`  | `/auth/me`                     | Current user profile    |
| `GET`  | `/services`                    | List team's services    |
| `POST` | `/services`                    | Create service          |
| `GET`  | `/environments`                | List environments       |
| `GET`  | `/deployments`                 | Deployment feed         |
| `POST` | `/deployments`                 | Record a deployment     |
| `GET`  | `/pipelines`                   | Pipeline run history    |
| `POST` | `/integrations/github/webhook` | GitHub webhook receiver |

All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

### WebSocket

Connect to `http://localhost:3000/events` with `socket.io-client`. Send the JWT in the handshake:

```typescript
const socket = io('http://localhost:3000/events', {
  auth: { token: '<jwt>' },
});
```

The server joins you to your team's room and broadcasts these events:

| Event                  | Payload              |
| ---------------------- | -------------------- |
| `deployment:started`   | `DeploymentSummary`  |
| `deployment:completed` | `DeploymentSummary`  |
| `deployment:failed`    | `DeploymentSummary`  |
| `health:updated`       | `EnvironmentSummary` |
| `pipeline:updated`     | `PipelineRunSummary` |
| `notification:new`     | `Notification`       |

---

## Build phases

| Phase                   | Status          | Description                                                        |
| ----------------------- | --------------- | ------------------------------------------------------------------ |
| 1 — Foundation          | **In progress** | Monorepo, Prisma schema, auth module, Angular shell                |
| 2 — Core Data           | Planned         | Service + Environment CRUD, manual deployment recording            |
| 3 — Real-Time           | Planned         | WebSocket gateway, live dashboard, deployment feed                 |
| 4 — GitHub Integration  | Planned         | GitHub App, webhook handler, automatic pipeline tracking           |
| 5 — Health & Monitoring | Planned         | Health check scheduler (BullMQ), Slack/Discord notifications       |
| 6 — Polish & Ship       | Planned         | Analytics charts, rollback UI, dark theme, Docker production setup |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
