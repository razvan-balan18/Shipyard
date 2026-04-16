# Shipyard — Frontend Testing Guide

## Setup

You need three terminals open simultaneously.

**Terminal 1 — Databases**

```bash
docker compose -f docker-compose.dev.yml up -d
```

**Terminal 2 — Backend**

```bash
pnpm --filter api start:dev
```

Wait until you see `NestJS application is running on port 3000`.

**Terminal 3 — Frontend**

```bash
pnpm --filter web start
```

Wait until you see `Application bundle generation complete`.

Open **http://localhost:4200** in your browser.

---

## Step 1 — Register an account

1. You should be redirected to `http://localhost:4200/auth/login`
2. Click the **"Register"** link at the bottom
3. Fill in:
   - **Display Name**: Your name (e.g. `Razvan`)
   - **Team Name**: Your team (e.g. `My Team`)
   - **Email**: any valid email (e.g. `razvan@test.com`)
   - **Password**: at least 8 characters
4. Click **Register**
5. ✅ You should land on the dashboard at `/dashboard`

---

## Step 2 — Login / Logout flow

1. Click **Logout** at the bottom of the sidebar
2. You should be sent back to `/auth/login`
3. Enter the email and password you just registered with
4. Click **Sign In**
5. ✅ You should land on the dashboard

**Test the auth guard:**

- While logged out, type `http://localhost:4200/services` in the browser
- ✅ You should be redirected to `/auth/login` automatically

---

## Step 3 — Create a Service

1. Click **Services** in the sidebar
2. Click the **"New Service"** button (top right)
3. Fill in:
   - **Name**: `my-app` _(lowercase letters, numbers, hyphens only)_
   - **Display Name**: `My App`
   - **Repository URL**: `https://github.com/yourusername/my-app`
   - **Provider**: GitHub
   - **Default Branch**: `main`
4. Click **Create**
5. ✅ A service card should appear in the grid
6. Click the card to go to `/services/:id`
7. ✅ You should see three tabs: **Environments**, **Deployments**, **Pipelines**

---

## Step 4 — Create an Environment

1. From the service detail page (`/services/:id`)
2. You should be on the **Environments** tab
3. Click **"Add Environment"**
4. Fill in:
   - **Name**: `production` _(lowercase, hyphens)_
   - **Display Name**: `Production`
   - **URL**: `https://myapp.example.com` _(optional)_
   - **Health Check URL**: `https://myapp.example.com/health` _(optional)_
5. Click **Add**
6. ✅ The environment row appears in the tab
7. Click **Services** in the sidebar, then click your service again
8. ✅ The service card now shows the environment with a status badge

**Check the environments grid:**

- Click **Environments** in the sidebar
- ✅ Your environment appears, grouped under your service name

---

## Step 5 — Create a Deployment (via Swagger)

The UI doesn't have a "trigger deployment" button yet — deployments come from CI/CD in production. For testing, use the built-in API docs.

### Open Swagger

1. Open a new browser tab: **http://localhost:3000/api**
2. You'll see the Swagger UI — a list of all API endpoints

### Authenticate in Swagger

1. Scroll to the top and click the green **"Authorize"** button (🔒 lock icon)
2. In the **Value** field, type `Bearer ` followed by your token

**To get your token:**

- Scroll down to the **auth** section in Swagger
- Click `POST /api/auth/login` → click **"Try it out"**
- In the request body, change the example to:
  ```json
  {
    "email": "razvan@test.com",
    "password": "yourpassword"
  }
  ```
- Click **Execute**
- In the response, copy the value of `"accessToken"` (the long string)
- Go back to the Authorize dialog, paste `Bearer YOUR_TOKEN_HERE`
- Click **Authorize** → **Close**

### Get your service and environment IDs

You need these IDs to create a deployment.

1. Scroll to **services** section → click `GET /api/services` → **"Try it out"** → **Execute**
2. In the response, find your service and copy its `"id"` value (looks like `abc123-...`)
3. Scroll to **environments** section → click `GET /api/environments` → **"Try it out"** → **Execute**
4. Find your environment and copy its `"id"` value

### Create the deployment

1. Scroll to **deployments** section → click `POST /api/deployments` → **"Try it out"**
2. Replace the request body with:
   ```json
   {
     "serviceId": "PASTE_SERVICE_ID_HERE",
     "environmentId": "PASTE_ENVIRONMENT_ID_HERE",
     "branch": "main",
     "commitSha": "abc123def456",
     "commitMessage": "feat: add new feature",
     "triggeredBy": "razvan@test.com"
   }
   ```
3. Click **Execute**
4. Copy the deployment `"id"` from the response

### Complete the deployment

1. Scroll to `PATCH /api/deployments/{id}/complete` → **"Try it out"**
2. In the `id` field, paste your deployment ID
3. Request body:
   ```json
   {
     "status": "SUCCESS"
   }
   ```
4. Click **Execute**

### Verify in the UI

- Go back to `http://localhost:4200`
- Click **Services** → click your service → **Deployments** tab
- ✅ A deployment row appears with a green SUCCESS badge
- Click **Deployments** in the sidebar
- ✅ The deployment appears in the global feed
- Click **Dashboard**
- ✅ The recent deployments list shows your deployment
- ✅ The service card shows the environment as **HEALTHY**

---

## Step 6 — Test Rollback

1. Go to `/services/:id` → **Deployments** tab
2. You should see the SUCCESS deployment from Step 5
3. Click the **rollback button** (the undo arrow icon on the right)
4. ✅ A new deployment row appears at the top with status IN_PROGRESS, then SUCCESS

---

## Step 7 — Test Deployment Filters

1. Click **Deployments** in the sidebar
2. Use the **Service** dropdown → select your service
3. ✅ List narrows to only that service's deployments
4. Use the **Status** dropdown → select `SUCCESS`
5. ✅ List shows only successful deployments
6. Click **"Clear filters"**
7. ✅ Full list returns

---

## Step 8 — Settings: Team Members

1. Click **Settings** in the sidebar
2. You should see the **Team Members** tab active
3. ✅ Your own account appears in the list with the **OWNER** badge

**Invite a new member:**

1. Click **"Invite Member"** (the expansion panel at the bottom)
2. Fill in:
   - **Email**: `teammate@test.com`
   - **Display Name**: `Teammate`
   - **Password**: `password123`
   - **Role**: Member
3. Click **Invite**
4. ✅ New row appears in the list

**Change role:**

1. On the new member's row, use the **role dropdown** to change to `Admin`
2. ✅ Badge updates to ADMIN

**Delete member:**

1. Click the trash icon on the teammate row
2. ✅ A "Remove member?" snackbar appears with a **Confirm** action
3. Click **Confirm**
4. ✅ Row disappears

---

## Step 9 — Settings: Notification Channels

1. Still in Settings → click **"Notifications"** tab
2. Click **"Add Channel"**
3. Fill in:
   - **Name**: `Test Webhook`
   - **Type**: Webhook
   - **Webhook URL**: `https://httpbin.org/post` _(a free test endpoint that accepts any POST)_
   - **Events**: check **Deployment Success** and **Deployment Failed**
4. Click **Add**
5. ✅ Channel row appears in the list

**Test the enable toggle:**

1. Click the toggle on your channel to disable it
2. ✅ Toggle switches off (API call happens)
3. Click again to re-enable

**Test the test button:**

1. Click the **"Test"** button on the channel
2. ✅ Snackbar appears: "Test notification sent"

**Delete:**

1. Click trash icon → confirm
2. ✅ Channel disappears

---

## Step 10 — Settings: GitHub Integration

1. Click the **"GitHub"** tab in Settings
2. ✅ Info panel shows: "Not configured", Phase 4 badge, feature description
3. ✅ Webhook URL is shown: `http://localhost:3000/api/webhooks/github`
4. Click the **copy** button next to the URL
5. ✅ Snackbar: "Copied to clipboard"

---

## Step 11 — Dark Mode

1. Click the **theme toggle** button at the bottom of the sidebar (sun/moon icon)
2. ✅ Entire app switches to dark theme
3. Refresh the page (`Cmd+R`)
4. ✅ Dark mode persists after refresh
5. Toggle back to light mode

---

## Step 12 — Real-time Updates (WebSocket)

Test that the UI updates live without refreshing.

1. Open **two browser tabs**, both at `http://localhost:4200/dashboard`
2. In **Tab 1**, keep the dashboard visible
3. In **Tab 2**, go to Swagger (`http://localhost:3000/api`)
4. In Swagger, create + complete a new deployment (follow Step 5 again)
5. Switch back to **Tab 1**
6. ✅ The "Recent Deployments" section updated automatically — no refresh needed

---

## Step 13 — Error States

**Stop the backend and verify graceful errors:**

1. Stop Terminal 2 (the backend — press `Ctrl+C`)
2. In the browser, navigate to `/services`
3. ✅ An error banner appears: "Failed to load services" with a **Retry** button
4. Restart the backend (`pnpm --filter api start:dev`)
5. Click **Retry**
6. ✅ Services load correctly

**Form validation:**

1. Go to `/services` → "New Service"
2. Click **Create** without filling anything
3. ✅ Validation errors appear on required fields
4. Type `My Service` in the Name field (uppercase + space — invalid)
5. ✅ Error: "Only lowercase letters, numbers, and hyphens allowed"

---

## Quick Reference — What Each Page Does

| URL          | What to check                                      |
| ------------ | -------------------------------------------------- |
| `/dashboard` | Service cards with env status + recent deployments |
| `/services`  | Service grid, create/delete                        |

| `/services/:id` | Environments tab, Deployments tab, Pipelines tab |
| `/deployments` | Paginated feed, filters by service/status |
| `/environments` | All environments grouped by service |
| `/pipelines` | Empty until GitHub webhooks configured (expected) |
| `/settings` | Team, Notifications, GitHub tabs |
