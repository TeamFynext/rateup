import {
  View,
  TouchableOpacity,
  Text,
  Pressable,
  useColorScheme,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { EllipsisVertical, Filter, RefreshCcw } from "lucide-react-native";
import { colors } from "@/constants/constants";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const InboxButtons = ({
  activeFilterCount = 0,
}: {
  activeFilterCount?: number;
}) => {
  const router = useRouter();
  const refreshRotation = useSharedValue(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "white" : colors["slate-950"];
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
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
    <View className="relative ml-2">
      <TouchableOpacity onPress={() => setOpen((v) => !v)}>
        <EllipsisVertical color={"white"} />
      </TouchableOpacity>
      {open && (
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            position: "absolute",
            top: -1000,
            bottom: -1000,
            left: -1000,
            right: -1000,
            zIndex: 40,
          }}
        />
      )}

      {/* MENU */}
      {open && (
        <View className="absolute right-0 top-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg py-2 w-48 z-50">
          {/* FILTERS */}
          <Pressable
            className="flex-row items-center gap-3 px-4 py-3"
            onPress={() => {
              setOpen(false);
              router.push("/protected/inbox/Filters");
            }}
          >
            <View className="relative">
              <Filter color={textColor} size={18} />
              {activeFilterCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-primaryBlue rounded-full min-w-[16px] h-[16px] px-1 items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </View>
            <Text className="dark:text-white text-sm">Filters</Text>
          </Pressable>

          {/* REFRESH */}
          <Pressable
            className="flex-row items-center gap-3 px-4 py-3"
            onPress={() => {
              // setOpen(false);
              handleRefresh();
            }}
          >
            <Animated.View style={refreshAnimatedStyle}>
              <RefreshCcw color={textColor} size={18} />
            </Animated.View>
            <Text className="dark:text-white text-sm">Refresh</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default InboxButtons;
