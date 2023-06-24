-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "isProtected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT;
