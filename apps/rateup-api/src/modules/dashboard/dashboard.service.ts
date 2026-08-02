import { CampaignStatus, SurveyType, WaFlowStatus } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
import { UserAvailabilityStatus } from "../user/user.schema.js";

interface OverallStats {
  newChatCount: number;
  activeCampaignsCount: number;
  publishedFlowsCount: number;
  automationsCount: number;
  loyaltyCustomersCount: number;
  activeWebSurveysCount: number;
  /** Selected by the statement below; the interface used to omit it. issues.txt 23.6. */
  teamsCount: number;
  ticketCount: number;
}

const EMPTY_STATS: OverallStats = {
  newChatCount: 0,
  activeCampaignsCount: 0,
  publishedFlowsCount: 0,
  automationsCount: 0,
  loyaltyCustomersCount: 0,
  activeWebSurveysCount: 0,
  teamsCount: 0,
  ticketCount: 0,
};

/**
 * The dashboard's headline counts, as one statement of scalar sub-selects.
 *
 * The loyalty count read `FROM "LoyaltyCustomer"`, a table migration
 * 20260120044921_new_loyalty dropped. Postgres resolves relations for the whole
 * statement before executing any of it, so that did not merely zero the loyalty
 * tile — it raised `relation "LoyaltyCustomer" does not exist` and took every
 * other count with it, for roughly six months. It counts CustomerLoyaltyAccount
 * through LoyaltyProgram.orgId now, which is where a customer's org lives after
 * the rewrite. See issues.txt 23.1.
 */
export async function getOverallStats(orgId: string, userId: string): Promise<OverallStats> {
  const counts = await prisma.$queryRaw<OverallStats[]>`SELECT
  (SELECT COUNT(*)::INTEGER FROM "Contact" c WHERE c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours' AND c."orgId" = ${orgId}::uuid) 
   AS "newChatCount",
  (SELECT COUNT(*)::INTEGER FROM "Campaign" cp JOIN "Team" t ON cp."teamId" = t.id WHERE t."orgId" = ${orgId}::uuid AND cp."status" = ${CampaignStatus.ACTIVE}) AS "activeCampaignsCount",
  (SELECT COUNT(*)::INTEGER FROM "WaFlow" WHERE "orgId"=${orgId}::uuid AND "status" = ${WaFlowStatus.PUBLISHED}) AS "publishedFlowsCount",
  (SELECT COUNT(*)::INTEGER FROM "WaAutomatedReply" WHERE "orgId" = ${orgId}::uuid) AS "automationsCount",
  (SELECT COUNT(*)::INTEGER FROM "CustomerLoyaltyAccount" cla JOIN "LoyaltyProgram" lp ON cla."programId" = lp.id WHERE lp."orgId" = ${orgId}::uuid) AS "loyaltyCustomersCount",
  (SELECT COUNT(*)::INTEGER FROM "Survey" WHERE "orgId" = ${orgId}::uuid AND "active" = TRUE AND "type" = ${SurveyType.Web}) AS "activeWebSurveysCount",
  (SELECT COUNT(*)::INTEGER FROM "TeamMember" tm JOIN "Team" t ON tm."teamId" = t.id WHERE t."orgId" = ${orgId}::uuid AND tm."userId" = ${userId}::uuid) AS "teamsCount",
  (SELECT COUNT(*)::INTEGER FROM "TicketCard" tc JOIN "TicketColumn" tcl ON tc."ticketColumnId" = tcl.id JOIN "TicketBoard" tb ON
   tcl."ticketBoardId" = tb.id JOIN "TicketBoardTeam" tbt ON tbt."boardId" = tb.id JOIN "Team" t ON tbt."teamId" = t.id WHERE t."orgId" = ${orgId}::uuid
   AND tc."createdAt" > NOW() - INTERVAL '24 hours'
   ) AS "ticketCount"
   ;`;
  // An aggregate of scalar sub-selects always returns exactly one row, so the
  // fallback is unreachable today — but the declared return type promised an
  // object and nothing guaranteed one. See issues.txt 23.6.
  return counts[0] ?? EMPTY_STATS;
}

interface ActiveSurvey {
  id: string;
  type: SurveyType;
  isPublished: boolean;
  title: string;
  createdAt: string;
  dbFlowId?: string;
  version?: number;
  responseCount: number;
}
export async function getActiveSurveyStats(userId: string): Promise<ActiveSurvey[]> {
  return await prisma.$queryRaw`WITH filtered_surveys AS (SELECT s."id", s."type", s."isPublished",
  s."title", s."createdAt", wf."dbFlowId", wf."version", COUNT(DISTINCT sr.id)::INTEGER as "responseCount"
   FROM "Survey" s 
  LEFT JOIN "SurveyTeamMap" st ON s.id = st."surveyId"
  LEFT JOIN "WaFlow" wf ON s.id = wf."surveyId"
  LEFT JOIN "SurveyResponse" sr ON sr."surveyTeamMapId" = st.id
  LEFT JOIN "TeamMember" tm ON st."teamId" = tm."teamId"
  WHERE tm."userId" = ${userId}::uuid AND s."active" = TRUE 
  GROUP BY s.id, wf."dbFlowId")
  (SELECT * FROM filtered_surveys WHERE "type" = ${SurveyType.Web} ORDER BY "createdAt" DESC LIMIT 10)
   UNION ALL
  (SELECT * FROM filtered_surveys WHERE "type" = ${SurveyType.WaFlow} ORDER BY "createdAt" DESC LIMIT 10)
  ;`;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  profilePhoto: string;
  role: string;
  lastLoggedInAt: string | null;
  assignedTicketsCount: number;
  assignedChatsCount: number;
  status: UserAvailabilityStatus;
}

/**
 * One team's roster, for the caller's own organisation.
 *
 * Returns null when the team is not the caller's, which the handler answers 404 to.
 * The query used to filter on the path's team id ALONE — no org anywhere in this
 * function, its handler or its route — so a team id was enough for a user of any
 * organisation to read that team's members, their email addresses, roles,
 * last-login times, workloads and who was online. See issues.txt 23.2.
 *
 * It is also read-only now. It used to backfill `lastLoggedInAt` from SuperTokens
 * inside the GET: one session-list call per member plus one per handle plus a write,
 * all sequential, repeated on every page load — and the write NULLED the timestamp
 * of any member whose sessions had expired, destroying the only record of when they
 * were last active (23.3, 23.4). Logins write the column, so rows that predate it
 * fill themselves the next time that user signs in.
 */
export async function getTeamMemberStats(
  teamId: string,
  orgId: string,
): Promise<(TeamMember & { isOnline: boolean })[] | null> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, orgId },
    select: { id: true },
  });
  if (!team) return null;

  const users: TeamMember[] =
    await prisma.$queryRaw`SELECT u.id, u."name", u."email", u."profilePhoto", orm."role", orm. "status", u."lastLoggedInAt",
    (
        SELECT COUNT(*)::INTEGER
        FROM "TicketCardAssignee" ticket
        WHERE ticket."assigneeId" = u.id
    ) AS "assignedTicketsCount",
    (
        SELECT COUNT(*)::INTEGER
        FROM "WaInboxAssign" inb
        WHERE inb."assignedUserId" = u.id
    ) AS "assignedChatsCount"
   FROM "TeamMember" tm
   LEFT JOIN "User" u ON tm."userId" = u.id
   LEFT JOIN "OrgMember" orm ON orm."userId" = tm."userId" AND orm."orgId" = ${orgId}::uuid
   JOIN "Team" t ON tm."teamId" = t.id
   WHERE tm."teamId" = ${teamId}::uuid AND t."orgId" = ${orgId}::uuid;`;
  return users.map((user) => ({
    ...user,
    isOnline: user.status === UserAvailabilityStatus.online,
  }));
}
