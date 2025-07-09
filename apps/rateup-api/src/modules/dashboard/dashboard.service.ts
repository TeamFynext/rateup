import dayjs from "dayjs";
import { CampaignStatus, SurveyType, WaFlowStatus } from "../../types/enums";
import prisma from "../../utils/prisma";
import Session from "supertokens-node/recipe/session";
import { updateLastLoggedInTime } from "../user/user.service";
import { UserAvailabilityStatus } from "../user/user.schema";

interface OverallStats {
  newChatCount: number;
  activeCampaignsCount: number;
  publishedFlowsCount: number;
  automationsCount: number;
  loyaltyCustomersCount: number;
  activeWebSurveysCount: number;
  ticketCount: number;
}

export async function getOverallStats(
  orgId: string,
  userId: string,
): Promise<OverallStats> {
  const counts = await prisma.$queryRaw`SELECT
  (SELECT COUNT(*)::INTEGER FROM "Contact" c WHERE c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours' AND c."orgId" = ${orgId}::uuid) 
   AS "newChatCount",
  (SELECT COUNT(*)::INTEGER FROM "Campaign" cp JOIN "Team" t ON cp."teamId" = t.id WHERE t."orgId" = ${orgId}::uuid AND cp."status" = ${CampaignStatus.ACTIVE}) AS "activeCampaignsCount",
  (SELECT COUNT(*)::INTEGER FROM "WaFlow" WHERE "orgId"=${orgId}::uuid AND "status" = ${WaFlowStatus.PUBLISHED}) AS "publishedFlowsCount",
  (SELECT COUNT(*)::INTEGER FROM "WaAutomatedReply" WHERE "orgId" = ${orgId}::uuid) AS "automationsCount",
  (SELECT COUNT(*)::INTEGER FROM "LoyaltyCustomer" WHERE "orgId" = ${orgId}::uuid) AS "loyaltyCustomersCount",
  (SELECT COUNT(*)::INTEGER FROM "Survey" WHERE "orgId" = ${orgId}::uuid AND "active" = TRUE AND "type" = ${SurveyType.Web}) AS "activeWebSurveysCount",
  (SELECT COUNT(*)::INTEGER FROM "TeamMember" tm JOIN "Team" t ON tm."teamId" = t.id WHERE t."orgId" = ${orgId}::uuid AND tm."userId" = ${userId}::uuid) AS "teamsCount",
  (SELECT COUNT(*)::INTEGER FROM "TicketCard" tc JOIN "TicketColumn" tcl ON tc."ticketColumnId" = tcl.id JOIN "TicketBoard" tb ON
   tcl."ticketBoardId" = tb.id JOIN "TicketBoardTeam" tbt ON tbt."boardId" = tb.id JOIN "Team" t ON tbt."teamId" = t.id WHERE t."orgId" = ${orgId}::uuid
   AND tc."createdAt" > NOW() - INTERVAL '24 hours'
   ) AS "ticketCount"
   ;`;
  return counts[0];
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
export async function getActiveSurveyStats(
  userId: string,
): Promise<ActiveSurvey[]> {
  return await prisma.$queryRaw`WITH filtered_surveys AS (SELECT s."id", s."type", s."isPublished",
  s."title", s."createdAt", wf."dbFlowId", wf."version", COUNT(DISTINCT sr.id)::INTEGER as "responseCount"
   FROM "Survey" s 
  LEFT JOIN "SurveyTeamMap" st ON s.id = st."surveyId"
  LEFT JOIN "WaFlow" wf ON s.id = wf."surveyId"
  LEFT JOIN "SurveyResponse" sr ON sr."surveyTeamMapId" = st.id
  LEFT JOIN "TeamMember" tm ON st."teamId" = tm."teamId"
  WHERE tm."userId" = ${userId}::uuid AND s."active" = TRUE 
  GROUP BY s.id, wf."dbFlowId") 
  (SELECT * FROM filtered_surveys WHERE "type" = ${SurveyType.Web} LIMIT 10)
   UNION ALL 
  (SELECT * FROM filtered_surveys WHERE "type" = ${SurveyType.WaFlow} LIMIT 10)
  ;`;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  profilePhoto: string;
  role: string;
  lastLoggedInAt: string;
  assignedTicketsCount: number;
  assignedChatsCount: number;
  status: UserAvailabilityStatus;
}

export async function getTeamMemberStats(
  teamId: string,
): Promise<TeamMember & { isOnline: boolean }[]> {
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
   LEFT JOIN "OrgMember" orm ON orm."userId" = tm."userId"
   WHERE tm."teamId" = ${teamId}::uuid;`;
  const members = [];
  for (const user of users) {
    let sessionHandles = await Session.getAllSessionHandlesForUser(user.id);
    if (!user.lastLoggedInAt || dayjs(user.lastLoggedInAt).year() <= 2020) {
      let lastLoggedIn = 0;
      for (const session of sessionHandles) {
        const res = await Session.getSessionInformation(session);
        lastLoggedIn = Math.max(lastLoggedIn, res.timeCreated);
      }
      const lastLoggedInAt = lastLoggedIn
        ? dayjs(lastLoggedIn).utc().format()
        : null;
      if (lastLoggedInAt || (user.lastLoggedInAt && !lastLoggedInAt))
        await updateLastLoggedInTime(user.id, lastLoggedInAt);

      user.lastLoggedInAt = lastLoggedInAt;
    }
    members.push({
      ...user,
      isOnline: user.status === UserAvailabilityStatus.online,
    });
  }
  return members as TeamMember & { isOnline: boolean }[];
}
