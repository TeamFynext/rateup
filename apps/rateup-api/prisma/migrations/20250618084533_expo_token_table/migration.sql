-- CreateTable
CREATE TABLE "ExpoPushToken" (
    "id" UUID NOT NULL,
    "expoToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "orgId" UUID NOT NULL,

    CONSTRAINT "ExpoPushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpoPushToken_userId_idx" ON "ExpoPushToken"("userId");

-- CreateIndex
CREATE INDEX "ExpoPushToken_orgId_idx" ON "ExpoPushToken"("orgId");

-- AddForeignKey
ALTER TABLE "ExpoPushToken" ADD CONSTRAINT "ExpoPushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpoPushToken" ADD CONSTRAINT "ExpoPushToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
