-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "notificationEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "enableNotificationEmail " BOOLEAN NOT NULL DEFAULT false;
