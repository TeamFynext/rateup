import React from "react";
import { View, Text } from "react-native";
import dayjs from "dayjs";

export const ContactCard = ({ item }: { item: any }) => {
  const created = dayjs(item.createdAt);
  const isToday = created.isSame(dayjs(), "day");
  const time = isToday
    ? created.format("h:mm A")
    : created.format("DD/MM/YYYY");

  return (
    <View className="flex-row items-start gap-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-md">
      {/* Avatar */}
      <View className="w-14 h-14 rounded-full bg-rateUpGreen20 items-center justify-center">
        <Text className="text-rateUpGreen font-bold text-2xl">{item.phone?"0":"R"}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text
            className="font-semibold text-base text-gray-900"
            numberOfLines={1}
          >
            {item.phone || "Respondent"}
          </Text>
          <Text className="text-xs text-gray-500">{time}</Text>
        </View>

        {/* Tags */}
        <View className="flex-row gap-2 flex-wrap mt-1">
          <Text className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
            {item.count} responses
          </Text>
        </View>
      </View>
    </View>
  );
};
