# How Shipyard Works — A Complete Guide for Junior Developers

> This document explains the real-world problem Shipyard solves, every concept in the system (services, environments, deployments, pipelines, health checks, notifications), and how GitHub integration ties it all together. Read top to bottom once. Come back as a reference.

---

## Part 1 — The Problem We're Solving

### What happens when a team ships software

Imagine a company that has a web app — let's call it **Acme**. The Acme team has:

- A backend API written in Node.js
- A frontend written in React
- A mobile app written in Flutter
- A background worker that sends emails

Each of these is a separate **codebase**, often in a separate Git repository. The team has multiple developers making changes every day. Each change eventually needs to reach users.

The journey from "developer writes code on their laptop" to "user can use the new feature" is called **software delivery**, and it looks roughly like this:

```
Developer writes code
       ↓
Pushes to Git (GitHub)
       ↓
Automated tests run (CI — Continuous Integration)
       ↓
Code is built/compiled into a deployable artifact (Docker image, zip file, etc.)
       ↓
Artifact is deployed to a server (CD — Continuous Deployment)
       ↓
Server runs the new version
       ↓
Users see the new feature
```

In a small team this might be one person doing all of this manually. In a larger team, every step is automated and can involve dozens of services running simultaneously. Things break. Deploys fail. A new version crashes production. You need to know:

- What version is running right now in production?
- When was the last deploy?
- Who deployed it?
- Which commit is live?
- Is the service healthy?
- Did the deploy to staging succeed before going to production?

Without tooling, the answer to all of these questions is "I don't know — let me check Slack/email/GitHub/server logs." That's the problem Shipyard solves.

**Shipyard is a self-hosted dashboard that gives your team a single place to see everything: what's running, where, when it was deployed, whether it's healthy, and what's coming through the pipeline.**

---

## Part 2 — Core Concepts Explained

### 2.1 — Services

A **service** in Shipyard maps to one deployable thing. Usually this means one Git repository + one Docker image.

Examples:

- `acme-api` — the Node.js backend
- `acme-web` — the React frontend
- `acme-worker` — the email background worker
- `acme-mobile-bff` — a backend-for-frontend for the mobile app

Each service in Shipyard stores:

- Its **name** (a short identifier like `acme-api`)
- Its **display name** (human-readable, like "Acme API")
- Its **repository URL** (link to the GitHub/GitLab repo)
- Its **default branch** (usually `main`)
- Its **Docker image** name (e.g., `acme/api`)

Services are the top-level entities. Everything else — environments, deployments, pipelines — belongs to a service.

**Why do we need this concept?**
Because you're not deploying code in general — you're deploying _specific things_. The service is the "what." The environment is the "where." The deployment is the "when and which version."

---

### 2.2 — Environments

A **environment** is a running instance of a service. The same service can be running in multiple environments simultaneously.

The three standard environments almost every company uses:

| Environment           | Purpose                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| **Development (dev)** | Developers test their own changes here. Can be broken at any time.                                      |
| **Staging**           | A production-like copy used for final testing before release. Should match prod as closely as possible. |
| **Production (prod)** | What real users interact with. Stability matters most here.                                             |

So the `acme-api` service might have three environments:

- `acme-api / dev` — running on `dev.api.acme.com`
- `acme-api / staging` — running on `staging.api.acme.com`
- `acme-api / production` — running on `api.acme.com`

Each environment in Shipyard stores:

- Which service it belongs to
- Its name (`dev`, `staging`, `production`)
- Its URL (so health checks can ping it)
- The **current deployment** (which version of the code is running right now)
- Whether health checks are enabled and how often to run them

**Why do we need multiple environments?**

Because you don't want to test things directly in production. If you deploy broken code to production, real users are affected immediately. The environment chain is a safety net:

```
Code change → deploys to dev (test it works) → deploys to staging (final QA) → deploys to production
```

Each step is a gate. If staging breaks, production is safe. This is called a **promotion pipeline** (not to be confused with CI pipelines, which we'll cover next).

---

### 2.3 — Deployments

A **deployment** is a record of "version X of service Y was deployed to environment Z at time T."

It answers the questions:

- What commit was deployed? (the Git commit SHA, like `a3f9c12`)
- What Docker image/tag was used? (like `acme/api:1.4.2`)
- Who triggered it?
- When did it start and finish?
- Did it succeed or fail?
- If it failed, what was the error?

A deployment in Shipyard goes through a lifecycle:

```
IN_PROGRESS → SUCCESS
           ↘ FAILED
```

When a deployment is created, it's `IN_PROGRESS`. When it finishes (the app is running and healthy), it becomes `SUCCESS`. If something goes wrong during the deploy, it becomes `FAILED`.

When a deployment succeeds, the environment's `currentDeploymentId` is updated to point to this new deployment. That's how Shipyard knows "what version is running right now."

#### Rollbacks

A rollback means: "the current version is broken, go back to a previous version."

In Shipyard, **a rollback is just a new deployment that points to an old commit/image**. You don't undo anything — you create a fresh deployment that says "run version 1.3.1 again." This is intentional. You never want to mutate history. The audit trail stays intact.

---

### 2.4 — Pipelines (CI/CD Pipelines)

A **pipeline** is an automated workflow that runs when code is pushed to Git. The pipeline:

1. Checks out the code
2. Runs tests (unit, integration, etc.)
3. Builds the app (compiles TypeScript, builds Docker image)
4. Pushes the Docker image to a registry
5. (Optionally) Deploys to an environment

Pipelines run on **CI/CD services** — the most common ones are:

- **GitHub Actions** (built into GitHub, most popular)
- CircleCI
- Jenkins
- GitLab CI

Each time you push code to GitHub, GitHub Actions (or whatever you're using) starts a pipeline run. That run has:

- A **status** — `RUNNING`, `SUCCESS`, `FAILED`, `CANCELLED`
- A **branch** — which branch triggered it
- A **commit SHA** — the exact commit that triggered it
- **Duration** — how long it took

In Shipyard, pipeline runs are tracked in the **Pipelines** section. You can see all recent runs across all your services: which ones are running now, which passed, which failed.

**The pipeline is the automated factory. The deployment is the output.**

A pipeline typically ends by creating a deployment — it runs the tests, builds the image, and if everything passes, tells the server "deploy this new image." Shipyard tracks both: the pipeline run that produced the artifact, and the deployment that put it on a server.

#### How pipelines feed into Shipyard

GitHub Actions can call Shipyard's API when pipeline events happen. For example, your `.github/workflows/deploy.yml` might have a step like:

```yaml
- name: Notify Shipyard — deploy started
  run: |
    curl -X POST https://shipyard.acme.com/api/deployments \
      -H "Authorization: Bearer $SHIPYARD_TOKEN" \
      -d '{ "serviceId": "...", "environmentId": "...", "commitSha": "${{ github.sha }}" }'
```

And when the deploy finishes:

```yaml
- name: Notify Shipyard — deploy complete
  run: |
    curl -X PATCH https://shipyard.acme.com/api/deployments/$DEPLOYMENT_ID/complete \
      -d '{ "status": "SUCCESS" }'
```

This is how the pipeline and Shipyard stay in sync. The pipeline does the actual work; Shipyard records and displays it.

---

### 2.5 — Health Checks

A **health check** is a periodic automated ping to verify that a running service is actually responding.

How it works in Shipyard:

1. You configure a health check URL on an environment, like `https://api.acme.com/health`
2. Every N minutes (configurable), Shipyard's background worker (powered by BullMQ + Redis) sends an HTTP GET to that URL
3. If the server responds with `200 OK`, the environment is marked `HEALTHY`
4. If it responds with an error or doesn't respond at all, it's marked `DEGRADED` or `DOWN`
5. The result is stored in the health check history and broadcast via WebSocket to anyone watching the dashboard

**Why do we need this?**

A successful deployment doesn't guarantee the service stays healthy. A memory leak might crash it an hour later. A database could go down. Health checks give you continuous visibility, not just "it was fine when we deployed it."

The history is also valuable: if you deployed at 3pm and health checks started failing at 3:02pm, the new deploy is probably the cause.

---

### 2.6 — Teams, Users, and Roles

Shipyard supports multiple teams. Everything is isolated by team — one team cannot see another team's services, deployments, or notifications.

Within a team, users have roles:

| Role     | What they can do                                                                |
| -------- | ------------------------------------------------------------------------------- |
| `VIEWER` | Read-only access to everything                                                  |
| `MEMBER` | Create and update services, environments, deployments                           |
| `ADMIN`  | Everything above + delete, rollback, invite users, manage notification channels |
| `OWNER`  | Same as ADMIN (the person who created the team)                                 |

---

### 2.7 — Notifications

Notifications tell you when something important happens:

- A deployment started
- A deployment succeeded or failed
- A health check detected a service is down

They work on two levels:

1. **In-app notifications** — stored in the database, shown as a bell icon with a count in the UI
2. **Channel notifications** — sent to external services like Slack or Discord webhooks

You configure channels in Settings. When a deployment fails, Shipyard calls `NotificationsService.notify()` which:

1. Creates an in-app notification record
2. Iterates over all enabled channels for that team
3. Sends the message to each channel (Slack webhook, Discord webhook, custom webhook)

---

## Part 3 — The GitHub Integration

### 3.1 — What GitHub Actions is

GitHub Actions is GitHub's built-in CI/CD system. You write YAML files in `.github/workflows/` in your repository. When events happen (push to main, pull request opened, etc.), GitHub runs those workflows.

A typical workflow for a Node.js app looks like this:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Build Docker image
        run: docker build -t acme/api:${{ github.sha }} .

      - name: Push to registry
        run: docker push acme/api:${{ github.sha }}

      - name: Deploy to production server
        run: |
          ssh production-server "docker pull acme/api:${{ github.sha }} && docker restart api"
```

Every push to `main` triggers this workflow: test → build → push image → deploy.

### 3.2 — GitHub Webhooks

In addition to triggering Actions, GitHub can notify other services whenever events happen. This is done via **webhooks** — GitHub sends an HTTP POST to a URL you configure, with a JSON payload describing the event.

Events Shipyard listens to:

- `push` — code was pushed to a branch
- `workflow_run` — a GitHub Actions workflow started, completed, or failed
- `pull_request` — a PR was opened, closed, or merged

When Shipyard receives a webhook, it:

1. **Verifies the signature** — GitHub signs every webhook with HMAC-SHA256 using a shared secret. Shipyard checks this signature before processing. Unverified requests are rejected.
2. Parses the event type
3. Creates or updates a pipeline run record
4. Broadcasts the update via WebSocket to connected clients

### 3.3 — Setting up the GitHub webhook

To connect a real GitHub repo to Shipyard:

1. Go to your GitHub repository → Settings → Webhooks → Add webhook
2. Set the Payload URL to `https://your-shipyard-url/api/webhooks/github`
3. Set Content type to `application/json`
4. Set the Secret to whatever you've configured as `GITHUB_WEBHOOK_SECRET` in Shipyard
5. Select events: at minimum `push`, `workflow_run`

From that point, every push to that repo creates a pipeline run in Shipyard automatically.

### 3.4 — The GitHub App (Phase 4)

Beyond webhooks, Shipyard also supports a **GitHub App**. A GitHub App is an OAuth identity that can:

- Read repository metadata, branches, commits
- Post status checks on commits (the green/red checks you see on PRs)
- Comment on PRs

The GitHub App gives Shipyard API access to GitHub on behalf of your organization, so it can pull data proactively rather than waiting for webhooks.

---

## Part 4 — The Full End-to-End Flow

Let's trace exactly what happens when a developer pushes code, from start to finish.

### Step 1 — Developer pushes to `main`

```
git commit -m "feat: add dark mode"
git push origin main
```

### Step 2 — GitHub receives the push

GitHub stores the new commit and immediately:

- Sends a `push` webhook to Shipyard's `/api/webhooks/github`
- Starts any GitHub Actions workflows configured to trigger on push to `main`

### Step 3 — Shipyard receives the webhook

`POST /api/webhooks/github` fires:

1. Verifies the `x-hub-signature-256` header
2. Sees event type = `push`, branch = `main`
3. Finds the matching service in the database (by repository URL)
4. Creates a new pipeline run record with status `RUNNING`
5. Emits `pipeline:updated` via WebSocket → everyone watching the Pipelines page sees a new running pipeline appear instantly

### Step 4 — GitHub Actions runs

The workflow runs: checkout → test → build Docker image → push to registry.

If tests fail:

- GitHub emits a `workflow_run` webhook with `conclusion: failure`
- Shipyard updates the pipeline run to `FAILED`
- Emits `pipeline:updated`
- Sends a notification to Slack: "❌ Pipeline failed on main"

If tests pass and the image is built:

- The workflow calls Shipyard's API: `POST /api/deployments` with `serviceId`, `environmentId`, `commitSha`, `imageTag`
- Shipyard creates a deployment with status `IN_PROGRESS`
- Emits `deployment:started`
- Everyone watching the dashboard sees "Deploy to production — IN PROGRESS"

### Step 5 — The deployment runs

The GitHub Actions workflow SSHs into the production server (or uses Kubernetes, or ECS, or whatever) and runs the new Docker image.

When it finishes, the workflow calls:

```
PATCH /api/deployments/:id/complete
{ "status": "SUCCESS" }
```

Shipyard:

1. Updates the deployment to `SUCCESS`
2. Updates the production environment's `currentDeploymentId` to point to this deployment
3. Emits `deployment:completed`
4. Creates an in-app notification "Deployment to production succeeded"
5. Sends a Slack message "✅ acme-api deployed to production — commit a3f9c12"

### Step 6 — Health checks verify

A few minutes later, Shipyard's background health check job (running every 5 minutes) pings `https://api.acme.com/health`. It gets a `200 OK`. Status stays `HEALTHY`. No news is good news.

If the deploy introduced a bug that crashes the server:

- Health check gets a timeout
- Shipyard marks the environment `DOWN`
- Emits `health:updated`
- Dashboard shows a red badge on the environment
- Notification fires: "⚠️ acme-api production is DOWN"
- Team is alerted. They look at the deployment history, see the last deploy was 4 minutes ago, and decide to rollback.

### Step 7 — Rollback

Someone clicks "Rollback" in the Shipyard UI on the previous successful deployment.

Shipyard:

1. Creates a new deployment record: same service + environment, but the previous commit SHA and image tag
2. Emits `deployment:started`
3. Calls the server to pull the old image and restart it (or triggers a GitHub Actions workflow)
4. When complete, calls `PATCH /api/deployments/:id/complete` with `SUCCESS`
5. Environment's `currentDeploymentId` is updated back to the working version

The team sees exactly what happened in the audit trail: deploy at 3:00pm, rollback at 3:07pm, everything back to normal.

---

## Part 5 — How the Real-Time UI Works

Shipyard's dashboard updates live without refreshing the page. Here's how:

### WebSockets

When you open the dashboard, the Angular frontend connects to the backend via **Socket.IO**:

```
ws://localhost:3000/events
```

The backend verifies your JWT token and adds you to a room named `team:{yourTeamId}`. All events are broadcast only to users in the same team room — you can't see events from other teams.

When anything happens (deployment starts, health check updates), the backend calls `eventsGateway.emitToTeam(teamId, eventName, payload)`. Socket.IO delivers this message instantly to every connected client in that team's room.

The Angular frontend listens:

```typescript
websocketService
  .on(WsEventType.DEPLOYMENT_COMPLETED)
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe((event) => {
    // update the deployment in the UI without a page refresh
  });
```

This is why when you're on the Deployments page and a deploy finishes elsewhere, you see it update live.

---

## Part 6 — The Technology Stack and Why

| Layer          | Technology                  | Why                                                                               |
| -------------- | --------------------------- | --------------------------------------------------------------------------------- |
| Frontend       | Angular 21                  | Structured, strongly-typed SPA framework                                          |
| UI components  | Angular Material + Tailwind | Pre-built accessible components + utility-first CSS                               |
| Backend        | NestJS 11                   | Structured Node.js framework, mirrors Angular concepts (modules, DI)              |
| Database       | PostgreSQL 17               | Relational DB — perfect for the Service→Environment→Deployment relationship chain |
| ORM            | Prisma 7                    | Type-safe database access, migrations, generated client                           |
| Cache + Queues | Redis + BullMQ              | Health check scheduler needs reliable background jobs + retry logic               |
| Real-time      | Socket.IO                   | Mature WebSocket library with rooms, reconnection, fallbacks                      |
| Auth           | JWT via Passport.js         | Stateless authentication — no session storage needed                              |
| Monorepo       | Turborepo + pnpm            | Share types between frontend and backend, build in the right order                |
| Containers     | Docker                      | Package apps + their dependencies for consistent deployment                       |
| CI/CD          | GitHub Actions              | Trigger pipelines on push, configured as YAML in the repo                         |

---

## Part 7 — How to Connect a Real Project to Shipyard

Here's the checklist to connect a real-world project:

### Step 1 — Register a team and create a service

1. Start Shipyard (backend + frontend + Postgres + Redis)
2. Go to the Register page, create a team
3. Go to Services → New Service
4. Fill in: name, display name, repository URL (e.g., `https://github.com/yourorg/your-api`), provider (GITHUB)

### Step 2 — Create environments

1. Click into the service → Environments → Add Environment
2. Create `staging` with its URL (`https://staging.api.yourproject.com`)
3. Create `production` with its URL (`https://api.yourproject.com`)
4. Enable health checks if you have a `/health` endpoint

### Step 3 — Add Shipyard to your GitHub Actions workflow

In your repo's `.github/workflows/deploy.yml`, add steps to call Shipyard's API. You'll need a Shipyard API token (from Settings → API Tokens once that's built, or use a JWT for now).

```yaml
- name: Tell Shipyard deploy started
  run: |
    DEPLOYMENT_ID=$(curl -s -X POST $SHIPYARD_URL/api/deployments \
      -H "Authorization: Bearer $SHIPYARD_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "serviceId": "${{ vars.SHIPYARD_SERVICE_ID }}",
        "environmentId": "${{ vars.SHIPYARD_PROD_ENV_ID }}",
        "commitSha": "${{ github.sha }}",
        "imageTag": "${{ github.sha }}",
        "triggeredBy": "${{ github.actor }}"
      }' | jq -r '.id')
    echo "DEPLOYMENT_ID=$DEPLOYMENT_ID" >> $GITHUB_ENV

# ... your actual deploy steps here ...

- name: Tell Shipyard deploy succeeded
  if: success()
  run: |
    curl -X PATCH $SHIPYARD_URL/api/deployments/$DEPLOYMENT_ID/complete \
      -H "Authorization: Bearer $SHIPYARD_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{ "status": "SUCCESS" }'

- name: Tell Shipyard deploy failed
  if: failure()
  run: |
    curl -X PATCH $SHIPYARD_URL/api/deployments/$DEPLOYMENT_ID/complete \
      -H "Authorization: Bearer $SHIPYARD_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{ "status": "FAILED", "errorMessage": "GitHub Actions workflow failed" }'
```

### Step 4 — Configure the GitHub webhook

1. GitHub repo → Settings → Webhooks → Add webhook
2. Payload URL: `https://your-shipyard.com/api/webhooks/github`
3. Content type: `application/json`
4. Secret: match `GITHUB_WEBHOOK_SECRET` in your `.env`
5. Events: `push`, `workflow_run`

Now pipeline runs appear in Shipyard automatically on every push.

### Step 5 — Invite your team

Settings → Users → Invite user. They get a role (`MEMBER`, `ADMIN`, etc.) and can see the same dashboard.

### Step 6 — Set up notifications

Settings → Notification Channels → Add channel. Paste a Slack or Discord webhook URL. From now on, all deployment events generate Slack messages.

---

## Part 8 — Mental Model Summary

Think of it this way:

```
A SERVICE is a thing you build and deploy (one repo, one app).

An ENVIRONMENT is a place where that thing runs (dev / staging / production).

A DEPLOYMENT is an event: "version X was deployed to environment Y at time Z."

A PIPELINE is the automated process that produces the deployment artifact (runs tests, builds Docker image).

A HEALTH CHECK is a periodic pulse: "is the thing still running?"

A NOTIFICATION is an alert: "something important just happened."

Shipyard is the dashboard that connects all of these into one view.
```

The primary data axis in Shipyard is:

```
Team → Service → Environment → Deployment
```

Every other entity (pipelines, health checks, notifications, users) exists to support or observe this chain.

---

## Appendix — Glossary

| Term                | Meaning                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Commit SHA**      | A unique 40-character hash identifying a specific commit in Git. `git log` shows them.                                                                  |
| **Docker image**    | A packaged snapshot of an application and all its dependencies. Can be run on any machine with Docker.                                                  |
| **Docker registry** | A server that stores Docker images. Docker Hub is the public one. Companies often run private registries.                                               |
| **CI**              | Continuous Integration — automatically run tests when code is pushed.                                                                                   |
| **CD**              | Continuous Deployment/Delivery — automatically deploy when tests pass.                                                                                  |
| **Artifact**        | The output of a build process (e.g., a Docker image, a compiled binary, a zip file).                                                                    |
| **Webhook**         | A way for one service to notify another via HTTP POST when something happens.                                                                           |
| **HMAC-SHA256**     | A cryptographic signature used to verify that a webhook was sent by the real GitHub, not an attacker.                                                   |
| **WebSocket**       | A persistent two-way connection between browser and server, used for real-time updates.                                                                 |
| **JWT**             | JSON Web Token — a signed token that proves who you are without hitting the database on every request.                                                  |
| **BullMQ**          | A Redis-backed job queue. Lets you run tasks (like health checks) in the background on a schedule, with retries.                                        |
| **ORM**             | Object-Relational Mapper — lets you write database queries in TypeScript instead of raw SQL (Prisma in our case).                                       |
| **SSRF**            | Server-Side Request Forgery — an attack where a malicious URL makes your server call internal network addresses. Shipyard blocks this in health checks. |
| **Rollback**        | Deploying a previous working version to replace a broken current version.                                                                               |
| **Promotion**       | Moving a deployment from one environment to the next (dev → staging → production).                                                                      |
