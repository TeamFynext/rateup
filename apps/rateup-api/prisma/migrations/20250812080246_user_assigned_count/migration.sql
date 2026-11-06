-- CreateTable
CREATE TABLE "UserAssignedCount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "assignCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAssignedCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAssignedCount_userId_orgId_key" ON "UserAssignedCount"("userId", "orgId");

-- AddForeignKey
ALTER TABLE "UserAssignedCount" ADD CONSTRAINT "UserAssignedCount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssignedCount" ADD CONSTRAINT "UserAssignedCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
