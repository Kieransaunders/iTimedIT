// Learn more: https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default Expo config with require.context support enabled
const config = getDefaultConfig(__dirname);

// Ensure context modules are enabled for expo-router
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Monorepo setup: Watch all files in the workspace
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Include both the default watchFolders and the workspace root
config.watchFolders = [
  ...config.watchFolders || [],
  workspaceRoot
];
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
};

module.exports = config;
