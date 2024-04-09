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
      },
      create: {
        orgId: orgId,
        monthlySurveyResponses: stat === "survey" ? 1 : 0,
        monthlyMenuViews: stat === "menu" ? 1 : 0,

        surveyResponsesCount: stat === "survey" ? 1 : 0,
        menuViewsCount: stat === "menu" ? 1 : 0,

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
      data: {
        monthlyMenuViews: 0,
        monthlySurveyResponses: 0,
      },
    });
    return resetMonthlyStats;
  } catch (error) {
    throw new Error("Error reseting monthly counts.");
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

    let statsData = {
      teamCount,
      teamMemberCount,
      surveyCount,
      surveyResponsesCount,
      surveyResponsesCountCurrentMonth,
      menuCount,
      menuViewsCount: menuViewsCount._sum.visited,
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
    },
    create: {
      teamsCount: stats?.teamCount || 0,
      teamMembersCount: stats?.teamMemberCount || 0,
      surveysCount: stats?.surveyCount || 0,
      surveyResponsesCount: stats?.surveyResponsesCount || 0,
      monthlySurveyResponses: stats?.surveyResponsesCountCurrentMonth || 0,
      menusCount: stats?.menuCount || 0,
      menuViewsCount: stats?.menuViewsCount || 0,
      org: {
        connect: {
          id: orgId,
        },
      },
    },
  });

  return usageStats;
}
