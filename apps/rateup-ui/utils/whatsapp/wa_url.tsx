export function generateWaSurveyIdentifier_byName(
  surveyName: string,
  teamCode: string,
) {
  return `\`|sn| ${surveyName} @${teamCode}\``;
}

export function generateWaSurveyIdentifier_byId(surveyTeamMapId: string) {
  return `\`|st| ${surveyTeamMapId}\``;
}

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
