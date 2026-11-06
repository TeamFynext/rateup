-- AlterTable
ALTER TABLE "public"."Contact" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedBy" UUID;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
