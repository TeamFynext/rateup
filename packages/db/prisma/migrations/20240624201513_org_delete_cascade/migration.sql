-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_orgId_fkey";

-- DropForeignKey
ALTER TABLE "OrgMember" DROP CONSTRAINT "OrgMember_orgId_fkey";

-- DropForeignKey
ALTER TABLE "OrgMember" DROP CONSTRAINT "OrgMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_orgId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "UsageStats" DROP CONSTRAINT "UsageStats_orgId_fkey";

-- DropForeignKey
ALTER TABLE "WaAccountSettings" DROP CONSTRAINT "WaAccountSettings_orgId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsappSettings" DROP CONSTRAINT "WhatsappSettings_orgId_fkey";

-- AddForeignKey
ALTER TABLE "UsageStats" ADD CONSTRAINT "UsageStats_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappSettings" ADD CONSTRAINT "WhatsappSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaAccountSettings" ADD CONSTRAINT "WaAccountSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
