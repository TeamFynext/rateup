/*
  Warnings:

  - A unique constraint covering the columns `[userId,orgId]` on the table `OrgMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_userId_orgId_key" ON "OrgMember"("userId", "orgId");
