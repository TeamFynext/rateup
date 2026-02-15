import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import React, { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackIcon } from "@/src/constants/imageExports";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFlowDataStore, useFlowResponseDataStore } from "@/src/utils/store";
import { QuestionType2, WaQuestions } from "@/src/components/flow/enum";
import dayjs from "dayjs";
import {
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "@/src/components/flow/enumMap";
import { useToast } from "react-native-toast-notifications";
import DocumentResponse from "@/src/components/flow/DocumentResponse";
import ImageResponse from "@/src/components/flow/ImageResponse";

const Flow2Response = () => {
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
          })
        )
        .filter(({ name }) => name)
    );
  }, [flowData]);

  const responses = data[0]?.responses || [];

  const getResponseForQuestion = (questionId) => {
    return responses.find((res) => res.questionId === questionId);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center gap-5 p-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center space-x-3 mb-4"
        >
          <BackIcon height={25} width={25} color="black" />
        </TouchableOpacity>

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

      {/* Content */}
      {flowQuestions?.length && responses?.length ? (
        <ScrollView className="px-4">
          {flowQuestions.map((question, index) => {
            const raw = getResponseForQuestion(question.id);
            const response = raw?.response;
            const formatted = getCellData(response, question);
            const responseType = question.metaType;

            return (
              <View key={question.id} className="mb-8">
                {/* Index & Type Pill */}
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

                {/* Question & Answer */}
                <View className="pl-8">
                  <Text className="text-md font-bold text-gray-800 mb-1">
                    {question.header || question.label}
                  </Text>
                  <Text className="text-sm pl-3 text-gray-600">
                    {formatted || "No response"}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-rateUpTextGray">No responses to be shown</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Flow2Response;

// Response Formatter
export const getCellData = (info, question) => {
  const toast = useToast();
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
              (i) => question.dataSource?.find((data) => data.id === i)?.title
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
