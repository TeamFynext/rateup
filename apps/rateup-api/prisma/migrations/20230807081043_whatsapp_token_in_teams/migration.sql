-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "whatsappAccessToken" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN     "whatsappAccessToken" ;
