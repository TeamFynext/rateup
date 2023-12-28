export function generateWaSurveyUrl(surveyTeamMapId: string) {
  const message = encodeURIComponent("/start " + surveyTeamMapId);
  return `https://wa.me/+917907137774?text=${message}`;
}
