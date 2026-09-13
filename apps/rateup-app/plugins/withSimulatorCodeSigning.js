const { withEntitlementsPlist } = require("expo/config-plugins");

const APPLE_SIGN_IN = "com.apple.developer.applesignin";

/**
 * Lets `npx expo run:ios` build for the simulator without any Apple developer
 * certificate on the machine.
 *
 * `ios.usesAppleSignIn` makes expo-apple-authentication write the
 * `com.apple.developer.applesignin` entitlement, and @expo/cli treats that
 * entitlement as one of the two that require development code signing *even for
 * simulator builds* (see `run/ios/codeSigning/simulatorCodeSigning.js`). Without
 * a certificate the build dies before xcodebuild starts:
 *
 *   › Your computer requires some additional setup before you can build onto
 *     physical iOS devices.
 *   CommandError: No code signing certificates are available to use.
 *
 * The message names physical devices, but it fires on a simulator build too.
 *
 * So this strips the entitlement from local prebuilds, where it buys nothing:
 * Sign in with Apple does not work in the simulator regardless. EAS builds
 * (`EAS_BUILD=true`, set by both cloud and `eas build --local`) keep it, so
 * TestFlight and App Store builds are unaffected.
 *
 * To keep it in a local prebuild — testing Sign in with Apple on a real device,
 * which does need a certificate — run prebuild with `EXPO_APPLE_SIGNIN=1`:
 *
 *   EXPO_APPLE_SIGNIN=1 npx expo prebuild -p ios --clean
 *
 * Two ordering notes, both load-bearing:
 *   - This must be listed FIRST in app.json's `plugins`. Mods run
 *     last-registered-first (`withMod` runs its action, then `nextMod`, the
 *     mod registered before it), so being first means running after
 *     expo-apple-authentication has written the entitlement.
 *   - @expo/cli reads the entitlements file named by the *Release* build
 *     configuration, so a Debug-only entitlements file does not bypass the
 *     check.
 */
module.exports = function withSimulatorCodeSigning(config) {
  if (process.env.EAS_BUILD || process.env.EXPO_APPLE_SIGNIN === "1") {
    return config;
  }

  return withEntitlementsPlist(config, (config) => {
    if (APPLE_SIGN_IN in config.modResults) {
      delete config.modResults[APPLE_SIGN_IN];
      console.log(
        "[withSimulatorCodeSigning] Dropped Sign in with Apple from this local prebuild " +
          "so simulator builds need no certificate. EAS builds keep it; " +
          "use EXPO_APPLE_SIGNIN=1 to keep it here.",
      );
    }
    return config;
  });
};
