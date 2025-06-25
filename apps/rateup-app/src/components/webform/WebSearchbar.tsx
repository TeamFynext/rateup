import { View, TextInput, TouchableOpacity } from "react-native";
import React from "react";
import { SearchIcon } from "@/src/constants/imageExports";
import { SlidersHorizontal } from "lucide-react-native";
import { useRouter } from "expo-router";

const WebFormSearchBar = () => {
  const router = useRouter();
  return (
    <View className="px-4 py-4 flex-row items-center justify-between">
      {/* Search Box */}
      <View className="flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
        <SearchIcon width={16} height={16} color="#9CA3AF" />
        <TextInput
          className="ml-2 flex-1 text-sm text-gray-800"
          placeholder="Search Flow"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Filter Button */}
      <TouchableOpacity 
      onPress={()=>{
        router.push("/protected/webForms/WebFormFilter")
      }}
      className="ml-3 w-9 h-9 rounded-full bg-[#00998733] flex items-center justify-center">
        <SlidersHorizontal size={18} color="#009987" />
      </TouchableOpacity>
    </View>
  );
};

export default WebFormSearchBar;
