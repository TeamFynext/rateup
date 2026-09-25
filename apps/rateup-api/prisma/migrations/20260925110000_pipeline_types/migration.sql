-- CreateEnum
CREATE TYPE "PipelineType" AS ENUM ('LEADS', 'SUPPORT', 'PROJECTS', 'CUSTOM');

-- AlterTable
ALTER TABLE "Pipeline" ADD COLUMN     "type" "PipelineType" NOT NULL DEFAULT 'LEADS';

-- One Leads board per org. Prisma cannot declare a partial index, so it lives here only.
CREATE UNIQUE INDEX "pipeline_one_leads_per_org" ON "Pipeline"("orgId") WHERE "type" = 'LEADS';
