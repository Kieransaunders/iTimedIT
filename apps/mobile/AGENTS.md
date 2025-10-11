# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Expo Router screens with tab, auth, and modal groups; `_layout.tsx` enforces guarded navigation.
- `components/`: Feature-focused UI (`timer/`, `projects/`, `entries/`) plus `ui/` primitives and `common/` wrappers.
- `services/`: Convex client setup, notifications, secure storage, and background task helpers.
- `hooks/`, `utils/`, `types/`: Shared logic, formatting helpers, and TypeScript contracts reused across screens.
- `assets/` and `WebCompanianApp/`: Packaged media plus the companion web workspace that shares Convex configuration.

## Build, Test, and Development Commands
- `npm install`: Align dependencies with the committed lockfile.
- `npm start`: Launch Metro via Expo CLI; `i` and `a` open iOS or Android targets.
- `npm run ios` / `npm run android` / `npm run web`: Generate native builds or a browser preview as required.
- `npm run lint`: Apply `eslint-config-expo`; fix warnings before sending reviews.
- `npm run reset-project`: Clear caches and native folders when Metro gets stuck.
- `./verify-setup.sh`: Confirm local tooling and required environment variables.

## Coding Style & Naming Conventions
- TypeScript code uses 2-space indentation, double quotes, and no semicolons per Expo defaults.
- Keep feature logic near its screen; move reusable logic into hooks or utilities using the `@/` alias.
- Name components with PascalCase, hooks with a `use` prefix, and shared constants in SCREAMING_SNAKE_CASE.
- Run `npm run lint -- --fix` before committing; address remaining eslint warnings manually.

## Testing Guidelines
- Automated testing is not configured; follow `TESTING.md` for manual authentication passes and log results.
- Future Jest or Detox specs should sit beside sources as `*.test.ts(x)` covering happy paths and regressions.
- Verify Convex mutations against staging before merging, protecting both mobile and companion web clients.

## Commit & Pull Request Guidelines
- Use imperative, present-tense summaries (e.g., `Polish timer toast`) and keep changes scoped.
- Explain intent, local testing (`npm start`, lint, manual flows), and attach screenshots for UI updates.
- Document required `.env.local` edits in the PR body; never commit secrets or token values.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local`, provide `EXPO_PUBLIC_CONVEX_URL`, and keep credentials out of version control.
- Coordinate Google OAuth secrets in `WebCompanianApp/iTimedIT/apps/web/.env.local` with the web team before rotating keys.
- Continue using the provided SecureStore-based `tokenStorage`; discuss alternatives with maintainers before changing storage behavior.
