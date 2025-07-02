import { View, TextInput, TouchableOpacity, Text } from "react-native";
import React from "react";
import { SearchIcon } from "@/src/constants/imageExports";
import { SlidersHorizontal } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  useSearchWebFormStore,
  useWebFormFilterStore,
} from "@/src/utils/store";

const WebFormSearchBar = () => {
  const router = useRouter();
  const { search, setSearch } = useSearchWebFormStore();
  const { teamId, status, sortByDate, alphabetical } = useWebFormFilterStore();

  const activeFilterCount =
    (teamId !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (sortByDate !== "latest" ? 1 : 0) +
    (alphabetical !== null ? 1 : 0);

  return (
    <View className="px-4 py-4 flex-row items-center justify-between">
      {/* Search Box */}
      <View className="flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
        <SearchIcon width={16} height={16} color="#9CA3AF" />
        <TextInput
          className="ml-2 flex-1 text-sm text-gray-800"
          placeholder="Search Web forms"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <View className="relative ml-3">
        <TouchableOpacity
          onPress={() => {
            router.push("/protected/webForms/WebFormFilter");
          }}
          className="w-9 h-9 rounded-full bg-[#00998733] flex items-center justify-center"
        >
          <SlidersHorizontal size={18} color="#009987" />
        </TouchableOpacity>
        {activeFilterCount > 0 && (
          <View className="absolute -top-1 -right-1 min-w-[16px] h-4 px-[4px] rounded-full bg-red-500 items-center justify-center">
            <Text className="text-white text-[10px] font-bold">
              {activeFilterCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default WebFormSearchBar;
