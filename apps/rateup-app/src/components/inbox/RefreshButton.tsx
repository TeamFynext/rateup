import React, { useEffect } from "react";
import { Pressable, View, useColorScheme } from "react-native";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark
    ? "rgba(255,255,255,0.85)"
    : "rgba(255,255,255,0.88)";
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
    <Pressable onPress={handleRefresh}>
      <View>
        <Animated.View style={refreshAnimatedStyle}>
          <RefreshCcw color={iconColor} size={20} />
        </Animated.View>
      </View>
    </Pressable>
  );
}
