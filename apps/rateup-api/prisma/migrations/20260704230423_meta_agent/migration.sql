-- CreateTable
CREATE TABLE "MetaBusinessAgent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "whatsappSettingsId" UUID NOT NULL,
    "agentId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "isEligible" BOOLEAN,
    "eligibilityCheckedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_ONBOARDED',
    "rolloutEnabled" BOOLEAN,
    "handoffEnabled" BOOLEAN,
    "handoffMessage" TEXT,
    "followupEnabled" BOOLEAN,
    "followupIntervalSeconds" INTEGER,
    "followupMessage" TEXT,
    "aiAudience" TEXT,
    "settingsSyncedAt" TIMESTAMP(3),
    "businessInfo" JSONB,
    "businessInfoSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaBusinessAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAgentAllowlistEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "metaId" TEXT,
    "consumerPhoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAgentAllowlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAgentFaq" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "metaId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAgentFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAgentFile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "metaId" TEXT,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAgentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAgentWebsite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "metaId" TEXT,
    "url" TEXT NOT NULL,
    "crawlStatus" TEXT,
    "pagesCrawled" INTEGER,
    "lastCrawledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAgentWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAgentSkill" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "metaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAgentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAgentConnector" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "metaId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "requiresCertificate" BOOLEAN NOT NULL DEFAULT false,
    "connectionStatus" TEXT NOT NULL DEFAULT 'PENDING_OAUTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAgentConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAgentConnectorTool" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "connectorId" UUID NOT NULL,
    "metaId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestDefinition" JSONB NOT NULL,
    "userAuthRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAgentConnectorTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaBusinessAgent_whatsappSettingsId_key" ON "MetaBusinessAgent"("whatsappSettingsId");

-- AddForeignKey
ALTER TABLE "MetaBusinessAgent" ADD CONSTRAINT "MetaBusinessAgent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaBusinessAgent" ADD CONSTRAINT "MetaBusinessAgent_whatsappSettingsId_fkey" FOREIGN KEY ("whatsappSettingsId") REFERENCES "WhatsappSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAgentAllowlistEntry" ADD CONSTRAINT "MetaAgentAllowlistEntry_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "MetaBusinessAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAgentFaq" ADD CONSTRAINT "MetaAgentFaq_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "MetaBusinessAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAgentFile" ADD CONSTRAINT "MetaAgentFile_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "MetaBusinessAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAgentWebsite" ADD CONSTRAINT "MetaAgentWebsite_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "MetaBusinessAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAgentSkill" ADD CONSTRAINT "MetaAgentSkill_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "MetaBusinessAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAgentConnector" ADD CONSTRAINT "MetaAgentConnector_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "MetaBusinessAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAgentConnectorTool" ADD CONSTRAINT "MetaAgentConnectorTool_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "MetaAgentConnector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
