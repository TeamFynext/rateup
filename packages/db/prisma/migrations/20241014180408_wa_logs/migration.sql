-- CreateTable
CREATE TABLE "WaLogs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" UUID NOT NULL,
    "logs" JSONB[],

    CONSTRAINT "WaLogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WaLogs" ADD CONSTRAINT "WaLogs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
