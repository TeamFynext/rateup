import { setAudioModeAsync } from "expo-audio";

// expo-audio never configures an AVAudioSession on its own — the category is only
// ever set from setAudioModeAsync. Without these calls iOS leaves the app on its
// default `.soloAmbient` category, which is muted by the hardware Ring/Silent
// switch, so voice notes and video play silently.
//
// These are iOS-only in effect. setAudioModeAsync drops `allowsRecording` from the
// payload on Android (and nothing in the Android module reads it), while the other
// values here match Android's existing defaults — so playback there is unchanged.

/**
 * Puts the session in playback mode (`.playback` on iOS).
 *
 * Call on app start, and again after every recording: stopping a recorder does
 * not restore the category, so the session would otherwise stay in
 * `.playAndRecord` for the rest of the app's lifetime — which leaves playback
 * inaudible until something else (an incoming call) forces iOS to re-activate
 * the session, and keeps the orange mic indicator lit.
 */
export async function configurePlaybackAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });
  } catch (error) {
    console.error("Error configuring playback audio mode:", error);
  }
}

/**
 * Puts the session in record mode (`.playAndRecord` on iOS).
 *
 * `playsInSilentMode` must stay true: expo-audio rejects
 * `playsInSilentMode: false` combined with `allowsRecording: true` on iOS.
 */
export async function configureRecordingAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
  });
}
