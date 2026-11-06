/*
  Warnings:

  - Added the required column `name` to the `WaFlow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `WaFlow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WaFlow" ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "preview" JSONB,
ADD COLUMN     "status" TEXT NOT NULL,
ALTER COLUMN "flowId" DROP NOT NULL;
