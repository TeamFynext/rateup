-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "enableNotificationEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationEmail" TEXT NOT NULL DEFAULT '';
