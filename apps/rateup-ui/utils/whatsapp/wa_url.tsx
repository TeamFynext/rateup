export function generateWaMessageUrl(message: string) {
  return `https://wa.me/+917907137774?text=${encodeURIComponent(message)}`;
}

export function generateWaSurveyShareUrl(surveyTeamMapId: string) {
  const message =
    "Start the application by sending this message\n" +
    "/start " +
    surveyTeamMapId;

  return generateWaMessageUrl(message);
}
