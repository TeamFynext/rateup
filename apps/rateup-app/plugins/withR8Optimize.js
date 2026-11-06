const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * The React Native / Expo Android template ships `proguard-android.txt`, which
 * contains `-dontoptimize`. With it, Play Console's "Optimization percentage"
 * stays at 0 even when R8 minification is enabled.
 *
 * This plugin swaps in `proguard-android-optimize.txt` so R8 actually inlines,
 * removes dead branches, and merges classes.
 *
 * Required to meet Google Play's 25% minimum DEX optimization coverage
 * (enforced February 2027).
 */
module.exports = function withR8Optimize(config) {
  return withAppBuildGradle(config, (config) => {
    const from = 'getDefaultProguardFile("proguard-android.txt")';
    const to = 'getDefaultProguardFile("proguard-android-optimize.txt")';

    if (config.modResults.contents.includes(to)) {
      return config;
    }

    if (!config.modResults.contents.includes(from)) {
      throw new Error(
        "[withR8Optimize] Could not find proguard-android.txt in android/app/build.gradle. " +
          "The Expo/RN template changed; update plugins/withR8Optimize.js.",
      );
    }

    config.modResults.contents = config.modResults.contents.replace(from, to);
    return config;
  });
};
