import { View, Text, FlatList, Pressable, ActivityIndicator, useColorScheme } from "react-native";
import React, { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWebFormResponseDataStore } from "@/utils/store";
import { useQuestions } from "@/api/question/question.query";
import { ArrowLeft } from "lucide-react-native";
import { firstParam } from "@/utils/params";

const ResponseId = () => {
  const isDark = useColorScheme() === "dark";

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

  const { webformId, respondent } = useLocalSearchParams();

  const { data } = useWebFormResponseDataStore();

  const { data: questions, isLoading } = useQuestions(firstParam(webformId));

  const router = useRouter();

  // Above the early returns, not below them: a hook after a conditional return is only
  // called on some renders, and React matches hooks by call order. This screen has two
  // guards — loading, and no-response — so the slot moved twice on the way to the list.
  const questionMap = useMemo(() => {
    const map: Record<string, string> = {};

    questions?.forEach((q) => {
      const raw = q.title?.English || q.description?.English || q.label?.English || "";

      map[q.id] = stripHtml(raw);
    });

    return map;
  }, [questions]);

  if (!data?.length || !data[0]?.responses) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <Text className="text-black dark:text-white">No response found.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator size={"large"} />
      </View>
    );
  }

  const responses = data[0].responses;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 px-4">
      {/* Header */}
      <View className="flex-row items-center gap-5 p-2">
        <Pressable onPress={() => router.back()} className="flex-row items-center space-x-3 mb-4">
          <ArrowLeft color={isDark ? "white" : "black"} />
        </Pressable>

        {/* Avatar + Name */}
        <View className="flex-row items-center space-x-4 mb-6 gap-3">
          <View className="w-14 h-14 rounded-full bg-rateUpLightGreen items-center justify-center">
            <Text className="text-rateUpGreen font-bold text-2xl">{respondent ? "0" : "R"}</Text>
          </View>

          <Text className="text-xl font-medium text-gray-900 dark:text-white">
            {respondent || "Respondent"}
          </Text>
        </View>
      </View>

      {/* Response List */}
      <FlatList
        data={responses}
        keyExtractor={(item, index) => `${item.questionId}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 24,
        }}
        renderItem={({ item, index }) => {
          const questionId = item.questionId;

          const responseType = item.type;

          const questionTitle = questionMap[questionId] || "Unknown Question";

          const value = item.response?.[responseType];

          const displayValue =
            typeof value === "string" || typeof value === "number" || typeof value === "boolean"
              ? String(value)
              : Array.isArray(value)
                ? value.map((v) => (typeof v === "string" ? v : v?.value || "")).join(", ")
                : typeof value === "object" && value?.value
                  ? value.value
                  : Object.entries(value || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n");

          return (
            <View
              className="mb-5 rounded-2xl p-4 border"
              style={{
                backgroundColor: isDark ? "#0f172a" : "#ffffff",

                borderColor: isDark ? "#1e293b" : "#E5E7EB",
              }}
            >
              {/* Index & Type */}
              <View className="flex-row items-center mb-3 gap-2">
                <View className="w-7 h-7 rounded-full bg-rateUpGreen items-center justify-center">
                  <Text className="text-white text-xs font-semibold">{index + 1}</Text>
                </View>

                <Text className="text-white bg-rateUpGreen px-3 py-1 rounded-full text-xs font-medium capitalize">
                  {responseType}
                </Text>
              </View>

              {/* Question */}
              <Text className="text-base font-bold text-gray-800 dark:text-white mb-2">
                {questionTitle}
              </Text>

              {/* Answer */}
              <Text className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                {displayValue}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default ResponseId;
