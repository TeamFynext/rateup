const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Shared monorepo packages (`link:` dependencies, e.g. @rateup/utils) live outside this app,
// which is its own pnpm install; Metro only watches the project folder unless told otherwise.
const { dependencies } = require("./package.json");
config.watchFolders = [
  ...config.watchFolders,
  ...Object.values(dependencies)
    .filter((spec) => spec.startsWith("link:"))
    .map((spec) => path.resolve(__dirname, spec.slice("link:".length))),
];

config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");

config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts.push("svg");

module.exports = withNativeWind(config, { input: "./src/global.css" });
