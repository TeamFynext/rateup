import dayjs from "dayjs";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { notifyConversationLimitReached } from "../notification/notification.service.js";

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

/// Increments the org's monthly conversation usage by one. Called whenever a new
/// Conversation row is created (a brand-new contact's first thread, or an existing
/// contact re-engaging after their previous thread closed). This is the counter the
/// `whatsapp.conversation.count.max` subscription limit is checked against. Best-effort:
/// a usage-tracking failure must never break conversation creation.
export async function incrementConversationCount(orgId: string) {
  try {
    const usage = await prisma.usageStats.upsert({
      where: { orgId },
      update: {
        monthlyConversationsCount: { increment: 1 },
        annualConversationsCount: { increment: 1 },
      },
      create: { orgId, monthlyConversationsCount: 1, annualConversationsCount: 1 },
    });
    await maybeNotifyConversationLimitReached(orgId, usage);
  } catch (error) {
    log.error(error, "Failed to increment conversation usage count");
  }
}

// Fires a one-time system notification the moment the org's conversation counter
// first reaches its allowance. Uses `=== effectiveMax` so exactly the increment
// that hits the limit notifies (repeated over-limit attempts don't re-notify);
// after a reset the counter drops and the next cycle can notify again. Best-effort:
// any failure here must never affect the (already committed) usage increment.
async function maybeNotifyConversationLimitReached(
  orgId: string,
  usage: { monthlyConversationsCount: number; annualConversationsCount: number },
) {
  try {
    const subscription = await prisma.subscription.findUnique({ where: { orgId } });
    const max = (subscription?.features as any)?.[SubscriptionFeaturePathName.Whatsapp]
      ?.conversation?.count?.max;
    if (!max || max <= 0) return;

    const isAnnual = subscription?.isAnnualMessageLimit;
    const effectiveMax = isAnnual ? max * 12 : max;
    const used = isAnnual ? usage.annualConversationsCount : usage.monthlyConversationsCount;

    if (used === effectiveMax) {
      await notifyConversationLimitReached(orgId);
    }
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
        monthlyAutomationTriggerCount: 0,
        monthlyTemplateMessageCount: 0,
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
      await prisma.$executeRaw`UPDATE "UsageStats" SET "annualConversationsCount" = 0 WHERE "orgId" IN (
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

    if (currentStat?.teamMembersCount > 0) return null;

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

export async function decrementStatsCount(orgId, stat) {
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

export async function updateUsageStatsLastReset(orgId, renewedAt) {
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
