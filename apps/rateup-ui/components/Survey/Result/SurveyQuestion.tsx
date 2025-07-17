import React, { useState } from "react";

import { Progress } from "@mantine/core";
import { IconMoodHappy, IconTarget, IconUsers } from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { stringToColour } from "@/utils/essential";
import { getResponseArrayByQuestionType } from "@/utils/response";

import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";
import SurveyResultByType from "./SurveySummaryNew1";

type SurveyQuestionProps = {
  choiceWise: any;
  NPS: any;
  version?: number;
  flowQuestions?: any[];
  questions?: any[];
  surveyId: string;
  defaultLanguage: string;
};

const SurveyQuestion = ({
  choiceWise,
  NPS,
  version,
  flowQuestions,
  questions,
  surveyId,
  defaultLanguage,
}: SurveyQuestionProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function getQuestion(questionId) {
    const question =
      version === 1
        ? questions?.find((question) => question?.id === questionId)
        : flowQuestions.find((q) => q.id === questionId);
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

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (active && payload?.length) {
      const { count, percentage } = payload[0].payload;
      return (
        <div className="bg-white border px-3 py-1 rounded shadow-sm text-sm text-gray-700">
          {count} Votes ({percentage}%)
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 border border-[#E2E5ED] rounded-md shadow-sm">
      <h2 className="font-bold text-md p-4">Survey Question Breakdown</h2>
      <div className="py-8 px-14 h-full flex flex-col gap-14">
        {choiceWise.map(([questionId, questionData], index) => {
          const questionDetails = getQuestion(questionId);
          const npsEntry = NPS.find(([id]) => id === questionId)?.[1];
          const responseCount = questionData?.responseCount || 0;
          const npsScore = npsEntry?.npsData?.npsScore ?? 0;
          const promoters = npsEntry?.npsData?.promoters ?? 0;
          const passives = npsEntry?.npsData?.passives ?? 0;
          const detractors = npsEntry?.npsData?.detractors ?? 0;
          const total = promoters + passives + detractors;
          const happinessIndex =
            total > 0 ? ((promoters / total) * 10).toFixed(1) : 0;

          const chartData = questionData?.data.map((item) => {
            const color =
              getResponseArrayByQuestionType(
                questionDetails?.type as any,
              )?.find((ch) => ch.value.toString() === item.choice.toString())
                ?.color ?? stringToColour(item.choice);

            return {
              ...item,
              percentage: getPercentage(item.count, responseCount),
              fill: color,
            };
          });

          return (
            <div key={questionId}>
              <div className="flex flex-col md:flex-row md:gap-4 md:items-center md:justify-center px-2">
                {/* Left: Question + Choices */}
                <div className="w-full md:w-[40%] space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#004F98] rounded-full flex justify-center items-center w-5 h-5 text-xs text-white p-2">
                      {index + 1}
                    </div>
                    <span className="text-sm font-bold">
                      {typeof questionDetails?.questionTitle === "object"
                        ? getReplacedTitleFromVariable({
                            title:
                              questionDetails?.questionTitle[defaultLanguage],
                            surveyId,
                          })
                        : questionDetails?.questionTitle}
                    </span>
                  </div>

                  <SurveyResultByType
                    questionType={questionDetails?.type}
                    chartData={chartData}
                  />
                </div>

                {/* Right: Graph + NPS */}
                <div className="flex flex-col gap-4 w-[50%]">
                  <div className="h-[300px] w-[100%] rounded-md border border-gray-200 bg-white px-4 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        barSize={30}
                        barGap={4}
                        barCategoryGap="15%"
                        onMouseLeave={() => setActiveIndex(null)}
                        onMouseMove={(e) => {
                          if (e?.activeTooltipIndex !== undefined) {
                            setActiveIndex(e.activeTooltipIndex);
                          }
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e0e0e0"
                        />
                        <XAxis dataKey="choice" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "transparent" }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {chartData.map((_, i) => (
                            <Cell
                              key={`cell-${i}`}
                              fill={i === activeIndex ? "#82B1FF" : "#607D8B"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* NPS Stats */}
                  {NPS.length > 0 && (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="border border-[#F5F5F5] bg-[#FAFAFA] rounded-sm shadow-sm flex items-center justify-between px-2 py-0.5">
                          <div>
                            <p className="text-[#343A40] text-[10px] font-semibold">
                              Responses
                            </p>
                            <p className="font-bold text-2xl text-[#004F98]">
                              {responseCount}
                            </p>
                          </div>
                          <div className="bg-[#2B82DE1F] self-start p-1 rounded-md">
                            <IconUsers color="#2B82DE" size={18} />
                          </div>
                        </div>
                        <div className="border border-[#F5F5F5] bg-[#FAFAFA] rounded-sm shadow-sm flex items-center justify-between px-2 py-0.5">
                          <div>
                            <p className="text-[#343A40] text-[10px] font-semibold">
                              NPS
                            </p>
                            <p className="font-bold text-2xl text-[#004F98]">
                              {npsScore >= 0 ? `+${npsScore}` : npsScore}
                            </p>
                          </div>
                          <div className="bg-[#2B82DE1F] self-start p-1 rounded-md">
                            <IconTarget color="#2B82DE" size={20} />
                          </div>
                        </div>
                        <div className="border border-[#F5F5F5] bg-[#FAFAFA] rounded-sm shadow-sm flex items-center justify-between px-2 py-0.5">
                          <div>
                            <p className="text-[#343A40] text-[10px] font-semibold">
                              Happiness Index
                            </p>
                            <p className="font-bold text-2xl text-[#004F98]">
                              {happinessIndex}
                            </p>
                          </div>
                          <div className="bg-[#2B82DE1F] self-start p-1 rounded-md">
                            <IconMoodHappy color="#2B82DE" size={20} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Progress.Root size="xl" radius={50}>
                          <Progress.Section
                            value={Number(
                              getPercentage(promoters, responseCount),
                            )}
                            color="#00BF83"
                          ></Progress.Section>
                          <Progress.Section
                            value={Number(
                              getPercentage(passives, responseCount),
                            )}
                            color="#FFC107"
                          ></Progress.Section>
                          <Progress.Section
                            value={Number(
                              getPercentage(detractors, responseCount),
                            )}
                            color="#FF6161"
                          ></Progress.Section>
                        </Progress.Root>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xs font-semibold text-[#343A40]">
                            Promoters
                          </p>
                          <p className="font-bold text-[#00BF83] text-2xl">
                            {getPercentage(promoters, responseCount)}%
                          </p>
                          <p className="text-[#7A8289] text-xs">
                            {promoters} Responses
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xs font-semibold text-[#343A40]">
                            Passives
                          </p>
                          <p className="font-bold text-[#FFC107] text-2xl">
                            {getPercentage(passives, responseCount)}%
                          </p>
                          <p className="text-[#7A8289] text-xs">
                            {passives} Responses
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-xs font-semibold text-[#343A40]">
                            Detractors
                          </p>
                          <p className="font-bold text-[#FF6161] text-2xl">
                            {getPercentage(detractors, responseCount)}%
                          </p>
                          <p className="text-[#7A8289] text-xs">
                            {detractors} Responses
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full border border-gray-200 mt-10" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SurveyQuestion;
