import {
  IconGlobe,
  IconMessageCircle,
  IconPercentage,
  IconPlayerPlay,
  IconUsers,
} from "@tabler/icons-react";
import { useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useResponseCount } from "@/backend/surveys/response/response.query";
import { useGetSurveyStats } from "@/backend/surveys/surveys.query";
import { StatTile } from "@/components/common/StatTile.tsx";
import { DotBadge } from "@/components/dashboard/analytics/kit/StatusBadges.tsx";
import SurveyContext from "@/context/SurveyContext.ts";

const SurveyStatsWebForm = ({ surveyId }: { surveyId: string }) => {
  const { filterTeams } = useContext(SurveyContext);

  const { data: responseCountData } = useResponseCount(surveyId);
  const responseCount = useMemo(
    () =>
      filterTeams?.length
        ? responseCountData?.teamWiseCount?.reduce(
            (total: number, teamMap: { id: string; count: number }) => {
              if (filterTeams.includes(teamMap.id)) total += teamMap.count;
              return total;
            },
            0,
          )
        : responseCountData?.all,
    [responseCountData, filterTeams],
  );

  const { data: surveyStats } = useGetSurveyStats(surveyId);
  const { visited, started, reviewLinkVisited } = useMemo(() => {
    let filteredStats = surveyStats ? [...surveyStats] : [];
    if (filterTeams?.length > 0) {
      filteredStats = surveyStats?.filter((team: STStats) =>
        filterTeams.includes(team?.surveyTeamMapId),
      );
    }
    return filteredStats?.reduce(
      (acc, curr) => {
        acc.visited += curr?.visited ?? 0;
        acc.started += curr?.started ?? 0;
        acc.reviewLinkVisited += curr?.reviewLinkVisited ?? 0;
        return acc;
      },
      { visited: 0, started: 0, reviewLinkVisited: 0 },
    );
  }, [surveyStats, filterTeams]);

  const { t } = useTranslation();
  const rate = getResponseRateInfo(responseCount, visited);
  const rateLabels = { Great: t("Great"), Good: t("Good"), Low: t("Low"), "Too Low": t("Too Low") };
  const count = (value: number | undefined) =>
    value === undefined ? null : value.toLocaleString();
  const icon = (Icon: typeof IconUsers) => (
    <Icon className="size-4 text-muted-foreground" aria-hidden />
  );

  return (
    <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
      <StatTile
        label={t("Total Responses")}
        value={count(responseCount ?? 0)}
        icon={icon(IconMessageCircle)}
      />
      <StatTile label={t("Started")} value={count(started)} icon={icon(IconPlayerPlay)} />
      <StatTile label={t("Total Visits")} value={count(visited)} icon={icon(IconUsers)} />
      <StatTile
        label={t("Google Review Redirects")}
        value={count(reviewLinkVisited)}
        icon={icon(IconGlobe)}
      />
      <StatTile
        label={t("Response Rate")}
        value={rate ? `${rate.rate}%` : null}
        icon={icon(IconPercentage)}
        note={rate && <DotBadge dotClassName={rate.dotClassName} label={rateLabels[rate.status]} />}
      />
    </div>
  );
};

export default SurveyStatsWebForm;

/** Null when more responses than visits were recorded, so no rate can be given. */
function getResponseRateInfo(responseCount: number, visited: number) {
  if (responseCount > visited) return null;

  const rate = visited > 0 ? Number(((responseCount / visited) * 100).toFixed(1)) : 0;
  if (rate >= 70) return { rate, status: "Great" as const, dotClassName: "bg-green-500" };
  if (rate >= 50) return { rate, status: "Good" as const, dotClassName: "bg-primary" };
  if (rate >= 30) return { rate, status: "Low" as const, dotClassName: "bg-amber-500" };
  return { rate, status: "Too Low" as const, dotClassName: "bg-destructive" };
}
