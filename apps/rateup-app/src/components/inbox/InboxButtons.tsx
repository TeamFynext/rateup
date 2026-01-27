import {
  View,
  Animated,
  Easing,
  TouchableOpacity,
  Text,
  Pressable,
  useColorScheme,
} from "react-native";
import React, { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  EllipsisVertical,
  Filter,
  RefreshCcw,
  UserPlus,
  UserPlus2,
} from "lucide-react-native";
import { colors } from "@/src/constants/constants";

const InboxButtons = ({
  activeFilterCount = 0,
}: {
  activeFilterCount?: number;
}) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "white" : colors["slate-950"];
  const queryClient = useQueryClient();
  const rotation = useRef(new Animated.Value(0)).current;
  const [isRotating, setIsRotating] = useState(false);
  const [open, setOpen] = useState(false);
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
      rotation.stopAnimation(() => rotation.setValue(0));
      setIsRotating(false);
    }, 3000);
  };

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
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
          {/* ADD CONTACT */}
          {/* <Pressable
            className="flex-row items-center gap-3 px-4 py-3"
            onPress={() => {
              setOpen(false);
              router.push("/protected/inbox/AddContact");
            }}
          >
            <UserPlus2 color={textColor} size={18} />
            <Text className="dark:text-white text-sm">Add contact</Text>
          </Pressable> */}

          {/* FILTERS */}
          <Pressable
            className="flex-row items-center gap-3 px-4 py-3"
            onPress={() => {
              setOpen(false);
              router.push("/protected/inbox/Filters");
            }}
          >
            <View className="relative">
              <Filter color={textColor} size={18}  />
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
            <Animated.View style={{ transform: [{ rotate }] }}>
              <RefreshCcw color={textColor} size={18}  />
            </Animated.View>
            <Text className="dark:text-white text-sm">Refresh</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default InboxButtons;
