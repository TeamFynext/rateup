-- Mobile calls: each push token's platform, and iOS PushKit VoIP tokens for CallKit.
-- AlterTable
ALTER TABLE "ExpoPushToken" ADD COLUMN     "platform" TEXT;

-- CreateTable
CREATE TABLE "VoipPushToken" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "orgId" UUID NOT NULL,

    CONSTRAINT "VoipPushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoipPushToken_orgId_userId_idx" ON "VoipPushToken"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoipPushToken_token_userId_orgId_key" ON "VoipPushToken"("token", "userId", "orgId");

-- AddForeignKey
ALTER TABLE "VoipPushToken" ADD CONSTRAINT "VoipPushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoipPushToken" ADD CONSTRAINT "VoipPushToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

