## Install and Run (from a fresh clone)

### Quick Start (Testers)
- Clone and install:
Open new window in cursor and clone
    https://github.com/Kieransaunders/iTrackIT
  
open termainl window in the bottom of curser to setup project

  npm install

Install Convex the database for local development: 
  npm install convex
  npx convex dev
  then select "❯ choose an existing project 
  ? Configure project iTrackIT (iTrackIT)? (Y/n) Y
  ```

To run server DB and Front end together:

npm run dev

Then open a new terminal windows and start claude with
Claude

Check Task.MD for any tasks to work on or test the recent ones developed.
 
  
  ```
  Frontend: http://localhost:5173 (backend runs via Convex cloud dev)

### Prerequisites
- Node.js 18+ (recommend 20 LTS)
- npm 9+ (bundled with Node)
- A Convex account (`npx convex dev` will prompt login in browser if needed)

### 1) Clone the repo
```bash
git clone https://github.com/Kieransaunders/freelancer_time_tracker_app.git
cd freelancer_time_tracker_app
```

### 2) Install dependencies
```bash
npm install
```

### 3) Environment variables
Create a file named `.env.local` in the project root with at least:
```bash
# Local/dev Convex deployment (example)
CONVEX_DEPLOYMENT=dev:watchful-hedgehog-860

# Public site URL used by auth/providers in dev
CONVEX_SITE_URL=http://localhost:5173

# Web Push (generate your own keys; see below)
VAPID_PUBLIC_KEY="<your-vapid-public-key>"
VAPID_PRIVATE_KEY="<your-vapid-private-key>"
VITE_VAPID_PUBLIC_KEY="<your-vapid-public-key>"
```

Notes:
- Keep using your own `dev:<your-dev-deployment>` value locally. If you don't have one yet, running `npx convex dev` will create one and print it.
- For production (e.g., on Netlify), set environment variables in the host:
  - `CONVEX_DEPLOYMENT=prod:<your-production-deployment-name>` (or just `prod`)
  - `CONVEX_SITE_URL=https://<your-netlify-site>.netlify.app`
  - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
  - `VITE_VAPID_PUBLIC_KEY`

#### Generating VAPID keys

Run the helper script to create a fresh key pair:

```bash
npm run generate:vapid   # or: node scripts/generate-vapid-keys.js
```

The script prints three environment variables. Copy them into `.env.local` (for local dev) and into your hosting provider's environment configuration. Keep `VAPID_PRIVATE_KEY` secret; never commit it.

On Convex, add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in the dashboard under **Settings → Environment Variables** so server-side push actions can sign notifications.

#### Optional fallback providers

To enable email/SMS/Slack escalation, set the following environment variables:

```bash
SENDGRID_API_KEY="<sendgrid-api-key>"
SENDGRID_FROM_EMAIL="alerts@your-domain.com"

TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="<twilio-auth-token>"
TWILIO_FROM_NUMBER="+15551234567"

SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
PUBLIC_APP_URL="https://your-production-domain.com"
```

Only the channels with valid credentials and user opt-in will be used. `PUBLIC_APP_URL` is recommended so deep links in emails/SMS point back to the deployed application.

### 4) Start the app (frontend + Convex backend)
The project is wired to run both concurrently:
```bash
npm run dev
```
This launches:
- Vite dev server (frontend) on `http://localhost:5173`
- Convex dev server (backend)

Alternatively, you can run them separately:
```bash
npm run dev:frontend
npm run dev:backend
```

### 5) First-time Convex login (if prompted)
On first run, `convex dev` may open a browser to authenticate. Complete that once; subsequent runs won’t prompt.

### 6) Tests (optional)
```bash
npm test
```

### Production notes (Netlify)
- Set `CONVEX_DEPLOYMENT` and `CONVEX_SITE_URL` as described above in your Netlify environment variables.
- Build command: `npm run build`
- Publish directory: `dist`

### Troubleshooting
- If `npm ci` fails due to missing lockfile, use `npm install`.
- If Convex fails to start, ensure `.env.local` has a valid `CONVEX_DEPLOYMENT` or re-run `npx convex dev` to create one.
