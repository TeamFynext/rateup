import { View, TextInput, TouchableOpacity, Text } from "react-native";
import React from "react";
import { SearchIcon } from "@/src/constants/imageExports";
import { SlidersHorizontal } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSearchFlowStore, useFlowFilterStore } from "@/src/utils/store";

const FlowSearchBar = () => {
  const router = useRouter();
  const { search, setSearch } = useSearchFlowStore();
  const { teamId, status, sortByDate, alphabetical } = useFlowFilterStore();

  // ✅ Count active filters
  const activeFilterCount = [
    teamId !== "all",
    status !== "all",
    sortByDate !== "latest",
    alphabetical !== null,
  ].filter(Boolean).length;

  return (
    <View className="px-4 py-4 flex-row items-center justify-between">
      {/* Search Box */}
      <View className="flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
        <SearchIcon width={16} height={16} color="#9CA3AF" />
        <TextInput
          className="ml-2 flex-1 text-sm text-gray-800"
          placeholder="Search Flow"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Button with badge */}
      <View className="ml-3 w-9 h-9">
        <TouchableOpacity
          onPress={() => {
            router.push("/protected/flows/FlowFilter");
          }}
          className="w-full h-full rounded-full bg-[#00998733] flex items-center justify-center"
        >
          <SlidersHorizontal size={18} color="#009987" />
        </TouchableOpacity>

        {/* Badge */}
        {activeFilterCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 w-5 h-5 rounded-full items-center justify-center">
            <Text className="text-white text-xs font-bold">
              {activeFilterCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default FlowSearchBar;
