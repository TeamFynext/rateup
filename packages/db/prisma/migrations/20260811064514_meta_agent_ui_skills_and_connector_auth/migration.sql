-- AlterTable
ALTER TABLE "MetaAgentConnector" ADD COLUMN     "connectionError" TEXT,
ADD COLUMN     "mtlsConfig" JSONB,
ADD COLUMN     "userAuthInjectionConfig" JSONB,
ALTER COLUMN "authType" SET DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "MetaAgentConnectorTool" ADD COLUMN     "userAuthActionConfig" JSONB;

-- AlterTable
ALTER TABLE "MetaAgentSkill" ADD COLUMN     "channel" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "MetaBusinessAgent" ADD COLUMN     "neverSayPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "MetaAgentUiSkill" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "metaId" TEXT,
    "title" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enabled',
    "instruction" TEXT NOT NULL,
    "flowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAgentUiSkill_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MetaAgentUiSkill" ADD CONSTRAINT "MetaAgentUiSkill_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "MetaBusinessAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
