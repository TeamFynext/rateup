import React, { useMemo } from "react";
import { View, Text } from "react-native";
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

const ChoiceWise = ({ questionId, choices, questions, version, flow }: Props) => {
  const flowQuestions = useMemo(() => {
    return flow?.json?.screens?.flatMap((screen:any) =>
      screen.layout.children

        .filter((child:any) => child.type !== QuestionType2.Footer)
        //@ts-ignore
        .map(({ id, label, metaType, name, header }) => ({
          id,
          label,
          metaType,
          name,
          header,
        })) 
        .filter(({ name }) => name),
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
          ? question?.title || question?.label || "Untitled"
          : question?.header || question?.label || "Untitled",
    };
  }, [questionId, version, questions, flowQuestions]);

  return (
    <View className="mb-6 border-b border-gray-200 pb-4">
      <Text>{type}</Text>
      <Text className="text-lg font-semibold text-gray-800 mb-2">
        {questionTitle}
      </Text>
      {choices.map((choiceData, index) => (
        <View key={index} className="flex-row justify-between mb-1 px-2">
          <Text className="text-base text-gray-700">{choiceData.choice}</Text>
          <Text className="text-base font-medium text-gray-900">{choiceData.count}</Text>
        </View>
      ))}
    </View>
  );
};

export default ChoiceWise;
