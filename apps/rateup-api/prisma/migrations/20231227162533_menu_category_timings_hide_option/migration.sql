-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "hideUnavailableCategory" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startTime" TIMESTAMP(3);
