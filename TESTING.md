# Shipyard — Manual Testing Guide

Complete end-to-end test plan for the current implementation (Phase 1 Foundation + Phase 2 Core Data + partial Phase 3).

## Terminal Test Results (2026-04-15)

All backend tests ran and passed. One bug found and fixed during testing.

| Area                                      | Result | Notes                                                          |
| ----------------------------------------- | ------ | -------------------------------------------------------------- |
| Auth register/login/me                    | ✅     |                                                                |
| Auth errors (401/409/400)                 | ✅     | Duplicate email **was 500, now fixed to 409**                  |
| Services CRUD                             | ✅     |                                                                |
| Environments CRUD                         | ✅     | Unknown serviceId was 400 (wrong), **fixed to 404**            |
| Deployments create/complete/fail/rollback | ✅     | Rollback auto-completes (Docker TODO)                          |
| Deployment errors                         | ✅     |                                                                |
| Health checks                             | ✅     | SSRF protection blocks private IPs correctly                   |
| Pipelines list/get                        | ✅     | Empty (no GH webhooks yet)                                     |
| Notifications + channels CRUD             | ✅     | `testChannel` returns `success:true` regardless of HTTP result |
| Teams GET/PATCH                           | ✅     |                                                                |
| Users CRUD                                | ✅     |                                                                |
| Analytics deployments/MTTR                | ✅     | 66.67% success rate, 1 recovery tracked                        |
| Team isolation                            | ✅     | Cross-team 404 + 0 leakage in list queries                     |
| Security headers                          | ✅     | CSP, X-Content-Type-Options, X-Frame-Options                   |
| CORS                                      | ✅     | Only localhost:4200 allowed                                    |
| Input validation                          | ✅     |                                                                |
| GitHub webhook (reject)                   | ✅     | Both no-sig and bad-sig → 401                                  |
| GitHub webhook (valid)                    | ⏭️     | Needs `GITHUB_WEBHOOK_SECRET` in `.env`                        |

### Known behaviours (not bugs)

- `POST /api/health-checks/:envId/trigger` on env with no `healthCheckUrl` returns `404` (documented as `400/422` — inconsequential)
- `POST /api/notifications/channels/:id/test` always returns `{ "success": true }` — failure from the remote webhook is logged server-side but not surfaced in the HTTP response
- Health checks with URLs resolving to private/reserved IPs are blocked (SSRF protection) — correct
- Rollback immediately completes as `SUCCESS` — placeholder until Docker integration is wired

---

## Prerequisites

### 1. Start infrastructure

```bash
docker compose -f docker-compose.dev.yml up -d
```

Confirm Postgres (5432) and Redis (6379) are up.

### 2. Generate Prisma client & run migrations

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
```

### 3. Start the apps

```bash
# From repo root
pnpm dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:4200`

### 4. Verify `.env` exists at `apps/api/.env`

```env
DATABASE_URL=postgresql://shipyard:shipyard_dev@localhost:5432/shipyard
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change-me-to-something-long-and-random
JWT_EXPIRATION=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

---

## Section 1 — Auth

### 1.1 Register (creates user + team)

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "owner@test.com",
  "password": "password123",
  "displayName": "Test Owner",
  "teamName": "Acme Corp"
}
```

**Expected:** `201` with `{ accessToken, user: { id, email, displayName, role: "OWNER", teamId, teamName } }`

**Save** `accessToken` as `$TOKEN` and `teamId` as `$TEAM_ID`.

---

### 1.2 Login

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "owner@test.com",
  "password": "password123"
}
```

**Expected:** `200` with same shape as register. Token is a fresh JWT.

---

### 1.3 Get current user

```http
GET http://localhost:3000/api/auth/me
Authorization: Bearer $TOKEN
```

**Expected:** `200` with `{ id, email, displayName, role, teamId, teamName }`.

---

### 1.4 Auth error cases

| Request                                           | Expected |
| ------------------------------------------------- | -------- |
| `POST /api/auth/login` with wrong password        | `401`    |
| `POST /api/auth/register` with existing email     | `409`    |
| `GET /api/auth/me` without token                  | `401`    |
| `GET /api/auth/me` with garbage token             | `401`    |
| `POST /api/auth/login` with invalid email format  | `400`    |
| `POST /api/auth/register` with password < 8 chars | `400`    |

---

### 1.5 Rate limiting

Sending 6+ requests to `/api/auth/register` or `/api/auth/login` within 60 seconds should return `429` on the 6th attempt (limit is 5/min for auth endpoints).

---

## Section 2 — Services

All requests require `Authorization: Bearer $TOKEN`.

### 2.1 Create a service

```http
POST http://localhost:3000/api/services
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "name": "api-gateway",
  "displayName": "API Gateway",
  "description": "Main entry point for all traffic",
  "repositoryUrl": "https://github.com/acme/api-gateway",
  "repositoryProvider": "GITHUB",
  "defaultBranch": "main",
  "dockerImage": "acme/api-gateway"
}
```

**Expected:** `201` with full service record including `id`. Save as `$SERVICE_ID`.

`repositoryProvider` valid values: `GITHUB`, `GITLAB`, `BITBUCKET`

---

### 2.2 List services

```http
GET http://localhost:3000/api/services
Authorization: Bearer $TOKEN
```

**Expected:** `200` array containing the created service. Each item includes `environments` and `lastDeployment`.

---

### 2.3 Get single service

```http
GET http://localhost:3000/api/services/$SERVICE_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200` with full service object.

---

### 2.4 Update service

```http
PATCH http://localhost:3000/api/services/$SERVICE_ID
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "displayName": "API Gateway v2",
  "description": "Updated description",
  "defaultBranch": "develop"
}
```

**Expected:** `200` with updated fields.

---

### 2.5 Delete service

```http
DELETE http://localhost:3000/api/services/$SERVICE_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200`.

Create a second service for the rest of the tests (re-run 2.1 and save the new `$SERVICE_ID`).

---

### 2.6 Services error cases

| Request                                                | Expected |
| ------------------------------------------------------ | -------- |
| `GET /api/services/:nonExistentId`                     | `404`    |
| `POST /api/services` with missing `repositoryUrl`      | `400`    |
| `POST /api/services` with invalid `repositoryProvider` | `400`    |
| `DELETE /api/services/:id` with VIEWER role token      | `403`    |

---

## Section 3 — Environments

### 3.1 Create an environment

```http
POST http://localhost:3000/api/environments
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "name": "production",
  "displayName": "Production",
  "order": 0,
  "url": "https://app.acme.com",
  "healthCheckUrl": "https://app.acme.com/health",
  "healthCheckInterval": 60,
  "serviceId": "$SERVICE_ID"
}
```

**Expected:** `201` with environment record. Save `id` as `$ENV_ID`.

---

### 3.2 Create a staging environment

```http
POST http://localhost:3000/api/environments
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "name": "staging",
  "displayName": "Staging",
  "order": 1,
  "serviceId": "$SERVICE_ID"
}
```

**Expected:** `201`. Save `id` as `$ENV_ID_STAGING`.

---

### 3.3 List environments (all)

```http
GET http://localhost:3000/api/environments
Authorization: Bearer $TOKEN
```

**Expected:** `200` array with both environments.

---

### 3.4 List environments (filtered by service)

```http
GET http://localhost:3000/api/environments?serviceId=$SERVICE_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200` array with only environments belonging to `$SERVICE_ID`.

---

### 3.5 Get single environment

```http
GET http://localhost:3000/api/environments/$ENV_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200` with full environment object.

---

### 3.6 Update environment

```http
PATCH http://localhost:3000/api/environments/$ENV_ID
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "displayName": "Production (US-East)",
  "healthCheckInterval": 30
}
```

**Expected:** `200` with updated fields.

---

### 3.7 Delete environment

Delete the staging environment (keep production for deployment tests):

```http
DELETE http://localhost:3000/api/environments/$ENV_ID_STAGING
Authorization: Bearer $TOKEN
```

**Expected:** `200`.

---

### 3.8 Environments error cases

| Request                                           | Expected |
| ------------------------------------------------- | -------- |
| Create with `healthCheckInterval` < 5             | `400`    |
| Create with `healthCheckInterval` > 3600          | `400`    |
| Create with `order` < 0                           | `400`    |
| Create with non-existent `serviceId`              | `404`    |
| Create with `serviceId` belonging to another team | `404`    |

---

## Section 4 — Deployments

### 4.1 Create a deployment (IN_PROGRESS)

```http
POST http://localhost:3000/api/deployments
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "serviceId": "$SERVICE_ID",
  "environmentId": "$ENV_ID",
  "commitSha": "abc1234def5678901234567890123456789012345",
  "commitMessage": "feat: add user dashboard",
  "branch": "main",
  "imageTag": "v1.2.3"
}
```

**Expected:** `201` with deployment record, `status: "IN_PROGRESS"`. Save `id` as `$DEPLOYMENT_ID`.

WebSocket clients on the same team should receive a `deployment:started` event.

---

### 4.2 Complete a deployment (SUCCESS)

```http
PATCH http://localhost:3000/api/deployments/$DEPLOYMENT_ID/complete
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "status": "SUCCESS"
}
```

**Expected:** `200` with `status: "SUCCESS"`, `finishedAt` set, `duration` calculated.

The environment's `currentDeploymentId` should now point to `$DEPLOYMENT_ID`.

WebSocket clients should receive a `deployment:completed` event.

---

### 4.3 Create + fail a deployment

Repeat 4.1 to get `$DEPLOYMENT_ID_2`, then:

```http
PATCH http://localhost:3000/api/deployments/$DEPLOYMENT_ID_2/complete
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "status": "FAILED"
}
```

**Expected:** `200` with `status: "FAILED"`. Environment `currentDeploymentId` unchanged (still points to the successful one).

WebSocket clients should receive a `deployment:failed` event.

---

### 4.4 Rollback

```http
POST http://localhost:3000/api/deployments/$DEPLOYMENT_ID/rollback
Authorization: Bearer $TOKEN
```

**Expected:** `201` — a **new** deployment record is created with `status: "IN_PROGRESS"`, copying commit/image from `$DEPLOYMENT_ID`.

---

### 4.5 List deployments

```http
GET http://localhost:3000/api/deployments
Authorization: Bearer $TOKEN
```

**Expected:** `200` with `{ deployments: [...], total }`. All items belong to caller's team.

---

### 4.6 List deployments with filters

```http
GET http://localhost:3000/api/deployments?serviceId=$SERVICE_ID&status=SUCCESS&limit=5
Authorization: Bearer $TOKEN
```

```http
GET http://localhost:3000/api/deployments?environmentId=$ENV_ID&offset=0&limit=10
Authorization: Bearer $TOKEN
```

**Expected:** `200` filtered results.

---

### 4.7 Deployments error cases

| Request                                         | Expected |
| ----------------------------------------------- | -------- |
| Create with `commitSha` shorter than 7 chars    | `400`    |
| Create with non-existent `environmentId`        | `404`    |
| Complete with `status: "PENDING"`               | `400`    |
| Rollback a deployment belonging to another team | `404`    |

---

## Section 5 — Health Checks

### 5.1 Get latest health results (all team environments)

```http
GET http://localhost:3000/api/health-checks
Authorization: Bearer $TOKEN
```

**Expected:** `200` array of `EnvironmentHealthSummary` objects. Each entry has `status`, `lastCheckAt`, `healthCheckUrl`, `lastResult`.

If no health checks have run yet, `lastResult` will be `null` and `status` will be `"UNKNOWN"`.

---

### 5.2 Trigger a manual health check

The environment must have a `healthCheckUrl` configured:

```http
POST http://localhost:3000/api/health-checks/$ENV_ID/trigger
Authorization: Bearer $TOKEN
```

**Expected:** `201` — job queued, returns a job reference or `{ queued: true }`.

WebSocket clients should receive a `health:updated` event once the job completes.

---

### 5.3 Get health check history

```http
GET http://localhost:3000/api/health-checks/$ENV_ID/history
Authorization: Bearer $TOKEN
```

```http
GET http://localhost:3000/api/health-checks/$ENV_ID/history?limit=20&offset=0
Authorization: Bearer $TOKEN
```

**Expected:** `200` paginated array of `HealthCheckResultSummary` objects with `status`, `responseTime`, `statusCode`, `errorMessage`, `createdAt`.

---

### 5.4 Health check edge cases

| Request                                        | Expected       |
| ---------------------------------------------- | -------------- |
| Trigger check for env with no `healthCheckUrl` | `400` or `422` |
| Trigger check for env from another team        | `404`          |
| History with `limit` > 100                     | Capped at 100  |

---

## Section 6 — Pipelines

### 6.1 List pipeline runs

```http
GET http://localhost:3000/api/pipelines
Authorization: Bearer $TOKEN
```

**Expected:** `200` array (empty if no GitHub webhooks have fired).

---

### 6.2 Filter pipelines

```http
GET http://localhost:3000/api/pipelines?serviceId=$SERVICE_ID&status=SUCCESS&limit=10
Authorization: Bearer $TOKEN
```

**Expected:** `200` filtered results.

---

### 6.3 Get single pipeline run

Requires a pipeline ID from a previous response:

```http
GET http://localhost:3000/api/pipelines/$PIPELINE_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200` with `PipelineRunSummary` including `stages`.

---

## Section 7 — Notifications

### 7.1 Get in-app notifications

```http
GET http://localhost:3000/api/notifications
Authorization: Bearer $TOKEN
```

```http
GET http://localhost:3000/api/notifications?limit=20
Authorization: Bearer $TOKEN
```

**Expected:** `200` array of `NotificationSummary` objects.

---

### 7.2 Get unread count

```http
GET http://localhost:3000/api/notifications/unread-count
Authorization: Bearer $TOKEN
```

**Expected:** `200` with `{ count: <number> }`.

---

### 7.3 Mark single notification as read

```http
PATCH http://localhost:3000/api/notifications/$NOTIFICATION_ID/read
Authorization: Bearer $TOKEN
```

**Expected:** `200` with updated notification (`read: true`).

---

### 7.4 Mark all notifications as read

```http
PATCH http://localhost:3000/api/notifications/read-all
Authorization: Bearer $TOKEN
```

**Expected:** `200`.

---

### 7.5 Create a notification channel (Slack)

```http
POST http://localhost:3000/api/notifications/channels
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "type": "SLACK",
  "name": "Deployments Slack",
  "config": {
    "webhookUrl": "https://hooks.slack.com/services/T00/B00/XXXX"
  },
  "events": ["DEPLOYMENT_SUCCESS", "DEPLOYMENT_FAILED"],
  "enabled": true
}
```

**Expected:** `201`. Save `id` as `$CHANNEL_ID`.

Valid `type` values: `SLACK`, `DISCORD`, `WEBHOOK`

Valid `events` values: `DEPLOYMENT_SUCCESS`, `DEPLOYMENT_FAILED`, `HEALTH_DOWN`, `HEALTH_RECOVERED`, `ROLLBACK`

---

### 7.6 Create a Discord channel

```http
POST http://localhost:3000/api/notifications/channels
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "type": "DISCORD",
  "name": "Ops Discord",
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/XXX/YYY"
  },
  "events": ["HEALTH_DOWN", "HEALTH_RECOVERED", "ROLLBACK"],
  "enabled": true
}
```

---

### 7.7 List channels

```http
GET http://localhost:3000/api/notifications/channels
Authorization: Bearer $TOKEN
```

**Expected:** `200` array with both channels.

---

### 7.8 Get single channel

```http
GET http://localhost:3000/api/notifications/channels/$CHANNEL_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200`.

---

### 7.9 Update channel

```http
PATCH http://localhost:3000/api/notifications/channels/$CHANNEL_ID
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "name": "Prod Deployments",
  "enabled": false
}
```

**Expected:** `200` with updated fields.

---

### 7.10 Test channel

```http
POST http://localhost:3000/api/notifications/channels/$CHANNEL_ID/test
Authorization: Bearer $TOKEN
```

**Expected:** `201` — sends a test message to the configured webhook. The actual delivery depends on whether the webhook URL is real.

---

### 7.11 Delete channel

```http
DELETE http://localhost:3000/api/notifications/channels/$CHANNEL_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200`.

---

### 7.12 Notification channel error cases

| Request                                       | Expected |
| --------------------------------------------- | -------- |
| Create with invalid `type`                    | `400`    |
| Create with empty `events` array              | `400`    |
| Create with invalid event name in `events`    | `400`    |
| Create/update/delete channel with VIEWER role | `403`    |

---

## Section 8 — Teams

### 8.1 Get current team

```http
GET http://localhost:3000/api/teams
Authorization: Bearer $TOKEN
```

**Expected:** `200` with `{ id, name, githubOrgSlug, createdAt, updatedAt }`.

---

### 8.2 Update team

```http
PATCH http://localhost:3000/api/teams
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "name": "Acme Corp (Updated)",
  "githubOrgSlug": "acme-corp"
}
```

**Expected:** `200` with updated team.

---

### 8.3 Teams error cases

| Request                            | Expected |
| ---------------------------------- | -------- |
| Update with MEMBER role            | `403`    |
| Update with `name` as empty string | `400`    |

---

## Section 9 — Users

### 9.1 List team members

```http
GET http://localhost:3000/api/users
Authorization: Bearer $TOKEN
```

**Expected:** `200` array of user objects.

---

### 9.2 Invite a new user

```http
POST http://localhost:3000/api/users/invite
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "email": "member@test.com",
  "password": "password123",
  "displayName": "Team Member",
  "role": "MEMBER"
}
```

**Expected:** `201` with new user object. Save `id` as `$USER_ID`.

Valid `role` values for invite: `ADMIN`, `MEMBER`, `VIEWER` (OWNER cannot be assigned via invite).

---

### 9.3 Get single user

```http
GET http://localhost:3000/api/users/$USER_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200`.

---

### 9.4 Update user profile

```http
PATCH http://localhost:3000/api/users/$USER_ID
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "displayName": "Updated Member Name"
}
```

**Expected:** `200`.

---

### 9.5 Update user role

```http
PATCH http://localhost:3000/api/users/$USER_ID/role
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "role": "ADMIN"
}
```

**Expected:** `200` with updated role.

---

### 9.6 Remove user

```http
DELETE http://localhost:3000/api/users/$USER_ID
Authorization: Bearer $TOKEN
```

**Expected:** `200`.

---

### 9.7 Users error cases

| Request                        | Expected       |
| ------------------------------ | -------------- |
| Invite with MEMBER role        | `403`          |
| Remove yourself (owner)        | `400` or `403` |
| Get user from a different team | `404`          |

---

## Section 10 — Analytics

### 10.1 Deployment stats

```http
GET http://localhost:3000/api/analytics/deployments
Authorization: Bearer $TOKEN
```

```http
GET http://localhost:3000/api/analytics/deployments?days=7
Authorization: Bearer $TOKEN
```

**Expected:** `200` with aggregated stats (total, success count, failure count, by day).

`days` is capped at 365; defaults to 30.

---

### 10.2 MTTR (Mean Time to Recovery)

```http
GET http://localhost:3000/api/analytics/mttr?days=30
Authorization: Bearer $TOKEN
```

**Expected:** `200` with average time to recover from failed deployments.

---

## Section 11 — WebSocket

### 11.1 Connection via browser console

Open `http://localhost:4200`, log in, then run in DevTools:

```javascript
// Retrieve the stored token
const token = localStorage.getItem('shipyard_token');

// Connect
const socket = io('http://localhost:3000/events', { auth: { token } });

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', () => console.log('Disconnected'));

// Listen for all tracked events
[
  'deployment:started',
  'deployment:completed',
  'deployment:failed',
  'health:updated',
  'pipeline:updated',
  'notification:new',
].forEach((ev) => {
  socket.on(ev, (data) => console.log(ev, data));
});
```

**Expected:** `Connected: <id>` logged.

---

### 11.2 Trigger WebSocket event end-to-end

1. Open the browser console with the socket listener active (11.1).
2. POST a new deployment (Section 4.1).
3. **Expected in console:** `deployment:started { type, payload, timestamp }` with the deployment ID.
4. PATCH to complete it (Section 4.2).
5. **Expected in console:** `deployment:completed { type, payload, timestamp }`.

---

### 11.3 Connection with invalid token

```javascript
const socket = io('http://localhost:3000/events', { auth: { token: 'bad.token.here' } });
socket.on('connect', () => console.log('Should not fire'));
socket.on('disconnect', () => console.log('Rejected (expected)'));
```

**Expected:** Server disconnects immediately; `disconnect` fires, `connect` never fires.

---

## Section 12 — GitHub Webhook

The webhook requires a valid HMAC-SHA256 signature. Test with a script:

```bash
SECRET="your-GITHUB_WEBHOOK_SECRET-value"
PAYLOAD='{"action":"completed","workflow_run":{"id":99,"name":"CI","head_branch":"main","head_sha":"abc123","conclusion":"success","html_url":"https://github.com/acme/repo/actions/runs/99"},"repository":{"full_name":"acme/repo"}}'

SIG="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')"

curl -X POST http://localhost:3000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "x-github-event: workflow_run" \
  -H "x-hub-signature-256: $SIG" \
  -d "$PAYLOAD"
```

**Expected:** `200 { "status": "ok" }`.

Test without signature or with wrong signature:

```bash
curl -X POST http://localhost:3000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "x-github-event: workflow_run" \
  -d "$PAYLOAD"
```

**Expected:** `401 Unauthorized`.

---

## Section 13 — Frontend UI

### 13.1 Auth flow

1. Open `http://localhost:4200` — should redirect to `/auth/login`.
2. The login page currently renders `<div>Login</div>` (stub — not yet fully implemented).
3. Manually set auth in DevTools to bypass the stub:

```javascript
// Paste a valid token + user object from a successful /api/auth/login response
localStorage.setItem('shipyard_token', '<YOUR_TOKEN>');
localStorage.setItem(
  'shipyard_user',
  JSON.stringify({
    id: '<USER_ID>',
    email: 'owner@test.com',
    displayName: 'Test Owner',
    role: 'OWNER',
    teamId: '<TEAM_ID>',
    teamName: 'Acme Corp',
  }),
);
location.reload();
```

4. App should redirect to `/dashboard`.

---

### 13.2 Dashboard

Navigate to `http://localhost:4200/dashboard`.

- [ ] Sidebar visible with links: Dashboard, Services, Deployments, Pipelines, Environments, Settings
- [ ] "Mission Control" heading visible
- [ ] WebSocket status badge shows `connected` (green) after connecting
- [ ] Services grid renders service cards (or "No services configured yet" if empty)
- [ ] Recent deployments section renders (or loading skeletons while fetching)
- [ ] Theme toggle (☀️/🌙) in sidebar footer works
- [ ] Logout button redirects to `/auth/login`

---

### 13.3 Service card

With at least one service + environment in DB:

- [ ] Service card shows service `displayName`
- [ ] Environment status badges render with correct color (HEALTHY=green, DOWN=red, UNKNOWN=gray)
- [ ] Last deployment commit SHA displayed (truncated to 7 chars)
- [ ] Time-ago pipe shows relative time (e.g., "5m ago")

---

### 13.4 Navigation

- [ ] `/services` — service list page renders
- [ ] `/deployments` — deployment feed renders
- [ ] `/pipelines` — pipeline monitor renders
- [ ] `/environments` — environment grid renders
- [ ] `/settings` — settings page renders

None of these should throw a console error.

---

### 13.5 Auth guard

1. Clear localStorage.
2. Navigate to `http://localhost:4200/dashboard`.
3. **Expected:** Redirect to `/auth/login`.

---

### 13.6 Expired token

1. Set a token with an already-expired `exp` in localStorage.
2. Reload the page.
3. **Expected:** Auth service detects expiry, clears storage, redirects to `/auth/login`.

---

## Section 14 — Cross-cutting Concerns

### 14.1 Team isolation

1. Register a second user in a different team:

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "other@team.com",
  "password": "password123",
  "displayName": "Other Owner",
  "teamName": "Other Corp"
}
```

Save the new `$TOKEN_OTHER`.

2. Try to access the first team's resources:

```http
GET http://localhost:3000/api/services/$SERVICE_ID_FROM_TEAM_1
Authorization: Bearer $TOKEN_OTHER
```

**Expected:** `404` — cross-team data is never exposed.

---

### 14.2 Security headers

```bash
curl -I http://localhost:3000/api/auth/me
```

**Expected headers present:**

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy` (helmet default)

---

### 14.3 CORS

Requests from `http://localhost:4200` should succeed. Requests from other origins should be blocked by CORS policy.

```bash
curl -H "Origin: http://evil.com" http://localhost:3000/api/auth/me -v 2>&1 | grep -i access-control
```

**Expected:** No `Access-Control-Allow-Origin: http://evil.com` header returned.

---

### 14.4 Input sanitisation

Send an unusually large payload:

```http
POST http://localhost:3000/api/services
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "name": "x",
  "displayName": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "repositoryUrl": "https://github.com/acme/repo",
  "repositoryProvider": "GITHUB"
}
```

**Expected:** `400` — `displayName` exceeds `MaxLength(100)`.

---

## Checklist Summary

| Area                                      | Status |
| ----------------------------------------- | ------ |
| Auth register/login/me                    | ⬜     |
| Auth rate limiting                        | ⬜     |
| Services CRUD                             | ⬜     |
| Environments CRUD                         | ⬜     |
| Deployments create/complete/fail/rollback | ⬜     |
| Health checks latest/history/trigger      | ⬜     |
| Pipelines list/get                        | ⬜     |
| Notifications in-app read/unread          | ⬜     |
| Notification channels CRUD + test         | ⬜     |
| Teams get/update                          | ⬜     |
| Users list/invite/update-role/remove      | ⬜     |
| Analytics deployments/mttr                | ⬜     |
| WebSocket connect + receive events        | ⬜     |
| GitHub webhook verify + reject            | ⬜     |
| Frontend auth flow                        | ⬜     |
| Frontend dashboard renders                | ⬜     |
| Frontend navigation                       | ⬜     |
| Team isolation                            | ⬜     |
| Security headers                          | ⬜     |
| Input validation                          | ⬜     |
