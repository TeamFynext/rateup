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
    queryClient.invalidateQueries({queryKey:["contactCounts"]});

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
    <View className="bg-[#EBF7F5] h-[9vh] flex-row justify-around items-center mb-[-21] px-4">
      <View className="bg-[#FFFFFF] rounded-full px-4 py-2 mb-2 border border-[#E2E5ED] flex-row gap-1 items-center w-[60vw]">
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
          className="w-full"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* add contacts */}
      <View className="flex-row gap-4">
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
  );
}
