const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  projectRoot,
  watchFolders: [projectRoot],
  resolver: {
    assetExts: [
      ...defaultConfig.resolver.assetExts,
      'lottie',
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
