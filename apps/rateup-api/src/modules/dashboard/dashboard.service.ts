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
