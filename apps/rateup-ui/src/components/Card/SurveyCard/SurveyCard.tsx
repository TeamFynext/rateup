import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ActionCard } from "@/components/common/action-card.tsx";

import { SurveyMenu } from "./SurveyMenu.tsx";

interface SurveyCardProps {
  survey: Survey;
  handleCheckBox?: (surveyId: string, checked: boolean) => void;
  isChecked?: boolean;
  selectedTeamId?: string;
  teamsData?: TeamData[];
  route?: string;
  refetchSurveys?: () => void;
}

const tagColorClasses = {
  red: "text-destructive bg-destructive/10 border-destructive/30 ",
  orange:
    "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800",
  amber:
    "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800",
  yellow:
    "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-800",
  green:
    "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800",
  emerald:
    "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800",
  teal: "text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-900/30 dark:border-teal-800",
  cyan: "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-900/30 dark:border-cyan-800",
  blue: "text-primary bg-ru-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800",
  indigo:
    "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-800",
  purple:
    "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-800",
  fuchsia:
    "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200 dark:text-fuchsia-400 dark:bg-fuchsia-900/30 dark:border-fuchsia-800",
  pink: "text-pink-700 bg-pink-50 border-pink-200 dark:text-pink-400 dark:bg-pink-900/30 dark:border-pink-800",
  rose: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-800",
} as const;

type TagColor = keyof typeof tagColorClasses;

const getColorForType = (type: string): TagColor => {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors: TagColor[] = [
    "blue",
    "green",
    "orange",
    "red",
    "yellow",
    "purple",
    "pink",
    "teal",
    "indigo",
    "cyan",
    "fuchsia",
    "emerald",
    "rose",
    "amber",
  ];
  return colors[Math.abs(hash) % colors.length];
};

export function SurveyCard({
  survey,
  selectedTeamId,
  teamsData,
  route,
  refetchSurveys,
}: Readonly<SurveyCardProps>) {
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const totalResponses =
    survey?.teams?.reduce((sum: number, t) => sum + (t.responsesCount?.responses || 0), 0) || 0;

  const questionCount = survey?.questions?.length || 0;

  // Extract question types as tags
  const questionTypes = survey?.questions?.reduce((acc: Record<string, number>, q) => {
    if (q.type && q.type !== "Welcome" && q.type !== "ThankYou") {
      acc[q.type] = (acc[q.type] || 0) + 1;
    }
    return acc;
  }, {});

  const tags = Object.entries(questionTypes || {}).map(([type, count]) => ({
    type,
    count: count as number,
    color: getColorForType(type),
  }));

  const statusBadge = survey?.active ? (
    <span className="text-[11px] font-semibold text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
      {translations("Active")}
    </span>
  ) : (
    <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full dark:bg-zinc-800 dark:text-zinc-400">
      {translations("Inactive")}
    </span>
  );

  const content = (
    <div className="flex items-center gap-2 flex-wrap h-10">
      <span className="text-xs font-bold dark:text-zinc-100">
        {totalResponses}{" "}
        {totalResponses >= 1 ? translations("Response") : translations("Responses")}
      </span>
      {tags.slice(0, 4).map((tag) => (
        <span
          key={tag.type}
          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${tagColorClasses[tag.color]}`}
          title={tag.type}
        >
          {tag.count} {tag.type.length > 6 ? `${tag.type.slice(0, 6)}..` : tag.type}
        </span>
      ))}
      {tags.length > 4 && (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          +{tags.length - 4} more
        </span>
      )}
    </div>
  );

  return (
    <ActionCard
      title={survey?.title}
      subtitle={`${questionCount} ${translations("questions")}`}
      content={content}
      footerLeft={statusBadge}
      createdAt={survey?.createdAt}
      onClick={() => {
        navigate({
          to: route || `${pathname}/${survey?.id}${survey?.isPublished ? `?tab=Result` : ""}`,
        });
      }}
      actions={
        <SurveyMenu
          survey={survey}
          selectedTeamId={selectedTeamId || ""}
          teamsData={teamsData}
          refetchSurveys={refetchSurveys}
        />
      }
    />
  );
}
