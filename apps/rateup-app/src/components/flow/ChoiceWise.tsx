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
    if (typeof input === "string") return input;
    if (typeof input === "object" && input !== null) {
      return input.en || Object.values(input)[0];
    }
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
            getLocalizedText(question?.label)
          : getLocalizedText(question?.header) ||
            getLocalizedText(question?.label),
    };
  }, [questionId, version, questions, flowQuestions]);
  return (
    <View className="mb-4 mx-2 rounded-2xl bg-rateUpLightGreen shadow-sm p-4 shadow-black/10">
      <Text className="text-lg font-semibold text-gray-800 mb-3">
        {questionTitle}
      </Text>
      <FlatList
        data={choices}
        keyExtractor={(_, index) => index.toString()}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View className="h-1" />}
        renderItem={({ item }) => (
          <View className="flex-row justify-between px-2">
            <Text className="text-base text-gray-700">{item.choice}</Text>
            <Text className="text-base font-medium text-gray-900">
              {item.count}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-base text-gray-500 text-center">
            No question responses.
          </Text>
        }
      />
    </View>
  );
};

export default ChoiceWise;
