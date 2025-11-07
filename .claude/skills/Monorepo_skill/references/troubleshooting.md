# Expo Monorepo Troubleshooting Guide

## Duplicate Native Packages

### Detection
Check for duplicate packages using package manager:
```bash
# npm
npm why react-native

# yarn
yarn why react-native

# pnpm
pnpm why --depth=10 react-native

# bun
bun pm why react-native
```

Look for multiple versions in output (e.g., `react-native@0.79.5` and `react-native@0.81.0`).

### Resolution
**Critical:** Duplicate React Native versions in a single monorepo are NOT supported.

Add dependency resolutions to root `package.json`:

```json
{
  "resolutions": {
    "react": "^19.1.0",
    "react-native": "0.81.1"
  }
}
```

**Note:** npm uses `overrides` instead of `resolutions`.

### Deduplicating Auto-linked Native Modules (SDK 54+)
Set in app.json:
```json
{
  "expo": {
    "experiments": {
      "autolinkingModuleResolution": true
    }
  }
}
```

This forces Metro-resolved dependencies to match native modules from autolinking.

## Script Does Not Exist Errors

### Problem
Hardcoded paths in native build files break in monorepos due to hoisting:

Android:
```gradle
apply from: "../../node_modules/react-native/react.gradle"
```

iOS:
```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
```

### Solution
Use Node's resolution instead:

Android:
```gradle
apply from: new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim(), "../react.gradle")
```

iOS:
```ruby
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")
```

This dynamically resolves package locations regardless of hoisting.

## Isolated Dependencies Issues

### When It Matters
- **pnpm** and **Bun** use isolated installs by default
- SDK 54+ supports isolated dependencies
- SDK 53 and earlier: disable isolation or expect build errors

### Disabling Isolation (pnpm)
Create `.npmrc` in repository root:
```
node-linker=hoisted
```

### Benefits of Isolated Installs
- Stricter dependency enforcement
- Prevents accidental dependencies
- More deterministic builds
- Reduces broken dependency chains

### Trade-offs
Not all React Native libraries support isolated dependencies. If encountering build/resolution errors, switch to hoisted strategy.

## Peer Dependency Conflicts

### Problem
Packages with outdated peerDependencies (e.g., not supporting React 19).

### Solution
Add resolutions for peer dependencies:

npm:
```json
{
  "overrides": {
    "react": "^19.1.0"
  }
}
```

yarn/pnpm/bun:
```json
{
  "resolutions": {
    "react": "^19.1.0"
  }
}
```

## Common Resolution Checklist

When facing monorepo issues:

1. **Check for duplicates**: Run `[package-manager] why [package-name]`
2. **Verify React Native version**: Only one version allowed
3. **Check Metro cache**: Run with `--clear` flag
4. **Review native paths**: Ensure dynamic resolution in build files
5. **Consider isolation**: Try hoisted installs if isolated fails
6. **Add resolutions**: Force specific versions for conflicting peer deps
7. **Check autolinking**: Enable experiments.autolinkingModuleResolution (SDK 54+)
