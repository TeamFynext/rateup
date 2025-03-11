-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "lastReceivedMessageTimeStamp" TIMESTAMP(3),
ALTER COLUMN "waMessageAssignStatus" SET DEFAULT 'UNASSIGNED';
