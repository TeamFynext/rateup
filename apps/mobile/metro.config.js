const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Inside the pnpm workspace, getDefaultConfig watches the root node_modules and every workspace
// package. The other apps (api, web, ...) are never imported here, so leave them out: watching
// them only slows Metro's crawl.
const workspaceRoot = path.resolve(__dirname, "../..");
config.watchFolders = config.watchFolders.filter((folder) => {
  const relative = path.relative(workspaceRoot, folder);
  return !relative.startsWith("apps" + path.sep) || folder === __dirname;
});

config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");

config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts.push("svg");

module.exports = withNativeWind(config, { input: "./src/global.css" });
