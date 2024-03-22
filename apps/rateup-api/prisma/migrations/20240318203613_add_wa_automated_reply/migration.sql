-- CreateTable
CREATE TABLE "WaAutomatedReply" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" UUID NOT NULL,
    "matchData" JSONB NOT NULL,
    "matchType" TEXT NOT NULL,
    "responseType" TEXT NOT NULL,
    "responseText" TEXT,
    "responseTemplateId" TEXT,

    CONSTRAINT "WaAutomatedReply_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WaAutomatedReply" ADD CONSTRAINT "WaAutomatedReply_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
