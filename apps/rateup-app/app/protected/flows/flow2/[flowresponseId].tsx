import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackIcon } from "@/src/constants/imageExports";
import { useLocalSearchParams, useRouter } from "expo-router";

const Flow2Response = () => {
  const { respondent } = useLocalSearchParams();
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-5 p-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center space-x-3 mb-4"
        >
          <BackIcon height={25} width={25} color="black" />
        </TouchableOpacity>

        {/* Avatar + Name */}
        <View className="flex-row items-center space-x-4 mb-6 gap-3">
          <View className="w-14 h-14 rounded-full bg-rateUpLightGreen items-center justify-center">
            <Text className="text-rateUpGreen font-bold text-2xl">
              {respondent ? "0" : "R"}
            </Text>
          </View>
          <Text className="text-xl font-medium text-gray-900">
            {respondent || "Respondent"}
          </Text>
        </View>
      </View>
      <View className="flex-1 justify-center items-center">
        <Text className="text-rateUpTextGray">No responses to be shown</Text>
      </View>
    </SafeAreaView>
  );
};

export default Flow2Response;