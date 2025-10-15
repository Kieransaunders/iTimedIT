# iTimedIT

iTimedIT is a multi-tenant time tracking and client management platform for agencies. The app pairs a React + Vite front end with a realtime [Convex](https://convex.dev) backend to deliver live timers, collaboration, and actionable insights.

- **Live site**: <https://itimedit.com/> → production Convex deployment `https://basic-greyhound-928.convex.cloud`
- **Convex dashboard**: [`basic-greyhound-928`](https://dashboard.convex.dev/d/basic-greyhound-928)

Monorepo Structure Complete! (app and web)
🎯 Development Commands
Web app: npm run dev:web
Mobile app: npm run dev:mobile
Build web: npm run build:web
Build mobile: npm run build:mobile
Run tests: npm run test
Lint all: npm run lint

📱 What's Changed
Web app moved to apps/web/ with its own package.json
Mobile app moved to apps/mobile/ (from MobileiTimedIT)
Shared package created at packages/shared/ for common code
Root package.json configured for workspace management
Scripts updated to work with the monorepo structure
🔧 Key Features
Workspace management with npm workspaces
Shared code between web and mobile apps
Independent development - each app can be developed separately
Unified commands - run scripts across all workspaces from root

## Highlights

- Realtime timer control with push notifications for stop/snooze/switch actions.
- Modern dashboard with utilization KPIs, project health summaries, and recent entries.
- Rich client and project management pages with filtering, exports, and drilldowns.
- Workspace switching, invites, and profile settings powered by Convex Auth.
- Built-in dark mode, toast feedback, and progressive enhancements.

## Quick start see install guide.md for cursor instructions

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/Kieransaunders/iTimedIT.git
   cd iTimedIT
   npm install
   ```

   ```
3. Log in to Convex and sync schema/data:

   Make sure you are in the /apps/web folder
   npx convex dev
   ```

   Choose the existing `iTimedIT` project when prompted.
4. Run the app:

   ```bash
   npm run dev
   ```

   Vite (frontend) and Convex (backend) launch together at <http://localhost:5173>.

## Project structure

- `src/` – Vite + React UI
  - `src/components/` – feature pages (Dashboard, Clients, Projects, Settings) and reusable widgets
  - `src/lib/` – shared hooks, theme/context helpers, notifications utilities
- `convex/` – database schema, mutations, queries, and HTTP routes
- `tests/` – Jest unit and contract suites plus shared mocks
- `docs/` – runbooks, migration notes, monitoring, and process guides

## Scripts

- `npm run dev` – start Vite and the Convex dev server in parallel
- `npm run build` – production build output to `dist/`
- `npm run lint` – type-check Convex + app code, then build
- `npm run test` / `test:watch` / `test:coverage` – run Jest suites
- `npm run generate:vapid` – generate Web Push keys for notifications

## Testing

Use the Jest suites under `tests/` to cover new functionality. Prefer `tests/unit` for isolated components and `tests/contract` for end-to-end flows that touch Convex. Run `npm run test:coverage` before sending a PR to ensure new branches are exercised.

## Deployment

- Production hosting: Netlify at <https://itimedit.netlify.app/>
- Backend: Convex deployment [`basic-greyhound-928`](https://dashboard.convex.dev/d/basic-greyhound-928)
- Environment configuration lives in Netlify/Convex dashboards; see `DEPLOYMENT_RUNBOOK.md` for step-by-step deployment updates.

## Additional resources

- `Install_Guide.md` – detailed local setup walkthrough
- `MIGRATION_GUIDE.md` – schema and data migration process
- `MONITORING_SETUP.md` – observability and alerting
- `NOTIFICATION_TESTING_GUIDE.md` – validating push notifications and VAPID keys

For questions, check `Task.md` for the current backlog or reach out to the owning engineer before making breaking changes.
