import React, { useContext, useMemo } from "react";

import {
  IconMessageDots,
  IconPlayerPlayFilled,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Percent } from "lucide-react";

import { useResponseCount } from "@/backend/surveys/response/response.query";
import { useGetSurveyStats } from "@/backend/surveys/surveys.query";
import SurveyContext from "@/context/SurveyContext";

const SurveyStats1 = ({ translations, surveyId }) => {
  const { filterTeams } = useContext(SurveyContext);

  const { data: responseCountData, isPending: isPendingCount } =
    useResponseCount(surveyId);

  const responseCount = useMemo(
    () =>
      filterTeams?.length
        ? responseCountData?.teamWiseCount?.reduce((total, teamMap) => {
            if (filterTeams.includes(teamMap.id)) total += teamMap.count;
            return total;
          }, 0)
        : responseCountData?.all,
    [responseCountData, filterTeams],
  );

  const { data: surveyStats, isPending: isStatsLoading } =
    useGetSurveyStats(surveyId);

  const { visited, started } = useMemo(() => {
    let filteredStats = surveyStats ? [...surveyStats] : [];
    if (filterTeams?.length > 0) {
      filteredStats = surveyStats?.filter((team) =>
        filterTeams?.includes(team?.surveyTeamMapId),
      );
    }
    return filteredStats?.reduce(
      (acc, curr) => {
        acc.visited += curr?.visited ?? 0;
        acc.started += curr?.started ?? 0;
        return acc;
      },
      { visited: 0, started: 0 },
    );
  }, [surveyStats, filterTeams]);

  const responseRate =
    visited > 0 ? ((responseCount / visited) * 100).toFixed(1) : 0;

  const responseRatePercentage = `${responseRate}%`;
  let responseRateStatus;
  const statusColorMap = {
    Great: "#66BF00",
    Good: "#FFC107",
    Low: "#FF8B07",
    "Too Low": "#FF6161",
  };

  if (Number(responseRate) >= 70) {
    responseRateStatus = "Great";
  } else if (Number(responseRate) >= 50) {
    responseRateStatus = "Good";
  } else if (Number(responseRate) >= 30) {
    responseRateStatus = "Low";
  } else {
    responseRateStatus = "Too Low";
  }

  const stats = [
    {
      title: "Total Responses",
      value: responseCount ?? 0,
      badge: null,
      icon: <IconMessageDots className="text-[#2B82DE]" size={24} />,
    },
    {
      title: "Started",
      value: started ?? "NA",
      badge: null,
      icon: <IconPlayerPlayFilled className="text-[#2B82DE]" size={24} />,
    },
    {
      title: "Total Visits",
      value: visited ?? "NA",
      badge: null,
      icon: <IconUsersGroup className="text-[#2B82DE]" size={24} />,
    },
    {
      title: "Response Rate",
      value: responseRatePercentage,
      badge: (
        <span
          className={`ml-2 px-2 py-0.5 text-xs rounded text-white`}
          style={{ backgroundColor: statusColorMap[responseRateStatus] }}
        >
          {responseRateStatus}
        </span>
      ),
      icon: <Percent className="text-[#2B82DE]" size={24} />,
    },
  ];

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ title, value, badge, icon }) => (
        <div
          key={title}
          className="flex justify-between items-center bg-[#FAFAFA] border border-[#E2E5ED] rounded-md p-2 shadow-sm"
        >
          <div>
            <p className="text-xs font-bold text-[#343A40]">{title}</p>
            <div className="text-3xl font-bold text-[#004F98] flex items-end">
              <div>{value}</div>
              <div className="mb-1">{badge}</div>
            </div>
          </div>
          <div className="p-2 bg-[#2B82DE1F] rounded-md self-start">{icon}</div>
        </div>
      ))}
    </div>
  );
};

export default SurveyStats1;
