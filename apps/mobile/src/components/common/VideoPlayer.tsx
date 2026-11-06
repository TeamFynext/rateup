import { useVideoPlayer, VideoView } from "expo-video";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * Video playback, on expo-video. It ships with the Expo SDK, so on Android it uses the
 * same Media3 (ExoPlayer) version as expo-audio. react-native-video was built against an
 * older Media3 than expo-audio pulls in, and crashed (`NoSuchMethodError` in
 * `DefaultLoadControl`) the moment any player started.
 *
 * The player is created for `uri`, recreated when it changes, and released on unmount.
 */

/** A still first frame, for a message bubble. Not interactive: the bubble takes the tap. */
export function VideoThumbnail({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

/** Full playback with the platform's own controls, starting as soon as it opens. */
export function VideoPlayback({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => p.play());
  return <VideoView player={player} style={style} contentFit="contain" nativeControls />;
}
