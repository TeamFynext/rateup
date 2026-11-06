-- CreateEnum
CREATE TYPE "MetaAgentThreadOwner" AS ENUM ('AI', 'STAFF');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "metaAgentHandoverReason" TEXT,
ADD COLUMN     "metaAgentThreadOwner" "MetaAgentThreadOwner",
ADD COLUMN     "metaAgentThreadOwnerAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MetaBusinessAgent" ADD COLUMN     "releaseOnTicketClose" BOOLEAN NOT NULL DEFAULT true;
