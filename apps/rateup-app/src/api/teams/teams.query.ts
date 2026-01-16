import { useQuery } from "@tanstack/react-query";
import { getMembersByTeam, getTeamsByUser, getTeamsMembersOfOrg } from "./teams.api";

export function useTeamsByUser() {
  return useQuery({
    queryKey: ["teamsDataUserQuery"],
    queryFn: getTeamsByUser,
  });
}

export function useUserByTeam(teamId: string) {
  return useQuery({
    queryKey: ["usersDataTeamQuery", teamId],
    queryFn: getMembersByTeam,
    enabled: !!teamId,
  });
}

export const useTeamsMembersOfOrg = () => {
  return useQuery({
    queryKey: ["orgTeamsDataQuery"],
    queryFn: () => getTeamsMembersOfOrg(),
  });
};