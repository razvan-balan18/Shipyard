# The Complete Guide to Building an Open-Source Deployment Dashboard

## Project Name Options

Before we dive in, here are three names. Pick the one that resonates:

1. **Shipyard** — Where ships (deployments) are built, launched, and monitored. Strong nautical metaphor that maps perfectly: ships = services, docks = environments, launches = deployments. Great logo potential (anchor, crane, ship). The npm package `shipyard` is taken but `@shipyard-dev/dashboard` isn't.

2. **Beacon** — A signal that cuts through the noise. Your deployment signal tower. Clean, modern, easy to say. Works well as a CLI name too (`beacon status`, `beacon deploy`).

3. **Launchpad** — Mission control for your deployments. NASA vibes. Approachable, immediately communicates what the tool does.

**My recommendation: Shipyard.** It's distinctive, memorable, has a rich metaphor system (docks, berths, manifests, cargo), and sounds like a real open-source project. I'll use this name throughout the guide.

---

# PART 1: FOUNDATIONS & ARCHITECTURE

---

## Chapter 1: What Is a Deployment Dashboard and Why Does It Matter?

### The Problem (Without a Dashboard)

Imagine you're on a team of six developers. You deploy three microservices — an API, a frontend, and a background worker — to three environments: dev, staging, and production. Here's what a typical day looks like without a deployment dashboard:

**9:15 AM** — Someone asks in Slack: "Is the new auth fix on staging yet?" Nobody knows. Alex thinks he deployed it yesterday but isn't sure which environment. You open GitHub Actions, find the repo, scroll through workflow runs, click into one, read the logs... 5 minutes later you have your answer. Maybe.

**11:30 AM** — Staging is broken. The API returns 500s. When did it break? Who deployed last? You check GitHub commits, cross-reference with the Actions tab, try to figure out which commit is actually running on staging right now. Someone SSHs into the server and runs `docker ps` to check container versions. 15 minutes of detective work.

**2:00 PM** — You deploy to production. It works. But 20 minutes later, error rates spike. You need to rollback. How? SSH into the server, remember the previous Docker image tag, manually pull and restart? Hope you wrote it down somewhere?

**4:45 PM** — Your manager asks: "How many times did we deploy this week? What's our deploy success rate? How long do deploys take?" You have no idea. That data exists in GitHub Actions logs, Docker events, and your team's collective memory — but nowhere unified.

This is the reality for most small teams. The information exists, but it's scattered across five different tools and nobody's job to aggregate it.

### The Solution (With Shipyard)

Now imagine Shipyard is running:

**9:15 AM** — You open the dashboard. The "Services" panel shows all three services with a green/yellow/red status dot. You click the API service and instantly see: last deployed to staging at 8:47 PM yesterday by Alex, commit `a3f2c1d` with message "fix auth token validation." Done in 10 seconds.

**11:30 AM** — Shipyard already shows a red indicator on the API's staging environment. The health check started failing at 11:22 AM. The deployment timeline shows exactly which deploy preceded the failure. You click "Rollback" and the previous working version is redeployed in 30 seconds.

**2:00 PM** — You deploy to production through your normal process (git push, CI runs, Docker image builds). Shipyard picks up the deployment event via webhook and shows it live in the deployments feed. Your team sees it in real-time. If something goes wrong, a one-click rollback is ready.

**4:45 PM** — You show your manager the "Analytics" tab: 14 deployments this week, 92% success rate, average deploy time 3 minutes 12 seconds, trending down from last month's 4 minutes 45 seconds. All generated automatically.

### What Shipyard Actually Does, Technically

At its core, a deployment dashboard is an **event aggregator and state tracker**. It:

1. **Listens** for events from your CI/CD system (GitHub Actions completed a workflow), your container runtime (a new Docker container started), and your version control (a commit was pushed).

2. **Records** these events in a database with rich metadata: who triggered it, what commit, which service, which environment, success or failure, how long it took.

3. **Computes state** from these events: "The API service is running version `v1.4.2` on production, deployed 3 hours ago by Alex, and its health check is passing."

4. **Displays** this state in a beautiful, real-time UI that updates via WebSockets the moment anything changes.

5. **Enables action** — rollbacks, redeployments, notification configuration — directly from the UI.

Think of it as a **read-mostly** system. 95% of the time, it's passively collecting data and showing it. The other 5% is taking action (rollbacks, config changes).

---

## Chapter 2: Competitive Analysis

### Backstage (by Spotify)

**What it is:** A developer portal framework. It's a platform for building your own internal developer portal — service catalog, documentation, templates, and plugins.

**What it gets right:** Incredibly flexible plugin system, strong community, handles service ownership and documentation beautifully.

**Where it falls short for small teams:** It's a _framework_, not a product. Setting up Backstage is a project in itself — you need to write plugins, configure data sources, build custom pages. A 6-person team doesn't have weeks to set up a developer portal. It's also React-based (doesn't help your Angular learning) and focuses more on service cataloging than deployment visibility.

**Gap Shipyard fills:** Shipyard works out of the box in 5 minutes via Docker Compose. No plugin development required for core functionality.

### Argo CD

**What it is:** A GitOps continuous delivery tool for Kubernetes. It watches Git repos and ensures your Kubernetes cluster matches the desired state defined in your repo.

**What it gets right:** Excellent at what it does — GitOps deployments to Kubernetes, with a solid UI showing sync status.

**Where it falls short:** It's Kubernetes-only and focused specifically on GitOps deployment _execution_, not observation. If you're running plain Docker on a VPS (which many small teams do), Argo CD doesn't apply. It also doesn't aggregate CI pipeline data or provide deployment analytics.

**Gap Shipyard fills:** Works with plain Docker (not just Kubernetes), aggregates CI/CD data from GitHub Actions, and provides analytics. It's an observation/management layer, not a deployment executor.

### Portainer

**What it is:** A container management UI. Lets you manage Docker containers, images, volumes, and networks through a web interface.

**What it gets right:** Excellent Docker management, easy setup, good container visibility.

**Where it falls short:** Portainer thinks in terms of containers, not services or deployments. It doesn't know about your CI/CD pipeline, doesn't track deployment history, doesn't understand environments, and has no concept of "this container represents v1.4.2 of the API service deployed by Alex at 3pm." It's infrastructure-level, not application-level.

**Gap Shipyard fills:** Application-level awareness. Shipyard understands services, deployments, environments, and teams — not just containers.

### Datadog / Grafana

**What they are:** Monitoring and observability platforms. Metrics, logs, traces, dashboards.

**What they get right:** Incredibly powerful monitoring, alerting, visualization.

**Where they fall short:** Datadog is expensive ($15+/host/month, adds up fast). Grafana is free but requires you to set up Prometheus, configure exporters, build dashboards from scratch. Neither is focused on _deployment tracking_ — they monitor what's running, not the history of how it got there.

**Gap Shipyard fills:** Deployment-centric view rather than infrastructure-centric. Free and self-hosted. Includes the deployment history, rollback capability, and CI/CD integration that monitoring tools lack.

### Coolify

**What it is:** A self-hosted PaaS (like Heroku but on your own server). Manages deployments, databases, and services.

**What it gets right:** Great UX, easy self-hosting, manages the full lifecycle.

**Where it falls short:** Coolify _is_ the deployment tool — it replaces your CI/CD pipeline. If your team already has a CI/CD setup with GitHub Actions, Coolify competes with it rather than complementing it. It doesn't aggregate data from external CI/CD systems.

**Gap Shipyard fills:** Shipyard is _additive_ — it integrates with your existing pipeline, doesn't replace it. Teams keep their GitHub Actions, their Docker setup, their existing workflow. Shipyard just makes it all visible.

### Summary: Where Shipyard Fits

| Feature            | Backstage     | Argo CD | Portainer | Datadog   | Coolify     | **Shipyard** |
| ------------------ | ------------- | ------- | --------- | --------- | ----------- | ------------ |
| Works in 5 min     | No            | No      | Yes       | No        | Yes         | **Yes**      |
| Deployment history | Plugin needed | Partial | No        | No        | Yes         | **Yes**      |
| CI/CD integration  | Plugin needed | No      | No        | Yes ($$$) | Own CI only | **Yes**      |
| Docker support     | Plugin needed | No      | Yes       | Yes ($$$) | Yes         | **Yes**      |
| K8s support        | Yes           | Yes     | Yes       | Yes       | No          | **Later**    |
| Rollbacks          | No            | Yes     | Manual    | No        | Yes         | **Yes**      |
| Free & self-hosted | Yes           | Yes     | Freemium  | No        | Yes         | **Yes**      |
| Real-time UI       | No            | Yes     | Yes       | Yes       | Yes         | **Yes**      |
| Analytics          | No            | No      | No        | Yes ($$$) | No          | **Yes**      |

---

## Chapter 3: System Architecture

### The Big Picture

Shipyard is a three-tier application with an event-driven integration layer. Here's the conceptual architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SYSTEMS                         │
│  GitHub Actions  │  Docker Engine  │  Health Endpoints  │  etc  │
└───────┬──────────┴───────┬─────────┴─────────┬─────────┴───────┘
        │ webhooks              │ API polling         │ HTTP checks
        ▼                      ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATION LAYER                           │
│  Webhook receiver  │  Docker client  │  Health checker          │
│  GitHub API client │  Adapter interface (pluggable)             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ internal events
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                         │
│  REST API  │  WebSocket Gateway  │  Background Jobs  │  Auth   │
└──────┬─────┴──────────┬──────────┴─────────┬────────┴──────────┘
       │                │                     │
       ▼                ▼                     ▼
┌────────────┐  ┌──────────────┐     ┌──────────────┐
│ PostgreSQL │  │ Connected     │     │ Bull Queue   │
│ (data)     │  │ WS Clients   │     │ (Redis)      │
└────────────┘  └──────────────┘     └──────────────┘
       ▲
       │ HTTP/WS
┌──────┴──────────────────────────────────────────────────────────┐
│                      FRONTEND (Angular)                         │
│  Dashboard  │  Service Views  │  Deployment Feed  │  Settings   │
└─────────────────────────────────────────────────────────────────┘
```

### Layer-by-Layer Breakdown

**Frontend (Angular 19+)**

The Angular app is a single-page application that communicates with the backend via REST API calls and receives real-time updates via a WebSocket connection. It's responsible for:

- Rendering the dashboard UI (service statuses, deployment history, pipeline monitors)
- Managing local state with Angular Signals
- Handling authentication (storing JWT, attaching it to requests)
- Establishing and maintaining a WebSocket connection for live updates
- Providing interactive features like rollback buttons, filters, and settings forms

The frontend is served as static files from an Nginx container in production.

**Backend (NestJS)**

Why NestJS over alternatives:

- **NestJS vs. Express:** Express is minimal — you'd spend weeks building the structure that NestJS gives you out of the box (dependency injection, modules, guards, interceptors, WebSocket support). NestJS is the Angular of backend frameworks — you'll feel right at home with its decorator-based, DI-heavy architecture. The patterns transfer directly.

- **NestJS vs. Go/Rust:** Both are fantastic for performance-critical backends, but you'd be learning a new language alongside a new domain. NestJS keeps you in TypeScript, meaning shared types between frontend and backend, one language to context-switch in, and faster development velocity. Performance is not a bottleneck here — a deployment dashboard handles maybe 100 events per hour, not 100,000 requests per second.

- **NestJS vs. FastAPI (Python):** FastAPI is great, but you lose the shared TypeScript advantage. Type safety across the full stack (Angular + NestJS + shared types) catches entire categories of bugs at compile time.

The backend is responsible for:

- REST API for CRUD operations (services, deployments, environments, teams)
- WebSocket gateway for pushing real-time events to clients
- Webhook endpoints for receiving events from GitHub, Docker Hub, etc.
- Integration clients (GitHub API, Docker API)
- Background job processing (health checks, polling, cleanup)
- Authentication and authorization

**Database (PostgreSQL)**

Why PostgreSQL:

- Battle-tested, free, and handles everything we need: relational data, JSON columns for flexible metadata, excellent query performance.
- SQLite is tempting for simplicity, but it can't handle concurrent writes well. When multiple webhooks arrive simultaneously (which they will during active development), SQLite's write lock becomes a problem. PostgreSQL handles concurrency gracefully.
- PostgreSQL runs perfectly in Docker, so local development setup is trivial.

We'll use **Prisma** as the ORM. Why Prisma:

- Type-safe database queries (generates TypeScript types from your schema)
- Excellent migration system (version-controlled database changes)
- Intuitive schema language that reads almost like plain English
- Great documentation and the most popular Node.js ORM by a wide margin

**Redis (for Bull queues and caching)**

Redis serves two purposes:

1. **Job queue backend:** Bull (our job queue library) uses Redis to manage background jobs — health checks that run every 30 seconds, periodic GitHub API polling, cleanup of old deployment records.

2. **Caching:** Short-term caching of GitHub API responses to avoid hitting rate limits (GitHub allows 5,000 requests/hour for authenticated apps, which sounds like a lot until you're polling 20 repos every minute).

**WebSocket Layer (Socket.IO via NestJS)**

When a deployment happens, users shouldn't have to refresh the page to see it. Socket.IO provides:

- Real-time bidirectional communication
- Automatic reconnection (if the connection drops, it reconnects transparently)
- Room support (users in the same team receive the same events)
- Fallback to HTTP long-polling if WebSockets aren't available

**Integration Layer**

This is the "pluggable" part of the architecture. Each external system (GitHub, Docker, GitLab, etc.) gets an **adapter** — a class that implements a standard interface. For v1.0, we build two adapters:

1. **GitHub Adapter:** Receives webhooks, calls GitHub API, translates GitHub-specific data into Shipyard's internal event format.
2. **Docker Adapter:** Connects to Docker Engine API, fetches container status, streams logs.

The adapter pattern means adding GitLab support later is just writing a new class that implements the same interface — no changes to core logic.

---

## Chapter 4: Tech Stack Decisions

Here's every technology we're using, organized by layer:

### Frontend

| Technology           | What It Is                         | Why We're Using It                                                                                                                                                                                    |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Angular 19+**      | Component-based frontend framework | Your primary skill. Signals, standalone components, and the new control flow make it excellent for this kind of data-heavy dashboard.                                                                 |
| **Angular Material** | UI component library               | Provides ready-made, accessible components (tables, dialogs, tabs, chips). Saves weeks of building common UI elements. Pairs perfectly with Angular's theming system for dark mode.                   |
| **Tailwind CSS**     | Utility-first CSS framework        | Angular Material handles component structure; Tailwind handles custom layout and spacing. Together they let you move fast without writing much custom CSS.                                            |
| **Socket.IO Client** | WebSocket client library           | Pairs with Socket.IO on the backend. Handles reconnection, fallbacks, and event-based communication.                                                                                                  |
| **ngx-echarts**      | Charting library for Angular       | Wraps Apache ECharts, which has the best balance of beautiful defaults, animation quality, and chart variety. The deployment frequency and success rate charts will look professional out of the box. |
| **date-fns**         | Date utility library               | Lightweight, tree-shakeable date manipulation. Format "2024-01-15T14:30:00Z" as "15 minutes ago" or "Jan 15 at 2:30 PM."                                                                              |

### Backend

| Technology        | What It Is                | Why We're Using It                                                                                             |
| ----------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **NestJS 10+**    | Node.js backend framework | DI-based architecture mirrors Angular. Modules, guards, interceptors, pipes — you already know these patterns. |
| **Prisma**        | Type-safe ORM             | Generates TypeScript types from your database schema. Catches query errors at compile time, not runtime.       |
| **PostgreSQL 16** | Relational database       | Handles concurrent writes, supports JSON columns for flexible metadata, and is the industry standard.          |
| **Redis 7**       | In-memory data store      | Powers Bull job queues and caches frequently-accessed data (GitHub API responses).                             |
| **Bull**          | Job queue library         | Reliable background job processing with retries, scheduling, and concurrency control. Built on Redis.          |
| **Socket.IO**     | WebSocket library         | Real-time event broadcasting with rooms, reconnection, and fallback support.                                   |
| **Passport.js**   | Authentication library    | JWT-based auth with strategies for local login and GitHub OAuth. Well-integrated with NestJS.                  |
| **Helmet**        | Security middleware       | Sets security-related HTTP headers automatically. One line of code, meaningful protection.                     |

### Infrastructure

| Technology         | What It Is                         | Why We're Using It                                                                                                                                              |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docker**         | Container runtime                  | The dashboard itself runs in Docker, and it monitors Docker containers. Containerization ensures "it works on my machine" actually means "it works everywhere." |
| **Docker Compose** | Multi-container orchestration      | Defines the entire stack (frontend, backend, database, Redis) in one file. Users run `docker compose up` and everything works.                                  |
| **Nginx**          | Reverse proxy / static file server | Serves the Angular app, proxies API requests to the backend, handles WebSocket upgrades.                                                                        |
| **GitHub Actions** | CI/CD                              | Builds, tests, and publishes Docker images on every push. The dashboard eventually monitors its own pipeline.                                                   |

### Development Tools

| Technology                 | What It Is             | Why We're Using It                                                                                            |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **pnpm**                   | Package manager        | Faster and more disk-efficient than npm. Uses hard links to deduplicate packages.                             |
| **Turborepo**              | Monorepo build system  | Manages the frontend and backend in one repository with shared TypeScript types. Caches builds intelligently. |
| **ESLint + Prettier**      | Linting and formatting | Consistent code style without arguments. Runs automatically on pre-commit.                                    |
| **Husky + lint-staged**    | Git hooks              | Runs linting and formatting before every commit. Prevents broken code from entering the repo.                 |
| **Vitest**                 | Testing (backend)      | Fast, TypeScript-native test runner. Used for unit and integration tests on the backend.                      |
| **Jest (via Angular CLI)** | Testing (frontend)     | Angular's default test runner. We'll keep it for consistency with the Angular ecosystem.                      |

---

## Chapter 5: Data Model Design

This is the heart of the application. Every feature we build depends on this schema being right. Let me walk through each entity, why it exists, and how it connects to others.

### Entity: Team

```
Team
├── id (UUID, primary key)
├── name (string) — "Acme Engineering"
├── slug (string, unique) — "acme-engineering" (used in URLs)
├── githubOrgSlug (string, nullable) — "acme-inc" (linked GitHub org)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Why it exists:** Everything in Shipyard belongs to a team. A team maps to a real-world development team or organization. One Shipyard instance can host multiple teams (multi-tenancy), though v1.0 can start with single-team support.

### Entity: User

```
User
├── id (UUID, primary key)
├── email (string, unique)
├── passwordHash (string, nullable) — null if using GitHub OAuth only
├── displayName (string)
├── avatarUrl (string, nullable)
├── githubUsername (string, nullable)
├── githubAccessToken (string, encrypted, nullable)
├── role (enum: OWNER, ADMIN, MEMBER, VIEWER)
├── teamId (UUID, foreign key → Team)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Why it exists:** Users belong to teams and have roles. The `VIEWER` role is important — you might want stakeholders (PMs, designers) to see deployment status without being able to trigger rollbacks.

### Entity: Service

```
Service
├── id (UUID, primary key)
├── name (string) — "user-api"
├── displayName (string) — "User API"
├── description (string, nullable)
├── repositoryUrl (string) — "https://github.com/acme/user-api"
├── repositoryProvider (enum: GITHUB, GITLAB, BITBUCKET)
├── defaultBranch (string) — "main"
├── dockerImage (string, nullable) — "ghcr.io/acme/user-api"
├── teamId (UUID, foreign key → Team)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Why it exists:** A service is the core unit in Shipyard. It represents one deployable thing — a microservice, a frontend app, a worker. It maps to a Git repository and a Docker image. All deployments, environments, and pipelines are connected to a service.

### Entity: Environment

```
Environment
├── id (UUID, primary key)
├── name (string) — "production"
├── displayName (string) — "Production"
├── order (integer) — 3 (used for sorting: dev=1, staging=2, prod=3)
├── url (string, nullable) — "https://api.acme.com"
├── healthCheckUrl (string, nullable) — "https://api.acme.com/health"
├── healthCheckInterval (integer) — 30 (seconds between checks)
├── currentDeploymentId (UUID, nullable, foreign key → Deployment)
├── status (enum: HEALTHY, DEGRADED, DOWN, UNKNOWN)
├── lastHealthCheckAt (timestamp, nullable)
├── serviceId (UUID, foreign key → Service)
├── teamId (UUID, foreign key → Team)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Why it exists:** An environment is a running instance of a service. The "User API" service might have three environments: dev, staging, and production. Each environment tracks what's currently deployed there and whether it's healthy. The `currentDeploymentId` link is crucial — it tells you "production is currently running deployment X."

### Entity: Deployment

```
Deployment
├── id (UUID, primary key)
├── status (enum: PENDING, IN_PROGRESS, SUCCESS, FAILED, ROLLED_BACK)
├── commitSha (string) — "a3f2c1d..."
├── commitMessage (string)
├── branch (string) — "main"
├── imageTag (string, nullable) — "v1.4.2" or "sha-a3f2c1d"
├── duration (integer, nullable) — seconds from start to finish
├── startedAt (timestamp)
├── finishedAt (timestamp, nullable)
├── triggeredBy (string) — "alex@acme.com" or "github-actions"
├── metadata (JSON) — flexible field for extra data
├── serviceId (UUID, foreign key → Service)
├── environmentId (UUID, foreign key → Environment)
├── pipelineRunId (UUID, nullable, foreign key → PipelineRun)
├── teamId (UUID, foreign key → Team)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Why it exists:** This is the single most important entity. Every time code reaches an environment, a Deployment record is created. It answers: _what_ was deployed (commit, image tag), _where_ (environment), _when_ (timestamps), _by whom_ (triggeredBy), and _whether it worked_ (status). The deployment history is the backbone of the dashboard.

### Entity: PipelineRun

```
PipelineRun
├── id (UUID, primary key)
├── externalId (string) — GitHub Actions run ID
├── provider (enum: GITHUB_ACTIONS, GITLAB_CI, JENKINS)
├── status (enum: PENDING, RUNNING, SUCCESS, FAILED, CANCELLED)
├── branch (string)
├── commitSha (string)
├── workflowName (string) — "Build and Deploy"
├── url (string) — link to the run on GitHub
├── startedAt (timestamp)
├── finishedAt (timestamp, nullable)
├── duration (integer, nullable)
├── stages (JSON) — array of {name, status, duration} for each job/step
├── serviceId (UUID, foreign key → Service)
├── teamId (UUID, foreign key → Team)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Why it exists:** Pipeline runs track CI/CD workflow executions. A GitHub Actions workflow run is a PipelineRun. It may or may not result in a Deployment (some pipelines only run tests). The `stages` JSON field stores the individual jobs/steps without needing a separate table, keeping the schema simpler.

### Entity: HealthCheckResult

```
HealthCheckResult
├── id (UUID, primary key)
├── status (enum: HEALTHY, DEGRADED, DOWN)
├── responseTime (integer, nullable) — milliseconds
├── statusCode (integer, nullable) — HTTP status code
├── errorMessage (string, nullable)
├── environmentId (UUID, foreign key → Environment)
├── createdAt (timestamp)
```

**Why it exists:** Every health check produces a result. We keep these for trending (is response time getting worse?) and for incident reconstruction (when exactly did it go down?). Old records get cleaned up by a background job (keep 7 days of data, archive or delete the rest).

### Entity: Notification

```
Notification
├── id (UUID, primary key)
├── type (enum: DEPLOYMENT_SUCCESS, DEPLOYMENT_FAILED, HEALTH_DOWN, ROLLBACK, etc.)
├── title (string)
├── message (string)
├── read (boolean, default false)
├── metadata (JSON) — links, related entity IDs
├── userId (UUID, nullable, foreign key → User) — null for team-wide
├── teamId (UUID, foreign key → Team)
├── createdAt (timestamp)
```

**Why it exists:** In-app notifications. When a deployment fails or a health check goes red, users need to know. This stores the notification so they can see it even if they weren't online when it happened.

### Entity: NotificationChannel

```
NotificationChannel
├── id (UUID, primary key)
├── type (enum: SLACK, DISCORD, WEBHOOK)
├── name (string) — "Production Alerts"
├── config (JSON, encrypted) — webhook URL, channel name, etc.
├── events (string array) — ["DEPLOYMENT_FAILED", "HEALTH_DOWN"]
├── enabled (boolean)
├── teamId (UUID, foreign key → Team)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Why it exists:** Teams configure where they want external notifications sent. Each channel specifies which events trigger it. A team might have a Slack channel for all deployment events but only a Discord webhook for failures.

### Entity: AuditLog

```
AuditLog
├── id (UUID, primary key)
├── action (string) — "deployment.rollback", "service.create", "team.settings.update"
├── details (JSON) — what changed, before/after values
├── ipAddress (string, nullable)
├── userId (UUID, foreign key → User)
├── teamId (UUID, foreign key → Team)
├── createdAt (timestamp)
```

**Why it exists:** Tracks who did what. Essential for debugging ("who changed the production health check URL?") and eventual compliance needs.

### Relationship Map

```
Team ──┬── has many ── Users
       ├── has many ── Services
       │                └── has many ── Environments
       │                │                └── has one current ── Deployment
       │                │                └── has many ── HealthCheckResults
       │                └── has many ── Deployments
       │                └── has many ── PipelineRuns
       ├── has many ── Notifications
       ├── has many ── NotificationChannels
       └── has many ── AuditLogs
```

The key relationship to understand: **Service → Environment → Deployment** is the primary axis. A service has environments, each environment has a current deployment and a history of past deployments. Everything else orbits around this core.

---

# PART 2: PROJECT SETUP & INFRASTRUCTURE

---

## Chapter 6: Development Environment Setup

### Prerequisites

Make sure you have these installed on your MacBook:

```bash
# Check Node.js (need v20+)
node --version

# If not installed, use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# Install pnpm (our package manager)
npm install -g pnpm

# Check Docker Desktop is installed and running
docker --version
docker compose version

# Install NestJS CLI globally
pnpm add -g @nestjs/cli

# Install Angular CLI globally
pnpm add -g @angular/cli
```

### Monorepo Setup with Turborepo

We're using a monorepo — one Git repository containing both frontend and backend. Why?

1. **Shared TypeScript types.** When the API returns a `Deployment` object, the frontend should use the exact same TypeScript type. With a monorepo, you define the type once in a shared package.
2. **Atomic commits.** A change that affects both frontend and backend goes in one commit. No coordinating across repos.
3. **Simplified CI/CD.** One pipeline builds and tests everything.

```bash
# Create the monorepo
mkdir shipyard && cd shipyard
pnpm init

# Create the workspace structure
mkdir -p apps/web apps/api packages/shared

# Create pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Create turbo.json for Turborepo
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
EOF

# Install Turborepo
pnpm add -D turbo

# Add scripts to root package.json
# (We'll update package.json properly below)
```

Update the root `package.json`:

```json
{
  "name": "shipyard",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:migrate": "pnpm --filter api run db:migrate",
    "db:seed": "pnpm --filter api run db:seed",
    "db:studio": "pnpm --filter api run db:studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### Shared Types Package

```bash
cd packages/shared
pnpm init
```

Create `packages/shared/package.json`:

```json
{
  "name": "@shipyard/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Create `packages/shared/src/index.ts` — this will hold all our shared types:

```typescript
// packages/shared/src/index.ts

// === Enums ===

export enum DeploymentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum EnvironmentStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
}

export enum PipelineStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum NotificationType {
  DEPLOYMENT_SUCCESS = 'DEPLOYMENT_SUCCESS',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  HEALTH_DOWN = 'HEALTH_DOWN',
  HEALTH_RECOVERED = 'HEALTH_RECOVERED',
  ROLLBACK = 'ROLLBACK',
}

export enum ChannelType {
  SLACK = 'SLACK',
  DISCORD = 'DISCORD',
  WEBHOOK = 'WEBHOOK',
}

export enum RepositoryProvider {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  BITBUCKET = 'BITBUCKET',
}

// === API Response Types ===

export interface ServiceSummary {
  id: string;
  name: string;
  displayName: string;
  repositoryUrl: string;
  environments: EnvironmentSummary[];
  lastDeployment: DeploymentSummary | null;
}

export interface EnvironmentSummary {
  id: string;
  name: string;
  displayName: string;
  status: EnvironmentStatus;
  currentDeployment: DeploymentSummary | null;
  url: string | null;
}

export interface DeploymentSummary {
  id: string;
  status: DeploymentStatus;
  commitSha: string;
  commitMessage: string;
  branch: string;
  imageTag: string | null;
  duration: number | null;
  startedAt: string; // ISO 8601
  finishedAt: string | null;
  triggeredBy: string;
  serviceName: string;
  environmentName: string;
}

export interface PipelineRunSummary {
  id: string;
  externalId: string;
  status: PipelineStatus;
  workflowName: string;
  branch: string;
  commitSha: string;
  url: string;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  stages: PipelineStage[];
}

export interface PipelineStage {
  name: string;
  status: PipelineStatus;
  duration: number | null;
}

// === WebSocket Event Types ===

export enum WsEventType {
  DEPLOYMENT_STARTED = 'deployment:started',
  DEPLOYMENT_COMPLETED = 'deployment:completed',
  DEPLOYMENT_FAILED = 'deployment:failed',
  HEALTH_CHECK_UPDATED = 'health:updated',
  PIPELINE_UPDATED = 'pipeline:updated',
  NOTIFICATION_NEW = 'notification:new',
}

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: string;
}

// === API Request Types ===

export interface CreateServiceRequest {
  name: string;
  displayName: string;
  description?: string;
  repositoryUrl: string;
  repositoryProvider: RepositoryProvider;
  defaultBranch?: string;
  dockerImage?: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  displayName: string;
  order: number;
  url?: string;
  healthCheckUrl?: string;
  healthCheckInterval?: number;
  serviceId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  teamName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    teamId: string;
    teamName: string;
  };
}
```

### Angular Frontend Setup

```bash
cd apps/web

# Create a new Angular project (no routing yet — we'll add it ourselves)
ng new web --directory . --style scss --routing --ssr=false --skip-git

# Install dependencies
pnpm add @angular/material @angular/cdk
pnpm add socket.io-client
pnpm add echarts ngx-echarts
pnpm add date-fns

# Install Tailwind CSS
pnpm add -D tailwindcss @tailwindcss/postcss postcss
```

Configure Tailwind — create `apps/web/postcss.config.js`:

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

Add Tailwind to `apps/web/src/styles.scss`:

```scss
@import 'tailwindcss';

// Angular Material theme (we'll customize this later)
@use '@angular/material' as mat;

// Our dark theme will go here in Chapter 13
```

Add `@shipyard/shared` as a dependency in `apps/web/package.json`:

```json
{
  "dependencies": {
    "@shipyard/shared": "workspace:*"
  }
}
```

### NestJS Backend Setup

```bash
cd apps/api

# Create a new NestJS project
nest new api --directory . --package-manager pnpm --skip-git

# Install core dependencies
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
pnpm add @nestjs/platform-socket.io @nestjs/websockets
pnpm add @prisma/client
pnpm add @nestjs/bull bull
pnpm add ioredis
pnpm add bcrypt helmet class-validator class-transformer
pnpm add @octokit/rest @octokit/webhooks
pnpm add dockerode

# Install dev dependencies
pnpm add -D prisma
pnpm add -D @types/passport-jwt @types/passport-local @types/bcrypt @types/dockerode
pnpm add -D vitest @vitest/coverage-v8

# Add shared types
# In apps/api/package.json, add:
# "@shipyard/shared": "workspace:*"
```

Initialize Prisma:

```bash
cd apps/api
npx prisma init --datasource-provider postgresql
```

### Prisma Schema

Replace `apps/api/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum DeploymentStatus {
  PENDING
  IN_PROGRESS
  SUCCESS
  FAILED
  ROLLED_BACK
}

enum EnvironmentStatus {
  HEALTHY
  DEGRADED
  DOWN
  UNKNOWN
}

enum PipelineStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
  CANCELLED
}

enum UserRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum RepositoryProvider {
  GITHUB
  GITLAB
  BITBUCKET
}

enum ChannelType {
  SLACK
  DISCORD
  WEBHOOK
}

model Team {
  id            String   @id @default(uuid())
  name          String
  slug          String   @unique
  githubOrgSlug String?  @map("github_org_slug")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  users                User[]
  services             Service[]
  deployments          Deployment[]
  pipelineRuns         PipelineRun[]
  notifications        Notification[]
  notificationChannels NotificationChannel[]
  auditLogs            AuditLog[]

  @@map("teams")
}

model User {
  id                String   @id @default(uuid())
  email             String   @unique
  passwordHash      String?  @map("password_hash")
  displayName       String   @map("display_name")
  avatarUrl         String?  @map("avatar_url")
  githubUsername     String?  @map("github_username")
  githubAccessToken  String?  @map("github_access_token")
  role              UserRole @default(MEMBER)
  teamId            String   @map("team_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  team          Team           @relation(fields: [teamId], references: [id])
  notifications Notification[]
  auditLogs     AuditLog[]

  @@map("users")
}

model Service {
  id                 String             @id @default(uuid())
  name               String
  displayName        String             @map("display_name")
  description        String?
  repositoryUrl      String             @map("repository_url")
  repositoryProvider RepositoryProvider @map("repository_provider")
  defaultBranch      String             @default("main") @map("default_branch")
  dockerImage        String?            @map("docker_image")
  teamId             String             @map("team_id")
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  team         Team          @relation(fields: [teamId], references: [id])
  environments Environment[]
  deployments  Deployment[]
  pipelineRuns PipelineRun[]

  @@unique([name, teamId])
  @@map("services")
}

model Environment {
  id                  String            @id @default(uuid())
  name                String
  displayName         String            @map("display_name")
  order               Int               @default(0)
  url                 String?
  healthCheckUrl      String?           @map("health_check_url")
  healthCheckInterval Int               @default(30) @map("health_check_interval")
  currentDeploymentId String?           @map("current_deployment_id")
  status              EnvironmentStatus @default(UNKNOWN)
  lastHealthCheckAt   DateTime?         @map("last_health_check_at")
  serviceId           String            @map("service_id")
  teamId              String            @map("team_id")
  createdAt           DateTime          @default(now()) @map("created_at")
  updatedAt           DateTime          @updatedAt @map("updated_at")

  service            Service             @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  currentDeployment  Deployment?         @relation("CurrentDeployment", fields: [currentDeploymentId], references: [id])
  deployments        Deployment[]        @relation("EnvironmentDeployments")
  healthCheckResults HealthCheckResult[]

  @@unique([name, serviceId])
  @@map("environments")
}

model Deployment {
  id            String           @id @default(uuid())
  status        DeploymentStatus @default(PENDING)
  commitSha     String           @map("commit_sha")
  commitMessage String           @map("commit_message")
  branch        String
  imageTag      String?          @map("image_tag")
  duration      Int?
  startedAt     DateTime         @map("started_at")
  finishedAt    DateTime?        @map("finished_at")
  triggeredBy   String           @map("triggered_by")
  metadata      Json?
  serviceId     String           @map("service_id")
  environmentId String           @map("environment_id")
  pipelineRunId String?          @map("pipeline_run_id")
  teamId        String           @map("team_id")
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")

  service     Service      @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  environment Environment  @relation("EnvironmentDeployments", fields: [environmentId], references: [id])
  pipelineRun PipelineRun? @relation(fields: [pipelineRunId], references: [id])
  team        Team         @relation(fields: [teamId], references: [id])

  currentForEnvironments Environment[] @relation("CurrentDeployment")

  @@map("deployments")
}

model PipelineRun {
  id           String         @id @default(uuid())
  externalId   String         @map("external_id")
  provider     RepositoryProvider
  status       PipelineStatus @default(PENDING)
  branch       String
  commitSha    String         @map("commit_sha")
  workflowName String         @map("workflow_name")
  url          String
  startedAt    DateTime       @map("started_at")
  finishedAt   DateTime?      @map("finished_at")
  duration     Int?
  stages       Json?
  serviceId    String         @map("service_id")
  teamId       String         @map("team_id")
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  service     Service      @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  team        Team         @relation(fields: [teamId], references: [id])
  deployments Deployment[]

  @@unique([externalId, provider])
  @@map("pipeline_runs")
}

model HealthCheckResult {
  id            String            @id @default(uuid())
  status        EnvironmentStatus
  responseTime  Int?              @map("response_time")
  statusCode    Int?              @map("status_code")
  errorMessage  String?           @map("error_message")
  environmentId String            @map("environment_id")
  createdAt     DateTime          @default(now()) @map("created_at")

  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([environmentId, createdAt])
  @@map("health_check_results")
}

model Notification {
  id        String   @id @default(uuid())
  type      String
  title     String
  message   String
  read      Boolean  @default(false)
  metadata  Json?
  userId    String?  @map("user_id")
  teamId    String   @map("team_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id])
  team Team  @relation(fields: [teamId], references: [id])

  @@index([teamId, createdAt])
  @@index([userId, read])
  @@map("notifications")
}

model NotificationChannel {
  id        String      @id @default(uuid())
  type      ChannelType
  name      String
  config    Json
  events    String[]
  enabled   Boolean     @default(true)
  teamId    String      @map("team_id")
  createdAt DateTime    @default(now()) @map("created_at")
  updatedAt DateTime    @updatedAt @map("updated_at")

  team Team @relation(fields: [teamId], references: [id])

  @@map("notification_channels")
}

model AuditLog {
  id        String   @id @default(uuid())
  action    String
  details   Json?
  ipAddress String?  @map("ip_address")
  userId    String   @map("user_id")
  teamId    String   @map("team_id")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])
  team Team @relation(fields: [teamId], references: [id])

  @@index([teamId, createdAt])
  @@map("audit_logs")
}
```

### Docker Compose for Local Development

Create `docker-compose.dev.yml` at the project root:

```yaml
# docker-compose.dev.yml
# Runs supporting services for local development
# The Angular and NestJS apps run natively (not in Docker) for hot reload

version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: shipyard-postgres
    environment:
      POSTGRES_USER: shipyard
      POSTGRES_PASSWORD: shipyard_dev
      POSTGRES_DB: shipyard
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U shipyard']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: shipyard-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

Create `apps/api/.env`:

```env
# Database
DATABASE_URL="postgresql://shipyard:shipyard_dev@localhost:5432/shipyard"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=7d

# GitHub (fill in when you create the GitHub App)
GITHUB_APP_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=

# App
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

### Starting the dev environment

```bash
# From the project root:

# 1. Start PostgreSQL and Redis
docker compose -f docker-compose.dev.yml up -d

# 2. Run database migrations
cd apps/api
npx prisma migrate dev --name init
npx prisma generate

# 3. Start the backend (in one terminal)
cd apps/api
pnpm run start:dev

# 4. Start the frontend (in another terminal)
cd apps/web
pnpm run start
# or: ng serve
```

### Linting, Formatting, and Git Hooks

From the project root:

```bash
# Install ESLint and Prettier
pnpm add -D eslint prettier eslint-config-prettier eslint-plugin-prettier

# Install Husky and lint-staged
pnpm add -D husky lint-staged

# Initialize Husky
npx husky init
```

Create `.husky/pre-commit`:

```bash
#!/bin/sh
pnpm lint-staged
```

Add to root `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,scss,css}": ["prettier --write"]
  }
}
```

Create `.prettierrc` at the project root:

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

Create `.editorconfig`:

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

---

## Chapter 7: Project Structure

Here's the complete folder structure. This is the map for the entire project:

```
shipyard/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema (defined above)
│   │   │   ├── migrations/           # Auto-generated migration files
│   │   │   └── seed.ts               # Database seeder for dev data
│   │   ├── src/
│   │   │   ├── main.ts               # App entry point
│   │   │   ├── app.module.ts         # Root module
│   │   │   ├── common/               # Shared utilities
│   │   │   │   ├── decorators/       # Custom decorators (@CurrentUser, @Roles)
│   │   │   │   ├── filters/          # Exception filters (global error handling)
│   │   │   │   ├── guards/           # Auth guards, role guards
│   │   │   │   ├── interceptors/     # Logging, transform interceptors
│   │   │   │   └── pipes/            # Validation pipes
│   │   │   ├── config/               # Configuration module
│   │   │   │   └── config.module.ts
│   │   │   ├── auth/                 # Authentication module
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── strategies/       # Passport strategies (jwt, local)
│   │   │   │   └── dto/              # Login/Register DTOs
│   │   │   ├── users/                # User management
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   └── users.service.ts
│   │   │   ├── teams/                # Team management
│   │   │   │   ├── teams.module.ts
│   │   │   │   ├── teams.controller.ts
│   │   │   │   └── teams.service.ts
│   │   │   ├── services/             # Service registry
│   │   │   │   ├── services.module.ts
│   │   │   │   ├── services.controller.ts
│   │   │   │   └── services.service.ts
│   │   │   ├── environments/         # Environment management
│   │   │   │   ├── environments.module.ts
│   │   │   │   ├── environments.controller.ts
│   │   │   │   └── environments.service.ts
│   │   │   ├── deployments/          # Deployment tracking
│   │   │   │   ├── deployments.module.ts
│   │   │   │   ├── deployments.controller.ts
│   │   │   │   └── deployments.service.ts
│   │   │   ├── pipelines/            # Pipeline run tracking
│   │   │   │   ├── pipelines.module.ts
│   │   │   │   ├── pipelines.controller.ts
│   │   │   │   └── pipelines.service.ts
│   │   │   ├── health-checks/        # Health check system
│   │   │   │   ├── health-checks.module.ts
│   │   │   │   ├── health-checks.service.ts
│   │   │   │   └── health-checks.processor.ts  # Bull job processor
│   │   │   ├── integrations/         # External integrations
│   │   │   │   ├── integrations.module.ts
│   │   │   │   ├── github/
│   │   │   │   │   ├── github.module.ts
│   │   │   │   │   ├── github.service.ts        # GitHub API client
│   │   │   │   │   └── github-webhook.controller.ts
│   │   │   │   └── docker/
│   │   │   │       ├── docker.module.ts
│   │   │   │       └── docker.service.ts        # Docker API client
│   │   │   ├── notifications/        # Notification system
│   │   │   │   ├── notifications.module.ts
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   ├── notifications.service.ts
│   │   │   │   └── channels/         # Slack, Discord, webhook senders
│   │   │   ├── websocket/            # WebSocket gateway
│   │   │   │   ├── websocket.module.ts
│   │   │   │   └── events.gateway.ts
│   │   │   ├── analytics/            # Deployment analytics
│   │   │   │   ├── analytics.module.ts
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   └── analytics.service.ts
│   │   │   └── prisma/               # Prisma service (database client)
│   │   │       ├── prisma.module.ts
│   │   │       └── prisma.service.ts
│   │   ├── test/                     # E2E tests
│   │   ├── .env                      # Environment variables (git-ignored)
│   │   ├── .env.example              # Template for env vars (committed)
│   │   └── package.json
│   │
│   └── web/                          # Angular frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── app.component.ts
│       │   │   ├── app.config.ts     # App configuration (providers)
│       │   │   ├── app.routes.ts     # Top-level routes
│       │   │   ├── core/             # Singleton services, guards, interceptors
│       │   │   │   ├── auth/
│       │   │   │   │   ├── auth.service.ts
│       │   │   │   │   ├── auth.guard.ts
│       │   │   │   │   └── auth.interceptor.ts  # Attaches JWT to requests
│       │   │   │   ├── websocket/
│       │   │   │   │   └── websocket.service.ts  # Socket.IO connection
│       │   │   │   ├── api/
│       │   │   │   │   └── api.service.ts        # HTTP client wrapper
│       │   │   │   └── theme/
│       │   │   │       └── theme.service.ts      # Dark/light mode
│       │   │   ├── features/         # Feature modules (lazy-loaded routes)
│       │   │   │   ├── dashboard/    # Home dashboard
│       │   │   │   │   ├── dashboard.component.ts
│       │   │   │   │   ├── dashboard.routes.ts
│       │   │   │   │   └── components/
│       │   │   │   │       ├── service-card.component.ts
│       │   │   │   │       ├── recent-deployments.component.ts
│       │   │   │   │       └── health-overview.component.ts
│       │   │   │   ├── services/     # Service detail views
│       │   │   │   │   ├── service-detail.component.ts
│       │   │   │   │   ├── service-list.component.ts
│       │   │   │   │   ├── services.routes.ts
│       │   │   │   │   └── components/
│       │   │   │   │       ├── deployment-timeline.component.ts
│       │   │   │   │       ├── environment-status.component.ts
│       │   │   │   │       └── pipeline-runs.component.ts
│       │   │   │   ├── deployments/  # Deployment feed
│       │   │   │   │   ├── deployments-feed.component.ts
│       │   │   │   │   ├── deployments.routes.ts
│       │   │   │   │   └── components/
│       │   │   │   │       ├── deployment-card.component.ts
│       │   │   │   │       └── deployment-filters.component.ts
│       │   │   │   ├── pipelines/    # Pipeline monitor
│       │   │   │   │   ├── pipeline-monitor.component.ts
│       │   │   │   │   └── pipelines.routes.ts
│       │   │   │   ├── environments/ # Environment overview
│       │   │   │   │   ├── environment-grid.component.ts
│       │   │   │   │   └── environments.routes.ts
│       │   │   │   ├── settings/     # Team settings
│       │   │   │   │   ├── settings.component.ts
│       │   │   │   │   ├── settings.routes.ts
│       │   │   │   │   └── components/
│       │   │   │   │       ├── github-integration.component.ts
│       │   │   │   │       ├── notification-channels.component.ts
│       │   │   │   │       └── team-members.component.ts
│       │   │   │   └── auth/         # Login/Register pages
│       │   │   │       ├── login.component.ts
│       │   │   │       ├── register.component.ts
│       │   │   │       └── auth.routes.ts
│       │   │   ├── shared/           # Shared/reusable components
│       │   │   │   ├── components/
│       │   │   │   │   ├── status-badge.component.ts
│       │   │   │   │   ├── commit-sha.component.ts
│       │   │   │   │   ├── time-ago.component.ts
│       │   │   │   │   ├── empty-state.component.ts
│       │   │   │   │   ├── loading-skeleton.component.ts
│       │   │   │   │   └── confirm-dialog.component.ts
│       │   │   │   ├── layouts/
│       │   │   │   │   ├── main-layout.component.ts    # Sidebar + header + content
│       │   │   │   │   └── auth-layout.component.ts    # Centered card layout
│       │   │   │   └── pipes/
│       │   │   │       ├── relative-time.pipe.ts
│       │   │   │       └── truncate.pipe.ts
│       │   │   └── models/           # Frontend-specific interfaces
│       │   ├── assets/
│       │   ├── environments/
│       │   │   ├── environment.ts
│       │   │   └── environment.prod.ts
│       │   ├── styles.scss
│       │   └── index.html
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared TypeScript types
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker/                           # Docker-related files
│   ├── api.Dockerfile                # Production Dockerfile for backend
│   ├── web.Dockerfile                # Production Dockerfile for frontend
│   └── nginx.conf                    # Nginx config for frontend + API proxy
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, test, build on PR
│   │   └── release.yml               # Build & push Docker images on release
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
│
├── docker-compose.yml                # Production compose (for end users)
├── docker-compose.dev.yml            # Development compose (databases only)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .prettierrc
├── .editorconfig
├── .gitignore
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── CHANGELOG.md
```

---

## Chapter 8: CI/CD for the Project Itself

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: shipyard
          POSTGRES_PASSWORD: test
          POSTGRES_DB: shipyard_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      # Lint everything
      - run: pnpm lint

      # Build shared types first
      - run: pnpm --filter @shipyard/shared build

      # Run backend tests
      - name: Run API tests
        env:
          DATABASE_URL: postgresql://shipyard:test@localhost:5432/shipyard_test
          REDIS_HOST: localhost
          JWT_SECRET: test-secret
        run: |
          pnpm --filter api run db:migrate
          pnpm --filter api run test

      # Run frontend tests
      - name: Run frontend tests
        run: pnpm --filter web run test -- --no-watch --browsers=ChromeHeadless

      # Build everything
      - run: pnpm build

  docker:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/api.Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/api:latest

      - uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/web.Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/web:latest
```

---

# PART 3: BACKEND DEVELOPMENT

---

## Chapter 9: API Design

We're using REST. Why not GraphQL? For this project, REST is the better choice:

- **Simpler to implement and debug.** You can test endpoints with `curl`. GraphQL requires a client library and schema management overhead.
- **Better caching.** REST endpoints map naturally to HTTP caching. GraphQL uses POST for everything, making caching harder.
- **Your team (future users) will expect it.** Most developers are more comfortable with REST.
- **Our data relationships aren't complex enough to justify GraphQL.** We don't have deeply nested, variable-shape queries. Our data is fairly flat and predictable.

### Full API Endpoint Reference

**Auth**

| Method | Path                        | Description           |
| ------ | --------------------------- | --------------------- |
| POST   | `/api/auth/register`        | Create account + team |
| POST   | `/api/auth/login`           | Login, returns JWT    |
| GET    | `/api/auth/me`              | Get current user info |
| POST   | `/api/auth/github/callback` | GitHub OAuth callback |

**Services**

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| GET    | `/api/services`     | List all services for team           |
| GET    | `/api/services/:id` | Get service detail with environments |
| POST   | `/api/services`     | Create a new service                 |
| PATCH  | `/api/services/:id` | Update a service                     |
| DELETE | `/api/services/:id` | Delete a service                     |

**Environments**

| Method | Path                                    | Description                     |
| ------ | --------------------------------------- | ------------------------------- |
| GET    | `/api/services/:serviceId/environments` | List environments for a service |
| POST   | `/api/services/:serviceId/environments` | Create environment              |
| PATCH  | `/api/environments/:id`                 | Update environment              |
| DELETE | `/api/environments/:id`                 | Delete environment              |

**Deployments**

| Method | Path                            | Description                                           |
| ------ | ------------------------------- | ----------------------------------------------------- |
| GET    | `/api/deployments`              | List deployments (filterable by service, env, status) |
| GET    | `/api/deployments/:id`          | Get deployment detail                                 |
| POST   | `/api/deployments`              | Record a new deployment                               |
| POST   | `/api/deployments/:id/rollback` | Trigger rollback to this deployment                   |

**Pipeline Runs**

| Method | Path                 | Description                     |
| ------ | -------------------- | ------------------------------- |
| GET    | `/api/pipelines`     | List pipeline runs (filterable) |
| GET    | `/api/pipelines/:id` | Get pipeline run detail         |

**Notifications**

| Method | Path                             | Description                         |
| ------ | -------------------------------- | ----------------------------------- |
| GET    | `/api/notifications`             | List notifications for current user |
| PATCH  | `/api/notifications/:id/read`    | Mark notification as read           |
| PATCH  | `/api/notifications/read-all`    | Mark all as read                    |
| GET    | `/api/notification-channels`     | List notification channels          |
| POST   | `/api/notification-channels`     | Create channel                      |
| PATCH  | `/api/notification-channels/:id` | Update channel                      |
| DELETE | `/api/notification-channels/:id` | Delete channel                      |

**Analytics**

| Method | Path                          | Description                         |
| ------ | ----------------------------- | ----------------------------------- |
| GET    | `/api/analytics/deployments`  | Deployment frequency & success rate |
| GET    | `/api/analytics/duration`     | Average deploy duration over time   |
| GET    | `/api/analytics/services/:id` | Per-service analytics               |

**Webhooks (Inbound)**

| Method | Path                   | Description                    |
| ------ | ---------------------- | ------------------------------ |
| POST   | `/api/webhooks/github` | Receives GitHub webhook events |

**Health**

| Method | Path          | Description                                 |
| ------ | ------------- | ------------------------------------------- |
| GET    | `/api/health` | Basic health check for the dashboard itself |

**Team**

| Method | Path                       | Description           |
| ------ | -------------------------- | --------------------- |
| GET    | `/api/team`                | Get current team info |
| PATCH  | `/api/team`                | Update team settings  |
| GET    | `/api/team/members`        | List team members     |
| POST   | `/api/team/members/invite` | Invite a team member  |
| DELETE | `/api/team/members/:id`    | Remove a team member  |

---

## Chapter 10: Core Backend Features

### 10.1: Prisma Service (Database Access Layer)

Every NestJS module that needs the database goes through this service. Create it first:

```typescript
// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // onModuleInit runs when NestJS starts up. We connect to the database here.
  async onModuleInit() {
    await this.$connect();
  }

  // onModuleDestroy runs when NestJS shuts down. We disconnect cleanly.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// apps/api/src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() makes PrismaService available everywhere without importing PrismaModule in each module
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 10.2: Authentication (JWT + Teams)

```typescript
// apps/api/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsString()
  @MinLength(2)
  teamName: string;
}
```

```typescript
// apps/api/src/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

```typescript
// apps/api/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email is already taken
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash the password
    // The second argument (12) is the salt rounds — higher = more secure but slower.
    // 12 is a good balance for a web app.
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create the team and user in a single transaction.
    // If either fails, both are rolled back — no orphaned data.
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the team first
      const team = await tx.team.create({
        data: {
          name: dto.teamName,
          // Generate a URL-safe slug from the team name
          slug: dto.teamName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
        },
      });

      // Create the user as the OWNER of this team
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          role: 'OWNER',
          teamId: team.id,
        },
      });

      return { user, team };
    });

    // Generate and return a JWT
    return this.generateAuthResponse(result.user, result.team.name);
  }

  async login(dto: LoginDto) {
    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { team: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateAuthResponse(user, user.team.name);
  }

  async validateUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });
  }

  private generateAuthResponse(user: any, teamName: string) {
    // The JWT payload — this data is embedded in the token.
    // Keep it minimal (the token travels with every request).
    const payload = {
      sub: user.id, // 'sub' (subject) is the standard JWT claim for user ID
      email: user.email,
      teamId: user.teamId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        teamId: user.teamId,
        teamName,
      },
    };
  }
}
```

```typescript
// apps/api/src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

// This strategy runs on every request that uses @UseGuards(AuthGuard('jwt')).
// It extracts the JWT from the Authorization header, verifies it, and attaches
// the user object to the request.

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      // Tell Passport where to find the JWT
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // The secret used to verify the token signature
      secretOrKey: configService.get<string>('JWT_SECRET'),
      // Don't accept expired tokens
      ignoreExpiration: false,
    });
  }

  // This method is called after the JWT is verified.
  // Whatever it returns is attached to request.user.
  async validate(payload: { sub: string; email: string; teamId: string; role: string }) {
    const user = await this.authService.validateUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user; // This becomes req.user
  }
}
```

```typescript
// apps/api/src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Protected route — requires a valid JWT
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Request() req) {
    // req.user is set by JwtStrategy.validate()
    return {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      role: req.user.role,
      teamId: req.user.teamId,
      teamName: req.user.team.name,
    };
  }
}
```

```typescript
// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRATION', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**Custom decorators for cleaner code:**

```typescript
// apps/api/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Instead of writing req.user everywhere, we use @CurrentUser()
// Usage: async getProfile(@CurrentUser() user: User) { ... }
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
```

```typescript
// apps/api/src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() decorator, allow access
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### 10.3: Service Registry

```typescript
// apps/api/src/services/services.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceRequest } from '@shipyard/shared';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(teamId: string) {
    return this.prisma.service.findMany({
      where: { teamId },
      include: {
        environments: {
          orderBy: { order: 'asc' },
          include: {
            currentDeployment: true,
          },
        },
        // Get the most recent deployment for each service
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, teamId },
      include: {
        environments: {
          orderBy: { order: 'asc' },
          include: {
            currentDeployment: true,
          },
        },
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
        pipelineRuns: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async create(teamId: string, dto: CreateServiceRequest) {
    return this.prisma.service.create({
      data: {
        ...dto,
        teamId,
      },
    });
  }

  async update(id: string, teamId: string, data: Partial<CreateServiceRequest>) {
    // Verify the service belongs to this team
    await this.findOne(id, teamId);

    return this.prisma.service.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, teamId: string) {
    await this.findOne(id, teamId);

    return this.prisma.service.delete({
      where: { id },
    });
  }
}
```

```typescript
// apps/api/src/services/services.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServicesService } from './services.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { CreateServiceRequest } from '@shipyard/shared';

@Controller('api/services')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  findAll(@CurrentUser() user) {
    return this.servicesService.findAll(user.teamId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.servicesService.findOne(id, user.teamId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  create(@Body() dto: CreateServiceRequest, @CurrentUser() user) {
    return this.servicesService.create(user.teamId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  update(
    @Param('id') id: string,
    @Body() data: Partial<CreateServiceRequest>,
    @CurrentUser() user,
  ) {
    return this.servicesService.update(id, user.teamId, data);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  delete(@Param('id') id: string, @CurrentUser() user) {
    return this.servicesService.delete(id, user.teamId);
  }
}
```

### 10.4: WebSocket Gateway

```typescript
// apps/api/src/websocket/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  },
  // Namespace keeps WebSocket traffic separate from the REST API
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  constructor(private jwtService: JwtService) {}

  // Called when a client connects
  async handleConnection(client: Socket) {
    try {
      // Extract JWT from the connection handshake
      const token =
        client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Client connected without token, disconnecting');
        client.disconnect();
        return;
      }

      // Verify the JWT
      const payload = this.jwtService.verify(token);

      // Join the client to their team's room
      // This way, events are only broadcast to the relevant team
      client.join(`team:${payload.teamId}`);

      this.logger.log(`Client ${client.id} joined team:${payload.teamId}`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} failed auth: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Public method for other services to emit events
  // When a deployment happens, DeploymentsService calls this
  emitToTeam(teamId: string, event: string, payload: any) {
    this.server.to(`team:${teamId}`).emit(event, {
      type: event,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 10.5: Deployment Tracking

```typescript
// apps/api/src/deployments/deployments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { WsEventType, DeploymentStatus } from '@shipyard/shared';

@Injectable()
export class DeploymentsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll(
    teamId: string,
    filters?: {
      serviceId?: string;
      environmentId?: string;
      status?: DeploymentStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { teamId };
    if (filters?.serviceId) where.serviceId = filters.serviceId;
    if (filters?.environmentId) where.environmentId = filters.environmentId;
    if (filters?.status) where.status = filters.status;

    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where,
        include: {
          service: { select: { name: true, displayName: true } },
          environment: { select: { name: true, displayName: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.deployment.count({ where }),
    ]);

    return { deployments, total };
  }

  async create(
    teamId: string,
    data: {
      serviceId: string;
      environmentId: string;
      commitSha: string;
      commitMessage: string;
      branch: string;
      imageTag?: string;
      triggeredBy: string;
      pipelineRunId?: string;
    },
  ) {
    const deployment = await this.prisma.deployment.create({
      data: {
        ...data,
        teamId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        service: { select: { name: true, displayName: true } },
        environment: { select: { name: true, displayName: true } },
      },
    });

    // Broadcast to the team in real-time
    this.eventsGateway.emitToTeam(teamId, WsEventType.DEPLOYMENT_STARTED, deployment);

    return deployment;
  }

  async complete(id: string, teamId: string, status: 'SUCCESS' | 'FAILED') {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id, teamId },
    });

    if (!deployment) throw new NotFoundException('Deployment not found');

    const finishedAt = new Date();
    // Calculate duration in seconds
    const duration = Math.round((finishedAt.getTime() - deployment.startedAt.getTime()) / 1000);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update the deployment record
      const dep = await tx.deployment.update({
        where: { id },
        data: { status, finishedAt, duration },
        include: {
          service: { select: { name: true, displayName: true } },
          environment: { select: { name: true, displayName: true } },
        },
      });

      // If successful, update the environment's current deployment
      if (status === 'SUCCESS') {
        await tx.environment.update({
          where: { id: deployment.environmentId },
          data: { currentDeploymentId: id },
        });
      }

      return dep;
    });

    // Broadcast the completion event
    const eventType =
      status === 'SUCCESS' ? WsEventType.DEPLOYMENT_COMPLETED : WsEventType.DEPLOYMENT_FAILED;

    this.eventsGateway.emitToTeam(teamId, eventType, updated);

    return updated;
  }

  async rollback(deploymentId: string, teamId: string, triggeredByEmail: string) {
    // Find the deployment we want to rollback to
    const targetDeployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, teamId, status: 'SUCCESS' },
    });

    if (!targetDeployment) {
      throw new NotFoundException('Target deployment not found or was not successful');
    }

    // Create a new deployment that represents the rollback
    const rollbackDeployment = await this.create(teamId, {
      serviceId: targetDeployment.serviceId,
      environmentId: targetDeployment.environmentId,
      commitSha: targetDeployment.commitSha,
      commitMessage: `Rollback to ${targetDeployment.commitSha.substring(0, 7)}`,
      branch: targetDeployment.branch,
      imageTag: targetDeployment.imageTag,
      triggeredBy: triggeredByEmail,
    });

    // In a real scenario, you'd trigger the actual rollback here
    // (e.g., telling Docker to pull and run the old image tag)
    // For now, we immediately mark it as successful
    // TODO: Integrate with Docker to actually rollback

    return this.complete(rollbackDeployment.id, teamId, 'SUCCESS');
  }
}
```

### 10.6: GitHub Integration

```typescript
// apps/api/src/integrations/github/github-webhook.controller.ts
import { Controller, Post, Headers, Body, RawBodyRequest, Req, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { GitHubService } from './github.service';

@Controller('api/webhooks')
export class GitHubWebhookController {
  private logger = new Logger('GitHubWebhook');

  constructor(
    private githubService: GitHubService,
    private config: ConfigService,
  ) {}

  @Post('github')
  async handleWebhook(
    @Headers('x-github-event') event: string,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: any,
  ) {
    // Step 1: Verify the webhook signature
    // This ensures the webhook actually came from GitHub, not an attacker
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (secret) {
      const rawBody = req.rawBody;
      const expectedSignature =
        'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid webhook signature');
        return { status: 'invalid signature' };
      }
    }

    // Step 2: Route to the appropriate handler based on event type
    this.logger.log(`Received GitHub event: ${event}`);

    switch (event) {
      case 'workflow_run':
        await this.githubService.handleWorkflowRun(payload);
        break;
      case 'deployment':
        await this.githubService.handleDeploymentEvent(payload);
        break;
      case 'deployment_status':
        await this.githubService.handleDeploymentStatusEvent(payload);
        break;
      case 'push':
        await this.githubService.handlePushEvent(payload);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event}`);
    }

    return { status: 'ok' };
  }
}
```

```typescript
// apps/api/src/integrations/github/github.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';

@Injectable()
export class GitHubService {
  private logger = new Logger('GitHubService');

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async handleWorkflowRun(payload: any) {
    const { workflow_run, repository } = payload;

    // Find the service that matches this repository
    const service = await this.prisma.service.findFirst({
      where: {
        repositoryUrl: repository.html_url,
      },
    });

    if (!service) {
      this.logger.log(`No service found for repo: ${repository.html_url}`);
      return;
    }

    // Map GitHub's status to our enum
    const statusMap: Record<string, string> = {
      queued: 'PENDING',
      in_progress: 'RUNNING',
      completed:
        workflow_run.conclusion === 'success'
          ? 'SUCCESS'
          : workflow_run.conclusion === 'cancelled'
            ? 'CANCELLED'
            : 'FAILED',
    };

    // Upsert the pipeline run (create if new, update if existing)
    const pipelineRun = await this.prisma.pipelineRun.upsert({
      where: {
        externalId_provider: {
          externalId: String(workflow_run.id),
          provider: 'GITHUB',
        },
      },
      create: {
        externalId: String(workflow_run.id),
        provider: 'GITHUB',
        status: statusMap[workflow_run.status] as any,
        branch: workflow_run.head_branch,
        commitSha: workflow_run.head_sha,
        workflowName: workflow_run.name,
        url: workflow_run.html_url,
        startedAt: new Date(workflow_run.run_started_at),
        finishedAt: workflow_run.updated_at ? new Date(workflow_run.updated_at) : null,
        serviceId: service.id,
        teamId: service.teamId,
      },
      update: {
        status: statusMap[workflow_run.status] as any,
        finishedAt: workflow_run.updated_at ? new Date(workflow_run.updated_at) : null,
      },
    });

    // Calculate duration if completed
    if (pipelineRun.finishedAt && pipelineRun.startedAt) {
      const duration = Math.round(
        (pipelineRun.finishedAt.getTime() - pipelineRun.startedAt.getTime()) / 1000,
      );
      await this.prisma.pipelineRun.update({
        where: { id: pipelineRun.id },
        data: { duration },
      });
    }

    // Broadcast real-time update
    this.eventsGateway.emitToTeam(service.teamId, 'pipeline:updated', pipelineRun);
  }

  async handleDeploymentEvent(payload: any) {
    this.logger.log(
      `Deployment event for ${payload.repository.full_name}: ${payload.deployment.environment}`,
    );
    // GitHub deployment events can be used to create Deployment records
    // This integrates with teams using GitHub's deployment API
  }

  async handleDeploymentStatusEvent(payload: any) {
    this.logger.log(`Deployment status: ${payload.deployment_status.state}`);
    // Update deployment status based on GitHub's deployment status events
  }

  async handlePushEvent(payload: any) {
    this.logger.log(`Push to ${payload.repository.full_name}:${payload.ref}`);
    // Could trigger a status update or record the push event
  }
}
```

### 10.7: Health Check System

```typescript
// apps/api/src/health-checks/health-checks.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';

// This processor runs health checks as background jobs.
// Bull manages the scheduling — we just define what happens when a job runs.

@Processor('health-checks')
export class HealthChecksProcessor {
  private logger = new Logger('HealthChecks');

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  @Process('check')
  async handleHealthCheck(job: Job<{ environmentId: string }>) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: job.data.environmentId },
      include: { service: true },
    });

    if (!environment?.healthCheckUrl) return;

    let status: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'DOWN';
    let responseTime: number | null = null;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    const startTime = Date.now();

    try {
      // Make the HTTP request to the health check URL
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(environment.healthCheckUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      responseTime = Date.now() - startTime;
      statusCode = response.status;

      // 2xx = healthy, 5xx = down, anything else = degraded
      if (response.ok) {
        status = responseTime > 5000 ? 'DEGRADED' : 'HEALTHY'; // Slow = degraded
      } else if (response.status >= 500) {
        status = 'DOWN';
      } else {
        status = 'DEGRADED';
      }
    } catch (error) {
      responseTime = Date.now() - startTime;
      errorMessage = error.message;
      status = 'DOWN';
    }

    // Record the result
    await this.prisma.healthCheckResult.create({
      data: {
        status,
        responseTime,
        statusCode,
        errorMessage,
        environmentId: environment.id,
      },
    });

    // Update the environment's status if it changed
    const previousStatus = environment.status;
    if (status !== previousStatus) {
      await this.prisma.environment.update({
        where: { id: environment.id },
        data: {
          status,
          lastHealthCheckAt: new Date(),
        },
      });

      // Broadcast the status change
      this.eventsGateway.emitToTeam(environment.teamId, 'health:updated', {
        environmentId: environment.id,
        environmentName: environment.displayName,
        serviceName: environment.service.displayName,
        previousStatus,
        currentStatus: status,
        responseTime,
      });

      this.logger.log(
        `${environment.service.name}/${environment.name}: ${previousStatus} → ${status}`,
      );
    }
  }
}
```

```typescript
// apps/api/src/health-checks/health-checks.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthChecksService implements OnModuleInit {
  private logger = new Logger('HealthChecksService');

  constructor(
    @InjectQueue('health-checks') private healthQueue: Queue,
    private prisma: PrismaService,
  ) {}

  // When the app starts, schedule health checks for all environments
  async onModuleInit() {
    await this.scheduleAllHealthChecks();
  }

  async scheduleAllHealthChecks() {
    // Clear any existing scheduled jobs
    await this.healthQueue.obliterate({ force: true });

    // Find all environments with health check URLs
    const environments = await this.prisma.environment.findMany({
      where: {
        healthCheckUrl: { not: null },
      },
    });

    for (const env of environments) {
      // Add a repeatable job for each environment
      await this.healthQueue.add(
        'check',
        { environmentId: env.id },
        {
          repeat: {
            every: (env.healthCheckInterval || 30) * 1000, // Convert seconds to milliseconds
          },
          // Unique key so the same environment doesn't get duplicate jobs
          jobId: `health-${env.id}`,
        },
      );

      this.logger.log(`Scheduled health check for ${env.name} every ${env.healthCheckInterval}s`);
    }
  }

  // Call this when a new environment is created or its health check config changes
  async rescheduleForEnvironment(environmentId: string) {
    // Remove existing job
    await this.healthQueue.removeRepeatable('check', {
      every: undefined,
      jobId: `health-${environmentId}`,
    });

    const env = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });

    if (env?.healthCheckUrl) {
      await this.healthQueue.add(
        'check',
        { environmentId: env.id },
        {
          repeat: { every: (env.healthCheckInterval || 30) * 1000 },
          jobId: `health-${env.id}`,
        },
      );
    }
  }
}
```

### 10.8: Notification Service

```typescript
// apps/api/src/notifications/notifications.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { WsEventType } from '@shipyard/shared';

@Injectable()
export class NotificationsService {
  private logger = new Logger('NotificationsService');

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // Create an in-app notification and optionally send to external channels
  async notify(params: {
    teamId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
    userId?: string; // If targeting a specific user
  }) {
    // Create the in-app notification
    const notification = await this.prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata || {},
        userId: params.userId,
        teamId: params.teamId,
      },
    });

    // Push it to connected clients via WebSocket
    this.eventsGateway.emitToTeam(params.teamId, WsEventType.NOTIFICATION_NEW, notification);

    // Send to external channels (Slack, Discord, etc.)
    await this.sendToExternalChannels(params.teamId, params.type, params.title, params.message);

    return notification;
  }

  private async sendToExternalChannels(
    teamId: string,
    eventType: string,
    title: string,
    message: string,
  ) {
    // Find all enabled channels that listen for this event type
    const channels = await this.prisma.notificationChannel.findMany({
      where: {
        teamId,
        enabled: true,
        events: { has: eventType },
      },
    });

    for (const channel of channels) {
      try {
        const config = channel.config as any;

        switch (channel.type) {
          case 'SLACK':
            await this.sendSlackNotification(config.webhookUrl, title, message);
            break;
          case 'DISCORD':
            await this.sendDiscordNotification(config.webhookUrl, title, message);
            break;
          case 'WEBHOOK':
            await this.sendWebhookNotification(config.url, { eventType, title, message });
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send to channel ${channel.name}: ${error.message}`);
      }
    }
  }

  private async sendSlackNotification(webhookUrl: string, title: string, message: string) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: title },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: message },
          },
        ],
      }),
    });
  }

  private async sendDiscordNotification(webhookUrl: string, title: string, message: string) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: message,
            color: 0x00ff00, // Green; change based on event type
          },
        ],
      }),
    });
  }

  private async sendWebhookNotification(url: string, payload: any) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Fetch notifications for a user
  async findForUser(userId: string, teamId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: {
        teamId,
        OR: [
          { userId }, // Notifications targeted at this user
          { userId: null }, // Team-wide notifications
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string, teamId: string) {
    return this.prisma.notification.updateMany({
      where: {
        teamId,
        OR: [{ userId }, { userId: null }],
        read: false,
      },
      data: { read: true },
    });
  }
}
```

### 10.9: App Module (Wiring Everything Together)

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { EnvironmentsModule } from './environments/environments.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { HealthChecksModule } from './health-checks/health-checks.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    // Load .env file
    ConfigModule.forRoot({ isGlobal: true }),

    // Configure Bull (job queue) with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),

    // Core
    PrismaModule,
    WebsocketModule,

    // Features
    AuthModule,
    ServicesModule,
    EnvironmentsModule,
    DeploymentsModule,
    PipelinesModule,
    HealthChecksModule,
    NotificationsModule,
    AnalyticsModule,

    // Integrations
    IntegrationsModule,
  ],
})
export class AppModule {}
```

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Enable raw body for webhook signature verification
    rawBody: true,
  });

  // Security headers
  app.use(helmet());

  // Enable CORS for the Angular frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  });

  // Global validation pipe — automatically validates DTOs
  // with class-validator decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in the DTO
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚢 Shipyard API running on http://localhost:${port}`);
}
bootstrap();
```

---

## Chapter 11: Background Jobs & Workers

We already set up Bull for health checks. Here's the complete pattern for background job processing:

```typescript
// apps/api/src/health-checks/health-checks.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HealthChecksService } from './health-checks.service';
import { HealthChecksProcessor } from './health-checks.processor';

@Module({
  imports: [
    // Register the 'health-checks' queue
    BullModule.registerQueue({
      name: 'health-checks',
    }),
  ],
  providers: [HealthChecksService, HealthChecksProcessor],
  exports: [HealthChecksService],
})
export class HealthChecksModule {}
```

For other background jobs (data cleanup, GitHub API polling), follow the same pattern: create a queue, a processor, and a service that schedules jobs.

**Common gotcha:** Bull requires Redis. If Redis isn't running, the app will fail to start. Always make sure `docker compose -f docker-compose.dev.yml up -d` runs before `pnpm run start:dev`.

---

## Chapter 12: Error Handling, Logging, and Observability

```typescript
// apps/api/src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// This filter catches ALL exceptions and formats them consistently.
// Without it, NestJS returns different error shapes for different error types.

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || message;
    }

    // Log the error (structured logging)
    this.logger.error({
      statusCode: status,
      path: request.url,
      method: request.method,
      message,
      // Only include stack trace for 500 errors
      ...(status >= 500 && exception instanceof Error ? { stack: exception.stack } : {}),
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

Register it globally in `main.ts`:

```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

---

# PART 4: FRONTEND DEVELOPMENT

---

## Chapter 13: Angular Project Architecture

### State Management Strategy

Here's the rule of thumb — no ambiguity:

- **Angular Signals:** Use for component-level state and simple shared state. When a piece of state is used by 1-3 components in the same feature, a signal service is perfect.

- **RxJS:** Use for async streams — WebSocket events, HTTP requests, anything that involves multiple values over time. Signals are great for "current value" but RxJS excels at "stream of events."

- **NgRx:** Don't use it. Not for v1.0. NgRx adds massive boilerplate for a project this size. If the app grows to 50+ components with complex shared state, revisit this decision. For now, signal-based services cover everything we need.

### Core Services

```typescript
// apps/web/src/app/core/auth/auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest, RegisterRequest } from '@shipyard/shared';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Private writable signal — only this service can modify it
  private currentUser = signal<AuthResponse['user'] | null>(null);
  private token = signal<string | null>(null);

  // Public read-only computed signals — components can read but not write
  user = computed(() => this.currentUser());
  isAuthenticated = computed(() => !!this.token());
  teamId = computed(() => this.currentUser()?.teamId ?? null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    // On app startup, check if there's a saved token in localStorage
    const savedToken = localStorage.getItem('shipyard_token');
    const savedUser = localStorage.getItem('shipyard_user');
    if (savedToken && savedUser) {
      this.token.set(savedToken);
      this.currentUser.set(JSON.parse(savedUser));
    }
  }

  async login(credentials: LoginRequest): Promise<void> {
    const response = await this.http.post<AuthResponse>('/api/auth/login', credentials).toPromise();

    if (response) {
      this.setAuth(response);
    }
  }

  async register(data: RegisterRequest): Promise<void> {
    const response = await this.http.post<AuthResponse>('/api/auth/register', data).toPromise();

    if (response) {
      this.setAuth(response);
    }
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('shipyard_token');
    localStorage.removeItem('shipyard_user');
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this.token();
  }

  private setAuth(response: AuthResponse): void {
    this.token.set(response.accessToken);
    this.currentUser.set(response.user);
    localStorage.setItem('shipyard_token', response.accessToken);
    localStorage.setItem('shipyard_user', JSON.stringify(response.user));
  }
}
```

```typescript
// apps/web/src/app/core/auth/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

// Functional interceptor (modern Angular pattern — no class needed)
// Automatically attaches the JWT to every outgoing HTTP request
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
```

```typescript
// apps/web/src/app/core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login if not authenticated
  return router.createUrlTree(['/auth/login']);
};
```

### WebSocket Service

```typescript
// apps/web/src/app/core/websocket/websocket.service.ts
import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../auth/auth.service';
import { WsEvent, WsEventType } from '@shipyard/shared';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;

  // Use a Subject (RxJS) for WebSocket events because they're a stream of values
  // over time — exactly what RxJS is designed for
  private events$ = new Subject<WsEvent>();

  // Signal for connection status — it's a single current value, perfect for signals
  connectionStatus = signal<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  constructor(private authService: AuthService) {}

  connect(): void {
    const token = this.authService.getToken();
    if (!token) return;

    // Connect to the /events namespace on the backend
    this.socket = io(`${environment.wsUrl}/events`, {
      auth: { token },
      reconnection: true, // Auto-reconnect
      reconnectionAttempts: 10, // Try 10 times
      reconnectionDelay: 1000, // Start with 1s delay
      reconnectionDelayMax: 30000, // Max 30s between attempts
    });

    this.socket.on('connect', () => {
      this.connectionStatus.set('connected');
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      this.connectionStatus.set('disconnected');
      console.log('WebSocket disconnected');
    });

    this.socket.on('reconnect_attempt', () => {
      this.connectionStatus.set('reconnecting');
    });

    // Listen for all event types and push them into the Subject
    Object.values(WsEventType).forEach((eventType) => {
      this.socket!.on(eventType, (data: WsEvent) => {
        this.events$.next(data);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connectionStatus.set('disconnected');
  }

  // Components subscribe to specific event types
  on<T>(eventType: WsEventType) {
    return this.events$
      .asObservable()
      .pipe
      // Only emit events of the requested type
      // filter is imported from 'rxjs'
      ();
  }

  // Convenience method: get all events
  allEvents() {
    return this.events$.asObservable();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
```

### Theme Service (Dark Mode)

```typescript
// apps/web/src/app/core/theme/theme.service.ts
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal<boolean>(true); // Default to dark mode for a dev tool

  constructor() {
    // Check saved preference
    const saved = localStorage.getItem('shipyard_theme');
    if (saved) {
      this.isDark.set(saved === 'dark');
    }

    // Apply theme class to <body> whenever isDark changes
    effect(() => {
      document.body.classList.toggle('dark-theme', this.isDark());
      document.body.classList.toggle('light-theme', !this.isDark());
      localStorage.setItem('shipyard_theme', this.isDark() ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.isDark.update((dark) => !dark);
  }
}
```

### Routing

```typescript
// apps/web/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Auth pages — no sidebar, centered card layout
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Main app — requires authentication, has sidebar layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'services',
        loadChildren: () =>
          import('./features/services/services.routes').then((m) => m.SERVICES_ROUTES),
      },
      {
        path: 'deployments',
        loadChildren: () =>
          import('./features/deployments/deployments.routes').then((m) => m.DEPLOYMENTS_ROUTES),
      },
      {
        path: 'pipelines',
        loadChildren: () =>
          import('./features/pipelines/pipelines.routes').then((m) => m.PIPELINES_ROUTES),
      },
      {
        path: 'environments',
        loadChildren: () =>
          import('./features/environments/environments.routes').then((m) => m.ENVIRONMENTS_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },

  // Catch-all redirect
  { path: '**', redirectTo: 'dashboard' },
];
```

### App Configuration

```typescript
// apps/web/src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
  ],
};
```

### Shared UI Components

```typescript
// apps/web/src/app/shared/components/status-badge.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

// A simple reusable badge that shows colored dots + text for statuses

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [class]="'status-' + status()">
      <span class="status-dot"></span>
      {{ label() || status() }}
    </span>
  `,
  styles: [
    `
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .status-HEALTHY .status-dot,
      .status-SUCCESS .status-dot {
        background: #22c55e;
      }
      .status-HEALTHY,
      .status-SUCCESS {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }

      .status-DEGRADED .status-dot,
      .status-IN_PROGRESS .status-dot,
      .status-RUNNING .status-dot {
        background: #eab308;
      }
      .status-DEGRADED,
      .status-IN_PROGRESS,
      .status-RUNNING {
        background: rgba(234, 179, 8, 0.1);
        color: #eab308;
      }

      .status-DOWN .status-dot,
      .status-FAILED .status-dot {
        background: #ef4444;
      }
      .status-DOWN,
      .status-FAILED {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      .status-UNKNOWN .status-dot,
      .status-PENDING .status-dot {
        background: #6b7280;
      }
      .status-UNKNOWN,
      .status-PENDING {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  status = input.required<string>();
  label = input<string>();
}
```

---

## Chapter 14: Core Frontend Features — Highlights

Due to the massive scope, I'll show the key architectural patterns. Each feature follows the same structure:

### Dashboard Home

```typescript
// apps/web/src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ServiceCardComponent } from './components/service-card.component';
import { RecentDeploymentsComponent } from './components/recent-deployments.component';
import { ServiceSummary, DeploymentSummary } from '@shipyard/shared';
import { WebSocketService } from '../../core/websocket/websocket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ServiceCardComponent, RecentDeploymentsComponent],
  template: `
    <div class="dashboard">
      <header class="dashboard-header">
        <h1>Mission Control</h1>
        <div class="connection-indicator" [class]="wsService.connectionStatus()">
          {{ wsService.connectionStatus() }}
        </div>
      </header>

      <!-- Services grid -->
      <section class="services-grid">
        @for (service of services(); track service.id) {
          <app-service-card [service]="service" />
        } @empty {
          <div class="empty-state">
            <p>No services configured yet.</p>
            <a routerLink="/services" class="add-service-link">Add your first service</a>
          </div>
        }
      </section>

      <!-- Recent deployments feed -->
      <section class="recent-deployments">
        <h2>Recent Deployments</h2>
        <app-recent-deployments [deployments]="recentDeployments()" />
      </section>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  wsService = inject(WebSocketService);

  services = signal<ServiceSummary[]>([]);
  recentDeployments = signal<DeploymentSummary[]>([]);

  ngOnInit() {
    // Fetch initial data
    this.loadServices();
    this.loadRecentDeployments();

    // Connect WebSocket for real-time updates
    this.wsService.connect();

    // Listen for deployment events and refresh
    this.wsService.allEvents().subscribe((event) => {
      if (event.type.startsWith('deployment:')) {
        this.loadServices();
        this.loadRecentDeployments();
      }
    });
  }

  private loadServices() {
    this.http.get<ServiceSummary[]>('/api/services').subscribe({
      next: (data) => this.services.set(data),
      error: (err) => console.error('Failed to load services', err),
    });
  }

  private loadRecentDeployments() {
    this.http.get<{ deployments: DeploymentSummary[] }>('/api/deployments?limit=10').subscribe({
      next: (data) => this.recentDeployments.set(data.deployments),
      error: (err) => console.error('Failed to load deployments', err),
    });
  }
}
```

### Main Layout (Sidebar + Content)

```typescript
// apps/web/src/app/shared/layouts/main-layout.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-layout" [class.dark]="themeService.isDark()">
      <!-- Sidebar -->
      <nav class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-icon">⚓</span>
          <span class="brand-name">Shipyard</span>
        </div>

        <ul class="sidebar-nav">
          <li><a routerLink="/dashboard" routerLinkActive="active">Dashboard</a></li>
          <li><a routerLink="/services" routerLinkActive="active">Services</a></li>
          <li><a routerLink="/deployments" routerLinkActive="active">Deployments</a></li>
          <li><a routerLink="/pipelines" routerLinkActive="active">Pipelines</a></li>
          <li><a routerLink="/environments" routerLinkActive="active">Environments</a></li>
        </ul>

        <div class="sidebar-footer">
          <a routerLink="/settings" routerLinkActive="active">Settings</a>
          <button (click)="themeService.toggle()" class="theme-toggle">
            {{ themeService.isDark() ? '☀️' : '🌙' }}
          </button>
          <button (click)="authService.logout()" class="logout-btn">Logout</button>
        </div>
      </nav>

      <!-- Main content -->
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .app-layout {
        display: flex;
        height: 100vh;
        background: var(--bg-primary);
        color: var(--text-primary);
      }
      .sidebar {
        width: 240px;
        background: var(--bg-sidebar);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding: 1rem 0;
      }
      .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0 1.25rem;
        margin-bottom: 2rem;
        font-size: 1.25rem;
        font-weight: 700;
      }
      .sidebar-nav {
        list-style: none;
        padding: 0;
        margin: 0;
        flex: 1;
      }
      .sidebar-nav a {
        display: block;
        padding: 0.625rem 1.25rem;
        color: var(--text-secondary);
        text-decoration: none;
        transition: all 0.15s;
      }
      .sidebar-nav a:hover,
      .sidebar-nav a.active {
        color: var(--text-primary);
        background: var(--bg-hover);
      }
      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
      }
    `,
  ],
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
}
```

---

# PART 5: INTEGRATION & DEVOPS

---

## Chapter 19: GitHub App Setup

### Step-by-step:

1. Go to **GitHub Settings → Developer settings → GitHub Apps → New GitHub App**

2. Fill in:
   - **App name:** `Shipyard Dashboard` (or your team name + Shipyard)
   - **Homepage URL:** `http://localhost:4200` (for now)
   - **Callback URL:** `http://localhost:3000/api/auth/github/callback`
   - **Webhook URL:** Your publicly accessible URL (use `ngrok` for development: `ngrok http 3000` gives you a public URL that tunnels to your local backend)
   - **Webhook secret:** Generate a random string (`openssl rand -hex 20`)

3. **Permissions needed:**
   - Repository: `Actions` (read), `Contents` (read), `Deployments` (read), `Metadata` (read)
   - Organization: `Members` (read)

4. **Subscribe to events:** `Workflow run`, `Deployment`, `Deployment status`, `Push`

5. After creation, note down: App ID, Client ID, Client Secret, and download the private key.

6. Put these in your `.env` file.

**Gotcha:** During development, you need a public URL for webhooks. Use `ngrok http 3000` and update the webhook URL in your GitHub App settings. The free tier gives you a new URL each time, so you'll need to update it every time you restart ngrok.

---

## Chapter 20: Docker Integration

```typescript
// apps/api/src/integrations/docker/docker.service.ts
import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';

@Injectable()
export class DockerService {
  private docker: Docker;
  private logger = new Logger('DockerService');

  constructor() {
    // Connect to the Docker daemon
    // On macOS, Docker Desktop exposes the socket at this path
    // On Linux, it's usually /var/run/docker.sock
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    });
  }

  // List all running containers
  async listContainers() {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map((c) => ({
      id: c.Id.substring(0, 12),
      name: c.Names[0]?.replace('/', '') || 'unknown',
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: c.Ports.map((p) => `${p.PublicPort || ''}:${p.PrivatePort}`).filter(Boolean),
      created: new Date(c.Created * 1000).toISOString(),
    }));
  }

  // Get detailed info about one container
  async getContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();
    return {
      id: info.Id.substring(0, 12),
      name: info.Name.replace('/', ''),
      image: info.Config.Image,
      state: info.State,
      created: info.Created,
      env: info.Config.Env,
      mounts: info.Mounts,
    };
  }

  // Stream container logs
  async getContainerLogs(containerId: string, tail = 100): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });
    return logs.toString();
  }

  // Get container resource usage
  async getContainerStats(containerId: string) {
    const container = this.docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });
    return {
      cpuPercent: this.calculateCpuPercent(stats),
      memoryUsage: stats.memory_stats.usage,
      memoryLimit: stats.memory_stats.limit,
      memoryPercent: (stats.memory_stats.usage / stats.memory_stats.limit) * 100,
      networkRx: stats.networks?.eth0?.rx_bytes || 0,
      networkTx: stats.networks?.eth0?.tx_bytes || 0,
    };
  }

  private calculateCpuPercent(stats: any): number {
    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.online_cpus || 1;
    return systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;
  }
}
```

**Gotcha:** For Docker integration to work, the Shipyard backend container needs access to the Docker socket. In `docker-compose.yml`, mount it:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

This gives Shipyard the same access as running `docker` commands on the host. In production, consider using Docker's TCP API with TLS for remote access.

---

# PART 6: DEPLOYMENT & DISTRIBUTION

---

## Chapter 23: Dockerizing the Dashboard

### Backend Dockerfile

```dockerfile
# docker/api.Dockerfile
# Multi-stage build: build stage uses full Node, production uses slim

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build shared types
RUN pnpm --filter @shipyard/shared build

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build the API
RUN pnpm --filter api build

# Stage 2: Production
FROM node:20-alpine AS runner

RUN npm install -g pnpm

WORKDIR /app

# Copy only production dependencies and built output
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist packages/shared/dist/
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/dist apps/api/dist/
COPY --from=builder /app/apps/api/prisma apps/api/prisma/
COPY --from=builder /app/apps/api/node_modules/.prisma apps/api/node_modules/.prisma/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Don't run as root in production
USER node

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
```

### Frontend Dockerfile

```dockerfile
# docker/web.Dockerfile

# Stage 1: Build Angular
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

RUN pnpm --filter @shipyard/shared build
RUN pnpm --filter web build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built Angular files
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

```nginx
# docker/nginx.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Serve Angular app — all routes fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the backend
    location /api/ {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy WebSocket connections
    location /events/ {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
```

## Chapter 24: Production Docker Compose

```yaml
# docker-compose.yml
# This is what end users run to spin up the entire dashboard

version: '3.8'

services:
  web:
    image: ghcr.io/your-username/shipyard-web:latest
    ports:
      - '${PORT:-8080}:80'
    depends_on:
      - api
    restart: unless-stopped

  api:
    image: ghcr.io/your-username/shipyard-api:latest
    environment:
      DATABASE_URL: postgresql://shipyard:${DB_PASSWORD:-changeme}@postgres:5432/shipyard
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET:-please-change-this-in-production}
      CORS_ORIGIN: http://localhost:${PORT:-8080}
      GITHUB_APP_ID: ${GITHUB_APP_ID:-}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET:-}
      GITHUB_WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET:-}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: shipyard
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
      POSTGRES_DB: shipyard
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U shipyard']
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

Users start the dashboard with:

```bash
curl -O https://raw.githubusercontent.com/your-username/shipyard/main/docker-compose.yml
docker compose up -d
# Dashboard available at http://localhost:8080
```

---

## Chapter 26: Open-Source Readiness

**License recommendation: MIT.** It's the most permissive, most recognized, and removes barriers to adoption. Companies can use Shipyard without legal review. If you want to prevent companies from selling a closed-source version, use **AGPL-3.0** instead — but MIT will get more adoption.

Your README should include:

- Logo + one-line description
- Screenshot or GIF of the dashboard
- "Quick Start" section (3 steps: clone, docker compose up, open browser)
- Feature list with screenshots
- Architecture overview
- Contributing guide link
- License badge

---

# PART 7: STRETCH GOALS & FUTURE ROADMAP

---

## Chapter 27: Plugin/Adapter Architecture

The integration layer should use an **adapter interface**:

```typescript
// packages/shared/src/adapters.ts

export interface CIAdapter {
  name: string;
  provider: string;

  // Called when a webhook is received
  handleWebhook(payload: any): Promise<PipelineRunData | null>;

  // Called to fetch pipeline runs from the CI provider's API
  fetchPipelineRuns(repoUrl: string, options?: { limit?: number }): Promise<PipelineRunData[]>;

  // Verify webhook signature
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;
}

export interface ContainerAdapter {
  name: string;
  provider: string;

  listContainers(): Promise<ContainerInfo[]>;
  getContainer(id: string): Promise<ContainerDetail>;
  getLogs(id: string, tail?: number): Promise<string>;
  getStats(id: string): Promise<ContainerStats>;

  // For rollbacks
  restartContainer(id: string): Promise<void>;
  pullAndRestart(id: string, imageTag: string): Promise<void>;
}
```

Community members implement these interfaces for their CI/CD system. The core dashboard doesn't care whether events come from GitHub Actions, GitLab CI, or Jenkins — it all goes through the same interface.

## Chapter 28: Kubernetes Support

When users run Kubernetes instead of plain Docker, swap the Docker adapter for a Kubernetes adapter that uses the Kubernetes API (via `@kubernetes/client-node`). Key additions: namespace support, pod status tracking, replica set management, and rolling update visibility. The data model stays the same — a "container" in Docker maps to a "pod" in Kubernetes, and both produce the same `ContainerInfo` shape.

## Chapter 29–32: Multi-Tenancy, Audit Logs, PWA, AI Features

These are already partially scaffolded:

- **Multi-tenancy:** The `teamId` on every entity already supports multiple teams. Add team switching UI and invitation flow.
- **Audit log:** The `AuditLog` entity is in the schema. Add an interceptor that logs mutations automatically.
- **PWA:** Angular's `@angular/pwa` schematic adds a service worker in one command: `ng add @angular/pwa`. Add push notification support via the Web Push API.
- **AI features:** Call an LLM API with deployment logs + error messages to get root cause suggestions. Use structured output to generate "deployment summary" cards.

---

# TIMELINE & BUILD ORDER

---

## Recommended Build Phases

Assuming 10–15 hours/week alongside your full-time job:

### Phase 1: Foundation (Weeks 1–3)

- Set up monorepo, install all dependencies
- Create Prisma schema, run initial migration
- Build auth module (register, login, JWT)
- Build basic Angular shell (layout, routing, login page)
- **Milestone:** You can register, login, and see an empty dashboard

### Phase 2: Core Data (Weeks 4–6)

- Service CRUD (backend + frontend)
- Environment CRUD
- Manual deployment recording (POST endpoint + basic form)
- **Milestone:** You can create services, add environments, and manually log deployments

### Phase 3: Real-Time (Weeks 7–9)

- WebSocket gateway
- Connect Angular to WebSocket
- Dashboard home with live service cards
- Deployment feed component
- **Milestone:** Two browser tabs show the same dashboard; creating a deployment in one tab appears live in the other

### Phase 4: GitHub Integration (Weeks 10–12)

- Create GitHub App
- Build webhook handler
- Pipeline run tracking
- Auto-create deployments from workflow completions
- **Milestone:** Push code to GitHub → Shipyard shows the pipeline running → deployment appears automatically

### Phase 5: Health & Monitoring (Weeks 13–15)

- Health check system with Bull
- Health status on environment cards
- Notification system (in-app + Slack/Discord)
- **Milestone:** Configure a health check URL → Shipyard monitors it → notifies you when it goes down

### Phase 6: Polish & Ship (Weeks 16–18)

- Deployment analytics charts
- Rollback functionality
- Dark theme polish
- Responsive design pass
- Docker Compose production setup
- README, docs, CONTRIBUTING.md
- **Milestone: v1.0 release on GitHub** 🚀

### Phase 7: Stretch Goals (Weeks 19+)

- Docker container integration
- Plugin architecture
- Kubernetes support
- PWA
- AI features

**Total to v1.0: approximately 4–5 months.** This is a real project with real complexity — don't rush it. Each phase gives you a usable, demo-able product.

---

# IMPORTANT: WHAT TO SPLIT INTO SEPARATE CONVERSATIONS

This guide covers architecture and core implementation. For the following topics, start a new conversation with a specific prompt because they each need deep, focused attention:

1. **"Help me build the complete Angular UI for Shipyard's dashboard, service detail, and deployment feed pages. Here's the data model and API endpoints: [paste relevant sections]. I want Angular Material + Tailwind, dark theme, responsive design."**

2. **"Help me build a complete deployment analytics module — backend queries + Angular charts using ngx-echarts. I need: deployment frequency (daily/weekly bar chart), success rate (line chart), deploy duration trend (area chart), and environment health timeline."**

3. **"Walk me through creating a GitHub App from scratch, setting up ngrok for local webhook testing, and building the complete webhook handler for workflow_run, deployment, and push events. Here's my NestJS backend structure: [paste relevant sections]."**

4. **"Help me implement a complete real-time notification system with NestJS (Bull queues + Socket.IO) and Angular (toast notifications + notification center panel). Support Slack and Discord webhook integrations."**

5. **"Help me write production Dockerfiles, nginx config, and a user-friendly docker-compose.yml for Shipyard. Include health checks, auto-restart, volume persistence, and environment variable configuration."**

6. **"Help me write a complete test suite for Shipyard's backend — unit tests for services, integration tests for controllers, and E2E tests for the auth + deployment flow. Using Vitest with NestJS."**

---

_This guide is your map. The territory is vast, but every inch of it is buildable. One chapter at a time, Raz. Ship it._ ⚓
