export function generateWaSurveyUrl(surveyTeamMapId: string) {
  const message = encodeURIComponent(
    "Start the application by sending this message\n" +
      "/start " +
      surveyTeamMapId,
  );
  return `https://wa.me/+917907137774?text=${message}`;
}
