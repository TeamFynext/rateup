import { View, Animated, Easing, TouchableOpacity, Text } from "react-native";
import React, { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AddContactIcon,
  FilterIcon,
  RefreshIcon,
} from "@/src/constants/imageExports";

const InboxButtons = ({ activeFilterCount = 0 }: { activeFilterCount?: number }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const rotation = useRef(new Animated.Value(0)).current;
  const [isRotating, setIsRotating] = useState(false);

  const handleRefresh = () => {
    if (isRotating) return;
    setIsRotating(true);
    queryClient.invalidateQueries({ queryKey: ["contactCounts"] });

    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    setTimeout(() => {
      rotation.stopAnimation(() => {
        rotation.setValue(0);
      });
      setIsRotating(false);
    }, 3000);
  };

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View className="flex-row gap-2 ml-2">
      <TouchableOpacity onPress={() => router.push("/inbox/AddContact")}>
        <AddContactIcon />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/inbox/Filters")}>
        <View className="relative">
          <FilterIcon />
          {activeFilterCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[16px] h-[16px] px-1 items-center justify-center">
              <Text className="text-white text-[10px] font-bold">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRefresh}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <RefreshIcon />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

export default InboxButtons;
