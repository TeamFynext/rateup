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
