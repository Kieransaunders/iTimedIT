# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts the Vite + React UI; shared helpers live in `src/lib` and reusable widgets in `src/components`.
- `convex/` tracks backend functions, schemas, and schedulers that back realtime features.
- `tests/` contains Jest suites (`unit/`, `contract/`) plus reusable fixtures in `mocks/` and bootstrap logic in `setup.ts`.
- `public/` serves static assets and manifests, while `docs/` and root guides document rollout, monitoring, and migrations.

## Build, Test, and Development Commands
- `npm run dev`: launches Vite and Convex together for a full-stack sandbox.
- `npm run build`: emits the production bundle to `dist/`.
- `npm run lint`: type-checks Convex and app code, then runs a one-off build to surface integration issues.
- `npm run test` / `test:watch` / `test:coverage`: execute Jest once, in watch mode, or with coverage output.

## Coding Style & Naming Conventions
- Write TypeScript with 2-space indentation and prefer functional React components with hooks.
- Use PascalCase for components (`TimerPanel.tsx`) and kebab-case for utilities (`date-utils.ts`).
- Group Tailwind classes by layout → spacing → color to mirror existing patterns and ease diffs.
- Run Prettier via the ESLint setup before committing; avoid disabling lint rules without discussion.

## Testing Guidelines
- Keep component specs in `tests/unit` and cross-cutting flows (e.g., timers + notifications) in `tests/contract`.
- Reuse helpers from `tests/setup.ts` and mock Convex calls through `tests/mocks` when isolating behaviour.
- Cover new branches introduced by your change set and confirm with `npm run test:coverage` before a PR.

## Commit & Pull Request Guidelines
- Follow the conventional prefixes visible in `git log` (`fix:`, `feat:`, `chore:`) paired with a terse summary.
- Limit each commit to one concern; include config snapshots when adjusting `convex/` or deployment scripts.
- PRs should link related issues, note user-facing impact, include screenshots for UI changes, and call out new env vars.
- Request review from an owning engineer and flag breaking changes or migration steps in the description.

## Security & Configuration Tips
- Keep secrets in Convex env vars or `.env.local`; never commit credentials or VAPID keys.
- After running `npm run generate:vapid`, upload the values to the target environment and log the update in `docs/`.
