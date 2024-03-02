-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "redirect" JSONB NOT NULL DEFAULT '{"url": "/","time": "5" }';
