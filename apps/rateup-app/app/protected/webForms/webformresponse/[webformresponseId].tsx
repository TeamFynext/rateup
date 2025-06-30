import { View, Text, FlatList, TouchableOpacity } from "react-native";
import React, { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWebFormResponseDataStore } from "@/src/utils/store";
import { useQuestions } from "@/src/api/question/question.query";
import { BackIcon } from "@/src/constants/imageExports";

const ResponseId = () => {
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();
  const { webformresponseId, webformId, respondent } = useLocalSearchParams();
  const { data } = useWebFormResponseDataStore();
  const { data: questions } = useQuestions(webformId);
  const router = useRouter();

  if (!data?.length || !data[0]?.responses) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text>No response found.</Text>
      </SafeAreaView>
    );
  }

  const responses = data[0].responses;

  const questionMap = useMemo(() => {
    const map: Record<string, string> = {};
    questions?.forEach((q) => {
      const raw =
        q.title?.English || q.description?.English || q.label?.English || "";
      map[q.id] = stripHtml(raw);
    });
    return map;
  }, [questions]);

  return (
    <SafeAreaView className="flex-1 bg-white px-4">
      {/* Header */}
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

      {/* Response List */}
      <FlatList
        data={responses}
        keyExtractor={(item, index) => `${item.questionId}-${index}`}
        renderItem={({ item, index }) => {
          const questionId = item.questionId;
          const responseType = item.type;
          const questionTitle = questionMap[questionId] || "Unknown Question";

          const value = item.response?.[responseType];
          const displayValue =
            typeof value === "string" || typeof value === "number" || typeof value === "boolean"
              ? String(value)
              : Array.isArray(value)
              ? value
                  .map((v) => (typeof v === "string" ? v : v?.value || ""))
                  .join(", ")
              : typeof value === "object" && value?.value
              ? value.value
              : Object.entries(value)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n");

          return (
            <View className="flex justify-center mb-8">
              {/* Index & Label */}
              <View className="flex-row items-center space-x-2 mb-2 gap-1">
                <View className="w-6 h-6 rounded-full bg-rateUpGreen items-center justify-center">
                  <Text className="text-white text-xs font-semibold">
                    {index + 1}
                  </Text>
                </View>
                <Text className="text-white bg-rateUpGreen px-2 py-1 rounded-full text-xs font-medium">
                  {responseType}
                </Text>
              </View>

              {/* Question Title */}
              <View className="pl-8">
                <Text className="text-md font-bold text-gray-800 mb-1">
                  {questionTitle}
                </Text>

                {/* Response Text / Badge */}
                <Text className="text-sm pl-3 text-gray-600">
                  {displayValue}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default ResponseId;
