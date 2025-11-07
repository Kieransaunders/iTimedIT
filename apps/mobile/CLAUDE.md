# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an iOS/Android React Native application built with Expo and the Ignite boilerplate (v11.3.2). The app uses Convex as its backend database and real-time sync engine.

## Development Commands

### Setup
```bash
npm install --legacy-peer-deps
```

### Running the App
```bash
npm run start                    # Start Expo dev server with dev client
npm run ios                      # Run on iOS simulator
npm run android                  # Run on Android emulator
npm run web                      # Run web version
```

### Building
```bash
# iOS builds
npm run build:ios:sim           # Build for iOS simulator
npm run build:ios:device        # Build for iOS device (development)
npm run build:ios:preview       # Build preview for iOS
npm run build:ios:prod          # Build production for iOS

# Android builds
npm run build:android:sim       # Build for Android emulator
npm run build:android:device    # Build for Android device (development)
npm run build:android:preview   # Build preview for Android
npm run build:android:prod      # Build production for Android
```

### Quality Assurance
```bash
npm run compile                 # TypeScript type checking (no emit)
npm run lint                    # ESLint with auto-fix
npm run lint:check              # ESLint without auto-fix
npm run test                    # Run Jest tests
npm run test:watch              # Run Jest in watch mode
npm run test:maestro            # Run Maestro E2E tests
```

### Android Development
```bash
npm run adb                     # Setup ADB port forwarding for dev server
```

### Dependency Management
```bash
npm run align-deps              # Fix Expo dependency alignment
npm run dep:cruise              # Check dependency graph
npm run dep:graph               # Generate dependency graph visualization
npx expo-doctor                 # Check Expo project health (run periodically)
```

## Architecture

### Application Structure

The app follows Ignite's opinionated structure:

- **app/** - Main application code
  - **app.tsx** - Root component with provider setup (SafeAreaProvider, KeyboardProvider, AuthProvider, ThemeProvider)
  - **components/** - Reusable UI components (Button, Card, TextField, Icon, etc.)
  - **screens/** - Screen components (LoginScreen, WelcomeScreen, Demo screens)
  - **navigators/** - React Navigation setup (AppNavigator, DemoNavigator)
  - **theme/** - Theming system (colors, spacing, typography, dark mode support)
  - **context/** - React Context providers (AuthContext, EpisodeContext)
  - **config/** - Environment-based configuration (config.dev.ts, config.prod.ts)
  - **i18n/** - Internationalization with i18next
  - **utils/** - Utility functions and hooks
  - **services/** - API services and external integrations
  - **devtools/** - Development tools (Reactotron configuration)

### Path Aliases

TypeScript path aliases are configured in tsconfig.json:
- `@/*` maps to `./app/*`
- `@assets/*` maps to `./assets/*`

Use these consistently: `import { Button } from "@/components/Button"`

### Navigation Flow

The app uses a conditional navigation pattern based on authentication:
- **Unauthenticated**: Login screen only
- **Authenticated**: Welcome screen + Demo navigator with nested screens

Navigation is managed through React Navigation v7 with native stack navigator.

### State Management

- **Local storage**: MMKV (react-native-mmkv) for fast, encrypted key-value storage
- **Navigation state**: Persisted using MMKV
- **Authentication**: Managed via AuthContext using MMKV for token persistence
- **Backend data**: Convex provides reactive data sync (see Backend section)

### Theming

The app has a comprehensive theme system with:
- Light and dark mode support via ThemeProvider
- Theme-aware components that consume `useAppTheme()` hook
- Customizable colors, spacing, and typography
- Platform-specific styles where needed

### Backend (Convex)

This project uses **Convex** as its backend database and real-time sync engine. Convex provides:
- TypeScript-based queries and mutations
- Real-time reactivity
- Optimistic updates
- Built-in authentication support

**⚠️ CRITICAL: SHARED DATABASE WARNING**

This mobile app shares the **same Convex database** with the web application located at `/Users/kieransaunders/Dev/iTimedIT`.

**NEVER modify the Convex schema or create/edit `convex/schema.ts` in this mobile app.**

Both applications connect to the same production deployment:
- **Production URL**: `https://basic-greyhound-928.convex.cloud`
- **Web app location**: `/Users/kieransaunders/Dev/iTimedIT`
- **Mobile app location**: `/Users/kieransaunders/Dev/iTimedIT_iOS/iTimedITiOS`

Any schema changes must be coordinated with the web application and deployed from the web app's repository to avoid breaking changes or data corruption.

**Important Convex Documentation**: For detailed information about Convex implementation patterns, best practices, and API usage, refer to `Docs/convex_llms.md`. This comprehensive guide covers:
- Convex core concepts and workflow
- Database queries, mutations, and actions
- Schema design and validation
- Authentication patterns
- Real-time data synchronization
- File storage
- Vector search and AI integration
- Testing strategies

Convex configuration:
- Deployment URL: Set in `.env.local` as `EXPO_PUBLIC_CONVEX_URL`
- Generated types: Available in `convex/_generated/`

### Authentication

Custom authentication implementation using:
- `AuthContext` for auth state management
- `useAuth()` hook for accessing auth state
- Token and email stored in MMKV
- Email validation with regex pattern
- Conditional navigation based on `isAuthenticated` status

## TypeScript Configuration

The project uses strict TypeScript:
- `strict: true`
- `noImplicitAny: true`
- `noImplicitReturns: true`
- `noImplicitThis: true`

Module resolution uses "bundler" mode for modern Expo compatibility.

## Testing

- **Unit tests**: Jest with jest-expo preset
- **Component tests**: React Testing Library (@testing-library/react-native)
- **E2E tests**: Maestro for UI automation
- Test setup file: `test/setup.ts`

## Development Tools

- **Reactotron**: Enabled in DEV mode only (loaded via inline require in app.tsx)
- **Reactotron plugins**: MMKV storage inspection available
- **Metro bundler**: Configured with inline requires for performance

## Build Configuration

EAS Build profiles in eas.json:
- **development**: Internal distribution with debug builds and simulator support
- **development:device**: Same as development but for physical devices
- **preview**: Internal distribution for preview/testing
- **production**: Production builds for app store submission

## Important Development Notes

1. **Install with legacy peer deps**: Always use `npm install --legacy-peer-deps` due to React 19 compatibility
2. **Dev client required**: This project uses Expo dev client, not Expo Go
3. **First build required**: Run an EAS build before running on simulator/device
4. **Platform-specific files**: Some utils have `.native.ts` variants (e.g., gestureHandler)
5. **Inline requires**: Enabled in Metro for performance - useful for conditional imports
6. **Metro resolver**: Custom condition names for axios/apisauce compatibility

## Code Generation Anchors

The codebase uses comment anchors for code generation:
- `{/** 🔥 Your screens go here */}` in AppNavigator.tsx
- `{/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}` in AppNavigator.tsx

## Convex Integration

**⚠️ SHARED DATABASE - DO NOT MODIFY SCHEMA**

This mobile app shares the Convex database with the web application. Never create or modify `convex/schema.ts` or deploy schema changes from this repository.

When working with Convex:
1. **DO NOT modify the Convex schema** - all schema changes must be made in the web app repository at `/Users/kieransaunders/Dev/iTimedIT`
2. Refer to `Docs/convex_llms.md` for comprehensive documentation
3. Use the Convex React hooks for queries and mutations
4. Follow TypeScript-first development patterns
5. Leverage real-time reactivity for live data updates
6. Use validation for function arguments and return values
7. Consider caching and pagination for optimal performance
8. Only create new **queries, mutations, and actions** in the `convex/` folder - never touch schema files
