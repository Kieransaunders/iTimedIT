## Install and Run (from a fresh clone)

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
```

Notes:
- Keep using your own `dev:<your-dev-deployment>` value locally. If you don't have one yet, running `npx convex dev` will create one and print it.
- For production (e.g., on Netlify), set environment variables in the host:
  - `CONVEX_DEPLOYMENT=prod:<your-production-deployment-name>` (or just `prod`)
  - `CONVEX_SITE_URL=https://<your-netlify-site>.netlify.app`

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

