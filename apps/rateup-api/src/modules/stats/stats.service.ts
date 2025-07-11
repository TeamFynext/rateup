import dayjs from "dayjs";
import { SubscriptionFeaturePathName } from "../../types/enums";
import prisma from "../../utils/prisma";

export async function updateMonthlyStat(stat: string, orgId: string) {
  try {
    const statUpdate = await prisma.usageStats.upsert({
      where: {
        orgId,
      },
      update: {
        monthlySurveyResponses:
          stat === "survey" ? { increment: 1 } : undefined,
        monthlyMenuViews: stat === "menu" ? { increment: 1 } : undefined,
        surveyResponsesCount: stat === "survey" ? { increment: 1 } : undefined,
        menuViewsCount: stat === "menu" ? { increment: 1 } : undefined,
        monthlyMessagesCount:
          stat === SubscriptionFeaturePathName.Whatsapp
            ? { increment: 1 }
            : undefined,
        messagesCount:
          stat === SubscriptionFeaturePathName.Whatsapp
            ? { increment: 1 }
            : undefined,
        waSurveysCount:
          stat === SubscriptionFeaturePathName.WhatsAppSurvey
            ? { increment: 1 }
            : undefined,
        waSurveyResponsesCount:
          stat === SubscriptionFeaturePathName.WhatsAppSurvey
            ? { increment: 1 }
            : undefined,
        loyaltyActionCount:
          stat === SubscriptionFeaturePathName.LoyaltyAction
            ? { increment: 1 }
            : undefined,
        loyaltyRewardCount:
          stat === SubscriptionFeaturePathName.LoyaltyReward
            ? { increment: 1 }
            : undefined,
        loyaltyCustomerCount:
          stat === SubscriptionFeaturePathName.LoyaltyCustomer
            ? { increment: 1 }
            : undefined,
        annualMessageCount:
          stat === SubscriptionFeaturePathName.Whatsapp
            ? { increment: 1 }
            : undefined,
        ...(stat === SubscriptionFeaturePathName.WhatsAppTemplate
          ? {
              templateMessagesCount: { increment: 1 },
              monthlyTemplateMessageCount: { increment: 1 },
              annualTemplateMessageCount: { increment: 1 },
            }
          : {}),
      },
      create: {
        orgId: orgId,
        monthlySurveyResponses: stat === "survey" ? 1 : 0,
        monthlyMenuViews: stat === "menu" ? 1 : 0,

        surveyResponsesCount: stat === "survey" ? 1 : 0,
        menuViewsCount: stat === "menu" ? 1 : 0,
        monthlyMessagesCount:
          stat === SubscriptionFeaturePathName.Whatsapp ? 1 : 0,
        messagesCount: stat === SubscriptionFeaturePathName.Whatsapp ? 1 : 0,
        waSurveysCount:
          stat === SubscriptionFeaturePathName.WhatsAppSurvey ? 1 : 0,
        waSurveyResponsesCount:
          stat === SubscriptionFeaturePathName.WhatsAppSurvey ? 1 : 0,
        loyaltyActionCount:
          stat === SubscriptionFeaturePathName.LoyaltyAction ? 1 : 0,
        loyaltyRewardCount:
          stat === SubscriptionFeaturePathName.LoyaltyReward ? 1 : 0,
        loyaltyCustomerCount:
          stat === SubscriptionFeaturePathName.LoyaltyCustomer ? 1 : 0,
        annualMessageCount:
          stat === SubscriptionFeaturePathName.Whatsapp ? 1 : 0,
        ...(stat === SubscriptionFeaturePathName.WhatsAppTemplate
          ? {
              templateMessagesCount: 1,
              monthlyTemplateMessageCount: 1,
              annualTemplateMessageCount: 1,
            }
          : {
              templateMessagesCount: 0,
              monthlyTemplateMessageCount: 0,
              annualTemplateMessageCount: 0,
            }),
        //TODO: improve
        // Add other fields with default values as needed
      },
    });

    return statUpdate;
  } catch (error) {
    throw new Error("Failed to update Stat");
  }
}

// Function to reset the monthly counts
export async function resetMonthlyCounts() {
  try {
    const resetMonthlyStats = await prisma.usageStats.updateMany({
      where: {
        lastMonthlyResettedDate: dayjs()
          .startOf("D")
          .subtract(30, "D")
          .toDate(),
        org: {
          Subscription: {
            basePlan: {
              paymentPlan: {
                period: "yearly",
              },
              OR: [
                {
                  paymentPlan: null,
                },
              ],
            },
          },
        },
      },
      data: {
        monthlyMenuViews: 0,
        monthlySurveyResponses: 0,
        monthlyMessagesCount: 0,
        lastMonthlyResettedDate: new Date(),
      },
    });
    return resetMonthlyStats;
  } catch (error) {
    throw new Error("Error reseting monthly counts.");
  }
}

export async function resetAnnualCounts() {
  try {
    const resetAnnualCounts =
      await prisma.$executeRaw`UPDATE "UsageStats" SET "annualMessageCount" = 0 WHERE "orgId" IN (
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
  } catch (error) {
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
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

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

    const menuCount = await prisma.menu.count({
      where: {
        team: {
          orgId: orgId,
        },
      },
    });

    const menuViewsCount = await prisma.menuLanding.aggregate({
      where: {
        surveyTeamMap: {
          team: {
            orgId: orgId,
          },
        },
      },
      _sum: {
        visited: true,
      },
    });
    const monthlyMessagesCount = await prisma.waMessage.count({
      where: {
        contact: {
          orgId,
        },
      },
    });

    let statsData = {
      teamCount,
      teamMemberCount,
      surveyCount,
      surveyResponsesCount,
      surveyResponsesCountCurrentMonth,
      menuCount,
      menuViewsCount: menuViewsCount._sum.visited,
      monthlyMessagesCount,
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
    menuCount: number;
    menuViewsCount: number;
    monthlyMessagesCount: number;
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
      menusCount: stats?.menuCount || 0,
      menuViewsCount: stats?.menuViewsCount || 0,
      monthlyMessagesCount: stats?.monthlyMessagesCount || 0,
    },
    create: {
      teamsCount: stats?.teamCount || 0,
      teamMembersCount: stats?.teamMemberCount || 0,
      surveysCount: stats?.surveyCount || 0,
      surveyResponsesCount: stats?.surveyResponsesCount || 0,
      monthlySurveyResponses: stats?.surveyResponsesCountCurrentMonth || 0,
      menusCount: stats?.menuCount || 0,
      menuViewsCount: stats?.menuViewsCount || 0,
      monthlyMessagesCount: stats?.monthlyMessagesCount || 0,
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

export async function updateAnnualMessageCount(orgId) {
  const waMessages = await prisma.$queryRaw`SELECT COUNT(*) FROM "WaMessage" wm 
  JOIN "Contact" c ON wm."contactId" = c.id 
  JOIN "Subscription" s ON c."orgId" = s."orgId"
  WHERE wm."messageBody"->>'send' IS NOT NULL
  AND wm."createdAt" >= COALESCE(s."renewedAt", s."createdAt")
  AND c."orgId" = ${orgId}::uuid;`;

  await prisma.usageStats.update({
    where: {
      orgId,
    },
    data: {
      annualMessageCount: Number(waMessages[0]?.count),
    },
  });
}
