import prisma from "../../../utils/prisma.js";
import { getShortUrlId, shortIdUniqueConstraintErrHandler } from "../../../utils/commonUtils.js";

/**
 * The feedback flow's Survey must be mapped to the team whose Google link is used, because
 * the flow token carries a `surveyTeamMapId` and that is what the reply handlers resolve
 * the run from. The map is created on setup, but the team can be changed later, so both
 * the settings update and the sender make sure one exists rather than assuming it.
 */
export async function ensureSurveyTeamMap(surveyId: string, teamId: string): Promise<string> {
  const existing = await prisma.surveyTeamMap.findFirst({
    where: { surveyId, teamId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await shortIdUniqueConstraintErrHandler(() =>
    prisma.surveyTeamMap.create({
      data: { surveyId, teamId, shortUrlId: getShortUrlId() },
      select: { id: true },
    }),
  );
  return created.id;
}
