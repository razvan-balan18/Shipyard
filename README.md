# Shipyard

A self-hosted deployment dashboard that aggregates CI/CD events, tracks deployment history, monitors service health, and provides real-time visibility across all your environments — in one place.

> **Status**: Active development — backend complete, frontend in progress.

---

## Why Shipyard?

Most teams scatter their deployment state across GitHub Actions, a cloud provider console, Docker registries, and Slack. Shipyard pulls it together: you can see what's running in production, what just deployed, whether your services are healthy, and who triggered what — without switching between five tabs.

Everything is scoped to a **team**. Multiple teams can share one Shipyard instance and only ever see their own data.

---

## What it does

- **Deployment timeline** — every deploy recorded with commit SHA, branch, who triggered it, duration, and outcome
- **Environment grid** — dev / staging / prod at a glance with live health status
- **Pipeline monitor** — CI run tracking (GitHub Actions) linked to the deployments they produce
- **Real-time updates** — WebSocket-based live feed, no page refreshes needed
- **Health checks** — background polling of service health URLs, automated status transitions
- **Notifications** — in-app bell + Slack, Discord, or generic webhook fanout
- **Multi-team** — strict isolation; no team can see another team's data
- **Rollbacks** — one-click rollback to any previous deployment

---

## Tech stack

| Layer     | Choice                           | Why                                                                                                                                             |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Language  | TypeScript 5.9 (strict)          | End-to-end type safety. Shared enums and API types live in one package imported by both apps — no drift.                                        |
| Frontend  | Angular 21 (signals, standalone) | First-class reactivity, mature component model, scales well for dashboard UIs. Angular Material gives accessible UI components out of the box.  |
| Backend   | NestJS 11                        | Opinionated DI system enforces separation of concerns. Guards, interceptors, and decorators keep auth/roles/logging out of business logic.      |
| Database  | PostgreSQL 17 + Prisma 7         | Rock-solid relational store with JSON support for pipeline metadata. Prisma 7's adapter model gives type-safe queries without hidden ORM magic. |
| Queue     | Redis 7 + BullMQ 5               | Health checks run on a schedule, not inside HTTP handlers. BullMQ persists jobs in Redis — if the server restarts, scheduled checks resume.     |
| Real-time | Socket.IO 4                      | WebSocket rooms map directly to teams (`team:{teamId}`). Events are scoped per room; no tenant leaks.                                           |
| Auth      | Passport.js + JWT                | Stateless JWTs — no session store needed. Passport's strategy pattern makes OAuth (GitHub SSO) easy to add later.                               |
| Monorepo  | Turborepo + pnpm workspaces      | Shared types build before either app. Turborepo's task graph handles ordering and caches unchanged outputs.                                     |

---

## Core concepts

### Data model

**Team → Service → Environment → Deployment** is the primary chain. Everything else orbits it.

```
Team
 └── Service         (one deployable thing: a Git repo + Docker image)
      └── Environment  (a running instance: dev / staging / prod)
           └── Deployment (what was deployed, when, by whom, outcome)
                └── PipelineRun (the CI run that produced this deployment)
```

- A **Team** owns everything. All queries are filtered by `teamId`.
- A **Service** represents one repository/image (e.g. `api`, `web`, `worker`).
- An **Environment** is a running instance of a service in a specific stage. It tracks `currentDeploymentId` — what's live right now.
- A **Deployment** is an immutable record. Rollbacks don't mutate existing records; they create a new deployment pointing at the old commit/image.

### Deployment lifecycle

```
POST /deployments → status: IN_PROGRESS → WebSocket: deployment:started
                          ↓
         PATCH /:id/complete (SUCCESS) → updates environment.currentDeploymentId
                                       → WebSocket: deployment:completed
                          ↓
         PATCH /:id/complete (FAILED)  → WebSocket: deployment:failed
```

### Team isolation

Every database query is filtered by `teamId` extracted from the authenticated user's JWT. This is enforced at the service layer — not just the controller — so there is no route to cross-team data leakage.

---

## Prerequisites

- **Node.js** v22 LTS (or v25+)
- **pnpm** v10+ — `npm install -g pnpm`
- **Docker + Docker Compose** (for local Postgres and Redis)

---

## Getting started

### 1. Clone and install

```bash
git clone <repo-url> shipyard
cd shipyard
pnpm install
```

### 2. Start the databases

```bash
docker compose -f docker-compose.dev.yml up -d
```

Starts:

- **PostgreSQL 17** on port `5432` (user: `shipyard`, password: `shipyard_dev`, db: `shipyard`)
- **Redis 7** on port `6379`

### 3. Configure environment variables

Create `apps/api/.env`:

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

See [Environment variables](#environment-variables) for the full list.

### 4. Generate the Prisma client and migrate

```bash
pnpm db:generate   # Generate Prisma client (required after every fresh clone)
pnpm db:migrate    # Create tables
```

> The generated client is gitignored. This step is mandatory after cloning.

### 5. Start the dev servers

```bash
pnpm dev
```

Turborepo starts both apps in parallel.

| URL                         | What                              |
| --------------------------- | --------------------------------- |
| `http://localhost:4200`     | Angular frontend                  |
| `http://localhost:3000/api` | Swagger UI (interactive API docs) |

---

## Common commands

```bash
# Dev
pnpm dev                         # Both apps (Turborepo)
pnpm --filter api start:dev      # NestJS only (watch mode)
pnpm --filter web start          # Angular only

# Build
pnpm build                       # All packages in order (shared → api + web)

# Database
pnpm db:migrate                  # Create and apply migrations
pnpm db:generate                 # Regenerate Prisma client after schema changes
pnpm db:seed                     # Seed with dev data
pnpm db:studio                   # Prisma Studio GUI at http://localhost:5555

# Tests
pnpm test                        # All tests
pnpm --filter api test           # Backend (Jest)
pnpm --filter web test           # Frontend (Vitest)

# Lint
pnpm lint

# Databases
docker compose -f docker-compose.dev.yml up -d      # Start
docker compose -f docker-compose.dev.yml down        # Stop
docker compose -f docker-compose.dev.yml down -v     # Stop + wipe volumes
```

---

## Environment variables

All variables live in `apps/api/.env`.

| Variable                | Required | Description                                                        |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string                                       |
| `REDIS_HOST`            | Yes      | Redis hostname                                                     |
| `REDIS_PORT`            | Yes      | Redis port (`6379`)                                                |
| `JWT_SECRET`            | Yes      | Secret for signing JWTs — use a long random string in production   |
| `JWT_EXPIRATION`        | Yes      | Token lifetime (e.g. `7d`, `24h`)                                  |
| `PORT`                  | No       | API server port (default: `3000`)                                  |
| `NODE_ENV`              | No       | `development` / `production` / `test`                              |
| `CORS_ORIGIN`           | No       | Frontend origin allowed by CORS (default: `http://localhost:4200`) |
| `GITHUB_WEBHOOK_SECRET` | Phase 4  | Secret for verifying GitHub webhook HMAC signatures                |
| `GITHUB_APP_ID`         | Phase 4  | GitHub App ID                                                      |
| `GITHUB_CLIENT_ID`      | Phase 4  | GitHub OAuth client ID                                             |
| `GITHUB_CLIENT_SECRET`  | Phase 4  | GitHub OAuth client secret                                         |

---

## API reference

All endpoints except `/api/auth/register` and `/api/auth/login` require:

```
Authorization: Bearer <token>
```

Auth routes are rate-limited to **5 requests per 60 seconds**.

---

### Auth — `/api/auth`

| Method | Path                 | Auth | Description                                        |
| ------ | -------------------- | ---- | -------------------------------------------------- |
| `POST` | `/api/auth/register` | No   | Create account and team. First user becomes OWNER. |
| `POST` | `/api/auth/login`    | No   | Returns a JWT access token.                        |
| `GET`  | `/api/auth/me`       | Yes  | Current user + team info.                          |

**Register:**

```json
{
  "email": "you@example.com",
  "password": "minimum8chars",
  "displayName": "Your Name",
  "teamName": "Acme Corp"
}
```

**Login response:**

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "email": "you@example.com",
    "displayName": "Your Name",
    "role": "OWNER",
    "teamId": "uuid",
    "teamName": "Acme Corp"
  }
}
```

---

### Services — `/api/services`

A service is one deployable application (one repo + one Docker image).

| Method   | Path                | Roles   | Description                     |
| -------- | ------------------- | ------- | ------------------------------- |
| `GET`    | `/api/services`     | All     | List all services for your team |
| `GET`    | `/api/services/:id` | All     | Get a single service            |
| `POST`   | `/api/services`     | MEMBER+ | Create a service                |
| `PATCH`  | `/api/services/:id` | MEMBER+ | Update a service                |
| `DELETE` | `/api/services/:id` | ADMIN+  | Delete a service                |

**Create service body:**

```json
{
  "name": "api",
  "displayName": "Backend API",
  "description": "Main application API",
  "repositoryUrl": "https://github.com/acme/api",
  "repositoryProvider": "GITHUB",
  "defaultBranch": "main",
  "dockerImage": "acme/api"
}
```

`repositoryProvider` values: `GITHUB`, `GITLAB`, `BITBUCKET`

---

### Environments — `/api/environments`

An environment is a running instance of a service in a specific stage (dev, staging, prod).

| Method   | Path                           | Roles   | Description                               |
| -------- | ------------------------------ | ------- | ----------------------------------------- |
| `GET`    | `/api/environments?serviceId=` | All     | List environments. Filter by `serviceId`. |
| `GET`    | `/api/environments/:id`        | All     | Get a single environment                  |
| `POST`   | `/api/environments`            | MEMBER+ | Create an environment                     |
| `PATCH`  | `/api/environments/:id`        | MEMBER+ | Update an environment                     |
| `DELETE` | `/api/environments/:id`        | ADMIN+  | Delete an environment                     |

**Create environment body:**

```json
{
  "name": "prod",
  "displayName": "Production",
  "order": 2,
  "serviceId": "uuid",
  "url": "https://api.acme.com",
  "healthCheckUrl": "https://api.acme.com/health",
  "healthCheckInterval": 30
}
```

Setting `healthCheckUrl` automatically schedules background health checks. `healthCheckInterval` is in seconds (default: 30).

---

### Deployments — `/api/deployments`

| Method  | Path                            | Roles   | Description                        |
| ------- | ------------------------------- | ------- | ---------------------------------- |
| `GET`   | `/api/deployments`              | All     | Paginated deployment history       |
| `POST`  | `/api/deployments`              | MEMBER+ | Start a new deployment             |
| `PATCH` | `/api/deployments/:id/complete` | MEMBER+ | Mark SUCCESS or FAILED             |
| `POST`  | `/api/deployments/:id/rollback` | ADMIN+  | Roll back to a previous deployment |

**Query params for `GET`:**

| Param           | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `serviceId`     | Filter by service                                                |
| `environmentId` | Filter by environment                                            |
| `status`        | `PENDING` / `IN_PROGRESS` / `SUCCESS` / `FAILED` / `ROLLED_BACK` |
| `limit`         | Page size (max 100, default 50)                                  |
| `offset`        | Pagination offset                                                |

**Create deployment body:**

```json
{
  "serviceId": "uuid",
  "environmentId": "uuid",
  "commitSha": "abc1234",
  "commitMessage": "fix: resolve memory leak",
  "branch": "main",
  "imageTag": "v1.2.3"
}
```

**Complete deployment body:**

```json
{ "status": "SUCCESS" }
```

On `SUCCESS`, the environment's `currentDeploymentId` updates automatically.

Rollbacks create a **new** Deployment record pointing to the old commit/image. The old record is never mutated.

---

### Pipelines — `/api/pipelines`

Read-only. Populated automatically by GitHub webhook events.

| Method | Path                 | Description               |
| ------ | -------------------- | ------------------------- |
| `GET`  | `/api/pipelines`     | Paginated pipeline runs   |
| `GET`  | `/api/pipelines/:id` | Get a single pipeline run |

**Query params:** `serviceId`, `status`, `limit`, `offset`

---

### Health Checks — `/api/health-checks`

Checks run automatically on a BullMQ schedule based on each environment's `healthCheckInterval`. They can also be triggered manually.

| Method | Path                                | Roles   | Description                                       |
| ------ | ----------------------------------- | ------- | ------------------------------------------------- |
| `GET`  | `/api/health-checks`                | All     | Latest health result per environment (whole team) |
| `GET`  | `/api/health-checks/:envId/history` | All     | Paginated check history for one environment       |
| `POST` | `/api/health-checks/:envId/trigger` | MEMBER+ | Manual trigger (10-second cooldown)               |

**Environment statuses:**

| Status     | Meaning                            |
| ---------- | ---------------------------------- |
| `HEALTHY`  | 2xx response                       |
| `DEGRADED` | 3xx redirect (not followed)        |
| `DOWN`     | Non-2xx, timeout, or network error |
| `UNKNOWN`  | No check has run yet               |

Health check requests are protected against SSRF: the target hostname is resolved to all DNS records before the request, and any private/reserved IP range (`10.x`, `192.168.x`, `172.16-31.x`, `169.254.x`, `::1`, etc.) causes the check to be blocked.

---

### Notifications — `/api/notifications`

#### In-app notifications

| Method  | Path                              | Description                                   |
| ------- | --------------------------------- | --------------------------------------------- |
| `GET`   | `/api/notifications`              | List notifications (`?limit=` for pagination) |
| `GET`   | `/api/notifications/unread-count` | Count of unread notifications                 |
| `PATCH` | `/api/notifications/:id/read`     | Mark one notification read                    |
| `PATCH` | `/api/notifications/read-all`     | Mark all read                                 |

#### Notification channels

Configure where to send external alerts (Slack, Discord, webhook).

| Method   | Path                                   | Roles  | Description         |
| -------- | -------------------------------------- | ------ | ------------------- |
| `GET`    | `/api/notifications/channels`          | All    | List channels       |
| `GET`    | `/api/notifications/channels/:id`      | All    | Get a channel       |
| `POST`   | `/api/notifications/channels`          | ADMIN+ | Create a channel    |
| `PATCH`  | `/api/notifications/channels/:id`      | ADMIN+ | Update a channel    |
| `DELETE` | `/api/notifications/channels/:id`      | ADMIN+ | Delete a channel    |
| `POST`   | `/api/notifications/channels/:id/test` | ADMIN+ | Send a test message |

**Create channel body (Slack example):**

```json
{
  "type": "SLACK",
  "name": "Deployments",
  "config": { "webhookUrl": "https://hooks.slack.com/services/..." },
  "events": ["DEPLOYMENT_SUCCESS", "DEPLOYMENT_FAILED", "HEALTH_DOWN"],
  "enabled": true
}
```

**Channel types:**

| Type      | Config shape                                               |
| --------- | ---------------------------------------------------------- |
| `SLACK`   | `{ "webhookUrl": "https://hooks.slack.com/..." }`          |
| `DISCORD` | `{ "webhookUrl": "https://discord.com/api/webhooks/..." }` |
| `WEBHOOK` | `{ "url": "https://your-endpoint.com/hook" }`              |

**Subscribable event types:** `DEPLOYMENT_SUCCESS`, `DEPLOYMENT_FAILED`, `HEALTH_DOWN`, `HEALTH_RECOVERED`, `ROLLBACK`

---

### Teams — `/api/teams`

| Method  | Path         | Roles  | Description                 |
| ------- | ------------ | ------ | --------------------------- |
| `GET`   | `/api/teams` | All    | Get your team's info        |
| `PATCH` | `/api/teams` | ADMIN+ | Update team name / settings |

---

### Users — `/api/users`

| Method   | Path                  | Roles  | Description          |
| -------- | --------------------- | ------ | -------------------- |
| `GET`    | `/api/users`          | All    | List team members    |
| `GET`    | `/api/users/:id`      | All    | Get a member         |
| `POST`   | `/api/users/invite`   | ADMIN+ | Invite a new user    |
| `PATCH`  | `/api/users/:id`      | Self   | Update own profile   |
| `PATCH`  | `/api/users/:id/role` | ADMIN+ | Change a user's role |
| `DELETE` | `/api/users/:id`      | ADMIN+ | Remove a user        |

---

### Analytics — `/api/analytics`

| Method | Path                                 | Description                                     |
| ------ | ------------------------------------ | ----------------------------------------------- |
| `GET`  | `/api/analytics/deployments?days=30` | Deploy count, success rate, frequency over time |
| `GET`  | `/api/analytics/mttr?days=30`        | Mean time to recovery                           |

`days` accepts 1–365. Defaults to 30.

---

### GitHub Webhook — `/api/webhooks/github`

| Method | Path                   | Auth           | Description                   |
| ------ | ---------------------- | -------------- | ----------------------------- |
| `POST` | `/api/webhooks/github` | HMAC signature | Receive GitHub webhook events |

Every request must include a valid `x-hub-signature-256` header (HMAC-SHA256 of the raw request body using `GITHUB_WEBHOOK_SECRET`). Requests with a missing or invalid signature are rejected with `401`.

Handled event types: `workflow_run`, `deployment`, `deployment_status`, `push`.

---

## WebSocket events

Connect to `http://localhost:3000/events` with Socket.IO and pass your JWT in the handshake:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  auth: { token: '<jwt>' },
});
```

The server joins you to `team:{teamId}` automatically. All events are scoped to your team — no cross-tenant leakage.

| Event                  | When fired                      |
| ---------------------- | ------------------------------- |
| `deployment:started`   | New deployment created          |
| `deployment:completed` | Deployment marked SUCCESS       |
| `deployment:failed`    | Deployment marked FAILED        |
| `health:updated`       | Health check result recorded    |
| `pipeline:updated`     | GitHub pipeline run updated     |
| `notification:new`     | New in-app notification created |

---

## Role permissions

| Action                                       | VIEWER | MEMBER | ADMIN | OWNER |
| -------------------------------------------- | ------ | ------ | ----- | ----- |
| Read all data                                | Yes    | Yes    | Yes   | Yes   |
| Create services / environments / deployments | No     | Yes    | Yes   | Yes   |
| Update services / environments               | No     | Yes    | Yes   | Yes   |
| Delete services / environments               | No     | No     | Yes   | Yes   |
| Rollback deployments                         | No     | No     | Yes   | Yes   |
| Invite / remove users                        | No     | No     | Yes   | Yes   |
| Change user roles                            | No     | No     | Yes   | Yes   |
| Manage notification channels                 | No     | No     | Yes   | Yes   |
| Update team settings                         | No     | No     | Yes   | Yes   |

---

## GitHub integration

Shipyard listens for GitHub webhooks at `POST /api/webhooks/github`. When a `workflow_run` event arrives for a branch that matches a service's default branch, Shipyard creates or updates a `PipelineRun` record and broadcasts a `pipeline:updated` WebSocket event.

**Setup:**

1. Create a GitHub App (or add a webhook to a repo/org).
2. Set `GITHUB_WEBHOOK_SECRET` in `.env`.
3. Point the webhook to `https://<your-domain>/api/webhooks/github`.
4. Subscribe to: `workflow_run`, `deployment`, `deployment_status`, `push`.

---

## Health checks

When an environment has a `healthCheckUrl`, the backend automatically schedules a repeating BullMQ job that:

1. Resolves all DNS records for the target host.
2. Rejects the request if any resolved IP is private/reserved (SSRF protection).
3. Makes an HTTP GET with a 10-second timeout, following no redirects.
4. Records status code, response time, and derived health status.
5. Updates `environment.status` and emits a `health:updated` WebSocket event.

The scheduler restarts all jobs on API startup. Changing `healthCheckUrl` or `healthCheckInterval` on an environment reschedules its job automatically.

---

## Notifications

`NotificationsService.notify()` is the single entry point for all notifications. It:

1. Creates an in-app `Notification` record in the database.
2. Emits `notification:new` to the team's WebSocket room.
3. Fans out in parallel to all enabled `NotificationChannel` records subscribed to that event type.

External dispatch (Slack, Discord, webhook) is fire-and-forget — a failed delivery doesn't block the caller. All outbound URLs are validated against SSRF rules before sending.

---

## Project structure

```
shipyard/
├── apps/
│   ├── api/                          # NestJS 11 backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # All database models
│   │   │   └── migrations/           # Auto-generated SQL migrations
│   │   ├── prisma.config.ts          # Prisma 7 datasource config
│   │   └── src/
│   │       ├── main.ts               # Bootstrap (Swagger, CORS, helmet, validation)
│   │       ├── app.module.ts         # Root module
│   │       ├── auth/                 # Register, login, JWT strategy
│   │       ├── users/                # User CRUD + invite + role management
│   │       ├── teams/                # Team read + update
│   │       ├── services/             # Service registry (core domain)
│   │       ├── environments/         # Environment management
│   │       ├── deployments/          # Deployment tracking + rollbacks
│   │       ├── pipelines/            # CI/CD pipeline run tracking
│   │       ├── health-checks/        # BullMQ scheduler + processor + SSRF guard
│   │       ├── notifications/        # In-app + external fan-out
│   │       ├── analytics/            # Deployment stats + MTTR
│   │       ├── websocket/            # Socket.IO EventsGateway (namespace /events)
│   │       ├── integrations/
│   │       │   ├── github/           # Webhook handler + HMAC verification
│   │       │   └── docker/           # Docker Engine API stub (Phase 7)
│   │       ├── prisma/               # Global PrismaService
│   │       └── common/               # Guards, decorators, filters, interceptors
│   │
│   └── web/                          # Angular 21 frontend
│       └── src/app/
│           ├── core/                 # Singleton services (auth, API, WebSocket, theme)
│           ├── features/             # Lazy-loaded feature pages
│           │   ├── auth/             # Login + register
│           │   ├── dashboard/        # Service cards + health overview
│           │   ├── services/         # Service detail + deployment timeline
│           │   ├── deployments/      # Deployment feed + filters
│           │   ├── pipelines/        # Pipeline monitor
│           │   ├── environments/     # Environment grid
│           │   └── settings/         # Team, users, notification channels
│           └── shared/               # Reusable components, pipes, layouts
│
└── packages/
    └── shared/                       # @shipyard/shared
        └── src/index.ts              # Enums, API request/response types, WS event types
```

---

## Build phases

| Phase                  | Status      | Description                                                              |
| ---------------------- | ----------- | ------------------------------------------------------------------------ |
| 1 — Foundation         | Done        | Monorepo, Prisma schema, auth (register/login/JWT), Angular shell        |
| 2 — Core Data          | Done        | Services, Environments, Deployments, Pipelines CRUD                      |
| 3 — Real-Time          | Done        | WebSocket gateway, health checks (BullMQ), analytics                     |
| 4 — GitHub Integration | Done        | Webhook handler, pipeline tracking, HMAC signature verification          |
| 5 — Notifications      | Done        | In-app + Slack/Discord/webhook fan-out, notification channels            |
| 6 — Frontend           | In progress | Angular pages for all features                                           |
| 7 — Polish & Ship      | Planned     | Analytics charts, rollback UI, dark theme, Docker production setup, v1.0 |

---

## License

[MIT](LICENSE)
