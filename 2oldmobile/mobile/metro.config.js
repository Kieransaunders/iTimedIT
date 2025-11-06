// Learn more: https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');

// Get the default Expo config (SDK 54 auto-configures for monorepos)
const config = getDefaultConfig(__dirname);

// Ensure context modules are enabled for expo-router
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Note: SDK 54+ auto-configures watchFolders and nodeModulesPaths for monorepos
// Manual configuration removed per Expo docs

module.exports = config;
