/**
 * The team's Google review link — `googleLink` first, then the "Google" entry of the
 * per-platform map, the same precedence as `getGoogleUrlBySurveyTeamMapId` in
 * survey.service.ts. Pure, so the public redirect handler can use it without loading the
 * WhatsApp send stack.
 */
export function resolveTeamGoogleLink(team: {
  googleLink: string | null;
  reviewPageLinks: unknown;
}): string | null {
  if (team.googleLink?.length) return team.googleLink;
  const links = team.reviewPageLinks;
  if (links && typeof links === "object" && !Array.isArray(links)) {
    const google = (links as Record<string, unknown>)["Google"];
    if (typeof google === "string" && google.length) return google;
  }
  return null;
}
