import { Smile, Target, Users } from "lucide-react";
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

import type { FlowQuestionSummary } from "@/components/whatsapp/flow-v2/utils/store.ts";
import { stringToColour } from "@/utils/essential/index.ts";
import { getResponseArrayByQuestionType } from "@/utils/response.ts";

import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util.tsx";
import SurveyResultByType from "./SurveySummaryNewWebForm.tsx";

/** One aggregated choice bucket for a question. */
interface ChoiceWiseDatum {
  choice: string | number;
  count: number;
}

/** Aggregated answers for a single question. */
interface ChoiceWiseEntry {
  responseCount?: number;
  data: ChoiceWiseDatum[];
}

/** NPS breakdown for a single question. */
interface NpsEntry {
  npsData?: {
    npsScore?: number;
    promoters?: number;
    passives?: number;
    detractors?: number;
  };
}

interface SurveyQuestionProps {
  /** `Object.entries` of the analytics response, so one `[questionId, data]` pair per question. */
  choiceWise: Array<[string, ChoiceWiseEntry]>;
  NPS: Array<[string, NpsEntry]>;
  version?: number;
  flowQuestions?: FlowQuestionSummary[];
  questions?: Question[];
  surveyId: string;
  defaultLanguage: string;
}

const SurveyQuestion = ({
  choiceWise,
  NPS,
  version,
  flowQuestions,
  questions,
  surveyId,
  defaultLanguage,
}: SurveyQuestionProps) => {
  if (choiceWise.length === 0) return null;

  function getQuestion(questionId: string) {
    if (version === 1) {
      const question = questions?.find((q) => q.id === questionId);
      return { type: question?.type, questionTitle: question?.title || question?.label };
    }
    const question = flowQuestions?.find((q) => q.id === questionId);
    return { type: question?.metaType, questionTitle: question?.header || question?.label };
  }

  const getPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : "0";

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { count?: number; percentage?: number | string } }>;
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
    <div className="space-y-8 border border-[#E2E5ED] rounded-md shadow-sm bg-white">
      <h2 className="font-bold text-md px-6 pt-6">Survey Question Breakdown</h2>
      <div className="py-8 px-4 md:px-14 flex flex-col gap-16">
        {choiceWise?.map(([questionId, questionData], index) => {
          const questionDetails = getQuestion(questionId);
          const npsEntry = NPS.find(([id]) => id === questionId)?.[1];
          const responseCount = questionData?.responseCount || 0;
          const npsscore = npsEntry?.npsData?.npsScore ?? 0;
          const npsScore = Math.round(npsscore);
          const promoters = npsEntry?.npsData?.promoters ?? 0;
          const passives = npsEntry?.npsData?.passives ?? 0;
          const detractors = npsEntry?.npsData?.detractors ?? 0;
          const total = promoters + passives + detractors;
          const happinessIndex = total > 0 ? ((promoters / total) * 10).toFixed(1) : 0;

          const chartData = questionData?.data.map((item) => {
            const color =
              getResponseArrayByQuestionType(questionDetails?.type)?.find(
                (ch) => ch.value.toString() === item.choice.toString(),
              )?.color ?? stringToColour(item.choice);
            return {
              ...item,
              percentage: getPercentage(item.count, responseCount),
              fill: color,
            };
          });

          return (
            <div key={questionId}>
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Left Section */}
                <div className="w-full md:w-[40%] space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#004F98] rounded-full w-6 h-6 text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-bold text-[#343A40]">
                      {typeof questionDetails?.questionTitle === "object"
                        ? getReplacedTitleFromVariable({
                            title: questionDetails?.questionTitle[defaultLanguage],
                            surveyId,
                          })
                        : questionDetails?.questionTitle}
                    </span>
                  </div>

                  <SurveyResultByType
                    questionType={questionDetails?.type}
                    chartData={chartData}
                    version={version}
                  />
                </div>

                {/* Right Section */}
                <div className="w-full md:w-[60%] flex flex-col gap-4">
                  {/* Chart */}
                  <div className="h-[300px] border rounded-md bg-white shadow-sm px-4 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barSize={30} barGap={4} barCategoryGap="15%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                        <XAxis dataKey="choice" tick={{ fontSize: 12 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {chartData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={"#607D8B"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* NPS Breakdown */}
                  {npsEntry?.npsData && (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          {
                            label: "Responses",
                            value: responseCount,
                            icon: <Users size={18} color="#2B82DE" />,
                          },
                          {
                            label: "NPS",
                            value: npsScore >= 0 ? `+${npsScore}` : npsScore,
                            icon: <Target size={20} color="#2B82DE" />,
                          },
                          {
                            label: "Happiness Index",
                            value: happinessIndex,
                            icon: <Smile size={20} color="#2B82DE" />,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="border bg-[#FAFAFA] rounded-sm shadow-sm px-2 py-2 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-[10px] font-semibold text-[#343A40]">
                                {item.label}
                              </p>
                              <p className="text-2xl font-bold text-[#004F98]">{item.value}</p>
                            </div>
                            <div className="bg-[#2B82DE1F] p-1 rounded-md">{item.icon}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex h-4 w-full overflow-hidden rounded-full">
                        <div
                          style={{
                            width: `${getPercentage(promoters, responseCount)}%`,
                            backgroundColor: "#00BF83",
                          }}
                        />
                        <div
                          style={{
                            width: `${getPercentage(passives, responseCount)}%`,
                            backgroundColor: "#FFC107",
                          }}
                        />
                        <div
                          style={{
                            width: `${getPercentage(detractors, responseCount)}%`,
                            backgroundColor: "#FF6161",
                          }}
                        />
                      </div>

                      <div className="flex justify-between items-center">
                        {[
                          {
                            label: "Promoters",
                            value: promoters,
                            percentage: getPercentage(promoters, responseCount),
                            color: "#00BF83",
                          },
                          {
                            label: "Passives",
                            value: passives,
                            percentage: getPercentage(passives, responseCount),
                            color: "#FFC107",
                          },
                          {
                            label: "Detractors",
                            value: detractors,
                            percentage: getPercentage(detractors, responseCount),
                            color: "#FF6161",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex flex-col items-center justify-center"
                          >
                            <p className="text-xs font-semibold text-[#343A40]">{item.label}</p>
                            <p className="text-2xl font-bold" style={{ color: item.color }}>
                              {item.percentage}%
                            </p>
                            <p className="text-[#7A8289] text-xs">{item.value} Responses</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="w-full border border-gray-200 mt-10" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SurveyQuestion;
