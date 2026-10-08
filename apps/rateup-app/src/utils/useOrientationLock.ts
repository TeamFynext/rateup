import { useEffect } from "react";
import { Dimensions } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";

/**
 * Android's large-screen line: a display whose shorter side is 600dp or more is a tablet,
 * or an unfolded foldable. From Android 16 the system ignores orientation locks on those,
 * and Play flags apps that declare one in the manifest.
 */
const LARGE_SCREEN_DP = 600;

function applyLock(width: number, height: number) {
  const lock =
    Math.min(width, height) < LARGE_SCREEN_DP
      ? ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
      : ScreenOrientation.unlockAsync();
  lock.catch((err) => console.warn("Could not set the screen orientation:", err));
}

/**
 * Phones stay portrait, as before; tablets and foldables rotate freely.
 *
 * Done at runtime rather than with `"orientation": "portrait"` in app.json, which locked
 * every device in the manifest. Re-checked on every size change, so folding or
 * unfolding a foldable moves it between the two.
 */
export function useOrientationLock() {
  useEffect(() => {
    const { width, height } = Dimensions.get("screen");
    applyLock(width, height);
    const sub = Dimensions.addEventListener("change", ({ screen }) =>
      applyLock(screen.width, screen.height),
    );
    return () => sub.remove();
  }, []);
}
