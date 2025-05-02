import {
  View,
  TextInput,
  Pressable,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import {
  AddContactIcon,
  FilterIcon,
  RefreshIcon,
  SearchIcon,
  BackIcon,
} from "@/src/constants/imageExports";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type SearchBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

export default function SearchBar({
  searchTerm,
  setSearchTerm,
}: SearchBarProps) {
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
    <View className="bg-rateUpLightGreen px-4 pt-3 pb-2">
      <View className="flex-row items-center justify-between gap-2">
        {/* Search Input */}
        <View className="flex-1 flex-row items-center border border-[#E2E5ED] bg-white rounded-full px-4 py-2">
          {searchTerm ? (
            <Pressable onPress={() => setSearchTerm("")}>
              <BackIcon />
            </Pressable>
          ) : (
            <SearchIcon />
          )}

          <TextInput
            placeholder="Search Contacts"
            placeholderTextColor="#E2E5ED"
            className="flex-1 ml-2 text-sm"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Icons */}
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
      </View>
    </View>
  );
}
