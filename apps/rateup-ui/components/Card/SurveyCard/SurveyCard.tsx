"use client";

import { usePathname, useRouter } from "next/navigation";

import { Clock, Star } from "lucide-react";
import { useExtracted } from "next-intl";

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
  const translations = useExtracted();
  const router = useRouter();
  const pathname = usePathname();
  const totalResponses = survey?.teams?.reduce(
    (sum, t) => sum + (t.responsesCount?.responses || 0),
    0,
  );
  const bg =
    survey?.webSurveyPagesTheme?.welcomeTheme?.bg?.desktopBg?.bgColor ||
    survey?.webSurveyPagesTheme?.welcomeTheme?.bg?.mobileBg?.bgColor;
  const img =
    survey?.webSurveyPagesTheme?.welcomeTheme?.bg?.desktopBg?.imageUrl ||
    survey?.webSurveyPagesTheme?.welcomeTheme?.bg?.mobileBg?.imageUrl;

  return (
    <Card
      key={survey.id}
      className="cursor-pointer hover:ring-1 hover:ring-primary gap-3.5 transition-all duration-300 cursor-pointer overflow-hidden relative hover:-translate-y-1 flex flex-col p-0"
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
      <CardContent className="flex flex-col h-full gap-1 p-0">
        <div>
          {img ? (
            <img src={img} alt="img" className="w-full object-cover h-[16vh]" />
          ) : (
            <div
              className="w-full h-[16vh] flex items-center justify-center"
              style={{ backgroundColor: bg }}
            >
              <Star fill="yellow" color="yellow" />
            </div>
          )}
        </div>
        {/* Header Section with improved spacing */}
        <div className="flex items-start justify-between px-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm line-clamp-1 group-hover:text-primary transition-colors font-semibold">
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

        <div className="flex items-baseline gap-1 text-gray-500 px-3">
          <span className="text-xs">{totalResponses}</span>
          <span className="text-xs">
            {totalResponses === 0
              ? translations("Response")
              : translations("Responses")}
          </span>
        </div>

        {/* Footer with enhanced timestamps - Push to bottom */}
        <div className="flex items-center justify-between border-t py-2 px-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span
              className={`${survey?.active ? "bg-green-100 text-green-500" : "bg-red-100 text-red-500"} text-[10px] px-2 py-1 rounded-full`}
            >
              {survey?.active
                ? translations("ACTIVE")
                : translations("INACTIVE")}
            </span>
          </div>
          <div className="flex items-center text-[11px] text-muted-foreground">
            <div className="w-5 h-5 rounded-md flex items-center justify-center">
              <Clock className="w-3 h-3 text-blue-600" />
            </div>
            <span className="font-semibold text-[11px]">
              {<TimeSinceText isoDateString={survey?.createdAt} />}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
