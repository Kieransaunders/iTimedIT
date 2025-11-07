# Expo Monorepo Configuration Reference

## SDK Version Matrix

### SDK 52+ (Automatic Configuration)
**No manual Metro configuration needed** when using `expo/metro-config`.

Metro automatically:
- Detects monorepo structure from workspace configuration
- Sets up watchFolders
- Configures resolver paths
- Handles node_modules resolution

### SDK 51 and Earlier (Manual Configuration)
Requires manual `metro.config.js` setup.

## Metro Configuration

### Automatic (SDK 52+)
Simply use the default config:

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
module.exports = config;
```

### Manual (Pre-SDK 52)
```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find monorepo root (or use find-yarn-workspace-root package)
const monorepoRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Watch all files within monorepo
config.watchFolders = [monorepoRoot];

// Configure module resolution paths
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
```

### Migration from Pre-SDK 52
If migrating to SDK 52+ and have custom Metro config, **remove these properties**:
- `watchFolders`
- `resolver.nodeModulesPath`
- `resolver.extraNodeModules`
- `resolver.disableHierarchicalLookup`

After removal, clear cache: `npx expo start --clear`

## Workspace Configuration

### npm, yarn, bun
Add to root `package.json`:
```json
{
  "name": "monorepo",
  "private": true,
  "version": "0.0.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### pnpm
Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## Package Dependency Syntax

### Standard Workspace Reference
```json
{
  "dependencies": {
    "my-package": "*"
  }
}
```

### Explicit Workspace Protocol (pnpm, npm, bun)
```json
{
  "dependencies": {
    "my-package": "workspace:*"
  }
}
```

This ensures workspace packages never resolve from npm registry.

## Directory Structure Templates

### Basic Monorepo
```
monorepo/
├── package.json              # Root config with workspaces
├── apps/
│   └── cool-app/            # Expo app
│       ├── package.json
│       ├── app.json
│       └── App.js
├── packages/
│   └── cool-package/        # Shared package
│       ├── package.json
│       └── index.js
└── node_modules/            # Hoisted dependencies
```

### With pnpm
```
monorepo/
├── package.json
├── pnpm-workspace.yaml      # Workspace config
├── .npmrc                   # Optional: node-linker=hoisted
├── apps/
│   └── cool-app/
└── packages/
    └── cool-package/
```

## App Creation Commands

### Within Monorepo
```bash
# npm
npx create-expo-app@latest apps/cool-app

# yarn
yarn create expo-app apps/cool-app

# pnpm
pnpm create expo-app apps/cool-app

# bun
bun create expo apps/cool-app
```

### After Creation
Always install dependencies from monorepo root:
```bash
cd /path/to/monorepo/root
[package-manager] install
```

## Package Creation Example

```bash
# Create directory
mkdir -p packages/cool-package
cd packages/cool-package

# Initialize package
npm init    # or yarn init, pnpm init, bun init --minimal

# Create entry point
echo "export const greeting = 'Hello!';" > index.js
```

## Dependency Resolution Configuration

### For Peer Dependencies
```json
{
  "resolutions": {
    "react": "^19.1.0",
    "react-native": "0.81.1"
  }
}
```

npm uses `overrides` instead:
```json
{
  "overrides": {
    "react": "^19.1.0"
  }
}
```

## Autolinking Configuration (SDK 54+)

Enable experimental autolinking module resolution in `app.json`:
```json
{
  "expo": {
    "experiments": {
      "autolinkingModuleResolution": true
    }
  }
}
```

This ensures Metro's resolved dependencies match autolinking's native modules.
