import dayjs from "dayjs";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { notifyConversationLimitReached } from "../notification/notification.service.js";
import { getConversationAllowance } from "../subscription/addons.js";

export async function updateMonthlyStat(stat: string, orgId: string) {
  try {
    const statUpdate = await prisma.usageStats.upsert({
      where: {
        orgId,
      },
      update: {
        monthlySurveyResponses: stat === "survey" ? { increment: 1 } : undefined,
        surveyResponsesCount: stat === "survey" ? { increment: 1 } : undefined,
        messagesCount: stat === SubscriptionFeaturePathName.Whatsapp ? { increment: 1 } : undefined,
      },
      create: {
        orgId: orgId,
        monthlySurveyResponses: stat === "survey" ? 1 : 0,
        surveyResponsesCount: stat === "survey" ? 1 : 0,
        messagesCount: stat === SubscriptionFeaturePathName.Whatsapp ? 1 : 0,
        //TODO: improve
        // Add other fields with default values as needed
      },
    });

    return statUpdate;
  } catch {
    throw new Error("Failed to update Stat");
  }
}

/// Increments the org's inbox-ticket conversation counters by one. Called whenever a
/// new Conversation row is created (a brand-new contact's first thread, an existing
/// contact re-engaging after their previous thread closed, or an agent
/// assignment/unassignment opening a successor thread).
///
/// This is **inbox analytics only** and is no longer the subscription meter. An inbox
/// ticket closes when a human or an automation closes it, so it can stay open
/// indefinitely; and the assignment paths create rows for internal workflow events the
/// customer never caused. Both make it unfit as a billing unit. The plan allowance is
/// metered on MeteredConversation instead — see incrementMeteredConversationCount.
/// Best-effort: a usage-tracking failure must never break conversation creation.
export async function incrementConversationCount(orgId: string) {
  try {
    await prisma.usageStats.upsert({
      where: { orgId },
      update: {
        monthlyConversationsCount: { increment: 1 },
        annualConversationsCount: { increment: 1 },
      },
      create: { orgId, monthlyConversationsCount: 1, annualConversationsCount: 1 },
    });
  } catch (error) {
    log.error(error, "Failed to increment conversation usage count");
  }
}

/// Increments the org's **metered conversation** usage by one. Called from
/// recordMessageInWindow at the single moment a new 24h window opens — never on the
/// subsequent messages or status webhooks that fold into an existing window. This is
/// the counter `whatsapp.conversation.count.max` is enforced against.
export async function incrementMeteredConversationCount(orgId: string) {
  try {
    const usage = await prisma.usageStats.upsert({
      where: { orgId },
      update: {
        monthlyMeteredConversationsCount: { increment: 1 },
        annualMeteredConversationsCount: { increment: 1 },
      },
      create: { orgId, monthlyMeteredConversationsCount: 1, annualMeteredConversationsCount: 1 },
    });
    await maybeNotifyConversationLimitReached(orgId, usage);
  } catch (error) {
    log.error(error, "Failed to increment metered conversation usage count");
  }
}

// Fires a one-time system notification the first time the org's metered conversation
// counter reaches its allowance in the current cycle.
//
// Uses `>=` guarded by a persisted `conversationLimitNotifiedAt` rather than the
// `=== effectiveMax` this used to do. Increments are not serialized, so two concurrent
// windows opening at max-1 could step the counter straight to max+1 and the equality
// never held — the org silently never got told it hit its limit. The timestamp both
// makes `>=` fire once and survives process restarts; the resets clear it so the next
// cycle can notify again. Best-effort: any failure here must never affect the (already
// committed) usage increment.
async function maybeNotifyConversationLimitReached(
  orgId: string,
  usage: {
    monthlyMeteredConversationsCount: number;
    annualMeteredConversationsCount: number;
    conversationLimitNotifiedAt: Date | null;
  },
) {
  try {
    if (usage.conversationLimitNotifiedAt) return;

    const subscription = await prisma.subscription.findUnique({ where: { orgId } });
    // Packs count towards the allowance, so an org that bought headroom is not told it
    // has run out at the plan's number.
    const { effectiveMax: max } = await getConversationAllowance(orgId);
    // No cap means nothing to warn about. Enterprise is invoiced on actual usage, so
    // "you have reached your conversation limit — upgrade your plan" is both untrue and
    // useless there: there is no higher tier to move to.
    if (!max) return;

    const isAnnual = subscription?.isAnnualMessageLimit;
    const effectiveMax = isAnnual ? max * 12 : max;
    const used = isAnnual
      ? usage.annualMeteredConversationsCount
      : usage.monthlyMeteredConversationsCount;

    if (used < effectiveMax) return;

    // Claim the notification before sending it. updateMany with the null guard is a
    // conditional write: concurrent increments that both cleared the `>=` check race
    // here instead, and only the one that flips the column actually notifies.
    const claimed = await prisma.usageStats.updateMany({
      where: { orgId, conversationLimitNotifiedAt: null },
      data: { conversationLimitNotifiedAt: new Date() },
    });
    if (claimed.count === 0) return;

    await notifyConversationLimitReached(orgId);
  } catch (error) {
    log.error(error, "Failed to evaluate conversation-limit notification");
  }
}

// Function to reset the monthly counts.
// Resets every org whose 30-day monthly cycle has elapsed (or was never reset).
// Paid monthly plans keep `lastMonthlyResettedDate` fresh via the renewal webhook,
// so they're naturally excluded here; free plans (no webhook) and annual plans'
// in-year monthly sub-counters are what this actually rolls over. `annualConversationsCount`
// is intentionally NOT reset here — that's handled yearly by resetAnnualCounts.
export async function resetMonthlyCounts() {
  try {
    const cutoff = dayjs().startOf("day").subtract(30, "day").toDate();
    const resetMonthlyStats = await prisma.usageStats.updateMany({
      where: {
        OR: [{ lastMonthlyResettedDate: { lte: cutoff } }, { lastMonthlyResettedDate: null }],
      },
      data: {
        monthlySurveyResponses: 0,
        monthlyWaSurveyResponses: 0,
        monthlyConversationsCount: 0,
        monthlyMeteredConversationsCount: 0,
        monthlyAutomationTriggerCount: 0,
        monthlyTemplateMessageCount: 0,
        // Clears the one-shot limit notification so the new cycle can notify again.
        conversationLimitNotifiedAt: null,
        lastMonthlyResettedDate: new Date(),
      },
    });
    return resetMonthlyStats;
  } catch {
    throw new Error("Error reseting monthly counts.");
  }
}

export async function resetAnnualCounts() {
  try {
    const resetAnnualCounts =
      await prisma.$executeRaw`UPDATE "UsageStats" SET "annualConversationsCount" = 0, "annualMeteredConversationsCount" = 0, "conversationLimitNotifiedAt" = NULL WHERE "orgId" IN (
      SELECT s."orgId"
      FROM "Subscription" s
      JOIN "RateupPlan" r ON s."basePlanId" = r.id 
      WHERE s."isAnnualMessageLimit" = TRUE
        AND r."paymentPlanId" IS NULL
        AND DATE_TRUNC('day', COALESCE(s."renewedAt", s."createdAt")::DATE + INTERVAL '1 year' * FLOOR(EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(s."renewedAt", s."createdAt")::DATE)))) = CURRENT_DATE
    )
    `;
    return resetAnnualCounts;
  } catch (error) {
    console.log(error);
    throw new Error("Error reseting annual counts.");
  }
}

export async function getUsageStat(orgId: string) {
  try {
    const statRes = await prisma.usageStats.findUnique({
      where: {
        orgId: orgId,
      },
    });

    return statRes;
  } catch {
    throw new Error("Failed to fetch stats");
  }
}

export async function createStats(orgId: string) {
  try {
    let currentStat = await getUsageStat(orgId);

    if ((currentStat?.teamMembersCount ?? 0) > 0) return null;

    const teamCount = await prisma.team.count({
      where: {
        orgId: orgId,
      },
    });

    const teamMemberCount = await prisma.teamMember.count({
      where: {
        team: {
          orgId: orgId,
        },
      },
    });

    const surveyCount = await prisma.survey.count({
      where: {
        teams: {
          some: {
            team: {
              orgId: orgId,
            },
          },
        },
      },
    });

    const surveyResponsesCount = await prisma.surveyResponse.count({
      where: {
        surveyTeamMap: {
          team: {
            orgId: orgId,
          },
        },
      },
    });

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const surveyResponsesCountCurrentMonth = await prisma.surveyResponse.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: currentDate,
        },
        surveyTeamMap: {
          team: {
            orgId: orgId,
          },
        },
      },
    });

    const monthlyConversationsCount = await prisma.conversation.count({
      where: {
        orgId,
        createdAt: {
          gte: startOfMonth,
          lte: currentDate,
        },
      },
    });

    const waAutomationCount = await prisma.waAutomatedReply.count({
      where: {
        orgId,
      },
    });
    let statsData = {
      teamCount,
      teamMemberCount,
      surveyCount,
      surveyResponsesCount,
      surveyResponsesCountCurrentMonth,
      monthlyConversationsCount,
      waAutomationCount,
    };

    await updateUsageStats(orgId, statsData);

    return statsData;
  } catch (error) {
    console.error("Error collecting stats:", error);
    throw error;
  }
}

export async function updateUsageStats(
  orgId: string,
  stats: {
    teamCount: number;
    teamMemberCount: number;
    surveyCount: number;
    surveyResponsesCount: number;
    surveyResponsesCountCurrentMonth: number;
    monthlyConversationsCount: number;
    waAutomationCount: number;
  },
) {
  const usageStats = await prisma.usageStats.upsert({
    where: { orgId: orgId },
    update: {
      teamsCount: stats?.teamCount || 0,
      teamMembersCount: stats?.teamMemberCount || 0,
      surveysCount: stats?.surveyCount || 0,
      surveyResponsesCount: stats?.surveyResponsesCount || 0,
      monthlySurveyResponses: stats?.surveyResponsesCountCurrentMonth || 0,
      monthlyConversationsCount: stats?.monthlyConversationsCount || 0,
      waAutomationCount: stats?.waAutomationCount || 0,
    },
    create: {
      teamsCount: stats?.teamCount || 0,
      teamMembersCount: stats?.teamMemberCount || 0,
      surveysCount: stats?.surveyCount || 0,
      surveyResponsesCount: stats?.surveyResponsesCount || 0,
      monthlySurveyResponses: stats?.surveyResponsesCountCurrentMonth || 0,
      monthlyConversationsCount: stats?.monthlyConversationsCount || 0,
      orgId,
    },
  });

  return usageStats;
}

type UsageStatsCountField =
  | "teamsCount"
  | "teamMembersCount"
  | "surveysCount"
  | "surveyResponsesCount"
  | "waSurveysCount"
  | "waSurveyResponsesCount"
  | "messagesCount"
  | "aiPromptTokensCount"
  | "aiCompletionTokensCount"
  | "loyaltyActionCount"
  | "loyaltyRewardCount"
  | "loyaltyCustomerCount"
  | "waAutomationCount"
  | "annualConversationsCount"
  | "monthlySurveyResponses"
  | "monthlyWaSurveyResponses"
  | "monthlyConversationsCount"
  | "allowedTeams"
  | "allowedTeamMembers"
  | "allowedSurveys"
  | "allowedSurveyResponses"
  | "allowedMessagesCount"
  | "annualTemplateMessageCount"
  | "monthlyTemplateMessageCount"
  | "templateMessagesCount"
  | "monthlyAutomationTriggerCount";

export async function decrementStatsCount(orgId: string, stat: UsageStatsCountField) {
  await prisma.usageStats.update({
    where: {
      orgId,
    },
    data: {
      [stat]: {
        decrement: 1,
      },
    },
  });
}

export async function updateUsageStatsLastReset(orgId: string, renewedAt: Date) {
  const difference = dayjs().diff(dayjs(renewedAt), "day") % 30;
  const lastMonthlyResettedDate = dayjs().subtract(difference, "day").toDate();

  return await prisma.usageStats.update({
    where: {
      orgId,
    },
    data: {
      lastMonthlyResettedDate,
    },
  });
}
