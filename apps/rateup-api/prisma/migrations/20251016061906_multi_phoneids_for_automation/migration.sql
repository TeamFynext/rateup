-- AlterTable
ALTER TABLE "public"."WaAutomatedReply" ADD COLUMN     "whatsappSettingsPhoneIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
