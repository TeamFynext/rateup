-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "onboardingChecklist" JSONB,
ADD COLUMN     "onboardingChecklistCompleted" BOOLEAN NOT NULL DEFAULT false;
