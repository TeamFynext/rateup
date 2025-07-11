import React from "react";
import { useRouter } from "next/router";

import dayjs from "dayjs";

interface FlowCardProps {
  title: string;
  createdAt: string;
  responseCount: number;
  itemId: string;
  type: string;
  OnClickAction: any;
}

export const SurveyDashCard = ({
  title,
  createdAt,
  responseCount,
  itemId,
  type,
  OnClickAction,
}: FlowCardProps) => {
  const color = type === "flow" ? "#009987" : "#004F98";
  const bgColor = type === "flow" ? "#00998733" : "#004F9833";
  const isToday = dayjs(createdAt).isSame(dayjs(), "day");
  const displayDate = isToday
    ? dayjs(createdAt).format("h:mm A")
    : dayjs(createdAt).format("DD MMM YYYY");
  const router = useRouter();
  return (
    <div
      className="bg-white cursor-pointer shadow-md rounded-lg p-4 flex flex-col transition-all duration-300 hover:border-[rgba(0,79,152,0.3)] hover:shadow-[0_0_2px_1px_rgba(0,79,152,0.3)]"
      onClick={() => router.push(`${OnClickAction}/${itemId}?tab=Result`)}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-black text-sm">
          {title.length > 16 ? `${title.slice(0, 16)}...` : title}
        </div>
        <div className="text-xs text-gray-400">{displayDate}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="mt-auto pt-2 text-sm text-gray-600">
          Total Responses
        </div>
        <div
          className="px-2 py-1 rounded min-w-[30%] flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <h3 style={{ color }}>{responseCount}</h3>
        </div>
      </div>
    </div>
  );
};
export const SurveyDashCardSkeleton = () => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4 animate-pulse flex flex-col gap-2">
      <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
      <div className="h-3 w-1/3 bg-gray-100 rounded"></div>
      <div className="mt-auto pt-2 flex justify-between items-center">
        <div className="h-3 w-1/3 bg-gray-100 rounded"></div>
        <div className="h-6 w-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};
