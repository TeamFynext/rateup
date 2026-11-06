/*
  Warnings:

  - You are about to drop the column `priority` on the `WhatsappQuickReply` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."WhatsappQuickReply" DROP COLUMN "priority",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "key" TEXT,
ADD COLUMN     "topic" TEXT NOT NULL DEFAULT 'General Inquiry';
