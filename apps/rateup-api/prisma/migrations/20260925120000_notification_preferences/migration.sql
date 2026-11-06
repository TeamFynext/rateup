-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "event" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_orgMemberId_createdAt_idx" ON "Notification"("orgMemberId", "createdAt" DESC);

-- AlterTable
ALTER TABLE "NotificationSetting" ADD COLUMN     "inApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "push" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "desktop" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sound" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "overrides" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- The closed-chat toggle defaulted off and is off in the catalogue too, so only an opt-in
-- carries over. The assignment toggle is dropped: the catalogue now defaults it on.
UPDATE "NotificationSetting"
SET "overrides" = '{"inbox.closed": {"inApp": true}}'::jsonb
WHERE "waMessageClosedNotification" = true;

-- Existing rows predate the bell's unread state; treat them as seen.
UPDATE "Notification" SET "readAt" = "createdAt";

-- AlterTable
ALTER TABLE "NotificationSetting" DROP COLUMN "waMessageAssignNotification",
DROP COLUMN "waMessageClosedNotification";
