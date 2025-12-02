"use client";

import { usePathname, useRouter } from "next/navigation";

import dayjs from "dayjs";
import { Calendar, Clock, FileText, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import TimeSinceText from "@/components/DateAndTime/TimeSinceText";
import { Card, CardContent } from "@/components/ui/card";

import { SurveyMenu } from "./SurveyMenu";

interface SurveyCardProps {
  survey: Survey;
  handleCheckBox: any;
  isChecked: any;
  selectedTeamId: string;
  teamsData: any;
  route?: string;
  refetchSurveys: any;
}
/**
 * The SurveyCard component used to display a survey in the surveys page (dashboard/surveys)
 */

export function SurveyCard({
  survey,
  handleCheckBox,
  isChecked,
  selectedTeamId,
  teamsData,
  route,
  refetchSurveys,
}: Readonly<SurveyCardProps>) {
  const translations = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const totalResponses = survey?.teams?.reduce(
    (sum, t) => sum + (t.responsesCount?.responses || 0),
    0,
  );
  return (
    <Card
      key={survey.id}
      className="cursor-pointer overflow-hidden relative hover:-translate-y-1 flex flex-col"
      onClick={(e) => {
        e.stopPropagation();
        router.push(
          route ||
            `${pathname}/${survey?.id}${
              survey?.isPublished ? `?tab=Result` : ""
            }`,
        );
      }}
    >
      {/* Top accent bar with gradient */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          survey?.active
            ? "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"
            : "bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-500"
        }`}
      />

      <CardContent className="flex flex-col h-full gap-4">
        {/* Header Section with improved spacing */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base line-clamp-1 group-hover:text-primary transition-colors font-bold">
                {survey?.title?.length > 18
                  ? survey?.title?.slice(0, 18) + "..."
                  : survey?.title}
              </h3>
            </div>
          </div>
          <SurveyMenu
            survey={survey}
            selectedTeamId={selectedTeamId}
            teamsData={teamsData}
            refetchSurveys={refetchSurveys}
          />
        </div>
        <div>
          <div className="flex items-center gap-8">
            <div className="text-center flex items-center gap-2 rounded-md px-4 py-2 border shadow-sm">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  Questions
                </p>
                <p className="text-sm">{survey?.questions?.length}</p>
              </div>
            </div>
            <div className="text-center flex items-center gap-2 rounded-md px-4 py-2 shadow-sm border">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <Users className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  Responses
                </p>
                <p className="text-sm">{totalResponses}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex items-center justify-between w-full">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 mr-2 border"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`${pathname}/${survey?.id}?tab=Result`);
              }}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Users className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-medium">{totalResponses}</span>
              <span className="text-xs text-muted-foreground font-medium">
                {translations("Responses")}
              </span>
            </div>
            {/* survey type */}
            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border`}
            >
              <span
                className={`text-xs font-semibold ${survey?.type === "web" ? "text-blue-600" : "text-green-600"}`}
              >
                {survey?.type?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer with enhanced timestamps - Push to bottom */}
        <div className="flex items-center justify-between border-t py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-5 h-5 rounded-md flex items-center justify-center">
              <Calendar className="w-3 h-3" />
            </div>
            <span className="font-semibold">
              {dayjs(survey?.createdAt).format("DD MMMM YYYY")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-5 h-5 rounded-md flex items-center justify-center">
              <Clock className="w-3 h-3 text-blue-600" />
            </div>
            <span className="font-semibold">
              {<TimeSinceText isoDateString={survey?.createdAt} />}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
