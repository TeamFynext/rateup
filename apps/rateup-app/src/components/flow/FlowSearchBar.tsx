import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  useColorScheme,
  Platform,
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

  const borderColor = isDark ? "#1e293b" : "#e2e8f0";

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
    <View className="px-4 py-4 flex-row items-center">
      {/* Search Bar */}
      <View
        className="flex-1 flex-row items-center rounded-full px-4 border"
        style={{
          backgroundColor: bgColor,
          borderColor,
          height: 48,
        }}
      >
        <Search size={18} color={textColor} />

        <TextInput
          className="flex-1 ml-3 text-sm"
          style={{
            color: textColor,
            paddingVertical: 0,
            includeFontPadding: false,
            textAlignVertical: "center",
            height: 48,
            marginTop: Platform.OS === "ios" ? 1 : 0,
          }}
          placeholder="Search Flow"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Button */}
      <View className="relative ml-3">
        <TouchableOpacity
          onPress={() => {
            router.push("/protected/flow/FlowFilter");
          }}
          className="w-11 h-11 rounded-full items-center justify-center"
        >
          <SlidersHorizontal size={20} color={textColor} />
        </TouchableOpacity>

        {/* Badge */}
        {activeFilterCount > 0 && (
          <View className="absolute top-0 right-0 min-w-[18px] h-[18px] px-[4px] rounded-full bg-red-500 items-center justify-center">
            <Text className="text-white text-[10px] font-bold">
              {activeFilterCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default FlowSearchBar;
