export function generateWaMessageUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function generateWaSurveyShareUrl(
  phone: string,
  surveyTeamMapId: string,
) {
  const message =
    "Start the application by sending this message\n" +
    "/start " +
    surveyTeamMapId;

  return generateWaMessageUrl(phone, message);
}
