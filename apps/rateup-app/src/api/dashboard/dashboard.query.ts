import { useQuery } from "@tanstack/react-query";
import { getActiveSurveyStats, getOverallStats, getTeamMemberStats } from "./dashboard.api";

export const useOverallStats = () => {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getOverallStats,
  });
};

export const useActiveSurveyStats = () => {
  return useQuery({
    queryKey: ["dashboard", "active-surveys"],
    queryFn: getActiveSurveyStats,
  });
};

export const useTeamMemberStats = (teamId: string, enabled = true) => {
  return useQuery({
    queryKey: ["team-member-stats", teamId],
    queryFn: () => getTeamMemberStats(teamId),
    enabled: !!teamId && enabled,
  });
};
