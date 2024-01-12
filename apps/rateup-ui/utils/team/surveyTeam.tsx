import { TeamWiseResponses } from "../../backend/surveys/response/response.api";

interface getTeamOptionsFromSurveyProps {
  survey: Survey;
  enableAll?: boolean;
}
export function getTeamOptionsFromSurvey({
  survey,
  enableAll = false,
}: getTeamOptionsFromSurveyProps) {
  const teamOptions = survey.teams.map((team) => ({
    value: team.id,
    label: team.name,
  }));
  if (enableAll) teamOptions.unshift({ value: "all", label: "All Teams" });
  return teamOptions;
}

export function getFilteredResponsesUsingTeam(
  filterTeams: string[],
  teamWiseResponses: Array<TeamWiseResponses>,
) {
  let filteredResponsesByTeam = teamWiseResponses;
  if (filterTeams.length > 0) {
    filteredResponsesByTeam = teamWiseResponses?.filter((response) =>
      filterTeams.includes(response?.id),
    );
  }
  return { filteredResponsesByTeam };
}

export function mergeResponsesFromTeams(
  surveyResponses: Array<TeamWiseResponses>,
) {
  if (!surveyResponses) return { mergedResponses: [], noofResponses: 0 };
  const responses = surveyResponses?.map((res) => {
    const responseWithTeamId = res.responses.map((resp) => ({
      ...resp,
      teamId: res.team.id,
    }));
    return responseWithTeamId;
  });
  const mergedResponses = [];
  for (const response of responses) {
    mergedResponses.push(...response);
  }
  const noofResponses = mergedResponses?.length;
  return { mergedResponses, noofResponses };
}
