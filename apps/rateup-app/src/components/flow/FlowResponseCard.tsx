import { useColorScheme } from "nativewind";
import React from "react";
import { View, Text } from "react-native";
import dayjs from "dayjs";

export const ContactCard = ({ item }: { item: any }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const created = dayjs(item.createdAt);

  const isToday = created.isSame(dayjs(), "day");

  const time = isToday
    ? created.format("h:mm A")
    : created.format("DD/MM/YYYY");

  // Allowed response types
  const allowedTypes = [
    "Yes or No",
    "Like or Dislike",
    "Smiley",
    "Rating",
    "Opinion Scale",
  ];

  // Format response for display
  const formatResponse = (responseObj: any) => {
    if (!responseObj) return "—";

    const values = Object.values(responseObj);

    return values
      .map((val) =>
        typeof val === "object" ? JSON.stringify(val) : String(val),
      )
      .join(", ");
  };

  // Dynamic class for each response type
  const getTagStyle = (type: string) => {
    switch (type) {
      case "Smiley":
        return {
          container: isDark ? "bg-yellow-900" : "bg-yellow-100",
          text: isDark ? "text-yellow-200" : "text-yellow-800",
        };

      case "Rating":
        return {
          container: isDark ? "bg-green-900" : "bg-green-100",
          text: isDark ? "text-green-200" : "text-green-800",
        };

      default:
        return {
          container: isDark ? "bg-blue-900" : "bg-blue-100",
          text: isDark ? "text-blue-200" : "text-blue-800",
        };
    }
  };

  const filteredResponses = item.responses
    ?.filter((r: any) => allowedTypes.includes(r.type))
    .slice(0, 3);

  return (
    <View
      className="flex-row items-start gap-4 rounded-2xl p-4 border"
      style={{
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        borderColor: isDark ? "#1e293b" : "#E5E7EB",
      }}
    >
      {/* Avatar */}
      <View className="w-14 h-14 rounded-full bg-rateUpGreen20 items-center justify-center">
        <Text className="text-rateUpGreen font-bold text-2xl">
          {item.phone ? "0" : "R"}
        </Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row justify-between items-center">
          <Text
            className="font-semibold text-md text-gray-900 dark:text-white flex-1 mr-2"
            numberOfLines={1}
          >
            {item.phone || "Respondent"}
          </Text>

          <Text className="text-xs text-gray-500 dark:text-slate-400">
            {time}
          </Text>
        </View>

        {/* Tags */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row gap-2 flex-wrap mt-3">
            {filteredResponses.length !== 0 ? (
              filteredResponses.map((r: any, index: number) => {
                const { container, text } = getTagStyle(r.type);

                return (
                  <Text
                    key={r.questionId || index}
                    className={`px-4 py-1 rounded-full ${container} ${text} text-sm font-medium`}
                  >
                    {formatResponse(r.response)}
                  </Text>
                );
              })
            ) : (
              <View className="bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <Text className="text-gray-700 dark:text-slate-300 text-xs font-semibold">
                  {item?.responses?.length || 0}{" "}
                  {item?.responses?.length > 1 ? "Responses" : "Response"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
