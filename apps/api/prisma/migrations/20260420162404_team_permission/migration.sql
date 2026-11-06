-- CreateEnum
CREATE TYPE "TeamFeature" AS ENUM ('inbox', 'analytics', 'contacts', 'campaigns', 'flows', 'chatbots', 'templates', 'automation', 'loyalty', 'web_forms', 'tickets', 'qr_studio', 'ai_chatbot', 'apps_services', 'digital_menu', 'settings');

-- CreateTable
CREATE TABLE "TeamFeatureAccess" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teamId" UUID NOT NULL,
    "feature" "TeamFeature" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamFeatureAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamFeatureAccess_teamId_feature_key" ON "TeamFeatureAccess"("teamId", "feature");

-- AddForeignKey
ALTER TABLE "TeamFeatureAccess" ADD CONSTRAINT "TeamFeatureAccess_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
