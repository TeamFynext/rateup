import { View, Text, ScrollView } from "react-native";
import React, { useMemo } from "react";
import { QuestionType2 } from "./enum";
import { renderChoiceItem } from "@/src/util";

type SurveyQuestionProps = {
  choiceWise: any;
  NPS: any;
  version?: number;
  questions?: any[];
  flow: any;
};

const SurveyQuestions = ({
  choiceWise,
  NPS,
  flow,
  version,
  questions,
}: SurveyQuestionProps) => {
  if (choiceWise.length === 0) return null;

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
        .filter(({ name }: { name: any }) => name)
    );
  }, [flow]);
  function getQuestion(questionId: any) {
    const question =
      version === 1
        ? questions?.find((question) => question?.id === questionId)
        : flowQuestions.find((q: any) => q.id === questionId);
    return {
      type: version === 1 ? question.type : question.metaType,
      questionTitle:
        version === 1
          ? question.title || question.label
          : question.header || question.label,
    };
  }
  const getPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : "0";
  return (
    <ScrollView>
      {/* @ts-ignore */}
      {choiceWise?.map(([questionId, questionData], index) => {
        const questionDetails = getQuestion(questionId);
        const type = questionDetails?.type as QuestionType2;
        const title = questionDetails?.questionTitle;
        const npsEntry = NPS.find(([id]: any) => id === questionId)?.[1];
        const responseCount = questionData?.responseCount || 0;
        const npsscore = npsEntry?.npsData?.npsScore ?? 0;
        const npsScore = Math.round(npsscore);
        const promoters = npsEntry?.npsData?.promoters ?? 0;
        const passives = npsEntry?.npsData?.passives ?? 0;
        const detractors = npsEntry?.npsData?.detractors ?? 0;
        const total = promoters + passives + detractors;
        const happinessIndex =
          total > 0 ? ((promoters / total) * 10).toFixed(1) : 0;

        const chartData = questionData?.data.map((item: any, index: number) => {
          return {
            ...item,
            percentage: getPercentage(item.count, responseCount),
          };
        });

        const getMostVotedChoice = () => {
          const maxCount = Math.max(...chartData?.map((c: any) => c.count));
          return chartData.find((c: any) => c.count === maxCount)?.choice;
        };

        const mostVotedChoice = getMostVotedChoice();

        return (
          <View
            key={questionId}
            className="bg-white rounded-2xl shadow-md p-4 mb-4"
          >
            <Text className="text-base font-semibold text-gray-900 mb-2">
              {index + 1}. {getLocalizedText(title)}
            </Text>

            <View className="space-y-2">
              {questionData.data?.length > 0 ? (
                chartData.map((item: any, idx: number) =>
                  renderChoiceItem(type, item, idx, mostVotedChoice, version)
                )
              ) : (
                <Text className="text-gray-500 text-center">
                  No responses yet.
                </Text>
              )}
            </View>

            {npsEntry && (
              <View className="mt-3">
                <Text className="text-sm text-gray-600">
                  NPS Score: {npsScore}
                </Text>
                <Text className="text-sm text-gray-600">
                  Happiness Index: {happinessIndex}
                </Text>
                <Text className="text-sm text-gray-600">
                  Promoters: {promoters}, Passives: {passives}, Detractors:{" "}
                  {detractors}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

export default SurveyQuestions;

const getLocalizedText = (input: any) => {
  const rawText =
    typeof input === "string"
      ? input
      : typeof input === "object" && input !== null
      ? input.en || Object.values(input)[0]
      : "";
  return rawText.replace(/<[^>]+>/g, "").trim();
};
