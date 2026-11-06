-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_orgId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deletedOrgInfo" TEXT,
ALTER COLUMN "orgId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;
