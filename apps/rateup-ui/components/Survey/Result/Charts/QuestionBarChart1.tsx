import React from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import useTranslations from "@/dictionaries/useTranslation";

import {
  QuestionType,
  QuestionType2,
  WaQuestions,
} from "../../../../types/enums";
import { getContent } from "../../../../utils";
import { getResponseArrayByQuestionType } from "../../../../utils/response";
import SurveySummaryNew from "../SurveySummaryNew";
import WaSummary from "../WaSummary";

interface QuestionBarChartProps {
  question: string;
  data: any[];
  questionType: QuestionType | WaQuestions;
  no: number;
  responseCount: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
}

export const CustomTooltip = ({
  active,
  payload,
  label,
}: CustomTooltipProps) => {
  const { translations } = useTranslations();
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 p-4 rounded shadow-xl text-sm">
        <div className="font-semibold text-gray-800">{label}</div>
        <div className="text-gray-600">
          {translations["Count: "]} {payload[0]?.value}
        </div>
      </div>
    );
  }
  return null;
};

const QuestionBarChart: React.FC<QuestionBarChartProps> = ({
  question,
  data,
  questionType,
  no,
  responseCount,
}) => {
  const { translations } = useTranslations();

  return (
    <div className="flex flex-col gap-4 min-w-[300px] w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 w-[85%]">
          <span className="font-bold text-white bg-[#004F98] rounded-full p-0.5 w-5 h-5 flex items-center justify-center">
            {no}
          </span>
          <span className="font-bold text-gray-800">
            {getContent(question)}
          </span>
        </div>
        {questionType !== QuestionType.MCQGrid && (
          <span className="text-xs font-medium rounded-full px-2 py-1 bg-gray-100 text-gray-800 border border-gray-300">
            {questionType}
          </span>
        )}
      </div>

      {/* Stats & Chart */}
      <div className="flex flex-wrap gap-6 justify-center items-start w-full">
        {/* Count Summary */}
        <div className="bg-gray-100 p-4 rounded shadow text-center min-w-[180px]">
          <div className="text-2xl font-bold">{responseCount}</div>
          <div className="text-gray-500 font-semibold text-sm">
            {translations["Responses"]}
          </div>
        </div>

        {/* Chart Summary */}
        <SurveySummaryNew
          totalResponses={responseCount}
          questionType={questionType}
          choiceCounts={data}
        />

        {/* Bar Chart */}
        <div className="min-w-[300px] overflow-auto">
          <BarChart
            width={500}
            height={300}
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            maxBarSize={50}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="choice" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="count" fill="#4B5563" radius={10} />
          </BarChart>
        </div>
      </div>
    </div>
  );
};

export default QuestionBarChart;

export const QuestionBarChart2 = ({
  question,
  choices,
  data,
  questionType,
  no,
}) => {
  const { translations } = useTranslations();

  let choicesToUse = choices ?? getResponseArrayByQuestionType(questionType);

  const choiceCounts = choicesToUse?.map((choice) => ({
    name: choice?.label,
    count: data?.filter((item) =>
      Array.isArray(item?.response)
        ? item?.response?.includes(choice?.value)
        : item?.response === choice?.value,
    )?.length,
    fill: choice?.color,
  }));

  return (
    <div className="flex flex-col gap-4 min-w-[300px] w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 w-[85%]">
          <span className="font-bold text-gray-800">{no}.</span>
          <span className="font-bold text-gray-800">
            {getContent(question)}
          </span>
        </div>
        <span className="text-xs font-medium rounded-full px-2 py-1 bg-gray-100 text-gray-800 border border-gray-300">
          {QuestionType2[questionType]}
        </span>
      </div>

      {/* Stats & Chart */}
      <div className="flex flex-wrap gap-6 justify-center items-start w-full">
        {/* Count Summary */}
        <div className="bg-gray-100 p-4 rounded shadow text-center min-w-[180px]">
          <div className="text-2xl font-bold">{data?.length}</div>
          <div className="text-gray-500 font-semibold text-sm">
            {translations["Responses"]}
          </div>
        </div>

        {/* Chart Summary */}
        <WaSummary
          response={data}
          questionType={questionType}
          choiceCounts={choiceCounts}
        />

        {/* Bar Chart */}
        <div className="min-w-[300px] overflow-auto">
          <BarChart
            width={600}
            height={300}
            data={choiceCounts}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            maxBarSize={50}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="count" fill="#4B5563" radius={10} />
          </BarChart>
        </div>
      </div>
    </div>
  );
};
