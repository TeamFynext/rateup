import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  useColorScheme,
} from "react-native";
import React from "react";
import { Search, SlidersHorizontal } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSearchFlowStore, useFlowFilterStore } from "@/utils/store";
import { colors } from "@/constants/constants";

const FlowSearchBar = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "white" : colors["slate-950"];
  const bgColor = isDark ? "#0f172a" : "#f8fafc";
  const router = useRouter();
  const { search, setSearch } = useSearchFlowStore();
  const { teamId, status, sortByDate, alphabetical } = useFlowFilterStore();

  const activeFilterCount = [
    teamId !== "all",
    status !== "all",
    sortByDate !== "latest",
    alphabetical !== null,
  ].filter(Boolean).length;

  return (
    <View className="px-4 py-4 flex-row items-center justify-between">
      <View
        className="flex-row items-center flex-1 rounded-full px-4 py-0.5 shadow-sm"
        style={{ backgroundColor: bgColor }}
      >
        <Search size={16} color={textColor} />
        <TextInput
          className="ml-2 flex-1 text-sm"
          style={{ color: textColor }}
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
            router.push("/protected/flow/FlowFilter");
          }}
          className="w-full h-full rounded-full flex items-center justify-center"
        >
          <SlidersHorizontal size={18} color={textColor} />
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
