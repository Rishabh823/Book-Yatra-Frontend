/**
 * Metro configuration for React Native
 * Enables transpilation of selected node_modules that publish modern syntax (private fields)
 */
const { getDefaultConfig } = require("expo/metro-config");
const defaultConfig = getDefaultConfig(__dirname);

// List packages from node_modules that should be transpiled by Metro
const packagesToTransform = [
  // add any package names that ship modern syntax causing Hermes issues
  "react-native-reanimated",
  "react-native-gesture-handler",
];

module.exports = {
  ...defaultConfig,
  transformer: defaultConfig.transformer,
  resolver: {
    ...defaultConfig.resolver,
    blacklistRE: defaultConfig.resolver.blacklistRE,
    // Provide additional sourceExts if needed
  },
  watchFolders: [
    // allow resolving linked packages if any
  ],
};
