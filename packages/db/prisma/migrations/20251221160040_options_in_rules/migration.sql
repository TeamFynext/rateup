/*
  Warnings:

  - The values [BUSINESS_HOURS,SEND_ONCE_PER_24H] on the enum `ConditionField` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConditionField_new" AS ENUM ('MESSAGE_BODY', 'CONTACT_EMAIL', 'CONTACT_GROUP', 'CONTACT_LABEL', 'CONTACT_LIFECYCLE');
ALTER TABLE "RuleCondition" ALTER COLUMN "field" TYPE "ConditionField_new" USING ("field"::text::"ConditionField_new");
ALTER TYPE "ConditionField" RENAME TO "ConditionField_old";
ALTER TYPE "ConditionField_new" RENAME TO "ConditionField";
DROP TYPE "public"."ConditionField_old";
COMMIT;

-- AlterTable
ALTER TABLE "Rule" ADD COLUMN     "options" JSONB;
