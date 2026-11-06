-- CreateTable
CREATE TABLE "UsageStats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" UUID NOT NULL,
    "teamsCount" INTEGER NOT NULL DEFAULT 0,
    "teamMembersCount" INTEGER NOT NULL DEFAULT 0,
    "surveysCount" INTEGER NOT NULL DEFAULT 0,
    "surveyResponsesCount" INTEGER NOT NULL DEFAULT 0,
    "menusCount" INTEGER NOT NULL DEFAULT 0,
    "menuViewsCount" INTEGER NOT NULL DEFAULT 0,
    "monthlySurveyResponses" INTEGER NOT NULL DEFAULT 0,
    "monthlyMenuViews" INTEGER NOT NULL DEFAULT 0,
    "subscriptionStartDate" TIMESTAMP(3),
    "subscriptionEndDate" TIMESTAMP(3),
    "allowedTeams" INTEGER NOT NULL DEFAULT 0,
    "allowedTeamMembers" INTEGER NOT NULL DEFAULT 0,
    "allowedSurveys" INTEGER NOT NULL DEFAULT 0,
    "allowedSurveyResponses" INTEGER NOT NULL DEFAULT 0,
    "allowedMenus" INTEGER NOT NULL DEFAULT 0,
    "allowedMenuViews" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsageStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsageStats_orgId_key" ON "UsageStats"("orgId");

-- AddForeignKey
ALTER TABLE "UsageStats" ADD CONSTRAINT "UsageStats_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
