-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgMemberId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "subSource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "orgMemberId" UUID NOT NULL,
    "ticketAssignNotification" BOOLEAN NOT NULL DEFAULT false,
    "waMessageAssignNotification" BOOLEAN NOT NULL DEFAULT false,
    "waMessageClosedNotification" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_orgMemberId_key" ON "NotificationSetting"("orgMemberId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orgMemberId_fkey" FOREIGN KEY ("orgMemberId") REFERENCES "OrgMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_orgMemberId_fkey" FOREIGN KEY ("orgMemberId") REFERENCES "OrgMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
