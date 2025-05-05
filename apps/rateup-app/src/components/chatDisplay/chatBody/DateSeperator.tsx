import { View, Text } from "react-native";
import React from "react";

type DateSeparatorProps = {
  label: string;
};

const DateSeparator = ({ label }: DateSeparatorProps) => {
  return (
    <View className="flex-row justify-center my-2">
      <View className="bg-gray-200 px-4 py-1 rounded-full">
        <Text className="text-gray-600 text-xs">{label}</Text>
      </View>
    </View>
  );
};

export default DateSeparator;
