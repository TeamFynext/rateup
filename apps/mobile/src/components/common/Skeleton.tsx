import React, { useEffect } from "react";
import { DimensionValue, StyleProp, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { useColorScheme } from "nativewind";

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A pulsing placeholder block, sized to the content it stands in for.
 *
 * Preferred over a spinner wherever the final layout is known, because it
 * reserves the same space and so the screen does not jump when the data lands.
 */
export const Skeleton = ({
  width = "100%",
  height = 12,
  borderRadius = 6,
  style,
}: SkeletonProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

/** Convenience wrapper for a circular placeholder, such as an avatar. */
export const SkeletonCircle = ({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) => (
  <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />
);

/** Groups skeletons without them each animating on their own timeline. */
export const SkeletonRow = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    style={[{ flexDirection: "row", alignItems: "center" }, style]}
    accessibilityRole="progressbar"
  >
    {children}
  </View>
);

export default Skeleton;
