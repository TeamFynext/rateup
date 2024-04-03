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
