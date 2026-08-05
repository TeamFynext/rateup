import { useColorScheme } from "nativewind";
import { View, Text, ScrollView, Pressable } from "react-native";
import React, { useMemo, useState } from "react";
import {
  AngryIcon,
  ChevronDown,
  ChevronUp,
  LaughIcon,
  MehIcon,
  TargetIcon,
  Users,
} from "lucide-react-native";
import { QuestionType2 } from "./enum";
import { renderChoiceItem } from "@/util";
import type { SurveyQuestion } from "@/api/question/types";
import type { ChoiceWiseEntry, NpsEntry } from "@/api/response/types";
import type { DbFlow } from "@/api/whatsapp/types";

type SurveyQuestionProps = {
  /** `Object.entries` of the analytics `choiceWise` map, keyed by question id. */
  choiceWise: [string, ChoiceWiseEntry][];
  /** `Object.entries` of the analytics `nps` map, keyed by question id. */
  NPS: [string, NpsEntry][];
  version?: number;
  questions?: SurveyQuestion[];
  /** null on web forms, which have no backing flow. */
  flow: DbFlow | null;
};

const SurveyQuestions = ({ choiceWise, NPS, flow, version, questions }: SurveyQuestionProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }

      return newSet;
    });
  };

  const flowQuestions = useMemo(() => {
    return flow?.json?.screens?.flatMap((screen) =>
      screen.layout.children
        .filter((child) => child.type !== QuestionType2.Footer)
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

  const getQuestion = (questionId: string) => {
    if (version === 1) {
      const question = questions?.find((q) => q?.id === questionId);

      return {
        type: question?.type,
        questionTitle: question?.title || question?.label,
      };
    }

    const question = flowQuestions?.find((q) => q.id === questionId);

    return {
      type: question?.metaType,
      questionTitle: question?.header || question?.label,
    };
  };

  const getPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : "0";

  if (choiceWise.length === 0) return null;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-950">
      {choiceWise?.map(([questionId, questionData], index) => {
        const questionDetails = getQuestion(questionId);

        const type = questionDetails?.type;

        const title = questionDetails?.questionTitle;

        const npsEntry = NPS.find(([id]) => id === questionId)?.[1];

        const responseCount = questionData?.responseCount || 0;

        const npsscore = npsEntry?.npsData?.npsScore ?? 0;

        const npsScore = Math.round(npsscore);

        const promoters = npsEntry?.npsData?.promoters ?? 0;

        const passives = npsEntry?.npsData?.passives ?? 0;

        const detractors = npsEntry?.npsData?.detractors ?? 0;

        const total = promoters + passives + detractors;

        const chartData = questionData?.data.map((item) => ({
          ...item,
          percentage: getPercentage(item?.count, responseCount),
        }));

        const maxCount = Math.max(...chartData.map((c) => c.count));

        const mostVotedChoice = chartData.find((c) => c.count === maxCount)?.choice;

        const isExpanded = expanded.has(questionId);

        return (
          <View
            key={questionId}
            className="rounded-2xl mb-3 overflow-hidden border"
            style={{
              backgroundColor: isDark ? "#0f172a" : "#ffffff",

              borderColor: isDark ? "#1e293b" : "#E2E5ED",
            }}
          >
            {/* Header */}
            <Pressable
              onPress={() => toggleExpand(questionId)}
              className="flex-row justify-between items-center px-4 py-5"
            >
              <View className="flex-row items-center gap-2 flex-1">
                <View className="bg-rateUpBlue rounded-full w-6 h-6 flex justify-center items-center">
                  <Text className="text-sm font-semibold text-white">{index + 1}</Text>
                </View>

                <Text className="font-semibold text-md flex-1 text-black dark:text-white">
                  {getLocalizedText(title)}
                </Text>
              </View>

              <View>
                {isExpanded ? (
                  <ChevronUp size={20} color={isDark ? "#CBD5E1" : "#4B5563"} />
                ) : (
                  <ChevronDown size={20} color={isDark ? "#CBD5E1" : "#4B5563"} />
                )}
              </View>
            </Pressable>

            {isExpanded && (
              <View className="flex gap-8 pb-4">
                {/* Choices */}
                <View className="flex gap-1 p-1">
                  {chartData?.length > 0 ? (
                    chartData.map((item: any, idx: number) =>
                      renderChoiceItem(type, item, idx, mostVotedChoice, version),
                    )
                  ) : (
                    <Text className="text-gray-500 dark:text-slate-400 text-center">
                      No responses yet.
                    </Text>
                  )}
                </View>

                {/* NPS */}
                {npsEntry && (
                  <View className="px-4 py-1 flex justify-center gap-3">
                    {/* NPS Score */}
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row gap-2 items-center">
                        <View className="rounded-lg p-1 bg-[#2B82DE1F]">
                          <TargetIcon color={"#2B82DE"} width={25} height={25} />
                        </View>

                        <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
                          NPS Score
                        </Text>
                      </View>

                      <Text className="text-[#00BF83] font-bold text-xl">
                        {npsScore > 0 ? `+${Math.round(npsScore)}` : Math.round(npsScore)}
                      </Text>
                    </View>

                    {/* Total */}
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row gap-2 items-center">
                        <View className="rounded-lg p-1 bg-[#2B82DE1F]">
                          <Users color={"#2B82DE"} width={25} height={25} />
                        </View>

                        <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
                          Total Responses
                        </Text>
                      </View>

                      <Text className="text-[#00BF83] font-bold text-xl">{total}</Text>
                    </View>

                    {/* Promoters */}
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row gap-2 items-center">
                        <View className="rounded-full p-1 bg-[#00BF831F]">
                          <LaughIcon color={"#00BF83"} width={25} height={25} />
                        </View>

                        <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
                          Promoters
                        </Text>
                      </View>

                      <Text className="text-[#00BF83] font-bold text-xl">{promoters}</Text>
                    </View>

                    {/* Passives */}
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row gap-2 items-center">
                        <View className="rounded-full p-1 bg-[#FFC1071F]">
                          <MehIcon color={"#FFC107"} width={25} height={25} />
                        </View>

                        <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
                          Passives
                        </Text>
                      </View>

                      <Text className="text-[#FFC107] font-bold text-xl">{passives}</Text>
                    </View>

                    {/* Detractors */}
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row gap-2 items-center">
                        <View className="rounded-full p-1 bg-[#FF61611F]">
                          <AngryIcon color={"#FF6161"} width={25} height={25} />
                        </View>

                        <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
                          Detractors
                        </Text>
                      </View>

                      <Text className="text-[#FF6161] font-bold text-xl">{detractors}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

export default SurveyQuestions;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getLocalizedText = (input: unknown): string => {
  const rawText: unknown =
    typeof input === "string" ? input : isRecord(input) ? input.en || Object.values(input)[0] : "";

  return typeof rawText === "string" ? rawText.replace(/<[^>]+>/g, "").trim() : "";
};
