import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";
import React, { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFlowDataStore, useFlowResponseDataStore } from "@/utils/store";
import { QuestionType2, WaQuestions } from "@/components/flow/enum";
import dayjs from "dayjs";
import {
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "@/components/flow/enumMap";
import DocumentResponse from "@/components/flow/DocumentResponse";
import ImageResponse from "@/components/flow/ImageResponse";
import { ArrowLeft } from "lucide-react-native";

const Flow2Response = () => {
  const isDark = useColorScheme() === "dark";

  const { respondent } = useLocalSearchParams();

  const router = useRouter();

  const { flowData } = useFlowDataStore();

  const { data } = useFlowResponseDataStore();

  const flowQuestions = useMemo(() => {
    return flowData[0]?.json?.screens?.flatMap((screen) =>
      screen.layout.children
        .filter((child) => child.type !== QuestionType2.Footer)
        .map(
          ({
            id,
            label,
            metaType,
            name,
            "data-source": dataSource,
            header,
          }) => ({
            id,
            label,
            metaType,
            dataSource,
            name,
            header,
          }),
        )
        .filter(({ name }) => name),
    );
  }, [flowData]);

  const responses = data[0]?.responses || [];

  const getResponseForQuestion = (questionId) => {
    return responses.find((res) => res.questionId === questionId);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center gap-5 p-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft color={isDark ? "white" : "black"} />
        </TouchableOpacity>

        <View className="flex-row items-center gap-3">
          <View className="w-14 h-14 rounded-full bg-rateUpLightGreen items-center justify-center">
            <Text className="text-rateUpGreen font-bold text-2xl">
              {respondent ? "0" : "R"}
            </Text>
          </View>

          <Text className="text-xl font-medium text-gray-900 dark:text-white">
            {respondent || "Respondent"}
          </Text>
        </View>
      </View>

      {/* Content */}
      {flowQuestions?.length && responses?.length ? (
        <ScrollView
          className="px-4"
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {flowQuestions.map((question, index) => {
            const raw = getResponseForQuestion(question.id);

            const response = raw?.response;

            const formatted = getCellData(response, question);

            const responseType = question.metaType;

            return (
              <View
                key={question.id}
                className="mb-5 rounded-2xl p-4 border"
                style={{
                  backgroundColor: isDark ? "#0f172a" : "#ffffff",
                  borderColor: isDark ? "#1e293b" : "#E5E7EB",
                }}
              >
                {/* Index & Type */}
                <View className="flex-row items-center mb-3 gap-2">
                  <View className="w-7 h-7 rounded-full bg-rateUpGreen items-center justify-center">
                    <Text className="text-white text-xs font-semibold">
                      {index + 1}
                    </Text>
                  </View>

                  <Text className="text-white bg-rateUpGreen px-3 py-1 rounded-full text-xs font-medium">
                    {responseType}
                  </Text>
                </View>

                {/* Question */}
                <Text className="text-base font-bold text-gray-800 dark:text-white mb-2">
                  {question.header || question.label}
                </Text>

                {/* Answer */}
                <View className="pl-1">
                  {typeof formatted === "string" ? (
                    <Text className="text-sm leading-6 text-gray-600 dark:text-slate-300">
                      {formatted || "No response"}
                    </Text>
                  ) : (
                    formatted
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-rateUpTextGray dark:text-slate-400">
            No responses to be shown
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Flow2Response;

// Response Formatter
export const getCellData = (info, question) => {
  switch (question.metaType) {
    case WaQuestions.LD:
      return LDResponseMap[info] || "";

    case WaQuestions.YN:
      return YNResponseMap[info] || "";

    case WaQuestions.Smiley:
      return SmileyResponseMap[info] || "";

    case WaQuestions.Rating:
      return RatingScaleMap[info] || "";

    case WaQuestions.Opinion:
      return info || "";

    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
      return question.dataSource?.find((data) => data.id === info)?.title || "";

    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return (
        (Array.isArray(info) &&
          info
            .map(
              (i) => question.dataSource?.find((data) => data.id === i)?.title,
            )
            .filter(Boolean)
            .join(", ")) ||
        ""
      );

    case WaQuestions.DocumentPicker:
      return <DocumentResponse info={info} />;

    case WaQuestions.DatePicker:
      return info ? dayjs(info).format("DD-MM-YYYY") : "";

    case WaQuestions.TextArea:
      return info;

    case WaQuestions.PhotoPicker:
      return (
        <View>
          <ImageResponse info={info} />
        </View>
      );

    default:
      return info?.toString?.() || "";
  }
};
