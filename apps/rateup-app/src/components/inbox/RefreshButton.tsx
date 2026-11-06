import { useColorScheme } from "nativewind";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
import { RefreshCcw } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function RefreshButton() {
  const refreshRotation = useSharedValue(0);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  // The design's header action: 38x38 / radius 11, 20px glyph in `--fg-2`.
  const iconColor = isDark ? "rgba(255,255,255,0.72)" : "#2E302E";
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    refreshRotation.value = 0;
    refreshRotation.value = withTiming(720, {
      duration: 2000,
      easing: Easing.linear,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRefresh();
    }, 1000);

    return () => clearTimeout(timer);
    // One refresh a second after mount. `handleRefresh` is redeclared every
    // render, so depending on it would restart the timer indefinitely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${refreshRotation.value}deg`,
        },
      ],
    };
  });

  return (
    <Pressable
      onPress={handleRefresh}
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View style={refreshAnimatedStyle}>
        <RefreshCcw color={iconColor} size={20} />
      </Animated.View>
    </Pressable>
  );
}
