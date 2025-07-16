import React, { useState } from "react";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";

type SurveyQuestionProps = {
  choiceWise: [string, any][];
  NPS: [string, any][];
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

  const getQuestion = (questionId: string) => {
    const question =
      version === 1
        ? questions?.find((q) => q?.id === questionId)
        : flowQuestions?.find((q) => q?.id === questionId);
    return {
      questionTitle:
        version === 1
          ? question?.title || question?.label
          : question?.header || question?.label,
    };
  };

  const getPercentage = (count: number, total: number) =>
    total > 0 ? ((count / total) * 100).toFixed(2) : "0.00";

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
    <div className="space-y-8 border border-[#E2E5ED] p-4">
      <h2 className="font-bold text-lg mb-2">Survey Question Breakdown</h2>

      {choiceWise.map(([questionId, questionData], index) => {
        const questionDetails = getQuestion(questionId);
        const npsEntry = NPS.find(([id]) => id === questionId)?.[1];
        const data = questionData?.data || [];
        const responseCount = questionData?.responseCount || 0;
        const npsScore = npsEntry?.npsData?.npsScore ?? 0;
        const promoters = npsEntry?.npsData?.promoters ?? 0;
        const passives = npsEntry?.npsData?.passives ?? 0;
        const detractors = npsEntry?.npsData?.detractors ?? 0;

        const chartData = data.map((item) => ({
          ...item,
          percentage: getPercentage(item.count, responseCount),
        }));

        return (
          <div
            key={questionId}
            className="flex flex-col gap-4 border-b border-[#E2E5ED] pb-6"
          >
            {/* Question Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
              {/* Left: Question + Choices */}
              <div className="w-full md:w-[40%] space-y-2">
                <div className="font-semibold text-sm">
                  <span>{index + 1}. </span>
                  <span>
                    {typeof questionDetails?.questionTitle === "object"
                      ? getReplacedTitleFromVariable({
                          title:
                            questionDetails?.questionTitle[defaultLanguage],
                          surveyId,
                        })
                      : questionDetails?.questionTitle}
                  </span>
                </div>

                {chartData.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center border px-3 py-1 rounded text-sm"
                  >
                    <span>{item.choice}</span>
                    <span>
                      {item.count} votes ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>

              {/* Right: Graph + NPS */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      barSize={20}
                      barGap={2}
                      barCategoryGap="10%"
                      onMouseLeave={() => setActiveIndex(null)}
                      onMouseMove={(e) => {
                        if (e?.activeTooltipIndex !== undefined) {
                          setActiveIndex(e.activeTooltipIndex);
                        }
                      }}
                    >
                      <XAxis dataKey="choice" />
                      <YAxis />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "transparent" }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={i === activeIndex ? "#C4D7F5" : "#7A8289"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* NPS Stats */}
                {NPS.length > 0 && (
                  <div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-gray-500 text-sm">Responses</p>
                        <p className="font-semibold text-lg">{responseCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">NPS Score</p>
                        <p className="font-semibold text-lg">{npsScore}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Happiness Index</p>
                        <p className="font-semibold text-lg">
                          {(7 + npsScore / 20).toFixed(1)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between gap-4 text-sm">
                      <div className="flex-1 border-l-4 border-green-500 pl-4">
                        <p className="text-gray-500">Promoters</p>
                        <p className="font-semibold">
                          {getPercentage(promoters, responseCount)}% (
                          {promoters})
                        </p>
                      </div>
                      <div className="flex-1 border-l-4 border-yellow-500 pl-4">
                        <p className="text-gray-500">Passives</p>
                        <p className="font-semibold">
                          {getPercentage(passives, responseCount)}% ({passives})
                        </p>
                      </div>
                      <div className="flex-1 border-l-4 border-red-500 pl-4">
                        <p className="text-gray-500">Detractors</p>
                        <p className="font-semibold">
                          {getPercentage(detractors, responseCount)}% (
                          {detractors})
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SurveyQuestion;
