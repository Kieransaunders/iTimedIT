---
name: expo-monorepo
description: Expert guidance for setting up, configuring, and troubleshooting Expo projects in monorepos. Use when working with Expo in monorepo setups (workspaces), creating new monorepo projects, adding packages to monorepos, debugging monorepo issues (duplicate dependencies, Metro configuration, native module conflicts, build errors), or migrating between Expo SDK versions in monorepos. Covers Bun, npm, pnpm, and Yarn package managers.
---

# Expo Monorepo

Expert guidance for working with Expo projects in monorepo environments using workspaces (Bun, npm, pnpm, or Yarn).

## Key Concepts

**Monorepos** are single repositories containing multiple apps/packages. Expo has first-class monorepo support in SDK 52+.

**Workspace detection:** Expo automatically detects monorepos based on workspace configuration in package.json or pnpm-workspace.yaml.

**Critical constraints:**
- Multiple React Native versions NOT supported
- Duplicate React versions cause runtime errors
- Duplicate native modules may cause build errors
- SDK 52+ has automatic Metro configuration
- Pre-SDK 52 requires manual Metro setup

## Decision Tree

### Starting a New Monorepo

1. **Choose package manager** (npm, yarn, pnpm, bun)
2. **Create root package.json** with workspaces configuration
3. **Create directory structure** (apps/, packages/)
4. **Create first app** using `create-expo-app` in apps/ directory
5. **Install dependencies** from monorepo root

See `references/configuration.md` for complete setup examples.

### Adding Apps to Existing Monorepo

```bash
# From monorepo root
[package-manager] create expo-app apps/new-app

# Then install dependencies
[package-manager] install
```

### Creating Shared Packages

```bash
# Create package directory
mkdir -p packages/my-package
cd packages/my-package

# Initialize package
[package-manager] init

# Create entry point (e.g., index.js)
```

Add to app dependencies:
```json
{
  "dependencies": {
    "my-package": "*"
  }
}
```

For pnpm/npm/bun, can use `"workspace:*"` to ensure workspace resolution.

### Troubleshooting Issues

When encountering errors:

1. **Check SDK version:** Is it 52+? Automatic config applies.
2. **Verify Metro config:** SDK 52+ should NOT have manual config.
3. **Check for duplicates:** Run `[package-manager] why [package-name]`
4. **Clear Metro cache:** `npx expo start --clear`
5. **Review native paths:** Check android/ios build files for hardcoded paths
6. **Check isolation:** Consider switching to hoisted installs (pnpm)

See `references/troubleshooting.md` for detailed solutions.

## SDK Version Differences

### SDK 52+ (Current)
- **Automatic Metro configuration**
- No manual config needed
- Auto-detects workspaces
- Remove manual Metro config if migrating from earlier versions

### Pre-SDK 52
- Requires manual Metro configuration
- Must set watchFolders and resolver.nodeModulesPaths
- See `references/configuration.md` for legacy setup

## Migration to SDK 52+

If upgrading to SDK 52+ with existing metro.config.js:

1. **Remove these properties if present:**
   - watchFolders
   - resolver.nodeModulesPath
   - resolver.extraNodeModules
   - resolver.disableHierarchicalLookup

2. **Clear cache:** `npx expo start --clear`

3. **Test:** If app works, migration complete

If custom Metro config is needed for other reasons, keep only non-monorepo customizations.

## Common Issues Quick Reference

### Duplicate Dependencies
Run: `[package-manager] why [package-name]`
Solution: Add resolutions/overrides in root package.json

### Native Build Errors
Check: android/ios files for hardcoded node_modules paths
Solution: Use dynamic Node resolution (see troubleshooting.md)

### Metro Resolution Errors
Check: SDK version and Metro config
Solution: Ensure automatic config for SDK 52+, or clear cache

### Peer Dependency Conflicts
Add resolutions for conflicting peer dependencies
npm uses "overrides", others use "resolutions"

### Isolated Install Issues (pnpm/Bun)
SDK 54+ supports isolated installs
SDK 53 and earlier: Add `.npmrc` with `node-linker=hoisted`

## Package Manager Commands

### Check Dependencies
```bash
npm why [package]
yarn why [package]
pnpm why --depth=10 [package]
bun pm why [package]
```

### Create App
```bash
npx create-expo-app@latest apps/app-name    # npm
yarn create expo-app apps/app-name          # yarn
pnpm create expo-app apps/app-name          # pnpm
bun create expo apps/app-name               # bun
```

### Install Dependencies (from root)
```bash
npm install / yarn install / pnpm install / bun install
```

## Detailed References

- **Configuration patterns and examples:** Read `references/configuration.md`
- **Troubleshooting and solutions:** Read `references/troubleshooting.md`

Load these references when detailed configuration or troubleshooting information is needed.
