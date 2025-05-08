import { View, Animated, Easing, TouchableOpacity } from "react-native";
import React, { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AddContactIcon,
  FilterIcon,
  RefreshIcon,
} from "@/src/constants/imageExports";

const InboxButtons = () => {
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
        <FilterIcon />
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
