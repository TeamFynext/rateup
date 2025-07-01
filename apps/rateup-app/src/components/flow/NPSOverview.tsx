import React, { useMemo } from "react";
import { View, Text } from "react-native";
import ProgressBar from "@/src/utils/Progressbar";
import { QuestionType2 } from "./enum";

type NPSData = {
  npsScore: number;
  csatScore: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
};

const NPSOverview = ({
  questionId,
  data,
  questions,
  flow,
  version,
}: {
  questionId: string;
  data: NPSData;
  questions: any;
  flow: any;
  version: number;
}) => {
  const { npsScore, csatScore, promoters, passives, detractors, total } = data;
  const percent = (val: number) => (total === 0 ? 0 : (val / total) * 100);

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

  const npsColor = npsScore < 0 ? "#ef4444" : "#22c55e";
  const npsTextColor = npsScore < 0 ? "text-red-600" : "text-green-600";

  return (
    <View className="bg-white rounded-xl shadow-md p-4 space-y-5 flex gap-6">
      {/* NPS Score */}
      <View className="flex-row items-center gap-2">
        <View className="bg-rateUpGreen h-7 w-7 rounded-full flex justify-center items-center">
          <Text className="font-bold text-white">Q</Text>
        </View>
        <Text className="text-xl font-bold text-gray-800 ">
          {questionTitle}
        </Text>
      </View>
      <View className="flex gap-2">
        <View className="space-y-2">
          <View className="flex-row justify-between items-center">
            <Text className="text-md font-semibold text-gray-600">
              NPS Score
            </Text>
            <Text className={`text-md font-semibold ${npsTextColor}`}>
              {Math.floor(npsScore)}%
            </Text>
          </View>
          <ProgressBar progress={npsScore} barColor={npsColor} />
        </View>

        {/* CSAT Score */}
        <View className="space-y-2">
          <View className="flex-row justify-between items-center">
            <Text className="text-md font-semibold text-gray-600">
              CSAT Score
            </Text>
            <Text className="text-md font-semibold text-yellow-600">
              {csatScore.toFixed(2)}%
            </Text>
          </View>
          <ProgressBar progress={csatScore} barColor="#f59e0b" />
        </View>
      </View>

      <View className="flex gap-2">
        {/* Promoters */}
        <View className="space-y-2">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center space-x-1">
              <Text className="text-md font-semibold text-gray-700">
                Promoters
              </Text>
            </View>
            <Text className="text-md font-semibold">
              {percent(promoters).toFixed(2)}%
            </Text>
          </View>
          <ProgressBar progress={percent(promoters)} barColor="#22c55e" />
        </View>

        {/* Passive */}
        <View className="space-y-2">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center space-x-1">
              <Text className="text-md font-semibold text-gray-700">
                Passive
              </Text>
            </View>
            <Text className="text-md font-semibold">
              {percent(passives).toFixed(2)}%
            </Text>
          </View>
          <ProgressBar progress={percent(passives)} barColor="#f59e0b" />
        </View>

        {/* Detractors */}
        <View className="space-y-2">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center space-x-1">
              <Text className="text-md font-semibold text-gray-700">
                Detractors
              </Text>
            </View>
            <Text className="text-md font-semibold">
              {percent(detractors).toFixed(2)}%
            </Text>
          </View>
          <ProgressBar progress={percent(detractors)} barColor="#ef4444" />
        </View>
      </View>
    </View>
  );
};

export default NPSOverview;
