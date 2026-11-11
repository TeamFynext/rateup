import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { StarMark } from "@/constants/imageExports";

/** A quick sign-in never shows the overlay; only one that keeps the user waiting does. */
const SHOW_AFTER_MS = 700;

/**
 * Covers the sign-in page while a sign-in is in progress: the logo, a spinner and what
 * is happening ("Signing you in…", then "Loading your inbox…").
 */
export default function SignInOverlay({ stage }: { readonly stage: string | null }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [waitedLong, setWaitedLong] = useState(false);
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  const busy = stage !== null;
  const visible = busy && waitedLong;
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setWaitedLong(true), SHOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setWaitedLong(false);
    };
  }, [busy]);

  useEffect(() => {
    if (!visible || reduceMotion) return;
    pulse.value = withRepeat(withTiming(1.12, { duration: 700 }), -1, true);
    return () => {
      pulse.value = 1;
    };
  }, [visible, reduceMotion, pulse]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (!visible || !stage) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        StyleSheet.absoluteFill,
        styles.center,
        { backgroundColor: isDark ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.94)" },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={stage}
    >
      <Animated.View style={logoStyle}>
        <StarMark width={72} height={72} />
      </Animated.View>
      <View style={styles.row}>
        <ActivityIndicator color={isDark ? "#60A5FA" : "#004F98"} />
        <Text className="ml-3 text-lg font-semibold text-[#004F98] dark:text-blue-400 font-[Geist]">
          {stage}
        </Text>
      </View>
      <Text className="mt-2 text-sm text-[#7A8289] dark:text-gray-400">
        This only takes a moment
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", zIndex: 10 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 28 },
});
