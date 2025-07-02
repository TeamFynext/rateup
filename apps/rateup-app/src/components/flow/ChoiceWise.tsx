import React, { useMemo } from "react";
import { View, Text, FlatList } from "react-native";
import { QuestionType2 } from "./enum";

type ChoiceData = {
  choice: string;
  count: number;
};

type Props = {
  questionId: string;
  choices: ChoiceData[];
  questions: any[]; // for version 1
  version: number;
  flow: any;
};

const ChoiceWise = ({
  questionId,
  choices,
  questions,
  version,
  flow,
}: Props) => {
  const getLocalizedText = (input: any) => {
    const rawText =
      typeof input === "string"
        ? input
        : typeof input === "object" && input !== null
        ? input.en || Object.values(input)[0]
        : "";
    return rawText.replace(/<[^>]+>/g, "").trim();
  };
  const flowQuestions = useMemo(() => {
    return flow?.json?.screens?.flatMap((screen: any) =>
      screen.layout.children
        .filter((child: any) => child.type !== QuestionType2.Footer)
        //@ts-ignore
        .map(({ id, label, metaType, name, header }) => ({
          id,
          label,
          metaType,
          name,
          header,
        }))
        .filter(({ name }) => name)
    );
  }, [flow]);

  const { questionTitle, type } = useMemo(() => {
    const question =
      version === 1
        ? questions?.find((q) => q?.id === questionId)
        : flowQuestions?.find((q) => q?.id === questionId);

    return {
      type: version === 1 ? question?.type : question?.metaType,
      questionTitle:
        version === 1
          ? getLocalizedText(question?.title) ||
            getLocalizedText(question?.description)
          : getLocalizedText(question?.header) ||
            getLocalizedText(question?.label),
    };
  }, [questionId, version, questions, flowQuestions]);
  return (
    <View className="bg-white rounded-2xl shadow-md p-4">
      {/* Top Label Row */}
      <View className="flex-row items-center space-x-2 mb-3 gap-1">
        <View className="w-6 h-6 rounded-full bg-rateUpGreen items-center justify-center">
          <Text className="text-white text-xs font-semibold">Q</Text>
        </View>
        <Text className="text-xs font-medium text-white bg-rateUpGreen px-2 py-1 rounded-full">
          {type}
        </Text>
      </View>

      {/* Question Title */}
      <Text className="text-base font-semibold text-gray-900 mb-3">
        {questionTitle}
      </Text>

      {/* Choices List */}
      <FlatList
        data={choices}
        keyExtractor={(_, index) => index.toString()}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View className="flex-row justify-between px-1">
            <Text className="text-base text-gray-700">{item.choice}</Text>
            <Text className="text-base font-semibold text-gray-900">
              {item.count}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-base text-gray-500 text-center mt-2">
            No question responses.
          </Text>
        }
      />
    </View>
  );
};

export default ChoiceWise;
