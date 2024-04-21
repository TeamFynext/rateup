export function generateWaSurveyIdentifier_byName(
  surveyName: string,
  teamCode: string,
) {
  return `\`#${surveyName} @${teamCode}\``;
}

export function generateWaMessageUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
